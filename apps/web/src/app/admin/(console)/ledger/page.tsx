import Link from 'next/link';
import { AdminForm } from '@/components/admin/AdminForm';
import { adminApi, type LedgerRow } from '@/lib/admin';
import { formatDate, formatLkr, PLAN_LABELS, previousMonth } from '@/lib/admin-format';
import { runBillingAction, settleLedgerAction } from '../../actions';

export const metadata = { title: 'Commission ledger' };

const STATUSES = [
  { key: 'due', label: 'Due' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
  { key: '', label: 'All' },
] as const;

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'due' } = await searchParams;
  const rows = await adminApi<LedgerRow[]>(`/admin/ledger${status ? `?status=${status}` : ''}`);
  const sum = (k: keyof LedgerRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Commission ledger</h1>
          <p>
            What each tenant owes StayDirect per month: the plan fee (flat, or a percentage of direct bookings) plus 10% of add-ons sold. Entries
            are never edited; marking a month paid or void adds a new entry that replaces it.
          </p>
        </div>
      </header>

      <div className="adm-grid-2" style={{ marginBottom: 16 }}>
        <section className="adm-panel" aria-labelledby="run">
          <div className="adm-panel-head">
            <h2 id="run">Run billing for a month</h2>
            <p>Runs automatically on the 1st. Safe to repeat: tenants already billed are skipped.</p>
          </div>
          <div className="adm-panel-body">
            <AdminForm action={runBillingAction} submitLabel="Run billing" pendingLabel="Running…" layout="row">
              <label className="adm-field">
                <span>Month</span>
                <input className="adm-input" type="month" name="period" defaultValue={previousMonth()} required />
              </label>
            </AdminForm>
          </div>
        </section>
        <div className="flex items-end">
          <div className="adm-segment" role="group" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <Link key={s.key} href={`/admin/ledger${s.key ? `?status=${s.key}` : '?status='}`} aria-current={status === s.key ? 'true' : undefined}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="adm-panel">
        {rows.length === 0 ? (
          <p className="adm-empty">No {status || ''} entries.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Tenant</th>
                  <th scope="col">Plan</th>
                  <th scope="col" className="num">Plan fee</th>
                  <th scope="col" className="num">% fee</th>
                  <th scope="col" className="num">Add-on commission</th>
                  <th scope="col" className="num">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Settle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.period}</td>
                    <td>
                      <Link href={`/admin/tenants/${r.tenantId}`}>{r.tenantName}</Link>
                      <div className="adm-help">
                        {r.properties} propert{r.properties === 1 ? 'y' : 'ies'}
                        {r.billingModel === 'pct' ? `, direct bookings ${formatLkr(r.directBookingValue)}` : ''}
                      </div>
                    </td>
                    <td>{PLAN_LABELS[r.plan] ?? r.plan}</td>
                    <td className="num">{formatLkr(r.subscriptionFee)}</td>
                    <td className="num">{formatLkr(r.pctFee)}</td>
                    <td className="num">{formatLkr(r.addOnCommission)}</td>
                    <td className="num">
                      <strong>{formatLkr(r.totalDue)}</strong>
                    </td>
                    <td>
                      <span className="adm-mark" data-tone={r.status === 'paid' ? 'ok' : r.status === 'void' ? 'muted' : 'warn'}>
                        {r.status}
                      </span>
                      {r.paidAt && <div className="adm-help">{formatDate(r.paidAt)}</div>}
                      {r.note && <div className="adm-help">{r.note}</div>}
                    </td>
                    <td style={{ minWidth: 260 }}>
                      {r.status === 'due' ? (
                        <div className="space-y-2">
                          <AdminForm
                            action={settleLedgerAction.bind(null, r.id, 'paid')}
                            submitLabel="Mark paid"
                            layout="row"
                            confirm={`Record ${formatLkr(r.totalDue)} from ${r.tenantName} for ${r.period} as paid? This adds a new ledger entry and cannot be undone.`}
                          >
                            <label className="adm-field" style={{ flex: 1 }}>
                              <span className="sr-only">Payment note</span>
                              <input className="adm-input" name="note" placeholder="e.g. PayHere ref or bank slip" maxLength={300} />
                            </label>
                          </AdminForm>
                          <AdminForm
                            action={settleLedgerAction.bind(null, r.id, 'void')}
                            submitLabel="Void"
                            variant="danger"
                            layout="row"
                            confirm={`Void ${r.period} for ${r.tenantName}? This adds a new entry; the original stays in the history.`}
                          >
                            <label className="adm-field" style={{ flex: 1 }}>
                              <span className="sr-only">Reason for voiding</span>
                              <input className="adm-input" name="note" placeholder="Reason (required)" maxLength={300} />
                            </label>
                          </AdminForm>
                        </div>
                      ) : (
                        <span className="adm-help">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
                  </td>
                  <td className="num">{formatLkr(sum('subscriptionFee'))}</td>
                  <td className="num">{formatLkr(sum('pctFee'))}</td>
                  <td className="num">{formatLkr(sum('addOnCommission'))}</td>
                  <td className="num">{formatLkr(sum('totalDue'))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
