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

export type NavItem = { href: string; label: string; icon: typeof Home; exact?: boolean };

/** Everything, for the desktop sidebar and the "More" page. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/owner', label: 'Today', icon: Home, exact: true },
  { href: '/owner/inbox', label: 'Inbox', icon: MessageCircle },
  { href: '/owner/bookings', label: 'Bookings', icon: ListChecks },
  { href: '/owner/tasks', label: 'Tasks', icon: ClipboardCheck },
  { href: '/owner/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/owner/add-ons', label: 'Add-ons', icon: Sparkles },
  { href: '/owner/guests', label: 'Guests', icon: Users },
  { href: '/owner/reviews', label: 'Reviews', icon: Star },
  { href: '/owner/sync', label: 'Channels', icon: RefreshCw },
  { href: '/owner/portfolio', label: 'All properties', icon: Building2 },
  { href: '/owner/owners', label: 'Owners & statements', icon: Landmark },
  { href: '/owner/team', label: 'Team', icon: UserCog },
  { href: '/owner/setup', label: 'Setup', icon: Settings },
  { href: '/owner/billing', label: 'Plan & billing', icon: CreditCard },
  { href: '/owner/support', label: 'Support', icon: LifeBuoy },
];

/** Hide sections the user cannot use: by plan feature, by property count, by role. */
export function hiddenNav(opts: { role: string; properties: number; flags: Record<string, boolean> }): string[] {
  const hidden: string[] = [];
  if (opts.properties <= 1 && !opts.flags.multi_property) hidden.push('/owner/portfolio');
  if (!opts.flags.owner_statements) hidden.push('/owner/owners');
  if (opts.role !== 'owner') hidden.push('/owner/billing', '/owner/owners');
  return hidden;
}

