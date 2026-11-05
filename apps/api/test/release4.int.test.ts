import { ConflictException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { CatalogService } from '../src/modules/properties/catalog.service.js';
import { SiteFactsService } from '../src/modules/public/site-facts.service.js';
import { bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

let ctx: TestCtx;

beforeAll(async () => {
  ctx = await setupApp();
});
afterAll(() => ctx.close());

describe('guest site calendar', () => {
  it('closes a night only when every room is taken', async () => {
    const villa = (await ctx.get(CatalogService).propertyBySite('villa-lagoon'))!;
    const rooms = await ctx.db.query(`select id from room where property_id = $1 and active order by sort_order`, [villa.id]);
    expect(rooms.length).toBeGreaterThan(1);
    const stay = futureStay(320, 2);
    const facts = () => new SiteFactsService(ctx.db); // fresh instance: no 60 s cache between steps

    // One room taken: still open.
    await ctx.get(BookingsService).create(bookingInput(rooms[0]!.id, stay.from, stay.to));
    expect((await facts().calendar(villa, stay.from, stay.to)).closed).toEqual([]);

    // Every room taken: both nights close, the check-out day does not.
    for (const r of rooms.slice(1)) await ctx.get(BookingsService).create(bookingInput(r.id, stay.from, stay.to));
    const cal = await facts().calendar(villa, stay.from, futureStay(323).from);
    expect(cal.closed).toEqual([stay.from, futureStay(321).from]);
  });

  it('rejects ranges that are too long and clamps the past to today', async () => {
    const villa = (await ctx.get(CatalogService).propertyBySite('villa-lagoon'))!;
    const svc = ctx.get(SiteFactsService);
    await expect(svc.calendar(villa, futureStay(1).from, futureStay(500).from)).rejects.toThrow(/At most/);
    const cal = await svc.calendar(villa, '2020-01-01', futureStay(5).from);
    expect(cal.from).toBe(futureStay(0).from);
  });
});

describe('confirmation screen', () => {
  it('carries the booking-confirmed WhatsApp text in the guest language', async () => {
    const villa = (await ctx.get(CatalogService).propertyBySite('villa-lagoon'))!;
    const room = (await ctx.db.one(`select id from room where property_id = $1 and active order by sort_order desc limit 1`, [villa.id]))!;
    const stay = futureStay(340, 2);
    const res = await ctx.get(BookingsService).create(
      bookingInput(room.id, stay.from, stay.to, { guest: { name: 'Lena M', email: `lena-${Date.now()}@example.de`, phone: '+491701111111', country: 'DE', language: 'de' } }),
    );
    const b = await ctx.get(BookingsService).getPublic(res.reference, res.token);
    expect(b.confirmationMessage).toContain(`Buchung ${res.reference}`);
    expect(b.confirmationMessage).toContain(`${stay.from} → ${stay.to}`);
    expect(b.confirmationMessage).toContain(`/booking/${res.reference}?t=${res.token}`);
  });
});

describe('guest site trust facts', () => {
  it('reports the median first-reply time, ignoring automatic messages', async () => {
    const p = (await ctx.db.one(`select id, tenant_id from property where slug = 'tangalle-beach-house'`))!;
    const conv = (await ctx.db.one(
      `insert into conversation (tenant_id, property_id, contact, contact_name) values ($1, $2, '+447700900999', 'Test') returning id`,
      [p.tenant_id, p.id],
    ))!;
    const msg = (direction: 'in' | 'out', minutesAgo: number, sentBy: string) =>
      ctx.db.query(
        `insert into message (tenant_id, property_id, conversation_id, channel, direction, body, status, sent_by, created_at)
         values ($1, $2, $3, 'whatsapp', $4, 'x', 'sent', $5, now() - make_interval(mins => $6))`,
        [p.tenant_id, p.id, conv.id, direction, sentBy, minutesAgo],
      );
    const svc = new SiteFactsService(ctx.db);
    // Two questions answered so far: too little data to show.
    await msg('in', 500, 'guest');
    await msg('out', 490, 'ai'); // 10 min
    await msg('in', 400, 'guest');
    await msg('in', 395, 'guest'); // a follow-up before the answer counts from the first question
    await msg('out', 380, 'user:x'); // 20 min
    expect((await svc.facts(p.id)).responseMinutes).toBeNull();

    await msg('in', 300, 'guest');
    await msg('out', 295, 'system'); // automatic sequence message, not a reply
    await msg('out', 240, 'user:x'); // 60 min
    const facts = await new SiteFactsService(ctx.db).facts(p.id);
    expect(facts.responseMinutes).toBe(20);
    expect(facts.count).toBe(0);
    expect(facts.average).toBeNull();
  });
});

describe('manual payments', () => {
  it('refuses the same transfer reference twice with a 409, not a 500', async () => {
    const u = (await ctx.db.one(`select * from app_user where phone = '+94770000000'`))!;
    const owner = { id: u.id, tenantId: u.tenant_id, phone: u.phone, name: u.name, role: u.role };
    const b = (await ctx.db.one(`select id from booking where reference = 'SD-DEMO3'`))!;
    const payments = ctx.get(PaymentsService);
    await payments.recordManual(owner, b.id, { method: 'bank', amount: 10, reference: 'HNB-778812' });
    await expect(payments.recordManual(owner, b.id, { method: 'bank', amount: 10, reference: 'HNB-778812' })).rejects.toBeInstanceOf(ConflictException);
  });
});
