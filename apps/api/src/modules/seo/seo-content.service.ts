import type Anthropic from '@anthropic-ai/sdk';
import { HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GuideSchema, SITE_LANGUAGES, type SessionUser, type SiteContentMap, type SiteContentRow } from '@staydirect/shared';
import type pg from 'pg';
import { z } from 'zod';
import { month, recordAiUsage } from '../../common/ai-usage.js';
import { DbService, type Row } from '../../common/db.service.js';
import { RevalidateService } from '../../common/revalidate.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { LLM_CLIENT, type LlmClient } from '../concierge/concierge.service.js';
import { FlagsService } from '../flags/flags.service.js';

const BLOCKS = ['getting_here', 'things_to_do', 'best_time'] as const;
const TRANSLATED = ['si', 'de', 'fr', 'hi'] as const;
const LANG_NAMES = { en: 'English', si: 'Sinhala (modern, everyday written Sinhala)', de: 'German (formal "Sie")', fr: 'French ("vous")', hi: 'Hindi (Devanagari, everyday travel-site Hindi)' } as const;

const perLang = (langs: readonly string[]) => ({
  type: 'object',
  properties: Object.fromEntries(langs.map((l) => [l, { type: 'string' }])),
  required: [...langs],
  additionalProperties: false,
});

/** Structured output: every block in all five languages, descriptions translated into the other four. */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    blocks: {
      type: 'object',
      properties: Object.fromEntries(BLOCKS.map((b) => [b, perLang(SITE_LANGUAGES)])),
      required: [...BLOCKS],
      additionalProperties: false,
    },
    description: perLang(TRANSLATED),
    rooms: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, description: perLang(TRANSLATED) },
        required: ['id', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['blocks', 'description', 'rooms'],
  additionalProperties: false,
};

const text = z.string().trim().max(6000);
const OutputSchema = z.object({
  blocks: z.object(Object.fromEntries(BLOCKS.map((b) => [b, z.object(Object.fromEntries(SITE_LANGUAGES.map((l) => [l, text])))])) as Record<(typeof BLOCKS)[number], z.ZodObject<Record<string, typeof text>>>),
  description: z.object(Object.fromEntries(TRANSLATED.map((l) => [l, text]))),
  rooms: z.array(z.object({ id: z.string(), description: z.object(Object.fromEntries(TRANSLATED.map((l) => [l, text]))) })),
});

const SYSTEM = `You write the "local guide" text and translations for the booking website of a small villa, guesthouse or homestay in Sri Lanka. Guests read it on a phone before booking; search engines index it.

Write three blocks, each 90–170 words of plain prose (no markdown, no headings, no bullet characters; short paragraphs separated by a blank line):
- getting_here: how guests usually reach the property (nearest airport and towns, typical transfer options such as a car with driver, tuk-tuk, train or bus where they really exist), then the last part of the journey from the owner's arrival notes.
- things_to_do: what is genuinely near the property: the owner's listed places first, then well-known sights or activities of the area.
- best_time: when to visit this part of Sri Lanka, in terms of the monsoon that affects this coast or region and what each season is like there.

Accuracy rules — the owner publishes this under their name:
- Use the property facts, arrival notes, nearby places and knowledge base given. For the area itself use only well-established general knowledge.
- Never invent prices, phone numbers, opening hours, exact distances, travel times or names of businesses. If the facts don't give a number, describe it without one or tell guests to ask the host on WhatsApp.
- If you are not sure about something, leave it out.
- Do not promise anything on the owner's behalf (free pickup, discounts, availability).

Languages: write every block in English, Sinhala, German, French and Hindi with the same content, natural in each language (not word for word). Keep brand and place names in their usual spelling for that language; Western digits everywhere.
Also translate the property description and each room description into Sinhala, German, French and Hindi. If a description is already in that language, return it unchanged. Keep the owner's facts and tone; add nothing.`;

/**
 * Local content blocks and translations for a guest site (spec Prompt 6 §2): drafted once by Claude
 * from the property facts and knowledge base, edited and published by the owner. Drafts never reach
 * the public site; only `published` rows do.
 */
@Injectable()
export class SeoContentService {
  private readonly log = new Logger(SeoContentService.name);

  constructor(
    private readonly db: DbService,
    private readonly flags: FlagsService,
    private readonly revalidate: RevalidateService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient | null,
  ) {}

  /** Published blocks for the public site: content[lang][key]. System context (guest site). */
  async published(propertyId: string): Promise<{ content: SiteContentMap; updatedAt: string | null }> {
    const rows = await this.db.query<{ key: string; lang: string; body: string; updated_at: Date }>(
      `select key, lang, body, updated_at from site_content where property_id = $1 and status = 'published'`,
      [propertyId],
    );
    const content: SiteContentMap = {};
    let updatedAt: Date | null = null;
    for (const r of rows) {
      (content[r.lang] ??= {})[r.key] = r.body;
      if (!updatedAt || r.updated_at > updatedAt) updatedAt = r.updated_at;
    }
    return { content, updatedAt: updatedAt?.toISOString() ?? null };
  }

  // ---------------------------------------------------------------- owner

  list(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.property(tx, propertyId);
      const rows = await this.db.query(`select * from site_content where property_id = $1 order by key, lang`, [propertyId], tx);
      const usage = await this.db.one<{ content_generations: number }>(
        `select content_generations from ai_usage where property_id = $1 and month = $2`,
        [propertyId, month()],
        tx,
      );
      return {
        rows: rows.map(toRow),
        googleSiteVerification: (p.google_site_verification as string | null) ?? null,
        ai: {
          enabled: !!this.llm && (await this.flags.enabled(user.tenantId, 'ai_site_content')),
          configured: !!this.llm,
          used: usage?.content_generations ?? 0,
          limit: this.config.CONTENT_GENERATIONS_PER_MONTH,
        },
      };
    });
  }

  async upsert(user: SessionUser, propertyId: string, input: { key: string; lang: string; body: string; publish?: boolean }): Promise<SiteContentRow> {
    const row = await this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      await this.checkRoomKey(tx, propertyId, input.key);
      return this.db.one(
        `insert into site_content (tenant_id, property_id, key, lang, body, status, source, updated_by)
         values ($1, $2, $3, $4, $5, $6, 'owner', $7)
         on conflict (property_id, key, lang) do update set body = excluded.body, source = 'owner', updated_by = excluded.updated_by,
           updated_at = now(), status = case when $8::boolean is null then site_content.status else excluded.status end
         returning *`,
        [user.tenantId, propertyId, input.key, input.lang, input.body, input.publish ? 'published' : 'draft', user.id, input.publish ?? null],
        tx,
      );
    });
    if (row!.status === 'published') this.revalidate.property(propertyId);
    return toRow(row!);
  }

  async setStatus(user: SessionUser, propertyId: string, input: { keys?: string[]; langs?: string[]; status: 'draft' | 'published' }) {
    const n = await this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      const rows = await this.db.query(
        `update site_content set status = $2, updated_at = now()
         where property_id = $1 and status <> $2 and ($3::text[] is null or key = any($3)) and ($4::text[] is null or lang = any($4))
         returning id`,
        [propertyId, input.status, input.keys ?? null, input.langs ?? null],
        tx,
      );
      return rows.length;
    });
    if (n > 0) this.revalidate.property(propertyId);
    return { updated: n };
  }

  async remove(user: SessionUser, propertyId: string, key: string, lang: string) {
    const r = await this.db.withTenant(user.tenantId, (tx) =>
      this.db.one<{ status: string }>(`delete from site_content where property_id = $1 and key = $2 and lang = $3 returning status`, [propertyId, key, lang], tx),
    );
    if (!r) throw new NotFoundException('Text not found');
    if (r.status === 'published') this.revalidate.property(propertyId);
    return { ok: true };
  }

  async setVerification(user: SessionUser, propertyId: string, code: string | null) {
    await this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      await this.db.query(`update property set google_site_verification = $2, updated_at = now() where id = $1`, [propertyId, code], tx);
    });
    this.revalidate.property(propertyId);
    return { googleSiteVerification: code };
  }

  /**
   * One Claude call drafts every block in five languages and translates the descriptions. Rows the
   * owner wrote are never replaced; earlier AI text only with `overwrite`. Everything lands as draft.
   */
  async generate(user: SessionUser, propertyId: string, opts: { overwrite: boolean }) {
    if (!this.llm) throw new ServiceUnavailableException('AI drafting is not set up on this server (no Anthropic API key).');
    await this.flags.require(user.tenantId, 'ai_site_content');

    const facts = await this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.property(tx, propertyId);
      const used = await this.db.one<{ content_generations: number }>(
        `select content_generations from ai_usage where property_id = $1 and month = $2`,
        [propertyId, month()],
        tx,
      );
      if ((used?.content_generations ?? 0) >= this.config.CONTENT_GENERATIONS_PER_MONTH) {
        throw new HttpException(`You can draft with AI ${this.config.CONTENT_GENERATIONS_PER_MONTH} times a month. Edit the text by hand, or try again next month.`, HttpStatus.TOO_MANY_REQUESTS);
      }
      const rooms = await this.db.query(`select id, name, description from room where property_id = $1 and active order by sort_order, name`, [propertyId], tx);
      const knowledge = await this.db.query(`select title, body from knowledge_entry where property_id = $1 order by title`, [propertyId], tx);
      return { p, rooms, knowledge };
    });

    const response = await this.llm.create(
      {
        model: this.config.CONTENT_MODEL,
        max_tokens: 20000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: this.config.CONTENT_EFFORT, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: factsPrompt(facts.p, facts.rooms, facts.knowledge) }],
      },
      { timeout: 300_000 },
    );
    await recordAiUsage(this.db, { tenantId: user.tenantId, propertyId }, response, this.config.CONTENT_MODEL, { generation: true });

    if (response.stop_reason === 'refusal') throw new HttpException('The AI could not write this text. Please write it yourself.', HttpStatus.UNPROCESSABLE_ENTITY);
    if (response.stop_reason === 'max_tokens') throw new HttpException('The draft came out too long. Shorten the knowledge base and try again.', HttpStatus.UNPROCESSABLE_ENTITY);
    const out = parseOutput(response);

    const roomIds = new Set(facts.rooms.map((r) => r.id as string));
    const rows: [string, string, string][] = [];
    for (const b of BLOCKS) for (const l of SITE_LANGUAGES) rows.push([b, l, out.blocks[b]![l]!]);
    for (const l of TRANSLATED) rows.push(['description', l, out.description[l]!]);
    for (const r of out.rooms) if (roomIds.has(r.id)) for (const l of TRANSLATED) rows.push([`room:${r.id}`, l, r.description[l]!]);

    const written = await this.db.withTenant(user.tenantId, async (tx) => {
      let n = 0;
      for (const [key, lang, body] of rows) {
        if (!body) continue;
        const r = await this.db.one(
          `insert into site_content (tenant_id, property_id, key, lang, body, status, source, updated_by)
           values ($1, $2, $3, $4, $5, 'draft', 'ai', $6)
           on conflict (property_id, key, lang) do update set body = excluded.body, status = 'draft', source = 'ai', updated_by = excluded.updated_by, updated_at = now()
             where site_content.source = 'ai' and ($7 or site_content.status = 'draft')
           returning id`,
          [user.tenantId, propertyId, key, lang, body.slice(0, 6000), user.id, opts.overwrite],
          tx,
        );
        if (r) n++;
      }
      return n;
    });
    this.log.log(`site content drafted for ${propertyId}: ${written} rows`);
    // Overwriting published AI text turns it back into a draft, so the live site changes too.
    if (opts.overwrite) this.revalidate.property(propertyId);
    return this.list(user, propertyId);
  }

  // ---------------------------------------------------------------- helpers

  private async property(tx: pg.PoolClient, id: string): Promise<Row> {
    const p = await this.db.one(`select * from property where id = $1`, [id], tx);
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  private async checkRoomKey(tx: pg.PoolClient, propertyId: string, key: string) {
    if (!key.startsWith('room:')) return;
    const r = await this.db.one(`select id from room where id = $1 and property_id = $2`, [key.slice(5), propertyId], tx);
    if (!r) throw new NotFoundException('Room not found');
  }
}

function toRow(r: Row): SiteContentRow {
  return { key: r.key, lang: r.lang, body: r.body, status: r.status, source: r.source, updatedAt: new Date(r.updated_at).toISOString() };
}

function factsPrompt(p: Row, rooms: Row[], knowledge: Row[]): string {
  const guide = GuideSchema.parse(p.guide ?? {});
  const kb = knowledge
    .map((k) => `### ${k.title}\n${k.body}`)
    .join('\n\n')
    .slice(0, 12_000);
  return [
    `Property: ${p.name} (${String(p.type).replace('_', ' ')})`,
    `Area: ${p.area || 'not given'}`,
    `Address: ${p.address || 'not given'}`,
    p.lat != null && p.lng != null ? `Coordinates: ${p.lat}, ${p.lng}` : '',
    `Check-in from ${p.check_in}, check-out by ${p.check_out}`,
    `\nProperty description (owner's words):\n${p.description || '(none)'}`,
    `\nRooms:\n${rooms.map((r) => `- id ${r.id}: ${r.name}\n  ${r.description || '(no description)'}`).join('\n') || '(none)'}`,
    `\nOwner's arrival notes:\n${guide.arrival || '(none)'}`,
    `\nOwner's nearby places:\n${guide.places.map((pl) => `- ${pl.name} (${pl.kind})${pl.note ? `: ${pl.note}` : ''}`).join('\n') || '(none)'}`,
    `\nKnowledge base:\n${kb || '(empty)'}`,
    `\nWrite the three blocks in ${Object.values(LANG_NAMES).join(', ')}, and translate the description and every room description (return each room's id as given).`,
  ]
    .filter(Boolean)
    .join('\n');
}

function parseOutput(response: Anthropic.Beta.Messages.BetaMessage): z.infer<typeof OutputSchema> {
  const block = response.content.find((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text');
  try {
    return OutputSchema.parse(JSON.parse(block?.text ?? ''));
  } catch {
    throw new HttpException('The AI draft could not be read. Please try again.', HttpStatus.BAD_GATEWAY);
  }
}
