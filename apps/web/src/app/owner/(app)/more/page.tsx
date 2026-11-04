import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { NAV_ITEMS } from '@/components/owner/nav-items';

export const metadata = { title: 'More' };

/** Phone-only overflow menu for the sections that are not in the bottom bar. */
export default function MorePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">More</h1>
      <ul className="card divide-y divide-line">
        {NAV_ITEMS.slice(4).map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center gap-3 px-4 text-base font-medium hover:bg-surface-2">
              <Icon aria-hidden className="h-5 w-5 text-brand" />
              <span className="flex-1">{label}</span>
              <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
