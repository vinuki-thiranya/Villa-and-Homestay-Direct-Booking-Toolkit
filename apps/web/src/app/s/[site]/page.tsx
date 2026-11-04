import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import { RoomCard } from '@/components/guest/RoomCard';
import { SearchForm } from '@/components/guest/SearchForm';
import { BookingPaused } from '@/components/guest/BookingPaused';
import { displayPrice, PROPERTY_TYPE_LABEL } from '@/lib/format';
import { canonicalUrl, fromRate, siteContext } from '@/lib/site';

const POLICY_SHORT: Record<string, string> = {
  flexible: 'Free cancellation up to 7 days before arrival',
  moderate: '50% refund up to 14 days before arrival',
  strict: 'Deposit is non-refundable',
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
  const { property: p, base, currency } = await siteContext(site);
  const hero = p.photos[0];
  const from = fromRate(p);
  const fromPrice = from != null ? displayPrice(from, p.baseCurrency, currency, p.fx) : null;
  const type = PROPERTY_TYPE_LABEL[p.type] ?? 'Stay';
  const maxGuests = Math.max(1, ...p.rooms.map((r) => r.maxGuests));

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

      <section className="relative">
        <div className="relative h-[42vh] min-h-64 w-full bg-surface-2 sm:h-[60vh]">
          {hero && <Image src={hero} alt={`${p.name}, ${p.area}`} fill priority sizes="100vw" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 text-white sm:pb-24">
            <p className="text-sm font-medium uppercase tracking-wider opacity-90">
              {type} · {p.area || 'Sri Lanka'}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-5xl">{p.name}</h1>
            {fromPrice && (
              <p className="mt-1 text-sm opacity-90">
                Rooms from {fromPrice.approx && '≈ '}
                {fromPrice.text} a night · best price when you book direct
              </p>
            )}
          </div>
        </div>
        <div className="mx-auto -mt-0 max-w-6xl px-4 sm:-mt-16">
          <div className="card relative z-10 p-4 shadow-lg sm:p-5">
            {p.bookingDisabled ? (
              <BookingPaused name={p.name} whatsapp={p.whatsappNumber} />
            ) : (
              <SearchForm action={`${base}/book`} maxGuests={maxGuests} />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="about">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 id="about" className="font-display text-2xl font-semibold">
              Welcome to {p.name}
            </h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{p.description}</p>
          </div>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Wallet aria-hidden className="h-5 w-5 shrink-0 text-brand" />
              <span>
                <strong className="block">Smaller deposit, best price</strong>
                Pay {p.defaultDepositPct}% now and the rest closer to your stay.
              </span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck aria-hidden className="h-5 w-5 shrink-0 text-brand" />
              <span>
                <strong className="block">{POLICY_SHORT[p.defaultCancellationPolicy]}</strong>
                The policy is shown again before you pay.
              </span>
            </li>
            {p.sltdaNumber && (
              <li className="flex gap-3">
                <BadgeCheck aria-hidden className="h-5 w-5 shrink-0 text-brand" />
                <span>
                  <strong className="block">Registered with SLTDA</strong>
                  {p.sltdaNumber}
                </span>
              </li>
            )}
            <li className="flex gap-3">
              <MapPin aria-hidden className="h-5 w-5 shrink-0 text-brand" />
              <span>
                <strong className="block">{p.area || 'Location'}</strong>
                <Link href={`${base}/location`} className="text-brand underline-offset-2 hover:underline">
                  How to get here
                </Link>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12" aria-labelledby="rooms">
        <div className="flex items-end justify-between">
          <h2 id="rooms" className="font-display text-2xl font-semibold">
            Rooms
          </h2>
          <Link href={`${base}/rooms`} className="text-sm font-medium text-brand underline-offset-2 hover:underline">
            All rooms
          </Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {p.rooms.slice(0, 3).map((r) => (
            <RoomCard key={r.id} room={r} base={base} baseCurrency={p.baseCurrency} currency={currency} fx={p.fx} />
          ))}
        </div>
      </section>

      {p.hostName && (
        <section className="bg-surface-2/70" aria-labelledby="host">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand/15">
              {p.hostPhotoUrl ? (
                <Image src={p.hostPhotoUrl} alt={p.hostName} fill sizes="80px" className="object-cover" />
              ) : (
                <span aria-hidden className="flex h-full items-center justify-center font-display text-3xl text-brand">
                  {p.hostName.slice(0, 1)}
                </span>
              )}
            </div>
            <div>
              <h2 id="host" className="font-display text-xl font-semibold">
                Your host, {p.hostName}
              </h2>
              <p className="mt-1 text-muted">Usually replies on WhatsApp within an hour, 7 am – 10 pm Sri Lanka time.</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
