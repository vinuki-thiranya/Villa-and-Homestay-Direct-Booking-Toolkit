import { addDays, nightsBetween } from '@staydirect/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { JobsService } from '../src/modules/jobs/jobs.service.js';
import { bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

/**
 * "Simulate a season of bookings (1,000 random requests) against the inventory before Phase 1 is
 * accepted" (spec §12). Random rooms, dates and lengths over 90 days, 25 in flight at a time, with
 * some holds expiring mid-run. Invariant: no room-night is ever held or reserved twice, and every
 * winning booking owns exactly its nights.
 */
describe('season simulation', () => {
  let ctx: TestCtx;
  beforeAll(async () => {
    ctx = await setupApp();
  });
  afterAll(() => ctx.close());

  it('1,000 random concurrent requests never double-sell a night', async () => {
    const bookings = ctx.get(BookingsService);
    const jobs = ctx.get(JobsService);
    const start = futureStay(400).from; // clear of seeded data and other tests
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const requests = Array.from({ length: 1000 }, () => {
      const from = addDays(start, rand(90));
      return bookingInput(ctx.roomIds[rand(ctx.roomIds.length)]!, from, addDays(from, 2 + rand(6)), { guests: 1 + rand(2) });
    });

    const outcome = { ok: 0, conflict: 0, other: [] as string[] };
    let i = 0;
    const worker = async () => {
      while (i < requests.length) {
        const idx = i++;
        try {
          const b = await bookings.create(requests[idx]!);
          outcome.ok++;
          // Every 7th winner walks away: expire its hold so later requests can take the nights.
          if (idx % 7 === 0) {
            await ctx.db.query(`update hold set expires_at = now() - interval '1 second' where booking_id = (select id from booking where reference = $1)`, [b.reference]);
          }
        } catch (err: any) {
          if (err?.status === 409) outcome.conflict++;
          else if (err?.status === 422) outcome.other.push('422');
          else throw err;
        }
        if (idx % 100 === 0) await jobs.sweepHolds();
      }
    };
    await Promise.all(Array.from({ length: 25 }, worker));

    expect(outcome.ok + outcome.conflict + outcome.other.length).toBe(1000);
    expect(outcome.ok).toBeGreaterThan(50);
    expect(outcome.conflict).toBeGreaterThan(100);

    const doubles = await ctx.db.query(
      `select room_id, date, count(*) from night_inventory where status in ('held', 'reserved', 'blocked')
        group by room_id, date having count(*) > 1`,
    );
    expect(doubles).toEqual([]);

    // Each pending booking holds exactly its own nights; abandoned ones hold none.
    const live = await ctx.db.query(
      `select b.id, b.status, b.from_date, b.to_date,
              (select count(*)::int from night_inventory n where n.booking_id = b.id and n.status in ('held', 'reserved')) as nights
         from booking b where b.from_date >= $1`,
      [start],
    );
    for (const b of live) {
      // Release of a hold and abandonment of its booking happen in one transaction, so a pending
      // booking always owns all its nights and an abandoned one owns none.
      expect(b.nights).toBe(b.status === 'pending' ? nightsBetween(b.from_date, b.to_date).length : 0);
    }
    console.log(`simulation: ${outcome.ok} booked, ${outcome.conflict} refused (409), ${outcome.other.length} invalid`);
  }, 180_000);
});
