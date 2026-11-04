import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { OwnerNav } from '@/components/owner/OwnerNav';
import { hiddenNav } from '@/components/owner/nav-items';
import { getMe } from '@/lib/owner-r3';
import { PropertyFields } from '@/components/owner/PropertyFields';
import { SyncIndicator } from '@/components/owner/SyncIndicator';
import { currentProperty, getToken, listProperties, ownerApi } from '@/lib/owner';
import type { Conversation } from '@/lib/owner-types';
import { createPropertyAction, logoutAction, selectPropertyAction } from '../actions';

export const metadata: Metadata = { title: 'StayDirect LK — owner', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  if (!(await getToken())) redirect('/owner/login');
  const [properties, property, me] = await Promise.all([listProperties(), currentProperty(), getMe()]);
  const hidden = hiddenNav({ role: me.user.role, properties: properties.length, flags: me.flags });
  const waiting = property ? await inboxWaiting(property.id) : 0;
  const badges: Record<string, number> = waiting ? { '/owner/inbox': waiting } : {};

  return (
    <div className="owner min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line p-4 md:flex">
          <Link href="/owner" className="mb-6 px-3 font-display text-lg font-semibold">
            StayDirect <span className="text-brand">LK</span>
          </Link>
          {property && <OwnerNav variant="side" badges={badges} hidden={hidden} />}
          <form action={logoutAction} className="mt-auto">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-surface-2">
              <LogOut aria-hidden className="h-5 w-5" /> Log out
            </button>
          </form>
        </aside>

        <div className="min-w-0 flex-1 pb-24 md:pb-10">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur">
            {properties.length > 1 && property ? (
              <form action={selectPropertyAction} className="flex min-w-0 items-center gap-2">
                <label htmlFor="prop" className="sr-only">
                  Property
                </label>
                <select id="prop" name="propertyId" defaultValue={property.id} className="field min-h-11 min-w-0 max-w-[11rem] truncate py-1 text-sm font-semibold sm:max-w-none">
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary min-h-11 px-3">Switch</button>
              </form>
            ) : (
              <p className="min-w-0 truncate font-semibold">{property?.name ?? 'Welcome'}</p>
            )}
            <div className="ml-auto flex items-center gap-1">
              {property && <SyncIndicator propertyId={property.id} />}
            </div>
            <form action={logoutAction} className="md:hidden">
              <button className="flex h-11 w-11 items-center justify-center text-sm text-muted" aria-label="Log out">
                <LogOut aria-hidden className="h-4 w-4" />
              </button>
            </form>
          </header>
          <main className="px-4 py-5 sm:px-6">
            {property ? (
              children
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                <h1 className="text-2xl font-semibold">Set up your property</h1>
                <p className="text-muted">About 10 minutes. You can change everything later; rooms and rates come next.</p>
                <div className="card p-5">
                  <ActionForm action={createPropertyAction} submitLabel="Create property">
                    <PropertyFields />
                  </ActionForm>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      {property && <OwnerNav variant="bottom" badges={badges} hidden={hidden} />}
    </div>
  );
}

/** Conversations that need the owner: escalated by the concierge, or unread with the AI off. */
async function inboxWaiting(propertyId: string): Promise<number> {
  try {
    const convs = await ownerApi<Conversation[]>(`/properties/${propertyId}/conversations`);
    return convs.filter((c) => c.status === 'needs_human' || (c.unreadCount > 0 && c.status !== 'closed')).length;
  } catch {
    return 0; // the badge is a hint; never break the layout over it
  }
}
