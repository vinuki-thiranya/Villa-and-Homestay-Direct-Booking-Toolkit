import Image from 'next/image';
import type { PublicProperty } from '@staydirect/shared';
import { guestT } from '@/lib/site';
import type { ThemeKey } from '@/themes/registry';
import { BookingPaused } from './BookingPaused';
import { HeroVideo } from './HeroVideo';
import { SearchForm } from './SearchForm';

interface Props {
  p: PublicProperty;
  theme: ThemeKey;
  base: string;
  siteKey: string;
  typeLabel: string;
  fromPrice: { text: string; approx: boolean } | null;
}

/**
 * First view: the place, its name and the date search, all inside a 375 × 667 screen. Each theme
 * stages it differently (guest.css): lagoon over the water, jungle in a verandah arch, surf on a
 * yellow band.
 */
export async function Hero({ p, theme, base, siteKey, typeLabel, fromPrice }: Props) {
  const t = await guestT();
  const area = p.area || t('home.sriLanka');
  const place = t('home.place', { type: typeLabel, place: area });
  const price = fromPrice ? t('home.roomsFrom', { price: `${fromPrice.approx ? '≈ ' : ''}${fromPrice.text}` }) : null;
  const media = (
    <>
      {p.photos[0] && (
        <Image src={p.photos[0]} alt={t('home.heroAlt', { name: p.name, place: area })} fill preload fetchPriority="high" quality={60} sizes="(min-width: 768px) 60vw, 100vw" />
      )}
      {p.heroVideoUrl && <HeroVideo src={p.heroVideoUrl} />}
    </>
  );
  const search = (
    <div id="search-card" className="g-search">
      {p.bookingDisabled ? (
        <BookingPaused name={p.name} whatsapp={p.whatsappNumber} />
      ) : (
        <SearchForm action={`${base}/book`} site={siteKey} maxGuests={Math.max(1, ...p.rooms.map((r) => r.maxGuests))} />
      )}
    </div>
  );

  if (theme === 'jungle') {
    return (
      <section className="g-jungle-hero mx-auto max-w-6xl px-4 pt-6 md:py-14">
        <div className="[grid-area:text] md:self-end md:pb-8">
          <p className="text-sm font-medium text-brand">{place}</p>
          <h1 className="g-name mt-2">{p.name}</h1>
          {price && <p className="mt-3 hidden text-muted md:block">{price}</p>}
        </div>
        <div className="mt-5 [grid-area:media] md:mt-0">
          <div className="g-hero-media g-arch">{media}</div>
        </div>
        <div className="g-search-wrap [grid-area:search] md:self-start">{search}</div>
      </section>
    );
  }

  if (theme === 'surf') {
    return (
      <section>
        <div className="g-hero-media">
          {media}
          <div className="g-hero-scrim" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-12 text-white sm:pb-16">
            <h1 className="g-name">{p.name}</h1>
            <p className="mt-3 text-base font-medium opacity-95">{place}</p>
            {price && <p className="mt-0.5 text-sm opacity-90">{price}</p>}
          </div>
        </div>
        <div className="g-search-band">
          <div className="mx-auto max-w-6xl px-4">{search}</div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="g-hero-media">
        {media}
        <div className="g-hero-scrim" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-16 text-white sm:pb-28">
          <p className="text-sm font-medium opacity-95">{place}</p>
          <h1 className="g-name mt-1">{p.name}</h1>
          <span className="g-horizon" aria-hidden />
          {price && <p className="mt-3 hidden text-sm opacity-90 sm:block">{price}</p>}
        </div>
      </div>
      <div className="g-search-wrap mx-auto max-w-6xl px-4">{search}</div>
    </section>
  );
}
