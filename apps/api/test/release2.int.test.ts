import { addDays, todayIn, type SessionUser } from '@staydirect/shared';
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONFIG, type AppConfig } from '../src/config.js';
import { AddOnsService } from '../src/modules/addons/addons.service.js';
import { AvailabilityService } from '../src/modules/availability/availability.service.js';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { ConciergeService, type LlmClient } from '../src/modules/concierge/concierge.service.js';
import { FlagsService } from '../src/modules/flags/flags.service.js';
import { GuestsService } from '../src/modules/guests/guests.service.js';
import { InboxService } from '../src/modules/inbox/inbox.service.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
import { OpsService } from '../src/modules/ops/ops.service.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { CatalogService } from '../src/modules/properties/catalog.service.js';
import { SequencesService } from '../src/modules/sequences/sequences.service.js';
import { bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

process.env.WHATSAPP_APP_SECRET = 'test-app-secret';

let ctx: TestCtx;
let owner: SessionUser;
const today = () => todayIn('Asia/Colombo');
/** A Date at the given Colombo local time today (UTC+05:30). */
const colomboAt = (hh: number, mm = 0) => new Date(Date.parse(`${today()}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+05:30`));

function waPayload(from: string, id: string, text: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: 'platform-number' },
              contacts: [{ wa_id: from.replace('+', ''), profile: { name: 'Anna' } }],
              messages: [{ id, from: from.replace('+', ''), timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }],
            },
          },
        ],
      },
    ],
  };
}

beforeAll(async () => {
  ctx = await setupApp();
  const u = (await ctx.db.one(`select * from app_user where tenant_id = $1`, [ctx.tenantId]))!;
  owner = { id: u.id, tenantId: ctx.tenantId, phone: u.phone, name: u.name, role: 'owner' };
});
afterAll(() => ctx.close());

describe('WhatsApp inbox', () => {
  it('verifies the Meta signature over the raw body', () => {
    const inbox = ctx.get(InboxService);
    const raw = Buffer.from('{"x":1}');
    const sig = `sha256=${createHmac('sha256', 'test-app-secret').update(raw).digest('hex')}`;
    expect(() => inbox.verifySignature(raw, sig)).not.toThrow();
    expect(() => inbox.verifySignature(raw, 'sha256=deadbeef')).toThrow();
    expect(() => inbox.verifySignature(raw, undefined)).toThrow();
  });

  it('stores inbound messages once, routed to the sender’s property', async () => {
    const inbox = ctx.get(InboxService);
    const payload = waPayload('+491701234567', 'wamid.TEST1', 'Hallo! Gibt es Frühstück?');
    expect(await inbox.handleWebhook(payload)).toEqual({ stored: 1, duplicates: 0 });
    expect(await inbox.handleWebhook(payload)).toEqual({ stored: 0, duplicates: 1 });
    const conv = await ctx.db.one(`select * from conversation where contact = '+491701234567'`);
    expect(conv).toMatchObject({ property_id: ctx.propertyId, unread_count: 1, language: 'de' });
    expect(conv!.guest_id).toBeTruthy();
  });

  it('refuses free text outside the 24-hour window', async () => {
    const inbox = ctx.get(InboxService);
    const conv = (await ctx.db.one(`select id from conversation where contact = '+491701234567'`))!;
    await ctx.db.query(`update conversation set last_inbound_at = now() - interval '25 hours' where id = $1`, [conv.id]);
    await expect(inbox.ownerSend(owner, conv.id, 'Hello')).rejects.toThrow(/24-hour/);
    await ctx.db.query(`update conversation set last_inbound_at = now() where id = $1`, [conv.id]);
    const sent = await inbox.ownerSend(owner, conv.id, 'Ja, von 7:30 bis 10 Uhr!');
    expect(sent).toMatchObject({ direction: 'out', sentBy: `user:${owner.id}` });
  });
});

describe('AI concierge (stubbed model)', () => {
  type Call = Parameters<LlmClient['create']>[0];
  function concierge(script: (call: Call, n: number) => any, calls: Call[]) {
    const llm: LlmClient = {
      create: async (params) => {
        calls.push(structuredClone(params));
        const content = script(params, calls.length);
        return {
          id: `msg_${calls.length}`,
          type: 'message',
          role: 'assistant',
          model: 'claude-opus-5-5',
          content,
          stop_reason: content.some((b: any) => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 1200, output_tokens: 80, cache_creation_input_tokens: 0, cache_read_input_tokens: 3000 },
        } as any;
      },
    };
    return new ConciergeService(
      ctx.db,
      ctx.get(InboxService),
      ctx.get(CatalogService),
      ctx.get(AvailabilityService),
      ctx.get(NotificationsService),
      ctx.app.get<AppConfig>(CONFIG),
      llm,
      ctx.get(FlagsService),
    );
  }

  async function guestSays(contact: string, id: string, text: string) {
    await ctx.get(InboxService).storeInbound({ waMessageId: id, from: contact, name: 'Guest', body: text, timestamp: new Date(), toPhoneNumberId: 'villa-number' });
    return (await ctx.db.one(`select id from conversation where contact = $1`, [contact]))!.id as string;
  }

  beforeAll(async () => {
    // The villa's own WhatsApp number: messages from people without a booking still reach it.
    await ctx.db.query(`update property set concierge_enabled = true, whatsapp_phone_number_id = 'villa-number' where id = $1`, [ctx.propertyId]);
    await ctx.db.query(`delete from ai_usage where property_id = $1`, [ctx.propertyId]);
  });

  it('checks availability through a tool, then replies; requests use fallbacks, strict tools and a cached system prompt', async () => {
    const { from, to } = futureStay(60);
    const calls: Call[] = [];
    const svc = concierge((_c, n) =>
      n === 1
        ? [{ type: 'tool_use', id: 'tu_1', name: 'check_availability', input: { check_in: from, check_out: to, guests: 2 } }]
        : [{ type: 'text', text: 'Yes! The Garden Double is free for those dates.' }],
    calls);
    const convId = await guestSays('+447700900001', 'wamid.C1', `Do you have a room ${from} to ${to} for 2?`);
    expect(await svc.handle(convId)).toBe('replied');

    expect(calls).toHaveLength(2);
    const first = calls[0]!;
    expect(first.model).toBe('claude-opus-5-5');
    expect(first.fallbacks).toBe('default');
    expect(first.betas).toContain('server-side-fallback-2026-07-01');
    expect(first.output_config).toEqual({ effort: 'low' });
    expect((first.tools as any[]).every((t) => t.strict === true)).toBe(true);
    expect((first.tools as any[]).map((t) => t.name).sort()).toEqual(['check_availability', 'escalate', 'quote', 'send_booking_link']);
    expect((first.system as any[])[0].cache_control).toEqual({ type: 'ephemeral' });
    expect((first.system as any[])[0].text).toContain('Airport transfer'); // knowledge base is in the prompt

    const toolResult = (calls[1]!.messages.at(-1)!.content as any[])[0];
    expect(toolResult).toMatchObject({ type: 'tool_result', tool_use_id: 'tu_1' });
    expect(toolResult.content).toMatch(/AVAILABLE/);

    const reply = await ctx.db.one(`select * from message where conversation_id = $1 and direction = 'out' order by created_at desc limit 1`, [convId]);
    expect(reply).toMatchObject({ ai_generated: true, sent_by: 'ai', body: 'Yes! The Garden Double is free for those dates.' });
    const usage = await ctx.db.one(`select requests, cost_usd from ai_usage where property_id = $1`, [ctx.propertyId]);
    expect(usage!.requests).toBe(2);
  });

  it('a booking link never creates a booking', async () => {
    const { from, to } = futureStay(62);
    const before = (await ctx.db.one(`select count(*)::int as n from booking`))!.n;
    const calls: Call[] = [];
    const svc = concierge((_c, n) =>
      n === 1
        ? [{ type: 'tool_use', id: 'tu_2', name: 'send_booking_link', input: { room_id: ctx.roomIds[1], check_in: from, check_out: to, guests: 2 } }]
        : [{ type: 'text', text: 'Here is your link.' }],
    calls);
    const convId = await guestSays('+447700900002', 'wamid.C2', 'Book it please');
    await svc.handle(convId);
    const toolResult = (calls[1]!.messages.at(-1)!.content as any[])[0];
    expect(toolResult.content).toContain(`/book?room=${ctx.roomIds[1]}&from=${from}&to=${to}&guests=2`);
    expect((await ctx.db.one(`select count(*)::int as n from booking`))!.n).toBe(before);
  });

  it('escalates to the host and stops answering', async () => {
    const calls: Call[] = [];
    const svc = concierge((_c, n) =>
      n === 1
        ? [{ type: 'tool_use', id: 'tu_3', name: 'escalate', input: { summary: 'Guest wants a refund for a cancelled tour.', urgent: false } }]
        : [{ type: 'text', text: 'I have passed this to Nimali, she will reply shortly.' }],
    calls);
    const convId = await guestSays('+447700900003', 'wamid.C3', 'I want my money back');
    expect(await svc.handle(convId)).toBe('escalated');
    const conv = await ctx.db.one(`select status, ai_paused, escalation_summary from conversation where id = $1`, [convId]);
    expect(conv).toMatchObject({ status: 'needs_human', ai_paused: true, escalation_summary: 'Guest wants a refund for a cancelled tour.' });
    // Next guest message: the concierge stays out of it.
    await guestSays('+447700900003', 'wamid.C3b', 'Hello?');
    expect(await svc.handle(convId)).toBe('skipped');
    expect(calls).toHaveLength(2);
  });

  it('hands over without calling the model once the monthly budget is spent', async () => {
    await ctx.db.query(`update ai_usage set cost_usd = 5 where property_id = $1`, [ctx.propertyId]);
    const calls: Call[] = [];
    const svc = concierge(() => [{ type: 'text', text: 'never' }], calls);
    const convId = await guestSays('+447700900004', 'wamid.C4', 'Hi');
    expect(await svc.handle(convId)).toBe('escalated');
    expect(calls).toHaveLength(0);
    await ctx.db.query(`delete from ai_usage where property_id = $1`, [ctx.propertyId]);
  });
});

describe('discount codes', () => {
  it('applies a valid code to the quote and counts the use when the booking is confirmed', async () => {
    const bookings = ctx.get(BookingsService);
    const { from, to } = futureStay(90);
    await expect(bookings.create(bookingInput(ctx.roomIds[1]!, from, to, { discountCode: 'NOPE' }))).rejects.toMatchObject({ status: 422 });
    const created = await bookings.create(bookingInput(ctx.roomIds[1]!, from, to, { discountCode: 'welcome10' }));
    const b = (await ctx.db.one(`select id, total, promo_discount, deposit_due, quote_snapshot from booking where reference = $1`, [created.reference]))!;
    expect(b.promo_discount).toBeGreaterThan(0);
    expect(b.quote_snapshot.promoDiscount).toBe(b.promo_discount);
    await ctx.get(PaymentsService).recordManual(owner, b.id, { method: 'cash', amount: b.deposit_due, reference: '' });
    expect((await ctx.db.one(`select uses from discount_code where code = 'WELCOME10'`))!.uses).toBe(1);
  });
});

describe('add-on marketplace', () => {
  it('orders an add-on: commission split, booking balance, provider job card; cancelling reverses the balance', async () => {
    const addOns = ctx.get(AddOnsService);
    const b = (await ctx.db.one(`select * from booking where reference = 'SD-DEMO1'`))!;
    const surf = (await ctx.db.one(`select id from add_on where property_id = $1 and category = 'surf_lesson'`, [ctx.propertyId]))!;
    await expect(addOns.guestOrder('SD-DEMO1', { token: b.access_token, addOnId: surf.id, date: addDays(b.to_date, 5), time: null, qty: 1, notes: '' })).rejects.toThrow(
      /during your stay/,
    );
    const order = await addOns.guestOrder('SD-DEMO1', { token: b.access_token, addOnId: surf.id, date: addDays(today(), 1), time: '07:00', qty: 2, notes: '' });
    expect(order.amount).toBe(50);
    expect(order.platformAmount).toBe(5); // 10%
    expect(order.ownerAmount).toBe(6.25); // 12.5%
    expect(order.providerAmount + order.ownerAmount + order.platformAmount).toBeCloseTo(50, 2);
    const after = (await ctx.db.one(`select total, add_ons_amount, provider_token from booking b join add_on_order o on o.booking_id = b.id where o.id = $1`, [order.id]))!;
    expect(after.total).toBe(b.total + 50);
    const notified = await ctx.db.one(`select provider_notified_at from add_on_order where id = $1`, [order.id]);
    expect(notified!.provider_notified_at).toBeTruthy();

    // Provider confirms from the WhatsApp job card; then the owner cancels.
    const card = (await addOns.jobAction(after.provider_token, 'confirm')) as { status: string; guestPhone: string | null };
    expect(card.status).toBe('confirmed');
    expect(card.guestPhone).toBeTruthy();
    await addOns.setOrderStatus(owner, order.id, 'cancelled');
    expect((await ctx.db.one(`select total from booking where id = $1`, [b.id]))!.total).toBe(b.total);
  });
});

describe('reviews and repeat guests', () => {
  it('routes low ratings privately and invites high ratings to Google', async () => {
    const guests = ctx.get(GuestsService);
    const b2 = (await ctx.db.one(`update booking set status = 'checked_out' where reference = 'SD-DEMO2' returning access_token`))!;
    const low = await guests.submitReview('SD-DEMO2', { token: b2.access_token, rating: 2, body: 'Hot water was cold.' });
    expect(low).toEqual({ public: false, googleReviewUrl: null });
    await expect(guests.submitReview('SD-DEMO2', { token: b2.access_token, rating: 5, body: '' })).rejects.toThrow(/already/);

    const b3 = (await ctx.db.one(`update booking set status = 'checked_out' where reference = 'SD-DEMO3' returning access_token`))!;
    const high = await guests.submitReview('SD-DEMO3', { token: b3.access_token, rating: 5, body: 'Paradise.' });
    expect(high.public).toBe(true);
    expect(high.googleReviewUrl).toContain('g.page');
    const pub = await guests.publicReviews(ctx.propertyId);
    expect(pub.count).toBe(1);
    expect(pub.reviews[0]!.guestName).toBe('Claire D.');
  });

  it('issues one "book direct next time" code about 11 months after a stay', async () => {
    const g = (await ctx.db.one(
      `insert into guest (tenant_id, name, email, phone, country, language) values ($1, 'Old Friend', 'old@example.com', '+447700900099', 'GB', 'en') returning id`,
      [ctx.tenantId],
    ))!;
    await ctx.db.query(
      `insert into booking (tenant_id, property_id, room_id, guest_id, reference, from_date, to_date, guests, status, currency, total)
       values ($1, $2, $3, $4, 'SD-OLD001', $5, $6, 2, 'checked_out', 'USD', 300)`,
      [ctx.tenantId, ctx.propertyId, ctx.roomIds[0], g.id, addDays(today(), -344), addDays(today(), -340)],
    );
    const seq = ctx.get(SequencesService);
    expect(await seq.repeatGuestCodes()).toBe(1);
    expect(await seq.repeatGuestCodes()).toBe(0);
    const code = await ctx.db.one(`select code, pct, reason from discount_code where guest_id = $1`, [g.id]);
    expect(code).toMatchObject({ pct: 10, reason: 'repeat_guest' });
    expect(code!.code).toMatch(/^BACK10-[A-Z2-9]{4}$/);
  });
});

describe('sequences and the daily board', () => {
  it('sends nothing before 08:00 local, each step once afterwards', async () => {
    const seq = ctx.get(SequencesService);
    expect(await seq.run(colomboAt(6, 30))).toBe(0);
    const sent = await seq.run(colomboAt(12, 30));
    expect(sent).toBeGreaterThan(0);
    const arrival = await ctx.db.one(
      `select s.channel from sequence_send s join booking b on b.id = s.booking_id where b.reference = 'SD-DEMO1' and s.trigger = 'arrival'`,
    );
    expect(arrival!.channel).toBe('whatsapp');
    expect(await seq.run(colomboAt(12, 45))).toBe(0);
  });

  it('builds the board once per day with prepare tasks for arrivals', async () => {
    const ops = ctx.get(OpsService);
    const p = (await ctx.db.one(`select * from property where id = $1`, [ctx.propertyId]))!;
    expect(await ops.buildBoard(p, today())).toBe(true);
    expect(await ops.buildBoard(p, today())).toBe(false);
    const prepare = await ctx.db.query(`select title from task where property_id = $1 and date = $2 and source = 'daily_board' and type = 'prepare'`, [ctx.propertyId, today()]);
    expect(prepare.map((t) => t.title).join()).toMatch(/Ocean Suite/);

    // The cleaner's no-login link shows today's list and can tick a task off.
    const kamala = (await ctx.db.one(`select access_token from staff where name = 'Kamala'`))!;
    const list = await ops.staffTasks(kamala.access_token);
    expect(list.tasks.length).toBeGreaterThan(0);
    const done = await ops.staffUpdateTask(kamala.access_token, list.tasks[0]!.id, { status: 'done' });
    expect(done.status).toBe('done');
    expect(done.completedAt).toBeTruthy();
  });
});
