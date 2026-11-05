import type { PublicProperty, PublicRoom } from '@staydirect/shared';
import { localeUrl, siteOrigin } from './seo';
import { HREFLANG, type SiteLang } from './site-routing';

/*
 * schema.org structured data for guest sites. Plain objects; <JsonLd> (components/JsonLd.tsx)
 * serialises them. One @id per thing, so the home page, room pages and breadcrumbs describe the
 * same LodgingBusiness instead of several.
 */

type Ld = Record<string, unknown>;

export interface LdReview {
  rating: number;
  body: string;
  guestName: string;
  createdAt: string;
}

export function lodgingId(p: PublicProperty): string {
  return `${siteOrigin(p)}/#lodging`;
}

export function roomId(p: PublicProperty, r: PublicRoom): string {
  return `${siteOrigin(p)}/rooms/${r.id}#room`;
}

function mapsUrl(p: PublicProperty): string {
  return p.lat != null && p.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address}`)}`;
}

function amenities(list: string[]): Ld[] {
  return list.slice(0, 20).map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true }));
}

/** A room as a HotelRoom with its nightly "from" rate as an Offer. */
export function roomLd(p: PublicProperty, lang: SiteLang, r: PublicRoom, description?: string): Ld {
  return {
    '@type': 'HotelRoom',
    '@id': roomId(p, r),
    name: r.name,
    url: localeUrl(p, lang, `/rooms/${r.id}`),
    description: description || r.description || undefined,
    image: r.photos.slice(0, 6),
    occupancy: { '@type': 'QuantitativeValue', maxValue: r.maxGuests },
    bed: r.beds || undefined,
    amenityFeature: r.amenities.length ? amenities(r.amenities) : undefined,
    containedInPlace: { '@id': lodgingId(p) },
    offers: {
      '@type': 'Offer',
      url: localeUrl(p, lang, `/rooms/${r.id}`),
      priceSpecification: { '@type': 'UnitPriceSpecification', price: r.baseRate, priceCurrency: p.baseCurrency, unitCode: 'DAY', unitText: 'night' },
    },
  };
}

/** The property: address, geo, rooms, amenities, rating and the latest reviews. */
export function lodgingLd(p: PublicProperty, lang: SiteLang, opts: { description?: string; reviews?: LdReview[] } = {}): Ld {
  const rates = p.rooms.map((r) => r.baseRate);
  const reviews = (opts.reviews ?? []).filter((r) => r.body).slice(0, 5);
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': lodgingId(p),
    name: p.name,
    description: opts.description || p.description || undefined,
    url: localeUrl(p, lang),
    inLanguage: HREFLANG[lang],
    image: p.photos.slice(0, 10),
    telephone: p.whatsappNumber ?? undefined,
    email: p.email ?? undefined,
    address: { '@type': 'PostalAddress', streetAddress: p.address, addressLocality: p.area || undefined, addressCountry: 'LK' },
    geo: p.lat != null && p.lng != null ? { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } : undefined,
    hasMap: mapsUrl(p),
    sameAs: p.googleReviewUrl ? [p.googleReviewUrl] : undefined,
    checkinTime: p.checkIn,
    checkoutTime: p.checkOut,
    numberOfRooms: p.rooms.length,
    currenciesAccepted: p.baseCurrency,
    priceRange: rates.length ? `${p.baseCurrency} ${Math.min(...rates)}–${Math.max(...rates)}` : undefined,
    amenityFeature: amenities([...new Set(p.rooms.flatMap((r) => r.amenities))]),
    aggregateRating:
      p.reviewSummary.count > 0 && p.reviewSummary.average != null
        ? { '@type': 'AggregateRating', ratingValue: Number(p.reviewSummary.average.toFixed(1)), reviewCount: p.reviewSummary.count, bestRating: 5, worstRating: 1 }
        : undefined,
    review: reviews.length
      ? reviews.map((r) => ({
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          author: { '@type': 'Person', name: r.guestName || 'Guest' },
          datePublished: r.createdAt.slice(0, 10),
          reviewBody: r.body,
        }))
      : undefined,
    containsPlace: p.rooms.map((r) => ({ '@type': 'HotelRoom', '@id': roomId(p, r), name: r.name })),
  };
}

/** Breadcrumbs from the site home to this page: [[name, path], …] with paths after the language prefix. */
export function breadcrumbLd(p: PublicProperty, lang: SiteLang, trail: [string, string][]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [[p.name, ''] as [string, string], ...trail].map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: localeUrl(p, lang, path),
    })),
  };
}

/** `"<"` escaped, so text from owners or guests can never close the script tag. */
export function ldJson(data: Ld | Ld[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
