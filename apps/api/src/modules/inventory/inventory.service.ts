import { ConflictException, Injectable } from '@nestjs/common';
import { addDays, nightsBetween } from '@staydirect/shared';
import type pg from 'pg';
import { DbService, isUniqueViolation } from '../../common/db.service.js';

/** Thrown when the unique active-night index refuses a write. */
export class NightsUnavailableError extends ConflictException {
  constructor(public readonly roomId: string, public readonly dates: string[]) {
    super({ message: 'Those nights are no longer available', code: 'nights_unavailable', roomId, dates });
  }
}

export interface OccupiedNight {
  room_id: string;
  date: string;
  status: 'held' | 'reserved' | 'blocked';
  source: string;
  booking_id: string | null;
  ical_source_id?: string | null;
}

/**
 * The only code that writes night_inventory and hold. Every method takes the transaction client
 * of its caller: inventory changes never happen outside a transaction (CLAUDE.md rule 1).
 * Double sales are refused by uq_night_active; this service only translates that refusal.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly db: DbService) {}

  /**
   * Release holds that have expired, optionally only those touching a room/date range.
   * Marks their still-pending bookings abandoned. Returns the abandoned booking ids.
   */
  async releaseExpiredHolds(
    tx: pg.PoolClient,
    scope?: { roomId: string; from: string; to: string },
  ): Promise<string[]> {
    const params: unknown[] = [];
    let where = 'h.released_at is null and h.converted_at is null and h.expires_at < now()';
    if (scope) {
      params.push(scope.roomId, scope.from, scope.to);
      where += ' and h.room_id = $1 and h.from_date < $3 and h.to_date > $2';
    }
    const released = await this.db.query<{ id: string; booking_id: string }>(
      `update hold h set released_at = now() where ${where} returning h.id, h.booking_id`,
      params,
      tx,
    );
    if (released.length === 0) return [];
    const holdIds = released.map((r) => r.id);
    await this.db.query(
      `update night_inventory set status = 'released', released_at = now()
        where hold_id = any($1::uuid[]) and status = 'held'`,
      [holdIds],
      tx,
    );
    const abandoned = await this.db.query<{ id: string; tenant_id: string }>(
      `update booking set status = 'abandoned', updated_at = now()
        where id = any($1::uuid[]) and status = 'pending'
        returning id, tenant_id`,
      [released.map((r) => r.booking_id)],
      tx,
    );
    for (const b of abandoned) {
      await this.logStatus(tx, b.tenant_id, b.id, 'pending', 'abandoned', 'system:hold-expiry');
    }
    return abandoned.map((b) => b.id);
  }

  /**
   * Place a hold on [from, to) for a booking. Expired holds on the same nights are released first,
   * inside this transaction, so availability never depends on the sweeper having run.
   */
  async createHold(
    tx: pg.PoolClient,
    args: { tenantId: string; roomId: string; bookingId: string; from: string; to: string; expiresAt: Date },
  ): Promise<{ holdId: string }> {
    await this.releaseExpiredHolds(tx, { roomId: args.roomId, from: args.from, to: args.to });
    const hold = await this.db.one<{ id: string }>(
      `insert into hold (tenant_id, room_id, booking_id, from_date, to_date, expires_at)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [args.tenantId, args.roomId, args.bookingId, args.from, args.to, args.expiresAt],
      tx,
    );
    await this.insertNights(tx, {
      tenantId: args.tenantId,
      roomId: args.roomId,
      from: args.from,
      to: args.to,
      status: 'held',
      source: 'direct',
      bookingId: args.bookingId,
      holdId: hold!.id,
    });
    return { holdId: hold!.id };
  }

  async extendHold(tx: pg.PoolClient, bookingId: string, expiresAt: Date): Promise<boolean> {
    const rows = await this.db.query(
      `update hold set expires_at = greatest(expires_at, $2)
        where booking_id = $1 and released_at is null and converted_at is null returning id`,
      [bookingId, expiresAt],
      tx,
    );
    return rows.length > 0;
  }

  /**
   * Turn a booking's held nights into reserved nights (payment confirmed).
   * If the hold was already released (payment after expiry) we try to reserve the nights afresh;
   * the unique index decides. Returns false when the nights were sold in the meantime.
   */
  async reserveForBooking(
    tx: pg.PoolClient,
    booking: { id: string; tenant_id: string; room_id: string; from_date: string; to_date: string },
  ): Promise<boolean> {
    const nights = nightsBetween(booking.from_date, booking.to_date);
    const converted = await this.db.query(
      `update night_inventory set status = 'reserved'
        where booking_id = $1 and status = 'held' returning date`,
      [booking.id],
      tx,
    );
    await this.db.query(
      `update hold set converted_at = now() where booking_id = $1 and converted_at is null and released_at is null`,
      [booking.id],
      tx,
    );
    if (converted.length === nights.length) return true;

    const have = new Set(converted.map((r) => r.date as string));
    const missing = nights.filter((d) => !have.has(d));
    try {
      await this.withSavepoint(tx, () =>
        this.insertDates(tx, {
          tenantId: booking.tenant_id,
          roomId: booking.room_id,
          dates: missing,
          status: 'reserved',
          source: 'direct',
          bookingId: booking.id,
        }),
      );
      return true;
    } catch (err) {
      if (err instanceof NightsUnavailableError) return false;
      throw err;
    }
  }

  /** Release every active night of a booking (cancel, decline, abandon). Optionally only from a date on. */
  async releaseBooking(tx: pg.PoolClient, bookingId: string, fromDate?: string): Promise<number> {
    const rows = await this.db.query(
      `update night_inventory set status = 'released', released_at = now()
        where booking_id = $1 and status in ('held', 'reserved') ${fromDate ? 'and date >= $2' : ''}
        returning id`,
      fromDate ? [bookingId, fromDate] : [bookingId],
      tx,
    );
    await this.db.query(
      `update hold set released_at = now() where booking_id = $1 and released_at is null and converted_at is null`,
      [bookingId],
      tx,
    );
    return rows.length;
  }

  async block(
    tx: pg.PoolClient,
    args: { tenantId: string; roomId: string; from: string; to: string; note: string },
  ): Promise<void> {
    await this.releaseExpiredHolds(tx, { roomId: args.roomId, from: args.from, to: args.to });
    await this.insertNights(tx, { ...args, status: 'blocked', source: 'manual' });
  }

  async unblock(tx: pg.PoolClient, args: { roomId: string; from: string; to: string }): Promise<number> {
    const rows = await this.db.query(
      `update night_inventory set status = 'released', released_at = now()
        where room_id = $1 and date >= $2 and date < $3 and status = 'blocked' and source = 'manual'
        returning id`,
      [args.roomId, args.from, args.to],
      tx,
    );
    return rows.length;
  }

  /**
   * Insert one OTA night from an iCal import. Returns the occupying row when the night is taken
   * (the caller records a sync conflict), or null on success.
   */
  async insertOtaNight(
    tx: pg.PoolClient,
    args: { tenantId: string; roomId: string; date: string; source: string; icalSourceId: string; externalUid: string },
  ): Promise<OccupiedNight | null> {
    try {
      await this.withSavepoint(tx, () =>
        this.db.query(
          `insert into night_inventory (tenant_id, room_id, date, status, source, ical_source_id, external_uid)
           values ($1, $2, $3, 'reserved', $4, $5, $6)`,
          [args.tenantId, args.roomId, args.date, args.source, args.icalSourceId, args.externalUid],
          tx,
        ),
      );
      return null;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      return this.db.one<OccupiedNight>(
        `select room_id, date, status, source, booking_id, ical_source_id from night_inventory
          where room_id = $1 and date = $2 and status in ('held', 'reserved', 'blocked')`,
        [args.roomId, args.date],
        tx,
      );
    }
  }

  async releaseOtaNights(tx: pg.PoolClient, ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.query(
      `update night_inventory set status = 'released', released_at = now()
        where id = any($1::bigint[]) and status in ('reserved', 'blocked') and ical_source_id is not null`,
      [ids],
      tx,
    );
  }

  /**
   * Occupied nights for rooms in [from, to), ignoring holds that have expired but not yet been swept.
   * Read-only; used by availability search and by the pre-hold buffer check.
   */
  async occupied(roomIds: string[], from: string, to: string, db: pg.PoolClient | pg.Pool = this.db.pool): Promise<OccupiedNight[]> {
    if (roomIds.length === 0) return [];
    return this.db.query<OccupiedNight>(
      `select n.room_id, n.date, n.status, n.source, n.booking_id
         from night_inventory n
         left join hold h on h.id = n.hold_id
        where n.room_id = any($1::uuid[]) and n.date >= $2 and n.date < $3
          and n.status in ('held', 'reserved', 'blocked')
          and (n.status <> 'held' or h.expires_at >= now())`,
      [roomIds, from, to],
      db,
    );
  }

  /**
   * True if [from, to) is free including the cleaning buffer: no occupied night in
   * [from - buffer, to + buffer). The overlap itself is also guarded by the unique index.
   */
  isFree(occupied: OccupiedNight[], roomId: string, from: string, to: string, bufferNights: number, ignoreBookingId?: string): boolean {
    const lo = addDays(from, -bufferNights);
    const hi = addDays(to, bufferNights);
    return !occupied.some(
      (n) => n.room_id === roomId && n.date >= lo && n.date < hi && (!ignoreBookingId || n.booking_id !== ignoreBookingId),
    );
  }

  async logStatus(
    tx: pg.PoolClient,
    tenantId: string,
    bookingId: string,
    from: string | null,
    to: string,
    actor: string,
    note?: string,
  ): Promise<void> {
    await this.db.query(
      `insert into booking_status_log (tenant_id, booking_id, from_status, to_status, actor, note)
       values ($1, $2, $3, $4, $5, $6)`,
      [tenantId, bookingId, from, to, actor, note ?? null],
      tx,
    );
  }

  // ------------------------------------------------------------------ internals

  private insertNights(
    tx: pg.PoolClient,
    args: {
      tenantId: string;
      roomId: string;
      from: string;
      to: string;
      status: 'held' | 'reserved' | 'blocked';
      source: string;
      bookingId?: string;
      holdId?: string;
      note?: string;
    },
  ): Promise<void> {
    return this.insertDates(tx, { ...args, dates: nightsBetween(args.from, args.to) });
  }

  private async insertDates(
    tx: pg.PoolClient,
    args: {
      tenantId: string;
      roomId: string;
      dates: string[];
      status: 'held' | 'reserved' | 'blocked';
      source: string;
      bookingId?: string;
      holdId?: string;
      note?: string;
    },
  ): Promise<void> {
    if (args.dates.length === 0) return;
    try {
      await this.db.query(
        `insert into night_inventory (tenant_id, room_id, date, status, source, booking_id, hold_id, note)
         select $1, $2, d, $4, $5, $6, $7, $8 from unnest($3::date[]) as d`,
        [args.tenantId, args.roomId, args.dates, args.status, args.source, args.bookingId ?? null, args.holdId ?? null, args.note ?? null],
        tx,
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new NightsUnavailableError(args.roomId, args.dates);
      throw err;
    }
  }

  /** Run a statement that may hit the unique index without aborting the surrounding transaction. */
  private async withSavepoint<T>(tx: pg.PoolClient, fn: () => Promise<T>): Promise<T> {
    await tx.query('savepoint sp_inventory');
    try {
      const result = await fn();
      await tx.query('release savepoint sp_inventory');
      return result;
    } catch (err) {
      await tx.query('rollback to savepoint sp_inventory');
      throw err;
    }
  }
}
