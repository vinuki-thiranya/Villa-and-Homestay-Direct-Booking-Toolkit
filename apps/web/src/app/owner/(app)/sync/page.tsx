import { CheckCircle2, XCircle } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Empty, Field, Section, Select } from '@/components/owner/fields';
import { fmtDateTime, SOURCE_LABEL } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
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

const CHANNELS: [string, string][] = [
  ['airbnb', 'Airbnb'],
  ['booking_com', 'Booking.com'],
  ['agoda', 'Agoda'],
  ['vrbo', 'Vrbo'],
  ['other', 'Other'],
];

export default async function SyncPage() {
  const property = await currentProperty();
  if (!property) return null;
  const data = await ownerApi<IcalSources>(`/properties/${property.id}/ical-sources`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Channels</h1>
        <ActionForm action={syncNowAction.bind(null, property.id)} submitLabel="Sync now" pendingLabel="Syncing…" inline />
      </div>
      <p className="text-sm text-muted">
        Calendars sync every 15 minutes. iCal never includes guest names, and Airbnb or Booking.com may take up to their own refresh time to pick up a change —
        a double booking is still possible in that window, and you&apos;ll get a WhatsApp alert if it happens.
      </p>

      <Section title="1. Paste these links into Airbnb and Booking.com">
        <ul className="space-y-3">
          {data.exports.map((e) => (
            <li key={e.roomId}>
              <p className="text-sm font-medium">{e.roomName}</p>
              <div className="mt-1 flex gap-2">
                <input readOnly value={e.url} aria-label={`Export link for ${e.roomName}`} className="field min-h-9 font-mono text-xs" />
                <CopyButton text={e.url} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Airbnb: Calendar → Availability → Connect calendars → Import. Booking.com: Rates & Availability → Sync calendars.</p>
      </Section>

      <Section title="2. Import their calendars here">
        {data.sources.length === 0 ? (
          <Empty>No calendars imported yet.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {data.sources.map((s) => {
              const bad = s.consecutiveFailures > 0 || s.lastStatus === 'error';
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  {bad ? <XCircle aria-label="Failing" className="h-5 w-5 text-bad" /> : <CheckCircle2 aria-label="Healthy" className="h-5 w-5 text-ok" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s.roomName} · {SOURCE_LABEL[s.channel]}
                    </p>
                    <p className="truncate text-xs text-muted">{s.url}</p>
                    <p className={`text-xs ${bad ? 'text-bad' : 'text-muted'}`}>
                      {bad
                        ? `${s.consecutiveFailures} failed fetch(es): ${s.lastError ?? 'unknown error'}`
                        : s.lastSuccessAt
                          ? `Last synced ${fmtDateTime(s.lastSuccessAt)}`
                          : 'Not synced yet'}
                    </p>
                  </div>
                  <ActionForm
                    action={removeIcalSourceAction.bind(null, s.id)}
                    submitLabel="Remove"
                    variant="danger"
                    inline
                    confirm="Remove this calendar? Nights it imported will be released."
                  />
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 border-t border-line pt-4">
          <ActionForm action={addIcalSourceAction} submitLabel="Add calendar">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
              <Select label="Room" name="roomId" options={data.exports.map((e) => [e.roomId, e.roomName])} />
              <Select label="Channel" name="channel" options={CHANNELS} />
              <Field label="iCal URL from the OTA" name="url" type="url" required placeholder="https://www.airbnb.com/calendar/ical/…" />
            </div>
          </ActionForm>
        </div>
      </Section>
    </div>
  );
}
