import type { Metadata } from 'next';
import { Clock, Navigation } from 'lucide-react';
import { rich } from '@/components/guest/rich';
import { canonicalUrl, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p, t } = await siteContext((await params).site);
  const place = p.area || t('home.sriLanka');
  return {
    title: t('pages.location.metaTitle', { name: p.name, place }),
    description: t('pages.location.metaDescription', { name: p.name, place, in: p.checkIn, out: p.checkOut }),
    alternates: { canonical: canonicalUrl(p, '/location') },
  };
}

export default async function LocationPage({ params }: Props) {
  const { property: p, t } = await siteContext((await params).site);
  const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.address;
  const directions =
    p.lat != null && p.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">{t('pages.location.title')}</h1>
      <p className="mt-2 text-muted">{p.address}</p>
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
