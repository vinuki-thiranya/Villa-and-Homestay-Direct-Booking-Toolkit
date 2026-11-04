import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays, convertExact, formatMoney, fromMinor, pctOf, toMinor, todayIn, type SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { FxService } from '../fx/fx.service.js';
import { WhatsAppChannel } from '../notifications/channels.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CatalogService } from '../properties/catalog.service.js';
import { columnsFor } from '../properties/mappers.js';

const ADD_ON_COLUMNS: Record<string, string> = {
  name: 'name',
  description: 'description',
  category: 'category',
  price: 'price',
  currency: 'currency',
  providerId: 'provider_id',
  commissionPct: 'commission_pct',
  platformPct: 'platform_pct',
  leadTimeHours: 'lead_time_hours',
  photoUrl: 'photo_url',
  active: 'active',
  sortOrder: 'sort_order',
};

function toAddOn(a: Row, opts: { owner?: boolean } = {}) {
  const base = {
    id: a.id,
    name: a.name,
    description: a.description,
    category: a.category,
    price: a.price,
    currency: a.currency,
    leadTimeHours: a.lead_time_hours,
    photoUrl: a.photo_url,
  };
  if (!opts.owner) return base;
  return {
    ...base,
    providerId: a.provider_id,
    providerName: a.provider_name ?? null,
    commissionPct: a.commission_pct,
    platformPct: a.platform_pct,
    active: a.active,
    sortOrder: a.sort_order,
  };
}

function toOrder(o: Row) {
  return {
    id: o.id,
    bookingId: o.booking_id,
    bookingReference: o.reference ?? null,
    guestName: o.guest_name ?? null,
    addOnId: o.add_on_id,
    addOnName: o.add_on_name ?? null,
    providerId: o.provider_id,
    providerName: o.provider_name ?? null,
    date: o.date,
    time: o.time,
    qty: o.qty,
    amount: o.amount,
    currency: o.currency,
    providerAmount: o.provider_amount,
    ownerAmount: o.owner_amount,
    platformAmount: o.platform_amount,
    status: o.status,
    notes: o.notes,
    providerNotifiedAt: o.provider_notified_at,
    providerConfirmedAt: o.provider_confirmed_at,
    rating: o.rating,
    createdAt: o.created_at,
  };
}

/** Auto-removal threshold for providers (spec §3.7: "auto-remove below 4.0"). */
export const PROVIDER_MIN_AVERAGE = 4.0;
export const PROVIDER_MIN_RATINGS = 3;

const ORDER_SELECT = `
  select o.*, a.name as add_on_name, pr.name as provider_name, b.reference, g.name as guest_name
    from add_on_order o join add_on a on a.id = o.add_on_id left join provider pr on pr.id = o.provider_id
    join booking b on b.id = o.booking_id left join guest g on g.id = b.guest_id`;

/** Add-on marketplace (spec §3.7): catalogue, orders, provider job cards, commission split. */
@Injectable()
export class AddOnsService {
  constructor(
    private readonly db: DbService,
    private readonly flags: FlagsService,
    private readonly bookings: BookingsService,
    private readonly catalog: CatalogService,
    private readonly fx: FxService,
    private readonly whatsapp: WhatsAppChannel,
    private readonly notify: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- providers
  listProviders(user: SessionUser) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from provider order by active desc, name`, [], tx);
      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        serviceTypes: p.service_types,
        rating: p.rating,
        ratingCount: p.rating_count,
        active: p.active,
        removedAt: p.removed_at,
        removedReason: p.removed_reason,
      }));
    });
  }

  createProvider(user: SessionUser, input: { name: string; phone: string; serviceTypes: string[]; active: boolean }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `insert into provider (tenant_id, name, phone, service_types, active) values ($1, $2, $3, $4, $5) returning id`,
        [user.tenantId, input.name, input.phone, input.serviceTypes, input.active],
        tx,
      );
      return { id: row!.id };
    });
  }

  updateProvider(user: SessionUser, id: string, input: Partial<{ name: string; phone: string; serviceTypes: string[]; active: boolean }>) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `update provider set name = coalesce($2, name), phone = coalesce($3, phone), service_types = coalesce($4, service_types), active = coalesce($5, active)
          where id = $1 returning id`,
        [id, input.name ?? null, input.phone ?? null, input.serviceTypes ?? null, input.active ?? null],
        tx,
      );
      if (!row) throw new NotFoundException('Provider not found');
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- catalogue
  listAddOns(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select a.*, p.name as provider_name from add_on a left join provider p on p.id = a.provider_id
          where a.property_id = $1 order by a.sort_order, a.name`,
        [propertyId],
        tx,
      );
      return rows.map((a) => toAddOn(a, { owner: true }));
    });
  }

  createAddOn(user: SessionUser, propertyId: string, input: Record<string, unknown>) {
    const { cols, params, placeholders } = columnsFor(input, ADD_ON_COLUMNS, 3);
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.db.one(`select id from property where id = $1`, [propertyId], tx);
      if (!p) throw new NotFoundException('Property not found');
      const row = await this.db.one(
        `insert into add_on (tenant_id, property_id, ${cols.join(', ')}) values ($1, $2, ${placeholders.join(', ')}) returning *`,
        [user.tenantId, propertyId, ...params],
        tx,
      );
      return toAddOn(row!, { owner: true });
    });
  }

  updateAddOn(user: SessionUser, id: string, input: Record<string, unknown>) {
    const { params, set } = columnsFor(input, ADD_ON_COLUMNS, 2);
    return this.db.withTenant(user.tenantId, async (tx) => {
      if (set.length === 0) throw new BadRequestException('Nothing to update');
      const row = await this.db.one(`update add_on set ${set.join(', ')} where id = $1 returning *`, [id, ...params], tx);
      if (!row) throw new NotFoundException('Add-on not found');
      const c = Number(row.commission_pct) + Number(row.platform_pct);
      if (c > 60) throw new BadRequestException('Owner + platform share cannot exceed 60%');
      return toAddOn(row, { owner: true });
    });
  }

  /** Public catalogue for the guest site. */
  async publicCatalogue(propertyId: string) {
    const rows = await this.db.query(`select * from add_on where property_id = $1 and active order by sort_order, name`, [propertyId]);
    return rows.map((a) => toAddOn(a));
  }

  // ---------------------------------------------------------------- orders
  /** Guest view on the booking page: catalogue + their orders. */
  async guestAddOns(reference: string, token: string) {
    const b = await this.bookings.findByReference(reference, token);
    const [catalogue, orders] = await Promise.all([
      this.publicCatalogue(b.property_id),
      this.db.query(`${ORDER_SELECT} where o.booking_id = $1 order by o.date, o.created_at`, [b.id]),
    ]);
    return {
      canOrder: ['confirmed', 'checked_in'].includes(b.status),
      stay: { from: b.from_date, to: b.to_date },
      catalogue,
      orders: orders.map((o) => {
        const { providerAmount: _p, ownerAmount: _o, platformAmount: _pl, ...publicOrder } = toOrder(o);
        return publicOrder;
      }),
    };
  }

  async guestOrder(reference: string, input: { token: string; addOnId: string; date: string; time: string | null; qty: number; notes: string }) {
    const b = await this.bookings.findByReference(reference, input.token);
    return this.placeOrder(b, input, 'guest');
  }

  async ownerOrder(user: SessionUser, bookingId: string, input: { addOnId: string; date: string; time: string | null; qty: number; notes: string }) {
    const b = await this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(`select * from booking where id = $1`, [bookingId], tx);
      if (!row) throw new NotFoundException('Booking not found');
      return row;
    });
    return this.placeOrder(b, input, `user:${user.id}`);
  }

  private async placeOrder(b: Row, input: { addOnId: string; date: string; time: string | null; qty: number; notes: string }, createdBy: string) {
    await this.flags.require(b.tenant_id, 'add_on_marketplace');
    if (!['confirmed', 'checked_in'].includes(b.status)) throw new ConflictException('Add-ons can be ordered once the booking is confirmed');
    const property = (await this.db.one(`select * from property where id = $1`, [b.property_id]))!;
    const addOn = await this.db.one(`select * from add_on where id = $1 and property_id = $2 and active`, [input.addOnId, b.property_id]);
    if (!addOn) throw new NotFoundException('That experience is not available');
    // Airport pickup can be the day of arrival, departure transfers on check-out day.
    if (input.date < addDays(b.from_date, -1) || input.date > b.to_date) throw new BadRequestException('Choose a date during your stay');
    const today = todayIn(property.timezone);
    const leadDays = Math.ceil(addOn.lead_time_hours / 24);
    if (input.date < addDays(today, leadDays)) throw new BadRequestException(`Please order at least ${addOn.lead_time_hours} hours ahead`);

    const amountMinor = toMinor(addOn.price) * input.qty;
    const platform = pctOf(amountMinor, addOn.platform_pct);
    const owner = pctOf(amountMinor, addOn.commission_pct);
    const provider = amountMinor - platform - owner;
    const fx = await this.fx.table();
    const inBookingCurrency = addOn.currency === b.currency ? fromMinor(amountMinor) : convertExact(fromMinor(amountMinor), addOn.currency, b.currency, fx);

    const order = await this.db.tx(async (tx) => {
      const row = await this.db.one(
        `insert into add_on_order (tenant_id, booking_id, add_on_id, provider_id, date, time, qty, amount, currency,
                                   provider_amount, owner_amount, platform_amount, notes, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning *`,
        [b.tenant_id, b.id, addOn.id, addOn.provider_id, input.date, input.time, input.qty, fromMinor(amountMinor), addOn.currency,
          fromMinor(provider), fromMinor(owner), fromMinor(platform), input.notes, createdBy],
        tx,
      );
      // Collected with the stay: the balance grows by the add-on amount.
      await this.adjustBookingTotal(tx, b.id, inBookingCurrency);
      return row!;
    });
    await this.sendJobCard(order.id);
    this.notify.run(
      this.notify.ownerAlert(b.property_id, `Add-on ordered for ${b.reference}: ${addOn.name} × ${input.qty} on ${input.date}${input.time ? ` ${input.time}` : ''}.`, `/bookings/${b.id}`),
    );
    return toOrder(order);
  }

  listOrders(user: SessionUser, propertyId: string, from?: string, to?: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const params: unknown[] = [propertyId];
      let where = 'b.property_id = $1';
      if (from) {
        params.push(from);
        where += ` and o.date >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        where += ` and o.date <= $${params.length}`;
      }
      const rows = await this.db.query(`${ORDER_SELECT} where ${where} order by o.date desc, o.created_at desc limit 300`, params, tx);
      return rows.map(toOrder);
    });
  }

  listBookingOrders(user: SessionUser, bookingId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`${ORDER_SELECT} where o.booking_id = $1 order by o.date, o.created_at`, [bookingId], tx);
      return rows.map(toOrder);
    });
  }

  async setOrderStatus(user: SessionUser, orderId: string, status: string) {
    return this.db.withTenant(user.tenantId, async (tx) => this.changeStatus(tx, orderId, status));
  }

  private async changeStatus(tx: pg.PoolClient, orderId: string, status: string) {
    const o = await this.db.one(`${ORDER_SELECT} where o.id = $1 for update of o`, [orderId], tx);
    if (!o) throw new NotFoundException('Order not found');
    if (o.status === status) return toOrder(o);
    if (o.status === 'cancelled') throw new ConflictException('This order was cancelled');
    if (status === 'cancelled') {
      const b = (await this.db.one(`select currency from booking where id = $1`, [o.booking_id], tx))!;
      const fx = await this.fx.table();
      const amount = o.currency === b.currency ? o.amount : convertExact(o.amount, o.currency, b.currency, fx);
      await this.adjustBookingTotal(tx, o.booking_id, -amount);
    }
    await this.db.query(
      `update add_on_order set status = $2,
              provider_confirmed_at = case when $2 = 'confirmed' then coalesce(provider_confirmed_at, now()) else provider_confirmed_at end
        where id = $1`,
      [orderId, status],
      tx,
    );
    return toOrder((await this.db.one(`${ORDER_SELECT} where o.id = $1`, [orderId], tx))!);
  }

  // ---------------------------------------------------------------- provider job card (WhatsApp link, no login)
  async sendJobCard(orderId: string): Promise<boolean> {
    const o = await this.db.one(
      `select o.*, a.name as add_on_name, pr.phone as provider_phone, p.name as property_name, p.whatsapp_phone_number_id,
              p.slug, p.custom_domain, g.name as guest_name
         from add_on_order o join add_on a on a.id = o.add_on_id left join provider pr on pr.id = o.provider_id
         join booking b on b.id = o.booking_id join property p on p.id = b.property_id left join guest g on g.id = b.guest_id
        where o.id = $1`,
      [orderId],
    );
    if (!o?.provider_phone) return false;
    const link = `${this.catalog.siteUrl(o)}/j/${o.provider_token}`;
    const r = await this.whatsapp.sendNamedTemplate(
      o.provider_phone,
      'sd_provider_job',
      'en',
      {
        property: o.property_name,
        service: o.add_on_name,
        when: `${o.date}${o.time ? ` ${o.time}` : ''}`,
        guest: o.guest_name ?? 'guest',
        qty: String(o.qty),
        amount: formatMoney(o.provider_amount, o.currency),
        link,
      },
      o.whatsapp_phone_number_id,
    );
    if (r.ok) await this.db.query(`update add_on_order set provider_notified_at = now() where id = $1`, [orderId]);
    return r.ok;
  }

  // ---------------------------------------------------------------- provider ratings (spec §3.7 R3)
  /**
   * The guest rates an add-on once it has happened. A provider with at least
   * PROVIDER_MIN_RATINGS ratings averaging below 4.0 is removed automatically: their add-ons are
   * switched off and the owner is told. The owner can reinstate them.
   */
  async rateOrder(reference: string, orderId: string, input: { token: string; rating: number; comment: string }) {
    const b = await this.bookings.findByReference(reference, input.token);
    const property = (await this.db.one(`select timezone from property where id = $1`, [b.property_id]))!;
    const result = await this.db.tx(async (tx) => {
      const o = await this.db.one(`select * from add_on_order where id = $1 and booking_id = $2 for update`, [orderId, b.id], tx);
      if (!o) throw new NotFoundException('Order not found');
      if (o.rated_at) throw new ConflictException('You already rated this. Thank you!');
      const happened = o.status === 'done' || (o.status === 'confirmed' && o.date <= todayIn(property.timezone));
      if (!happened) throw new BadRequestException('You can rate this after it has taken place');
      await this.db.query(`update add_on_order set rating = $2, rating_comment = $3, rated_at = now() where id = $1`, [orderId, input.rating, input.comment], tx);
      if (!o.provider_id) return null;
      const stats = (await this.db.one<{ avg: number; n: number }>(
        `select round(avg(rating)::numeric, 2) as avg, count(*)::int as n from add_on_order where provider_id = $1 and rating is not null`,
        [o.provider_id],
        tx,
      ))!;
      await this.db.query(`update provider set rating = $2, rating_count = $3 where id = $1`, [o.provider_id, stats.avg, stats.n], tx);
      if (stats.n >= PROVIDER_MIN_RATINGS && stats.avg < PROVIDER_MIN_AVERAGE) {
        const removed = await this.db.one(
          `update provider set active = false, removed_at = now(), removed_reason = $2 where id = $1 and removed_at is null returning name`,
          [o.provider_id, `Average rating ${stats.avg} from ${stats.n} guests is below ${PROVIDER_MIN_AVERAGE}`],
          tx,
        );
        if (removed) {
          await this.db.query(`update add_on set active = false where provider_id = $1`, [o.provider_id], tx);
          return { removed: removed.name as string, avg: stats.avg, n: stats.n };
        }
      }
      return null;
    });
    if (result) {
      this.notify.run(
        this.notify.ownerAlert(
          b.property_id,
          `${result.removed} was removed from your experiences: average guest rating ${result.avg} from ${result.n} ratings. Their add-ons are switched off; you can reinstate them in Add-ons.`,
          '/setup/add-ons',
        ),
      );
    }
    return { ok: true };
  }

  /** Owner brings a removed provider back (their add-ons stay off until switched on again). */
  reinstateProvider(user: SessionUser, providerId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`update provider set active = true, removed_at = null, removed_reason = null where id = $1 returning id`, [providerId], tx);
      if (!r) throw new NotFoundException('Provider not found');
      return { ok: true };
    });
  }

  async resendJobCard(user: SessionUser, orderId: string) {
    const owned = await this.db.withTenant(user.tenantId, (tx) => this.db.one(`select id from add_on_order where id = $1`, [orderId], tx));
    if (!owned) throw new NotFoundException('Order not found');
    return { sent: await this.sendJobCard(orderId) };
  }

  async jobCard(token: string) {
    const o = await this.orderByToken(token);
    return {
      service: o.add_on_name,
      property: o.property_name,
      address: o.property_address,
      mapsUrl: o.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}` : null,
      date: o.date,
      time: o.time,
      qty: o.qty,
      guestName: o.guest_name,
      guestPhone: o.status === 'confirmed' ? o.guest_phone : null, // shared once the provider has accepted
      notes: o.notes,
      payout: o.provider_amount,
      currency: o.currency,
      status: o.status,
    };
  }

  async jobAction(token: string, action: 'confirm' | 'done' | 'decline') {
    const o = await this.orderByToken(token);
    if (action === 'decline') {
      this.notify.run(this.notify.ownerAlert(o.property_id, `${o.provider_name ?? 'Provider'} declined ${o.add_on_name} on ${o.date} for ${o.reference}. Please arrange someone else.`, `/add-ons`));
      return { status: o.status, declined: true };
    }
    const next = action === 'confirm' ? 'confirmed' : 'done';
    await this.db.tx((tx) => this.changeStatus(tx, o.id, next));
    return this.jobCard(token);
  }

  // ---------------------------------------------------------------- commissions
  /** Platform commission owed by the owner for a month (settled with the subscription, spec §8). */
  commissions(user: SessionUser, propertyId: string, month: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select o.currency, count(*)::int as orders, sum(o.amount)::numeric(12,2) as sales, sum(o.owner_amount)::numeric(12,2) as owner_earned,
                sum(o.platform_amount)::numeric(12,2) as platform_due, sum(o.provider_amount)::numeric(12,2) as provider_payouts
           from add_on_order o join booking b on b.id = o.booking_id
          where b.property_id = $1 and o.status in ('confirmed', 'done') and to_char(o.date, 'YYYY-MM') = $2
          group by o.currency`,
        [propertyId, month],
        tx,
      );
      return {
        month,
        byCurrency: rows.map((r) => ({
          currency: r.currency,
          orders: r.orders,
          sales: r.sales,
          ownerEarned: r.owner_earned,
          platformDue: r.platform_due,
          providerPayouts: r.provider_payouts,
        })),
      };
    });
  }

  // ---------------------------------------------------------------- helpers
  private async adjustBookingTotal(tx: pg.PoolClient, bookingId: string, delta: number) {
    await this.db.query(
      `update booking set add_ons_amount = add_ons_amount + $2, total = total + $2, updated_at = now() where id = $1`,
      [bookingId, Math.round(delta * 100) / 100],
      tx,
    );
  }

  private async orderByToken(token: string): Promise<Row> {
    const o = /^[a-f0-9]{24,64}$/.test(token)
      ? await this.db.one(
          `select o.*, a.name as add_on_name, pr.name as provider_name, p.id as property_id, p.name as property_name,
                  p.address as property_address, p.lat, p.lng, b.reference, g.name as guest_name, g.phone as guest_phone
             from add_on_order o join add_on a on a.id = o.add_on_id left join provider pr on pr.id = o.provider_id
             join booking b on b.id = o.booking_id join property p on p.id = b.property_id left join guest g on g.id = b.guest_id
            where o.provider_token = $1`,
          [token],
        )
      : null;
    if (!o) throw new NotFoundException('This job link is no longer valid');
    return o;
  }
}
