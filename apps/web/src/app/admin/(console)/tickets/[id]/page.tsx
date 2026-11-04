import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm } from '@/components/admin/AdminForm';
import { ApiError } from '@/lib/api';
import { adminApi, type TicketThread } from '@/lib/admin';
import { formatDateTime } from '@/lib/admin-format';
import { replyTicketAction, ticketStatusAction } from '../../../actions';

export const metadata = { title: 'Ticket' };

const tone = (s: string) => (s === 'open' ? 'act' : s === 'pending' ? 'warn' : 'muted');
const label = (s: string) => (s === 'pending' ? 'waiting on owner' : s);

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: TicketThread;
  try {
    data = await adminApi<TicketThread>(`/admin/tickets/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const { ticket: t, messages } = data;
  return (
    <>
      <div className="adm-crumb">
        <Link href="/admin/tickets">Support tickets</Link> / {t.subject}
      </div>
      <header className="adm-head">
        <div>
          <h1>{t.subject}</h1>
          <p>
            <Link href={`/admin/tenants/${t.tenantId}`} style={{ color: 'var(--a-act)' }}>
              {t.tenantName}
            </Link>
            {', '}opened {formatDateTime(t.createdAt)}.{' '}
            <span className="adm-mark" data-tone={t.priority === 'urgent' ? 'bad' : 'muted'}>
              {t.priority} priority
            </span>{' '}
            <span className="adm-mark" data-tone={tone(t.status)}>
              {label(t.status)}
            </span>
          </p>
        </div>
        <AdminForm action={ticketStatusAction.bind(null, t.id)} submitLabel="Change status" variant="quiet" layout="row">
          <label className="adm-field">
            <span>Status</span>
            <select className="adm-select" name="status" defaultValue={t.status}>
              <option value="open">Open</option>
              <option value="pending">Waiting on owner</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </AdminForm>
      </header>

      <section className="adm-panel" aria-labelledby="thread">
        <div className="adm-panel-head">
          <h2 id="thread">Conversation</h2>
          <p>{messages.length} message{messages.length === 1 ? '' : 's'}</p>
        </div>
        <ol className="adm-thread">
          {messages.map((m, i) => (
            <li key={i} data-staff={m.fromStaff}>
              <div className="who">
                {m.fromStaff ? `StayDirect (${m.author.replace(/^admin:/, '')})` : 'Owner'}, {formatDateTime(m.createdAt)}
              </div>
              <div className="body">{m.body}</div>
            </li>
          ))}
        </ol>
        <div className="adm-panel-body">
          <AdminForm action={replyTicketAction.bind(null, t.id)} submitLabel="Send reply" pendingLabel="Sending…">
            <label className="adm-field">
              <span>Reply to the owner</span>
              <textarea className="adm-textarea" name="body" rows={4} required maxLength={5000} />
            </label>
            <p className="adm-help">Replying sets the ticket to waiting on owner. The owner sees it in their app.</p>
          </AdminForm>
        </div>
      </section>
    </>
  );
}
