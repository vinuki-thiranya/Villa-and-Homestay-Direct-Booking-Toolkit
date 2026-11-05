import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { RoomCard } from '@/components/guest/RoomCard';
import { StickyBookBar } from '@/components/guest/StickyBookBar';
import { breadcrumbLd } from '@/lib/jsonld';
import { guestMetadata } from '@/lib/seo';
import { fromRate, propertyTypeLabel, siteContext } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const { property: p, lang, t } = await siteContext();
  const place = p.area || t('home.sriLanka');
  const type = t.lang === 'en' ? propertyTypeLabel(p.type, t).toLowerCase() : propertyTypeLabel(p.type, t);
  return guestMetadata(p, lang, {
    path: '/rooms',
    title: t('rooms.metaTitle', { name: p.name, place }),
    description: t('rooms.metaDescription', { n: p.rooms.length, name: p.name, type, place }),
    images: p.rooms.flatMap((r) => r.photos.slice(0, 1)),
  });
}

export default async function RoomsPage() {
  const { property: p, base, lang, t } = await siteContext();
  const from = fromRate(p);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumbLd(p, lang, [[t('layout.rooms'), '/rooms']])} />
      <h1 className="g-display text-4xl sm:text-5xl">{t('rooms.title')}</h1>
      <p className="mt-2 text-muted">{t('rooms.intro')}</p>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {p.rooms.map((r) => (
          <RoomCard key={r.id} room={r} base={base} baseCurrency={p.baseCurrency} />
        ))}
      </div>
      {!p.bookingDisabled && <StickyBookBar href={`${base}/book`} price={from != null ? { amount: from, currency: p.baseCurrency } : null} />}
    </div>
  );
}
