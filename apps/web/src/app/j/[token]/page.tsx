import type { Metadata } from 'next';
import { JobCard } from '@/components/staff/JobCard';

export const metadata: Metadata = { title: 'Job card', robots: { index: false, follow: false }, referrer: 'no-referrer' };

/** Provider job card from the WhatsApp link (no login; the token is the key). */
export default async function JobPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-bg px-4 py-6">
      <JobCard token={token} />
      <p className="mt-8 text-center text-xs text-muted">StayDirect LK</p>
    </main>
  );
}
