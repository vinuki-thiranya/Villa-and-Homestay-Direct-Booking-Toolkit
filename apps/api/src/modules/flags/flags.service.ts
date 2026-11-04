import { ForbiddenException, Injectable } from '@nestjs/common';
import { FEATURE_FLAGS, type FeatureFlag } from '@staydirect/shared';
import { DbService } from '../../common/db.service.js';

const TTL_MS = 30_000;

/**
 * Feature flags (spec §3.11). A tenant gets a feature when: its override says so, else its plan is
 * in the flag's plan list (spec §8 tiers), else the flag's default. Read in system context.
 */
@Injectable()
export class FlagsService {
  private cache = new Map<string, { at: number; flags: Record<FeatureFlag, boolean> }>();

  constructor(private readonly db: DbService) {}

  async forTenant(tenantId: string): Promise<Record<FeatureFlag, boolean>> {
    const hit = this.cache.get(tenantId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.flags;
    const tenant = await this.db.one<{ plan: string }>(`select plan from tenant where id = $1`, [tenantId]);
    const defs = await this.db.query<{ key: FeatureFlag; default_enabled: boolean; plans: string[] }>(`select key, default_enabled, plans from feature_flag`);
    const overrides = await this.db.query<{ key: FeatureFlag; enabled: boolean }>(`select key, enabled from feature_flag_override where tenant_id = $1`, [tenantId]);
    const ov = new Map(overrides.map((o) => [o.key, o.enabled]));
    const flags = {} as Record<FeatureFlag, boolean>;
    for (const key of FEATURE_FLAGS) {
      const def = defs.find((d) => d.key === key);
      flags[key] = ov.get(key) ?? (tenant && def?.plans.includes(tenant.plan) ? true : (def?.default_enabled ?? false));
    }
    this.cache.set(tenantId, { at: Date.now(), flags });
    return flags;
  }

  async enabled(tenantId: string, key: FeatureFlag): Promise<boolean> {
    return (await this.forTenant(tenantId))[key];
  }

  /** Throw 403 with an upgrade hint when a feature is not in the tenant's plan. */
  async require(tenantId: string, key: FeatureFlag): Promise<void> {
    if (!(await this.enabled(tenantId, key))) {
      throw new ForbiddenException({ message: `This feature is not included in your plan (${key}). Upgrade to use it.`, code: 'feature_not_in_plan', feature: key });
    }
  }

  invalidate(tenantId?: string): void {
    if (tenantId) this.cache.delete(tenantId);
    else this.cache.clear();
  }
}
