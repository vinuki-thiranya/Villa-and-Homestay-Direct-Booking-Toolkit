// Owner navigation entries (plain module so server pages can read them too).
import {
  CalendarDays,
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
  { href: '/owner/setup', label: 'Setup', icon: Settings },
];

