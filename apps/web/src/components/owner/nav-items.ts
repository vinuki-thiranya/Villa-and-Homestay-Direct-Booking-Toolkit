// Owner navigation entries (plain module so server pages can read them too).
import {
  Building2,
  CalendarDays,
  CreditCard,
  LifeBuoy,
  Landmark,
  UserCog,
  ClipboardCheck,
  Home,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

import type { nav } from '@/i18n/owner/en/nav';

/** `key` is the label's translation key in i18n/owner/{en,si}/nav.ts. */
export type NavItem = { href: string; key: keyof typeof nav; icon: typeof Home; exact?: boolean };

/** Everything, for the desktop sidebar and the "More" page. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/owner', key: 'today', icon: Home, exact: true },
  { href: '/owner/bookings', key: 'bookings', icon: ListChecks },
  { href: '/owner/inbox', key: 'inbox', icon: MessageCircle },
  { href: '/owner/tasks', key: 'tasks', icon: ClipboardCheck },
  { href: '/owner/calendar', key: 'calendar', icon: CalendarDays },
  { href: '/owner/add-ons', key: 'addOns', icon: Sparkles },
  { href: '/owner/guests', key: 'guests', icon: Users },
  { href: '/owner/reviews', key: 'reviews', icon: Star },
  { href: '/owner/sync', key: 'channels', icon: RefreshCw },
  { href: '/owner/portfolio', key: 'portfolio', icon: Building2 },
  { href: '/owner/owners', key: 'owners', icon: Landmark },
  { href: '/owner/team', key: 'team', icon: UserCog },
  { href: '/owner/setup', key: 'setup', icon: Settings },
  { href: '/owner/billing', key: 'billing', icon: CreditCard },
  { href: '/owner/support', key: 'support', icon: LifeBuoy },
];

/** Hide sections the user cannot use: by plan feature, by property count, by role. */
export function hiddenNav(opts: { role: string; properties: number; flags: Record<string, boolean> }): string[] {
  const hidden: string[] = [];
  if (opts.properties <= 1 && !opts.flags.multi_property) hidden.push('/owner/portfolio');
  if (!opts.flags.owner_statements) hidden.push('/owner/owners');
  if (opts.role !== 'owner') hidden.push('/owner/billing', '/owner/owners');
  return hidden;
}

