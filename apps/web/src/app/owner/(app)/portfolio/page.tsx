import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { Empty } from '@/components/owner/fields';
import { money } from '@/lib/format';
import { getMe, ownerTry, type PortfolioRow } from '@/lib/owner-r3';
import { openPropertyAction } from '../../actions-r3';

export const metadata = { title: 'All properties' };

/** Every property at a glance (Pro Multi / Manager): what needs attention today, per property. */
export default async function PortfolioPage() {
  const me = await getMe();
  const res = await ownerTry<PortfolioRow[]>('/portfolio');
  const rows = res.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">All properties</h1>
        {rows.length > 1 && (
          <Link href="/owner/portfolio/calendar" className="btn-secondary min-h-9 px-4">
            Calendar for all
          </Link>
        )}
      </div>
      {!me.flags.multi_property && rows.length <= 1 && <UpgradeNote feature="multi_property" />}
      {rows.length === 0 ? (
        <Empty>No properties yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const attention = p.conflicts + p.syncFailures + p.needsReply + p.pendingApproval;
            return (
              <li key={p.propertyId} className="card">
                <form action={openPropertyAction.bind(null, p.propertyId)}>
                  <button className="flex w-full items-start gap-3 p-4 text-left hover:bg-surface-2/60" aria-label={`Open ${p.name}`}>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{p.name}</p>
                        {attention > 0 && (
                          <span className="pill bg-bad-bg text-bad">
                            <AlertTriangle aria-hidden className="mr-1 h-3.5 w-3.5" />
                            {attention} need{attention === 1 ? 's' : ''} you
                          </span>
                        )}
                      </div>
                      <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm sm:grid-cols-6">
                        <Metric label="Arrive" value={p.arrivals} />
                        <Metric label="Leave" value={p.departures} />
                        <Metric label="Tonight" value={`${p.occupancyTonightPct}%`} hint={`${p.occupiedTonight}/${p.rooms} rooms`} />
                        <Metric label="Tasks" value={p.openTasks} />
                        <Metric label="Unpaid" value={p.unpaid > 0 ? money(p.unpaid, p.currency) : 'None'} tone={p.unpaid > 0 ? 'bad' : 'ok'} />
                        <Metric label="Replies" value={p.needsReply} tone={p.needsReply > 0 ? 'bad' : undefined} />
                      </dl>
                      {(p.syncFailures > 0 || p.conflicts > 0 || p.pendingApproval > 0) && (
                        <p className="text-sm text-bad">
                          {[
                            p.conflicts > 0 && `${p.conflicts} double-booking conflict${p.conflicts === 1 ? '' : 's'}`,
                            p.syncFailures > 0 && `${p.syncFailures} calendar${p.syncFailures === 1 ? '' : 's'} not syncing`,
                            p.pendingApproval > 0 && `${p.pendingApproval} request${p.pendingApproval === 1 ? '' : 's'} to approve`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
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
