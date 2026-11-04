import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleAlert, CircleCheck, ClipboardCheck, FileText, LogIn, LogOut, MessageCircle, XCircle } from 'lucide-react';
import type { OwnerDashboard } from '@staydirect/shared';
import { BookingList } from '@/components/owner/BookingList';
import { Section } from '@/components/owner/fields';
import { fmtDate, fmtDateTime, money, SOURCE_LABEL } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import type { Conversation, Task } from '@/lib/owner-types';
import type { ChannelConnection } from '@/lib/owner-r3';

export default async function DashboardPage() {
  const property = await currentProperty();
  if (!property) return null;
  const d = await ownerApi<OwnerDashboard>(`/properties/${property.id}/dashboard`);
  const [convs, tasks, channel] = await Promise.all([
    ownerApi<Conversation[]>(`/properties/${property.id}/conversations`),
    ownerApi<Task[]>(`/properties/${property.id}/tasks?from=${d.today}&to=${d.today}`),
    ownerApi<ChannelConnection | null>(`/properties/${property.id}/channel`).catch(() => null),
  ]);
  const live = channel && channel.status !== 'paused' ? channel : null;
  const needsYou = convs.filter((c) => c.status === 'needs_human' || (c.unreadCount > 0 && c.status !== 'closed'));
  const tasksDone = tasks.filter((t) => t.status === 'done' || t.status === 'skipped').length;
  const failing = d.syncHealth.filter((s) => s.consecutiveFailures > 0 || s.lastStatus === 'error');

  const unpaidTotal = d.unpaidBalances.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{fmtDate(d.today)}</p>
        <h1 className="text-2xl font-semibold">Today</h1>
      </div>

      {(d.openConflicts.length > 0 || failing.length > 0 || d.pendingSlips > 0) && (
        <div className="space-y-2" role="status">
          {d.openConflicts.length > 0 && (
            <Link href="/owner/conflicts" className="flex min-h-12 items-center gap-3 rounded-xl border border-bad/40 bg-bad-bg p-3 text-sm font-medium text-bad">
              <AlertTriangle aria-hidden className="h-5 w-5 shrink-0" />
              {d.openConflicts.length} double-booked night{d.openConflicts.length === 1 ? '' : 's'}. Resolve now
            </Link>
          )}
          {failing.length > 0 && (
            <Link href="/owner/sync" className="flex min-h-12 items-center gap-3 rounded-xl border border-bad/40 bg-bad-bg p-3 text-sm font-medium text-bad">
              <XCircle aria-hidden className="h-5 w-5 shrink-0" />
              Calendar sync failing for {failing.map((s) => `${s.roomName} (${SOURCE_LABEL[s.channel]})`).join(', ')}
            </Link>
          )}
          {d.pendingSlips > 0 && (
            <Link href="/owner/bookings?status=pending,confirmed" className="flex min-h-12 items-center gap-3 rounded-xl border border-warn/40 bg-warn-bg p-3 text-sm font-medium text-warn">
              <FileText aria-hidden className="h-5 w-5 shrink-0" />
              {d.pendingSlips} payment slip{d.pendingSlips === 1 ? '' : 's'} to confirm
            </Link>
          )}
        </div>
      )}

      <nav aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Glance href="#arriving" icon={LogIn} value={d.arrivalsToday.length} label="arriving" />
        <Glance href="#leaving" icon={LogOut} value={d.departuresToday.length} label="leaving" />
        <Glance
          href="#unpaid"
          icon={d.unpaidBalances.length ? CircleAlert : CircleCheck}
          value={d.unpaidBalances.length ? money(unpaidTotal, d.currency) : 'All paid'}
          label={d.unpaidBalances.length ? `owed on ${d.unpaidBalances.length} booking${d.unpaidBalances.length === 1 ? '' : 's'}` : 'no balances due'}
          tone={d.unpaidBalances.length ? 'bad' : 'ok'}
        />
        <Glance
          href="/owner/inbox"
          icon={MessageCircle}
          value={needsYou.length}
          label={needsYou.length === 1 ? 'guest needs a reply' : 'guests need a reply'}
          tone={needsYou.length ? 'bad' : undefined}
        />
      </nav>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="arriving" title={`Arriving today (${d.arrivalsToday.length})`}>
          <BookingList rows={d.arrivalsToday} empty="No arrivals today." />
        </Section>
        <Section id="leaving" title={`Leaving today (${d.departuresToday.length})`}>
          <BookingList rows={d.departuresToday} empty="No departures today." />
        </Section>
        <Section id="unpaid" title={`Unpaid balances (${d.unpaidBalances.length})`}>
          <BookingList rows={d.unpaidBalances} empty="Everyone has paid." />
        </Section>
        {d.pendingApproval.length > 0 && (
          <Section title={`Requests to approve (${d.pendingApproval.length})`}>
            <BookingList rows={d.pendingApproval} />
          </Section>
        )}
        <Link href="/owner/tasks" className="card flex min-h-14 items-center gap-3 p-4 hover:border-brand lg:col-span-2">
          <ClipboardCheck aria-hidden className={`h-6 w-6 shrink-0 ${tasks.length && tasksDone === tasks.length ? 'text-ok' : 'text-brand'}`} />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">
              {tasksDone} of {tasks.length} tasks done today
            </span>
            {tasks.length > 0 && (
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span className="block h-full bg-ok" style={{ width: `${Math.round((tasksDone / tasks.length) * 100)}%` }} />
              </span>
            )}
          </span>
        </Link>
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
        {live && (
          <p className="mb-2 flex items-center gap-3 border-b border-line pb-2 text-sm">
            {live.status === 'error' || live.lastError ? (
              <XCircle aria-label="Failing" className="h-5 w-5 shrink-0 text-bad" />
            ) : (
              <CheckCircle2 aria-label="Healthy" className="h-5 w-5 shrink-0 text-ok" />
            )}
            <span className="flex-1">Live connection · {live.channels.map((c) => SOURCE_LABEL[c] ?? c).join(', ')}</span>
            <span className={live.status === 'error' || live.lastError ? 'text-bad' : 'text-muted'}>
              {live.lastError ? live.lastError : live.lastPushAt ? `Pushed ${fmtDateTime(live.lastPushAt)}` : 'First push pending'}
            </span>
          </p>
        )}
        {d.syncHealth.length === 0 && live ? null : d.syncHealth.length === 0 ? (
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

function Glance({ href, icon: Icon, value, label, tone }: { href: string; icon: typeof LogIn; value: number | string; label: string; tone?: 'ok' | 'bad' }) {
  const color = tone === 'bad' ? 'text-bad' : tone === 'ok' ? 'text-ok' : 'text-fg';
  return (
    <Link
      href={href}
      className={`card flex min-h-20 flex-col justify-between gap-1 p-4 hover:border-brand ${tone === 'bad' ? 'border-bad/40' : ''}`}
    >
      <Icon aria-hidden className={`h-5 w-5 ${tone ? color : 'text-brand'}`} />
      <span>
        <span className={`block text-xl font-semibold tabular-nums ${color}`}>{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </span>
    </Link>
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
