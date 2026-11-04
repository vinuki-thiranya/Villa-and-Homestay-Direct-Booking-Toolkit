'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  ['/owner/setup', 'Property'],
  ['/owner/setup/rooms', 'Rooms'],
  ['/owner/setup/rates', 'Rates'],
  ['/owner/setup/payments', 'Payments'],
  ['/owner/setup/concierge', 'Concierge'],
  ['/owner/setup/staff', 'Staff'],
  ['/owner/setup/add-ons', 'Add-ons'],
] as const;

export function SetupTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Setup sections" className="flex gap-2 overflow-x-auto border-b border-line pb-2">
      {TABS.map(([href, label]) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface-2'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
