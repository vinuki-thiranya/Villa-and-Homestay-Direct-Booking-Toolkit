import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bath, BedDouble, Check, Moon, Users } from 'lucide-react';
import { RoomGallery } from '@/components/guest/RoomGallery';
import { SearchForm } from '@/components/guest/SearchForm';
import { StickyBookBar } from '@/components/guest/StickyBookBar';
import { displayPrice } from '@/lib/format';
import { canonicalUrl, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string; roomId: string }> };

async function load(params: Props['params']) {
  const { site, roomId } = await params;
  const ctx = await siteContext(site);
  const room = ctx.property.rooms.find((r) => r.id === roomId);
  if (!room) notFound();
  return { ...ctx, room };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p, room } = await load(params);
  const title = `${room.name} at ${p.name}, ${p.area || 'Sri Lanka'} — book direct`;
  return {
    title,
    description: `${room.name}: sleeps ${room.maxGuests}${room.beds ? `, ${room.beds}` : ''}. ${room.description.slice(0, 120)}`,
    alternates: { canonical: canonicalUrl(p, `/rooms/${room.id}`) },
    openGraph: { title, images: room.photos.slice(0, 1) },
  };
}

export default async function RoomPage({ params }: Props) {
  const { property: p, room, base, currency, siteKey } = await load(params);
  const price = displayPrice(room.baseRate, p.baseCurrency, currency, p.fx);
  const priceText = `${price.approx ? '≈ ' : ''}${price.text}`;
  const facts = [
    { icon: Users, text: `Sleeps ${room.maxGuests}` },
    room.beds && { icon: BedDouble, text: room.beds },
    room.bathroom && { icon: Bath, text: room.bathroom },
    room.minNights > 1 && { icon: Moon, text: `${room.minNights} nights minimum` },
  ].filter(Boolean) as { icon: typeof Users; text: string }[];

  return (
    <div className="mx-auto max-w-6xl pb-10 sm:px-4 sm:pt-8">
      <RoomGallery photos={room.photos} name={room.name} sizes="(min-width: 1152px) 1152px, 100vw" aspect="aspect-[4/3] sm:aspect-[16/9]" className="overflow-hidden sm:rounded-card" priority />

      <div className="grid gap-10 px-4 pt-6 sm:px-0 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-sm text-muted">
            <Link href={`${base}/rooms`} className="underline-offset-4 hover:underline">
              Rooms
            </Link>{' '}
            at {p.name}
          </p>
          <h1 className="g-display mt-1 text-4xl leading-tight sm:text-5xl">{room.name}</h1>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {facts.map((f) => (
              <li key={f.text} className="inline-flex items-center gap-1.5">
                <f.icon aria-hidden className="h-4 w-4 text-brand" /> {f.text}
              </li>
            ))}
          </ul>
          {room.description && <p className="mt-6 whitespace-pre-line text-[1.0625rem] leading-relaxed text-muted">{room.description}</p>}
          {room.amenities.length > 0 && (
            <>
              <h2 className="g-display mt-8 text-2xl">In the room</h2>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                {room.amenities.map((a) => (
                  <li key={a} className="flex items-start gap-2">
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {a}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Check dates">
          <div id="search-card" className="card p-5">
            <p className="text-sm text-muted">
              <span className="text-2xl font-semibold tabular-nums text-fg">{priceText}</span> a night before discounts
            </p>
            {p.bookingDisabled ? (
              <p className="mt-3 text-sm">Online booking is paused. Message {p.name} on WhatsApp to book.</p>
            ) : (
              <div className="mt-4">
                <SearchForm action={`${base}/book`} site={siteKey} maxGuests={room.maxGuests} roomId={room.id} stacked />
              </div>
            )}
          </div>
        </aside>
      </div>

      {!p.bookingDisabled && <StickyBookBar href={`${base}/book?room=${room.id}`} price={priceText} note="Per night" />}
    </div>
  );
}
