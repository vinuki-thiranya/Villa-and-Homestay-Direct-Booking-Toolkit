import Link from 'next/link';
import { BedDouble, Users } from 'lucide-react';
import type { PublicRoom } from '@staydirect/shared';
import { displayPrice } from '@/lib/format';
import { guestT } from '@/lib/site';
import { RoomGallery } from './RoomGallery';

export async function RoomCard({
  room,
  base,
  baseCurrency,
  currency,
  fx,
}: {
  room: PublicRoom;
  base: string;
  baseCurrency: string;
  currency: string;
  fx: Record<string, number>;
}) {
  const t = await guestT();
  const price = displayPrice(room.baseRate, baseCurrency, currency, fx);
  const href = `${base}/rooms/${room.id}`;
  return (
    <article className="flex flex-col">
      <RoomGallery
        photos={room.photos}
        name={room.name}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        aspect="aspect-[4/3]"
        className="g-room-media overflow-hidden rounded-card"
      />
      <div className="flex flex-1 flex-col gap-2 pt-4">
        <h3 className="g-display text-2xl leading-tight">
          <Link href={href} className="underline-offset-4 hover:underline">
            {room.name}
          </Link>
        </h3>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden className="h-4 w-4" /> {t('rooms.sleeps', { n: room.maxGuests })}
          </span>
          {room.beds && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble aria-hidden className="h-4 w-4" /> {room.beds}
            </span>
          )}
        </p>
        {room.amenities.length > 0 && <p className="text-sm text-muted">{room.amenities.slice(0, 4).join(', ')}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p className="text-sm text-muted">
            <span className="text-lg font-semibold tabular-nums text-fg">
              {price.approx && '≈ '}
              {price.text}
            </span>{' '}
            {t('rooms.aNight')}
          </p>
          <Link href={`${base}/book?room=${room.id}`} className="g-cta min-h-10 px-4" aria-label={t('rooms.bookRoom', { room: room.name })}>
            {t('rooms.book')}
          </Link>
        </div>
      </div>
    </article>
  );
}
