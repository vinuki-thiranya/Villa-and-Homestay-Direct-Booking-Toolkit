import { AdminNav } from '@/components/admin/AdminNav';
import { adminApi, type AdminMe } from '@/lib/admin';
import { adminLogoutAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // Fails closed: no admin cookie, an expired token or an owner token all go to /admin/login.
  const me = await adminApi<AdminMe>('/admin/me');
  return (
    <div className="adm-shell">
      <aside className="adm-rail">
        <form action={adminLogoutAction} className="adm-mobile-signout">
          <button type="submit">Sign out</button>
        </form>
        <div className="adm-wordmark">
          StayDirect
          <small>Admin console</small>
        </div>
        <AdminNav />
        <div className="adm-rail-foot">
          Signed in as <strong style={{ color: '#fff' }}>{me.name}</strong>
          <form action={adminLogoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="adm-main" id="main">
        {children}
      </main>
    </div>
  );
}
