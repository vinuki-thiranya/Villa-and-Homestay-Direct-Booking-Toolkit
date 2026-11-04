import { Inject, Injectable, Logger } from '@nestjs/common';
import { CANCELLATION_POLICY_TEXT, formatMoney, t, type MessageKey } from '@staydirect/shared';
import { DbService, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { CatalogService } from '../properties/catalog.service.js';
import { EmailChannel, WhatsAppChannel, type SendResult } from './channels.js';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Guest and owner messages. Called after the transaction that changed state has committed;
 * a failed send never rolls back a booking. Every outbound message is written to `message`.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DbService,
    private readonly catalog: CatalogService,
    private readonly email: EmailChannel,
    private readonly whatsapp: WhatsAppChannel,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** Fire-and-forget wrapper so callers never fail on messaging. */
  run(task: Promise<unknown>): void {
    task.catch((err) => this.log.error(`notification failed: ${(err as Error).message}`));
  }

  async bookingConfirmed(bookingId: string): Promise<void> {
    const ctx = await this.context(bookingId);
    if (!ctx) return;
    await this.guestEmail(ctx, 'confirmedSubject', 'confirmedIntro');
    await this.ownerAlert(
      ctx.b.property_id,
      `New direct booking ${ctx.b.reference}: ${ctx.b.room_name}, ${ctx.b.from_date} → ${ctx.b.to_date}, ${ctx.b.guest_name}. Paid ${formatMoney(ctx.paid, ctx.b.currency)} of ${formatMoney(ctx.b.total, ctx.b.currency)}.`,
      `/bookings/${ctx.b.id}`,
    );
  }

  async bookingRequested(bookingId: string): Promise<void> {
    const ctx = await this.context(bookingId);
    if (!ctx) return;
    await this.guestEmail(ctx, 'requestSubject', 'requestIntro');
    await this.ownerAlert(
      ctx.b.property_id,
      `Booking request ${ctx.b.reference}: ${ctx.b.room_name}, ${ctx.b.from_date} → ${ctx.b.to_date}, ${ctx.b.guests} guests (${ctx.b.guest_name}). Approve within 12 hours.`,
      `/bookings/${ctx.b.id}`,
    );
  }

  /** Request-to-book approved: send the guest the payment link. */
  async paymentLink(bookingId: string): Promise<void> {
    const ctx = await this.context(bookingId);
    if (!ctx?.b.guest_email) return;
    const link = this.bookingUrl(ctx.property, ctx.b);
    const subject = `${ctx.property.name}: your request ${ctx.b.reference} is approved — pay the deposit`;
    const text = `Good news — ${ctx.property.name} accepted your request for ${ctx.b.from_date} → ${ctx.b.to_date}.\nPay the deposit of ${formatMoney(ctx.b.deposit_due, ctx.b.currency)} to confirm: ${link}`;
    await this.logged(ctx, 'email', ctx.b.guest_email, subject, text, () =>
      this.email.send({ to: ctx.b.guest_email, subject, text, html: `<p>${esc(text).replace(/\n/g, '<br>')}</p><p><a href="${link}">Pay deposit</a></p>`, replyTo: ctx.property.email }),
    );
  }

  /** "Still want these dates?" one hour after a hold expired (spec §4.1). */
  async abandonedFollowup(bookingId: string): Promise<void> {
    const ctx = await this.context(bookingId);
    if (!ctx?.b.guest_email) return;
    const link = `${this.catalog.siteUrl(ctx.property)}/book?room=${ctx.b.room_id}&from=${ctx.b.from_date}&to=${ctx.b.to_date}&guests=${ctx.b.guests}`;
    const subject = `Still want ${ctx.b.from_date} → ${ctx.b.to_date} at ${ctx.property.name}?`;
    const text = `Your reservation hold expired before payment. If the dates are still free you can book them here: ${link}`;
    await this.logged(ctx, 'email', ctx.b.guest_email, subject, text, () =>
      this.email.send({ to: ctx.b.guest_email, subject, text, html: `<p>${esc(text)}</p><p><a href="${link}">Check availability</a></p>`, replyTo: ctx.property.email }),
    );
  }

  /** Alert the owner: WhatsApp template to the property number, email fallback. */
  async ownerAlert(propertyId: string, text: string, path = ''): Promise<void> {
    const property = await this.db.one(`select * from property where id = $1`, [propertyId]);
    if (!property) return;
    const owner = await this.db.one(
      `select phone, email from app_user where tenant_id = $1 and role = 'owner' order by created_at limit 1`,
      [property.tenant_id],
    );
    const link = `${this.config.OWNER_APP_URL.replace(/\/$/, '')}${path}`;
    const body = `${property.name}: ${text}\n${link}`;
    const phone = property.whatsapp_number ?? owner?.phone;
    let result: SendResult = { ok: false, status: 'failed', error: 'no recipient' };
    if (phone) {
      result = await this.whatsapp.sendTemplate(phone, this.config.WHATSAPP_ALERT_TEMPLATE, [body]);
      await this.record(property.tenant_id, propertyId, null, null, 'whatsapp', phone, null, body, result);
    }
    const email = property.email ?? owner?.email;
    if (!result.ok && email) {
      const subject = `[${property.name}] ${text.slice(0, 80)}`;
      const r = await this.email.send({ to: email, subject, text: body, html: `<p>${esc(body).replace(/\n/g, '<br>')}</p>` });
      await this.record(property.tenant_id, propertyId, null, null, 'email', email, subject, body, r);
    }
  }

  // ------------------------------------------------------------------ internals

  private async context(bookingId: string) {
    const b = await this.db.one(
      `select b.*, r.name as room_name, g.name as guest_name, g.email as guest_email, g.phone as guest_phone,
              g.language as guest_language, p.paid
         from booking b
         join room r on r.id = b.room_id
         left join guest g on g.id = b.guest_id
         join v_booking_paid p on p.booking_id = b.id
        where b.id = $1`,
      [bookingId],
    );
    if (!b) return null;
    const property = await this.db.one(`select * from property where id = $1`, [b.property_id]);
    return { b, property: property!, paid: b.paid as number };
  }

  private bookingUrl(property: Row, b: Row): string {
    return `${this.catalog.siteUrl(property)}/booking/${b.reference}?t=${b.access_token}`;
  }

  private async guestEmail(ctx: NonNullable<Awaited<ReturnType<NotificationsService['context']>>>, subjectKey: MessageKey, introKey: MessageKey) {
    const { b, property, paid } = ctx;
    if (!b.guest_email) return;
    const lang = b.guest_language ?? 'en';
    const v = { name: b.guest_name, property: property.name, reference: b.reference };
    const subject = t(lang, subjectKey, v);
    const balance = Math.max(0, b.total - paid);
    const maps = this.catalog.mapsUrl(property);
    const wa = property.whatsapp_number ? `https://wa.me/${property.whatsapp_number.replace(/\D/g, '')}` : null;
    const rows: [string, string][] = [
      [t(lang, 'dates'), `${b.from_date} → ${b.to_date}`],
      [t(lang, 'room'), b.room_name],
      [t(lang, 'guests'), String(b.guests)],
      [t(lang, 'paid'), formatMoney(paid, b.currency)],
    ];
    if (balance > 0) {
      rows.push([t(lang, 'balance'), `${formatMoney(balance, b.currency)} ${b.balance_due_date ? t(lang, 'balanceBy', { date: b.balance_due_date }) : ''}`]);
    }
    const policy = b.cancellation_policy_snapshot?.policy as keyof typeof CANCELLATION_POLICY_TEXT | undefined;
    const lines = [
      t(lang, 'greeting', v),
      '',
      t(lang, introKey, v),
      '',
      ...rows.map(([k, val]) => `${k}: ${val}`),
      t(lang, 'checkIn', { time: property.check_in }) + ' · ' + t(lang, 'checkOut', { time: property.check_out }),
      property.address,
      maps ? `${t(lang, 'directions')}: ${maps}` : '',
      wa ? `${t(lang, 'whatsappHost')}: ${wa}` : '',
      policy ? `${t(lang, 'policy')}: ${CANCELLATION_POLICY_TEXT[policy]}` : '',
      '',
      this.bookingUrl(property, b),
      '',
      t(lang, 'footer', v),
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
    const text = lines.join('\n');
    const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;max-width:560px;margin:auto;padding:24px">
<h2 style="margin:0 0 4px">${esc(property.name)}</h2><p style="color:#64748b;margin:0 0 20px">${esc(b.reference)}</p>
<p>${esc(t(lang, 'greeting', v))}</p><p>${esc(t(lang, introKey, v))}</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">${rows
      .map(([k, val]) => `<tr><td style="padding:6px 0;color:#64748b">${esc(k)}</td><td style="padding:6px 0;text-align:right"><strong>${esc(val)}</strong></td></tr>`)
      .join('')}</table>
<p>${esc(t(lang, 'checkIn', { time: property.check_in }))} · ${esc(t(lang, 'checkOut', { time: property.check_out }))}<br>${esc(property.address)}</p>
<p>${maps ? `<a href="${maps}">${esc(t(lang, 'directions'))}</a>` : ''}${wa ? ` · <a href="${wa}">${esc(t(lang, 'whatsappHost'))}</a>` : ''}</p>
${policy ? `<p style="color:#475569;font-size:14px"><strong>${esc(t(lang, 'policy'))}:</strong> ${esc(CANCELLATION_POLICY_TEXT[policy])}</p>` : ''}
<p><a href="${this.bookingUrl(property, b)}">${esc(b.reference)}</a></p>
<p style="color:#94a3b8;font-size:12px">${esc(t(lang, 'footer', v))}</p></body></html>`;
    await this.logged(ctx, 'email', b.guest_email, subject, text, () =>
      this.email.send({ to: b.guest_email, subject, html, text, replyTo: property.email }),
    );
  }

  private async logged(
    ctx: { b: Row; property: Row },
    channel: 'email' | 'whatsapp',
    recipient: string,
    subject: string | null,
    body: string,
    send: () => Promise<SendResult>,
  ) {
    const result = await send();
    await this.record(ctx.property.tenant_id, ctx.property.id, ctx.b.guest_id, ctx.b.id, channel, recipient, subject, body, result);
  }

  private async record(
    tenantId: string,
    propertyId: string,
    guestId: string | null,
    bookingId: string | null,
    channel: string,
    recipient: string,
    subject: string | null,
    body: string,
    result: SendResult,
  ) {
    await this.db.query(
      `insert into message (tenant_id, property_id, guest_id, booking_id, channel, direction, recipient, subject, body, status, error, sent_at)
       values ($1, $2, $3, $4, $5, 'out', $6, $7, $8, $9, $10, case when $9 = 'sent' then now() end)`,
      [tenantId, propertyId, guestId, bookingId, channel, recipient, subject, body, result.status, result.error ?? null],
    );
  }
}
