import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { Empty } from '@/components/owner/fields';
import type { Translator } from '@/i18n/owner/t';
import { money } from '@/lib/format';
import { getT } from '@/lib/owner-i18n';
import { getMe, ownerTry, type PortfolioRow } from '@/lib/owner-r3';
import { openPropertyAction } from '../../actions-r3';

export async function generateMetadata() {
  return { title: (await getT())('portfolio.title') };
}

/** Every property at a glance (Pro Multi / Manager): what needs attention today, per property. */
export default async function PortfolioPage() {
  const [me, res, t] = await Promise.all([getMe(), ownerTry<PortfolioRow[]>('/portfolio'), getT()]);
  const rows = res.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('portfolio.title')}</h1>
        {rows.length > 1 && (
          <Link href="/owner/portfolio/calendar" className="btn-secondary min-h-11 px-4">
            {t('portfolio.calendarForAll')}
          </Link>
        )}
      </div>
      {!me.flags.multi_property && rows.length <= 1 && <UpgradeNote feature="multi_property" />}
      {rows.length === 0 ? (
        <Empty>{t('portfolio.empty')}</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const attention = p.conflicts + p.syncFailures + p.needsReply + p.pendingApproval;
            return (
              <li key={p.propertyId} className="card">
                <form action={openPropertyAction.bind(null, p.propertyId)}>
                  <button className="flex w-full items-start gap-3 p-4 text-left hover:bg-surface-2/60" aria-label={t('portfolio.open', { name: p.name })}>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{p.name}</p>
                        {attention > 0 && (
                          <span className="pill bg-bad-bg text-bad">
                            <AlertTriangle aria-hidden className="mr-1 h-3.5 w-3.5" />
                            {t.n('portfolio.needsYou', attention)}
                          </span>
                        )}
                      </div>
                      <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm sm:grid-cols-6">
                        <Metric label={t('portfolio.arrive')} value={p.arrivals} />
                        <Metric label={t('portfolio.leave')} value={p.departures} />
                        <Metric
                          label={t('portfolio.tonight')}
                          value={`${p.occupancyTonightPct}%`}
                          hint={t('portfolio.roomsHint', { occupied: p.occupiedTonight, rooms: p.rooms })}
                        />
                        <Metric label={t('portfolio.tasks')} value={p.openTasks} />
                        <Metric
                          label={t('portfolio.unpaid')}
                          value={p.unpaid > 0 ? money(p.unpaid, p.currency) : t('portfolio.none')}
                          tone={p.unpaid > 0 ? 'bad' : 'ok'}
                        />
                        <Metric label={t('portfolio.replies')} value={p.needsReply} tone={p.needsReply > 0 ? 'bad' : undefined} />
                      </dl>
                      {(p.syncFailures > 0 || p.conflicts > 0 || p.pendingApproval > 0) && (
                        <p className="text-sm text-bad">
                          {problems(t, p)}
                        </p>
                      )}
                    </div>
                    <ChevronRight aria-hidden className="mt-1 h-5 w-5 shrink-0 text-muted" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function problems(t: Translator, p: PortfolioRow): string {
  return [
    p.conflicts > 0 && t.n('portfolio.conflicts', p.conflicts),
    p.syncFailures > 0 && t.n('portfolio.syncFailing', p.syncFailures),
    p.pendingApproval > 0 && t.n('portfolio.toApprove', p.pendingApproval),
  ]
    .filter(Boolean)
    .join(', ');
}

function Metric({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'ok' | 'bad' }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-semibold tabular-nums ${tone === 'bad' ? 'text-bad' : tone === 'ok' ? 'text-ok' : ''}`} title={hint}>
        {value}
      </dd>
    </div>
  );
}
