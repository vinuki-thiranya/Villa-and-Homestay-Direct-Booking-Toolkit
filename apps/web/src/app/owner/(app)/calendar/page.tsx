import Link from 'next/link';
import type { CalendarNight } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { Field, Section, Select } from '@/components/owner/fields';
import { fmtShort, fmtWeekday, SOURCE_LABEL } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { blockAction } from '../../actions';

const DAYS = 30;

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const CELL: Record<string, string> = {
  direct: 'bg-brand text-brand-fg',
  airbnb: 'bg-rose-500 text-white',
  booking_com: 'bg-blue-700 text-white',
  agoda: 'bg-violet-600 text-white',
  vrbo: 'bg-sky-600 text-white',
  other: 'bg-slate-600 text-white',
  manual: 'bg-slate-400 text-white dark:bg-slate-600',
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const property = await currentProperty();
  if (!property) return null;
  const q = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const start = q.start && /^\d{4}-\d{2}-\d{2}$/.test(q.start) ? q.start : today;
  const end = addDays(start, DAYS);
  const cal = await ownerApi<{ rooms: { id: string; name: string }[]; nights: CalendarNight[] }>(
    `/properties/${property.id}/calendar?from=${start}&to=${end}`,
  );
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const byKey = new Map(cal.nights.map((n) => [`${n.roomId}|${n.date}`, n]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <nav aria-label="Calendar dates" className="flex items-center gap-2">
          <Link className="btn-secondary min-h-9 px-3" href={`/owner/calendar?start=${addDays(start, -7)}`}>
            ← Week
          </Link>
          <Link className="btn-secondary min-h-9 px-3" href="/owner/calendar">
            Today
          </Link>
          <Link className="btn-secondary min-h-9 px-3" href={`/owner/calendar?start=${addDays(start, 7)}`}>
            Week →
          </Link>
        </nav>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-max border-collapse text-xs">
          <caption className="sr-only">
            Room availability from {start} for {DAYS} days
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-32 bg-surface p-2 text-left font-semibold">
                Room
              </th>
              {dates.map((d) => (
                <th key={d} scope="col" className={`w-11 p-1 text-center font-medium ${d === today ? 'text-brand' : 'text-muted'}`}>
                  <span className="block">{fmtWeekday(d)}</span>
                  <span className="block">{fmtShort(d).split(' ')[0]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cal.rooms.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-surface p-2 text-left text-sm font-medium">
                  {r.name}
                </th>
                {dates.map((d) => {
                  const n = byKey.get(`${r.id}|${d}`);
                  if (!n) return <td key={d} className="h-10 border-l border-line" aria-label={`${r.name} ${d} free`} />;
                  const tone = n.status === 'held' ? 'bg-amber-300 text-amber-950' : (CELL[n.source] ?? CELL.other);
                  const label = n.status === 'held' ? 'Hold' : n.status === 'blocked' ? 'Block' : SOURCE_LABEL[n.source];
                  const title = `${r.name} · ${d} · ${label}${n.bookingReference ? ` · ${n.bookingReference}` : ''}${n.note ? ` · ${n.note}` : ''}`;
                  return (
                    <td key={d} className="h-10 border-l border-line p-0.5">
                      {n.bookingId ? (
                        <Link href={`/owner/bookings/${n.bookingId}`} title={title} aria-label={title} className={`flex h-full items-center justify-center rounded ${tone}`}>
                          {label?.slice(0, 2)}
                        </Link>
                      ) : (
                        <span title={title} aria-label={title} className={`flex h-full items-center justify-center rounded ${tone}`}>
                          {label?.slice(0, 2)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-3 text-xs" aria-label="Legend">
        {[
          ['Direct', CELL.direct],
          ['Airbnb', CELL.airbnb],
          ['Booking.com', CELL.booking_com],
          ['Hold (checkout in progress)', 'bg-amber-300 text-amber-950'],
          ['Blocked', CELL.manual],
        ].map(([l, c]) => (
          <li key={l} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${c}`} aria-hidden /> {l}
          </li>
        ))}
      </ul>

      <Section title="Block or release nights">
        <ActionForm action={blockAction} submitLabel="Block nights">
          <div className="grid gap-3 sm:grid-cols-4">
            <Select label="Room" name="roomId" options={cal.rooms.map((r) => [r.id, r.name])} />
            <Field label="From" name="from" type="date" required defaultValue={today} />
            <Field label="To (check-out)" name="to" type="date" required defaultValue={addDays(today, 1)} />
            <Field label="Note" name="note" placeholder="Maintenance" />
          </div>
          <Select
            label="Action"
            name="intent"
            options={[
              ['block', 'Block these nights'],
              ['release', 'Release my blocks on these nights'],
            ]}
            className="max-w-xs"
          />
        </ActionForm>
        <p className="mt-2 text-xs text-muted">Blocks show on Airbnb and Booking.com through your calendar export within 15 minutes.</p>
      </Section>
    </div>
  );
}
