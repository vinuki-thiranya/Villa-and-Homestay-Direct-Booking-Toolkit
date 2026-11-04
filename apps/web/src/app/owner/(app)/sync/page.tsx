import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Empty, Field, Section, Select } from '@/components/owner/fields';
import { tLabel } from '@/components/owner/labels';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { addIcalSourceAction, removeIcalSourceAction, syncNowAction } from '../../actions';

interface IcalSources {
  exports: { roomId: string; roomName: string; url: string }[];
  sources: {
    id: string;
    roomId: string;
    roomName: string;
    url: string;
    channel: string;
    lastFetchAt: string | null;
    lastSuccessAt: string | null;
    lastStatus: string | null;
    lastError: string | null;
    consecutiveFailures: number;
  }[];
}

const CHANNELS = ['airbnb', 'booking_com', 'agoda', 'vrbo', 'other'] as const;

export default async function SyncPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [data, t] = await Promise.all([ownerApi<IcalSources>(`/properties/${property.id}/ical-sources`), getT()]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('sync.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/owner/sync/live" className="btn-secondary">
            {t('sync.liveLink')}
          </Link>
          <ActionForm action={syncNowAction.bind(null, property.id)} submitLabel={t('sync.syncNow')} pendingLabel={t('sync.syncing')} inline />
        </div>
      </div>
      <p className="text-sm text-muted">{t('sync.intro')}</p>

      <Section title={t('sync.step1')}>
        <ul className="space-y-3">
          {data.exports.map((e) => (
            <li key={e.roomId}>
              <p className="text-sm font-medium">{e.roomName}</p>
              <div className="mt-1 flex gap-2">
                <input readOnly value={e.url} aria-label={t('sync.exportLink', { room: e.roomName })} className="field min-h-9 font-mono text-xs" />
                <CopyButton text={e.url} />
              </div>
            </li>
          ))}
        </ul>
        {/* Airbnb's and Booking.com's own (English) menu names, so owners can find them: marked as English. */}
        <p className="mt-3 text-xs text-muted" lang="en">
          {t('sync.howTo')}
        </p>
      </Section>

      <Section title={t('sync.step2')}>
        {data.sources.length === 0 ? (
          <Empty>{t('sync.noImports')}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {data.sources.map((s) => {
              const bad = s.consecutiveFailures > 0 || s.lastStatus === 'error';
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  {bad ? (
                    <XCircle aria-label={t('sync.failing')} className="h-5 w-5 text-bad" />
                  ) : (
                    <CheckCircle2 aria-label={t('sync.healthy')} className="h-5 w-5 text-ok" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s.roomName} · {tLabel(t, 'source', s.channel)}
                    </p>
                    <p className="truncate text-xs text-muted">{s.url}</p>
                    <p className={`text-xs ${bad ? 'text-bad' : 'text-muted'}`}>
                      {bad
                        ? t('sync.failedFetches', { n: s.consecutiveFailures, error: s.lastError ?? t('sync.unknownError') })
                        : s.lastSuccessAt
                          ? t('sync.lastSynced', { time: t.dateTime(s.lastSuccessAt) })
                          : t('sync.notSynced')}
                    </p>
                  </div>
                  <ActionForm
                    action={removeIcalSourceAction.bind(null, s.id)}
                    submitLabel={t('sync.remove')}
                    variant="danger"
                    inline
                    confirm={t('sync.removeConfirm')}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 border-t border-line pt-4">
          <ActionForm action={addIcalSourceAction} submitLabel={t('sync.addCalendar')}>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
              <Select label={t('sync.room')} name="roomId" options={data.exports.map((e) => [e.roomId, e.roomName])} />
              <Select label={t('sync.channel')} name="channel" options={CHANNELS.map((c) => [c, c === 'other' ? t('sync.other') : tLabel(t, 'source', c)] as [string, string])} />
              <Field label={t('sync.icalUrl')} name="url" type="url" required placeholder="https://www.airbnb.com/calendar/ical/…" />
            </div>
          </ActionForm>
        </div>
      </Section>
    </div>
  );
}
