import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { RevalidateService } from '../../common/revalidate.service.js';

export const DELETED_GUEST_NAME = 'Deleted guest';
/** Spec §6 Retention, and the promise on every guest site's privacy page. */
export const MESSAGE_RETENTION = '24 months';
export const IDENTITY_RETENTION = '36 months';
const BATCH = 500;

export interface EraseResult {
  bookings: number;
  messages: number;
  conversations: number;
  propertyIds: string[];
}

export interface RetentionResult {
  messages: number;
  conversations: number;
  guests: number;
}

/**
 * GDPR / Sri Lanka PDPA for guests (spec §3.12, §5): export a guest's data, erase it on request,
 * and the retention job. Erasure anonymises the guest and removes what they wrote or were sent;
 * money records (payment, invoice and its PDF, slips, gateway webhooks) stay for 7 years as the
 * law requires and the privacy page says — their append-only triggers are never bypassed.
 * A new table or column holding guest data must be added here (CLAUDE.md rule 21).
 */
@Injectable()
export class PrivacyService {
  private readonly log = new Logger(PrivacyService.name);

  constructor(
    private readonly db: DbService,
    private readonly revalidate: RevalidateService,
  ) {}

  /** Everything we hold about one guest, machine-readable (GDPR art. 15 and 20). */
  async export(user: SessionUser, guestId: string) {
    if (user.role === 'staff') throw new ForbiddenException('Not allowed for your role');
    return this.db.withTenant(user.tenantId, async (tx) => {
      const g = await this.db.one(`select * from guest where id = $1`, [guestId], tx);
      if (!g) throw new NotFoundException('Guest not found');
      const bookings = await this.db.query(
        `select b.id, b.reference, b.status, b.source, b.from_date, b.to_date, b.guests, b.total, b.currency,
                b.special_requests, b.created_at, p.name as property, r.name as room
           from booking b join property p on p.id = b.property_id join room r on r.id = b.room_id
          where b.guest_id = $1 order by b.from_date`,
        [guestId],
        tx,
      );
      const ids = bookings.map((b) => b.id);
      const reference = new Map(bookings.map((b) => [b.id, b.reference]));
      const contacts = [g.email, g.phone].filter(Boolean);
      // One query at a time: a transaction's client runs queries in sequence.
      const payments = await this.db.query(
        `select booking_id, method, kind, amount, currency, status, created_at from v_payment_effective
          where booking_id = any($1::uuid[]) order by created_at`,
        [ids],
        tx,
      );
      const invoices = await this.db.query(`select booking_id, number, kind, issued_at, total, currency, pdf_url from invoice where booking_id = any($1::uuid[]) order by issued_at`, [ids], tx);
      const conversations = await this.db.query(`select id, contact, contact_name, language, created_at from conversation where guest_id = $1 order by created_at`, [guestId], tx);
      const messages = await this.db.query(
        `select booking_id, conversation_id, channel, direction, subject, body, created_at from message
          where guest_id = $1
             or conversation_id in (select id from conversation where guest_id = $1)
             or (booking_id = any($2::uuid[]) and recipient = any($3::text[]))
          order by created_at`,
        [guestId, ids, contacts],
        tx,
      );
      const reviews = await this.db.query(`select booking_id, rating, body, guest_name, owner_reply, created_at from review where booking_id = any($1::uuid[])`, [ids], tx);
      const addOns = await this.db.query(
        `select o.booking_id, a.name, o.date, o.time, o.qty, o.amount, o.currency, o.status, o.notes, o.rating, o.rating_comment
           from add_on_order o join add_on a on a.id = o.add_on_id where o.booking_id = any($1::uuid[]) order by o.date`,
        [ids],
        tx,
      );
      const codes = await this.db.query(`select code, pct, valid_from, expires_at, uses, active from discount_code where guest_id = $1`, [guestId], tx);
      await this.audit(tx, user.tenantId, `user:${user.id}`, 'guest.export', guestId, null);
      const ref = (r: Row) => reference.get(r.booking_id) ?? null;
      return {
        exportedAt: new Date().toISOString(),
        guest: {
          name: g.name,
          email: g.email,
          phone: g.phone,
          country: g.country,
          language: g.language,
          passportLast4: g.passport_last4,
          notes: g.notes,
          createdAt: g.created_at,
          anonymizedAt: g.anonymized_at,
        },
        bookings: bookings.map((b) => ({
          reference: b.reference,
          property: b.property,
          room: b.room,
          from: b.from_date,
          to: b.to_date,
          guests: b.guests,
          status: b.status,
          source: b.source,
          total: b.total,
          currency: b.currency,
          specialRequests: b.special_requests,
          createdAt: b.created_at,
        })),
        payments: payments.map((p) => ({ booking: ref(p), method: p.method, kind: p.kind, amount: p.amount, currency: p.currency, status: p.status, at: p.created_at })),
        invoices: invoices.map((i) => ({ booking: ref(i), number: i.number, kind: i.kind, issuedAt: i.issued_at, total: i.total, currency: i.currency, pdf: i.pdf_url })),
        conversations: conversations.map((c) => ({ id: c.id, contact: c.contact, name: c.contact_name, language: c.language, startedAt: c.created_at })),
        messages: messages.map((m) => ({ booking: ref(m), conversation: m.conversation_id, channel: m.channel, direction: m.direction, subject: m.subject, body: m.body, at: m.created_at })),
        reviews: reviews.map((r) => ({ booking: ref(r), rating: r.rating, body: r.body, name: r.guest_name, ownerReply: r.owner_reply, at: r.created_at })),
        addOnOrders: addOns.map((o) => ({ booking: ref(o), item: o.name, date: o.date, time: o.time, qty: o.qty, amount: o.amount, currency: o.currency, status: o.status, notes: o.notes, rating: o.rating, ratingComment: o.rating_comment })),
        discountCodes: codes.map((c) => ({ code: c.code, pct: c.pct, validFrom: c.valid_from, expiresAt: c.expires_at, uses: c.uses, active: c.active })),
        keptByLaw: 'Payments and invoices are kept for 7 years after the stay, as tax law requires.',
      };
    });
  }

  /** Erase a guest on request (GDPR art. 17). The owner decides; managers can export only. */
  async erase(user: SessionUser, guestId: string): Promise<EraseResult> {
    if (user.role !== 'owner') throw new ForbiddenException('Only the owner can delete guest data');
    const res = await this.db.withTenant(user.tenantId, async (tx) => {
      const g = await this.db.one(`select id from guest where id = $1`, [guestId], tx);
      if (!g) throw new NotFoundException('Guest not found');
      return this.eraseIn(tx, user.tenantId, guestId, `user:${user.id}`);
    });
    for (const p of res.propertyIds) this.revalidate.property(p);
    return res;
  }

  setKeepProfile(user: SessionUser, guestId: string, keep: boolean) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`update guest set keep_profile = $2 where id = $1 and anonymized_at is null returning id`, [guestId, keep], tx);
      if (!r) throw new NotFoundException('Guest not found');
      return { ok: true };
    });
  }

  /**
   * Daily: delete guest messages older than 24 months, then anonymise guests whose last stay ended
   * more than 36 months ago, unless the owner keeps them as a repeat guest. Cross-tenant, in batches.
   * Money rows reach their 7 years in 2033 at the earliest; that clean-up is not built yet.
   */
  async retention(): Promise<RetentionResult> {
    const messages = await this.db.query(
      `delete from message where id in (select id from message where created_at < now() - interval '${MESSAGE_RETENTION}' limit ${BATCH * 10}) returning id`,
    );
    const conversations = await this.db.query(
      `delete from conversation c where c.last_message_at < now() - interval '${MESSAGE_RETENTION}'
          and not exists (select 1 from message m where m.conversation_id = c.id) returning id`,
    );
    const due = await this.db.query<{ id: string; tenant_id: string }>(
      `select g.id, g.tenant_id from guest g
        where g.anonymized_at is null and not g.keep_profile
          and g.created_at < now() - interval '${IDENTITY_RETENTION}'
          and not exists (select 1 from booking b where b.guest_id = g.id
                           and (b.to_date >= current_date - interval '${IDENTITY_RETENTION}' or b.status in ('checked_in')))
        limit ${BATCH}`,
    );
    const properties = new Set<string>();
    let guests = 0;
    for (const g of due) {
      try {
        const r = await this.db.withTenant(g.tenant_id, (tx) => this.eraseIn(tx, g.tenant_id, g.id, 'system:retention'));
        r.propertyIds.forEach((p) => properties.add(p));
        guests++;
      } catch (err) {
        this.log.warn(`retention: guest ${g.id} not anonymised: ${(err as Error).message}`);
      }
    }
    for (const p of properties) this.revalidate.property(p);
    if (messages.length || conversations.length || guests) {
      this.log.log(`retention: ${messages.length} message(s), ${conversations.length} conversation(s), ${guests} guest(s)`);
    }
    return { messages: messages.length, conversations: conversations.length, guests };
  }

  /** Inside a tenant transaction (RLS on). */
  private async eraseIn(tx: pg.PoolClient, tenantId: string, guestId: string, actor: string): Promise<EraseResult> {
    const g = (await this.db.one(`select * from guest where id = $1 for update`, [guestId], tx))!;
    if (g.anonymized_at) return { bookings: 0, messages: 0, conversations: 0, propertyIds: [] };
    const active = await this.db.one(
      `select reference from booking where guest_id = $1
          and (status = 'checked_in' or (status in ('pending', 'confirmed') and to_date >= current_date)) limit 1`,
      [guestId],
      tx,
    );
    if (active) throw new ConflictException(`Booking ${active.reference} is still open. Cancel it or wait until check-out.`);

    const bookings = await this.db.query(`select id, property_id, reference, external_uid from booking where guest_id = $1`, [guestId], tx);
    const ids = bookings.map((b) => b.id);
    const conversations = await this.db.query<{ id: string }>(
      `select id from conversation where guest_id = $1 or ($2::text is not null and contact = $2)`,
      [guestId, g.phone],
      tx,
    );
    const convIds = conversations.map((c) => c.id);
    // Owner alerts are stored without a guest or booking link; find them by the booking reference or
    // phone they quote. Not by name: other guests share names. Name-only alerts go with the 24-month retention.
    const quoted = [...bookings.map((b) => b.reference), ...(g.phone ? [g.phone] : [])];
    const messages = await this.db.query(
      `delete from message
        where guest_id = $1 or booking_id = any($2::uuid[]) or conversation_id = any($3::uuid[])
           or (guest_id is null and booking_id is null and conversation_id is null
               and property_id = any($4::uuid[]) and exists (select 1 from unnest($5::text[]) q where position(q in body) > 0))
        returning id`,
      [guestId, ids, convIds, [...new Set(bookings.map((b) => b.property_id))], quoted],
      tx,
    );
    await this.db.query(`delete from conversation where id = any($1::uuid[])`, [convIds], tx);
    await this.db.query(`update review set guest_name = 'Guest', body = '', owner_reply = null, public = false where booking_id = any($1::uuid[])`, [ids], tx);
    await this.db.query(`update booking set special_requests = '' where guest_id = $1`, [guestId], tx);
    if (g.name?.length >= 3) {
      await this.db.query(`update task set title = replace(title, $2, 'guest') where booking_id = any($1::uuid[]) and position($2 in title) > 0`, [ids, g.name], tx);
    }
    await this.db.query(`update add_on_order set notes = '', rating_comment = null where booking_id = any($1::uuid[])`, [ids], tx);
    await this.db.query(`update discount_code set active = false where guest_id = $1`, [guestId], tx);
    const otaIds = bookings.filter((b) => b.external_uid).map((b) => b.external_uid);
    if (otaIds.length) {
      await this.db.query(
        `update channel_event set payload = jsonb_set(payload, '{guest}', jsonb_build_object('name', $2::text))
          where payload ? 'guest' and payload->>'reservationId' = any($1::text[])`,
        [otaIds, DELETED_GUEST_NAME],
        tx,
      );
    }
    await this.db.query(
      `update guest set name = $2, email = null, phone = null, passport_last4 = null, notes = '', keep_profile = false, anonymized_at = now()
        where id = $1`,
      [guestId, DELETED_GUEST_NAME],
      tx,
    );
    const result = { bookings: ids.length, messages: messages.length, conversations: convIds.length };
    // Counts only: audit_log rows can never be removed, so no personal data goes in them.
    await this.audit(tx, tenantId, actor, 'guest.erase', guestId, result);
    return { ...result, propertyIds: [...new Set(bookings.map((b) => b.property_id as string))] };
  }

  private async audit(tx: pg.PoolClient, tenantId: string, actor: string, action: string, guestId: string, after: unknown) {
    await this.db.query(
      `insert into audit_log (tenant_id, actor, action, entity, entity_id, after) values ($1, $2, $3, 'guest', $4, $5)`,
      [tenantId, actor, action, guestId, after ? JSON.stringify(after) : null],
      tx,
    );
  }
}
