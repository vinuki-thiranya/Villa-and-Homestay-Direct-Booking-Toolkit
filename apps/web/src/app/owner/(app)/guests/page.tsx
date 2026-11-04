import Link from 'next/link';
import { Empty } from '@/components/owner/fields';
import { fmtDate, money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { LANGUAGE_LABEL, type GuestRow } from '@/lib/owner-types';

export const metadata = { title: 'Guests' };

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const property = await currentProperty();
  if (!property) return null;
  const { search = '' } = await searchParams;
  const guests = await ownerApi<GuestRow[]>(`/properties/${property.id}/guests${search ? `?search=${encodeURIComponent(search)}` : ''}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">Guests</h1>
        <Link href="/owner/guests/codes" className="text-sm font-medium text-brand">
          Discount codes
        </Link>
      </div>
      <form role="search" className="flex gap-2">
        <label htmlFor="g-search" className="sr-only">
          Search guests
        </label>
        <input id="g-search" name="search" type="search" defaultValue={search} placeholder="Name, email or phone" className="field" />
        <button className="btn-secondary">Search</button>
      </form>
      {guests.length === 0 ? (
        <Empty>{search ? 'No guests match.' : 'Guests appear here after their first direct booking.'}</Empty>
      ) : (
        <ul className="card divide-y divide-line">
          {guests.map((g) => (
            <li key={g.id}>
              <Link href={`/owner/guests/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{g.name}</span>
                    {g.repeat && <span className="pill bg-ok-bg text-ok">Repeat</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {[g.country, LANGUAGE_LABEL[g.language] ?? g.language, g.email, g.phone].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p>
                    {g.stays} stay{g.stays === 1 ? '' : 's'}
                  </p>
                  <p className="text-muted">
                    {g.lastStay ? fmtDate(g.lastStay) : '—'} · {money(Number(g.totalPaid), property.baseCurrency)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
