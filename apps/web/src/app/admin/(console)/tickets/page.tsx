import Link from 'next/link';
import { adminApi, type TicketRow } from '@/lib/admin';
import { formatDateTime } from '@/lib/admin-format';

export const metadata = { title: 'Support tickets' };

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Waiting on owner' },
  { key: 'closed', label: 'Closed' },
  { key: '', label: 'All' },
] as const;

const statusTone = (s: string) => (s === 'open' ? 'act' : s === 'pending' ? 'warn' : 'muted');
const statusLabel = (s: string) => (s === 'pending' ? 'waiting on owner' : s);

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'open' } = await searchParams;
  const rows = await adminApi<TicketRow[]>(`/admin/tickets${status ? `?status=${status}` : ''}`);
  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Support tickets</h1>
          <p>Owners write from their app. Urgent tickets come first. WhatsApp support hours are 7 am to 10 pm.</p>
        </div>
        <div className="adm-segment" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => (
            <Link key={s.key} href={`/admin/tickets?status=${s.key}`} aria-current={status === s.key ? 'true' : undefined}>
              {s.label}
            </Link>
          ))}
        </div>
      </header>
      <section className="adm-panel">
        {rows.length === 0 ? (
          <p className="adm-empty">No {status ? statusLabel(status) : ''} tickets.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Tenant</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last message</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/tickets/${t.id}`}>{t.subject}</Link>
                    </td>
                    <td>
                      <Link href={`/admin/tenants/${t.tenantId}`}>{t.tenantName}</Link>
                    </td>
                    <td>
                      <span className="adm-mark" data-tone={t.priority === 'urgent' ? 'bad' : t.priority === 'low' ? 'muted' : 'act'}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className="adm-mark" data-tone={statusTone(t.status)}>
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className="adm-help" style={{ maxWidth: 360 }}>
                      {t.lastMessage ? (t.lastMessage.length > 120 ? `${t.lastMessage.slice(0, 120)}…` : t.lastMessage) : '—'}
                    </td>
                    <td className="num">{formatDateTime(t.updatedAt)}</td>
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
