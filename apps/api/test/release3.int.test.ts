import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { addDays, flatPlanFee, nightsBetween, todayIn, type SessionUser } from '@staydirect/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../scripts/seed.js';
import { TokenService } from '../src/common/auth.js';
import { runWithProperties } from '../src/common/request-context.js';
import { AddOnsService } from '../src/modules/addons/addons.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { BillingService } from '../src/modules/billing/billing.service.js';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { BrandingService } from '../src/modules/branding/branding.service.js';
import { ChannelsService } from '../src/modules/channels/channels.service.js';
import { FlagsService } from '../src/modules/flags/flags.service.js';
import { InvoicesService } from '../src/modules/invoices/invoices.service.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { PortfolioService } from '../src/modules/dashboard/portfolio.service.js';
import { PropertiesService } from '../src/modules/properties/properties.service.js';
import { StatementsService } from '../src/modules/statements/statements.service.js';
import { TeamService } from '../src/modules/team/team.service.js';
import { AdminService } from '../src/modules/admin/admin.service.js';
import { bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

process.env.OTP_DEV_CODE = '123456';

let ctx: TestCtx;
let villaOwner: SessionUser;
let mgrOwner: SessionUser;
let managerTenantId: string;
let managerPropertyIds: string[];
const period = () => todayIn('Asia/Colombo').slice(0, 7);

async function sessionFor(phone: string): Promise<SessionUser> {
  const u = (await ctx.db.one(`select * from app_user where phone = $1`, [phone]))!;
  return { id: u.id, tenantId: u.tenant_id, phone: u.phone, name: u.name, role: u.role };
}

beforeAll(async () => {
  ctx = await setupApp();
  // setupApp seeds; read the Release 3 parts of the seed back.
  const mgr = (await ctx.db.one(`select tenant_id from app_user where phone = '+94770000001'`))!;
  managerTenantId = mgr.tenant_id;
  managerPropertyIds = (await ctx.db.query(`select id from property where tenant_id = $1 order by name`, [managerTenantId])).map((p) => p.id);
  villaOwner = await sessionFor('+94770000000');
  mgrOwner = await sessionFor('+94770000001');
  void seed;
});
afterAll(() => ctx.close());

describe('team and property-scoped access', () => {
  it('a manager limited to one property cannot see or reach the other (RLS property_scope)', async () => {
    const properties = ctx.get(PropertiesService);
    const chaminda = await sessionFor('+94770000002');
    const allowed = (await ctx.db.query(`select property_id from user_property where user_id = $1`, [chaminda.id])).map((r) => r.property_id);
    const visible = await runWithProperties(allowed, () => properties.list(chaminda));
    expect(visible.map((p) => p.name)).toEqual(['Weligama Surf Lodge']);
    const tangalle = managerPropertyIds.find((id) => !allowed.includes(id))!;
    await expect(runWithProperties(allowed, () => properties.get(chaminda, tangalle))).rejects.toBeInstanceOf(NotFoundException);
    const portfolio = await runWithProperties(allowed, () => ctx.get(PortfolioService).portfolio(chaminda));
    expect(portfolio).toHaveLength(1);
    // The company owner sees both.
    expect((await properties.list(mgrOwner)).length).toBe(2);
  });

  it('an invite link lets a new phone join the team with the listed properties only', async () => {
    const team = ctx.get(TeamService);
    const inv = await team.invite(mgrOwner, { name: 'Nuwan', phone: '+94770000055', role: 'staff', propertyIds: [managerPropertyIds[0]!] });
    const token = new URL(inv.url).searchParams.get('invite')!;
    await expect(ctx.get(AuthService).verifyOtp('+94770000056', '123456', undefined, token)).rejects.toThrow(/different phone/);
    const res = await ctx.get(AuthService).verifyOtp('+94770000055', '123456', undefined, token);
    expect(res.user).toMatchObject({ tenantId: managerTenantId, role: 'staff' });
    const access = await ctx.db.query(`select property_id from user_property where user_id = $1`, [res.user.id]);
    expect(access.map((a) => a.property_id)).toEqual([managerPropertyIds[0]]);
    await expect(ctx.get(AuthService).verifyOtp('+94770000057', '123456', undefined, token)).rejects.toThrow(/expired|used/);
  });
});

describe('feature flags by plan', () => {
  it('plans gate features; an admin override wins', async () => {
    const flags = ctx.get(FlagsService);
    expect(await flags.enabled(managerTenantId, 'owner_statements')).toBe(true);
    expect(await flags.enabled(villaOwner.tenantId, 'owner_statements')).toBe(false);
    expect(await flags.enabled(villaOwner.tenantId, 'ota_direct_api')).toBe(true); // seeded override
    // Villa Lagoon (Pro) cannot add a second property…
    await expect(ctx.get(PropertiesService).create(villaOwner, { name: 'Second', slug: 'villa-two' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    // …until StayDirect switches multi-property on for them.
    await ctx.get(AdminService).setOverride(villaOwner.tenantId, 'multi_property', true, 'test');
    expect(await flags.enabled(villaOwner.tenantId, 'multi_property')).toBe(true);
    await ctx.get(AdminService).setOverride(villaOwner.tenantId, 'multi_property', null, 'test');
    expect(await flags.enabled(villaOwner.tenantId, 'multi_property')).toBe(false);
  });
});

describe('OTA connectivity adapter (simulated partner)', () => {
  it('queues inventory changes by trigger and pushes availability to the partner', async () => {
    const channels = ctx.get(ChannelsService);
    expect(await channels.pushProperty(ctx.propertyId)).toBeGreaterThan(300); // first push: full calendar
    const { from, to } = futureStay(30, 2);
    const room = ctx.roomIds[1]!;
    await ctx.get(BookingsService).create(bookingInput(room, from, to));
    const queued = await ctx.db.query(`select date from channel_ari_queue where room_id = $1 order by date`, [room]);
    expect(queued.map((q) => q.date)).toEqual(nightsBetween(from, to));
    expect(await channels.pushProperty(ctx.propertyId)).toBe(2);
    const sim = await channels.simulatorState(villaOwner, ctx.propertyId, from, to);
    expect(sim.filter((s) => s.room_code.startsWith('R2-')).map((s) => s.availability)).toEqual([0, 0]);
  });

  it('imports an OTA booking with guest details, refuses closed dates, records a conflict on a race, and handles cancellation', async () => {
    const channels = ctx.get(ChannelsService);
    const room = ctx.roomIds[2]!;
    const { from, to } = futureStay(45, 3);
    const rev = await channels.simulateReservation(villaOwner, ctx.propertyId, {
      roomId: room, from, to, channel: 'booking_com', guestName: 'Lena Fischer', guestEmail: 'lena@example.de', guests: 2, total: 210, currency: 'USD',
    });
    const b = (await ctx.db.one(`select * from booking where external_uid = $1`, [rev.reservationId]))!;
    expect(b).toMatchObject({ source: 'booking_com', status: 'confirmed', total: 210 });
    const nights = await ctx.db.query(`select status from night_inventory where booking_id = $1`, [b.id]);
    expect(nights.map((n) => n.status)).toEqual(['reserved', 'reserved', 'reserved']);

    // Pushed back out, so the OTA now shows those dates closed and refuses another guest.
    await channels.pushProperty(ctx.propertyId);
    await expect(
      channels.simulateReservation(villaOwner, ctx.propertyId, { roomId: room, from, to, channel: 'airbnb', guestName: 'X', guests: 1, total: 1, currency: 'USD' }),
    ).rejects.toThrow(/Not available/);

    // A race (OTA booked before our push landed): the booking is imported and the overlap becomes a conflict.
    const raced = await channels.simulateReservation(
      villaOwner,
      ctx.propertyId,
      { roomId: room, from: addDays(from, 2), to: addDays(from, 4), channel: 'airbnb', guestName: 'Race Guest', guests: 1, total: 90, currency: 'USD' },
      { simulateLag: true },
    );
    const conflict = await ctx.db.one(`select * from sync_conflict where external_uid = $1`, [raced.reservationId]);
    expect(conflict).toMatchObject({ date: addDays(from, 2), booking_id: b.id });

    // The guest cancels on Booking.com: booking cancelled, nights released.
    await channels.simulated.cancelReservation('SD-villa-lagoon', rev);
    await channels.pullProperty(ctx.propertyId);
    expect((await ctx.db.one(`select status from booking where id = $1`, [b.id]))!.status).toBe('cancelled');
    expect(await ctx.db.query(`select 1 from night_inventory where booking_id = $1 and status = 'reserved'`, [b.id])).toHaveLength(0);
    // Revisions are applied once even if the partner re-sends them.
    expect((await channels.applyRevision(await ctx.db.one(`select * from channel_connection where property_id = $1`, [ctx.propertyId]) as any, rev)).applied).toBe(false);
  });
});

describe('long stays and invoices', () => {
  it('prices 30 nights from the monthly plan, bills metered utilities, numbers invoices and keeps them append-only', async () => {
    const { from } = futureStay(120);
    const to = addDays(from, 30);
    const created = await ctx.get(BookingsService).create(bookingInput(ctx.roomIds[4]!, from, to, { guests: 1 })); // Surfer Bunk includes 1 guest
    const b = (await ctx.db.one(`select * from booking where reference = $1`, [created.reference]))!;
    expect(b.quote_snapshot.monthly).toMatchObject({ name: 'Nomad month', utilities: 'metered' });
    expect(b.base_amount).toBe(1500);
    await ctx.get(PaymentsService).recordManual(villaOwner, b.id, { method: 'bank', amount: b.deposit_due, reference: 'DNV' });

    const invoices = ctx.get(InvoicesService);
    const reading = await invoices.addReading(villaOwner, b.id, { meter: 'electricity', periodStart: from, periodEnd: addDays(from, 29), startReading: 1200, endReading: 1385, unitRate: 0.12 });
    expect(reading.amount).toBe(22.2);
    await invoices.setPassportLast4(villaOwner, b.guest_id, 'X7K9');
    const inv = await invoices.issueForBooking(villaOwner, b.id);
    expect(inv.kind).toBe('long_stay');
    expect(inv.number).toMatch(new RegExp(`^INV-${new Date().getUTCFullYear()}-\\d{4}$`));
    expect(inv.total).toBe(1522.2);
    expect(inv.pdfUrl).toMatch(/\.pdf$/);
    const lines = (await ctx.db.one(`select lines from invoice where id = $1`, [inv.id]))!.lines;
    expect(lines.map((l: any) => l.description).join(' ')).toMatch(/Electricity/);
    expect((await ctx.db.one(`select invoice_id from utility_reading where id = $1`, [reading.id]))!.invoice_id).toBe(inv.id);
    const second = await invoices.issueForBooking(villaOwner, b.id);
    expect(Number(second.number.slice(-4))).toBe(Number(inv.number.slice(-4)) + 1);
    await expect(ctx.db.query(`update invoice set total = 0 where id = $1`, [inv.id])).rejects.toThrow(/append-only/);
    expect((await invoices.publicInvoices(created.reference, created.token)).length).toBe(2);
  });
});

describe('owner statements (Manager plan)', () => {
  it('computes the payout and finalises once; re-issuing supersedes', async () => {
    const statements = ctx.get(StatementsService);
    const ayesha = (await ctx.db.one(`select id from property_owner where name = 'Ayesha Fernando'`))!;
    const [usd] = await statements.preview(mgrOwner, ayesha.id, period());
    expect(usd!.currency).toBe('USD');
    expect(usd!.directRevenue).toBe(380); // 4 nights × 95
    expect(usd!.managementFee).toBe(76); // 20%
    expect(usd!.expenses).toBe(40);
    expect(usd!.platformFees).toBeGreaterThan(0); // LKR 3,000 per managed property, in USD
    expect(usd!.payout).toBeCloseTo(usd!.directRevenue + usd!.otaRevenue + usd!.addOnIncome - usd!.managementFee - usd!.expenses - usd!.platformFees, 2);

    const [final] = await statements.finalize(mgrOwner, ayesha.id, period());
    expect(final!.number).toMatch(/^STM-/);
    await expect(statements.finalize(mgrOwner, ayesha.id, period())).rejects.toThrow(/already final/);
    await statements.finalize(mgrOwner, ayesha.id, period(), true);
    const list = await statements.listStatements(mgrOwner, ayesha.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.supersedesId).toBe(final!.id);
    expect((await statements.excel(mgrOwner, ayesha.id, period())).subarray(0, 2).toString()).toBe('PK'); // xlsx zip
    // Villa Lagoon (Pro) has no owner statements.
    await expect(statements.listOwners(villaOwner)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('commission ledger', () => {
  it('bills the flat plan fee plus add-on commission, once per month, append-only', async () => {
    const billing = ctx.get(BillingService);
    await billing.runPeriod(period());
    expect(await billing.runPeriod(period())).toBe(0);
    const mgr = (await ctx.db.one(`select * from commission_ledger where tenant_id = $1 and period = $2`, [managerTenantId, period()]))!;
    expect(mgr.subscription_fee).toBe(flatPlanFee('manager', 2)); // 25,000 + 2 × 3,000
    const villa = (await ctx.db.one(`select * from commission_ledger where tenant_id = $1 and period = $2`, [villaOwner.tenantId, period()]))!;
    expect(villa.subscription_fee).toBe(10000);
    expect(villa.total_due).toBeGreaterThanOrEqual(10000);

    const paid = await billing.settle(mgr.id, 'paid', 'bank transfer', 'test-admin');
    expect(paid).toMatchObject({ status: 'paid' });
    expect((await ctx.db.one(`select status from commission_ledger where id = $1`, [mgr.id]))!.status).toBe('due'); // original untouched
    await expect(billing.settle(mgr.id, 'paid', '', 'x')).rejects.toThrow();
    await expect(ctx.db.query(`delete from commission_ledger where id = $1`, [mgr.id])).rejects.toThrow(/append-only/);
  });
});

describe('provider ratings', () => {
  it('removes a provider whose average falls below 4.0 after 3 ratings and switches off their add-ons', async () => {
    const addOns = ctx.get(AddOnsService);
    const b = (await ctx.db.one(`select * from booking where reference = 'SD-DEMO1'`))!;
    const prov = (await ctx.db.one(`select id from provider where name = 'Raja and the Whales'`))!;
    const whale = (await ctx.db.one(`select id from add_on where provider_id = $1`, [prov.id]))!;
    for (const rating of [3, 4, 3]) {
      const o = (await ctx.db.one(
        `insert into add_on_order (tenant_id, booking_id, add_on_id, provider_id, date, qty, amount, currency, provider_amount, owner_amount, platform_amount, status)
         values ($1, $2, $3, $4, $5, 1, 60, 'USD', 46.5, 7.5, 6, 'done') returning id`,
        [b.tenant_id, b.id, whale.id, prov.id, todayIn('Asia/Colombo')],
      ))!;
      await addOns.rateOrder('SD-DEMO1', o.id, { token: b.access_token, rating, comment: '' });
    }
    const p = (await ctx.db.one(`select rating, rating_count, active, removed_at from provider where id = $1`, [prov.id]))!;
    expect(p).toMatchObject({ rating: 3.33, rating_count: 3, active: false });
    expect(p.removed_at).toBeTruthy();
    expect((await ctx.db.one(`select active from add_on where id = $1`, [whale.id]))!.active).toBe(false);
  });
});

describe('admin console', () => {
  it('admin tokens and tenant tokens are not interchangeable', async () => {
    const auth = ctx.get(AuthService);
    const tokens = ctx.get(TokenService);
    const admin = await auth.verifyAdmin('+94770000099', '123456');
    expect((await tokens.verifyAdmin(admin.token)).name).toBe('StayDirect Ops');
    await expect(tokens.verify(admin.token)).rejects.toThrow();
    const owner = await auth.verifyOtp('+94770000000', '123456');
    await expect(tokens.verifyAdmin(owner.token)).rejects.toThrow();
    await expect(auth.verifyAdmin('+94770000000', '123456')).rejects.toThrow(/not a StayDirect admin/);
  });

  it('translation overrides apply to emails but never to approved WhatsApp template text', async () => {
    const branding = ctx.get(BrandingService);
    await branding.setTranslation('test', { lang: 'en', key: 'confirmedIntro', value: 'Your villa is waiting for you.' });
    expect(await branding.t('en', 'confirmedIntro')).toBe('Your villa is waiting for you.');
    await expect(branding.setTranslation('test', { lang: 'en', key: 'seqArrival', value: 'changed' })).rejects.toThrow(/approved WhatsApp template/);
    expect(await branding.t('en', 'seqArrival', { property: 'P', guide: 'G' })).toContain('Welcome to P');
  });

  it('white label applies to Manager-plan guest sites only', async () => {
    const branding = ctx.get(BrandingService);
    expect(await branding.forTenant(managerTenantId)).toMatchObject({ whiteLabel: true, displayName: 'Southern Coast Stays' });
    expect((await branding.forTenant(villaOwner.tenantId)).whiteLabel).toBe(false);
    expect(await branding.themeTokens('surf')).toMatchObject({ brand: '#0a4a7a' });
  });
});
