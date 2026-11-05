import type { Metadata } from 'next';
import { StaffTasks } from '@/components/staff/StaffTasks';

export const metadata: Metadata = { title: 'Today’s tasks', robots: { index: false, follow: false }, referrer: 'no-referrer' };

/** Cleaner task list from the WhatsApp link (no login; the token is the key). */
export default async function StaffTasksPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-bg px-4 py-6">
      <StaffTasks token={token} />
      <p className="mt-8 text-center text-xs text-muted">StayDirect LK</p>
    </main>
  );
}
