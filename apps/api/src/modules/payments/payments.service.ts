import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  convertExact,
  fromMinor,
  minorToFixed,
  toMinor,
  type GatewayConfig,
  type PaymentMethod,
  type PaymentStart,
  type SessionUser,
} from '@staydirect/shared';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { FxService } from '../fx/fx.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CatalogService } from '../properties/catalog.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  PAYHERE_STATUS,
  payhereAmount,
  payhereCheckoutHash,
  payhereCheckoutUrl,
  verifyPayhereNotify,
  type PayhereNotify,
} from './payhere.js';
import { PaypalClient } from './paypal.js';

type ApplyResult = 'confirmed' | 'needs_refund' | 'noop' | 'duplicate';

/**
 * Money flows. Rules (CLAUDE.md): payment rows are append-only (refunds are negative rows, a
 * status change is a new row with supersedes_id), webhooks are verified and idempotent, and only
 * a confirmed payment row can move a booking to confirmed. Guest money never touches our accounts.
 */
@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    private readonly db: DbService,
    private readonly bookings: BookingsService,
    private readonly inventory: InventoryService,
    private readonly availability: AvailabilityService,
    private readonly catalog: CatalogService,
    private readonly fx: FxService,
    private readonly storage: StorageService,
    private readonly notify: NotificationsService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** What the guest owes right now: the rest of the deposit while pending, the balance once confirmed. */
  amountDue(b: Row): number {
    const target = b.status === 'pending' ? b.deposit_due : b.total;
    return fromMinor(Math.max(0, toMinor(target) - toMinor(b.paid)));
  }

  // ------------------------------------------------------------------ guest: start a payment

  async start(reference: string, token: string, method: Exclude<PaymentMethod, 'cash'>): Promise<PaymentStart> {
    const b = await this.bookings.findByReference(reference, token);
    const property = (await this.db.one(`select * from property where id = $1`, [b.property_id]))!;
    const cfg = this.catalog.gatewayConfig(property);
    if (b.status === 'pending') {
      if (b.mode === 'request' && !b.approved_at) throw new ConflictException('The host has not approved this request yet');
      const hold = await this.db.one(
        `select id from hold where booking_id = $1 and released_at is null and converted_at is null and expires_at > now()`,
        [b.id],
      );
      if (!hold) throw new ConflictException({ message: 'Your reservation hold expired. Please search again.', code: 'hold_expired' });
    } else if (!['confirmed', 'checked_in'].includes(b.status)) {
      throw new ConflictException(`This booking is ${b.status}`);
    }
    const due = this.amountDue(b);
    if (due <= 0) throw new BadRequestException('Nothing to pay');
    const fx = await this.fx.table();
    const siteUrl = this.catalog.siteUrl(property);
    const bookingUrl = `${siteUrl}/booking/${b.reference}?t=${b.access_token}`;

    switch (method) {
      case 'payhere': {
        const ph = this.require(cfg, 'payhere');
        const amount = payhereAmount(convertExact(due, b.currency, ph.currency, fx));
        const [first, ...rest] = String(b.guest_name ?? 'Guest').split(' ');
        const fields: Record<string, string> = {
          merchant_id: ph.merchantId,
          return_url: `${bookingUrl}&paid=1`,
          cancel_url: bookingUrl,
          notify_url: `${this.config.PUBLIC_API_URL.replace(/\/$/, '')}/webhooks/payhere/${property.id}`,
          order_id: b.reference,
          items: `${property.name} — ${b.room_name}, ${b.from_date} to ${b.to_date}`.slice(0, 100),
          currency: ph.currency,
          amount,
          first_name: first ?? 'Guest',
          last_name: rest.join(' ') || '-',
          email: b.guest_email ?? '',
          phone: b.guest_phone ?? '',
          address: '-',
          city: '-',
          country: 'Sri Lanka',
          custom_1: b.id,
        };
        fields.hash = payhereCheckoutHash(ph.merchantId, b.reference, amount, ph.currency, ph.merchantSecret);
        return { method: 'payhere', action: payhereCheckoutUrl(this.config.PAYHERE_SANDBOX), fields };
      }
      case 'paypal': {
        const pp = this.require(cfg, 'paypal');
        const amount = minorToFixed(toMinor(convertExact(due, b.currency, pp.currency, fx)));
        const order = await new PaypalClient(pp, this.config.PAYPAL_SANDBOX).createOrder({
          reference: b.reference,
          bookingId: b.id,
          currency: pp.currency,
          amount,
          description: `${property.name} ${b.reference}`,
        });
        return { method: 'paypal', clientId: pp.clientId, orderId: order.id, currency: pp.currency, amount, env: this.config.PAYPAL_SANDBOX ? 'sandbox' : 'live' };
      }
      case 'lankaqr': {
        const qr = this.require(cfg, 'lankaqr');
        const holdExpiresAt = await this.extendForManual(b, property);
        const amount = minorToFixed(toMinor(convertExact(due, b.currency, 'LKR', fx)));
        return { method: 'lankaqr', qrImageUrl: qr.qrImageUrl, merchantName: qr.merchantName, amount, currency: 'LKR', reference: b.reference, holdExpiresAt };
      }
      case 'bank': {
        const bank = this.require(cfg, 'bank');
        const holdExpiresAt = await this.extendForManual(b, property);
        return { method: 'bank', ...bank, amount: minorToFixed(toMinor(due)), currency: b.currency, reference: b.reference, holdExpiresAt };
      }
    }
  }

  /** Guest returns from PayPal approval: capture server-side with the owner's credentials. */
  async capturePaypal(reference: string, token: string, orderId: string) {
    const b = await this.bookings.findByReference(reference, token);
    const property = (await this.db.one(`select * from property where id = $1`, [b.property_id]))!;
    const result = await this.settlePaypalOrder(property, orderId, b.id);
    return { result, booking: await this.bookings.getPublic(reference, token) };
  }

  /** Guest uploads a bank/LankaQR slip; the manager confirms it from the dashboard. */
  async uploadSlip(reference: string, token: string, method: 'bank' | 'lankaqr', file: { buffer: Buffer; mimetype: string; size: number }) {
    if (!file) throw new BadRequestException('Attach the payment slip');
    if (!this.storage.isAllowed(file.mimetype)) throw new BadRequestException('Upload a JPG, PNG, WebP or PDF');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('The file is larger than 5 MB');
    const b = await this.bookings.findByReference(reference, token);
    const property = (await this.db.one(`select * from property where id = $1`, [b.property_id]))!;
    const due = this.amountDue(b);
    const url = await this.storage.put(b.tenant_id, 'slips', file.buffer, file.mimetype);
    await this.db.tx(async (tx) => {
      await this.db.query(
        `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, kind, slip_url, status, note)
         values ($1, $2, $3, $4, $3, $5, 'charge', $6, 'pending', 'slip uploaded by guest')`,
        [b.tenant_id, b.id, due, b.currency, method, url],
        tx,
      );
      if (b.status === 'pending') {
        await this.inventory.extendHold(tx, b.id, new Date(Date.now() + property.manual_payment_hold_hours * 3_600_000));
      }
    });
    this.notify.run(this.notify.ownerAlert(property.id, `Payment slip uploaded for ${b.reference} (${b.guest_name}). Please confirm.`, `/bookings/${b.id}`));
    return { ok: true };
  }

  // ------------------------------------------------------------------ webhooks

  /** PayHere server-to-server notify. Verified with the owner's merchant secret; idempotent on payment_id. */
  async payhereNotify(propertyId: string, n: PayhereNotify): Promise<ApplyResult | 'ignored'> {
    const property = await this.db.one(`select * from property where id = $1`, [propertyId]);
    if (!property) throw new NotFoundException();
    const ph = this.catalog.gatewayConfig(property)?.payhere;
    if (!ph || ph.merchantId !== n.merchant_id || !verifyPayhereNotify(n, ph.merchantSecret)) {
      throw new UnauthorizedException('Invalid signature');
    }
    if (n.status_code !== PAYHERE_STATUS.SUCCESS) {
      await this.db.query(
        `insert into webhook_event (provider, event_id, tenant_id, payload) values ('payhere', $1, $2, $3) on conflict do nothing`,
        [`${n.payment_id}:${n.status_code}`, property.tenant_id, JSON.stringify(n)],
      );
      return 'ignored';
    }
    const b = await this.db.one(`select * from booking where reference = $1 and property_id = $2`, [n.order_id, propertyId]);
    if (!b) throw new NotFoundException('Unknown order');
    const amount = Number(n.payhere_amount);
    const fx = await this.fx.table();
    return this.recordGatewayPayment({
      provider: 'payhere',
      eventId: n.payment_id,
      booking: b,
      property,
      method: 'payhere',
      amount,
      currency: n.payhere_currency,
      baseAmount: n.payhere_currency === b.currency ? amount : convertExact(amount, n.payhere_currency, b.currency, fx),
      gatewayRef: n.payment_id,
      payload: n,
    });
  }

  /**
   * PayPal webhook. We do not trust the payload: the order is re-read from PayPal with the owner's
   * credentials (server-to-server verification), then settled exactly like the capture endpoint.
   */
  async paypalWebhook(propertyId: string, event: { event_type?: string; resource?: any }) {
    const property = await this.db.one(`select * from property where id = $1`, [propertyId]);
    if (!property) throw new NotFoundException();
    const r = event.resource ?? {};
    const orderId: string | undefined =
      event.event_type === 'CHECKOUT.ORDER.APPROVED' ? r.id : r.supplementary_data?.related_ids?.order_id;
    if (!orderId) return 'ignored';
    return this.settlePaypalOrder(property, orderId);
  }

  private async settlePaypalOrder(property: Row, orderId: string, expectBookingId?: string): Promise<ApplyResult> {
    const pp = this.catalog.gatewayConfig(property)?.paypal;
    if (!pp) throw new BadRequestException('PayPal is not connected for this property');
    const client = new PaypalClient(pp, this.config.PAYPAL_SANDBOX);
    let order = await client.getOrder(orderId);
    const unit = order.purchase_units?.[0];
    const b = await this.db.one(`select * from booking where id = $1 and property_id = $2`, [unit?.custom_id, property.id]);
    if (!b || b.reference !== unit?.reference_id || (expectBookingId && b.id !== expectBookingId)) {
      throw new BadRequestException('This PayPal order does not belong to the booking');
    }
    if (order.status === 'APPROVED') order = await client.capture(orderId);
    const capture = order.purchase_units?.[0]?.payments?.captures?.find((c) => c.status === 'COMPLETED');
    if (order.status !== 'COMPLETED' || !capture) throw new ConflictException(`PayPal order is ${order.status}`);
    const amount = Number(capture.amount.value);
    const fx = await this.fx.table();
    return this.recordGatewayPayment({
      provider: 'paypal',
      eventId: capture.id,
      booking: b,
      property,
      method: 'paypal',
      amount,
      currency: capture.amount.currency_code,
      baseAmount: capture.amount.currency_code === b.currency ? amount : convertExact(amount, capture.amount.currency_code, b.currency, fx),
      gatewayRef: capture.id,
      payload: order,
    });
  }

  /** One transaction: idempotency record + payment row + booking/inventory effect. */
  private async recordGatewayPayment(a: {
    provider: string;
    eventId: string;
    booking: Row;
    property: Row;
    method: PaymentMethod;
    amount: number;
    currency: string;
    baseAmount: number;
    gatewayRef: string;
    payload: unknown;
  }): Promise<ApplyResult> {
    const result = await this.db.tx(async (tx) => {
      const fresh = await this.db.one(
        `insert into webhook_event (provider, event_id, tenant_id, payload) values ($1, $2, $3, $4)
         on conflict do nothing returning event_id`,
        [a.provider, a.eventId, a.booking.tenant_id, JSON.stringify(a.payload)],
        tx,
      );
      if (!fresh) return 'duplicate' as const;
      await this.db.query(
        `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, kind, gateway_ref, status, confirmed_by, confirmed_at)
         values ($1, $2, $3, $4, $5, $6, 'charge', $7, 'confirmed', $8, now())`,
        [a.booking.tenant_id, a.booking.id, a.amount, a.currency, a.baseAmount, a.method, a.gatewayRef, `webhook:${a.provider}`],
        tx,
      );
      return this.bookings.applyPayment(tx, a.booking.id, `webhook:${a.provider}`);
    });
    this.afterPayment(a.booking, a.property.id, result);
    return result;
  }

  private afterPayment(b: Row, propertyId: string, result: ApplyResult) {
    this.availability.invalidate(propertyId);
    if (result === 'confirmed') this.notify.run(this.notify.bookingConfirmed(b.id));
    if (result === 'needs_refund') {
      this.notify.run(
        this.notify.ownerAlert(propertyId, `Payment received for ${b.reference} after its hold expired, and the nights were already taken. Refund or relocate the guest.`, `/bookings/${b.id}`),
      );
    }
  }

  // ------------------------------------------------------------------ owner/manager

  /** Cash at the desk, a bank alert or a LankaQR alert seen by the manager. */
  async recordManual(user: SessionUser, bookingId: string, input: { method: 'bank' | 'lankaqr' | 'cash'; amount: number; currency?: string; reference: string }) {
    let booking!: Row;
    const result = await this.db.withTenant(user.tenantId, async (tx) => {
      booking = await this.bookings.lockOwned(tx, bookingId);
      const currency = input.currency ?? booking.currency;
      const fx = await this.fx.table();
      const base = currency === booking.currency ? input.amount : convertExact(input.amount, currency, booking.currency, fx);
      await this.db.query(
        `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, kind, gateway_ref, status, confirmed_by, confirmed_at)
         values ($1, $2, $3, $4, $5, $6, 'charge', nullif($7, ''), 'confirmed', $8, now())`,
        [user.tenantId, bookingId, input.amount, currency, base, input.method, input.reference, `user:${user.id}`],
        tx,
      );
      return this.bookings.applyPayment(tx, bookingId, `user:${user.id}`);
    });
    this.afterPayment(booking, booking.property_id, result);
    return { result };
  }

  /** Approve or reject a guest-uploaded slip (pending row) by superseding it. */
  async reviewSlip(user: SessionUser, paymentId: string, approve: boolean, amount?: number) {
    let booking!: Row;
    const result = await this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.db.one(`select * from v_payment_effective where id = $1 and status = 'pending' and kind = 'charge'`, [paymentId], tx);
      if (!p) throw new NotFoundException('No pending slip with that id');
      booking = await this.bookings.lockOwned(tx, p.booking_id);
      const final = approve ? (amount ?? p.amount) : p.amount;
      await this.db.query(
        `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, kind, slip_url, status, confirmed_by, confirmed_at, supersedes_id, note)
         values ($1, $2, $3, $4, $3, $5, 'charge', $6, $7, $8, now(), $9, $10)`,
        [user.tenantId, p.booking_id, final, p.currency, p.method, p.slip_url, approve ? 'confirmed' : 'reversed', `user:${user.id}`, p.id, approve ? 'slip confirmed' : 'slip rejected'],
        tx,
      );
      return approve ? this.bookings.applyPayment(tx, p.booking_id, `user:${user.id}`) : ('noop' as const);
    });
    this.afterPayment(booking, booking.property_id, result);
    return { result };
  }

  /**
   * Refund as a negative payment row. PayPal captures are refunded through the API immediately;
   * PayHere, bank, LankaQR and cash refunds are recorded as pending until the owner marks them done.
   */
  async refund(user: SessionUser, bookingId: string, input: { amount: number; reason: string }) {
    const plan = await this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.bookings.lockOwned(tx, bookingId);
      const pending = await this.db.one<{ s: number }>(
        `select coalesce(sum(base_amount), 0)::numeric(12,2) as s from v_payment_effective
          where booking_id = $1 and kind = 'refund' and status = 'pending'`,
        [bookingId],
        tx,
      );
      const refundable = toMinor(b.paid) + toMinor(pending?.s ?? 0); // pending refunds are negative
      if (toMinor(input.amount) > refundable) {
        throw new BadRequestException(`Refund exceeds the ${fromMinor(refundable)} ${b.currency} still refundable`);
      }
      const charges = await this.db.query(
        `select * from v_payment_effective where booking_id = $1 and kind = 'charge' and status = 'confirmed' order by created_at desc`,
        [bookingId],
        tx,
      );
      if (charges.length === 0) throw new BadRequestException('No confirmed payment to refund');
      const paypalCharge = charges.find((c) => c.method === 'paypal' && c.gateway_ref);
      return { b, charge: paypalCharge ?? charges[0]! };
    });
    const { b, charge } = plan;
    const property = (await this.db.one(`select * from property where id = $1`, [b.property_id]))!;

    let status: 'pending' | 'confirmed' = 'pending';
    let gatewayRef: string | null = null;
    let chargedAmount = input.amount;
    let chargedCurrency = b.currency;
    if (charge.method === 'paypal') {
      const pp = this.catalog.gatewayConfig(property)?.paypal;
      if (pp) {
        const fx = await this.fx.table();
        chargedCurrency = charge.currency;
        chargedAmount = chargedCurrency === b.currency ? input.amount : convertExact(input.amount, b.currency, chargedCurrency, fx);
        const res = await new PaypalClient(pp, this.config.PAYPAL_SANDBOX).refund(
          charge.gateway_ref,
          { currency_code: chargedCurrency, value: minorToFixed(toMinor(chargedAmount)) },
          `refund-${bookingId}-${toMinor(input.amount)}-${Date.now()}`,
        );
        status = res.status === 'COMPLETED' ? 'confirmed' : 'pending';
        gatewayRef = res.id;
      }
    }
    await this.db.withTenant(user.tenantId, async (tx) => {
      await this.db.query(
        `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, kind, gateway_ref, status, confirmed_by, confirmed_at, note)
         values ($1, $2, $3, $4, $5, $6, 'refund', $7, $8, $9, case when $8 = 'confirmed' then now() end, $10)`,
        [user.tenantId, bookingId, -chargedAmount, chargedCurrency, -input.amount, charge.method, gatewayRef, status, `user:${user.id}`, input.reason],
        tx,
      );
      await this.db.query(`update booking set needs_refund = false, updated_at = now() where id = $1`, [bookingId], tx);
      await this.inventory.logStatus(tx, b.tenant_id, bookingId, b.status, b.status, `user:${user.id}`, `refund ${input.amount} ${b.currency}: ${input.reason}`);
    });
    return { status, method: charge.method as PaymentMethod };
  }

  /** Owner marks a manual (pending) refund as paid back to the guest. */
  async completeRefund(user: SessionUser, paymentId: string, reference: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.db.one(`select * from v_payment_effective where id = $1 and kind = 'refund' and status = 'pending'`, [paymentId], tx);
      if (!p) throw new NotFoundException('No pending refund with that id');
      await this.db.query(
        `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, kind, gateway_ref, status, confirmed_by, confirmed_at, supersedes_id, note)
         values ($1, $2, $3, $4, $5, $6, 'refund', nullif($7, ''), 'confirmed', $8, now(), $9, $10)`,
        [user.tenantId, p.booking_id, p.amount, p.currency, p.base_amount, p.method, reference, `user:${user.id}`, p.id, p.note],
        tx,
      );
      return { ok: true };
    });
  }

  // ------------------------------------------------------------------ helpers

  private require<K extends keyof GatewayConfig>(cfg: GatewayConfig | null, key: K): NonNullable<GatewayConfig[K]> {
    const v = cfg?.[key];
    if (!v) throw new BadRequestException(`${String(key)} is not available for this property`);
    return v as NonNullable<GatewayConfig[K]>;
  }

  private async extendForManual(b: Row, property: Row): Promise<string> {
    const until = new Date(Date.now() + property.manual_payment_hold_hours * 3_600_000);
    if (b.status === 'pending') {
      await this.db.tx((tx) => this.inventory.extendHold(tx, b.id, until));
      const hold = await this.db.one<{ expires_at: Date }>(
        `select expires_at from hold where booking_id = $1 and released_at is null and converted_at is null`,
        [b.id],
      );
      return (hold?.expires_at ?? until).toISOString();
    }
    return until.toISOString();
  }

  /** Exposed for tests. */
  applyInTx(tx: pg.PoolClient, bookingId: string, actor: string) {
    return this.bookings.applyPayment(tx, bookingId, actor);
  }
}
