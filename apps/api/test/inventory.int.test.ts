import { ConflictException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { InventoryService } from '../src/modules/inventory/inventory.service.js';
import { JobsService } from '../src/modules/jobs/jobs.service.js';
import { activeNightsPerDate, bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

let ctx: TestCtx;
let bookings: BookingsService;

beforeAll(async () => {
  ctx = await setupApp();
  bookings = ctx.get(BookingsService);
});
afterAll(() => ctx.close());

describe('double booking is impossible', () => {
  it('two concurrent requests for the same night: exactly one wins', async () => {
    const room = ctx.roomIds[1]!;
    const { from, to } = futureStay(120);
    const results = await Promise.allSettled([
      bookings.create(bookingInput(room, from, to)),
      bookings.create(bookingInput(room, from, to)),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.reason).toBeInstanceOf(ConflictException);
    expect(await activeNightsPerDate(ctx.db, room)).toEqual([]);
  });

  it('twenty concurrent overlapping requests: one winner, no night held twice', async () => {
    const room = ctx.roomIds[2]!;
    // staggered overlapping ranges: every pair overlaps on at least one night
    const inputs = Array.from({ length: 20 }, (_, i) => {
      const start = futureStay(140 + (i % 3)).from;
      return bookingInput(room, start, futureStay(140 + (i % 3) + 4).from);
    });
    const results = await Promise.allSettled(inputs.map((i) => bookings.create(i)));
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect(await activeNightsPerDate(ctx.db, room)).toEqual([]);
  });

  it('the database itself refuses a second active row for a night', async () => {
    const room = ctx.roomIds[3]!;
    const { from } = futureStay(160, 1);
    const insert = () =>
      ctx.db.query(
        `insert into night_inventory (tenant_id, room_id, date, status, source) values ($1, $2, $3, 'blocked', 'manual')`,
        [ctx.tenantId, room, from],
      );
    await insert();
    await expect(insert()).rejects.toMatchObject({ code: '23505' });
  });

  it('an OTA night that collides with a direct night is reported, not written', async () => {
    const room = ctx.roomIds[0]!;
    const { from, to } = futureStay(170);
    await bookings.create(bookingInput(room, from, to));
    const inventory = ctx.get(InventoryService);
    const occupant = await ctx.db.tx((tx) =>
      inventory.insertOtaNight(tx, { tenantId: ctx.tenantId, roomId: room, date: from, source: 'airbnb', icalSourceId: null as any, externalUid: 'x' }),
    );
    expect(occupant).toMatchObject({ status: 'held', source: 'direct' });
  });
});

describe('holds expire', () => {
  it('an expired hold releases the night for the next guest (without waiting for the sweeper)', async () => {
    const room = ctx.roomIds[4]!;
    const { from, to } = futureStay(180);
    const first = await bookings.create(bookingInput(room, from, to));
    await expect(bookings.create(bookingInput(room, from, to))).rejects.toBeInstanceOf(ConflictException);

    await ctx.db.query(
      `update hold set expires_at = now() - interval '1 second' where booking_id = (select id from booking where reference = $1)`,
      [first.reference],
    );
    const second = await bookings.create(bookingInput(room, from, to));
    expect(second.status).toBe('pending');

    const b1 = await ctx.db.one(`select status from booking where reference = $1`, [first.reference]);
    expect(b1!.status).toBe('abandoned');
    const nights = await ctx.db.query(
      `select n.status from night_inventory n join booking b on b.id = n.booking_id where b.reference = $1`,
      [first.reference],
    );
    expect(nights.every((n) => n.status === 'released')).toBe(true);
    expect(await activeNightsPerDate(ctx.db, room)).toEqual([]);
  });

  it('the sweeper abandons expired pending bookings and frees their nights', async () => {
    const room = ctx.roomIds[5]!;
    const { from, to } = futureStay(200);
    const b = await bookings.create(bookingInput(room, from, to));
    await ctx.db.query(`update hold set expires_at = now() - interval '1 minute' where booking_id = (select id from booking where reference = $1)`, [b.reference]);
    expect(await ctx.get(JobsService).sweepHolds()).toBeGreaterThanOrEqual(1);
    const row = await ctx.db.one(`select status from booking where reference = $1`, [b.reference]);
    expect(row!.status).toBe('abandoned');
    const active = await ctx.db.query(`select 1 from night_inventory where room_id = $1 and date >= $2 and date < $3 and status <> 'released'`, [room, from, to]);
    expect(active).toHaveLength(0);
  });

  it('an expired-but-unswept hold is not shown as occupied in search', async () => {
    const room = ctx.roomIds[5]!;
    const { from, to } = futureStay(220);
    const b = await bookings.create(bookingInput(room, from, to));
    const inventory = ctx.get(InventoryService);
    expect(await inventory.occupied([room], from, to)).toHaveLength(3);
    await ctx.db.query(`update hold set expires_at = now() - interval '1 second' where booking_id = (select id from booking where reference = $1)`, [b.reference]);
    expect(await inventory.occupied([room], from, to)).toHaveLength(0);
  });
});

describe('row-level security', () => {
  it('a tenant session cannot see another tenant’s rows', async () => {
    const other = await ctx.db.one(`insert into tenant (name) values ('Other owner') returning id`);
    const visible = await ctx.db.withTenant(other!.id, (tx) => ctx.db.query(`select id from property`, [], tx));
    expect(visible).toHaveLength(0);
    const own = await ctx.db.withTenant(ctx.tenantId, (tx) => ctx.db.query(`select id from property`, [], tx));
    expect(own.map((p) => p.id)).toEqual([ctx.propertyId]);
  });

  it('payments are append-only', async () => {
    await expect(ctx.db.query(`update payment set amount = 0`)).rejects.toThrow(/append-only/);
    await expect(ctx.db.query(`delete from payment`)).rejects.toThrow(/append-only/);
  });
});
