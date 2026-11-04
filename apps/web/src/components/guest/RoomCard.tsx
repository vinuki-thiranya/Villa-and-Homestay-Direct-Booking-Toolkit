import Image from 'next/image';
import Link from 'next/link';
import { BedDouble, Users } from 'lucide-react';
import type { PublicRoom } from '@staydirect/shared';
import { displayPrice } from '@/lib/format';

export function RoomCard({
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
  const price = displayPrice(room.baseRate, baseCurrency, currency, fx);
  const photo = room.photos[0];
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-surface-2">
        {photo && (
          <Image src={photo} alt={`${room.name}`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        )}
        {room.photos.length > 1 && (
          <span className="pill absolute bottom-3 right-3 bg-black/60 text-white">{room.photos.length} photos</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-xl font-semibold">{room.name}</h3>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden className="h-4 w-4" /> Up to {room.maxGuests}
            </span>
            {room.beds && (
              <span className="inline-flex items-center gap-1">
                <BedDouble aria-hidden className="h-4 w-4" /> {room.beds}
              </span>
            )}
          </p>
        </div>
        {room.amenities.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Amenities">
            {room.amenities.slice(0, 6).map((a) => (
              <li key={a} className="pill bg-surface-2 font-medium text-muted">
                {a}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="text-sm text-muted">
            from{' '}
            <span className="text-lg font-semibold text-fg">
              {price.approx && '≈ '}
              {price.text}
            </span>{' '}
            / night
          </p>
          <Link href={`${base}/book?room=${room.id}`} className="btn-primary min-h-10 px-4">
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}
