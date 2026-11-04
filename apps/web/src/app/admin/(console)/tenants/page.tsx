import Link from 'next/link';
import { adminApi, type AdminTenantRow } from '@/lib/admin';
import { formatDate, formatLkr, PLAN_LABELS } from '@/lib/admin-format';

export const metadata = { title: 'Tenants' };

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'billing', label: 'Billing issues' },
  { key: 'sync', label: 'Calendars failing' },
  { key: 'owed', label: 'Money owed' },
  { key: 'tickets', label: 'Open tickets' },
] as const;

function billingTone(status: string) {
  return status === 'active' ? 'ok' : status === 'trial' ? 'act' : status === 'grace' ? 'warn' : 'bad';
}

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ search?: string; filter?: string }> }) {
  const { search = '', filter = '' } = await searchParams;
  const all = await adminApi<AdminTenantRow[]>(`/admin/tenants${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  const rows = all.filter((t) => {
    if (filter === 'billing') return ['grace', 'suspended'].includes(t.billingStatus);
    if (filter === 'sync') return t.syncFailures > 0;
    if (filter === 'owed') return Number(t.owedLkr) > 0;
    if (filter === 'tickets') return t.openTickets > 0;
    return true;
  });
  const qs = (f: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (f) p.set('filter', f);
    return p.size ? `?${p}` : '';
  };

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Tenants</h1>
          <p>Owners and caretaker companies using StayDirect, with their plan, billing state and health.</p>
        </div>
        <form className="flex items-end gap-2" role="search">
          <label className="adm-field" style={{ minWidth: 220 }}>
            <span>Search by name</span>
            <input className="adm-input" name="search" defaultValue={search} type="search" />
          </label>
          {filter && <input type="hidden" name="filter" value={filter} />}
          <button className="adm-btn adm-btn-quiet" type="submit">
            Search
          </button>
        </form>
      </header>

      <div className="adm-segment" role="group" aria-label="Filter tenants" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/tenants${qs(f.key)}`} aria-current={filter === f.key ? 'true' : undefined}>
            {f.label}
          </Link>
        ))}
      </div>

      <section className="adm-panel">
        {rows.length === 0 ? (
          <p className="adm-empty">No tenants match{search ? ` "${search}"` : ''}{filter ? ' with this filter' : ''}.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Tenant</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Billing</th>
                  <th scope="col" className="num">Properties</th>
                  <th scope="col">Calendars</th>
                  <th scope="col" className="num">Owed</th>
                  <th scope="col" className="num">Open tickets</th>
                  <th scope="col">Owner phone</th>
                  <th scope="col">Since</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/tenants/${t.id}`}>{t.name}</Link>
                      {t.type === 'manager_company' && <div className="adm-help">Caretaker company</div>}
                    </td>
                    <td>{PLAN_LABELS[t.plan] ?? t.plan}</td>
                    <td>
                      <span className="adm-mark" data-tone={billingTone(t.billingStatus)}>
                        {t.billingStatus}
                      </span>
                      <div className="adm-help">{t.billingModel === 'pct' ? '% of direct bookings' : 'Flat monthly'}</div>
                    </td>
                    <td className="num">{t.properties}</td>
                    <td>
                      {t.syncFailures > 0 ? (
                        <span className="adm-mark" data-tone="bad">
                          {t.syncFailures} failing
                        </span>
                      ) : (
                        <span className="adm-mark" data-tone="ok">
                          Syncing
                        </span>
                      )}
                    </td>
                    <td className="num">{Number(t.owedLkr) > 0 ? formatLkr(t.owedLkr) : '—'}</td>
                    <td className="num">{t.openTickets || '—'}</td>
                    <td>{t.ownerPhone ? <a href={`tel:${t.ownerPhone}`}>{t.ownerPhone}</a> : '—'}</td>
                    <td>{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
