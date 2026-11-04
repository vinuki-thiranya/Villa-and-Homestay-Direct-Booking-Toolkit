'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { useT } from './I18n';
import { NAV_ITEMS, type NavItem } from './nav-items';

/** Phone bottom bar: the four daily screens, the rest behind "More" (one-thumb reach). */
const BOTTOM: NavItem[] = [...NAV_ITEMS.slice(0, 4), { href: '/owner/more', key: 'more', icon: MoreHorizontal }];
const MORE_PATHS = NAV_ITEMS.slice(4).map((i) => i.href);

/** Bottom tab bar on phones (one-thumb), sidebar links on desktop. */
export function OwnerNav({ variant, badges = {}, hidden = [] }: { variant: 'bottom' | 'side'; badges?: Record<string, number>; hidden?: string[] }) {
  const path = usePathname();
  const t = useT();
  const isActive = (href: string, exact?: boolean) => {
    if (href === '/owner/more') return path === href || MORE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
    return exact ? path === href : path === href || path.startsWith(`${href}/`);
  };

  if (variant === 'bottom') {
    return (
      <nav aria-label={t('nav.owner')} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {BOTTOM.map(({ href, key, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-brand' : 'text-muted'}`}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                  <span className="max-w-full truncate px-0.5">{t(`nav.${key}`)}</span>
                  {badges[href] ? (
                    <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-bad px-1 text-center text-[10px] font-bold text-white">
                      {badges[href]}
                      <span className="sr-only"> {t('nav.waiting')}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={t('nav.owner')} className="space-y-1">
      {NAV_ITEMS.filter((i) => !hidden.includes(i.href)).map(({ href, key, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}
          >
            <Icon aria-hidden className="h-5 w-5" />
            <span className="flex-1">{t(`nav.${key}`)}</span>
            {badges[href] ? <span className="rounded-full bg-bad px-1.5 text-xs font-bold text-white">{badges[href]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
