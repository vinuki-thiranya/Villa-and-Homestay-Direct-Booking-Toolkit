import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MessageCircle, ShieldCheck, Star } from 'lucide-react';
import { Hero } from '@/components/guest/Hero';
import { RoomCard } from '@/components/guest/RoomCard';
import { StickyBookBar } from '@/components/guest/StickyBookBar';
import { Stars } from '@/components/Stars';
import { getSiteReviews } from '@/lib/api';
import { displayPrice } from '@/lib/format';
import { canonicalUrl, fromRate, propertyTypeLabel, responseTimeText, siteContext } from '@/lib/site';

const POLICIES = ['flexible', 'moderate', 'strict'] as const;

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params;
  const { property: p, t } = await siteContext(site);
  const vars = { name: p.name, type: propertyTypeLabel(p.type, t), place: p.area || t('home.sriLanka'), rooms: p.rooms.length };
  const title = t('home.metaTitle', vars);
  const description = t('home.metaDescription', vars);
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(p) },
    openGraph: { title, description, images: p.photos.slice(0, 1), type: 'website' },
  };
}

export default async function SiteHome({ params }: Props) {
  const { site } = await params;
  const { property: p, base, currency, siteKey, theme, t } = await siteContext(site);
  const reviews = await getSiteReviews(siteKey);
  const from = fromRate(p);
  const fromPrice = from != null ? displayPrice(from, p.baseCurrency, currency, p.fx) : null;
  const type = propertyTypeLabel(p.type, t);
  const reply = responseTimeText(p.responseMinutes, t);
  const policy = (POLICIES as readonly string[]).includes(p.defaultCancellationPolicy) ? (p.defaultCancellationPolicy as (typeof POLICIES)[number]) : 'moderate';
  const rating = p.reviewSummary.average;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: p.name,
    description: p.description,
    url: canonicalUrl(p),
    image: p.photos,
    telephone: p.whatsappNumber ?? undefined,
    email: p.email ?? undefined,
    address: { '@type': 'PostalAddress', streetAddress: p.address, addressLocality: p.area, addressCountry: 'LK' },
    geo: p.lat != null && p.lng != null ? { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } : undefined,
    checkinTime: p.checkIn,
    checkoutTime: p.checkOut,
    numberOfRooms: p.rooms.length,
    priceRange: from != null ? `from ${from} ${p.baseCurrency}` : undefined,
    amenityFeature: [...new Set(p.rooms.flatMap((r) => r.amenities))].slice(0, 20).map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    })),
    aggregateRating:
      reviews.count > 0 && reviews.average != null
        ? { '@type': 'AggregateRating', ratingValue: reviews.average, reviewCount: reviews.count, bestRating: 5 }
        : undefined,
    containsPlace: p.rooms.map((r) => ({
      '@type': 'HotelRoom',
      name: r.name,
      occupancy: { '@type': 'QuantitativeValue', maxValue: r.maxGuests },
      bed: r.beds || undefined,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <Hero p={p} theme={theme.key} base={base} siteKey={siteKey} typeLabel={type} fromPrice={fromPrice} />

      {/* Why book here, answered before anyone scrolls far: reviews, registration, a real host, the money. */}
      <section aria-label={t('home.whyDirect')} className="mx-auto max-w-6xl px-4 pt-8">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm md:grid-cols-4 [&_strong]:text-[0.95rem] [&_strong]:leading-snug">
          {rating != null && p.reviewSummary.count > 0 && (
            <li className="flex gap-3">
              <Star aria-hidden className="mt-0.5 h-5 w-5 shrink-0 fill-accent text-accent" />
              <a href="#reviews" className="hover:underline">
                <strong className="block text-base tabular-nums">{t('home.ratingOutOf', { rating: Number(rating).toFixed(1) })}</strong>
                <span className="text-muted">{t.n('home.ratingFrom', p.reviewSummary.count)}</span>
              </a>
            </li>
          )}
          {p.sltdaNumber && (
            <li className="flex gap-3">
              <BadgeCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <span>
                <strong className="block text-base">{t('home.sltdaRegistered')}</strong>
                <span className="text-muted">{t('home.licence', { number: p.sltdaNumber })}</span>
              </span>
            </li>
          )}
          <li className="flex gap-3">
            <MessageCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>
              <strong className="block text-base">{p.hostName ? t('home.hostHosts', { host: p.hostName }) : t('home.talkToHost')}</strong>
              <span className="text-muted">{reply ?? t('home.askWhatsapp')}</span>
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>
              <strong className="block text-base">{t('home.payToBook', { pct: p.defaultDepositPct })}</strong>
              <span className="text-muted">{t(`home.policyShort.${policy}`)}</span>
            </span>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="about">
        <div className="max-w-2xl">
          <h2 id="about" className="g-display text-3xl sm:text-4xl">
            {t('home.welcome', { name: p.name })}
          </h2>
          <p className="mt-4 whitespace-pre-line text-[1.0625rem] leading-relaxed text-muted">{p.description}</p>
          <Link href={`${base}/location`} className="mt-4 inline-block font-medium text-brand underline underline-offset-4">
            {p.area ? t('home.howToGet', { place: p.area }) : t('home.howToGetUs')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14" aria-labelledby="rooms">
        <div className="flex items-end justify-between gap-4">
          <h2 id="rooms" className="g-display text-3xl sm:text-4xl">
            {p.rooms.length === 1 ? t('home.theRoom') : t('home.rooms')}
          </h2>
          {p.rooms.length > 3 && (
            <Link href={`${base}/rooms`} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
              {t('home.seeAllRooms', { n: p.rooms.length })}
            </Link>
          )}
        </div>
        <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {p.rooms.slice(0, 3).map((r) => (
            <RoomCard key={r.id} room={r} base={base} baseCurrency={p.baseCurrency} currency={currency} fx={p.fx} />
          ))}
        </div>
      </section>

      {reviews.count > 0 && (
        <section className="pb-14" aria-labelledby="reviews">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-x-4 gap-y-1 px-4">
            <h2 id="reviews" className="g-display text-3xl sm:text-4xl">
              {t('home.whatGuestsSay')}
            </h2>
            {reviews.average != null && (
              <p className="flex items-center gap-2 pb-1 text-sm text-muted">
                <Stars rating={Math.round(reviews.average)} />
                <span>{t.n('home.reviewsSummary', reviews.count, { avg: Number(reviews.average).toFixed(1) })}</span>
              </p>
            )}
          </div>
          {/* Swipe on phones, a grid from tablet up. */}
          <ul className="g-gallery mx-auto mt-6 flex max-w-6xl gap-4 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
            {reviews.reviews.slice(0, 6).map((r, i) => (
              <li key={i} className="card w-[85%] shrink-0 p-5 sm:w-auto">
                <Stars rating={r.rating} />
                {r.body && <p className="mt-3 line-clamp-6 leading-relaxed">“{r.body}”</p>}
                <p className="mt-3 text-sm text-muted">
                  {r.guestName}, {t.date(r.createdAt)}
                </p>
                {r.ownerReply && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">{t('home.hostReply', { text: r.ownerReply })}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.hostName && (
        <section className="bg-surface-2/70" aria-labelledby="host">
          <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-12">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand/15">
              {p.hostPhotoUrl ? (
                <Image src={p.hostPhotoUrl} alt={t('home.hostPhotoAlt', { host: p.hostName })} fill sizes="80px" className="object-cover" />
              ) : (
                <span aria-hidden className="g-display flex h-full items-center justify-center text-3xl text-brand">
                  {p.hostName.slice(0, 1)}
                </span>
              )}
            </div>
            <div>
              <h2 id="host" className="g-display text-2xl">
                {t('home.yourHost', { host: p.hostName })}
              </h2>
              <p className="mt-1 text-muted">
                {reply ? t('home.replyOnWhatsapp', { reply }) : t('home.messageBeforeBook')}
              </p>
            </div>
          </div>
        </section>
      )}

      {!p.bookingDisabled && (
        <StickyBookBar
          href={`${base}/book`}
          price={fromPrice ? `${fromPrice.approx ? '≈ ' : ''}${fromPrice.text}` : null}
          note={t('home.bookbarFrom')}
          label={t('home.checkDates')}
        />
      )}
    </>
  );
}
