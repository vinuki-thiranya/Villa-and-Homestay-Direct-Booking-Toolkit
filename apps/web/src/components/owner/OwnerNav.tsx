'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, ListChecks, RefreshCw, Settings } from 'lucide-react';

const ITEMS = [
  { href: '/owner', label: 'Today', icon: Home, exact: true },
  { href: '/owner/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/owner/bookings', label: 'Bookings', icon: ListChecks },
  { href: '/owner/sync', label: 'Channels', icon: RefreshCw },
  { href: '/owner/setup', label: 'Setup', icon: Settings },
];

/** Bottom tab bar on phones (one-thumb), sidebar links on desktop. */
export function OwnerNav({ variant, badges = {} }: { variant: 'bottom' | 'side'; badges?: Record<string, number> }) {
  const path = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

  if (variant === 'bottom') {
    return (
      <nav aria-label="Owner" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-brand' : 'text-muted'}`}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                  {label}
                  {badges[href] ? (
                    <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-bad px-1 text-center text-[10px] font-bold text-white">{badges[href]}</span>
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
    <nav aria-label="Owner" className="space-y-1">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}
          >
            <Icon aria-hidden className="h-5 w-5" />
            <span className="flex-1">{label}</span>
            {badges[href] ? <span className="rounded-full bg-bad px-1.5 text-xs font-bold text-white">{badges[href]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
