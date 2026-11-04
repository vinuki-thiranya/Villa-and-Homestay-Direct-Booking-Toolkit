import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, MessageCircle, XCircle } from 'lucide-react';
import type { OwnerDashboard } from '@staydirect/shared';
import { BookingList } from '@/components/owner/BookingList';
import { Section } from '@/components/owner/fields';
import { fmtDate, fmtDateTime, money, SOURCE_LABEL } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import type { Conversation, Task } from '@/lib/owner-types';

export default async function DashboardPage() {
  const property = await currentProperty();
  if (!property) return null;
  const d = await ownerApi<OwnerDashboard>(`/properties/${property.id}/dashboard`);
  const [convs, tasks] = await Promise.all([
    ownerApi<Conversation[]>(`/properties/${property.id}/conversations`),
    ownerApi<Task[]>(`/properties/${property.id}/tasks?from=${d.today}&to=${d.today}`),
  ]);
  const needsYou = convs.filter((c) => c.status === 'needs_human' || (c.unreadCount > 0 && c.status !== 'closed'));
  const tasksDone = tasks.filter((t) => t.status === 'done' || t.status === 'skipped').length;
  const failing = d.syncHealth.filter((s) => s.consecutiveFailures > 0 || s.lastStatus === 'error');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted">{fmtDate(d.today)}</p>
          <h1 className="text-2xl font-semibold">Today</h1>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3">
        <Link href="/owner/inbox" className={`card flex items-center gap-3 p-4 hover:border-brand ${needsYou.length ? 'border-bad/50' : ''}`}>
          <MessageCircle aria-hidden className={`h-6 w-6 shrink-0 ${needsYou.length ? 'text-bad' : 'text-brand'}`} />
          <span>
            <span className="block text-xl font-semibold">{needsYou.length}</span>
            <span className="text-sm text-muted">{needsYou.length === 1 ? 'guest needs a reply' : 'guests need a reply'}</span>
          </span>
        </Link>
        <Link href="/owner/tasks" className="card flex items-center gap-3 p-4 hover:border-brand">
          <ClipboardCheck aria-hidden className={`h-6 w-6 shrink-0 ${tasks.length && tasksDone === tasks.length ? 'text-ok' : 'text-brand'}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-semibold">
              {tasksDone}/{tasks.length}
            </span>
            <span className="text-sm text-muted">tasks done today</span>
            {tasks.length > 0 && (
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span className="block h-full bg-ok" style={{ width: `${Math.round((tasksDone / tasks.length) * 100)}%` }} />
              </span>
            )}
          </span>
        </Link>
      </div>

      {(d.openConflicts.length > 0 || failing.length > 0 || d.pendingSlips > 0) && (
        <div className="space-y-2">
          {d.openConflicts.length > 0 && (
            <Link href="/owner/conflicts" className="flex items-center gap-3 rounded-xl border border-bad/40 bg-bad-bg p-3 text-sm font-medium text-bad">
              <AlertTriangle aria-hidden className="h-5 w-5 shrink-0" />
              {d.openConflicts.length} double-booked night{d.openConflicts.length === 1 ? '' : 's'} — act now
            </Link>
          )}
          {failing.length > 0 && (
            <Link href="/owner/sync" className="flex items-center gap-3 rounded-xl border border-bad/40 bg-bad-bg p-3 text-sm font-medium text-bad">
              <XCircle aria-hidden className="h-5 w-5 shrink-0" />
              Calendar sync failing for {failing.map((s) => `${s.roomName} (${SOURCE_LABEL[s.channel]})`).join(', ')}
            </Link>
          )}
          {d.pendingSlips > 0 && (
            <Link href="/owner/bookings?status=pending,confirmed" className="flex items-center gap-3 rounded-xl border border-warn/40 bg-warn-bg p-3 text-sm font-medium text-warn">
              <FileText aria-hidden className="h-5 w-5 shrink-0" />
              {d.pendingSlips} payment slip{d.pendingSlips === 1 ? '' : 's'} to confirm
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={`Arriving today (${d.arrivalsToday.length})`}>
          <BookingList rows={d.arrivalsToday} empty="No arrivals today." />
        </Section>
        <Section title={`Leaving today (${d.departuresToday.length})`}>
          <BookingList rows={d.departuresToday} empty="No departures today." />
        </Section>
        {d.pendingApproval.length > 0 && (
          <Section title={`Requests to approve (${d.pendingApproval.length})`}>
            <BookingList rows={d.pendingApproval} />
          </Section>
        )}
        <Section title={`Unpaid balances (${d.unpaidBalances.length})`}>
          <BookingList rows={d.unpaidBalances} empty="Everyone has paid. 🎉" />
        </Section>
        <Section title="Next 14 days">
          <BookingList rows={d.upcomingArrivals} empty="No arrivals in the next two weeks." />
        </Section>
      </div>

      <Section title={`This month · ${d.month.label}`}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Occupancy" value={`${d.month.occupancyPct}%`} />
          <Stat label="ADR (direct)" value={money(d.month.adr, d.currency)} />
          <Stat label="Direct revenue" value={money(d.month.directRevenue, d.currency)} />
          <Stat label="Commission saved" value={money(d.month.commissionSaved, d.currency)} tone="ok" hint="vs. 15% OTA commission" />
        </dl>
        <table className="mt-5 w-full text-sm">
          <caption className="sr-only">Revenue by channel</caption>
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Channel</th>
              <th className="py-1 text-right font-medium">Nights</th>
              <th className="py-1 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {d.month.revenueBySource.map((r) => (
              <tr key={r.source} className="border-t border-line">
                <td className="py-2">{SOURCE_LABEL[r.source] ?? r.source}</td>
                <td className="py-2 text-right">{r.nights}</td>
                <td className="py-2 text-right">
                  {money(r.revenue, d.currency)}
                  {r.source !== 'direct' && <span className="text-muted"> est.</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">OTA revenue is estimated at the room&apos;s base rate — iCal feeds don&apos;t include prices.</p>
      </Section>

      <Section title="Calendar sync" action={<Link href="/owner/sync" className="text-sm font-medium text-brand">Manage</Link>}>
        {d.syncHealth.length === 0 ? (
          <p className="text-sm text-muted">
            No OTA calendars connected yet. <Link href="/owner/sync" className="text-brand underline">Connect Airbnb or Booking.com</Link> to stop double bookings.
          </p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {d.syncHealth.map((s) => {
              const bad = s.consecutiveFailures > 0 || s.lastStatus === 'error';
              return (
                <li key={s.sourceId} className="flex items-center gap-3 py-2">
                  {bad ? <XCircle aria-label="Failing" className="h-5 w-5 text-bad" /> : <CheckCircle2 aria-label="Healthy" className="h-5 w-5 text-ok" />}
                  <span className="flex-1">
                    {s.roomName} · {SOURCE_LABEL[s.channel]}
                  </span>
                  <span className={bad ? 'text-bad' : 'text-muted'}>{bad ? `${s.consecutiveFailures} failure(s)` : `OK ${fmtDateTime(s.lastSuccessAt)}`}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: 'ok'; hint?: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-xl font-semibold ${tone === 'ok' ? 'text-ok' : ''}`}>{value}</dd>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
