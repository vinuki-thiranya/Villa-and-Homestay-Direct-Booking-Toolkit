import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { FeatureFlag } from '@staydirect/shared';
import { FEATURE_INFO } from '@/lib/owner-r3';

/**
 * Shown instead of a feature the tenant's plan does not include (spec §8 tiers), and when the API
 * answers 403 feature_not_in_plan. Says what it is, which plan has it, and where to ask.
 */
export function UpgradeNote({ feature, message }: { feature: FeatureFlag; message?: string }) {
  const info = FEATURE_INFO[feature];
  return (
    <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start" role="note">
      <Lock aria-hidden className="h-6 w-6 shrink-0 text-muted" />
      <div className="space-y-1">
        <p className="font-semibold">{info.label} is included in {info.plan}</p>
        <p className="text-sm text-muted">{message ?? 'Your current plan does not include it. Ask us to switch it on and it is ready straight away; nothing else changes.'}</p>
        <Link href="/owner/support" className="inline-block text-sm font-medium text-brand underline-offset-2 hover:underline">
          Ask StayDirect to upgrade
        </Link>
      </div>
    </div>
  );
}
