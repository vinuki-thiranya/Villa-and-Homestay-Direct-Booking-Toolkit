'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Swipeable photos: native scroll-snap does the swiping (no gesture library), the dots follow the
 * visible slide, and the arrow buttons give keyboard and mouse users the same reach.
 */
export function RoomGallery({
  photos,
  name,
  sizes,
  aspect = 'aspect-[4/3]',
  className = '',
  priority = false,
}: {
  photos: string[];
  name: string;
  sizes: string;
  aspect?: string;
  className?: string;
  priority?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el || photos.length < 2) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.i));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll('[data-i]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [photos.length]);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  if (photos.length === 0) return <div className={`${aspect} bg-surface-2 ${className}`} />;

  return (
    <div className={`group relative ${className}`} role="region" aria-roledescription="carousel" aria-label={`Photos of ${name}`}>
      <div ref={track} className={`g-gallery flex overflow-x-auto ${aspect}`} tabIndex={-1}>
        {photos.map((src, i) => (
          <div
            key={src + i}
            data-i={i}
            className="relative h-full w-full shrink-0 bg-surface-2"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${photos.length}`}
          >
            <Image src={src} alt={i === 0 ? name : `${name}, photo ${i + 1}`} fill sizes={sizes} preload={priority && i === 0} quality={60} className="object-cover" />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow transition-opacity disabled:opacity-0 sm:flex"
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow transition-opacity disabled:opacity-0 sm:flex"
          >
            <ChevronRight aria-hidden className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5" aria-hidden>
            {photos.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full bg-white shadow transition-all ${i === index ? 'w-4 opacity-100' : 'w-1.5 opacity-60'}`} />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Photo {index + 1} of {photos.length}
          </p>
        </>
      )}
    </div>
  );
}
