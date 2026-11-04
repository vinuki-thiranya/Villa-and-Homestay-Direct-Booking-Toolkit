'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useGT } from './GuestI18n';

/**
 * Phone-only bar with the "from" price and a Book button. Hidden while the search form is on screen
 * (it already does the same job) and on wider screens, where the header button is in reach.
 */
export function StickyBookBar({
  href,
  price,
  note,
  label,
  watch = 'search-card',
}: {
  href: string;
  price: string | null;
  note?: string;
  label?: string;
  watch?: string;
}) {
  const [hidden, setHidden] = useState(true);
  const t = useGT();

  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target) {
      setHidden(false);
      return;
    }
    const io = new IntersectionObserver(([e]) => setHidden(!!e?.isIntersecting || (e?.boundingClientRect.top ?? 0) > 0), { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, [watch]);

  return (
    <div
      className={`g-bookbar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur transition-transform duration-200 md:hidden ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
      aria-hidden={hidden}
      inert={hidden}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        {price && (
          <p className="min-w-0 flex-1 leading-tight">
            <span className="block text-xs text-muted">{note ?? t('home.bookbarFrom')}</span>
            <span className="text-lg font-semibold tabular-nums">{price}</span>
          </p>
        )}
        <Link href={href} className={`g-cta ${price ? '' : 'flex-1'}`}>
          {label ?? t('home.checkDates')}
        </Link>
      </div>
    </div>
  );
}
