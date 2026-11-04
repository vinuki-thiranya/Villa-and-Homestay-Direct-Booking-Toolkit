import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteAddOns } from '@/lib/api';
import { displayPrice } from '@/lib/format';
import { canonicalUrl, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

const CATEGORY_LABEL: Record<string, string> = {
  airport_pickup: 'Airport pickup',
  driver: 'Driver',
  tuk_tuk: 'Tuk-tuk',
  surf_lesson: 'Surf',
  whale_watching: 'Whale watching',
  safari: 'Safari',
  cooking_class: 'Cooking class',
  laundry: 'Laundry',
  bicycle: 'Bicycle',
  other: 'Experience',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p } = await siteContext((await params).site);
  const place = p.area || 'Sri Lanka';
  return {
    title: `Things to do in ${place} — airport transfers, surf, safaris | ${p.name}`,
    description: `Book airport pickups, surf lessons, whale watching and safaris with ${p.name} in ${place}. Arranged with trusted local guides and drivers.`,
    alternates: { canonical: canonicalUrl(p, '/experiences') },
  };
}

export default async function ExperiencesPage({ params }: Props) {
  const { property: p, base, currency, siteKey } = await siteContext((await params).site);
  const items = await getSiteAddOns(siteKey);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Experiences & transfers</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Arranged by {p.hostName || p.name} with drivers and guides we know personally. Book your stay first, then add these from your booking page or
        just ask us on WhatsApp.
      </p>
      {items.length === 0 ? (
        <p className="mt-8 text-muted">Ask us on WhatsApp about transfers and day trips.</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const price = displayPrice(a.price, a.currency, currency, p.fx);
            return (
              <li key={a.id} className="card overflow-hidden">
                {a.photoUrl && (
                  <div className="relative h-44 bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied URL on any host */}
                    <img src={a.photoUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{CATEGORY_LABEL[a.category] ?? 'Experience'}</p>
                  <h2 className="mt-1 text-lg font-semibold">{a.name}</h2>
                  {a.description && <p className="mt-1 text-sm text-muted">{a.description}</p>}
                  <p className="mt-3 font-semibold">
                    {price.approx && '≈ '}
                    {price.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link href={`${base}/book`} className="btn-primary mt-8">
        Book your stay
      </Link>
    </div>
  );
}
