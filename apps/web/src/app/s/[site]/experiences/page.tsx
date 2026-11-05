import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteAddOns } from '@/lib/api';
import { displayPrice } from '@/lib/format';
import { canonicalUrl, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

const CATEGORIES = ['airport_pickup', 'driver', 'tuk_tuk', 'surf_lesson', 'whale_watching', 'safari', 'cooking_class', 'laundry', 'bicycle', 'other'] as const;
type Category = (typeof CATEGORIES)[number];
const category = (c: string): Category => ((CATEGORIES as readonly string[]).includes(c) ? (c as Category) : 'other');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p, t } = await siteContext((await params).site);
  const place = p.area || t('home.sriLanka');
  return {
    title: t('pages.experiences.metaTitle', { place, name: p.name }),
    description: t('pages.experiences.metaDescription', { place, name: p.name }),
    alternates: { canonical: canonicalUrl(p, '/experiences') },
  };
}

export default async function ExperiencesPage({ params }: Props) {
  const { property: p, base, currency, siteKey, t } = await siteContext((await params).site);
  const items = await getSiteAddOns(siteKey);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">{t('pages.experiences.title')}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t('pages.experiences.intro', { host: p.hostName || p.name })}</p>
      {items.length === 0 ? (
        <p className="mt-8 text-muted">{t('pages.experiences.empty')}</p>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t(`pages.experiences.categories.${category(a.category)}`)}</p>
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
        {t('pages.experiences.bookYourStay')}
      </Link>
    </div>
  );
}
