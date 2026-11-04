import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { addDays, convertExact, fromMinor, pctOf, PLAN_PRICING, toMinor, type Plan, type SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { decryptJson, encryptJson } from '../../common/crypto.js';
import { DbService, isUniqueViolation, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { BrandingService } from '../branding/branding.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { FxService } from '../fx/fx.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import { StorageService } from '../storage/storage.service.js';

export interface StatementLine {
  date: string;
  propertyName: string;
  category: 'direct' | 'ota' | 'ota_estimate' | 'add_on' | 'expense' | 'management_fee' | 'platform_fee';
  description: string;
  amount: number; // + income to the owner, − deductions
}

export interface OwnerStatementData {
  ownerId: string;
  ownerName: string;
  period: string;
  currency: string;
  managementFeePct: number;
  directRevenue: number;
  otaRevenue: number;
  addOnIncome: number;
  managementFee: number;
  expenses: number;
  platformFees: number;
  payout: number;
  lines: StatementLine[];
}

const OTA_SOURCES = ['airbnb', 'booking_com', 'agoda', 'vrbo', 'other'];

function toOwner(o: Row) {
  return {
    id: o.id,
    name: o.name,
    email: o.email,
    phone: o.phone,
    managementFeePct: o.management_fee_pct,
    notes: o.notes,
    active: o.active,
    hasPayoutDetails: Boolean(o.payout_details),
    propertyIds: o.property_ids ?? [],
  };
}

/**
 * Manager companies (spec §2, §3.9 R3): the owners they manage for, and each owner's monthly
 * statement and payout. Finalised statements are append-only, with a PDF.
 */
@Injectable()
export class StatementsService {
  constructor(
    private readonly db: DbService,
    private readonly flags: FlagsService,
    private readonly fx: FxService,
    private readonly docs: DocumentsService,
    private readonly storage: StorageService,
    private readonly invoices: InvoicesService,
    private readonly branding: BrandingService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  // ---------------------------------------------------------------- owners
  async listOwners(user: SessionUser) {
    await this.flags.require(user.tenantId, 'owner_statements');
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select o.*, coalesce(array_agg(p.id) filter (where p.id is not null), '{}') as property_ids
           from property_owner o left join property p on p.owner_id = o.id group by o.id order by o.active desc, o.name`,
        [],
        tx,
      );
      return rows.map(toOwner);
    });
  }

  async createOwner(user: SessionUser, input: Record<string, any>) {
    await this.flags.require(user.tenantId, 'owner_statements');
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `insert into property_owner (tenant_id, name, email, phone, management_fee_pct, notes, payout_details, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
        [user.tenantId, input.name, input.email, input.phone, input.managementFeePct, input.notes,
          input.payoutDetails ? encryptJson(input.payoutDetails, this.config.ENCRYPTION_KEY) : null, input.active ?? true],
        tx,
      );
      return toOwner(row!);
    });
  }

  async updateOwner(user: SessionUser, ownerId: string, input: Record<string, any>) {
    await this.flags.require(user.tenantId, 'owner_statements');
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `update property_owner set name = coalesce($2, name), email = case when $3::boolean then $4 else email end,
                phone = case when $5::boolean then $6 else phone end, management_fee_pct = coalesce($7, management_fee_pct),
                notes = coalesce($8, notes), active = coalesce($9, active),
                payout_details = case when $10::boolean then $11 else payout_details end
          where id = $1 returning *`,
        [ownerId, input.name ?? null, input.email !== undefined, input.email ?? null, input.phone !== undefined, input.phone ?? null,
          input.managementFeePct ?? null, input.notes ?? null, input.active ?? null, input.payoutDetails !== undefined,
          input.payoutDetails ? encryptJson(input.payoutDetails, this.config.ENCRYPTION_KEY) : null],
        tx,
      );
      if (!row) throw new NotFoundException('Owner not found');
      return toOwner(row);
    });
  }

  /** Owner's bank details for paying them out (decrypted; owner role only). */
  async payoutDetails(user: SessionUser, ownerId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const o = await this.db.one(`select payout_details from property_owner where id = $1`, [ownerId], tx);
      if (!o) throw new NotFoundException('Owner not found');
      return o.payout_details ? decryptJson(o.payout_details, this.config.ENCRYPTION_KEY) : null;
    });
  }

  async assignProperty(user: SessionUser, propertyId: string, ownerId: string | null) {
    await this.flags.require(user.tenantId, 'owner_statements');
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`update property set owner_id = $2 where id = $1 returning id`, [propertyId, ownerId], tx);
      if (!r) throw new NotFoundException('Property not found');
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- statements
  async preview(user: SessionUser, ownerId: string, period: string): Promise<OwnerStatementData[]> {
    await this.flags.require(user.tenantId, 'owner_statements');
    return this.db.withTenant(user.tenantId, (tx) => this.compute(tx, user.tenantId, ownerId, period));
  }

  /**
   * Payout = direct revenue + OTA revenue + owner's add-on share − management fee − expenses − platform fees,
   * per currency, for nights inside the month (stays crossing month ends are pro-rated by night).
   */
  async compute(tx: pg.PoolClient, tenantId: string, ownerId: string, period: string): Promise<OwnerStatementData[]> {
    const owner = await this.db.one(`select * from property_owner where id = $1`, [ownerId], tx);
    if (!owner) throw new NotFoundException('Owner not found');
    const start = `${period}-01`;
    const end = addDays(`${period}-28`, 4).slice(0, 8) + '01';
    const properties = await this.db.query(`select * from property where owner_id = $1 order by name`, [ownerId], tx);
    const tenant = (await this.db.one(`select plan from tenant where id = $1`, [tenantId], tx))!;
    const sub = await this.db.one(`select billing_model from subscription where tenant_id = $1`, [tenantId], tx);
    const fx = await this.fx.table();
    const byCurrency = new Map<string, StatementLine[]>();
    const push = (currency: string, line: StatementLine) => {
      if (!byCurrency.has(currency)) byCurrency.set(currency, []);
      byCurrency.get(currency)!.push(line);
    };

    for (const p of properties) {
      const cur = p.base_currency as string;
      const stays = await this.db.query(
        `select b.reference, b.source, b.from_date, b.to_date, b.total - b.add_ons_amount as room_total, b.currency,
                (least(b.to_date, $3::date) - greatest(b.from_date, $2::date)) as nights_in, (b.to_date - b.from_date) as nights
           from booking b
          where b.property_id = $1 and b.status in ('confirmed', 'checked_in', 'checked_out')
            and b.from_date < $3 and b.to_date > $2
          order by b.from_date`,
        [p.id, start, end],
        tx,
      );
      for (const s of stays) {
        const share = fromMinor(Math.round((toMinor(s.room_total) * s.nights_in) / s.nights));
        const amount = s.currency === cur ? share : convertExact(share, s.currency, cur, fx);
        const ota = OTA_SOURCES.includes(s.source);
        push(cur, {
          date: s.from_date,
          propertyName: p.name,
          category: ota ? 'ota' : 'direct',
          description: `${s.reference} ${ota ? `(${s.source})` : ''} ${s.from_date} → ${s.to_date}, ${s.nights_in} of ${s.nights} nights`.replace(/\s+/g, ' '),
          amount,
        });
      }
      // OTA nights known only from iCal (no booking row): estimated at the room's base rate.
      const icalNights = await this.db.query(
        `select r.name, n.source, count(*)::int as nights, sum(r.base_rate)::numeric(12,2) as est
           from night_inventory n join room r on r.id = n.room_id
          where r.property_id = $1 and n.status = 'reserved' and n.booking_id is null and n.date >= $2 and n.date < $3
          group by r.name, n.source`,
        [p.id, start, end],
        tx,
      );
      for (const n of icalNights) {
        push(cur, { date: start, propertyName: p.name, category: 'ota_estimate', description: `${n.name}: ${n.nights} ${n.source} nights (iCal, estimated at base rate)`, amount: n.est });
      }
      const addOns = await this.db.query(
        `select a.name, o.date, o.owner_amount, o.currency from add_on_order o join add_on a on a.id = o.add_on_id join booking b on b.id = o.booking_id
          where b.property_id = $1 and o.status in ('confirmed', 'done') and o.date >= $2 and o.date < $3`,
        [p.id, start, end],
        tx,
      );
      for (const a of addOns) {
        push(cur, { date: a.date, propertyName: p.name, category: 'add_on', description: `${a.name} commission`, amount: a.currency === cur ? a.owner_amount : convertExact(a.owner_amount, a.currency, cur, fx) });
      }
      const expenses = await this.db.query(
        `select date, type, title, cost from task where property_id = $1 and cost is not null and cost > 0 and date >= $2 and date < $3 order by date`,
        [p.id, start, end],
        tx,
      );
      for (const e of expenses) push(cur, { date: e.date, propertyName: p.name, category: 'expense', description: `${e.type}: ${e.title}`, amount: -e.cost });

      // Platform fee passed through to the owner: the per-managed-property fee (flat plans) or the % of direct revenue.
      const pricing = PLAN_PRICING[(tenant.plan as Plan) ?? 'manager'];
      if ((sub?.billing_model ?? 'flat') === 'flat') {
        const feeLkr = pricing.extraPropertyFee;
        if (feeLkr > 0) push(cur, { date: start, propertyName: p.name, category: 'platform_fee', description: 'StayDirect fee for this property', amount: -(cur === 'LKR' ? feeLkr : convertExact(feeLkr, 'LKR', cur, fx)) });
      } else {
        const direct = (byCurrency.get(cur) ?? []).filter((l) => l.propertyName === p.name && l.category === 'direct').reduce((s, l) => s + toMinor(l.amount), 0);
        if (direct > 0) push(cur, { date: start, propertyName: p.name, category: 'platform_fee', description: `StayDirect ${pricing.pct}% of direct bookings`, amount: -fromMinor(pctOf(direct, pricing.pct)) });
      }
    }

    const out: OwnerStatementData[] = [];
    for (const [currency, lines] of byCurrency) {
      const sum = (cats: StatementLine['category'][]) => lines.filter((l) => cats.includes(l.category)).reduce((s, l) => s + toMinor(l.amount), 0);
      const direct = sum(['direct']);
      const ota = sum(['ota', 'ota_estimate']);
      const fee = pctOf(direct + ota, Number(owner.management_fee_pct));
      lines.push({ date: start, propertyName: '', category: 'management_fee', description: `Management fee ${owner.management_fee_pct}% of room revenue`, amount: -fromMinor(fee) });
      const addOn = sum(['add_on']);
      const expenses = -sum(['expense']);
      const platform = -sum(['platform_fee']);
      out.push({
        ownerId,
        ownerName: owner.name,
        period,
        currency,
        managementFeePct: Number(owner.management_fee_pct),
        directRevenue: fromMinor(direct),
        otaRevenue: fromMinor(ota),
        addOnIncome: fromMinor(addOn),
        managementFee: fromMinor(fee),
        expenses: fromMinor(expenses),
        platformFees: fromMinor(platform),
        payout: fromMinor(direct + ota + addOn - fee - expenses - platform),
        lines,
      });
    }
    return out;
  }

  listStatements(user: SessionUser, ownerId?: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select s.*, o.name as owner_name, i.number, i.pdf_url from owner_statement s join property_owner o on o.id = s.property_owner_id
           left join invoice i on i.id = s.invoice_id
          where ($1::uuid is null or s.property_owner_id = $1)
            and not exists (select 1 from owner_statement n where n.supersedes_id = s.id)
          order by s.period desc, o.name`,
        [ownerId ?? null],
        tx,
      );
      return rows.map((s) => ({
        id: s.id,
        ownerId: s.property_owner_id,
        ownerName: s.owner_name,
        period: s.period,
        currency: s.currency,
        directRevenue: s.direct_revenue,
        otaRevenue: s.ota_revenue,
        addOnIncome: s.add_on_income,
        managementFee: s.management_fee,
        expenses: s.expenses,
        platformFees: s.platform_fees,
        payout: s.payout,
        number: s.number,
        pdfUrl: s.pdf_url,
        createdAt: s.created_at,
        supersedesId: s.supersedes_id,
      }));
    });
  }

  /** Freeze the month: append-only statement row(s) + PDF. Re-issuing supersedes the previous version. */
  async finalize(user: SessionUser, ownerId: string, period: string, reissue = false) {
    await this.flags.require(user.tenantId, 'owner_statements');
    const brand = await this.branding.forTenant(user.tenantId);
    try {
      return await this.db.withTenant(user.tenantId, async (tx) => {
        const data = await this.compute(tx, user.tenantId, ownerId, period);
        const tenant = (await this.db.one(`select name from tenant where id = $1`, [user.tenantId], tx))!;
        const owner = (await this.db.one(`select * from property_owner where id = $1`, [ownerId], tx))!;
        const results = [];
        for (const d of data) {
          const prev = await this.db.one(
            `select id from owner_statement s where property_owner_id = $1 and period = $2 and currency = $3
               and not exists (select 1 from owner_statement n where n.supersedes_id = s.id)`,
            [ownerId, period, d.currency],
            tx,
          );
          if (prev && !reissue) throw new ConflictException(`The ${period} statement in ${d.currency} is already final. Re-issue it to correct it.`);
          const number = await this.invoices.nextNumber(tx, user.tenantId, 'STM');
          const pdf = await this.docs.pdf({
            title: 'Owner statement',
            number,
            issuedAt: new Date(),
            seller: { name: brand.displayName || tenant.name, lines: [brand.supportEmail ?? ''].filter(Boolean) },
            billTo: { name: owner.name, lines: [owner.email, owner.phone].filter(Boolean) },
            facts: [
              ['Period', period],
              ['Currency', d.currency],
              ['Management fee', `${d.managementFeePct}%`],
            ],
            lines: d.lines.map((l) => ({ description: `${l.date} ${l.propertyName ? `${l.propertyName}: ` : ''}${l.description}`, amount: l.amount })),
            currency: d.currency,
            totals: [
              ['Room revenue', d.directRevenue + d.otaRevenue],
              ['Add-on commissions', d.addOnIncome],
              ['Management fee', -d.managementFee],
              ['Expenses', -d.expenses],
              ['Platform fees', -d.platformFees],
              ['Payout to owner', d.payout],
            ],
            notes: [prev ? `This statement replaces the earlier ${period} statement.` : `Payout of ${d.currency} ${d.payout.toFixed(2)} for ${period}.`],
            footer: brand.whiteLabel ? brand.displayName || tenant.name : `${tenant.name} · statement issued with StayDirect LK`,
          });
          const pdfUrl = await this.storage.put(user.tenantId, 'statements', pdf, 'application/pdf');
          const inv = (await this.db.one(
            `insert into invoice (tenant_id, property_owner_id, kind, number, period_start, period_end, bill_to, lines, currency, subtotal, total, pdf_url)
             values ($1, $2, 'owner_statement', $3, $4, ($4::date + interval '1 month' - interval '1 day')::date, $5, $6, $7, $8, $8, $9) returning id`,
            [user.tenantId, ownerId, number, `${period}-01`, JSON.stringify({ name: owner.name }), JSON.stringify(d.lines), d.currency, d.payout, pdfUrl],
            tx,
          ))!;
          const row = (await this.db.one(
            `insert into owner_statement (tenant_id, property_owner_id, period, currency, direct_revenue, ota_revenue, add_on_income,
                                          management_fee, expenses, platform_fees, payout, lines, invoice_id, supersedes_id)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning id`,
            [user.tenantId, ownerId, period, d.currency, d.directRevenue, d.otaRevenue, d.addOnIncome, d.managementFee, d.expenses,
              d.platformFees, d.payout, JSON.stringify(d.lines), inv.id, prev?.id ?? null],
            tx,
          ))!;
          results.push({ id: row.id, currency: d.currency, payout: d.payout, number, pdfUrl });
        }
        return results;
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('This statement was finalised at the same time by someone else');
      throw err;
    }
  }

  async excel(user: SessionUser, ownerId: string, period: string): Promise<Buffer> {
    const data = await this.preview(user, ownerId, period);
    const rows = data.flatMap((d) => d.lines.map((l) => ({ ...l, currency: d.currency })));
    return this.docs.xlsx(`Statement ${period}`, [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Property', key: 'propertyName', width: 26 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Amount', key: 'amount', width: 14, money: true },
    ], rows);
  }
}
