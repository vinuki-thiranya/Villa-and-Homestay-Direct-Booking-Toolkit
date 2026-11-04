import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleAlert, CircleCheck, ClipboardCheck, FileText, Flower2, LogIn, LogOut, MessageCircle, XCircle } from 'lucide-react';
import type { Holiday, OwnerDashboard } from '@staydirect/shared';
import { BookingList } from '@/components/owner/BookingList';
import { Section } from '@/components/owner/fields';
import { tLabel } from '@/components/owner/labels';
import { PalaPethi } from '@/components/owner/motifs';
import type { Translator } from '@/i18n/owner/t';
import { money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getHolidays, getT } from '@/lib/owner-i18n';
import { getMe, type ChannelConnection } from '@/lib/owner-r3';
import type { Conversation, Task } from '@/lib/owner-types';

const plusDay = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Good morning / afternoon / evening by the clock in Sri Lanka. */
function greeting(t: Translator): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Colombo' }).format(new Date()));
  return hour < 12 ? t('common.greetingMorning') : hour < 17 ? t('common.greetingAfternoon') : t('common.greetingEvening');
}

export default async function DashboardPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [d, t, me] = await Promise.all([ownerApi<OwnerDashboard>(`/properties/${property.id}/dashboard`), getT(), getMe()]);
  const tomorrow = plusDay(d.today);
  const [convs, tasks, channel, holidays] = await Promise.all([
    ownerApi<Conversation[]>(`/properties/${property.id}/conversations`),
    ownerApi<Task[]>(`/properties/${property.id}/tasks?from=${d.today}&to=${d.today}`),
    ownerApi<ChannelConnection | null>(`/properties/${property.id}/channel`).catch(() => null),
    getHolidays(d.today, tomorrow),
  ]);
  const live = channel && channel.status !== 'paused' ? channel : null;
  const needsYou = convs.filter((c) => c.status === 'needs_human' || (c.unreadCount > 0 && c.status !== 'closed'));
  const tasksDone = tasks.filter((x) => x.status === 'done' || x.status === 'skipped').length;
  const failing = d.syncHealth.filter((s) => s.consecutiveFailures > 0 || s.lastStatus === 'error');
  const unpaidTotal = d.unpaidBalances.reduce((sum, b) => sum + b.balance, 0);
  const firstName = me.user.name.trim().split(/\s+/)[0];
  const monthLabel = t.month(d.today);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">
          {t.weekday(d.today)}, {t.date(d.today)}
        </p>
        <h1 className="text-2xl font-semibold">
          {firstName ? t('common.greetingWithName', { greeting: greeting(t), name: firstName }) : t('today.title')}
        </h1>
      </div>

      <HolidayNotice holidays={holidays} today={d.today} tomorrow={tomorrow} t={t} />

      {(d.openConflicts.length > 0 || failing.length > 0 || d.pendingSlips > 0) && (
        <div className="space-y-2" role="status">
          {d.openConflicts.length > 0 && (
            <Link href="/owner/conflicts" className="flex min-h-12 items-center gap-3 rounded-xl border border-bad/40 bg-bad-bg p-3 text-sm font-medium text-bad">
              <AlertTriangle aria-hidden className="h-5 w-5 shrink-0" />
              {t.n('today.conflicts', d.openConflicts.length)}
            </Link>
          )}
          {failing.length > 0 && (
            <Link href="/owner/sync" className="flex min-h-12 items-center gap-3 rounded-xl border border-bad/40 bg-bad-bg p-3 text-sm font-medium text-bad">
              <XCircle aria-hidden className="h-5 w-5 shrink-0" />
              {t('today.syncFailing', { list: failing.map((s) => `${s.roomName} (${tLabel(t, 'source', s.channel)})`).join(', ') })}
            </Link>
          )}
          {d.pendingSlips > 0 && (
            <Link href="/owner/bookings?status=pending,confirmed" className="flex min-h-12 items-center gap-3 rounded-xl border border-warn/40 bg-warn-bg p-3 text-sm font-medium text-warn">
              <FileText aria-hidden className="h-5 w-5 shrink-0" />
              {t.n('today.slips', d.pendingSlips)}
            </Link>
          )}
        </div>
      )}

      <nav aria-label={t('today.glance')} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Glance href="#arriving" icon={LogIn} value={d.arrivalsToday.length} label={t('today.arriving')} />
        <Glance href="#leaving" icon={LogOut} value={d.departuresToday.length} label={t('today.leaving')} />
        <Glance
          href="#unpaid"
          icon={d.unpaidBalances.length ? CircleAlert : CircleCheck}
          value={d.unpaidBalances.length ? money(unpaidTotal, d.currency) : t('today.allPaid')}
          label={d.unpaidBalances.length ? t.n('today.owedOn', d.unpaidBalances.length) : t('today.noBalances')}
          tone={d.unpaidBalances.length ? 'bad' : 'ok'}
        />
        <Glance
          href="/owner/inbox"
          icon={MessageCircle}
          value={needsYou.length}
          label={t.n('today.needReply', needsYou.length)}
          tone={needsYou.length ? 'bad' : undefined}
        />
      </nav>

      <PalaPethi lang={t.lang} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="arriving" title={t('today.arrivingToday', { n: d.arrivalsToday.length })}>
          <BookingList rows={d.arrivalsToday} empty={t('today.noArrivals')} />
        </Section>
        <Section id="leaving" title={t('today.leavingToday', { n: d.departuresToday.length })}>
          <BookingList rows={d.departuresToday} empty={t('today.noDepartures')} />
        </Section>
        <Section id="unpaid" title={t('today.unpaidBalances', { n: d.unpaidBalances.length })}>
          <BookingList rows={d.unpaidBalances} empty={t('today.everyonePaid')} />
        </Section>
        {d.pendingApproval.length > 0 && (
          <Section title={t('today.requests', { n: d.pendingApproval.length })}>
            <BookingList rows={d.pendingApproval} />
          </Section>
        )}
        <Link href="/owner/tasks" className="card flex min-h-14 items-center gap-3 p-4 hover:border-brand lg:col-span-2">
          <ClipboardCheck aria-hidden className={`h-6 w-6 shrink-0 ${tasks.length && tasksDone === tasks.length ? 'text-ok' : 'text-brand'}`} />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{t('today.tasksDone', { done: tasksDone, total: tasks.length })}</span>
            {tasks.length > 0 && (
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span className="block h-full bg-ok" style={{ width: `${Math.round((tasksDone / tasks.length) * 100)}%` }} />
              </span>
            )}
          </span>
        </Link>
        <Section title={t('today.next14')}>
          <BookingList rows={d.upcomingArrivals} empty={t('today.noUpcoming')} />
        </Section>
      </div>

      <PalaPethi lang={t.lang} />

      <Section title={t('today.thisMonth', { month: monthLabel })}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={t('today.occupancy')} value={`${d.month.occupancyPct}%`} />
          <Stat label={t('today.adr')} value={money(d.month.adr, d.currency)} />
          <Stat label={t('today.directRevenue')} value={money(d.month.directRevenue, d.currency)} />
          <Stat label={t('today.commissionSaved')} value={money(d.month.commissionSaved, d.currency)} tone="ok" hint={t('today.commissionHint')} />
        </dl>
        <table className="mt-5 w-full text-sm">
          <caption className="sr-only">{t('today.revenueByChannel')}</caption>
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">{t('today.channel')}</th>
              <th className="py-1 text-right font-medium">{t('today.nights')}</th>
              <th className="py-1 text-right font-medium">{t('today.revenue')}</th>
            </tr>
          </thead>
          <tbody>
            {d.month.revenueBySource.map((r) => (
              <tr key={r.source} className="border-t border-line">
                <td className="py-2">{tLabel(t, 'source', r.source)}</td>
                <td className="py-2 text-right">{r.nights}</td>
                <td className="py-2 text-right">
                  {money(r.revenue, d.currency)}
                  {r.source !== 'direct' && <span className="text-muted"> {t('today.estimated')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">{t('today.otaEstimateNote')}</p>
      </Section>

      <Section
        title={t('today.calendarSync')}
        action={
          <Link href="/owner/sync" className="text-sm font-medium text-brand">
            {t('today.manage')}
          </Link>
        }
      >
        {live && (
          <p className="mb-2 flex items-center gap-3 border-b border-line pb-2 text-sm">
            {live.status === 'error' || live.lastError ? (
              <XCircle aria-label={t('today.failing')} className="h-5 w-5 shrink-0 text-bad" />
            ) : (
              <CheckCircle2 aria-label={t('today.healthy')} className="h-5 w-5 shrink-0 text-ok" />
            )}
            <span className="flex-1">{t('today.liveConnection', { channels: live.channels.map((c) => tLabel(t, 'source', c)).join(', ') })}</span>
            <span className={live.status === 'error' || live.lastError ? 'text-bad' : 'text-muted'}>
              {live.lastError ? live.lastError : live.lastPushAt ? t('today.pushed', { time: t.dateTime(live.lastPushAt) }) : t('today.firstPushPending')}
            </span>
          </p>
        )}
        {d.syncHealth.length === 0 && live ? null : d.syncHealth.length === 0 ? (
          <p className="text-sm text-muted">
            {t('today.noCalendars')}{' '}
            <Link href="/owner/sync" className="text-brand underline">
              {t('today.connectOta')}
            </Link>{' '}
            {t('today.toStopDoubles')}
          </p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {d.syncHealth.map((s) => {
              const bad = s.consecutiveFailures > 0 || s.lastStatus === 'error';
              return (
                <li key={s.sourceId} className="flex items-center gap-3 py-2">
                  {bad ? (
                    <XCircle aria-label={t('today.failing')} className="h-5 w-5 text-bad" />
                  ) : (
                    <CheckCircle2 aria-label={t('today.healthy')} className="h-5 w-5 text-ok" />
                  )}
                  <span className="flex-1">
                    {s.roomName} · {tLabel(t, 'source', s.channel)}
                  </span>
                  <span className={bad ? 'text-bad' : 'text-muted'}>
                    {bad ? t('today.failures', { n: s.consecutiveFailures }) : t('today.okAt', { time: t.dateTime(s.lastSuccessAt) })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** Poya day or public holiday today (and Poya tomorrow): what changes for the house. */
function HolidayNotice({ holidays, today, tomorrow, t }: { holidays: Holiday[]; today: string; tomorrow: string; t: Translator }) {
  const name = (h: Holiday) => (t.lang === 'si' ? h.nameSi : h.nameEn);
  const todays = holidays.filter((h) => h.date === today);
  const poyaToday = todays.find((h) => h.isPoya);
  const otherToday = todays.find((h) => !h.isPoya);
  const poyaTomorrow = holidays.find((h) => h.date === tomorrow && h.isPoya);
  if (!poyaToday && !otherToday && !poyaTomorrow) return null;
  return (
    <div className="space-y-2" role="note">
      {poyaToday && (
        <p className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn-bg p-3 text-sm text-warn">
          <Flower2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <strong className="block">{name(poyaToday)}</strong>
            {t('common.poyaNote')}
          </span>
        </p>
      )}
      {otherToday && (
        <p className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <Flower2 aria-hidden className="h-5 w-5 shrink-0 text-brand" />
          {t('common.holidayToday', { name: name(otherToday) })}
        </p>
      )}
      {!poyaToday && poyaTomorrow && (
        <p className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <Flower2 aria-hidden className="h-5 w-5 shrink-0 text-brand" />
          {t('common.poyaTomorrow', { name: name(poyaTomorrow) })}
        </p>
      )}
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
