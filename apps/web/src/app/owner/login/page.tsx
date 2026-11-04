import type { Metadata } from 'next';
import { LoginForm } from '@/components/owner/LoginForm';

export const metadata: Metadata = { title: 'Owner login — StayDirect LK', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const invite = q.invite && /^[a-f0-9]{24,64}$/.test(q.invite) ? q.invite : undefined;
  return (
    <div className="owner flex min-h-dvh items-center justify-center bg-bg px-4 text-fg">
      <div className="card w-full max-w-sm p-6 shadow-sm">
        <p className="font-display text-xl font-semibold">
          StayDirect <span className="text-brand">LK</span>
        </p>
        <h1 className="mt-4 text-lg font-semibold">{invite ? 'Join your team on StayDirect' : 'Log in to your property'}</h1>
        {invite && <p className="mt-2 text-sm text-muted">Enter the mobile number the invite was sent to. We will text you a code.</p>}
        {q.expired && <p className="mt-2 rounded-lg bg-warn-bg p-2 text-sm text-warn">Your session expired. Please log in again.</p>}
        <div className="mt-5">
          <LoginForm devHint={process.env.NODE_ENV !== 'production'} inviteToken={invite} />
        </div>
      </div>
    </div>
  );
}
