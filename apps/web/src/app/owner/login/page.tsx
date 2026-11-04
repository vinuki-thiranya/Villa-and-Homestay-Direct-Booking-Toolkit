import type { Metadata } from 'next';
import { OwnerI18nProvider } from '@/components/owner/I18n';
import { LanguageSwitch } from '@/components/owner/LanguageSwitch';
import { LoginForm } from '@/components/owner/LoginForm';
import { Sandakada } from '@/components/owner/motifs';
import { getT } from '@/lib/owner-i18n';
import { FONT_VARIABLES } from '@/themes/fonts';
import '../owner.css';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('login.metaTitle'), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const t = await getT(); // signed out: this device's last language (sd_lang cookie)
  const invite = q.invite && /^[a-f0-9]{24,64}$/.test(q.invite) ? q.invite : undefined;
  return (
    <OwnerI18nProvider lang={t.lang}>
      <div className={`owner ${FONT_VARIABLES} flex min-h-dvh items-center justify-center bg-bg px-4 text-fg`} lang={t.lang}>
        <div className="w-full max-w-sm">
          <div className="mb-3 flex justify-end">
            <LanguageSwitch lang={t.lang} compact />
          </div>
          <Sandakada lang={t.lang} className="mx-auto mb-[-1px]" />
          <div className="card w-full p-6 shadow-sm">
            <p className="font-display text-xl font-semibold">
              StayDirect <span className="text-brand">LK</span>
            </p>
            <h1 className="mt-4 text-lg font-semibold">{invite ? t('login.joinTitle') : t('login.title')}</h1>
            {invite && <p className="mt-2 text-sm text-muted">{t('login.inviteHint')}</p>}
            {q.expired && <p className="mt-2 rounded-lg bg-warn-bg p-2 text-sm text-warn">{t('login.expired')}</p>}
            <div className="mt-5">
              <LoginForm devHint={process.env.NODE_ENV !== 'production'} inviteToken={invite} />
            </div>
          </div>
        </div>
      </div>
    </OwnerI18nProvider>
  );
}
