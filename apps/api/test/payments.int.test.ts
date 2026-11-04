import { UnauthorizedException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { md5Upper } from '../src/common/crypto.js';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { IcalService } from '../src/modules/ical/ical.service.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

const MERCHANT_ID = '1211149';
const SECRET = 'demo-sandbox-secret-change-me'; // matches scripts/seed.ts

let ctx: TestCtx;
let bookings: BookingsService;
let payments: PaymentsService;

beforeAll(async () => {
  ctx = await setupApp();
  bookings = ctx.get(BookingsService);
  payments = ctx.get(PaymentsService);
});
afterAll(() => ctx.close());

function notify(orderId: string, amount: string, paymentId: string, status = '2', secret = SECRET) {
  const n = {
    merchant_id: MERCHANT_ID,
    order_id: orderId,
    payment_id: paymentId,
    payhere_amount: amount,
    payhere_currency: 'USD',
    status_code: status,
    md5sig: '',
  };
  n.md5sig = md5Upper(MERCHANT_ID + orderId + amount + 'USD' + status + md5Upper(secret));
  return n;
}

async function usePayhereUsd() {
  // The seed connects PayHere in LKR; charge in USD here so amounts match the booking exactly.
  const { encryptJson } = await import('../src/common/crypto.js');
  await ctx.db.query(`update property set gateway_config = $2 where id = $1`, [
    ctx.propertyId,
    encryptJson({ payhere: { merchantId: MERCHANT_ID, merchantSecret: SECRET, currency: 'USD' }, bank: { accountName: 'A. Owner', bankName: 'BOC', accountNumber: '123456', branch: '', swift: '', notes: '' } }, ''),
  ]);
}

describe('PayHere deposit → confirmed booking → iCal export', () => {
  it('a valid notify confirms the booking, reserves the nights and appears in the room feed', async () => {
    await usePayhereUsd();
    const room = ctx.roomIds[1]!;
    const { from, to } = futureStay(130);
    const created = await bookings.create(bookingInput(room, from, to));

    const start = await payments.start(created.reference, created.token, 'payhere');
    expect(start.method).toBe('payhere');
    if (start.method !== 'payhere') return;
    expect(start.fields.hash).toBe(md5Upper(MERCHANT_ID + created.reference + start.fields.amount + 'USD' + md5Upper(SECRET)));
    expect(start.fields.notify_url).toBe(`http://api.test/webhooks/payhere/${ctx.propertyId}`);

    const result = await payments.payhereNotify(ctx.propertyId, notify(created.reference, start.fields.amount!, 'PH-1001'));
    expect(result).toBe('confirmed');

    const pub = await bookings.getPublic(created.reference, created.token);
    expect(pub.status).toBe('confirmed');
    expect(pub.paid).toBe(Number(start.fields.amount));
    const nights = await ctx.db.query(`select status from night_inventory where booking_id = (select id from booking where reference = $1)`, [created.reference]);
    expect(nights.map((n) => n.status)).toEqual(['reserved', 'reserved', 'reserved']);

    const token = (await ctx.db.one(`select ical_export_token from room where id = $1`, [room]))!.ical_export_token;
    const feed = await ctx.get(IcalService).exportFeed(token);
    expect(feed).toContain(`DTSTART;VALUE=DATE:${from.replace(/-/g, '')}`);
    expect(feed).toContain(`DTEND;VALUE=DATE:${to.replace(/-/g, '')}`);
  });

  it('webhooks are idempotent on the PayHere payment_id', async () => {
    const { from, to } = futureStay(150);
    const created = await bookings.create(bookingInput(ctx.roomIds[2]!, from, to));
    const start = await payments.start(created.reference, created.token, 'payhere');
    if (start.method !== 'payhere') throw new Error('expected payhere');
    const n = notify(created.reference, start.fields.amount!, 'PH-2002');
    expect(await payments.payhereNotify(ctx.propertyId, n)).toBe('confirmed');
    expect(await payments.payhereNotify(ctx.propertyId, n)).toBe('duplicate');
    const rows = await ctx.db.query(`select 1 from payment where gateway_ref = 'PH-2002'`);
    expect(rows).toHaveLength(1);
  });

  it('a forged signature is rejected and changes nothing', async () => {
    const { from, to } = futureStay(160);
    const created = await bookings.create(bookingInput(ctx.roomIds[3]!, from, to));
    await expect(payments.payhereNotify(ctx.propertyId, notify(created.reference, '1.00', 'PH-3003', '2', 'wrong-secret'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const b = await ctx.db.one(`select status from booking where reference = $1`, [created.reference]);
    expect(b!.status).toBe('pending');
  });

  it('a payment after the hold expired and the nights were resold is flagged for refund', async () => {
    const room = ctx.roomIds[4]!;
    const { from, to } = futureStay(190);
    const first = await bookings.create(bookingInput(room, from, to));
    const start = await payments.start(first.reference, first.token, 'payhere');
    if (start.method !== 'payhere') throw new Error('expected payhere');
    await ctx.db.query(`update hold set expires_at = now() - interval '1 second' where booking_id = (select id from booking where reference = $1)`, [first.reference]);
    await bookings.create(bookingInput(room, from, to)); // someone else takes the nights

    expect(await payments.payhereNotify(ctx.propertyId, notify(first.reference, start.fields.amount!, 'PH-4004'))).toBe('needs_refund');
    const b = await ctx.db.one(`select status, needs_refund from booking where reference = $1`, [first.reference]);
    expect(b).toMatchObject({ status: 'abandoned', needs_refund: true });
  });

  it('bank transfer: hold extended, manager records payment, refund is a negative row', async () => {
    const { from, to } = futureStay(210);
    const created = await bookings.create(bookingInput(ctx.roomIds[5]!, from, to));
    const bank = await payments.start(created.reference, created.token, 'bank');
    expect(bank.method).toBe('bank');
    if (bank.method !== 'bank') return;
    expect(new Date(bank.holdExpiresAt).getTime()).toBeGreaterThan(Date.now() + 23 * 3_600_000);

    const owner = { id: 'x', tenantId: ctx.tenantId, phone: '+94770000000', name: 'Owner', role: 'owner' as const };
    const userRow = await ctx.db.one(`select id from app_user where tenant_id = $1`, [ctx.tenantId]);
    owner.id = userRow!.id;
    const b = await ctx.db.one(`select id, deposit_due from booking where reference = $1`, [created.reference]);
    const rec = await payments.recordManual(owner, b!.id, { method: 'bank', amount: b!.deposit_due, reference: 'BOC-778' });
    expect(rec.result).toBe('confirmed');

    const refund = await payments.refund(owner, b!.id, { amount: 10, reason: 'goodwill' });
    expect(refund.status).toBe('pending');
    const rows = await ctx.db.query(`select amount, kind, status from payment where booking_id = $1 order by created_at`, [b!.id]);
    expect(rows.at(-1)).toMatchObject({ amount: -10, kind: 'refund', status: 'pending' });
    await expect(payments.refund(owner, b!.id, { amount: b!.deposit_due, reason: 'too much' })).rejects.toThrow(/refundable/);
  });
});
