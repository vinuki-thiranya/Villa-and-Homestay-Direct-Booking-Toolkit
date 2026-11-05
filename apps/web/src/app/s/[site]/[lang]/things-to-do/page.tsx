import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { Price } from '@/components/guest/Currency';
import { getSiteAddOns } from '@/lib/api';
import { breadcrumbLd } from '@/lib/jsonld';
import { guestMetadata } from '@/lib/seo';
import { siteContext, siteText } from '@/lib/site';

const CATEGORIES = ['airport_pickup', 'driver', 'tuk_tuk', 'surf_lesson', 'whale_watching', 'safari', 'cooking_class', 'laundry', 'bicycle', 'other'] as const;
type Category = (typeof CATEGORIES)[number];
const category = (c: string): Category => ((CATEGORIES as readonly string[]).includes(c) ? (c as Category) : 'other');

export async function generateMetadata(): Promise<Metadata> {
  const { property: p, lang, t } = await siteContext();
  const place = p.area || t('home.sriLanka');
  return guestMetadata(p, lang, {
    path: '/things-to-do',
    title: t('pages.experiences.metaTitle', { place, name: p.name }),
    description: t('pages.experiences.metaDescription', { place, name: p.name }),
  });
}

export default async function ThingsToDoPage() {
  const { property: p, base, siteKey, lang, t } = await siteContext();
  const items = await getSiteAddOns(siteKey);
  const nearby = siteText(p, lang, 'things_to_do');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumbLd(p, lang, [[t('layout.thingsToDo'), '/things-to-do']])} />
      <h1 className="font-display text-3xl font-semibold">{nearby ? t('pages.experiences.nearby', { name: p.name }) : t('pages.experiences.title')}</h1>
      {nearby && <p className="mt-4 max-w-3xl whitespace-pre-line leading-relaxed text-muted">{nearby}</p>}
      {nearby && items.length > 0 && <h2 className="mt-10 font-display text-2xl font-semibold">{t('pages.experiences.bookable')}</h2>}
      <p className="mt-2 max-w-2xl text-muted">{t('pages.experiences.intro', { host: p.hostName || p.name })}</p>
      {items.length === 0 ? (
        <p className="mt-8 text-muted">{t('pages.experiences.empty')}</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            return (
              <li key={a.id} className="card overflow-hidden">
                {a.photoUrl && (
                  <div className="relative h-44 bg-surface-2">
                    <Image src={a.photoUrl} alt="" fill quality={60} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t(`pages.experiences.categories.${category(a.category)}`)}</p>
                  <h2 className="mt-1 text-lg font-semibold">{a.name}</h2>
                  {a.description && <p className="mt-1 text-sm text-muted">{a.description}</p>}
                  <p className="mt-3 font-semibold">
                    <Price amount={a.price} from={a.currency} />
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
