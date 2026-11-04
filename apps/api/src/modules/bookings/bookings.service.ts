import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  balanceDueDate,
  CANCELLATION_POLICY_TEXT,
  HOLD_MINUTES,
  refundDue,
  REQUEST_HOLD_HOURS,
  todayIn,
  type BookingStatus,
  type CreateBooking,
  type CreateBookingResult,
  type OwnerBookingRow,
  type PublicBooking,
  type SessionUser,
} from '@staydirect/shared';
import { timingSafeEqual } from 'node:crypto';
import type pg from 'pg';
import { bookingReference } from '../../common/crypto.js';
import { DbService, isUniqueViolation, type Row } from '../../common/db.service.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CatalogService } from '../properties/catalog.service.js';
import { enabledMethods } from '../properties/mappers.js';

/** Allowed status transitions (spec §6 booking.status). */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'abandoned'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  no_show: [],
  abandoned: ['confirmed'], // only via a payment that arrived after the hold expired
};

export const BOOKING_LIST_SQL = `
  select b.*, r.name as room_name, g.name as guest_name, g.phone as guest_phone, g.email as guest_email, p.paid
    from booking b
    join room r on r.id = b.room_id
    left join guest g on g.id = b.guest_id
    join v_booking_paid p on p.booking_id = b.id`;

export function toOwnerBooking(b: Row): OwnerBookingRow {
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    source: b.source,
    roomId: b.room_id,
    roomName: b.room_name,
    guestName: b.guest_name ?? null,
    guestPhone: b.guest_phone ?? null,
    guestEmail: b.guest_email ?? null,
    from: b.from_date,
    to: b.to_date,
    guests: b.guests,
    total: b.total,
    currency: b.currency,
    deposit: b.deposit_due,
    paid: b.paid ?? 0,
    balance: Math.max(0, Math.round((b.total - (b.paid ?? 0)) * 100) / 100),
    needsRefund: b.needs_refund,
    mode: b.mode,
    createdAt: b.created_at instanceof Date ? b.created_at.toISOString() : b.created_at,
  };
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly db: DbService,
    private readonly inventory: InventoryService,
    private readonly availability: AvailabilityService,
    private readonly catalog: CatalogService,
    private readonly notify: NotificationsService,
  ) {}

  // ------------------------------------------------------------------ guest flow

  /**
   * Spec §4.1 step 2: create a pending booking and its hold in ONE transaction.
   * The unique active-night index makes a concurrent second request fail here with 409.
   */
  async create(input: CreateBooking): Promise<CreateBookingResult> {
    const property = await this.catalog.propertyBySite(input.site);
    if (!property) throw new NotFoundException('Property not found');
    const bundle = await this.catalog.bundle(property.id);
    if (!bundle) throw new NotFoundException('Property not found');
    if (!this.catalog.bookingEnabled(bundle.tenant)) {
      throw new ForbiddenException('Online booking is paused for this property. Please enquire on WhatsApp.');
    }
    const room = bundle.rooms.find((r) => r.id === input.roomId);
    if (!room) throw new NotFoundException('Room not found');

    const promo = input.discountCode ? await this.validateDiscount(property.id, input.discountCode) : null;
    const quote = this.availability.quote(bundle, room, input.from, input.to, input.guests, promo?.pct ?? 0);
    if (quote.violations.length) {
      throw new UnprocessableEntityException({ message: 'These dates cannot be booked', violations: quote.violations });
    }
    const mode = room.booking_mode ?? property.booking_mode;
    const today = todayIn(property.timezone);
    const expiresAt = new Date(Date.now() + (mode === 'request' ? REQUEST_HOLD_HOURS * 3_600_000 : HOLD_MINUTES * 60_000));

    const result = await this.db.tx(async (tx) => {
      // Cleaning-buffer check (the overlap itself is enforced by the unique index below).
      if (!(await this.availability.roomIsFree(bundle, room, input.from, input.to, tx))) {
        throw new ConflictException({ message: 'Those nights are no longer available', code: 'nights_unavailable' });
      }
      const guestId = await this.upsertGuest(tx, property.tenant_id, input.guest);
      const booking = await this.insertBooking(tx, {
        tenantId: property.tenant_id,
        propertyId: property.id,
        roomId: room.id,
        guestId,
        from: input.from,
        to: input.to,
        guests: input.guests,
        mode,
        currency: property.base_currency,
        displayCurrency: input.displayCurrency,
        specialRequests: input.specialRequests,
        quote,
        balanceDue: balanceDueDate(input.from, quote.cancellationPolicy, today),
        discountCodeId: promo?.id ?? null,
      });
      await this.inventory.createHold(tx, {
        tenantId: property.tenant_id,
        roomId: room.id,
        bookingId: booking.id,
        from: input.from,
        to: input.to,
        expiresAt,
      });
      await this.inventory.logStatus(tx, property.tenant_id, booking.id, null, 'pending', 'guest', mode === 'request' ? 'request-to-book' : undefined);
      return booking;
    });
    this.availability.invalidate(property.id);
    if (mode === 'request') this.notify.run(this.notify.bookingRequested(result.id));
    return { reference: result.reference, token: result.access_token, status: 'pending', holdExpiresAt: expiresAt.toISOString() };
  }

  /** Booking as the guest sees it. Requires the access token from the confirmation link. */
  async getPublic(reference: string, token: string): Promise<PublicBooking> {
    const b = await this.findByReference(reference, token);
    const property = (await this.db.one(`select * from property where id = $1`, [b.property_id]))!;
    const hold = await this.db.one<{ expires_at: Date }>(
      `select expires_at from hold where booking_id = $1 and released_at is null and converted_at is null order by created_at desc limit 1`,
      [b.id],
    );
    const policy = (b.cancellation_policy_snapshot?.policy ?? property.default_cancellation_policy) as keyof typeof CANCELLATION_POLICY_TEXT;
    return {
      reference: b.reference,
      status: b.status,
      mode: b.mode,
      awaitingApproval: b.mode === 'request' && !b.approved_at && b.status === 'pending',
      propertyName: property.name,
      propertySlug: property.slug,
      roomName: b.room_name,
      from: b.from_date,
      to: b.to_date,
      guests: b.guests,
      guestName: b.guest_name,
      currency: b.currency,
      total: b.total,
      deposit: b.deposit_due,
      paid: b.paid,
      balance: Math.max(0, Math.round((b.total - b.paid) * 100) / 100),
      balanceDueDate: b.balance_due_date,
      cancellationPolicy: policy,
      cancellationPolicyText: CANCELLATION_POLICY_TEXT[policy],
      holdExpiresAt: hold ? hold.expires_at.toISOString() : null,
      paymentMethods: enabledMethods(this.catalog.gatewayConfig(property)),
      checkIn: property.check_in,
      checkOut: property.check_out,
      address: property.address,
      mapsUrl: this.catalog.mapsUrl(property),
      hostWhatsapp: property.whatsapp_number,
    };
  }

  async findByReference(reference: string, token: string): Promise<Row> {
    const b = await this.db.one(`${BOOKING_LIST_SQL} where b.reference = $1`, [reference]);
    if (!b || !safeEqual(b.access_token, token)) throw new NotFoundException('Booking not found');
    return b;
  }

  /**
   * Called inside the payment transaction once a payment row is confirmed.
   * pending/abandoned → confirmed when the deposit is covered; nights become reserved.
   * Returns 'confirmed' when the guest should get a confirmation message.
   */
  async applyPayment(tx: pg.PoolClient, bookingId: string, actor: string): Promise<'confirmed' | 'needs_refund' | 'noop'> {
    const b = await this.db.one(
      `select b.*, p.paid from booking b join v_booking_paid p on p.booking_id = b.id where b.id = $1 for update of b`,
      [bookingId],
      tx,
    );
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'pending' && b.status !== 'abandoned') return 'noop';
    if (b.paid + 0.005 < b.deposit_due) return 'noop'; // partial payment: wait for the rest of the deposit

    const reserved = await this.inventory.reserveForBooking(tx, b as any);
    if (!reserved) {
      // Paid after the hold expired and someone else took the nights: keep the money visible, flag a refund.
      await this.db.query(`update booking set needs_refund = true, updated_at = now() where id = $1`, [b.id], tx);
      await this.inventory.logStatus(tx, b.tenant_id, b.id, b.status, b.status, actor, 'payment received but nights were taken; refund needed');
      return 'needs_refund';
    }
    await this.setStatus(tx, b, 'confirmed', actor);
    await this.db.query(`update guest set stays_count = stays_count + 1 where id = $1`, [b.guest_id], tx);
    if (b.discount_code_id) await this.db.query(`update discount_code set uses = uses + 1 where id = $1`, [b.discount_code_id], tx);
    return 'confirmed';
  }

  // ------------------------------------------------------------------ owner operations

  list(user: SessionUser, propertyId: string, q: { status?: string; from?: string; to?: string; search?: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const params: unknown[] = [propertyId];
      const where = ['b.property_id = $1'];
      if (q.status) {
        params.push(q.status.split(','));
        where.push(`b.status = any($${params.length})`);
      } else {
        where.push(`b.status not in ('abandoned')`);
      }
      if (q.from) {
        params.push(q.from);
        where.push(`b.to_date > $${params.length}`);
      }
      if (q.to) {
        params.push(q.to);
        where.push(`b.from_date < $${params.length}`);
      }
      if (q.search) {
        params.push(`%${q.search}%`);
        where.push(`(b.reference ilike $${params.length} or g.name ilike $${params.length} or g.email ilike $${params.length})`);
      }
      const rows = await this.db.query(`${BOOKING_LIST_SQL} where ${where.join(' and ')} order by b.from_date desc limit 200`, params, tx);
      return rows.map(toOwnerBooking);
    });
  }

  detail(user: SessionUser, bookingId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.db.one(`${BOOKING_LIST_SQL} where b.id = $1`, [bookingId], tx);
      if (!b) throw new NotFoundException('Booking not found');
      const [payments, log] = await Promise.all([
        this.db.query(`select * from v_payment_effective where booking_id = $1 order by created_at`, [bookingId], tx),
        this.db.query(`select from_status, to_status, actor, note, at from booking_status_log where booking_id = $1 order by at`, [bookingId], tx),
      ]);
      return {
        ...toOwnerBooking(b),
        specialRequests: b.special_requests,
        cancellationPolicy: b.cancellation_policy_snapshot?.policy ?? null,
        balanceDueDate: b.balance_due_date,
        quote: b.quote_snapshot,
        cancelReason: b.cancel_reason,
        payments: payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          baseAmount: p.base_amount,
          method: p.method,
          kind: p.kind,
          status: p.status,
          gatewayRef: p.gateway_ref,
          slipUrl: p.slip_url,
          confirmedAt: p.confirmed_at,
          createdAt: p.created_at,
          note: p.note,
        })),
        history: log,
      };
    });
  }

  async approve(user: SessionUser, bookingId: string) {
    await this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.lockOwned(tx, bookingId);
      if (b.mode !== 'request' || b.status !== 'pending' || b.approved_at) throw new BadRequestException('Nothing to approve');
      const extended = await this.inventory.extendHold(tx, b.id, new Date(Date.now() + REQUEST_HOLD_HOURS * 3_600_000));
      if (!extended) throw new ConflictException('The request has expired');
      await this.db.query(`update booking set approved_at = now(), updated_at = now() where id = $1`, [b.id], tx);
      await this.inventory.logStatus(tx, b.tenant_id, b.id, 'pending', 'pending', `user:${user.id}`, 'request approved');
    });
    this.notify.run(this.notify.paymentLink(bookingId));
    return { ok: true };
  }

  async decline(user: SessionUser, bookingId: string, reason: string) {
    return this.cancel(user, bookingId, { reason: `Declined: ${reason}`, refund: false }, 'pending');
  }

  /**
   * Cancel per the snapshotted policy. Nights are released in the same transaction; a refund
   * (negative payment row) is created by PaymentsService through the controller when due.
   */
  async cancel(user: SessionUser, bookingId: string, input: { reason: string; refund: boolean }, requireStatus?: BookingStatus) {
    const out = await this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.lockOwned(tx, bookingId);
      if (requireStatus && b.status !== requireStatus) throw new BadRequestException(`Booking is ${b.status}`);
      await this.setStatus(tx, b, 'cancelled', `user:${user.id}`, input.reason);
      await this.db.query(`update booking set cancel_reason = $2 where id = $1`, [b.id, input.reason], tx);
      await this.inventory.releaseBooking(tx, b.id);
      const property = await this.db.one(`select timezone from property where id = $1`, [b.property_id], tx);
      const refund = input.refund
        ? refundDue({
            policy: b.cancellation_policy_snapshot?.policy ?? 'moderate',
            paid: b.paid,
            deposit: b.deposit_due,
            arrival: b.from_date,
            cancelledOn: todayIn(property!.timezone),
          })
        : 0;
      return { propertyId: b.property_id as string, refundDue: refund };
    });
    this.availability.invalidate(out.propertyId);
    return out;
  }

  async markNoShow(user: SessionUser, bookingId: string) {
    const out = await this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.lockOwned(tx, bookingId);
      await this.setStatus(tx, b, 'no_show', `user:${user.id}`);
      // Deposit retained per policy; tonight and later nights go back on sale (spec §4.4).
      const property = await this.db.one(`select timezone from property where id = $1`, [b.property_id], tx);
      await this.inventory.releaseBooking(tx, b.id, todayIn(property!.timezone));
      return b.property_id as string;
    });
    this.availability.invalidate(out);
    return { ok: true };
  }

  async checkIn(user: SessionUser, bookingId: string) {
    await this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.lockOwned(tx, bookingId);
      await this.setStatus(tx, b, 'checked_in', `user:${user.id}`);
    });
    return { ok: true };
  }

  async checkOut(user: SessionUser, bookingId: string) {
    await this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.lockOwned(tx, bookingId);
      await this.setStatus(tx, b, 'checked_out', `user:${user.id}`);
    });
    return { ok: true };
  }

  // ------------------------------------------------------------------ internals

  /** A discount code valid today for the property (uses are counted when the booking is confirmed). */
  async validateDiscount(propertyId: string, code: string): Promise<{ id: string; pct: number; code: string }> {
    const property = await this.db.one(`select timezone from property where id = $1`, [propertyId]);
    const today = todayIn(property?.timezone ?? 'Asia/Colombo');
    const c = await this.db.one(
      `select id, pct, code from discount_code where property_id = $1 and code = upper($2) and active
          and valid_from <= $3 and expires_at >= $3 and uses < max_uses`,
      [propertyId, code.trim(), today],
    );
    if (!c) throw new UnprocessableEntityException({ message: 'That discount code is not valid', code: 'invalid_discount_code' });
    return { id: c.id, pct: c.pct, code: c.code };
  }

  async lockOwned(tx: pg.PoolClient, bookingId: string): Promise<Row> {
    const b = await this.db.one(
      `select b.*, p.paid from booking b join v_booking_paid p on p.booking_id = b.id where b.id = $1 for update of b`,
      [bookingId],
      tx,
    );
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async setStatus(tx: pg.PoolClient, b: Row, to: BookingStatus, actor: string, note?: string) {
    const from = b.status as BookingStatus;
    if (!TRANSITIONS[from].includes(to)) throw new BadRequestException(`Cannot change a ${from} booking to ${to}`);
    await this.db.query(`update booking set status = $2, updated_at = now() where id = $1`, [b.id, to], tx);
    await this.inventory.logStatus(tx, b.tenant_id, b.id, from, to, actor, note);
    b.status = to;
  }

  private async upsertGuest(tx: pg.PoolClient, tenantId: string, g: CreateBooking['guest']): Promise<string> {
    const row = await this.db.one<{ id: string }>(
      `insert into guest (tenant_id, name, email, phone, country, language)
       values ($1, $2, lower($3), $4, $5, $6)
       on conflict (tenant_id, lower(email)) where email is not null
       do update set name = excluded.name, phone = excluded.phone, country = excluded.country, language = excluded.language
       returning id`,
      [tenantId, g.name, g.email, g.phone, g.country, g.language],
      tx,
    );
    return row!.id;
  }

  private async insertBooking(
    tx: pg.PoolClient,
    a: {
      tenantId: string;
      propertyId: string;
      roomId: string;
      guestId: string;
      from: string;
      to: string;
      guests: number;
      mode: string;
      currency: string;
      displayCurrency: string;
      specialRequests: string;
      quote: ReturnType<AvailabilityService['quote']>;
      balanceDue: string;
      discountCodeId: string | null;
    },
  ): Promise<Row> {
    for (let attempt = 0; ; attempt++) {
      try {
        await tx.query('savepoint sp_booking_ref');
        const row = await this.db.one(
          `insert into booking (tenant_id, property_id, room_id, guest_id, reference, from_date, to_date, guests, mode, source,
                                base_amount, taxes, discount, total, currency, display_currency, deposit_due, balance_due_date,
                                cancellation_policy_snapshot, quote_snapshot, special_requests, discount_code_id, promo_discount)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'direct', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
           returning *`,
          [
            a.tenantId,
            a.propertyId,
            a.roomId,
            a.guestId,
            bookingReference(),
            a.from,
            a.to,
            a.guests,
            a.mode,
            a.quote.roomSubtotal + a.quote.extraGuestTotal,
            a.quote.taxes,
            a.quote.discount,
            a.quote.total,
            a.currency,
            a.displayCurrency,
            a.quote.deposit,
            a.balanceDue,
            JSON.stringify({ policy: a.quote.cancellationPolicy, text: CANCELLATION_POLICY_TEXT[a.quote.cancellationPolicy] }),
            JSON.stringify(a.quote),
            a.specialRequests,
            a.discountCodeId,
            a.quote.promoDiscount,
          ],
          tx,
        );
        await tx.query('release savepoint sp_booking_ref');
        return row!;
      } catch (err) {
        await tx.query('rollback to savepoint sp_booking_ref');
        if (attempt < 3 && isUniqueViolation(err, 'booking_reference_key')) continue;
        throw err;
      }
    }
  }
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
