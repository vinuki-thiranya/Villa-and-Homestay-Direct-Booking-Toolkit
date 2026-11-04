import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { fmtDateTime } from '@/lib/format';
import { ownerApi } from '@/lib/owner';
import { TICKET_STATUS, type Ticket } from '@/lib/owner-r3';
import { createTicketAction } from '../../actions-r3';

export const metadata = { title: 'Support' };


/** Support tickets with the StayDirect team (WhatsApp support hours 7 am–10 pm, spec §9). */
export default async function SupportPage() {
  const tickets = await ownerApi<Ticket[]>('/support/tickets');
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Support</h1>
      <Section title="Your conversations with us">
        {tickets.length === 0 ? (
          <Empty>No tickets yet. Ask us anything below; we reply between 7 am and 10 pm.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/owner/support/${t.id}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {t.subject} {t.priority === 'urgent' && <span className="pill bg-bad-bg text-bad">Urgent</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{t.lastMessage}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className={`pill ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
                    <span className="mt-1 block text-muted">{fmtDateTime(t.updatedAt)}</span>
                  </div>
                  <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Ask for help">
        <ActionForm action={createTicketAction} submitLabel="Send to StayDirect">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label="Subject" name="subject" required minLength={3} maxLength={160} placeholder="PayHere payments not showing" />
            <Select
              label="How urgent?"
              name="priority"
              options={[
                ['normal', 'Normal'],
                ['urgent', 'Urgent — guests affected now'],
                ['low', 'Whenever you can'],
              ]}
            />
          </div>
          <TextArea label="What happened?" name="body" required rows={4} />
        </ActionForm>
      </Section>
    </div>
  );
}
