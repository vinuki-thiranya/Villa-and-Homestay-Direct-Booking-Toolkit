import { randomUUID } from 'node:crypto';
import { addDays, todayIn, type SessionUser } from '@staydirect/shared';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { compare } from '../scripts/restore-drill.js';
import { migrate } from '../scripts/migrate.js';
import { recordJobFailure } from '../src/common/job-health.js';
import { CONFIG, type AppConfig } from '../src/config.js';
import { AdminService } from '../src/modules/admin/admin.service.js';
import { OpsDigestService } from '../src/modules/admin/ops-digest.service.js';
import { GuestsService } from '../src/modules/guests/guests.service.js';
import { DELETED_GUEST_NAME, PrivacyService } from '../src/modules/guests/privacy.service.js';
import { EmailChannel } from '../src/modules/notifications/channels.js';
import { WebhooksController } from '../src/modules/public/webhooks.controller.js';
import { setupApp, type TestCtx } from './helpers.js';

let ctx: TestCtx;
let owner: SessionUser;
const today = () => todayIn('Asia/Colombo');

beforeAll(async () => {
  ctx = await setupApp();
  const u = (await ctx.db.one(`select * from app_user where phone = '+94770000000'`))!;
  owner = { id: u.id, tenantId: u.tenant_id, phone: u.phone, name: u.name, role: u.role };
});
afterAll(() => ctx.close());

/** A guest with one stay that ended `daysAgo` days ago. */
async function pastGuest(name: string, daysAgo: number, extra: { phone?: string; status?: string } = {}) {
  const g = (await ctx.db.one(
    `insert into guest (tenant_id, name, email, phone, country, language, passport_last4, notes)
     values ($1, $2, $3, $4, 'DE', 'de', '1234', 'Allergic to nuts') returning id`,
    [ctx.tenantId, name, `${randomUUID().slice(0, 8)}@example.com`, extra.phone ?? null],
  ))!;
  const b = (await ctx.db.one(
    `insert into booking (tenant_id, property_id, room_id, guest_id, reference, from_date, to_date, guests, status, currency, total, special_requests)
     values ($1, $2, $3, $4, $5, $6, $7, 2, $8, 'USD', 300, 'Late arrival, around midnight') returning id, reference`,
    [ctx.tenantId, ctx.propertyId, ctx.roomIds[0], g.id, `SD-P${randomUUID().slice(0, 6).toUpperCase()}`, addDays(today(), -daysAgo - 3), addDays(today(), -daysAgo), extra.status ?? 'checked_out'],
  ))!;
  return { guestId: g.id as string, bookingId: b.id as string, reference: b.reference as string };
}

async function message(fields: { guestId?: string | null; bookingId?: string | null; conversationId?: string | null; body: string; createdAt?: string }) {
  await ctx.db.query(
    `insert into message (tenant_id, property_id, guest_id, booking_id, conversation_id, channel, direction, recipient, body, status, created_at)
     values ($1, $2, $3, $4, $5, 'whatsapp', 'out', '+94770000000', $6, 'sent', coalesce($7::timestamptz, now()))`,
    [ctx.tenantId, ctx.propertyId, fields.guestId ?? null, fields.bookingId ?? null, fields.conversationId ?? null, fields.body, fields.createdAt ?? null],
  );
}

describe('guest data export', () => {
  it('returns everything about one guest and nothing about anyone else', async () => {
    const lena = await pastGuest('Lena Fischer', 30);
    await pastGuest('Other Person', 40);
    await message({ guestId: lena.guestId, bookingId: lena.bookingId, body: 'Your booking is confirmed.' });
    await ctx.db.query(
      `insert into review (tenant_id, property_id, booking_id, rating, body, public, guest_name) values ($1, $2, $3, 5, 'Wonderful stay', true, 'Lena F.')`,
      [ctx.tenantId, ctx.propertyId, lena.bookingId],
    );

    const out = await ctx.get(PrivacyService).export(owner, lena.guestId);
    expect(out.guest).toMatchObject({ name: 'Lena Fischer', passportLast4: '1234', notes: 'Allergic to nuts' });
    expect(out.bookings).toHaveLength(1);
    expect(out.bookings[0]).toMatchObject({ reference: lena.reference, specialRequests: 'Late arrival, around midnight' });
    expect(out.messages.map((m) => m.body)).toEqual(['Your booking is confirmed.']);
    expect(out.reviews[0]).toMatchObject({ booking: lena.reference, rating: 5, body: 'Wonderful stay' });
    expect(JSON.stringify(out)).not.toContain('Other Person');

    const audit = await ctx.db.one(`select actor, after from audit_log where action = 'guest.export' and entity_id = $1`, [lena.guestId]);
    expect(audit).toMatchObject({ actor: `user:${owner.id}`, after: null });
  });

  it('is invisible to other tenants and refused for staff', async () => {
    const g = await pastGuest('Private Guest', 20);
    const svc = ctx.get(PrivacyService);
    await expect(svc.export({ ...owner, tenantId: randomUUID() }, g.guestId)).rejects.toThrow(/Guest not found/);
    await expect(svc.export({ ...owner, role: 'staff' }, g.guestId)).rejects.toThrow(/role/);
  });
});

describe('guest data erasure', () => {
  it('anonymises the guest and removes what they wrote, keeping money records', async () => {
    const max = await pastGuest('Maximilian Weber', 60, { phone: '+4915112345678' });
    const conv = (await ctx.db.one(
      `insert into conversation (tenant_id, property_id, guest_id, contact, contact_name) values ($1, $2, $3, '+4915112345678', 'Max') returning id`,
      [ctx.tenantId, ctx.propertyId, max.guestId],
    ))!;
    await message({ conversationId: conv.id, body: 'Hi, is the pool heated?' });
    // Owner alerts are stored without links but quote the booking and the name.
    await message({ body: `Villa Lagoon: Payment slip uploaded for ${max.reference} (Maximilian Weber). Please confirm.` });
    await message({ body: 'Villa Lagoon: Airbnb calendar for Room 1 has failed 3 times.' });
    // Another guest with the same name: their alert stays.
    await message({ body: 'Villa Lagoon: Payment slip uploaded for SD-OTHER1 (Maximilian Weber). Please confirm.' });
    await ctx.db.query(
      `insert into review (tenant_id, property_id, booking_id, rating, body, public, guest_name) values ($1, $2, $3, 2, 'Too noisy at night', false, 'Maximilian W.')`,
      [ctx.tenantId, ctx.propertyId, max.bookingId],
    );
    await ctx.db.query(
      `insert into invoice (tenant_id, property_id, booking_id, kind, number, bill_to, currency, subtotal, total)
       values ($1, $2, $3, 'booking', $4, '{"name": "Maximilian Weber", "email": "max@example.com"}', 'USD', 300, 300)`,
      [ctx.tenantId, ctx.propertyId, max.bookingId, `INV-T-${randomUUID().slice(0, 6)}`],
    );
    await ctx.db.query(
      `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, status) values ($1, $2, 100, 'USD', 100, 'bank', 'confirmed')`,
      [ctx.tenantId, max.bookingId],
    );
    await ctx.db.query(
      `insert into task (tenant_id, property_id, room_id, booking_id, date, type, title) values ($1, $2, $3, $4, $5, 'prepare', 'Prepare room for Maximilian Weber')`,
      [ctx.tenantId, ctx.propertyId, ctx.roomIds[0], max.bookingId, addDays(today(), -63)],
    );
    const addOn = (await ctx.db.one(`select id from add_on where property_id = $1 limit 1`, [ctx.propertyId]))!;
    await ctx.db.query(
      `insert into add_on_order (tenant_id, booking_id, add_on_id, date, amount, currency, provider_amount, owner_amount, platform_amount, notes, rating_comment)
       values ($1, $2, $3, $4, 10, 'USD', 7, 2, 1, 'Pick Max up at Galle station', 'Great driver')`,
      [ctx.tenantId, max.bookingId, addOn.id, addDays(today(), -62)],
    );
    const reviewsBefore = await ctx.get(GuestsService).publicReviews(ctx.propertyId);
    const svc = ctx.get(PrivacyService);

    await expect(svc.erase({ ...owner, role: 'manager' }, max.guestId)).rejects.toThrow(/Only the owner/);
    const res = await svc.erase(owner, max.guestId);
    expect(res).toMatchObject({ bookings: 1, conversations: 1, propertyIds: [ctx.propertyId] });
    expect(res.messages).toBe(2);

    const g = (await ctx.db.one(`select * from guest where id = $1`, [max.guestId]))!;
    expect(g).toMatchObject({ name: DELETED_GUEST_NAME, email: null, phone: null, passport_last4: null, notes: '', country: 'DE' });
    expect(g.anonymized_at).toBeTruthy();
    expect((await ctx.db.one(`select count(*)::int as n from message where body like '%${max.reference}%' or body like '%pool heated%'`))!.n).toBe(0);
    expect((await ctx.db.one(`select count(*)::int as n from message where body like '%SD-OTHER1 (Maximilian Weber)%'`))!.n).toBe(1);
    expect((await ctx.db.one(`select count(*)::int as n from message where body like '%failed 3 times%'`))!.n).toBe(1);
    expect(await ctx.db.one(`select id from conversation where id = $1`, [conv.id])).toBeNull();
    expect(await ctx.db.one(`select body, guest_name, public from review where booking_id = $1`, [max.bookingId])).toEqual({ body: '', guest_name: 'Guest', public: false });
    // The rating still counts in the site's average.
    expect((await ctx.get(GuestsService).publicReviews(ctx.propertyId)).count).toBe(reviewsBefore.count);
    expect((await ctx.db.one(`select special_requests from booking where id = $1`, [max.bookingId]))!.special_requests).toBe('');
    expect((await ctx.db.one(`select title from task where booking_id = $1`, [max.bookingId]))!.title).toBe('Prepare room for guest');
    expect(await ctx.db.one(`select notes, rating_comment from add_on_order where booking_id = $1`, [max.bookingId])).toEqual({ notes: '', rating_comment: null });
    // Kept by law (7 years), untouched.
    expect((await ctx.db.one(`select bill_to from invoice where booking_id = $1`, [max.bookingId]))!.bill_to.name).toBe('Maximilian Weber');
    expect((await ctx.db.one(`select count(*)::int as n from payment where booking_id = $1`, [max.bookingId]))!.n).toBe(1);

    const audit = (await ctx.db.one(`select actor, after from audit_log where action = 'guest.erase' and entity_id = $1`, [max.guestId]))!;
    expect(audit.actor).toBe(`user:${owner.id}`);
    expect(JSON.stringify(audit.after)).not.toMatch(/Maximilian|example\.com|4915/);
    // The CRM list hides anonymised guests; erasing twice is harmless.
    expect((await ctx.get(GuestsService).listGuests(owner, ctx.propertyId)).some((x) => x.id === max.guestId)).toBe(false);
    expect((await svc.erase(owner, max.guestId)).bookings).toBe(0);
  });

  it('waits until an open booking is over', async () => {
    const g = await pastGuest('Arriving Soon', -10, { status: 'confirmed' });
    await expect(ctx.get(PrivacyService).erase(owner, g.guestId)).rejects.toThrow(/still open/);
  });
});

describe('retention job', () => {
  it('deletes messages after 24 months and anonymises guests 36 months after their last stay', async () => {
    const old = await pastGuest('Old Timer', 37 * 31);
    const kept = await pastGuest('Loyal Regular', 37 * 31);
    const recent = await pastGuest('Recent Visitor', 400);
    await ctx.db.query(`update guest set created_at = now() - interval '4 years' where id = any($1::uuid[])`, [[old.guestId, kept.guestId, recent.guestId]]);
    await ctx.get(PrivacyService).setKeepProfile(owner, kept.guestId, true);
    await message({ guestId: recent.guestId, body: 'Twenty-five months old', createdAt: new Date(Date.now() - 25 * 30.5 * 86_400_000).toISOString() });
    await message({ guestId: recent.guestId, body: 'Twenty-three months old', createdAt: new Date(Date.now() - 23 * 30.5 * 86_400_000).toISOString() });

    const r = await ctx.get(PrivacyService).retention();
    expect(r.guests).toBe(1);
    expect(r.messages).toBe(1);
    const names = await ctx.db.query(`select id, name, anonymized_at from guest where id = any($1::uuid[])`, [[old.guestId, kept.guestId, recent.guestId]]);
    const byId = new Map(names.map((n) => [n.id, n]));
    expect(byId.get(old.guestId)).toMatchObject({ name: DELETED_GUEST_NAME });
    expect(byId.get(kept.guestId)).toMatchObject({ name: 'Loyal Regular', anonymized_at: null });
    expect(byId.get(recent.guestId)).toMatchObject({ name: 'Recent Visitor', anonymized_at: null });
    const left = await ctx.db.query(`select body from message where guest_id = $1`, [recent.guestId]);
    expect(left.map((m) => m.body)).toEqual(['Twenty-three months old']);
    const audit = await ctx.db.one(`select actor from audit_log where action = 'guest.erase' and entity_id = $1`, [old.guestId]);
    expect(audit?.actor).toBe('system:retention');
    expect(await ctx.get(PrivacyService).retention()).toEqual({ messages: 0, conversations: 0, guests: 0 });
  });
});

describe('ops digest', () => {
  function digest(opsEmail: string, email: EmailChannel) {
    return new OpsDigestService(ctx.db, ctx.get(AdminService), email, { ...ctx.app.get<AppConfig>(CONFIG), OPS_EMAIL: opsEmail });
  }

  it('emails the founder what needs attention', async () => {
    await ctx.db.query(
      `insert into ical_source (tenant_id, room_id, url, channel, consecutive_failures, last_error) values ($1, $2, 'https://example.com/a.ics', 'airbnb', 4, 'HTTP 500')`,
      [ctx.tenantId, ctx.roomIds[1]],
    );
    recordJobFailure('ical-sync', new Error('connection reset'));
    const email = ctx.get(EmailChannel);
    const send = vi.spyOn(email, 'send');
    const r = await digest('ops@example.com', email).send({ messages: 3, conversations: 0, guests: 1 });
    expect(r.sent).toBe(true);
    expect(r.attention).toBeGreaterThanOrEqual(2);
    expect(r.subject).toMatch(/need.* attention/);
    expect(r.text).toContain('airbnb: 4 failed in a row (HTTP 500)');
    expect(r.text).toContain('ical-sync: 1× (connection reset)');
    expect(r.text).toContain('Privacy retention: 3 message(s) deleted, 1 guest(s) anonymised');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ops@example.com', subject: r.subject }));
    send.mockRestore();
  });

  it('sends nothing without OPS_EMAIL', async () => {
    const email = ctx.get(EmailChannel);
    const send = vi.spyOn(email, 'send');
    const r = await digest('', email).send(null);
    expect(r.sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
    send.mockRestore();
  });
});

describe('health check', () => {
  const res = () => ({ status: vi.fn() });
  const controller = (db: unknown) => new WebhooksController(null as never, null as never, null as never, ctx.app.get(CONFIG), db as never);

  it('answers ok when the database does', async () => {
    const r = res();
    expect(await controller(ctx.db).health(r as never)).toEqual({ ok: true, db: 'ok' });
    expect(r.status).not.toHaveBeenCalled();
  });

  it('returns 503 when the database does not', async () => {
    const r = res();
    expect(await controller({ query: () => Promise.reject(new Error('down')) }).health(r as never)).toEqual({ ok: false, db: 'down' });
    expect(r.status).toHaveBeenCalledWith(503);
  });
});

describe('restore drill checks', () => {
  it('passes for an identical database and names what a bad restore lost', async () => {
    const source = inject('databaseUrl');
    expect((await compare(source, source)).every((c) => c.ok)).toBe(true);

    const name = `drill_${randomUUID().slice(0, 8)}`;
    await ctx.db.query(`create database ${name}`);
    try {
      const target = source.replace(/\/[^/]+$/, `/${name}`);
      await migrate(target, () => {});
      const pg = (await import('pg')).default;
      const c = new pg.Client({ connectionString: target });
      await c.connect();
      await c.query('drop trigger trg_payment_append_only on payment');
      await c.end();

      const checks = Object.fromEntries((await compare(source, target)).map((c) => [c.name, c]));
      expect(checks['latest migration']!.ok).toBe(true);
      expect(checks['tables']!.ok).toBe(true);
      expect(checks['row counts (exact)']!).toMatchObject({ ok: false });
      expect(checks['row counts (exact)']!.detail).toMatch(/booking \d+ → 0/);
      expect(checks['append-only money triggers']!).toMatchObject({ ok: false, detail: 'missing: trg_payment_append_only' });
      expect(checks['row-level security']!.ok).toBe(true);
    } finally {
      await ctx.db.query(`drop database ${name} with (force)`);
    }
  });
});
