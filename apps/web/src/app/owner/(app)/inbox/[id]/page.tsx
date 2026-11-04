import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, Bot } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { AutoRefresh } from '@/components/owner/AutoRefresh';
import { StatusBadge } from '@/components/owner/BookingList';
import { Composer } from '@/components/owner/Composer';
import { ApiError } from '@/lib/api';
import { fmtDateTime, fmtShort, waLink } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { LANGUAGE_LABEL, type QuickReply, type Thread } from '@/lib/owner-types';
import { updateConversationAction } from '../../../actions-r2';

export const metadata = { title: 'Conversation' };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await currentProperty();
  if (!property) return null;
  let t: Thread;
  try {
    t = await ownerApi<Thread>(`/conversations/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const c = t.conversation;
  let replies = await ownerApi<QuickReply[]>(`/properties/${property.id}/quick-replies?language=${c.language}`);
  if (replies.length === 0 && c.language !== 'en') replies = await ownerApi<QuickReply[]>(`/properties/${property.id}/quick-replies?language=en`);
  const wa = waLink(c.contact);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <AutoRefresh seconds={10} />
      <Link href="/owner/inbox" className="text-sm text-brand">
        ← Inbox
      </Link>

      <header className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">{c.contactName || c.contact}</h1>
            <p className="text-sm text-muted">
              {c.contact} · {LANGUAGE_LABEL[c.language] ?? c.language}
              {wa && (
                <>
                  {' · '}
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-2 hover:underline">
                    Open in WhatsApp
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionForm
              action={updateConversationAction.bind(null, c.id, { aiPaused: !c.aiPaused })}
              submitLabel={c.aiPaused ? 'Resume AI' : 'Pause AI'}
              variant="secondary"
              inline
            />
            {c.status === 'closed' ? (
              <ActionForm action={updateConversationAction.bind(null, c.id, { status: 'open' })} submitLabel="Reopen" variant="secondary" inline />
            ) : (
              <ActionForm action={updateConversationAction.bind(null, c.id, { status: 'closed' })} submitLabel="Mark resolved" inline />
            )}
          </div>
        </div>
        {c.status === 'needs_human' && c.escalationSummary && (
          <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad">
            <AlertTriangle aria-hidden className="h-5 w-5 shrink-0" />
            <span>
              The concierge handed this to you: {c.escalationSummary}
            </span>
          </p>
        )}
        {t.bookings.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {t.bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/owner/bookings/${b.id}`} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 hover:bg-surface-2">
                  {b.reference} · {b.roomName} · {fmtShort(b.from)}–{fmtShort(b.to)} <StatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      <ol aria-label="Messages" className="flex flex-col gap-2">
        {t.messages.map((m) => {
          const mine = m.direction === 'out';
          return (
            <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? 'rounded-br-md bg-brand text-brand-fg' : 'rounded-bl-md border border-line bg-surface'}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] ${mine ? 'text-brand-fg/80' : 'text-muted'}`}>
                  {m.aiGenerated && (
                    <>
                      <Bot aria-hidden className="h-3 w-3" />
                      <span>AI ·</span>
                    </>
                  )}
                  {m.sentBy === 'system' && <span>Automated ·</span>}
                  {fmtDateTime(m.createdAt)}
                  {mine && <span>· {m.status}</span>}
                </p>
                {m.error && <p className="mt-1 text-[11px] font-semibold">Failed: {m.error}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <Composer conversationId={c.id} windowOpen={c.windowOpen} quickReplies={replies} />
    </div>
  );
}
