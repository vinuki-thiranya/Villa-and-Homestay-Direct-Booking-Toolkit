import { SetupTabs } from '@/components/owner/SetupTabs';

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Setup</h1>
      <SetupTabs />
      {children}
    </div>
  );
}
