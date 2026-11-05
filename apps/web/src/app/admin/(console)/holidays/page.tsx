import Link from 'next/link';
import { AdminForm } from '@/components/admin/AdminForm';
import { HolidayDelete } from '@/components/admin/HolidayDelete';
import { adminApi, type AdminHoliday } from '@/lib/admin';
import { FONT_VARIABLES } from '@/themes/fonts';
import { saveHolidayAction } from '../../actions';

export const metadata = { title: 'Holidays' };

const TYPES = [
  ['public', 'Public'],
  ['bank', 'Bank'],
  ['mercantile', 'Mercantile'],
] as const;
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const SINHALA = { fontFamily: 'var(--f-sinhala), system-ui, sans-serif' };

/**
 * Sri Lanka's public, bank and mercantile holidays, Poya days marked. Owners see them on their
 * calendar and Today screen ("Poya day: no alcohol sold or served"). Seeded from the gazette;
 * corrected here when a new gazette changes a date.
 */
export default async function HolidaysPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const thisYear = new Date().getUTCFullYear();
  const q = await searchParams;
  const year = q.year && /^\d{4}$/.test(q.year) ? Number(q.year) : thisYear;
  const rows = await adminApi<AdminHoliday[]>(`/admin/holidays?from=${year}-01-01&to=${year}-12-31`);
  const poyaCount = rows.filter((r) => r.isPoya).length;
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];

  return (
    <div className={FONT_VARIABLES}>
      <header className="adm-head">
        <div>
          <h1>Holidays</h1>
          <p>
            Public, bank and mercantile holidays with Poya days marked, in English and Sinhala. Owners see them on their calendar and Today
            screen. The list follows the government gazette and the Central Bank holiday list: when a new gazette moves or adds a day, change
            it here.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 16 }}>
        <nav className="adm-segment" aria-label="Year">
          {years.map((y) => (
            <Link key={y} href={`/admin/holidays?year=${y}`} aria-current={y === year ? 'true' : undefined}>
              {y}
            </Link>
          ))}
        </nav>
        <span className="adm-help" aria-live="polite">
          {rows.length} holidays in {year}, {poyaCount} Poya days
        </span>
      </div>

      <section className="adm-panel" aria-labelledby="list-h" style={{ marginBottom: 16 }}>
        <div className="adm-panel-head">
          <h2 id="list-h">{year}</h2>
        </div>
        {rows.length === 0 ? (
          <p className="adm-empty">No holidays entered for {year}. Add them from the gazette below.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Holiday</th>
                  <th scope="col">Sinhala</th>
                  <th scope="col">Type</th>
                  <th scope="col">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={`${h.date}|${h.nameEn}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>{DAY.format(new Date(`${h.date}T00:00:00Z`))}</td>
                    <td>
                      {h.nameEn}{' '}
                      {h.isPoya && (
                        <span className="adm-mark" data-tone="act">
                          Poya
                        </span>
                      )}
                    </td>
                    <td lang="si" style={SINHALA}>
                      {h.nameSi}
                    </td>
                    <td>{h.types.join(', ')}</td>
                    <td style={{ minWidth: 220 }}>
                      <details>
                        <summary className="cursor-pointer">Edit</summary>
                        <div style={{ marginTop: 8 }}>
                          <AdminForm action={saveHolidayAction} submitLabel="Save">
                            <input type="hidden" name="date" value={h.date} />
                            <input type="hidden" name="nameEn" value={h.nameEn} />
                            <HolidayFields h={h} idPrefix={`${h.date}-${h.nameEn}`} />
                            <p className="adm-help">To change the date or English name, add the corrected day and delete this one.</p>
                          </AdminForm>
                        </div>
                      </details>
                      <div style={{ marginTop: 6 }}>
                        <HolidayDelete date={h.date} nameEn={h.nameEn} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-panel" aria-labelledby="add-h">
        <div className="adm-panel-head">
          <h2 id="add-h">Add a holiday</h2>
          <p>From an Extraordinary Gazette or the Central Bank list. A Poya day gets the &ldquo;no alcohol sold or served&rdquo; note for owners.</p>
        </div>
        <div className="adm-panel-body">
          <AdminForm action={saveHolidayAction} submitLabel="Add holiday">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="adm-field">
                <span>Date</span>
                <input className="adm-input" type="date" name="date" required min={`${year}-01-01`} max={`${year}-12-31`} />
              </label>
              <label className="adm-field">
                <span>English name</span>
                <input className="adm-input" name="nameEn" required minLength={2} maxLength={120} placeholder="Vesak Full Moon Poya Day" />
              </label>
            </div>
            <HolidayFields idPrefix="new" />
          </AdminForm>
        </div>
      </section>
    </div>
  );
}

function HolidayFields({ h, idPrefix }: { h?: AdminHoliday; idPrefix: string }) {
  return (
    <div className="space-y-3">
      <label className="adm-field">
        <span>Sinhala name</span>
        <input
          className="adm-input"
          name="nameSi"
          lang="si"
          required
          minLength={2}
          maxLength={160}
          defaultValue={h?.nameSi}
          placeholder="වෙසක් පුර පසළොස්වක පොහොය දිනය"
          style={SINHALA}
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex min-h-10 items-center gap-2">
          <input type="checkbox" name="isPoya" id={`${idPrefix}-poya`} defaultChecked={h?.isPoya} />
          Poya day
        </label>
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">Holiday type</legend>
          {TYPES.map(([v, l]) => (
            <label key={v} className="inline-flex min-h-10 items-center gap-2">
              <input type="checkbox" name="types" value={v} defaultChecked={h ? h.types.includes(v) : v !== 'mercantile'} />
              {l}
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
