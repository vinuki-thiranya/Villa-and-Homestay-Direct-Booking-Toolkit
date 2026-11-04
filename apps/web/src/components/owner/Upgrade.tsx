import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { FeatureFlag } from '@staydirect/shared';
import type { OwnerKey } from '@/i18n/owner/t';
import { FEATURE_INFO } from '@/lib/owner-r3';
import { getT } from '@/lib/owner-i18n';
import { tLabel } from './labels';

/**
 * Shown instead of a feature the tenant's plan does not include (spec §8 tiers), and when the API
 * answers 403 feature_not_in_plan. Says what it is, which plan has it, and where to ask.
 */
export async function UpgradeNote({ feature, message }: { feature: FeatureFlag; message?: string }) {
  const t = await getT();
  const info = FEATURE_INFO[feature];
  const planKey = `shared.plans.${feature === 'ota_direct_api' ? 'addOn' : info.plan}` as OwnerKey;
  const plan = t(planKey) === planKey ? info.plan : t(planKey);
  return (
    <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start" role="note">
      <Lock aria-hidden className="h-6 w-6 shrink-0 text-muted" />
      <div className="space-y-1">
        <p className="font-semibold">{t('shared.upgrade.title', { feature: tLabel(t, 'features', feature), plan })}</p>
        <p className="text-sm text-muted">{message ?? t('shared.upgrade.body')}</p>
        <Link href="/owner/support" className="inline-block text-sm font-medium text-brand underline-offset-2 hover:underline">
          {t('shared.upgrade.ask')}
        </Link>
      </div>
    </div>
  );
}
