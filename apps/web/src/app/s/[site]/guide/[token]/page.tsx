import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, MessageCircle, Phone, Wifi } from 'lucide-react';
import type { Guide } from '@staydirect/shared';
import { CopyText } from '@/components/guest/CopyText';
import { ApiError, apiFetch } from '@/lib/api';
import { waLink } from '@/lib/format';
import { gt, guestLang, PLACE_LABEL, type GuestLang } from '@/lib/guide-copy';
import { LANGUAGES } from '@/lib/guest-copy';
import { siteContext } from '@/lib/site';

interface PublicGuide {
  propertyName: string;
  propertySlug: string;
  address: string;
  mapsUrl: string | null;
  checkIn: string;
  checkOut: string;
  houseRules: string;
  whatsappNumber: string | null;
  hostName: string;
  guide: Guide;
}

type Props = { params: Promise<{ site: string; token: string }>; searchParams: Promise<{ lang?: string }> };

export const metadata: Metadata = { title: 'House guide', robots: { index: false, follow: false } };

export default async function GuidePage({ params, searchParams }: Props) {
  const { site, token } = await params;
  const { base } = await siteContext(site);
  const lang: GuestLang = guestLang((await searchParams).lang);
  let data: PublicGuide;
  try {
    data = await apiFetch<PublicGuide>(`/public/guide/${encodeURIComponent(token)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const g = data.guide;
  const host = data.hostName || gt(lang, 'host');
  const wa = waLink(data.whatsappNumber);
  const rules = [g.rules, data.houseRules].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8" lang={lang}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{data.propertyName}</p>
          <h1 className="font-display text-3xl font-semibold">{gt(lang, 'guide')}</h1>
        </div>
        <nav aria-label="Language" className="flex gap-1">
          {LANGUAGES.map(([code, name]) => (
            <Link
              key={code}
              href={`${base}/guide/${token}?lang=${code}`}
              hrefLang={code}
              aria-current={lang === code ? 'true' : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${lang === code ? 'bg-brand text-brand-fg' : 'border border-line text-muted hover:bg-surface-2'}`}
            >
              {name}
            </Link>
          ))}
        </nav>
      </div>

      {(g.wifiName || g.wifiPassword) && (
        <section className="card p-5" aria-labelledby="wifi">
          <h2 id="wifi" className="flex items-center gap-2 text-lg font-semibold">
            <Wifi aria-hidden className="h-5 w-5 text-brand" /> {gt(lang, 'wifi')}
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted">{gt(lang, 'network')}</dt>
            <dd className="font-semibold">{g.wifiName}</dd>
            <dt className="text-muted">{gt(lang, 'password')}</dt>
            <dd className="font-mono text-lg font-semibold">{g.wifiPassword}</dd>
          </dl>
          {g.wifiPassword && (
            <div className="mt-3">
              <CopyText text={g.wifiPassword} label={gt(lang, 'copy')} copiedLabel={gt(lang, 'copied')} />
            </div>
          )}
        </section>
      )}

      <section className="card space-y-2 p-5" aria-labelledby="arrival">
        <h2 id="arrival" className="text-lg font-semibold">
          {gt(lang, 'arrival')}
        </h2>
        <p className="text-sm text-muted">{gt(lang, 'checkInOut', { in: data.checkIn, out: data.checkOut })}</p>
        {g.arrival && <p className="whitespace-pre-line">{g.arrival}</p>}
        <p className="text-sm">{data.address}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {data.mapsUrl && (
            <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <MapPin aria-hidden className="h-4 w-4" /> {gt(lang, 'directions')}
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <MessageCircle aria-hidden className="h-4 w-4" /> {gt(lang, 'whatsapp', { host })}
            </a>
          )}
        </div>
      </section>

      {rules.length > 0 && (
        <section className="card p-5" aria-labelledby="rules">
          <h2 id="rules" className="text-lg font-semibold">
            {gt(lang, 'rules')}
          </h2>
          {rules.map((r) => (
            <p key={r} className="mt-2 whitespace-pre-line">
              {r}
            </p>
          ))}
        </section>
      )}

      {g.checkoutNotes && (
        <section className="card p-5" aria-labelledby="checkout">
          <h2 id="checkout" className="text-lg font-semibold">
            {gt(lang, 'checkout')}
          </h2>
          <p className="mt-2 whitespace-pre-line">{g.checkoutNotes}</p>
        </section>
      )}

      {g.emergency.length > 0 && (
        <section className="card p-5" aria-labelledby="emergency">
          <h2 id="emergency" className="text-lg font-semibold">
            {gt(lang, 'emergency')}
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {g.emergency.map((e) => (
              <li key={`${e.label}-${e.phone}`}>
                <a href={`tel:${e.phone.replace(/[^\d+]/g, '')}`} className="flex min-h-12 items-center gap-3 hover:text-brand">
                  <Phone aria-hidden className="h-4 w-4 text-brand" />
                  <span className="flex-1">{e.label}</span>
                  <span className="font-semibold">{e.phone}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {g.places.length > 0 && (
        <section className="card p-5" aria-labelledby="places">
          <h2 id="places" className="text-lg font-semibold">
            {gt(lang, 'places')}
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {g.places.map((p) => (
              <li key={p.name} className="flex gap-3 py-3">
                <span aria-hidden className="text-xl">
                  {PLACE_LABEL[p.kind] ?? '📍'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  {p.note && <p className="text-sm text-muted">{p.note}</p>}
                </div>
                {p.mapsUrl && (
                  <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="self-center text-sm font-medium text-brand" aria-label={`${gt(lang, 'directions')}: ${p.name}`}>
                    {gt(lang, 'directions')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
