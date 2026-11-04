import { Injectable, NotFoundException } from '@nestjs/common';
import type { FeatureFlag } from '@staydirect/shared';
import { DbService } from '../../common/db.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { CatalogService } from '../properties/catalog.service.js';
import { enabledMethods } from '../properties/mappers.js';

/**
 * Admin console (spec §3.11): tenants, plans and billing status, sync health and gateway status per
 * property, feature flags. Runs in system context behind AdminGuard — never reachable with a tenant token.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly db: DbService,
    private readonly flags: FlagsService,
    private readonly catalog: CatalogService,
  ) {}

  async tenants(search?: string) {
    const rows = await this.db.query(
      `select t.id, t.name, t.type, t.plan, t.billing_status, t.created_at, s.billing_model, s.status as subscription_status,
              (select count(*)::int from property p where p.tenant_id = t.id) as properties,
              (select count(*)::int from v_sync_health h where h.tenant_id = t.id and h.consecutive_failures > 0) as sync_failures,
              (select coalesce(sum(total_due), 0)::numeric(12,2) from commission_ledger l where l.tenant_id = t.id and l.status = 'due'
                  and not exists (select 1 from commission_ledger n where n.supersedes_id = l.id)) as owed_lkr,
              (select count(*)::int from support_ticket k where k.tenant_id = t.id and k.status = 'open') as open_tickets,
              (select phone from app_user u where u.tenant_id = t.id and u.role = 'owner' order by created_at limit 1) as owner_phone
         from tenant t left join subscription s on s.tenant_id = t.id
        where ($1::text is null or t.name ilike $1)
        order by t.created_at desc limit 500`,
      [search ? `%${search}%` : null],
    );
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      plan: t.plan,
      billingStatus: t.billing_status,
      billingModel: t.billing_model ?? 'flat',
      subscriptionStatus: t.subscription_status ?? null,
      properties: t.properties,
      syncFailures: t.sync_failures,
      owedLkr: t.owed_lkr,
      openTickets: t.open_tickets,
      ownerPhone: t.owner_phone,
      createdAt: t.created_at,
    }));
  }

  async tenant(id: string) {
    const t = await this.db.one(`select * from tenant where id = $1`, [id]);
    if (!t) throw new NotFoundException('Tenant not found');
    const [props, users, sync, overrides] = await Promise.all([
      this.db.query(`select * from property where tenant_id = $1 order by name`, [id]),
      this.db.query(`select id, name, phone, role, created_at from app_user where tenant_id = $1 order by created_at`, [id]),
      this.db.query(`select * from v_sync_health where tenant_id = $1 order by room_name`, [id]),
      this.db.query(`select key, enabled, updated_by, updated_at from feature_flag_override where tenant_id = $1`, [id]),
    ]);
    const sub = await this.db.one(`select * from subscription where tenant_id = $1`, [id]);
    const connections = await this.db.query(`select property_id, partner, status, last_push_at, last_pull_at, last_error from channel_connection where tenant_id = $1`, [id]);
    return {
      id: t.id,
      name: t.name,
      type: t.type,
      plan: t.plan,
      billingStatus: t.billing_status,
      subscription: sub ? { billingModel: sub.billing_model, status: sub.status, startedAt: sub.started_at, renewsAt: sub.renews_at } : null,
      flags: await this.flags.forTenant(id),
      overrides: overrides.map((o) => ({ key: o.key, enabled: o.enabled, updatedBy: o.updated_by, updatedAt: o.updated_at })),
      users: users.map((u) => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, since: u.created_at })),
      properties: props.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        customDomain: p.custom_domain,
        published: p.published,
        siteUrl: this.catalog.siteUrl(p),
        gateways: enabledMethods(this.catalog.gatewayConfig(p)),
        conciergeEnabled: p.concierge_enabled,
        channel: connections.find((c) => c.property_id === p.id) ?? null,
        sync: sync
          .filter((s) => s.property_id === p.id)
          .map((s) => ({ roomName: s.room_name, channel: s.channel, lastSuccessAt: s.last_success_at, lastStatus: s.last_status, lastError: s.last_error, failures: s.consecutive_failures })),
      })),
    };
  }

  async updateTenant(id: string, input: { plan?: string; billingStatus?: string; billingModel?: string }) {
    const t = await this.db.one(
      `update tenant set plan = coalesce($2, plan), billing_status = coalesce($3, billing_status),
              type = case when coalesce($2, plan) = 'manager' then 'manager_company' else type end
        where id = $1 returning plan`,
      [id, input.plan ?? null, input.billingStatus ?? null],
    );
    if (!t) throw new NotFoundException('Tenant not found');
    await this.db.query(
      `insert into subscription (tenant_id, plan, billing_model) values ($1, $2, coalesce($3, 'flat'))
       on conflict (tenant_id) do update set plan = excluded.plan, billing_model = coalesce($3, subscription.billing_model), updated_at = now()`,
      [id, t.plan, input.billingModel ?? null],
    );
    this.flags.invalidate(id);
    return this.tenant(id);
  }

  async flagDefinitions() {
    const rows = await this.db.query(
      `select f.*, (select count(*)::int from feature_flag_override o where o.key = f.key) as overrides from feature_flag f order by f.key`,
    );
    return rows.map((f) => ({ key: f.key, description: f.description, defaultEnabled: f.default_enabled, plans: f.plans, overrides: f.overrides }));
  }

  async updateFlag(key: FeatureFlag, input: { description?: string; defaultEnabled?: boolean; plans?: string[] }) {
    const r = await this.db.one(
      `update feature_flag set description = coalesce($2, description), default_enabled = coalesce($3, default_enabled), plans = coalesce($4, plans)
        where key = $1 returning key`,
      [key, input.description ?? null, input.defaultEnabled ?? null, input.plans ?? null],
    );
    if (!r) throw new NotFoundException('Unknown flag');
    this.flags.invalidate();
    return { ok: true };
  }

  /** enabled = null removes the override (back to the plan default). */
  async setOverride(tenantId: string, key: FeatureFlag, enabled: boolean | null, admin: string) {
    if (enabled === null) {
      await this.db.query(`delete from feature_flag_override where tenant_id = $1 and key = $2`, [tenantId, key]);
    } else {
      await this.db.query(
        `insert into feature_flag_override (tenant_id, key, enabled, updated_by) values ($1, $2, $3, $4)
         on conflict (tenant_id, key) do update set enabled = excluded.enabled, updated_by = excluded.updated_by, updated_at = now()`,
        [tenantId, key, enabled, admin],
      );
    }
    this.flags.invalidate(tenantId);
    return this.flags.forTenant(tenantId);
  }

  /** Platform health at a glance for the console home. */
  async overview() {
    const s = (await this.db.one(
      `select (select count(*)::int from tenant) as tenants,
              (select count(*)::int from property) as properties,
              (select count(*)::int from tenant where billing_status in ('grace', 'suspended')) as billing_issues,
              (select count(*)::int from v_sync_health where consecutive_failures > 0) as sync_failures,
              (select count(*)::int from support_ticket where status = 'open') as open_tickets,
              (select coalesce(sum(total_due), 0)::numeric(12,2) from commission_ledger l where status = 'due'
                  and not exists (select 1 from commission_ledger n where n.supersedes_id = l.id)) as owed_lkr,
              (select count(*)::int from booking where source = 'direct' and status in ('confirmed', 'checked_in', 'checked_out')
                  and created_at > now() - interval '30 days') as direct_bookings_30d`,
    ))!;
    return {
      tenants: s.tenants,
      properties: s.properties,
      billingIssues: s.billing_issues,
      syncFailures: s.sync_failures,
      openTickets: s.open_tickets,
      owedLkr: s.owed_lkr,
      directBookings30d: s.direct_bookings_30d,
    };
  }
}
