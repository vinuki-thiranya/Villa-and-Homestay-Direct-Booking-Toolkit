import { addDays } from '@staydirect/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { buildIcal, feedNights, parseIcal } from '../src/modules/ical/ical.js';
import { IcalService } from '../src/modules/ical/ical.service.js';
import { bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

const d = (s: string) => s.replace(/-/g, '');
function feed(events: { uid: string; from: string; to: string; status?: string }[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${d(e.from)}`,
      `DTEND;VALUE=DATE:${d(e.to)}`,
      `UID:${e.uid}`,
      'SUMMARY:Reserved',
      ...(e.status ? [`STATUS:${e.status}`] : []),
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ].join('\r\n');
}

describe('iCal parsing', () => {
  it('parses folded all-day events and skips cancelled ones and our own echoes', () => {
    const text = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20270110\r\nDTEND;VALUE=DATE:20270113\r\nUID:abc-\r\n 123@airbnb.com\r\nEND:VEVENT\r\n' +
      'BEGIN:VEVENT\r\nDTSTART:20270120T140000Z\r\nDTEND:20270121T100000Z\r\nUID:x@booking.com\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\n' +
      'BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20270201\r\nDTEND;VALUE=DATE:20270202\r\nUID:aa-20270201-20270202@staydirect.lk\r\nEND:VEVENT\r\nEND:VCALENDAR';
    const events = parseIcal(text);
    expect(events[0]).toMatchObject({ uid: 'abc-123@airbnb.com', start: '2027-01-10', end: '2027-01-13' });
    const nights = feedNights(events, { from: '2027-01-01', to: '2028-01-01' });
    expect([...nights.keys()]).toEqual(['2027-01-10', '2027-01-11', '2027-01-12']);
  });

  it('exports consecutive nights as one event with an exclusive DTEND', () => {
    const out = buildIcal('Room', 'abcdef0123456789', [
      { date: '2027-03-01', status: 'reserved', groupKey: 'b1', summary: 'Reserved' },
      { date: '2027-03-02', status: 'reserved', groupKey: 'b1', summary: 'Reserved' },
      { date: '2027-03-05', status: 'blocked', groupKey: 'm', summary: 'Not available' },
    ]);
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(out).toContain('DTSTART;VALUE=DATE:20270301\r\nDTEND;VALUE=DATE:20270303');
    expect(() => parseIcal('garbage')).toThrow();
  });
});

describe('iCal import worker', () => {
  let ctx: TestCtx;
  let ical: IcalService;
  let sourceId: string;
  const room = () => ctx.roomIds[0]!;

  beforeAll(async () => {
    ctx = await setupApp();
    ical = ctx.get(IcalService);
    const s = await ctx.db.one(
      `insert into ical_source (tenant_id, room_id, url, channel) values ($1, $2, 'https://airbnb.test/feed.ics', 'airbnb') returning id`,
      [ctx.tenantId, room()],
    );
    sourceId = s!.id;
  });
  afterAll(() => ctx.close());

  it('adds OTA nights, releases them when they disappear', async () => {
    const { from, to } = futureStay(100);
    const r1 = await ical.sync(sourceId, { fetchFeed: async () => feed([{ uid: 'HM1@airbnb.com', from, to }]) });
    expect(r1).toMatchObject({ ok: true, added: 3, released: 0, conflicts: 0 });
    const active = () =>
      ctx.db.query(`select date from night_inventory where ical_source_id = $1 and status = 'reserved' order by date`, [sourceId]);
    expect((await active()).map((n) => n.date)).toEqual([from, addDays(from, 1), addDays(from, 2)]);

    const r2 = await ical.sync(sourceId, { fetchFeed: async () => feed([]) });
    expect(r2).toMatchObject({ ok: true, added: 0, released: 3 });
    expect(await active()).toHaveLength(0);
  });

  it('records a conflict when the OTA booked a night a direct guest already holds', async () => {
    const { from, to } = futureStay(110);
    const direct = await ctx.get(BookingsService).create(bookingInput(room(), from, to));
    const r = await ical.sync(sourceId, { fetchFeed: async () => feed([{ uid: 'HM2@airbnb.com', from: addDays(from, 2), to: addDays(from, 4) }]) });
    expect(r.conflicts).toBe(1); // the overlapping night
    expect(r.added).toBe(1); // the night after the direct stay
    const c = await ctx.db.one(`select c.date, b.reference from sync_conflict c join booking b on b.id = c.booking_id where c.ical_source_id = $1`, [sourceId]);
    expect(c).toMatchObject({ date: addDays(from, 2), reference: direct.reference });
    // Re-running the same feed does not duplicate the conflict.
    const again = await ical.sync(sourceId, { fetchFeed: async () => feed([{ uid: 'HM2@airbnb.com', from: addDays(from, 2), to: addDays(from, 4) }]) });
    expect(again.conflicts).toBe(0);
  });

  it('counts consecutive failures and never releases nights on a failed fetch', async () => {
    const { from, to } = futureStay(300);
    await ical.sync(sourceId, { fetchFeed: async () => feed([{ uid: 'HM3@airbnb.com', from, to }]) });
    for (let i = 0; i < 3; i++) {
      const r = await ical.sync(sourceId, { fetchFeed: async () => { throw new Error('HTTP 503'); } });
      expect(r.ok).toBe(false);
    }
    const s = await ctx.db.one(`select consecutive_failures, last_status from ical_source where id = $1`, [sourceId]);
    expect(s).toMatchObject({ consecutive_failures: 3, last_status: 'error' });
    const kept = await ctx.db.query(`select 1 from night_inventory where ical_source_id = $1 and status = 'reserved' and date >= $2 and date < $3`, [sourceId, from, to]);
    expect(kept).toHaveLength(3);
  });
});
