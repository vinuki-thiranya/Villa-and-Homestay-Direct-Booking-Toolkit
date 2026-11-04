import Link from 'next/link';
import type { OwnerBookingRow } from '@staydirect/shared';
import { BookingList } from '@/components/owner/BookingList';
import type { OwnerKey } from '@/i18n/owner/t';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';

const FILTERS: [string, OwnerKey][] = [
  ['', 'bookings.filters.all'],
  ['pending', 'bookings.filters.pending'],
  ['confirmed,checked_in', 'bookings.filters.upcoming'],
  ['checked_out', 'bookings.filters.past'],
  ['cancelled,no_show', 'bookings.filters.cancelled'],
];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const property = await currentProperty();
  if (!property) return null;
  const q = await searchParams;
  const qs = new URLSearchParams();
  if (q.status) qs.set('status', q.status);
  if (q.search) qs.set('search', q.search);
  const [rows, t] = await Promise.all([ownerApi<OwnerBookingRow[]>(`/properties/${property.id}/bookings?${qs}`), getT()]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('bookings.title')}</h1>
      <form className="flex gap-2" role="search">
        {q.status && <input type="hidden" name="status" value={q.status} />}
        <label htmlFor="search" className="sr-only">
          {t('bookings.searchLabel')}
        </label>
        <input id="search" name="search" defaultValue={q.search} placeholder={t('bookings.searchPlaceholder')} className="field" />
        <button className="btn-secondary">{t('bookings.search')}</button>
      </form>
      <nav aria-label={t('bookings.filters.label')} className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([v, l]) => {
          const active = (q.status ?? '') === v;
          return (
            <Link
              key={l}
              href={v ? `/owner/bookings?status=${v}` : '/owner/bookings'}
              aria-current={active ? 'true' : undefined}
              className={`pill min-h-9 whitespace-nowrap px-4 text-sm ${active ? 'bg-brand text-brand-fg' : 'border border-line bg-surface text-muted'}`}
            >
              {t(l)}
            </Link>
          );
        })}
      </nav>
      <div className="card px-4">
        <BookingList rows={rows} empty={t('bookings.noMatch')} />
      </div>
    </div>
  );
}
