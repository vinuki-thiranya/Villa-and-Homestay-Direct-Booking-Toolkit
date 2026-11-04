import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { addDays, nightlyPlanFor, nightsBetween, pctOf, toMinor, fromMinor, todayIn, type SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { bookingReference } from '../../common/crypto.js';
import { DbService, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CatalogService } from '../properties/catalog.service.js';
import { toPricingPlan } from '../properties/mappers.js';
import { SimulatedPartner, type AriUpdate, type BookingRevision, type ChannelPartner } from './partner.js';

const FULL_PUSH_DAYS = 365;

function toConnection(c: Row) {
  return {
    id: c.id,
    propertyId: c.property_id,
    partner: c.partner,
    externalPropertyId: c.external_property_id,
    roomMap: c.room_map,
    channels: c.channels,
    status: c.status,
    needsFullPush: c.needs_full_push,
    lastPushAt: c.last_push_at,
    lastPullAt: c.last_pull_at,
    lastError: c.last_error,
    queued: c.queued ?? 0,
  };
}

/**
 * Real-time two-way OTA connectivity through a channel-manager partner (spec §3.3 R3, §7).
 * Outbound: every inventory/rate change is queued by DB triggers (0003) and pushed every minute;
 * a full calendar is pushed after rate or room changes. Inbound: booking revisions become real
 * bookings with guest details; nights already taken become sync conflicts, as with iCal.
 */
@Injectable()
export class ChannelsService {
  private readonly log = new Logger(ChannelsService.name);
  readonly simulated: SimulatedPartner;
  private readonly partners = new Map<string, ChannelPartner>();

  constructor(
    private readonly db: DbService,
    private readonly inventory: InventoryService,
    private readonly availability: AvailabilityService,
    private readonly catalog: CatalogService,
    private readonly flags: FlagsService,
    private readonly notify: NotificationsService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {
    this.simulated = new SimulatedPartner(db);
    this.partners.set(this.simulated.key, this.simulated);
  }

  partner(key: string): ChannelPartner {
    const p = this.partners.get(key);
    if (!p) throw new BadRequestException(`Unknown connectivity partner ${key}`);
    return p;
  }

  // ---------------------------------------------------------------- owner setup
  async connect(user: SessionUser, propertyId: string, input: { partner: string; externalPropertyId?: string; channels: string[] }) {
    await this.flags.require(user.tenantId, 'ota_direct_api');
    this.partner(input.partner);
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.db.one(`select id, slug from property where id = $1`, [propertyId], tx);
      if (!p) throw new NotFoundException('Property not found');
      const rooms = await this.db.query(`select id, name from room where property_id = $1 order by sort_order, name`, [propertyId], tx);
      const roomMap = Object.fromEntries(rooms.map((r, i) => [r.id, `R${i + 1}-${r.name.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 10)}`]));
      const row = await this.db.one(
        `insert into channel_connection (tenant_id, property_id, partner, external_property_id, room_map, channels, status, needs_full_push)
         values ($1, $2, $3, $4, $5, $6, 'active', true)
         on conflict (property_id) do update set partner = excluded.partner, external_property_id = excluded.external_property_id,
           room_map = excluded.room_map, channels = excluded.channels, status = 'active', needs_full_push = true, last_error = null
         returning *`,
        [user.tenantId, propertyId, input.partner, input.externalPropertyId ?? `SD-${p.slug}`, JSON.stringify(roomMap), input.channels],
        tx,
      );
      return toConnection(row!);
    });
  }

  setStatus(user: SessionUser, propertyId: string, status: 'active' | 'paused') {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `update channel_connection set status = $2, needs_full_push = (needs_full_push or $2 = 'active') where property_id = $1 returning *`,
        [propertyId, status],
        tx,
      );
      if (!row) throw new NotFoundException('No connection for this property');
      return toConnection(row);
    });
  }

  status(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `select c.*, (select count(*)::int from channel_ari_queue q join room r on r.id = q.room_id where r.property_id = c.property_id) as queued
           from channel_connection c where c.property_id = $1`,
        [propertyId],
        tx,
      );
      return row ? toConnection(row) : null;
    });
  }

  /** What the simulated OTA currently believes (for the owner UI and demos). */
  async simulatorState(user: SessionUser, propertyId: string, from: string, to: string) {
    const conn = await this.status(user, propertyId);
    if (!conn || conn.partner !== 'simulated') throw new NotFoundException('No simulated connection for this property');
    return this.simulated.state(conn.externalPropertyId, from, to);
  }

  /** Dev/demo: make the simulated OTA take a reservation, then import it right away. */
  async simulateReservation(
    user: SessionUser,
    propertyId: string,
    input: { roomId: string; from: string; to: string; channel: 'booking_com' | 'airbnb'; guestName: string; guestEmail?: string; guests: number; total: number; currency: string },
    opts: { simulateLag?: boolean } = {},
  ) {
    if (this.config.NODE_ENV === 'production') throw new NotFoundException();
    const conn = await this.status(user, propertyId);
    if (!conn || conn.partner !== 'simulated') throw new NotFoundException('No simulated connection for this property');
    const roomCode = conn.roomMap[input.roomId];
    if (!roomCode) throw new BadRequestException('That room is not mapped to the channel');
    const rev = await this.simulated.createReservation(
      conn.externalPropertyId,
      { channel: input.channel, roomCode, from: input.from, to: input.to, guests: input.guests, guest: { name: input.guestName, email: input.guestEmail ?? null }, total: input.total, currency: input.currency },
      opts,
    );
    await this.pullProperty(propertyId);
    return rev;
  }

  // ---------------------------------------------------------------- outbound ARI
  /** Worker, every minute: push queued room-nights (or the full calendar) for every active connection. */
  async pushAll(): Promise<number> {
    const conns = await this.db.query(`select property_id from channel_connection where status = 'active'`);
    let pushed = 0;
    for (const c of conns) pushed += await this.pushProperty(c.property_id).catch((err) => {
      this.log.warn(`ARI push for ${c.property_id} failed: ${(err as Error).message}`);
      return 0;
    });
    return pushed;
  }

  async pushProperty(propertyId: string): Promise<number> {
    return this.db.tx(async (tx) => {
      const conn = await this.db.one(`select * from channel_connection where property_id = $1 and status = 'active' for update skip locked`, [propertyId], tx);
      if (!conn) return 0;
      const bundle = (await this.catalog.bundle(propertyId, tx))!;
      const roomIds = Object.keys(conn.room_map);
      let targets: { room_id: string; date: string }[];
      if (conn.needs_full_push) {
        const today = todayIn(bundle.property.timezone);
        targets = roomIds.flatMap((room_id) => nightsBetween(today, addDays(today, FULL_PUSH_DAYS)).map((date) => ({ room_id, date })));
        await this.db.query(`delete from channel_ari_queue where room_id = any($1::uuid[])`, [roomIds], tx);
      } else {
        targets = await this.db.query(`delete from channel_ari_queue where room_id = any($1::uuid[]) returning room_id, date`, [roomIds], tx);
      }
      if (targets.length === 0) return 0;
      const updates = await this.ariFor(bundle, conn, targets, tx);
      try {
        await this.partner(conn.partner).pushAri(conn.external_property_id, updates);
      } catch (err) {
        // Roll back: the queue rows come back and the next run retries.
        await this.db.query(`update channel_connection set last_error = $2 where id = $1`, [conn.id, (err as Error).message.slice(0, 500)]);
        throw err;
      }
      await this.db.query(`update channel_connection set last_push_at = now(), last_error = null, needs_full_push = false where id = $1`, [conn.id], tx);
      return updates.length;
    });
  }

  /** Availability (1/0 incl. cleaning buffers), nightly rate and min stay for room-nights. */
  private async ariFor(bundle: Awaited<ReturnType<CatalogService['bundle']>> & {}, conn: Row, targets: { room_id: string; date: string }[], tx: pg.PoolClient): Promise<AriUpdate[]> {
    const dates = targets.map((t) => t.date).sort();
    const occupied = await this.inventory.occupied(Object.keys(conn.room_map), addDays(dates[0]!, -3), addDays(dates[dates.length - 1]!, 4), tx);
    const plans = bundle.plans.map(toPricingPlan);
    const updates: AriUpdate[] = [];
    for (const t of targets) {
      const room = bundle.rooms.find((r) => r.id === t.room_id);
      if (!room) continue;
      const buffer = this.availability.bufferFor(room, bundle.property);
      const free = this.inventory.isFree(occupied, room.id, t.date, addDays(t.date, 1), buffer);
      const plan = nightlyPlanFor(plans, room.id, t.date);
      const base = toMinor(room.base_rate);
      const rate = plan?.rate != null ? toMinor(plan.rate) : plan?.adjustmentPct != null ? base + pctOf(base, plan.adjustmentPct) : base;
      updates.push({
        roomCode: conn.room_map[room.id],
        date: t.date,
        availability: free ? 1 : 0,
        rate: fromMinor(rate),
        minStay: Math.max(room.min_nights, plan?.minNights ?? 0) || 1,
      });
    }
    return updates;
  }

  // ---------------------------------------------------------------- inbound bookings
  async pullAll(): Promise<number> {
    const conns = await this.db.query(`select property_id from channel_connection where status = 'active'`);
    let n = 0;
    for (const c of conns) n += await this.pullProperty(c.property_id).catch((err) => {
      this.log.warn(`booking pull for ${c.property_id} failed: ${(err as Error).message}`);
      return 0;
    });
    return n;
  }

  async pullProperty(propertyId: string): Promise<number> {
    const conn = await this.db.one(`select * from channel_connection where property_id = $1 and status = 'active'`, [propertyId]);
    if (!conn) return 0;
    const partner = this.partner(conn.partner);
    const revisions = await partner.fetchRevisions(conn.external_property_id);
    let applied = 0;
    for (const rev of revisions) {
      const result = await this.applyRevision(conn, rev);
      await partner.ack(conn.external_property_id, rev.revisionId);
      if (result.applied) applied++;
      if (result.conflictDates.length) {
        this.notify.run(
          this.notify.ownerAlert(
            propertyId,
            `DOUBLE BOOKING: ${rev.channel} reservation ${rev.reservationId} (${rev.guest.name}) for ${rev.from} → ${rev.to} overlaps nights already taken (${result.conflictDates.join(', ')}). Suggested: cancel one booking and refund, or ask ${rev.channel} to relocate their guest.`,
            '/conflicts',
          ),
        );
      }
    }
    await this.db.query(`update channel_connection set last_pull_at = now() where id = $1`, [conn.id]);
    return applied;
  }

  /** Apply one revision exactly once (channel_event), creating/updating the booking and its nights. */
  async applyRevision(conn: Row, rev: BookingRevision): Promise<{ applied: boolean; conflictDates: string[] }> {
    const roomId = Object.entries(conn.room_map as Record<string, string>).find(([, code]) => code === rev.roomCode)?.[0];
    return this.db.tx(async (tx) => {
      const fresh = await this.db.one(
        `insert into channel_event (partner, event_id, tenant_id, property_id, kind, payload) values ($1, $2, $3, $4, $5, $6)
         on conflict do nothing returning event_id`,
        [conn.partner, rev.revisionId, conn.tenant_id, conn.property_id, rev.status, JSON.stringify(rev)],
        tx,
      );
      if (!fresh) return { applied: false, conflictDates: [] };
      if (!roomId) {
        await this.db.query(`update channel_event set error = 'unmapped room', processed_at = now() where partner = $1 and event_id = $2`, [conn.partner, rev.revisionId], tx);
        return { applied: false, conflictDates: [] };
      }
      const existing = await this.db.one(
        `select * from booking where room_id = $1 and source = $2 and external_uid = $3 for update`,
        [roomId, rev.channel, rev.reservationId],
        tx,
      );
      let conflictDates: string[] = [];
      if (rev.status === 'cancelled') {
        if (existing && existing.status !== 'cancelled') {
          await this.db.query(`update booking set status = 'cancelled', cancel_reason = $2, updated_at = now() where id = $1`, [existing.id, `Cancelled on ${rev.channel}`], tx);
          await this.inventory.logStatus(tx, conn.tenant_id, existing.id, existing.status, 'cancelled', `channel:${rev.channel}`);
          await this.inventory.releaseBooking(tx, existing.id);
        }
      } else {
        let bookingId = existing?.id as string | undefined;
        if (existing) {
          // Modified: move the reservation to its new dates/total.
          await this.inventory.releaseBooking(tx, existing.id);
          await this.db.query(`update booking set from_date = $2, to_date = $3, guests = $4, total = $5, base_amount = $5, updated_at = now() where id = $1`, [existing.id, rev.from, rev.to, rev.guests, rev.total], tx);
        } else {
          const guestId = await this.upsertGuest(tx, conn.tenant_id, rev);
          const row = (await this.db.one(
            `insert into booking (tenant_id, property_id, room_id, guest_id, reference, from_date, to_date, guests, status, mode, source, external_uid,
                                  base_amount, total, currency, deposit_due, cancellation_policy_snapshot)
             values ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', 'instant', $9, $10, $11, $11, $12, $11, $13) returning id`,
            [conn.tenant_id, conn.property_id, roomId, guestId, bookingReference(), rev.from, rev.to, rev.guests, rev.channel, rev.reservationId, rev.total, rev.currency,
              JSON.stringify({ policy: 'ota', text: `Managed by ${rev.channel}` })],
            tx,
          ))!;
          bookingId = row.id;
          await this.inventory.logStatus(tx, conn.tenant_id, row.id, null, 'confirmed', `channel:${rev.channel}`, `reservation ${rev.reservationId}`);
        }
        const conflicts = await this.inventory.reserveOta(tx, { tenantId: conn.tenant_id, roomId, bookingId: bookingId!, from: rev.from, to: rev.to, source: rev.channel });
        for (const c of conflicts) {
          await this.db.query(
            `insert into sync_conflict (tenant_id, room_id, date, channel, external_uid, booking_id)
             values ($1, $2, $3, $4, $5, $6) on conflict (room_id, date, coalesce(external_uid, '')) where resolved_at is null do nothing`,
            [conn.tenant_id, roomId, c.date, rev.channel, rev.reservationId, c.booking_id],
            tx,
          );
        }
        conflictDates = conflicts.map((c) => c.date);
      }
      await this.db.query(`update channel_event set processed_at = now() where partner = $1 and event_id = $2`, [conn.partner, rev.revisionId], tx);
      this.availability.invalidate(conn.property_id);
      return { applied: true, conflictDates };
    });
  }

  private async upsertGuest(tx: pg.PoolClient, tenantId: string, rev: BookingRevision): Promise<string> {
    if (rev.guest.email) {
      const row = await this.db.one<{ id: string }>(
        `insert into guest (tenant_id, name, email, phone, country) values ($1, $2, lower($3), $4, $5)
         on conflict (tenant_id, lower(email)) where email is not null do update set name = excluded.name returning id`,
        [tenantId, rev.guest.name, rev.guest.email, rev.guest.phone ?? null, rev.guest.country ?? null],
        tx,
      );
      return row!.id;
    }
    const row = await this.db.one<{ id: string }>(`insert into guest (tenant_id, name, phone, country) values ($1, $2, $3, $4) returning id`, [tenantId, rev.guest.name, rev.guest.phone ?? null, rev.guest.country ?? null], tx);
    return row!.id;
  }

  /** iCal import is redundant for channels covered by a live connection (IcalService skips them). */
  async coveredChannels(propertyId: string): Promise<string[]> {
    const c = await this.db.one<{ channels: string[] }>(`select channels from channel_connection where property_id = $1 and status = 'active'`, [propertyId]);
    return c?.channels ?? [];
  }

}
