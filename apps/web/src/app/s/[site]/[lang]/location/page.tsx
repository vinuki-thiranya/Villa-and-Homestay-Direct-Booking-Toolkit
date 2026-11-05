import type { Metadata } from 'next';
import { Clock, Navigation } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { rich } from '@/components/guest/rich';
import { breadcrumbLd } from '@/lib/jsonld';
import { guestMetadata } from '@/lib/seo';
import { siteContext, siteText } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const { property: p, lang, t } = await siteContext();
  const place = p.area || t('home.sriLanka');
  return guestMetadata(p, lang, {
    path: '/location',
    title: t('pages.location.metaTitle', { name: p.name, place }),
    description: t('pages.location.metaDescription', { name: p.name, place, in: p.checkIn, out: p.checkOut }),
  });
}

export default async function LocationPage() {
  const { property: p, lang, t } = await siteContext();
  const gettingHere = siteText(p, lang, 'getting_here');
  const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.address;
  const directions =
    p.lat != null && p.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumbLd(p, lang, [[t('layout.location'), '/location']])} />
      <h1 className="font-display text-3xl font-semibold">{t('pages.location.title')}</h1>
      <p className="mt-2 text-muted">{p.address}</p>
      {gettingHere && (
        <section className="mt-6 max-w-3xl" aria-labelledby="getting-here">
          <h2 id="getting-here" className="font-display text-2xl font-semibold">
            {t('pages.location.gettingHere')}
          </h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{gettingHere}</p>
        </section>
      )}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="card aspect-[4/3] overflow-hidden">
          {q ? (
            <iframe
              title={t('pages.location.mapTitle', { name: p.name })}
              src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
          ) : (
            <p className="p-6 text-muted">{t('pages.location.mapSoon')}</p>
          )}
        </div>
        <div className="space-y-6">
          <a href={directions} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
            <Navigation aria-hidden className="h-4 w-4" /> {t('pages.location.directions')}
          </a>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock aria-hidden className="h-4 w-4 text-brand" /> {t('pages.location.arrival')}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {rich(t('pages.location.arrivalTimes'), {
                in: <strong className="text-fg">{p.checkIn}</strong>,
                out: <strong className="text-fg">{p.checkOut}</strong>,
              })}{' '}
              {t('pages.location.arrivalHelp')}
            </p>
          </div>
          {p.houseRules && (
            <div className="card p-5">
              <h2 className="font-semibold">{t('pages.location.houseRules')}</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{p.houseRules}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
