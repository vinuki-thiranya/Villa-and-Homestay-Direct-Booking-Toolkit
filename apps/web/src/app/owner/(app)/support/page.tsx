import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { TICKET_STATUS, type Ticket } from '@/lib/owner-r3';
import { createTicketAction } from '../../actions-r3';

export async function generateMetadata() {
  return { title: (await getT())('support.title') };
}

/** Support tickets with the StayDirect team (WhatsApp support hours 7 am–10 pm, spec §9). */
export default async function SupportPage() {
  const [tickets, t] = await Promise.all([ownerApi<Ticket[]>('/support/tickets'), getT()]);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t('support.title')}</h1>
      <Section title={t('support.conversations')}>
        {tickets.length === 0 ? (
          <Empty>{t('support.empty')}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/owner/support/${ticket.id}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {ticket.subject} {ticket.priority === 'urgent' && <span className="pill bg-bad-bg text-bad">{t('support.urgent')}</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{ticket.lastMessage}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className={`pill ${TICKET_STATUS[ticket.status].cls}`}>{t(`support.status.${ticket.status}`)}</span>
                    <span className="mt-1 block text-muted">{t.dateTime(ticket.updatedAt)}</span>
                  </div>
                  <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title={t('support.ask')}>
        <ActionForm action={createTicketAction} submitLabel={t('support.send')}>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label={t('support.subject')} name="subject" required minLength={3} maxLength={160} placeholder={t('support.subjectPlaceholder')} />
            <Select
              label={t('support.priority')}
              name="priority"
              options={[
                ['normal', t('support.priorityNormal')],
                ['urgent', t('support.priorityUrgent')],
                ['low', t('support.priorityLow')],
              ]}
            />
          </div>
          <TextArea label={t('support.body')} name="body" required rows={4} />
        </ActionForm>
      </Section>
    </div>
  );
}
