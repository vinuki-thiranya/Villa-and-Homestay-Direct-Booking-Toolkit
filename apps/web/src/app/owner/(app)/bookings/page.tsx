import Link from 'next/link';
import type { OwnerBookingRow } from '@staydirect/shared';
import { BookingList } from '@/components/owner/BookingList';
import { currentProperty, ownerApi } from '@/lib/owner';

const FILTERS: [string, string][] = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['confirmed,checked_in', 'Upcoming & in-house'],
  ['checked_out', 'Past'],
  ['cancelled,no_show', 'Cancelled'],
];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const property = await currentProperty();
  if (!property) return null;
  const q = await searchParams;
  const qs = new URLSearchParams();
  if (q.status) qs.set('status', q.status);
  if (q.search) qs.set('search', q.search);
  const rows = await ownerApi<OwnerBookingRow[]>(`/properties/${property.id}/bookings?${qs}`);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <form className="flex gap-2" role="search">
        {q.status && <input type="hidden" name="status" value={q.status} />}
        <label htmlFor="search" className="sr-only">
          Search bookings
        </label>
        <input id="search" name="search" defaultValue={q.search} placeholder="Name, email or SD-reference" className="field" />
        <button className="btn-secondary">Search</button>
      </form>
      <nav aria-label="Filter" className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([v, l]) => {
          const active = (q.status ?? '') === v;
          return (
            <Link
              key={l}
              href={v ? `/owner/bookings?status=${v}` : '/owner/bookings'}
              aria-current={active ? 'true' : undefined}
              className={`pill min-h-9 whitespace-nowrap px-4 text-sm ${active ? 'bg-brand text-brand-fg' : 'border border-line bg-surface text-muted'}`}
            >
              {l}
            </Link>
          );
        })}
      </nav>
      <div className="card px-4">
        <BookingList rows={rows} empty="No bookings match." />
      </div>
    </div>
  );
}
