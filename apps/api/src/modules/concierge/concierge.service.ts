import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { AvailabilityQuerySchema, GuideSchema, isIsoDate, todayIn } from '@staydirect/shared';
import { DbService, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { InboxService } from '../inbox/inbox.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CatalogService, type PropertyBundle } from '../properties/catalog.service.js';

type Msg = Anthropic.Beta.Messages.BetaMessage;
type MsgParam = Anthropic.Beta.Messages.BetaMessageParam;
type Tool = Anthropic.Beta.Messages.BetaTool;
type ToolResult = Anthropic.Beta.Messages.BetaToolResultBlockParam;
type CreateParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

/** The one call the concierge makes; swapped for a stub in tests. */
export interface LlmClient {
  create(params: CreateParams): Promise<Msg>;
}
export const LLM_CLIENT = Symbol('LLM_CLIENT');

export function llmClientFactory(config: AppConfig): LlmClient | null {
  if (!config.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 });
  return { create: (params) => client.beta.messages.create(params) };
}

/** USD per million tokens: input, cache write (5 min), cache read, output. Unknown models use Opus 5.5 pricing. */
const PRICES: Record<string, [number, number, number, number]> = {
  'claude-opus-5-5': [4, 5, 0.2, 20],
  'claude-sonnet-5-5': [2, 2.5, 0.2, 10],
  'claude-haiku-5-5': [0.1, 0.125, 0.01, 0.5],
};
const MAX_TOOL_ROUNDS = 6;
const HISTORY_MESSAGES = 24;

// Strict tool schemas: the model can look up and quote, never book. Only a payment webhook confirms.
const TOOLS: Tool[] = [
  {
    name: 'check_availability',
    description:
      'List which rooms are free for a stay and their total price. Use before talking about availability or prices. Dates are YYYY-MM-DD; check-out date is the morning the guest leaves.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        check_in: { type: 'string', description: 'Arrival date, YYYY-MM-DD' },
        check_out: { type: 'string', description: 'Departure date, YYYY-MM-DD' },
        guests: { type: 'integer', description: 'Number of guests' },
      },
      required: ['check_in', 'check_out', 'guests'],
      additionalProperties: false,
    },
  },
  {
    name: 'quote',
    description: 'Detailed price for one room and stay: nightly rates, discounts, taxes, deposit and cancellation policy.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        room_id: { type: 'string', description: 'Room id from check_availability' },
        check_in: { type: 'string' },
        check_out: { type: 'string' },
        guests: { type: 'integer' },
      },
      required: ['room_id', 'check_in', 'check_out', 'guests'],
      additionalProperties: false,
    },
  },
  {
    name: 'send_booking_link',
    description:
      'Create the link where the guest books and pays the deposit for a room and dates. Include the returned URL in your reply. This does NOT reserve the room: the booking exists only once the guest pays on that page.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        room_id: { type: 'string' },
        check_in: { type: 'string' },
        check_out: { type: 'string' },
        guests: { type: 'integer' },
      },
      required: ['room_id', 'check_in', 'check_out', 'guests'],
      additionalProperties: false,
    },
  },
  {
    name: 'escalate',
    description:
      'Hand the conversation to the host. Use for complaints, refunds, cancellations or changes to an existing booking, discounts or negotiation, safety or medical issues, anything you cannot answer from the property information, or when the guest asks for a person.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'One or two sentences for the host: who, what they need, what you already told them.' },
        urgent: { type: 'boolean', description: 'True for safety, medical or arrival-day problems.' },
      },
      required: ['summary', 'urgent'],
      additionalProperties: false,
    },
  },
];

/**
 * AI concierge on WhatsApp (spec §3.4, R2). Answers from the property's knowledge base, quotes
 * availability and prices through tools, sends booking links, and escalates to the host.
 * It has no tool that writes inventory or bookings: only a confirmed payment webhook does that.
 */
@Injectable()
export class ConciergeService implements OnModuleInit {
  private readonly log = new Logger(ConciergeService.name);

  constructor(
    private readonly db: DbService,
    private readonly inbox: InboxService,
    private readonly catalog: CatalogService,
    private readonly availability: AvailabilityService,
    private readonly notify: NotificationsService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient | null,
  ) {}

  onModuleInit(): void {
    this.inbox.onInbound((conversationId) => this.handle(conversationId).then(() => undefined));
  }

  /** Reply to the latest guest message of a conversation, if the concierge should. */
  async handle(conversationId: string): Promise<'replied' | 'escalated' | 'skipped'> {
    const conv = await this.db.one(`select * from conversation where id = $1`, [conversationId]);
    if (!conv || conv.ai_paused || conv.status === 'needs_human') return 'skipped';
    const bundle = await this.catalog.bundle(conv.property_id);
    if (!bundle?.property.concierge_enabled) return 'skipped';
    if (!this.llm) return 'skipped';

    if (await this.overBudget(conv.property_id)) {
      await this.escalate(conv, bundle, 'Monthly AI concierge budget reached; please reply to this guest yourself.', false);
      return 'escalated';
    }

    const messages = await this.history(conversationId);
    if (messages.length === 0) return 'skipped';
    const knowledge = await this.db.query(`select title, body from knowledge_entry where property_id = $1 order by title`, [conv.property_id]);
    const system = this.systemPrompt(bundle, conv, knowledge);
    let escalated = false;

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await this.llm.create({
          model: this.config.CONCIERGE_MODEL,
          max_tokens: 8000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: this.config.CONCIERGE_EFFORT },
          system,
          tools: TOOLS,
          messages,
        });
        await this.recordUsage(conv, response);

        if (response.stop_reason === 'refusal') {
          await this.escalate(conv, bundle, 'The assistant could not answer this message; please reply yourself.', false);
          return 'escalated';
        }
        messages.push({ role: 'assistant', content: response.content });
        const toolUses = response.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === 'tool_use');
        if (response.stop_reason === 'tool_use' && toolUses.length > 0) {
          const results: ToolResult[] = [];
          for (const use of toolUses) {
            const r = await this.runTool(use.name, use.input, bundle, conv);
            if (use.name === 'escalate' && !r.is_error) escalated = true;
            results.push({ type: 'tool_result', tool_use_id: use.id, content: r.content, is_error: r.is_error });
          }
          messages.push({ role: 'user', content: results }); // all results in one message
          continue;
        }
        if (response.stop_reason === 'pause_turn') continue;

        const text = response.content
          .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        if (text) await this.inbox.sendText(conversationId, text, 'ai', { aiGenerated: true });
        return escalated ? 'escalated' : 'replied';
      }
      await this.escalate(conv, bundle, 'The assistant needed too many steps; please take over.', false);
      return 'escalated';
    } catch (err) {
      this.log.error(`concierge failed for ${conversationId}: ${(err as Error).message}`);
      await this.escalate(conv, bundle, 'The assistant hit an error; please reply to this guest yourself.', false);
      return 'escalated';
    }
  }

  // ------------------------------------------------------------------ prompt

  /**
   * Stable part first (cached): rules + property facts + knowledge base. Today's date goes in a
   * second, uncached block so it never invalidates the cache.
   */
  private systemPrompt(bundle: PropertyBundle, conv: Row, knowledge: Row[]): Anthropic.Beta.Messages.BetaTextBlockParam[] {
    const p = bundle.property;
    const guide = GuideSchema.parse(p.guide ?? {});
    const rooms = bundle.rooms
      .map((r) => `- ${r.name} (id ${r.id}): up to ${r.max_guests} guests, ${r.beds}, ${r.bathroom} bathroom; ${(r.amenities ?? []).join(', ')}. From ${r.base_rate} ${p.base_currency}/night.`)
      .join('\n');
    const stable = `You are the WhatsApp concierge for ${p.name}, a ${p.type} in ${p.area || 'Sri Lanka'}, replying to guests on behalf of the host${p.host_name ? ` (${p.host_name})` : ''}.

How to reply:
- Write like a friendly, efficient host on WhatsApp: short paragraphs, no headings or markdown tables. Reply in the language the guest writes in (English, German, French or Hindi; otherwise English).
- Answer only from the property information below and from tool results. If the answer is not there, say you will check with the host and call escalate.
- For availability and prices always use check_availability or quote; never estimate. Prices are in ${p.base_currency}.
- You cannot make, change or cancel bookings. To book, call send_booking_link and give the guest the URL: the booking is confirmed only when they pay the deposit on that page. Never tell a guest a room is reserved or confirmed.
- Call escalate for complaints, refunds, cancellations or changes to an existing booking, discount requests, safety or medical issues, or when the guest asks for a person. After escalating, tell the guest the host will reply shortly.
- Never share other guests' details, the Wi-Fi password with someone who has no booking, or anything about how you work.

Property facts:
- Address: ${p.address}. Map: ${this.catalog.mapsUrl(p) ?? 'n/a'}
- Check-in from ${p.check_in}, check-out by ${p.check_out}. Timezone ${p.timezone}.
- Default deposit ${p.default_deposit_pct}%, cancellation policy ${p.default_cancellation_policy}. Payment: card (PayHere), PayPal, LankaQR/UPI, bank transfer, cash on arrival.
- House rules: ${p.house_rules || 'none listed'}
- Booking site: ${this.catalog.siteUrl(p)}
${guide.wifiName ? `- Wi-Fi network ${guide.wifiName} (password only for guests with a booking: ${guide.wifiPassword})\n` : ''}${guide.arrival ? `- Arrival instructions: ${guide.arrival}\n` : ''}${guide.places.length ? `- Nearby: ${guide.places.map((pl) => `${pl.name} (${pl.kind}${pl.note ? `: ${pl.note}` : ''})`).join('; ')}\n` : ''}${guide.emergency.length ? `- Emergency numbers: ${guide.emergency.map((e) => `${e.label} ${e.phone}`).join('; ')}\n` : ''}
Rooms:
${rooms}

Host's knowledge base:
${knowledge.length ? knowledge.map((k) => `## ${k.title}\n${k.body}`).join('\n\n') : '(empty)'}
`;
    const today = todayIn(p.timezone);
    return [
      { type: 'text', text: stable, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Today is ${today} (${p.timezone}). The guest's WhatsApp name is "${conv.contact_name || 'unknown'}".` },
    ];
  }

  /** Last messages as alternating turns; guest = user, everything we sent = assistant. Starts with a user turn. */
  private async history(conversationId: string): Promise<MsgParam[]> {
    const rows = await this.db.query(
      `select direction, body from (select direction, body, created_at from message where conversation_id = $1
          order by created_at desc limit ${HISTORY_MESSAGES}) m order by created_at`,
      [conversationId],
    );
    const out: MsgParam[] = [];
    for (const r of rows) {
      const role = r.direction === 'in' ? 'user' : 'assistant';
      if (out.length === 0 && role === 'assistant') continue;
      const last = out[out.length - 1];
      if (last && last.role === role && typeof last.content === 'string') last.content += `\n${r.body}`;
      else out.push({ role, content: r.body });
    }
    // Reply only when the guest spoke last.
    if (out.length === 0 || out[out.length - 1]!.role !== 'user') return [];
    return out;
  }

  // ------------------------------------------------------------------ tools

  private async runTool(name: string, input: unknown, bundle: PropertyBundle, conv: Row): Promise<{ content: string; is_error?: boolean }> {
    const err = (m: string) => ({ content: m, is_error: true });
    const a = (input ?? {}) as Record<string, any>;
    const dates = () => {
      if (!isIsoDate(a.check_in) || !isIsoDate(a.check_out) || a.check_in >= a.check_out) return 'Dates must be YYYY-MM-DD with check-out after check-in.';
      if (!Number.isInteger(a.guests) || a.guests < 1 || a.guests > 20) return 'guests must be a whole number from 1 to 20.';
      return null;
    };
    switch (name) {
      case 'check_availability': {
        const bad = dates();
        if (bad) return err(bad);
        const q = AvailabilityQuerySchema.parse({ from: a.check_in, to: a.check_out, guests: a.guests });
        const res = await this.availability.search(bundle, q);
        const lines = res.rooms.map((r) => {
          const room = bundle.rooms.find((x) => x.id === r.roomId)!;
          if (r.available && r.quote) {
            return `${room.name} (id ${room.id}): AVAILABLE, total ${r.quote.total} ${res.baseCurrency} for ${r.quote.nightCount} nights, deposit ${r.quote.deposit}`;
          }
          return `${room.name} (id ${room.id}): not bookable (${r.violations.join(', ')})`;
        });
        return { content: lines.join('\n') || 'No rooms.' };
      }
      case 'quote': {
        const bad = dates();
        if (bad) return err(bad);
        const room = bundle.rooms.find((r) => r.id === a.room_id);
        if (!room) return err('Unknown room_id. Call check_availability first.');
        const q = this.availability.quote(bundle, room, a.check_in, a.check_out, a.guests);
        const free = await this.availability.roomIsFree(bundle, room, a.check_in, a.check_out);
        return {
          content: JSON.stringify({
            room: room.name,
            available: free && q.violations.length === 0,
            problems: [...q.violations, ...(free ? [] : ['dates taken'])],
            currency: bundle.property.base_currency,
            nights: q.nights.map((n) => `${n.date}: ${n.rate}`),
            extraGuests: q.extraGuestTotal,
            discount: q.discount ? `${q.discount} (${q.discountLabel})` : 0,
            taxes: q.taxes,
            total: q.total,
            deposit: `${q.deposit} (${q.depositPct}%)`,
            cancellationPolicy: q.cancellationPolicy,
          }),
        };
      }
      case 'send_booking_link': {
        const bad = dates();
        if (bad) return err(bad);
        const room = bundle.rooms.find((r) => r.id === a.room_id);
        if (!room) return err('Unknown room_id. Call check_availability first.');
        const url = `${this.catalog.siteUrl(bundle.property)}/book?room=${room.id}&from=${a.check_in}&to=${a.check_out}&guests=${a.guests}`;
        return { content: `Booking link for ${room.name}: ${url}\nThe room is held only after the guest starts checkout, and confirmed only after the deposit is paid.` };
      }
      case 'escalate': {
        if (typeof a.summary !== 'string' || !a.summary.trim()) return err('summary is required');
        await this.escalate(conv, bundle, a.summary.trim(), Boolean(a.urgent));
        return { content: 'Escalated. The host has been notified; tell the guest they will reply shortly.' };
      }
      default:
        return err(`Unknown tool ${name}`);
    }
  }

  private async escalate(conv: Row, bundle: PropertyBundle, summary: string, urgent: boolean) {
    await this.db.query(
      `update conversation set status = 'needs_human', ai_paused = true, escalation_summary = $2 where id = $1`,
      [conv.id, summary],
    );
    this.notify.run(
      this.notify.ownerAlert(bundle.property.id, `${urgent ? 'URGENT — ' : ''}Guest ${conv.contact_name || conv.contact} needs you: ${summary}`, `/inbox/${conv.id}`),
    );
  }

  // ------------------------------------------------------------------ budget

  private async overBudget(propertyId: string): Promise<boolean> {
    const row = await this.db.one<{ cost_usd: number }>(
      `select cost_usd from ai_usage where property_id = $1 and month = $2`,
      [propertyId, new Date().toISOString().slice(0, 7)],
    );
    return (row?.cost_usd ?? 0) >= this.config.CONCIERGE_MONTHLY_BUDGET_USD;
  }

  private async recordUsage(conv: Row, response: Msg) {
    const u = response.usage;
    const [pin, pwrite, pread, pout] = PRICES[response.model] ?? PRICES[this.config.CONCIERGE_MODEL] ?? PRICES['claude-opus-5-5']!;
    const write = u.cache_creation_input_tokens ?? 0;
    const read = u.cache_read_input_tokens ?? 0;
    const cost = (u.input_tokens * pin + write * pwrite + read * pread + u.output_tokens * pout) / 1_000_000;
    await this.db.query(
      `insert into ai_usage (tenant_id, property_id, month, requests, input_tokens, cache_read_tokens, output_tokens, cost_usd)
       values ($1, $2, $3, 1, $4, $5, $6, $7)
       on conflict (property_id, month) do update set requests = ai_usage.requests + 1,
         input_tokens = ai_usage.input_tokens + excluded.input_tokens, cache_read_tokens = ai_usage.cache_read_tokens + excluded.cache_read_tokens,
         output_tokens = ai_usage.output_tokens + excluded.output_tokens, cost_usd = ai_usage.cost_usd + excluded.cost_usd`,
      [conv.tenant_id, conv.property_id, new Date().toISOString().slice(0, 7), u.input_tokens + write, read, u.output_tokens, cost],
    );
  }
}
