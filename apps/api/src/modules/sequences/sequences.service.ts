import { Injectable, Logger } from '@nestjs/common';
import {
  addDays,
  diffDays,
  REPEAT_GUEST_CODE_AFTER_DAYS,
  REPEAT_GUEST_CODE_VALID_DAYS,
  t,
  todayIn,
  type Language,
  type MessageKey,
  type SequenceTrigger,
} from '@staydirect/shared';
import { randomInt } from 'node:crypto';
import { DbService, isUniqueViolation, type Row } from '../../common/db.service.js';
import { windowOpen } from '../inbox/inbox.service.js';
import { EmailChannel, WhatsAppChannel, type SendResult } from '../notifications/channels.js';
import { CatalogService } from '../properties/catalog.service.js';

/** Guest-local sending hours: nobody gets a pre-arrival message at 3 am. */
const SEND_FROM_HOUR = 8;
const SEND_UNTIL_HOUR = 21;

const STEPS: { trigger: SequenceTrigger; key: MessageKey; template: string; minHour?: number }[] = [
  { trigger: 'booking_confirmed', key: 'seqBookingConfirmed', template: 'sd_booking_confirmed' },
  { trigger: 'pre_arrival_7d', key: 'seqPreArrival7d', template: 'sd_pre_arrival_7d' },
  { trigger: 'pre_arrival_1d', key: 'seqPreArrival1d', template: 'sd_pre_arrival_1d' },
  { trigger: 'arrival', key: 'seqArrival', template: 'sd_arrival_guide', minHour: 12 },
  { trigger: 'mid_stay', key: 'seqMidStay', template: 'sd_mid_stay_addons', minHour: 10 },
  { trigger: 'check_out', key: 'seqCheckOut', template: 'sd_checkout_review', minHour: 9 },
];

/**
 * Automated guest messages (spec §3.4 pre-arrival sequence) and repeat-guest codes (§3.8).
 * Every send is claimed in sequence_send first, so re-runs never message a guest twice.
 */
@Injectable()
export class SequencesService {
  private readonly log = new Logger(SequencesService.name);

  constructor(
    private readonly db: DbService,
    private readonly catalog: CatalogService,
    private readonly whatsapp: WhatsAppChannel,
    private readonly email: EmailChannel,
  ) {}

  /** Which bookings a trigger applies to on a given property-local date. */
  private dueSql(trigger: SequenceTrigger): string {
    switch (trigger) {
      case 'booking_confirmed':
        return `b.status in ('confirmed', 'checked_in') and b.updated_at > now() - interval '2 days' and b.to_date > $2::date`;
      case 'pre_arrival_7d':
        return `b.status = 'confirmed' and b.from_date = $2::date + 7`;
      case 'pre_arrival_1d':
        return `b.status = 'confirmed' and b.from_date = $2::date + 1`;
      case 'arrival':
        return `b.status in ('confirmed', 'checked_in') and b.from_date = $2::date`;
      case 'mid_stay':
        return `b.status in ('confirmed', 'checked_in') and (b.to_date - b.from_date) >= 4 and b.from_date + ((b.to_date - b.from_date) / 2) = $2::date`;
      case 'check_out':
        return `b.status in ('confirmed', 'checked_in', 'checked_out') and b.to_date = $2::date`;
    }
  }

  async run(now = new Date()): Promise<number> {
    const properties = await this.db.query(`select * from property where published`);
    let sent = 0;
    for (const p of properties) {
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: p.timezone, hour: '2-digit', hourCycle: 'h23' }).format(now));
      if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) continue;
      const today = todayIn(p.timezone, now);
      const settings = new Map(
        (await this.db.query(`select trigger, enabled, channel from sequence where property_id = $1`, [p.id])).map((s) => [s.trigger, s]),
      );
      for (const step of STEPS) {
        const setting = settings.get(step.trigger);
        if (setting && !setting.enabled) continue;
        if (step.minHour && hour < step.minHour) continue;
        const due = await this.db.query(
          `select b.*, g.name as guest_name, g.email as guest_email, g.phone as guest_phone, g.language as guest_language
             from booking b left join guest g on g.id = b.guest_id
            where b.property_id = $1 and b.source = 'direct' and ${this.dueSql(step.trigger)}
              and not exists (select 1 from sequence_send s where s.booking_id = b.id and s.trigger = $3)`,
          [p.id, today, step.trigger],
        );
        for (const b of due) {
          if (await this.sendStep(p, b, step, setting?.channel ?? 'auto')) sent++;
        }
      }
    }
    return sent;
  }

  private async sendStep(p: Row, b: Row, step: (typeof STEPS)[number], channel: string): Promise<boolean> {
    try {
      await this.db.query(`insert into sequence_send (booking_id, trigger, tenant_id, channel, status) values ($1, $2, $3, 'pending', 'claimed')`, [
        b.id,
        step.trigger,
        b.tenant_id,
      ]);
    } catch (err) {
      if (isUniqueViolation(err)) return false; // another run got it
      throw err;
    }
    const lang = (['en', 'de', 'fr', 'hi'].includes(b.guest_language) ? b.guest_language : 'en') as Language;
    const vars = this.vars(p, b);
    const text = t(lang, step.key, vars);

    let used = 'none';
    let result: SendResult = { ok: false, status: 'failed', error: 'no contact' };
    if (channel !== 'email' && b.guest_phone) {
      const conv = await this.db.one(`select id, last_inbound_at from conversation where property_id = $1 and contact = $2`, [p.id, b.guest_phone]);
      result = windowOpen(conv?.last_inbound_at ?? null)
        ? await this.whatsapp.sendText(b.guest_phone, text, p.whatsapp_phone_number_id)
        : await this.whatsapp.sendNamedTemplate(b.guest_phone, step.template, lang, vars, p.whatsapp_phone_number_id);
      used = 'whatsapp';
      await this.log_(p, b, conv?.id ?? null, 'whatsapp', b.guest_phone, null, text, result, step.template);
    }
    // booking_confirmed already has its confirmation email (NotificationsService); WhatsApp only here.
    if (!result.ok && channel !== 'whatsapp' && step.trigger !== 'booking_confirmed' && b.guest_email) {
      const subject = `${p.name} — ${b.reference}`;
      result = await this.email.send({ to: b.guest_email, subject, text, html: `<p>${escapeHtml(text).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>`, replyTo: p.email });
      used = 'email';
      await this.log_(p, b, null, 'email', b.guest_email, subject, text, result, null);
    }
    await this.db.query(`update sequence_send set channel = $3, status = $4, sent_at = now() where booking_id = $1 and trigger = $2`, [
      b.id,
      step.trigger,
      used,
      result.ok ? result.status : 'failed',
    ]);
    if (step.trigger === 'check_out' && result.ok) {
      await this.db.query(`update booking set review_requested_at = now() where id = $1`, [b.id]);
    }
    return result.ok;
  }

  private vars(p: Row, b: Row): Record<string, string> {
    const site = this.catalog.siteUrl(p);
    const bookingUrl = `${site}/booking/${b.reference}?t=${b.access_token}`;
    return {
      property: p.name,
      reference: b.reference,
      from: b.from_date,
      to: b.to_date,
      link: bookingUrl,
      directions: this.catalog.mapsUrl(p) ?? p.address,
      checkIn: p.check_in,
      checkOut: p.check_out,
      address: p.address,
      guide: `${site}/guide/${p.guide_token}`,
      addons: `${bookingUrl}#addons`,
      review: `${site}/review/${b.reference}?t=${b.access_token}`,
    };
  }

  // ---------------------------------------------------------------- repeat-guest codes
  /**
   * Daily: guests whose last stay ended ~11 months ago get a personal "book direct next time"
   * code (spec §3.8), once per property.
   */
  async repeatGuestCodes(now = new Date()): Promise<number> {
    const candidates = await this.db.query(
      `select distinct on (b.property_id, g.id) b.property_id, b.tenant_id, g.id as guest_id, g.name, g.email, g.phone, g.language,
              p.repeat_guest_discount_pct as pct, b.to_date
         from booking b join guest g on g.id = b.guest_id join property p on p.id = b.property_id
        where b.status in ('checked_out', 'confirmed', 'checked_in') and b.source = 'direct'
          and b.to_date between $1::date - 365 and $1::date - $2::int
          and p.repeat_guest_discount_pct > 0 and g.anonymized_at is null
          and not exists (select 1 from booking n where n.guest_id = g.id and n.property_id = b.property_id and n.to_date > b.to_date
                          and n.status in ('pending', 'confirmed', 'checked_in', 'checked_out'))
          and not exists (select 1 from discount_code c where c.property_id = b.property_id and c.guest_id = g.id and c.reason = 'repeat_guest')
        order by b.property_id, g.id, b.to_date desc`,
      [now.toISOString().slice(0, 10), REPEAT_GUEST_CODE_AFTER_DAYS],
    );
    let created = 0;
    for (const c of candidates) {
      const p = (await this.db.one(`select * from property where id = $1`, [c.property_id]))!;
      const today = todayIn(p.timezone, now);
      if (diffDays(c.to_date, today) < REPEAT_GUEST_CODE_AFTER_DAYS) continue;
      const code = `BACK${Math.round(c.pct)}-${randomCode()}`;
      const expires = addDays(today, REPEAT_GUEST_CODE_VALID_DAYS);
      try {
        await this.db.query(
          `insert into discount_code (tenant_id, property_id, code, guest_id, pct, expires_at, max_uses, reason)
           values ($1, $2, $3, $4, $5, $6, 1, 'repeat_guest')`,
          [c.tenant_id, c.property_id, code, c.guest_id, c.pct, expires],
        );
      } catch (err) {
        if (isUniqueViolation(err)) continue;
        throw err;
      }
      created++;
      const lang = (['en', 'de', 'fr', 'hi'].includes(c.language) ? c.language : 'en') as Language;
      const vars = { property: p.name, pct: String(Math.round(c.pct)), code, date: expires, link: `${this.catalog.siteUrl(p)}/book?code=${code}` };
      const text = t(lang, 'repeatCode', vars);
      let res: SendResult = { ok: false, status: 'failed' };
      if (c.phone) {
        res = await this.whatsapp.sendNamedTemplate(c.phone, 'sd_repeat_guest_code', lang, vars, p.whatsapp_phone_number_id);
        await this.log_(p, { id: null, guest_id: c.guest_id }, null, 'whatsapp', c.phone, null, text, res, 'sd_repeat_guest_code');
      }
      if (!res.ok && c.email) {
        res = await this.email.send({ to: c.email, subject: `${p.name}: ${Math.round(c.pct)}% off your next stay`, text, html: `<p>${escapeHtml(text)}</p>`, replyTo: p.email });
        await this.log_(p, { id: null, guest_id: c.guest_id }, null, 'email', c.email, 'repeat guest code', text, res, null);
      }
    }
    return created;
  }

  private async log_(p: Row, b: Row, conversationId: string | null, channel: string, to: string, subject: string | null, body: string, r: SendResult, template: string | null) {
    await this.db.query(
      `insert into message (tenant_id, property_id, guest_id, booking_id, conversation_id, channel, direction, recipient, subject, body,
                            template_id, status, error, wa_message_id, sent_by, sent_at)
       values ($1, $2, $3, $4, $5, $6, 'out', $7, $8, $9, $10, $11, $12, $13, 'system', case when $11 in ('sent', 'logged') then now() end)`,
      [p.tenant_id, p.id, b.guest_id, b.id, conversationId, channel, to, subject, body, template, r.status, r.error ?? null, r.providerId ?? null],
    );
  }
}

function randomCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[randomInt(0, A.length)];
  return s;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
