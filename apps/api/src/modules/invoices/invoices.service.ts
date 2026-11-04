import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { convertExact, fromMinor, toMinor, type SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { DocumentsService, type DocLine } from '../documents/documents.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { StorageService } from '../storage/storage.service.js';
import { BrandingService } from '../branding/branding.service.js';
import { FxService } from '../fx/fx.service.js';

export function toInvoice(i: Row) {
  return {
    id: i.id,
    kind: i.kind,
    number: i.number,
    bookingId: i.booking_id,
    periodStart: i.period_start,
    periodEnd: i.period_end,
    currency: i.currency,
    subtotal: i.subtotal,
    taxes: i.taxes,
    total: i.total,
    paid: i.paid,
    pdfUrl: i.pdf_url,
    issuedAt: i.issued_at,
    supersedesId: i.supersedes_id,
  };
}

/**
 * Invoices (spec §3.5 receipts, §3.10 long-stay / Digital Nomad Visa). Numbers run per tenant and
 * year (INV-2026-0001). Invoices are append-only: a correction is a new invoice that supersedes.
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly db: DbService,
    private readonly bookings: BookingsService,
    private readonly docs: DocumentsService,
    private readonly storage: StorageService,
    private readonly flags: FlagsService,
    private readonly branding: BrandingService,
    private readonly fx: FxService,
  ) {}

  async nextNumber(tx: pg.PoolClient, tenantId: string, prefix = 'INV'): Promise<string> {
    const year = new Date().getUTCFullYear();
    const row = await this.db.one<{ last: number }>(
      `insert into invoice_counter (tenant_id, year, last) values ($1, $2, 1)
       on conflict (tenant_id, year) do update set last = invoice_counter.last + 1 returning last`,
      [tenantId, year],
      tx,
    );
    return `${prefix}-${year}-${String(row!.last).padStart(4, '0')}`;
  }

  // ---------------------------------------------------------------- utility readings (metered long stays)
  listReadings(user: SessionUser, bookingId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.requireBooking(tx, bookingId);
      const rows = await this.db.query(`select * from utility_reading where booking_id = $1 order by period_start, meter`, [bookingId], tx);
      return rows.map(toReading);
    });
  }

  addReading(
    user: SessionUser,
    bookingId: string,
    r: { meter: string; periodStart: string; periodEnd: string; startReading: number; endReading: number; unitRate: number },
  ) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.requireBooking(tx, bookingId);
      const row = await this.db.one(
        `insert into utility_reading (tenant_id, booking_id, meter, period_start, period_end, start_reading, end_reading, unit_rate, amount)
         values ($1, $2, $3, $4, $5, $6, $7, $8, round(($7::numeric - $6::numeric) * $8::numeric, 2)) returning *`,
        [user.tenantId, bookingId, r.meter, r.periodStart, r.periodEnd, r.startReading, r.endReading, r.unitRate],
        tx,
      );
      return toReading(row!);
    });
  }

  deleteReading(user: SessionUser, readingId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`delete from utility_reading where id = $1 and invoice_id is null returning id`, [readingId], tx);
      if (!r) throw new ConflictException('Only readings that are not invoiced yet can be deleted');
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- issuing
  listForBooking(user: SessionUser, bookingId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from invoice where booking_id = $1 order by issued_at`, [bookingId], tx);
      return rows.map(toInvoice);
    });
  }

  async publicInvoices(reference: string, token: string) {
    const b = await this.bookings.findByReference(reference, token);
    const rows = await this.db.query(`select * from invoice where booking_id = $1 order by issued_at`, [b.id]);
    return rows.map((i) => ({ number: i.number, kind: i.kind, issuedAt: i.issued_at, total: i.total, currency: i.currency, pdfUrl: i.pdf_url }));
  }

  /**
   * Issue an invoice for a booking. Long stays (priced by a monthly plan) get the residence wording
   * immigration asks for when renewing a Digital Nomad Visa; metered utilities not yet invoiced are added.
   */
  async issueForBooking(user: SessionUser, bookingId: string, opts: { periodStart?: string; periodEnd?: string } = {}) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const b = await this.db.one(
        `select b.*, r.name as room_name, g.name as guest_name, g.email as guest_email, g.phone as guest_phone, g.country as guest_country,
                g.passport_last4, p.paid
           from booking b join room r on r.id = b.room_id left join guest g on g.id = b.guest_id
           join v_booking_paid p on p.booking_id = b.id
          where b.id = $1`,
        [bookingId],
        tx,
      );
      if (!b) throw new NotFoundException('Booking not found');
      if (!['confirmed', 'checked_in', 'checked_out'].includes(b.status)) throw new BadRequestException('Invoices are issued for confirmed stays');
      const property = (await this.db.one(`select * from property where id = $1`, [b.property_id], tx))!;
      const longStay = Boolean(b.quote_snapshot?.monthly);
      if (longStay) await this.flags.require(user.tenantId, 'long_stay');

      const from = opts.periodStart ?? b.from_date;
      const to = opts.periodEnd ?? b.to_date;
      if (from < b.from_date || to > b.to_date || from >= to) throw new BadRequestException('The period must fall within the stay');
      const nights = ((b.quote_snapshot?.nights ?? []) as { date: string; rate: number }[]).filter((n) => n.date >= from && n.date < to);
      const wholeStay = from === b.from_date && to === b.to_date;

      const lines: DocLine[] = [];
      if (nights.length) {
        const rent = nights.reduce((s, n) => s + toMinor(n.rate), 0);
        lines.push({
          description: longStay
            ? `${b.room_name} — monthly stay (${b.quote_snapshot.monthly.name}), ${from} to ${to}`
            : `${b.room_name} — ${nights.length} night${nights.length === 1 ? '' : 's'}, ${from} to ${to}`,
          qty: nights.length,
          unitPrice: fromMinor(Math.round(rent / nights.length)),
          amount: fromMinor(rent),
        });
      }
      if (wholeStay) {
        if (b.quote_snapshot?.extraGuestTotal > 0) lines.push({ description: 'Extra guests', amount: b.quote_snapshot.extraGuestTotal });
        if (b.discount > 0) lines.push({ description: b.quote_snapshot?.discountLabel ?? 'Discount', amount: -b.discount });
        if (b.promo_discount > 0) lines.push({ description: 'Discount code', amount: -b.promo_discount });
        const addOns = await this.db.query(
          `select a.name, o.qty, o.amount, o.currency, o.date from add_on_order o join add_on a on a.id = o.add_on_id
            where o.booking_id = $1 and o.status <> 'cancelled' order by o.date`,
          [b.id],
          tx,
        );
        const fx = addOns.some((a) => a.currency !== b.currency) ? await this.fx.table() : {};
        for (const a of addOns) {
          const amount = a.currency === b.currency ? a.amount : convertExact(a.amount, a.currency, b.currency, fx);
          lines.push({ description: `${a.name} (${a.date})${a.currency !== b.currency ? `, ${a.amount} ${a.currency}` : ''}`, qty: a.qty, amount });
        }
      }
      const readings = await this.db.query(
        `select * from utility_reading where booking_id = $1 and invoice_id is null and period_start >= $2 and period_end <= $3 order by period_start`,
        [b.id, from, to],
        tx,
      );
      for (const r of readings) {
        lines.push({
          description: `${cap(r.meter)} ${r.period_start} to ${r.period_end}: ${r.start_reading} → ${r.end_reading} units`,
          qty: Math.round((r.end_reading - r.start_reading) * 100) / 100,
          unitPrice: r.unit_rate,
          amount: r.amount,
        });
      }
      const subtotal = lines.reduce((s, l) => s + toMinor(l.amount), 0);
      const taxes = wholeStay ? toMinor(b.taxes) : Math.round((subtotal * Number(property.tax_pct)) / 100);
      const total = subtotal + taxes;
      const paid = toMinor(b.paid);

      const number = await this.nextNumber(tx, user.tenantId);
      const brand = await this.branding.forTenant(user.tenantId);
      const seller = {
        name: brand.displayName || property.name,
        lines: [property.address, property.sltda_number ? `SLTDA registration ${property.sltda_number}` : '', property.email ?? '', property.whatsapp_number ?? ''].filter(Boolean),
      };
      const notes: string[] = [];
      if (longStay) {
        notes.push(
          `Residence confirmation: ${b.guest_name}${b.passport_last4 ? `, passport ending ${b.passport_last4}` : ''}${b.guest_country ? ` (${b.guest_country})` : ''}, ` +
            `is staying at ${property.name}, ${property.address}, from ${b.from_date} to ${b.to_date} under booking ${b.reference}. ` +
            `The rent above is for accommodation only${b.quote_snapshot.monthly.utilities === 'metered' ? '; electricity and water are billed from meter readings' : ', utilities included'}.`,
        );
        notes.push(`Issued for the purpose of a Sri Lanka Digital Nomad Visa application or renewal.${property.sltda_number ? ` The property is registered with the Sri Lanka Tourism Development Authority (${property.sltda_number}).` : ''}`);
      }
      notes.push(`Payments received to date: ${fmt(paid, b.currency)}. ${total - paid > 0 && wholeStay ? `Balance due ${b.balance_due_date ?? 'on arrival'}.` : ''}`.trim());
      const pdf = await this.docs.pdf({
        title: longStay ? 'Invoice — long stay' : 'Invoice',
        number,
        issuedAt: new Date(),
        seller,
        billTo: { name: b.guest_name ?? 'Guest', lines: [b.guest_email, b.guest_phone, b.guest_country].filter(Boolean) as string[] },
        facts: [
          ['Booking', b.reference],
          ['Stay', `${b.from_date} to ${b.to_date}`],
          ['Invoice period', `${from} to ${to}`],
          ['Property', property.name],
        ],
        lines,
        currency: b.currency,
        totals: [
          ['Subtotal', fromMinor(subtotal)],
          ...(taxes ? [['Taxes', fromMinor(taxes)] as [string, number]] : []),
          ['Total', fromMinor(total)],
          ['Paid', fromMinor(paid)],
          ['Balance', fromMinor(Math.max(0, total - paid))],
        ],
        notes,
        footer: brand.whiteLabel ? brand.displayName || property.name : `${property.name} · issued with StayDirect LK`,
      });
      const pdfUrl = await this.storage.put(user.tenantId, 'invoices', pdf, 'application/pdf');
      const row = (await this.db.one(
        `insert into invoice (tenant_id, property_id, booking_id, kind, number, period_start, period_end, bill_to, lines, currency, subtotal, taxes, total, paid, pdf_url)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning *`,
        [user.tenantId, property.id, b.id, longStay ? 'long_stay' : 'booking', number, from, to,
          JSON.stringify({ name: b.guest_name, email: b.guest_email, country: b.guest_country, passportLast4: b.passport_last4 }),
          JSON.stringify(lines), b.currency, fromMinor(subtotal), fromMinor(taxes), fromMinor(total), fromMinor(paid), pdfUrl],
        tx,
      ))!;
      if (readings.length) await this.db.query(`update utility_reading set invoice_id = $2 where id = any($1::uuid[])`, [readings.map((r) => r.id), row.id], tx);
      return toInvoice(row);
    });
  }

  setPassportLast4(user: SessionUser, guestId: string, last4: string | null) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`update guest set passport_last4 = $2 where id = $1 returning id`, [guestId, last4?.toUpperCase() ?? null], tx);
      if (!r) throw new NotFoundException('Guest not found');
      return { ok: true };
    });
  }

  private async requireBooking(tx: pg.PoolClient, bookingId: string) {
    const b = await this.db.one(`select id from booking where id = $1`, [bookingId], tx);
    if (!b) throw new NotFoundException('Booking not found');
  }
}

function toReading(r: Row) {
  return {
    id: r.id,
    meter: r.meter,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    startReading: r.start_reading,
    endReading: r.end_reading,
    unitRate: r.unit_rate,
    amount: r.amount,
    invoiceId: r.invoice_id,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (minor: number, currency: string) => `${currency} ${fromMinor(minor).toFixed(2)}`;
