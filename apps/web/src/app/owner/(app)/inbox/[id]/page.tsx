import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, Bot } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { AutoRefresh } from '@/components/owner/AutoRefresh';
import { StatusBadge } from '@/components/owner/BookingList';
import { Composer } from '@/components/owner/Composer';
import { ApiError } from '@/lib/api';
import type { OwnerKey } from '@/i18n/owner/t';
import { waLink } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { LANGUAGE_LABEL, type QuickReply, type Thread } from '@/lib/owner-types';
import { updateConversationAction } from '../../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('inbox.thread.title') };
}

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await currentProperty();
  if (!property) return null;
  const t = await getT();
  let thread: Thread;
  try {
    thread = await ownerApi<Thread>(`/conversations/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const c = thread.conversation;
  let replies = await ownerApi<QuickReply[]>(`/properties/${property.id}/quick-replies?language=${c.language}`);
  if (replies.length === 0 && c.language !== 'en') replies = await ownerApi<QuickReply[]>(`/properties/${property.id}/quick-replies?language=en`);
  const wa = waLink(c.contact);
  const statusLabel = (s: string) => {
    const key = `inbox.thread.status.${s}` as OwnerKey;
    return t(key) === key ? s : t(key);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <AutoRefresh seconds={10} />
      <Link href="/owner/inbox" className="text-sm text-brand">
        {t('inbox.thread.back')}
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
                    {t('inbox.thread.openWhatsapp')}
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionForm
              action={updateConversationAction.bind(null, c.id, { aiPaused: !c.aiPaused })}
              submitLabel={c.aiPaused ? t('inbox.thread.resumeAi') : t('inbox.thread.pauseAi')}
              variant="secondary"
              inline
            />
            {c.status === 'closed' ? (
              <ActionForm action={updateConversationAction.bind(null, c.id, { status: 'open' })} submitLabel={t('inbox.thread.reopen')} variant="secondary" inline />
            ) : (
              <ActionForm action={updateConversationAction.bind(null, c.id, { status: 'closed' })} submitLabel={t('inbox.thread.markResolved')} inline />
            )}
          </div>
        </div>
        {c.status === 'needs_human' && c.escalationSummary && (
          <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad">
            <AlertTriangle aria-hidden className="h-5 w-5 shrink-0" />
            <span>{t('inbox.thread.handedOver', { summary: c.escalationSummary })}</span>
          </p>
        )}
        {thread.bookings.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {thread.bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/owner/bookings/${b.id}`} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 hover:bg-surface-2">
                  {b.reference} · {b.roomName} · {t.short(b.from)}–{t.short(b.to)} <StatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      <ol aria-label={t('inbox.thread.messages')} className="flex flex-col gap-2">
        {thread.messages.map((m) => {
          const mine = m.direction === 'out';
          return (
            <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? 'rounded-br-md bg-brand text-brand-fg' : 'rounded-bl-md border border-line bg-surface'}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] ${mine ? 'text-brand-fg/80' : 'text-muted'}`}>
                  {m.aiGenerated && (
                    <>
                      <Bot aria-hidden className="h-3 w-3" />
                      <span>{t('inbox.thread.ai')}</span>
                    </>
                  )}
                  {m.sentBy === 'system' && <span>{t('inbox.thread.automated')}</span>}
                  {t.dateTime(m.createdAt)}
                  {mine && <span>· {statusLabel(m.status)}</span>}
                </p>
                {m.error && <p className="mt-1 text-[11px] font-semibold">{t('inbox.thread.failed', { error: m.error })}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <Composer conversationId={c.id} windowOpen={c.windowOpen} quickReplies={replies} />
    </div>
  );
}
