'use client';

import { BookUser, CalendarDays, Flag, Gauge, Languages, LifeBuoy, Palette, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: Gauge, exact: true },
  { href: '/admin/tenants', label: 'Tenants', icon: BookUser },
  { href: '/admin/ledger', label: 'Commission ledger', icon: ReceiptText },
  { href: '/admin/tickets', label: 'Support tickets', icon: LifeBuoy },
  { href: '/admin/flags', label: 'Feature flags', icon: Flag },
  { href: '/admin/themes', label: 'Themes', icon: Palette },
  { href: '/admin/translations', label: 'Translations', icon: Languages },
  { href: '/admin/holidays', label: 'Holidays', icon: CalendarDays },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Admin sections">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        // On admin.staydirect.lk the proxy serves /admin/* at the root, so match both forms.
        const p = path.startsWith('/admin') ? path : `/admin${path === '/' ? '' : path}`;
        const active = exact ? p === href : p === href || p.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            <Icon aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
