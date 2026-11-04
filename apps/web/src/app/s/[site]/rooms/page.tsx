import type { Metadata } from 'next';
import { RoomCard } from '@/components/guest/RoomCard';
import { StickyBookBar } from '@/components/guest/StickyBookBar';
import { displayPrice, PROPERTY_TYPE_LABEL } from '@/lib/format';
import { canonicalUrl, fromRate, siteContext } from '@/lib/site';

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
  const from = fromRate(p);
  const price = from != null ? displayPrice(from, p.baseCurrency, currency, p.fx) : null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="g-display text-4xl sm:text-5xl">Rooms</h1>
      <p className="mt-2 text-muted">Prices are per night, before long-stay and last-minute discounts.</p>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {p.rooms.map((r) => (
          <RoomCard key={r.id} room={r} base={base} baseCurrency={p.baseCurrency} currency={currency} fx={p.fx} />
        ))}
      </div>
      {!p.bookingDisabled && <StickyBookBar href={`${base}/book`} price={price ? `${price.approx ? '≈ ' : ''}${price.text}` : null} />}
    </div>
  );
}
