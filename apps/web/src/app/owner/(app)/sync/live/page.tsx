import Link from 'next/link';
import { CheckCircle2, FlaskConical, PauseCircle, XCircle } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Field, Section, Select } from '@/components/owner/fields';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { tLabel } from '@/components/owner/labels';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { getMe, ownerTry, type ChannelConnection, type SimAri } from '@/lib/owner-r3';
import { channelStatusAction, channelSyncAction, connectChannelAction, simulateReservationAction } from '../../../actions-r3';

export async function generateMetadata() {
  return { title: (await getT())('sync.live.title') };
}

const DAYS = 30;

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Real-time two-way connection to Booking.com and Airbnb through a connectivity partner (spec §3.3 R3).
 * Availability goes out within a minute of any change; OTA bookings come in with guest details.
 */
export default async function LiveChannelPage() {
  const [me, t] = await Promise.all([getMe(), getT()]);
  const property = await currentProperty();
  if (!property) return null;
  if (!me.flags.ota_direct_api) {
    return (
      <div className="space-y-4">
        <Link href="/owner/sync" className="text-sm text-brand">
          {t('sync.live.back')}
        </Link>
        <UpgradeNote feature="ota_direct_api" message={t('sync.live.upgradeMessage')} />
      </div>
    );
  }
  const [conn, rooms] = await Promise.all([ownerApi<ChannelConnection | null>(`/properties/${property.id}/channel`), ownerApi<OwnerRoom[]>(`/properties/${property.id}/rooms`)]);
  const today = new Date().toISOString().slice(0, 10);
  const isDev = process.env.NODE_ENV !== 'production';
  const sim = conn && conn.partner === 'simulated' && isDev ? await ownerTry<SimAri[]>(`/properties/${property.id}/channel/simulator?from=${today}&to=${addDays(today, DAYS)}`) : null;
  const roomByCode = new Map(Object.entries(conn?.roomMap ?? {}).map(([roomId, code]) => [code, rooms.find((r) => r.id === roomId)?.name ?? code]));
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const simByKey = new Map((sim?.data ?? []).map((s) => [`${s.room_code}|${s.date.slice(0, 10)}`, s]));
  const healthy = conn && conn.status === 'active' && !conn.lastError;
  const wd = new Intl.DateTimeFormat(t.locale, { weekday: 'narrow', timeZone: 'UTC' });

  return (
    <div className="space-y-5">
      <Link href="/owner/sync" className="text-sm text-brand">
        {t('sync.live.back')}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('sync.live.title')}</h1>
        {conn && conn.status === 'active' && <ActionForm action={channelSyncAction.bind(null, property.id)} submitLabel={t('sync.syncNow')} pendingLabel={t('sync.syncing')} inline />}
      </div>

      {!conn ? (
        <Section title={t('sync.live.connectTitle')}>
          <p className="mb-3 text-sm text-muted">{t('sync.live.connectIntro')}</p>
          <ActionForm action={connectChannelAction.bind(null, property.id)} submitLabel={t('sync.live.connect')}>
            <div className="flex flex-wrap gap-x-4">
              <Check label="Booking.com" name="channels" value="booking_com" defaultChecked />
              <Check label="Airbnb" name="channels" value="airbnb" defaultChecked />
            </div>
            <p className="text-xs text-muted">{t('sync.live.partnerNote')}</p>
          </ActionForm>
        </Section>
      ) : (
        <Section title={t('sync.live.status')}>
          <div className="flex flex-wrap items-start gap-4">
            {conn.status === 'paused' ? (
              <PauseCircle aria-hidden className="h-8 w-8 text-warn" />
            ) : healthy ? (
              <CheckCircle2 aria-hidden className="h-8 w-8 text-ok" />
            ) : (
              <XCircle aria-hidden className="h-8 w-8 text-bad" />
            )}
            <dl className="grid flex-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <Row
                label={t('sync.live.state')}
                value={conn.status === 'paused' ? t('sync.live.paused') : healthy ? t('sync.live.connected') : t('sync.live.problem')} tone={conn.status === 'paused' ? 'warn' : healthy ? 'ok' : 'bad'} />
              <Row label={t('sync.live.channels')} value={conn.channels.map((c) => tLabel(t, 'source', c)).join(', ')} />
              <Row label={t('sync.live.lastSent')} value={conn.lastPushAt ? t.dateTime(conn.lastPushAt) : t('sync.live.notYet')} />
              <Row label={t('sync.live.lastCheck')} value={conn.lastPullAt ? t.dateTime(conn.lastPullAt) : t('sync.live.notYet')} />
              <Row
                label={t('sync.live.waiting')}
                value={conn.needsFullPush ? t('sync.live.fullCalendar') : t.n('sync.live.roomNights', conn.queued)}
              />
              <Row label={t('sync.live.partnerProperty')} value={conn.externalPropertyId} />
            </dl>
          </div>
          {conn.lastError && (
            <p role="alert" className="mt-3 rounded-xl bg-bad-bg p-3 text-sm text-bad">
              {t('sync.live.lastError', { error: conn.lastError })}
            </p>
          )}
          <div className="mt-4">
            {conn.status === 'paused' ? (
              <ActionForm action={channelStatusAction.bind(null, property.id, 'active')} submitLabel={t('sync.live.resume')} inline />
            ) : (
              <ActionForm
                action={channelStatusAction.bind(null, property.id, 'paused')}
                submitLabel={t('sync.live.pause')}
                variant="secondary"
                inline
                confirm={t('sync.live.pauseConfirm')}
              />
            )}
          </div>
        </Section>
      )}

      {conn && conn.partner === 'simulated' && isDev && (
        <section className="rounded-card border-2 border-dashed border-warn/60 p-4 sm:p-5" aria-labelledby="sim-title">
          <h2 id="sim-title" className="flex items-center gap-2 text-base font-semibold">
            <FlaskConical aria-hidden className="h-5 w-5 text-warn" /> {t('sync.live.sim.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('sync.live.sim.intro', { days: DAYS })}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-max border-collapse text-xs">
              <caption className="sr-only">{t('sync.live.sim.caption')}</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 min-w-28 bg-bg p-1 text-left">
                    {t('sync.room')}
                  </th>
                  {dates.map((d) => (
                    <th key={d} scope="col" className="w-8 p-0.5 text-center font-normal text-muted">
                      <span className="block">{wd.format(new Date(`${d}T00:00:00Z`))}</span>
                      <span className="block">{Number(d.slice(8))}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(conn.roomMap).map((code) => (
                  <tr key={code}>
                    <th scope="row" className="sticky left-0 bg-bg p-1 text-left font-medium">
                      {roomByCode.get(code)}
                    </th>
                    {dates.map((d) => {
                      const s = simByKey.get(`${code}|${d}`);
                      const label = s ? (s.availability > 0 ? t('sync.live.sim.open', { rate: s.rate ?? '' }) : t('sync.live.sim.closed')) : t('sync.live.sim.notSent');
                      return (
                        <td key={d} className="p-0.5">
                          <span
                            title={`${roomByCode.get(code)} ${d}: ${label}`}
                            aria-label={`${roomByCode.get(code)} ${d}: ${label}`}
                            className={`block h-6 rounded-sm ${!s ? 'bg-surface-2' : s.availability > 0 ? 'bg-ok/70' : 'bg-slate-400 dark:bg-slate-600'}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-5 text-sm font-semibold">{t('sync.live.sim.create')}</h3>
          <ActionForm action={simulateReservationAction.bind(null, property.id)} submitLabel={t('sync.live.sim.book')} className="mt-2">
            <div className="grid gap-3 sm:grid-cols-4">
              <Select label={t('sync.room')} name="roomId" id="sim-room" options={rooms.filter((r) => conn.roomMap[r.id]).map((r) => [r.id, r.name])} />
              <Select label={t('sync.channel')} name="channel" id="sim-ch" options={conn.channels.map((c) => [c, tLabel(t, 'source', c)])} />
              <Field label={t('sync.live.sim.checkIn')} name="from" id="sim-from" type="date" required defaultValue={addDays(today, 14)} />
              <Field label={t('sync.live.sim.checkOut')} name="to" id="sim-to" type="date" required defaultValue={addDays(today, 16)} />
              <Field label={t('sync.live.sim.guestName')} name="guestName" id="sim-guest" defaultValue="Lena Fischer" />
              <Field label={t('sync.live.sim.guests')} name="guests" id="sim-guests" type="number" min={1} max={20} defaultValue={2} />
              <Field label={t('sync.live.sim.total', { currency: property.baseCurrency })} name="total" id="sim-total" type="number" min={0} step="0.01" defaultValue={180} />
              <input type="hidden" name="currency" value={property.baseCurrency} />
            </div>
            <Check label={t('sync.live.sim.race')} name="lag" />
          </ActionForm>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' | 'warn' }) {
  return (
    <div className="flex justify-between gap-3 sm:block">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-medium ${tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : ''}`}>{value}</dd>
    </div>
  );
}
