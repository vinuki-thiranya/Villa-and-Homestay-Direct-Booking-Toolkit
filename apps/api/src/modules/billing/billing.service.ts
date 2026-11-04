import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { addDays, convertExact, flatPlanFee, fromMinor, pctOf, PLAN_PRICING, toMinor, type Plan, type SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { DbService, isUniqueViolation, type Row } from '../../common/db.service.js';
import { FxService } from '../fx/fx.service.js';

export function toLedger(l: Row) {
  return {
    id: l.id,
    tenantId: l.tenant_id,
    tenantName: l.tenant_name ?? null,
    period: l.period,
    plan: l.plan,
    billingModel: l.billing_model,
    properties: l.properties,
    subscriptionFee: l.subscription_fee,
    directBookingValue: l.direct_booking_value,
    pctFee: l.pct_fee,
    addOnCommission: l.add_on_commission,
    adjustment: l.adjustment,
    totalDue: l.total_due,
    currency: l.currency,
    status: l.status,
    paidAt: l.paid_at,
    note: l.note,
    createdAt: l.created_at,
  };
}

const EFFECTIVE = `not exists (select 1 from commission_ledger n where n.supersedes_id = l.id)`;

/**
 * Commission ledger (spec §6, §8): what each owner owes StayDirect for a month — the flat plan fee
 * or the % of direct-booking value, plus 10% of every add-on sold. Rows are append-only; marking
 * paid or correcting adds a superseding row.
 */
@Injectable()
export class BillingService {
  private readonly log = new Logger(BillingService.name);

  constructor(
    private readonly db: DbService,
    private readonly fx: FxService,
  ) {}

  /** The month before `today` as YYYY-MM. */
  static previousPeriod(today = new Date()): string {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    return d.toISOString().slice(0, 7);
  }

  /** Daily job: make sure last month's ledger rows exist for every tenant (idempotent). */
  async runDue(today = new Date()): Promise<number> {
    return this.runPeriod(BillingService.previousPeriod(today));
  }

  async runPeriod(period: string): Promise<number> {
    const tenants = await this.db.query(`select t.id from tenant t where t.created_at < ($1 || '-01')::date + interval '1 month'`, [period]);
    let created = 0;
    for (const t of tenants) {
      try {
        if (await this.db.tx((tx) => this.computeRow(tx, t.id, period))) created++;
      } catch (err) {
        if (isUniqueViolation(err)) continue;
        this.log.error(`ledger ${period} for ${t.id} failed: ${(err as Error).message}`);
      }
    }
    return created;
  }

  /** Compute and insert a tenant's row for a month. Returns false when it already exists. */
  async computeRow(tx: pg.PoolClient, tenantId: string, period: string): Promise<boolean> {
    const exists = await this.db.one(`select 1 from commission_ledger where tenant_id = $1 and period = $2`, [tenantId, period], tx);
    if (exists) return false;
    const tenant = (await this.db.one(`select plan, billing_status from tenant where id = $1`, [tenantId], tx))!;
    const sub = await this.db.one(`select billing_model, status from subscription where tenant_id = $1`, [tenantId], tx);
    const plan = tenant.plan as Plan;
    const model = (sub?.billing_model ?? 'flat') as 'flat' | 'pct';
    const start = `${period}-01`;
    const end = addDays(`${period}-28`, 4).slice(0, 8) + '01';
    const fx = await this.fx.table();
    const toLkr = (amount: number, currency: string) => (currency === 'LKR' ? amount : convertExact(amount, currency, 'LKR', fx));

    const props = await this.db.one<{ n: number }>(`select count(*)::int as n from property where tenant_id = $1`, [tenantId], tx);
    // Direct-booking value: confirmed direct stays checking in this month (percentage plans bill on these).
    const direct = await this.db.query<{ currency: string; v: number }>(
      `select currency, sum(total)::numeric(12,2) as v from booking
        where tenant_id = $1 and source = 'direct' and status in ('confirmed', 'checked_in', 'checked_out')
          and from_date >= $2 and from_date < $3 group by currency`,
      [tenantId, start, end],
      tx,
    );
    const addOns = await this.db.query<{ currency: string; v: number }>(
      `select currency, sum(platform_amount)::numeric(12,2) as v from add_on_order
        where tenant_id = $1 and status in ('confirmed', 'done') and date >= $2 and date < $3 group by currency`,
      [tenantId, start, end],
      tx,
    );
    const directLkr = direct.reduce((s, r) => s + toMinor(toLkr(r.v, r.currency)), 0);
    const addOnLkr = addOns.reduce((s, r) => s + toMinor(toLkr(r.v, r.currency)), 0);
    const trial = tenant.billing_status === 'trial' || sub?.status === 'trial';
    const subscriptionFee = model === 'flat' && !trial ? toMinor(flatPlanFee(plan, props?.n ?? 0)) : 0;
    const pctFee = model === 'pct' && !trial ? pctOf(directLkr, PLAN_PRICING[plan].pct) : 0;
    const total = subscriptionFee + pctFee + addOnLkr;

    await this.db.query(
      `insert into commission_ledger (tenant_id, period, plan, billing_model, properties, subscription_fee, direct_booking_value, pct_fee,
                                      add_on_commission, total_due, fx_usd_lkr, note)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [tenantId, period, plan, model, props?.n ?? 0, fromMinor(subscriptionFee), fromMinor(directLkr), fromMinor(pctFee), fromMinor(addOnLkr),
        fromMinor(total), fx.LKR ?? null, trial ? 'Pilot / trial: subscription waived' : null],
      tx,
    );
    return true;
  }

  // ---------------------------------------------------------------- owner view
  ownerLedger(user: SessionUser) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from commission_ledger l where ${EFFECTIVE} order by period desc limit 24`, [], tx);
      return rows.map(toLedger);
    });
  }

  // ---------------------------------------------------------------- admin
  async adminLedger(status?: string) {
    const rows = await this.db.query(
      `select l.*, t.name as tenant_name from commission_ledger l join tenant t on t.id = l.tenant_id
        where ${EFFECTIVE} ${status ? 'and l.status = $1' : ''} order by l.period desc, t.name limit 500`,
      status ? [status] : [],
    );
    return rows.map(toLedger);
  }

  /** Mark a month paid (or void) by appending a superseding row. */
  async settle(ledgerId: string, status: 'paid' | 'void', note: string, admin: string) {
    return this.db.tx(async (tx) => {
      const l = await this.db.one(`select * from commission_ledger l where id = $1 and ${EFFECTIVE} for update`, [ledgerId], tx);
      if (!l) throw new NotFoundException('Ledger entry not found or already superseded');
      if (l.status !== 'due') throw new ConflictException(`This month is already ${l.status}`);
      const row = (await this.db.one(
        `insert into commission_ledger (tenant_id, period, plan, billing_model, properties, subscription_fee, direct_booking_value, pct_fee,
                                        add_on_commission, adjustment, total_due, currency, fx_usd_lkr, status, paid_at, note, supersedes_id)
         select tenant_id, period, plan, billing_model, properties, subscription_fee, direct_booking_value, pct_fee, add_on_commission,
                adjustment, total_due, currency, fx_usd_lkr, $2, case when $2 = 'paid' then now() end, $3, id
           from commission_ledger where id = $1 returning *`,
        [ledgerId, status, `${note}${note ? ' — ' : ''}${admin}`],
        tx,
      ))!;
      return toLedger(row);
    });
  }
}
