import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MessageCircle, ShieldCheck, Star } from 'lucide-react';
import { Hero } from '@/components/guest/Hero';
import { RoomCard } from '@/components/guest/RoomCard';
import { StickyBookBar } from '@/components/guest/StickyBookBar';
import { Stars } from '@/components/Stars';
import { getSiteReviews } from '@/lib/api';
import { displayPrice, fmtDate, PROPERTY_TYPE_LABEL } from '@/lib/format';
import { canonicalUrl, fromRate, responseTimeText, siteContext } from '@/lib/site';

const POLICY_SHORT: Record<string, string> = {
  flexible: 'Free cancellation up to 7 days before arrival',
  moderate: 'Half refunded up to 14 days before arrival',
  strict: 'The deposit is non-refundable',
};

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params;
  const { property: p } = await siteContext(site);
  const type = PROPERTY_TYPE_LABEL[p.type] ?? 'Stay';
  const title = `${p.name} — ${type} in ${p.area || 'Sri Lanka'} — book direct, best price`;
  const description = `${type} in ${p.area || 'Sri Lanka'} with ${p.rooms.length} rooms. Book direct with ${p.name} for the best price and a smaller deposit.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(p) },
    openGraph: { title, description, images: p.photos.slice(0, 1), type: 'website' },
  };
}

export default async function SiteHome({ params }: Props) {
  const { site } = await params;
  const { property: p, base, currency, siteKey, theme } = await siteContext(site);
  const reviews = await getSiteReviews(siteKey);
  const from = fromRate(p);
  const fromPrice = from != null ? displayPrice(from, p.baseCurrency, currency, p.fx) : null;
  const type = PROPERTY_TYPE_LABEL[p.type] ?? 'Stay';
  const reply = responseTimeText(p.responseMinutes);
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
      <section aria-label="Why book direct" className="mx-auto max-w-6xl px-4 pt-8">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm md:grid-cols-4 [&_strong]:text-[0.95rem] [&_strong]:leading-snug">
          {rating != null && p.reviewSummary.count > 0 && (
            <li className="flex gap-3">
              <Star aria-hidden className="mt-0.5 h-5 w-5 shrink-0 fill-accent text-accent" />
              <a href="#reviews" className="hover:underline">
                <strong className="block text-base tabular-nums">{Number(rating).toFixed(1)} out of 5</strong>
                <span className="text-muted">
                  from {p.reviewSummary.count} guest review{p.reviewSummary.count === 1 ? '' : 's'}
                </span>
              </a>
            </li>
          )}
          {p.sltdaNumber && (
            <li className="flex gap-3">
              <BadgeCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <span>
                <strong className="block text-base">SLTDA registered</strong>
                <span className="text-muted">Licence {p.sltdaNumber}</span>
              </span>
            </li>
          )}
          <li className="flex gap-3">
            <MessageCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>
              <strong className="block text-base">{p.hostName ? `${p.hostName} hosts` : 'Talk to the host'}</strong>
              <span className="text-muted">{reply ?? 'Ask anything on WhatsApp'}</span>
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>
              <strong className="block text-base">Pay {p.defaultDepositPct}% to book</strong>
              <span className="text-muted">{POLICY_SHORT[p.defaultCancellationPolicy]}</span>
            </span>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="about">
        <div className="max-w-2xl">
          <h2 id="about" className="g-display text-3xl sm:text-4xl">
            Welcome to {p.name}
          </h2>
          <p className="mt-4 whitespace-pre-line text-[1.0625rem] leading-relaxed text-muted">{p.description}</p>
          <Link href={`${base}/location`} className="mt-4 inline-block font-medium text-brand underline underline-offset-4">
            How to get to {p.area || 'us'}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14" aria-labelledby="rooms">
        <div className="flex items-end justify-between gap-4">
          <h2 id="rooms" className="g-display text-3xl sm:text-4xl">
            {p.rooms.length === 1 ? 'The room' : 'Rooms'}
          </h2>
          {p.rooms.length > 3 && (
            <Link href={`${base}/rooms`} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
              See all {p.rooms.length} rooms
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
              What guests say
            </h2>
            {reviews.average != null && (
              <p className="flex items-center gap-2 pb-1 text-sm text-muted">
                <Stars rating={Math.round(reviews.average)} />
                <span>
                  {Number(reviews.average).toFixed(1)} from {reviews.count} review{reviews.count === 1 ? '' : 's'}
                </span>
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
                  {r.guestName}, {fmtDate(r.createdAt)}
                </p>
                {r.ownerReply && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">Host reply: {r.ownerReply}</p>}
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
                <Image src={p.hostPhotoUrl} alt={`${p.hostName}, your host`} fill sizes="80px" className="object-cover" />
              ) : (
                <span aria-hidden className="g-display flex h-full items-center justify-center text-3xl text-brand">
                  {p.hostName.slice(0, 1)}
                </span>
              )}
            </div>
            <div>
              <h2 id="host" className="g-display text-2xl">
                Your host, {p.hostName}
              </h2>
              <p className="mt-1 text-muted">
                {reply ? `${reply} on WhatsApp.` : 'Message on WhatsApp with any question before you book.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {!p.bookingDisabled && (
        <StickyBookBar href={`${base}/book`} price={fromPrice ? `${fromPrice.approx ? '≈ ' : ''}${fromPrice.text}` : null} />
      )}
    </>
  );
}
