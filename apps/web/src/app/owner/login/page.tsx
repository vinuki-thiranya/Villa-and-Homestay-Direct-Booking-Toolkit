import type { Metadata } from 'next';
import { LoginForm } from '@/components/owner/LoginForm';

export const metadata: Metadata = { title: 'Owner login — StayDirect LK', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  return (
    <div className="owner flex min-h-dvh items-center justify-center bg-bg px-4 text-fg">
      <div className="card w-full max-w-sm p-6 shadow-sm">
        <p className="font-display text-xl font-semibold">
          StayDirect <span className="text-brand">LK</span>
        </p>
        <h1 className="mt-4 text-lg font-semibold">Log in to your property</h1>
        {q.expired && <p className="mt-2 rounded-lg bg-warn-bg p-2 text-sm text-warn">Your session expired. Please log in again.</p>}
        <div className="mt-5">
          <LoginForm devHint={process.env.NODE_ENV !== 'production'} />
        </div>
      </div>
    </div>
  );
}
