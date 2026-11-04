import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/owner/ActionForm';
import { TextArea } from '@/components/owner/fields';
import { getT } from '@/lib/owner-i18n';
import { ownerTry, TICKET_STATUS, type TicketThread } from '@/lib/owner-r3';
import { replyTicketAction } from '../../../actions-r3';

export async function generateMetadata() {
  return { title: (await getT())('support.ticketMeta') };
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, t] = await Promise.all([ownerTry<TicketThread>(`/support/tickets/${id}`), getT()]);
  if (!res.data) notFound();
  const { ticket, messages } = res.data;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/owner/support" className="text-sm text-brand">
        {t('support.back')}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-semibold">{ticket.subject}</h1>
        <span className={`pill ${TICKET_STATUS[ticket.status].cls}`}>{t(`support.status.${ticket.status}`)}</span>
      </div>
      <ol className="space-y-3">
        {messages.map((m, i) => (
          <li key={i} className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.fromStaff ? 'bg-surface-2' : 'ml-auto bg-brand/10'}`}>
            <p className="whitespace-pre-wrap">{m.body}</p>
            <p className="mt-1 text-xs text-muted">
              {m.fromStaff ? t('support.staff') : t('support.you')}, {t.dateTime(m.createdAt)}
            </p>
          </li>
        ))}
      </ol>
      <ActionForm action={replyTicketAction.bind(null, id)} submitLabel={ticket.status === 'closed' ? t('support.reopen') : t('support.reply')}>
        <TextArea label={t('support.yourReply')} name="body" required rows={3} />
      </ActionForm>
    </div>
  );
}
