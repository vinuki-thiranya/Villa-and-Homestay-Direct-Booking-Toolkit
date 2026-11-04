import type { Metadata } from 'next';
import { RoomCard } from '@/components/guest/RoomCard';
import { StickyBookBar } from '@/components/guest/StickyBookBar';
import { displayPrice } from '@/lib/format';
import { canonicalUrl, fromRate, propertyTypeLabel, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p, t } = await siteContext((await params).site);
  const place = p.area || t('home.sriLanka');
  const type = t.lang === 'en' ? propertyTypeLabel(p.type, t).toLowerCase() : propertyTypeLabel(p.type, t);
  return {
    title: t('rooms.metaTitle', { name: p.name, place }),
    description: t('rooms.metaDescription', { n: p.rooms.length, name: p.name, type, place }),
    alternates: { canonical: canonicalUrl(p, '/rooms') },
  };
}

export default async function RoomsPage({ params }: Props) {
  const { property: p, base, currency, t } = await siteContext((await params).site);
  const from = fromRate(p);
  const price = from != null ? displayPrice(from, p.baseCurrency, currency, p.fx) : null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="g-display text-4xl sm:text-5xl">{t('rooms.title')}</h1>
      <p className="mt-2 text-muted">{t('rooms.intro')}</p>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {p.rooms.map((r) => (
          <RoomCard key={r.id} room={r} base={base} baseCurrency={p.baseCurrency} currency={currency} fx={p.fx} />
        ))}
      </div>
      {!p.bookingDisabled && <StickyBookBar href={`${base}/book`} price={price ? `${price.approx ? '≈ ' : ''}${price.text}` : null} />}
    </div>
  );
}
