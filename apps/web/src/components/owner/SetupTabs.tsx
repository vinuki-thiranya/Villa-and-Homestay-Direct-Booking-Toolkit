'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from './I18n';

const TABS = [
  ['/owner/setup', 'property'],
  ['/owner/setup/rooms', 'rooms'],
  ['/owner/setup/rates', 'rates'],
  ['/owner/setup/payments', 'payments'],
  ['/owner/setup/concierge', 'concierge'],
  ['/owner/setup/staff', 'staff'],
  ['/owner/setup/add-ons', 'addOns'],
  ['/owner/setup/branding', 'branding'],
  ['/owner/setup/local', 'local'],
] as const;

export function SetupTabs() {
  const path = usePathname();
  const t = useT();
  return (
    <nav aria-label={t('setup.tabsLabel')} className="flex gap-2 overflow-x-auto border-b border-line pb-2">
      {TABS.map(([href, key]) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface-2'}`}
          >
            {t(`setup.tabs.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
