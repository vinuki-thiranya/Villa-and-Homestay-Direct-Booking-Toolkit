import type { Metadata } from 'next';
import { Clock, Navigation } from 'lucide-react';
import { canonicalUrl, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p } = await siteContext((await params).site);
  return {
    title: `How to get to ${p.name}, ${p.area || 'Sri Lanka'}`,
    description: `Address, map and directions to ${p.name} in ${p.area}. Check-in from ${p.checkIn}, check-out by ${p.checkOut}.`,
    alternates: { canonical: canonicalUrl(p, '/location') },
  };
}

export default async function LocationPage({ params }: Props) {
  const { property: p } = await siteContext((await params).site);
  const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.address;
  const directions =
    p.lat != null && p.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Location and how to get here</h1>
      <p className="mt-2 text-muted">{p.address}</p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="card aspect-[4/3] overflow-hidden">
          {q ? (
            <iframe
              title={`Map of ${p.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
          ) : (
            <p className="p-6 text-muted">Map coming soon.</p>
          )}
        </div>
        <div className="space-y-6">
          <a href={directions} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
            <Navigation aria-hidden className="h-4 w-4" /> Directions in Google Maps
          </a>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock aria-hidden className="h-4 w-4 text-brand" /> Arrival
            </h2>
            <p className="mt-2 text-sm text-muted">
              Check-in from <strong className="text-fg">{p.checkIn}</strong>, check-out by <strong className="text-fg">{p.checkOut}</strong>.
              Message the host on WhatsApp with your arrival time and we can arrange an airport or station pickup.
            </p>
          </div>
          {p.houseRules && (
            <div className="card p-5">
              <h2 className="font-semibold">House rules</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{p.houseRules}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
