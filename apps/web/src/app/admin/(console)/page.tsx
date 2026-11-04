import Link from 'next/link';
import { adminApi, type AdminOverview, type AdminTenantRow, type TicketRow } from '@/lib/admin';
import { formatDateTime, formatLkr, PLAN_LABELS } from '@/lib/admin-format';

export const metadata = { title: 'Overview' };

export default async function AdminOverviewPage() {
  const [o, tenants, tickets] = await Promise.all([
    adminApi<AdminOverview>('/admin/overview'),
    adminApi<AdminTenantRow[]>('/admin/tenants'),
    adminApi<TicketRow[]>('/admin/tickets?status=open'),
  ]);
  const figures: { label: string; value: string | number; href?: string; attention?: boolean }[] = [
    { label: 'Tenants', value: o.tenants, href: '/admin/tenants' },
    { label: 'Properties', value: o.properties, href: '/admin/tenants' },
    { label: 'Billing issues', value: o.billingIssues, href: '/admin/tenants?filter=billing', attention: o.billingIssues > 0 },
    { label: 'Calendars failing', value: o.syncFailures, href: '/admin/tenants?filter=sync', attention: o.syncFailures > 0 },
    { label: 'Open tickets', value: o.openTickets, href: '/admin/tickets?status=open', attention: o.openTickets > 0 },
    { label: 'Owed to StayDirect', value: formatLkr(o.owedLkr), href: '/admin/ledger?status=due' },
    { label: 'Direct bookings, 30 days', value: o.directBookings30d },
  ];
  // What a person should look at first: failing calendars, unpaid bills, urgent tickets.
  const attention = tenants.filter((t) => t.syncFailures > 0 || ['grace', 'suspended'].includes(t.billingStatus) || t.openTickets > 0);
  const urgent = tickets.filter((t) => t.priority === 'urgent');

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Overview</h1>
          <p>Every StayDirect property at a glance. Figures marked as needing attention link to the tenants involved.</p>
        </div>
      </header>

      <dl className="adm-figures">
        {figures.map((f) => {
          const inner = (
            <>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
              {f.attention && <span className="flag">Needs attention</span>}
            </>
          );
          return f.href ? (
            <Link key={f.label} href={f.href} className="adm-figure" data-attention={f.attention}>
              {inner}
            </Link>
          ) : (
            <div key={f.label} className="adm-figure">
              {inner}
            </div>
          );
        })}
      </dl>

      <div className="adm-grid-2" style={{ marginTop: 16 }}>
        <section className="adm-panel" aria-labelledby="att">
          <div className="adm-panel-head">
            <h2 id="att">Tenants needing attention</h2>
            <p>{attention.length} of {tenants.length}</p>
          </div>
          {attention.length === 0 ? (
            <p className="adm-empty">Nothing needs attention: calendars sync, bills are paid and no tickets are open.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Tenant</th>
                    <th scope="col">Plan</th>
                    <th scope="col">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/admin/tenants/${t.id}`}>{t.name}</Link>
                      </td>
                      <td>{PLAN_LABELS[t.plan] ?? t.plan}</td>
                      <td className="flex flex-wrap gap-x-3 gap-y-1">
                        {t.syncFailures > 0 && <span className="adm-mark" data-tone="bad">{t.syncFailures} calendar{t.syncFailures === 1 ? '' : 's'} failing</span>}
                        {['grace', 'suspended'].includes(t.billingStatus) && <span className="adm-mark" data-tone="warn">Billing {t.billingStatus}</span>}
                        {t.openTickets > 0 && <span className="adm-mark" data-tone="act">{t.openTickets} open ticket{t.openTickets === 1 ? '' : 's'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-panel" aria-labelledby="tix">
          <div className="adm-panel-head">
            <h2 id="tix">Open tickets</h2>
            <p>{urgent.length ? `${urgent.length} urgent` : 'None urgent'}</p>
          </div>
          {tickets.length === 0 ? (
            <p className="adm-empty">No open tickets.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Subject</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 8).map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/admin/tickets/${t.id}`}>{t.subject}</Link>
                        {t.priority === 'urgent' && (
                          <>
                            {' '}
                            <span className="adm-mark" data-tone="bad">Urgent</span>
                          </>
                        )}
                      </td>
                      <td>{t.tenantName}</td>
                      <td className="num">{formatDateTime(t.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
