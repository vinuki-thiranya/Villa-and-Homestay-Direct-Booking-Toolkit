import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { WHATSAPP_SERVICE_WINDOW_HOURS, type SessionUser } from '@staydirect/shared';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { WhatsAppChannel } from '../notifications/channels.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface InboundText {
  waMessageId: string;
  from: string; // E.164 with +
  name: string;
  body: string;
  timestamp: Date;
  toPhoneNumberId: string;
}

export interface InboundStatus {
  waMessageId: string;
  status: string; // sent | delivered | read | failed
  timestamp: Date;
  error?: string;
}

/** Listener for new guest messages; the concierge registers itself here (avoids a module cycle). */
export type InboundListener = (conversationId: string) => Promise<void>;

export function toConversationRow(c: Row) {
  return {
    id: c.id,
    propertyId: c.property_id,
    guestId: c.guest_id,
    contact: c.contact,
    contactName: c.contact_name,
    language: c.language,
    status: c.status,
    aiPaused: c.ai_paused,
    escalationSummary: c.escalation_summary,
    unreadCount: c.unread_count,
    lastInboundAt: c.last_inbound_at,
    lastMessageAt: c.last_message_at,
    lastMessage: c.last_body ?? null,
    windowOpen: windowOpen(c.last_inbound_at),
  };
}

export function toMessageRow(m: Row) {
  return {
    id: m.id,
    direction: m.direction,
    body: m.body,
    status: m.status,
    sentBy: m.sent_by,
    aiGenerated: m.ai_generated,
    templateId: m.template_id,
    error: m.error,
    createdAt: m.created_at,
  };
}

export function windowOpen(lastInboundAt: Date | string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < WHATSAPP_SERVICE_WINDOW_HOURS * 3_600_000;
}

/**
 * WhatsApp inbox per property (spec §3.4). Inbound webhooks are signature-verified and idempotent
 * on the WhatsApp message id; every outbound message is logged against its conversation.
 */
@Injectable()
export class InboxService {
  private readonly log = new Logger(InboxService.name);
  private listeners: InboundListener[] = [];

  constructor(
    private readonly db: DbService,
    private readonly whatsapp: WhatsAppChannel,
    private readonly notify: NotificationsService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  onInbound(listener: InboundListener): void {
    this.listeners.push(listener);
  }

  // ------------------------------------------------------------------ webhook

  verifySignature(rawBody: Buffer | undefined, signature: string | undefined): void {
    if (!this.config.WHATSAPP_APP_SECRET) {
      if (this.config.NODE_ENV === 'production') throw new UnauthorizedException('Webhook secret not configured');
      return; // dev: allow unsigned test payloads
    }
    if (!rawBody || !signature?.startsWith('sha256=')) throw new UnauthorizedException('Missing signature');
    const expected = Buffer.from(`sha256=${createHmac('sha256', this.config.WHATSAPP_APP_SECRET).update(rawBody).digest('hex')}`);
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new UnauthorizedException('Bad signature');
  }

  /** Flatten Meta's webhook envelope into texts and status updates. */
  parseWebhook(payload: any): { texts: InboundText[]; statuses: InboundStatus[] } {
    const texts: InboundText[] = [];
    const statuses: InboundStatus[] = [];
    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const v = change?.value ?? {};
        const toId = v.metadata?.phone_number_id ?? '';
        const names = new Map<string, string>((v.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name ?? '']));
        for (const m of v.messages ?? []) {
          const body =
            m.text?.body ??
            m.button?.text ??
            m.interactive?.button_reply?.title ??
            m.interactive?.list_reply?.title ??
            (m.location ? `[location ${m.location.latitude},${m.location.longitude}]` : `[${m.type ?? 'message'}]`);
          texts.push({
            waMessageId: m.id,
            from: `+${m.from}`,
            name: names.get(m.from) ?? '',
            body: String(body).slice(0, 4000),
            timestamp: new Date(Number(m.timestamp) * 1000),
            toPhoneNumberId: toId,
          });
        }
        for (const s of v.statuses ?? []) {
          statuses.push({ waMessageId: s.id, status: s.status, timestamp: new Date(Number(s.timestamp) * 1000), error: s.errors?.[0]?.title });
        }
      }
    }
    return { texts, statuses };
  }

  async handleWebhook(payload: unknown): Promise<{ stored: number; duplicates: number }> {
    const { texts, statuses } = this.parseWebhook(payload);
    let stored = 0;
    let duplicates = 0;
    for (const s of statuses) {
      await this.db.query(
        `update message set status = $2, read_at = case when $2 = 'read' then $3 else read_at end, error = coalesce($4, error)
          where wa_message_id = $1`,
        [s.waMessageId, s.status, s.timestamp, s.error ?? null],
      );
    }
    for (const m of texts) {
      const conversationId = await this.storeInbound(m);
      if (conversationId === 'duplicate') {
        duplicates++;
        continue;
      }
      if (!conversationId) continue;
      stored++;
      for (const l of this.listeners) l(conversationId).catch((err) => this.log.error(`inbound listener failed: ${err.message}`));
    }
    return { stored, duplicates };
  }

  /** Store one inbound message. Returns the conversation id, 'duplicate', or null if no property matches. */
  async storeInbound(m: InboundText): Promise<string | 'duplicate' | null> {
    const property = await this.resolveProperty(m.toPhoneNumberId, m.from);
    if (!property) {
      this.log.warn(`WhatsApp message to ${m.toPhoneNumberId} from ${m.from} matches no property`);
      return null;
    }
    const out = await this.db.tx(async (tx) => {
      const guest = await this.db.one(
        `select id, language from guest where tenant_id = $1 and phone = $2 order by created_at desc limit 1`,
        [property.tenant_id, m.from],
        tx,
      );
      const conv = (await this.db.one(
        `insert into conversation (tenant_id, property_id, guest_id, contact, contact_name, language, last_inbound_at, last_message_at, unread_count)
         values ($1, $2, $3, $4, $5, $6, $7, $7, 0)
         on conflict (property_id, channel, contact) do update
           set guest_id = coalesce(conversation.guest_id, excluded.guest_id),
               contact_name = case when excluded.contact_name <> '' then excluded.contact_name else conversation.contact_name end
         returning *, (xmax = 0) as created`,
        [property.tenant_id, property.id, guest?.id ?? null, m.from, m.name, guest?.language ?? 'en', m.timestamp],
        tx,
      ))!;
      const inserted = await this.db.one(
        `insert into message (tenant_id, property_id, guest_id, conversation_id, channel, direction, recipient, body, status, wa_message_id, sent_by, created_at)
         values ($1, $2, $3, $4, 'whatsapp', 'in', $5, $6, 'received', $7, 'guest', $8)
         on conflict (wa_message_id) where wa_message_id is not null do nothing
         returning id`,
        [property.tenant_id, property.id, conv.guest_id, conv.id, m.from, m.body, m.waMessageId, m.timestamp],
        tx,
      );
      if (!inserted) return 'duplicate' as const;
      await this.db.query(
        `update conversation set last_inbound_at = greatest(coalesce(last_inbound_at, $2), $2), last_message_at = now(),
                unread_count = unread_count + 1, status = case when status = 'closed' then 'open' else status end
          where id = $1`,
        [conv.id, m.timestamp],
        tx,
      );
      return { id: conv.id as string, created: conv.created as boolean, aiOn: property.concierge_enabled && !conv.ai_paused };
    });
    if (out === 'duplicate') return out;
    // Without the concierge, a new conversation pings the owner so nobody waits unanswered.
    if (out.created && !out.aiOn) {
      this.notify.run(this.notify.ownerAlert(property.id, `New WhatsApp message from ${m.name || m.from}: "${m.body.slice(0, 120)}"`, `/inbox/${out.id}`));
    }
    return out.id;
  }

  /**
   * The property a message belongs to: its own number when it has one; on the shared platform
   * number, the property of the sender's most recent booking.
   */
  private async resolveProperty(phoneNumberId: string, from: string): Promise<Row | null> {
    const own = await this.db.one(`select * from property where whatsapp_phone_number_id = $1`, [phoneNumberId]);
    if (own) return own;
    return this.db.one(
      `select p.* from guest g join booking b on b.guest_id = g.id join property p on p.id = b.property_id
        where g.phone = $1 and p.whatsapp_phone_number_id is null order by b.created_at desc limit 1`,
      [from],
    );
  }

  // ------------------------------------------------------------------ sending

  /**
   * Send free text into a conversation. Only inside the 24-hour service window; outside it the
   * owner must use a template (sequences do this automatically).
   */
  async sendText(conversationId: string, body: string, sentBy: string, opts: { aiGenerated?: boolean; tx?: pg.PoolClient } = {}) {
    const conv = await this.db.one(
      `select c.*, p.whatsapp_phone_number_id from conversation c join property p on p.id = c.property_id where c.id = $1`,
      [conversationId],
    );
    if (!conv) throw new NotFoundException('Conversation not found');
    if (!windowOpen(conv.last_inbound_at)) {
      throw new ConflictException('The 24-hour WhatsApp window has closed. The guest must message first, or use an automated template.');
    }
    const result = await this.whatsapp.sendText(conv.contact, body, conv.whatsapp_phone_number_id);
    const row = await this.db.one(
      `insert into message (tenant_id, property_id, guest_id, conversation_id, channel, direction, recipient, body, status, error,
                            wa_message_id, sent_by, ai_generated, sent_at)
       values ($1, $2, $3, $4, 'whatsapp', 'out', $5, $6, $7, $8, $9, $10, $11, case when $7 in ('sent', 'logged') then now() end)
       returning *`,
      [conv.tenant_id, conv.property_id, conv.guest_id, conv.id, conv.contact, body, result.status, result.error ?? null, result.providerId ?? null, sentBy, opts.aiGenerated ?? false],
    );
    await this.db.query(`update conversation set last_message_at = now() where id = $1`, [conv.id]);
    if (!result.ok) throw new BadRequestException(`WhatsApp send failed: ${result.error}`);
    return toMessageRow(row!);
  }

  // ------------------------------------------------------------------ owner inbox

  listConversations(user: SessionUser, propertyId: string, status?: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select c.*, (select body from message m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_body
           from conversation c where c.property_id = $1 ${status ? 'and c.status = $2' : ''}
          order by (c.status = 'needs_human') desc, c.last_message_at desc limit 200`,
        status ? [propertyId, status] : [propertyId],
        tx,
      );
      return rows.map(toConversationRow);
    });
  }

  thread(user: SessionUser, conversationId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const c = await this.db.one(`select * from conversation where id = $1`, [conversationId], tx);
      if (!c) throw new NotFoundException('Conversation not found');
      const messages = await this.db.query(
        `select * from (select * from message where conversation_id = $1 order by created_at desc limit 200) m order by created_at`,
        [conversationId],
        tx,
      );
      await this.db.query(`update conversation set unread_count = 0 where id = $1`, [conversationId], tx);
      const bookings = c.guest_id
        ? await this.db.query(
            `select b.id, b.reference, b.status, b.from_date, b.to_date, r.name as room_name from booking b join room r on r.id = b.room_id
              where b.guest_id = $1 and b.status not in ('abandoned') order by b.from_date desc limit 5`,
            [c.guest_id],
            tx,
          )
        : [];
      return {
        conversation: toConversationRow(c),
        messages: messages.map(toMessageRow),
        bookings: bookings.map((b) => ({ id: b.id, reference: b.reference, status: b.status, from: b.from_date, to: b.to_date, roomName: b.room_name })),
      };
    });
  }

  async ownerSend(user: SessionUser, conversationId: string, body: string) {
    await this.db.withTenant(user.tenantId, async (tx) => {
      const c = await this.db.one(`select id from conversation where id = $1`, [conversationId], tx);
      if (!c) throw new NotFoundException('Conversation not found');
    });
    return this.sendText(conversationId, body, `user:${user.id}`);
  }

  updateConversation(user: SessionUser, conversationId: string, input: { aiPaused?: boolean; status?: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `update conversation set ai_paused = coalesce($2, ai_paused), status = coalesce($3, status),
                escalation_summary = case when coalesce($3, status) = 'open' then null else escalation_summary end
          where id = $1 returning *`,
        [conversationId, input.aiPaused ?? null, input.status ?? null],
        tx,
      );
      if (!row) throw new NotFoundException('Conversation not found');
      return toConversationRow(row);
    });
  }
}
