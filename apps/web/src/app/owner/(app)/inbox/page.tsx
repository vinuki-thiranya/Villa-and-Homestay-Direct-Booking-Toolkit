import Link from 'next/link';
import { Bot, Clock, UserRound } from 'lucide-react';
import { AutoRefresh } from '@/components/owner/AutoRefresh';
import { Empty } from '@/components/owner/fields';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { LANGUAGE_LABEL, type Conversation } from '@/lib/owner-types';

export async function generateMetadata() {
  return { title: (await getT())('inbox.title') };
}

const FILTERS = [
  ['', 'all'],
  ['needs_human', 'needs_human'],
  ['open', 'open'],
  ['closed', 'closed'],
] as const;

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const property = await currentProperty();
  if (!property) return null;
  const { status = '' } = await searchParams;
  const [convs, t] = await Promise.all([
    ownerApi<Conversation[]>(`/properties/${property.id}/conversations${status ? `?status=${status}` : ''}`),
    getT(),
  ]);

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={15} />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('inbox.title')}</h1>
        <Link href="/owner/setup/concierge" className="text-sm font-medium text-brand">
          {t('inbox.conciergeLink')}
        </Link>
      </div>
      <nav aria-label={t('inbox.filterLabel')} className="flex gap-2 overflow-x-auto">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/owner/inbox?status=${value}` : '/owner/inbox'}
            aria-current={status === value ? 'page' : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${status === value ? 'bg-brand text-brand-fg' : 'border border-line text-muted hover:bg-surface-2'}`}
          >
            {t(`inbox.filters.${label}`)}
          </Link>
        ))}
      </nav>

      {convs.length === 0 ? (
        <Empty>
          {t('inbox.empty')}
        </Empty>
      ) : (
        <ul className="card divide-y divide-line">
          {convs.map((c) => (
            <li key={c.id}>
              <Link href={`/owner/inbox/${c.id}`} className="flex gap-3 px-4 py-3 hover:bg-surface-2/60">
                <span aria-hidden className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate ${c.unreadCount ? 'font-semibold' : 'font-medium'}`}>{c.contactName || c.contact}</p>
                    {c.status === 'needs_human' && <span className="pill bg-bad-bg text-bad">{t('inbox.needsYou')}</span>}
                    {c.status === 'closed' && <span className="pill bg-surface-2 text-muted">{t('inbox.resolved')}</span>}
                    {c.unreadCount > 0 && (
                      <span className="pill bg-brand text-brand-fg">
                        {c.unreadCount}
                        <span className="sr-only"> {t('inbox.unread')}</span>
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-xs text-muted">{t.dateTime(c.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-sm text-muted">{c.escalationSummary && c.status === 'needs_human' ? c.escalationSummary : (c.lastMessage ?? '')}</p>
                  <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                    <span>{LANGUAGE_LABEL[c.language] ?? c.language}</span>
                    <span className="inline-flex items-center gap-1">
                      <Bot aria-hidden className="h-3.5 w-3.5" /> {c.aiPaused ? t('inbox.aiPaused') : t('inbox.aiOn')}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${c.windowOpen ? 'text-ok' : ''}`}>
                      <Clock aria-hidden className="h-3.5 w-3.5" /> {c.windowOpen ? t('inbox.canReply') : t('inbox.windowClosed')}
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
