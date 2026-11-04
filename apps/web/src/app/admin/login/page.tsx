import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <main className="adm-login">
      <div className="adm-login-card">
        <h1>StayDirect admin</h1>
        <p className="adm-help" style={{ marginTop: 0, marginBottom: 20 }}>
          For StayDirect staff. Sign in with your registered mobile number.
        </p>
        {expired && (
          <p className="adm-note" role="status" style={{ marginBottom: 16 }}>
            Your session ended or this account is not an admin. Sign in again.
          </p>
        )}
        <AdminLoginForm />
      </div>
    </main>
  );
}
