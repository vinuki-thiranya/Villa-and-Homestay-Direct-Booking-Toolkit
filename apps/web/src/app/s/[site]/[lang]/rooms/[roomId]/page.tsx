import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bath, BedDouble, Check, Moon, Users } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { Price } from '@/components/guest/Currency';
import { rich } from '@/components/guest/rich';
import { RoomGallery } from '@/components/guest/RoomGallery';
import { SearchForm } from '@/components/guest/SearchForm';
import { StickyBookBar } from '@/components/guest/StickyBookBar';
import { breadcrumbLd, roomLd } from '@/lib/jsonld';
import { guestMetadata } from '@/lib/seo';
import { siteContext, siteText } from '@/lib/site';

/** Rendered on a room's first visit, then cached like the other indexable pages. */
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ roomId: string }> };

async function load(params: Props['params']) {
  const { roomId } = await params;
  const ctx = await siteContext();
  const room = ctx.property.rooms.find((r) => r.id === roomId);
  if (!room) notFound();
  return { ...ctx, room, description: siteText(ctx.property, ctx.lang, `room:${room.id}`, room.description) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p, room, description, lang, t } = await load(params);
  return guestMetadata(p, lang, {
    path: `/rooms/${room.id}`,
    title: t('room.metaTitle', { room: room.name, name: p.name, place: p.area || t('home.sriLanka') }),
    description: t('room.metaDescription', { room: room.name, n: room.maxGuests, beds: room.beds ? `, ${room.beds}` : '', description: description.slice(0, 120) }),
    images: room.photos,
  });
}

export default async function RoomPage({ params }: Props) {
  const { property: p, room, description, base, siteKey, lang, t } = await load(params);
  const facts = [
    { icon: Users, text: t('rooms.sleeps', { n: room.maxGuests }) },
    room.beds && { icon: BedDouble, text: room.beds },
    room.bathroom && { icon: Bath, text: room.bathroom },
    room.minNights > 1 && { icon: Moon, text: t('room.minNights', { n: room.minNights }) },
  ].filter(Boolean) as { icon: typeof Users; text: string }[];

  return (
    <div className="mx-auto max-w-6xl pb-10 sm:px-4 sm:pt-8">
      <JsonLd data={[{ '@context': 'https://schema.org', ...roomLd(p, lang, room, description) }, breadcrumbLd(p, lang, [[t('layout.rooms'), '/rooms'], [room.name, `/rooms/${room.id}`]])]} />
      <RoomGallery photos={room.photos} name={room.name} sizes="(min-width: 1152px) 1152px, 100vw" aspect="aspect-[4/3] sm:aspect-[16/9]" className="overflow-hidden sm:rounded-card" priority />

      <div className="grid gap-10 px-4 pt-6 sm:px-0 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-sm text-muted">
            {rich(t('room.breadcrumb'), {
              rooms: (
                <Link href={`${base}/rooms`} className="underline-offset-4 hover:underline">
                  {t('rooms.title')}
                </Link>
              ),
              name: p.name,
            })}
          </p>
          <h1 className="g-display mt-1 text-4xl leading-tight sm:text-5xl">{room.name}</h1>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {facts.map((f) => (
              <li key={f.text} className="inline-flex items-center gap-1.5">
                <f.icon aria-hidden className="h-4 w-4 text-brand" /> {f.text}
              </li>
            ))}
          </ul>
          {description && <p className="mt-6 whitespace-pre-line text-[1.0625rem] leading-relaxed text-muted">{description}</p>}
          {room.amenities.length > 0 && (
            <>
              <h2 className="g-display mt-8 text-2xl">{t('room.inTheRoom')}</h2>
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

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={t('room.checkDates')}>
          <div id="search-card" className="card p-5">
            <p className="text-sm text-muted">
              <span className="text-2xl font-semibold text-fg">
                <Price amount={room.baseRate} from={p.baseCurrency} />
              </span>{' '}
              {t('room.priceNote')}
            </p>
            {p.bookingDisabled ? (
              <p className="mt-3 text-sm">{t('room.paused', { name: p.name })}</p>
            ) : (
              <div className="mt-4">
                <SearchForm action={`${base}/book`} site={siteKey} maxGuests={room.maxGuests} roomId={room.id} stacked />
              </div>
            )}
          </div>
        </aside>
      </div>

      {!p.bookingDisabled && <StickyBookBar href={`${base}/book?room=${room.id}`} price={{ amount: room.baseRate, currency: p.baseCurrency }} note={t('room.perNight')} label={t('home.checkDates')} />}
    </div>
  );
}
