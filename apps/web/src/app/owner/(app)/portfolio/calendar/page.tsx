import Link from 'next/link';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { SOURCE_LABEL } from '@/lib/format';
import { getT } from '@/lib/owner-i18n';
import { getMe, ownerTry, type MultiCalendar } from '@/lib/owner-r3';

export async function generateMetadata() {
  return { title: (await getT())('portfolio.calendarTitle') };
}

const DAYS = 21;
const CELL: Record<string, string> = {
  direct: 'bg-brand text-brand-fg',
  airbnb: 'bg-rose-500 text-white',
  booking_com: 'bg-blue-700 text-white',
  agoda: 'bg-violet-600 text-white',
  vrbo: 'bg-sky-600 text-white',
  other: 'bg-slate-600 text-white',
  manual: 'bg-slate-400 text-white dark:bg-slate-600',
};

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Rooms × days for every property the user may see, grouped by property (spec §3.9 R3). */
export default async function AllCalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const [me, t] = await Promise.all([getMe(), getT()]);
  if (!me.flags.multi_property) return <UpgradeNote feature="multi_property" />;
  const today = new Date().toISOString().slice(0, 10);
  const start = q.start && /^\d{4}-\d{2}-\d{2}$/.test(q.start) ? q.start : today;
  const res = await ownerTry<MultiCalendar>(`/calendar?from=${start}&to=${addDays(start, DAYS)}`);
  if (!res.data) return <UpgradeNote feature="multi_property" message={res.error.message} />;
  const cal = res.data;
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const byKey = new Map(cal.nights.map((n) => [`${n.roomId}|${n.date}`, n]));
  const weekdayFmt = new Intl.DateTimeFormat(t.locale, { weekday: 'short', timeZone: 'UTC' });
  const dayNum = (iso: string) => String(Number(iso.slice(8, 10)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('portfolio.calendarTitle')}</h1>
        <nav aria-label={t('portfolio.datesNav')} className="flex items-center gap-2">
          <Link className="btn-secondary min-h-11 px-3" href={`/owner/portfolio/calendar?start=${addDays(start, -7)}`}>
            {t('portfolio.prevWeek')}
          </Link>
          <Link className="btn-secondary min-h-11 px-3" href="/owner/portfolio/calendar">
            {t('portfolio.today')}
          </Link>
          <Link className="btn-secondary min-h-11 px-3" href={`/owner/portfolio/calendar?start=${addDays(start, 7)}`}>
            {t('portfolio.nextWeek')}
          </Link>
        </nav>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-max border-collapse text-xs">
          <caption className="sr-only">{t('portfolio.caption', { start: t.date(start), days: DAYS })}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-36 bg-surface p-2 text-left font-semibold">
                {t('portfolio.room')}
              </th>
              {dates.map((d) => (
                <th key={d} scope="col" className={`w-11 p-1 text-center font-medium ${d === today ? 'text-brand' : 'text-muted'}`}>
                  <span className="block">{weekdayFmt.format(new Date(`${d}T00:00:00Z`))}</span>
                  <span className="block">{dayNum(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          {cal.properties.map((p) => (
            <tbody key={p.id}>
              <tr className="border-t-2 border-line bg-surface-2/70">
                <th scope="rowgroup" colSpan={DAYS + 1} className="sticky left-0 p-2 text-left text-sm font-semibold">
                  {p.name}
                </th>
              </tr>
              {p.rooms.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <th scope="row" className="sticky left-0 z-10 bg-surface p-2 text-left text-sm font-medium">
                    {r.name}
                  </th>
                  {dates.map((d) => {
                    const n = byKey.get(`${r.id}|${d}`);
                    if (!n) return <td key={d} className="h-10 border-l border-line" aria-label={`${p.name} ${r.name} ${t.date(d)} ${t('portfolio.free')}`} />;
                    const tone = n.status === 'held' ? 'bg-amber-300 text-amber-950' : n.status === 'blocked' ? CELL.manual : (CELL[n.source] ?? CELL.other);
                    const label = n.status === 'held' ? t('portfolio.hold') : n.status === 'blocked' ? t('portfolio.blocked') : (SOURCE_LABEL[n.source] ?? n.source);
                    const who = n.guestName ?? n.bookingReference ?? n.note ?? '';
                    const title = `${p.name}, ${r.name}, ${t.date(d)}: ${label}${who ? `, ${who}` : ''}`;
                    const short = n.guestName ? n.guestName.split(' ')[0]!.slice(0, 3) : label.slice(0, 2);
                    return (
                      <td key={d} className="h-10 border-l border-line p-0.5">
                        {n.bookingId ? (
                          <Link href={`/owner/bookings/${n.bookingId}`} title={title} aria-label={title} className={`flex h-full items-center justify-center rounded ${tone}`}>
                            {short}
                          </Link>
                        ) : (
                          <span title={title} aria-label={title} className={`flex h-full items-center justify-center rounded ${tone}`}>
                            {short}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="text-xs text-muted">{t('portfolio.footnote')}</p>
    </div>
  );
}
