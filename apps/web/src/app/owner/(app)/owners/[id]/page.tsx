import Link from 'next/link';
import { Download, FileText } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Section } from '@/components/owner/fields';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { fmtDate, money } from '@/lib/format';
import { getMe, monthLabel, ownerTry, shiftMonth, type FinalStatement, type PropertyOwnerRow, type StatementCategory, type StatementPreview } from '@/lib/owner-r3';
import { finalizeStatementAction } from '../../../actions-r3';

export const metadata = { title: 'Owner statement' };

const CATEGORY: Record<StatementCategory, string> = {
  direct: 'Direct bookings',
  ota: 'Booking.com / Airbnb',
  ota_estimate: 'OTA nights (estimated)',
  add_on: 'Add-on commissions',
  expense: 'Expenses',
  management_fee: 'Management fee',
  platform_fee: 'StayDirect fees',
};

/** One owner's month: the maths from revenue to payout, then finalise into a PDF statement. */
export default async function OwnerStatementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const q = await searchParams;
  const me = await getMe();
  if (!me.flags.owner_statements) return <UpgradeNote feature="owner_statements" />;
  const period = q.period && /^\d{4}-\d{2}$/.test(q.period) ? q.period : new Date().toISOString().slice(0, 7);
  const [owners, preview, finals] = await Promise.all([
    ownerTry<PropertyOwnerRow[]>('/owners'),
    ownerTry<StatementPreview[]>(`/owners/${id}/statement?period=${period}`),
    ownerTry<FinalStatement[]>(`/statements?ownerId=${id}`),
  ]);
  const owner = owners.data?.find((o) => o.id === id);
  if (!owner) return <Empty>Owner not found.</Empty>;
  const statements = preview.data ?? [];
  const finalised = (finals.data ?? []).filter((s) => s.period === period);

  return (
    <div className="space-y-5">
      <Link href="/owner/owners" className="text-sm text-brand">
        ← Owners
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{owner.name}</h1>
          <p className="text-sm text-muted">Statement for {monthLabel(period)} · {owner.managementFeePct}% management fee</p>
        </div>
        <nav aria-label="Month" className="flex items-center gap-2">
          <Link className="btn-secondary min-h-11 px-3" href={`?period=${shiftMonth(period, -1)}`}>
            ← {monthLabel(shiftMonth(period, -1)).split(' ')[0]}
          </Link>
          <Link className="btn-secondary min-h-11 px-3" href={`?period=${shiftMonth(period, 1)}`}>
            {monthLabel(shiftMonth(period, 1)).split(' ')[0]} →
          </Link>
        </nav>
      </div>

      {statements.length === 0 ? (
        <Empty>Nothing to report for {monthLabel(period)}: no stays, add-ons or expenses on this owner&apos;s properties.</Empty>
      ) : (
        statements.map((s) => <StatementCard key={s.currency} s={s} />)
      )}

      {statements.length > 0 && (
        <Section title="Send it">
          <div className="flex flex-wrap items-center gap-3">
            <a href={`/owner/export/statement?ownerId=${id}&period=${period}`} className="btn-secondary">
              <Download aria-hidden className="h-4 w-4" /> Excel
            </a>
            {finalised.length === 0 ? (
              <ActionForm
                action={finalizeStatementAction.bind(null, id, period, false)}
                submitLabel="Finalise statement"
                pendingLabel="Finalising…"
                inline
                confirm={`Finalise ${monthLabel(period)} for ${owner.name}? It becomes a numbered PDF you can send.`}
              />
            ) : (
              <ActionForm
                action={finalizeStatementAction.bind(null, id, period, true)}
                submitLabel="Re-issue with today's numbers"
                variant="secondary"
                inline
                confirm="Re-issue? The new statement replaces the current one; both stay on record."
              />
            )}
          </div>
          {finalised.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {finalised.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2">
                  <FileText aria-hidden className="h-4 w-4 text-brand" />
                  <span className="font-medium">{f.number}</span>
                  <span className="text-muted">
                    {f.currency} payout {money(f.payout, f.currency)} · issued {fmtDate(f.createdAt.slice(0, 10))}
                    {f.supersedesId ? ' · replaces an earlier version' : ''}
                  </span>
                  {f.pdfUrl && (
                    <a className="font-medium text-brand underline-offset-2 hover:underline" href={f.pdfUrl} target="_blank" rel="noopener noreferrer">
                      PDF
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {(finals.data ?? []).length > 0 && (
        <Section title="Earlier statements">
          <ul className="divide-y divide-line text-sm">
            {(finals.data ?? [])
              .filter((f) => f.period !== period)
              .map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Link href={`?period=${f.period}`} className="min-w-28 font-medium text-brand">
                    {monthLabel(f.period)}
                  </Link>
                  <span className="flex-1 text-muted">
                    {f.number} · {money(f.payout, f.currency)}
                  </span>
                  {f.pdfUrl && (
                    <a className="font-medium text-brand" href={f.pdfUrl} target="_blank" rel="noopener noreferrer">
                      PDF
                    </a>
                  )}
                </li>
              ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function StatementCard({ s }: { s: StatementPreview }) {
  const m = (n: number) => money(n, s.currency);
  const byProperty = new Map<string, StatementPreview['lines']>();
  for (const l of s.lines.filter((l) => l.category !== 'management_fee')) {
    const k = l.propertyName || 'General';
    byProperty.set(k, [...(byProperty.get(k) ?? []), l]);
  }
  const maths: [string, number, 'plus' | 'minus'][] = [
    ['Room revenue (direct + OTA)', s.directRevenue + s.otaRevenue, 'plus'],
    ['Add-on commissions', s.addOnIncome, 'plus'],
    [`Management fee ${s.managementFeePct}%`, s.managementFee, 'minus'],
    ['Expenses', s.expenses, 'minus'],
    ['StayDirect fees', s.platformFees, 'minus'],
  ];
  return (
    <section className="card overflow-hidden" aria-label={`Statement in ${s.currency}`}>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <dl className="space-y-1.5 text-sm">
          {maths.map(([label, value, sign]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className={`tabular-nums ${sign === 'minus' && value > 0 ? 'text-muted' : ''}`}>
                {sign === 'minus' && value > 0 ? '− ' : ''}
                {m(value)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="rounded-xl bg-brand/10 p-4 text-center sm:min-w-48">
          <p className="text-sm text-muted">Payout to owner</p>
          <p className={`mt-1 font-display text-3xl font-semibold tabular-nums ${s.payout < 0 ? 'text-bad' : 'text-brand'}`}>{m(s.payout)}</p>
          {s.payout < 0 && <p className="mt-1 text-xs text-bad">Owner owes you this month</p>}
        </div>
      </div>
      <div className="border-t border-line">
        {[...byProperty.entries()].map(([property, lines]) => (
          <details key={property} className="border-b border-line last:border-0" open={byProperty.size === 1}>
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-semibold sm:px-5">
              <span>{property}</span>
              <span className="tabular-nums text-muted">{m(lines.reduce((t, l) => t + l.amount, 0))}</span>
            </summary>
            <ul className="divide-y divide-line px-4 pb-3 text-sm sm:px-5">
              {lines.map((l, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block">{l.description}</span>
                    <span className="text-xs text-muted">
                      {CATEGORY[l.category]} · {fmtDate(l.date)}
                    </span>
                  </span>
                  <span className={`tabular-nums ${l.amount < 0 ? 'text-muted' : 'text-ok'}`}>{m(l.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
