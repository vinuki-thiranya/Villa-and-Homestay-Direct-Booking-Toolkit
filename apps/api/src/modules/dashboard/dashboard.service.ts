import { Injectable, NotFoundException } from '@nestjs/common';
import {
  addDays,
  diffDays,
  OTA_COMMISSION_RATE,
  todayIn,
  type CalendarNight,
  type ConflictRow,
  type OwnerDashboard,
  type SessionUser,
  type SyncHealthRow,
} from '@staydirect/shared';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { BOOKING_LIST_SQL, toOwnerBooking } from '../bookings/bookings.service.js';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class DashboardService {
  constructor(
    private readonly db: DbService,
    private readonly inventory: InventoryService,
    private readonly availability: AvailabilityService,
  ) {}

  /** Owner dashboard (spec §3.9, v_owner_dashboard): today first, then the month. */
  dashboard(user: SessionUser, propertyId: string): Promise<OwnerDashboard> {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.property(tx, propertyId);
      const today = todayIn(p.timezone);
      const monthStart = `${today.slice(0, 8)}01`;
      const nextMonth = addDays(`${today.slice(0, 7)}-28`, 4).slice(0, 8) + '01';
      const daysInMonth = diffDays(monthStart, nextMonth);

      const q = (where: string, params: unknown[], order = 'b.from_date') =>
        this.db
          .query(`${BOOKING_LIST_SQL} where b.property_id = $1 and ${where} order by ${order} limit 50`, [propertyId, ...params], tx)
          .then((rows) => rows.map(toOwnerBooking));

      const [arrivalsToday, departuresToday, upcomingArrivals, pendingApproval, unpaidBalances] = await Promise.all([
        q(`b.from_date = $2 and b.status in ('confirmed', 'checked_in')`, [today]),
        q(`b.to_date = $2 and b.status in ('confirmed', 'checked_in', 'checked_out')`, [today]),
        q(`b.from_date > $2 and b.from_date <= $3 and b.status = 'confirmed'`, [today, addDays(today, 14)]),
        q(`b.mode = 'request' and b.status = 'pending' and b.approved_at is null`, []),
        q(`b.status in ('confirmed', 'checked_in') and b.total > p.paid and b.to_date >= $2`, [today], 'b.balance_due_date'),
      ]);

      const roomCount = await this.db.one<{ n: number }>(`select count(*)::int as n from room where property_id = $1 and active`, [propertyId], tx);
      const nightsBySource = await this.db.query<{ source: string; nights: number; est_revenue: number }>(
        `select n.source, count(*)::int as nights, sum(r.base_rate)::numeric(12,2) as est_revenue
           from night_inventory n join room r on r.id = n.room_id
          where r.property_id = $1 and n.status = 'reserved' and n.date >= $2 and n.date < $3
          group by n.source`,
        [propertyId, monthStart, nextMonth],
        tx,
      );
      // Direct revenue: each confirmed direct booking's total pro-rated to the nights inside this month.
      const direct = await this.db.one<{ revenue: number; nights: number }>(
        `select coalesce(sum(b.total * (least(b.to_date, $3::date) - greatest(b.from_date, $2::date))::numeric
                             / (b.to_date - b.from_date)), 0)::numeric(12,2) as revenue,
                coalesce(sum(least(b.to_date, $3::date) - greatest(b.from_date, $2::date)), 0)::int as nights
           from booking b
          where b.property_id = $1 and b.source = 'direct' and b.status in ('confirmed', 'checked_in', 'checked_out')
            and b.from_date < $3 and b.to_date > $2`,
        [propertyId, monthStart, nextMonth],
        tx,
      );
      const directRevenue = round2(direct?.revenue ?? 0);
      const reservedNights = nightsBySource.reduce((s, r) => s + r.nights, 0);
      const capacity = (roomCount?.n ?? 0) * daysInMonth;
      const revenueBySource = nightsBySource.map((r) => ({
        source: r.source as any,
        nights: r.nights,
        // OTA revenue is not in iCal: estimated at the room's base rate (labelled "est." in the UI).
        revenue: r.source === 'direct' ? directRevenue : round2(r.est_revenue),
      }));
      if (!revenueBySource.some((r) => r.source === 'direct')) revenueBySource.unshift({ source: 'direct', nights: 0, revenue: 0 });

      const pendingSlips = await this.db.one<{ n: number }>(
        `select count(*)::int as n from v_payment_effective v join booking b on b.id = v.booking_id
          where b.property_id = $1 and v.status = 'pending' and v.kind = 'charge' and v.slip_url is not null`,
        [propertyId],
        tx,
      );

      return {
        propertyId,
        currency: p.base_currency,
        today,
        arrivalsToday,
        departuresToday,
        upcomingArrivals,
        pendingApproval,
        unpaidBalances,
        month: {
          label: monthStart.slice(0, 7),
          occupancyPct: capacity ? round2((reservedNights / capacity) * 100) : 0,
          adr: direct?.nights ? round2(directRevenue / direct.nights) : 0,
          revenueBySource,
          directRevenue,
          commissionSaved: round2(directRevenue * OTA_COMMISSION_RATE),
        },
        syncHealth: await this.syncHealthTx(tx, propertyId),
        openConflicts: await this.conflictsTx(tx, propertyId, true),
        pendingSlips: pendingSlips?.n ?? 0,
      };
    });
  }

  calendar(user: SessionUser, propertyId: string, from: string, to: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      const rooms = await this.db.query(`select id, name from room where property_id = $1 and active order by sort_order, name`, [propertyId], tx);
      const nights = await this.db.query(
        `select n.room_id, n.date, n.status, n.source, n.booking_id, b.reference, n.note
           from night_inventory n
           join room r on r.id = n.room_id
           left join booking b on b.id = n.booking_id
           left join hold h on h.id = n.hold_id
          where r.property_id = $1 and n.date >= $2 and n.date < $3 and n.status in ('held', 'reserved', 'blocked')
            and (n.status <> 'held' or h.expires_at >= now())
          order by n.date`,
        [propertyId, from, to],
        tx,
      );
      return {
        rooms: rooms.map((r) => ({ id: r.id, name: r.name })),
        nights: nights.map(
          (n): CalendarNight => ({
            roomId: n.room_id,
            date: n.date,
            status: n.status,
            source: n.source,
            bookingId: n.booking_id,
            bookingReference: n.reference,
            note: n.note,
          }),
        ),
      };
    });
  }

  async block(user: SessionUser, roomId: string, input: { from: string; to: string; note: string }) {
    const propertyId = await this.db.withTenant(user.tenantId, async (tx) => {
      const room = await this.db.one(`select property_id from room where id = $1`, [roomId], tx);
      if (!room) throw new NotFoundException('Room not found');
      await this.inventory.block(tx, { tenantId: user.tenantId, roomId, ...input });
      return room.property_id as string;
    });
    this.availability.invalidate(propertyId);
    return { ok: true };
  }

  async unblock(user: SessionUser, roomId: string, input: { from: string; to: string }) {
    const out = await this.db.withTenant(user.tenantId, async (tx) => {
      const room = await this.db.one(`select property_id from room where id = $1`, [roomId], tx);
      if (!room) throw new NotFoundException('Room not found');
      return { propertyId: room.property_id as string, released: await this.inventory.unblock(tx, { roomId, ...input }) };
    });
    this.availability.invalidate(out.propertyId);
    return { released: out.released };
  }

  syncHealth(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, (tx) => this.syncHealthTx(tx, propertyId));
  }

  conflicts(user: SessionUser, propertyId: string, openOnly: boolean) {
    return this.db.withTenant(user.tenantId, (tx) => this.conflictsTx(tx, propertyId, openOnly));
  }

  resolveConflict(user: SessionUser, conflictId: string, input: { resolution: string; note: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `update sync_conflict set resolved_at = now(), resolution = $2, resolution_note = $3
          where id = $1 and resolved_at is null returning id`,
        [conflictId, input.resolution, input.note],
        tx,
      );
      if (!row) throw new NotFoundException('Open conflict not found');
      return { ok: true };
    });
  }

  private async property(tx: pg.PoolClient, propertyId: string): Promise<Row> {
    const p = await this.db.one(`select * from property where id = $1`, [propertyId], tx);
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  private async syncHealthTx(tx: pg.PoolClient, propertyId: string): Promise<SyncHealthRow[]> {
    const rows = await this.db.query(`select * from v_sync_health where property_id = $1 order by room_name, channel`, [propertyId], tx);
    return rows.map((s) => ({
      sourceId: s.source_id,
      roomId: s.room_id,
      roomName: s.room_name,
      channel: s.channel,
      url: s.url,
      lastFetchAt: s.last_fetch_at,
      lastSuccessAt: s.last_success_at,
      lastStatus: s.last_status,
      lastError: s.last_error,
      consecutiveFailures: s.consecutive_failures,
    }));
  }

  private async conflictsTx(tx: pg.PoolClient, propertyId: string, openOnly: boolean): Promise<ConflictRow[]> {
    const rows = await this.db.query(
      `select c.*, r.name as room_name, b.reference from sync_conflict c
         join room r on r.id = c.room_id left join booking b on b.id = c.booking_id
        where r.property_id = $1 ${openOnly ? 'and c.resolved_at is null' : ''}
        order by c.date limit 200`,
      [propertyId],
      tx,
    );
    return rows.map((c) => ({
      id: c.id,
      roomId: c.room_id,
      roomName: c.room_name,
      date: c.date,
      channel: c.channel,
      externalUid: c.external_uid,
      bookingId: c.booking_id,
      bookingReference: c.reference,
      detectedAt: c.detected_at,
      resolution: c.resolution,
    }));
  }
}
