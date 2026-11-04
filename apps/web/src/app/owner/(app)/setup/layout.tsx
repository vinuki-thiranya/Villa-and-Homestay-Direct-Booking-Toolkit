import { SetupTabs } from '@/components/owner/SetupTabs';
import { getT } from '@/lib/owner-i18n';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t('setup.title')}</h1>
      <SetupTabs />
      {children}
    </div>
  );
}
