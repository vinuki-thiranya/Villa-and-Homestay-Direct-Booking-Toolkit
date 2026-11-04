import type { Metadata } from 'next';
import { RoomCard } from '@/components/guest/RoomCard';
import { PROPERTY_TYPE_LABEL } from '@/lib/format';
import { canonicalUrl, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p } = await siteContext((await params).site);
  return {
    title: `Rooms at ${p.name}, ${p.area || 'Sri Lanka'} — book direct`,
    description: `${p.rooms.length} rooms at ${p.name}, a ${(PROPERTY_TYPE_LABEL[p.type] ?? 'stay').toLowerCase()} in ${p.area}. Compare beds, amenities and prices.`,
    alternates: { canonical: canonicalUrl(p, '/rooms') },
  };
}

export default async function RoomsPage({ params }: Props) {
  const { property: p, base, currency } = await siteContext((await params).site);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Rooms</h1>
      <p className="mt-2 text-muted">Prices are per night before long-stay and last-minute discounts.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {p.rooms.map((r) => (
          <RoomCard key={r.id} room={r} base={base} baseCurrency={p.baseCurrency} currency={currency} fx={p.fx} />
        ))}
      </div>
    </div>
  );
}
