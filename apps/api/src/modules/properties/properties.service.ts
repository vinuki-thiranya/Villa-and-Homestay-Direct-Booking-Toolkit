import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GatewayConfigSchema,
  MAX_ICAL_SOURCES_PER_ROOM,
  type GatewayConfig,
  type PropertyUpsert,
  type RatePlanUpsert,
  type RoomUpsert,
  type SessionUser,
} from '@staydirect/shared';
import { encryptJson } from '../../common/crypto.js';
import { DbService, isUniqueViolation } from '../../common/db.service.js';
import { RevalidateService } from '../../common/revalidate.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { CatalogService } from './catalog.service.js';
import {
  columnsFor,
  enabledMethods,
  PROPERTY_COLUMNS,
  RATE_PLAN_COLUMNS,
  ROOM_COLUMNS,
  toOwnerProperty,
  toOwnerRatePlan,
  toOwnerRoom,
} from './mappers.js';

/** Owner/manager setup of properties, rooms, rate plans, gateways and iCal sources. All RLS-scoped. */
@Injectable()
export class PropertiesService {
  constructor(
    private readonly db: DbService,
    private readonly catalog: CatalogService,
    private readonly revalidate: RevalidateService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  list(user: SessionUser) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from property order by created_at`, [], tx);
      return rows.map(toOwnerProperty);
    });
  }

  get(user: SessionUser, id: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.db.one(`select * from property where id = $1`, [id], tx);
      if (!p) throw new NotFoundException('Property not found');
      const cfg = this.catalog.gatewayConfig(p);
      return {
        ...toOwnerProperty(p),
        paymentMethods: enabledMethods(cfg),
        gateways: maskGateways(cfg),
        siteUrl: this.catalog.siteUrl(p),
      };
    });
  }

  async create(user: SessionUser, input: PropertyUpsert) {
    const { cols, params, placeholders } = columnsFor(input, PROPERTY_COLUMNS, 2);
    try {
      return await this.db.withTenant(user.tenantId, async (tx) => {
        const row = await this.db.one(
          `insert into property (tenant_id, ${cols.join(', ')}) values ($1, ${placeholders.join(', ')}) returning *`,
          [user.tenantId, ...params],
          tx,
        );
        await this.audit(tx, user, 'property.create', 'property', row!.id, null, row);
        return toOwnerProperty(row!);
      });
    } catch (err) {
      throw this.uniqueError(err);
    }
  }

  async update(user: SessionUser, id: string, input: Partial<PropertyUpsert>) {
    const { params, set } = columnsFor(input, PROPERTY_COLUMNS, 2);
    if (set.length === 0) return this.get(user, id);
    try {
      const out = await this.db.withTenant(user.tenantId, async (tx) => {
        const before = await this.db.one(`select * from property where id = $1`, [id], tx);
        if (!before) throw new NotFoundException('Property not found');
        const row = await this.db.one(
          `update property set ${set.join(', ')}, updated_at = now() where id = $1 returning *`,
          [id, ...params],
          tx,
        );
        await this.audit(tx, user, 'property.update', 'property', id, strip(before), strip(row!));
        return toOwnerProperty(row!);
      });
      this.revalidate.property(id);
      return out;
    } catch (err) {
      throw this.uniqueError(err);
    }
  }

  async setGateways(user: SessionUser, id: string, input: GatewayConfig) {
    const patch = GatewayConfigSchema.parse(input);
    let cfg: GatewayConfig = patch;
    await this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.db.one(`select id, gateway_config from property where id = $1`, [id], tx);
      if (!p) throw new NotFoundException('Property not found');
      // Keys left out keep their stored value; null removes a method.
      cfg = { ...(this.catalog.gatewayConfig(p) ?? {}), ...patch };
      await this.db.query(`update property set gateway_config = $2, updated_at = now() where id = $1`, [
        id,
        encryptJson(cfg, this.config.ENCRYPTION_KEY),
      ], tx);
      // Never write secrets to the audit log: record which methods changed only.
      await this.audit(tx, user, 'property.gateways', 'property', id, null, { methods: enabledMethods(cfg) });
    });
    this.revalidate.property(id);
    return { paymentMethods: enabledMethods(cfg), gateways: maskGateways(cfg) };
  }

  // ---------------------------------------------------------------- rooms
  listRooms(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from room where property_id = $1 order by sort_order, name`, [propertyId], tx);
      return rows.map(toOwnerRoom);
    });
  }

  async createRoom(user: SessionUser, propertyId: string, input: RoomUpsert) {
    if (input.baseGuests > input.maxGuests) throw new BadRequestException('baseGuests cannot exceed maxGuests');
    const { cols, params, placeholders } = columnsFor(input, ROOM_COLUMNS, 3);
    const out = await this.db.withTenant(user.tenantId, async (tx) => {
      await this.requireProperty(tx, propertyId);
      const row = await this.db.one(
        `insert into room (tenant_id, property_id, ${cols.join(', ')}) values ($1, $2, ${placeholders.join(', ')}) returning *`,
        [user.tenantId, propertyId, ...params],
        tx,
      );
      await this.audit(tx, user, 'room.create', 'room', row!.id, null, row);
      return toOwnerRoom(row!);
    });
    this.revalidate.property(propertyId);
    return out;
  }

  async updateRoom(user: SessionUser, roomId: string, input: Partial<RoomUpsert>) {
    const { params, set } = columnsFor(input, ROOM_COLUMNS, 2);
    const out = await this.db.withTenant(user.tenantId, async (tx) => {
      const before = await this.db.one(`select * from room where id = $1`, [roomId], tx);
      if (!before) throw new NotFoundException('Room not found');
      if (set.length === 0) return toOwnerRoom(before);
      const row = await this.db.one(`update room set ${set.join(', ')} where id = $1 returning *`, [roomId, ...params], tx);
      await this.audit(tx, user, 'room.update', 'room', roomId, before, row);
      return toOwnerRoom(row!);
    });
    this.revalidate.property(out.propertyId);
    return out;
  }

  // ---------------------------------------------------------------- rate plans
  listRatePlans(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from rate_plan where property_id = $1 order by kind, priority, created_at`, [propertyId], tx);
      return rows.map(toOwnerRatePlan);
    });
  }

  createRatePlan(user: SessionUser, propertyId: string, input: RatePlanUpsert) {
    const { cols, params, placeholders } = columnsFor(input, RATE_PLAN_COLUMNS, 3);
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.requireProperty(tx, propertyId);
      const row = await this.db.one(
        `insert into rate_plan (tenant_id, property_id, ${cols.join(', ')}) values ($1, $2, ${placeholders.join(', ')}) returning *`,
        [user.tenantId, propertyId, ...params],
        tx,
      );
      await this.audit(tx, user, 'rate_plan.create', 'rate_plan', row!.id, null, row);
      return toOwnerRatePlan(row!);
    });
  }

  updateRatePlan(user: SessionUser, planId: string, input: RatePlanUpsert) {
    const { params, set } = columnsFor(input, RATE_PLAN_COLUMNS, 2);
    return this.db.withTenant(user.tenantId, async (tx) => {
      const before = await this.db.one(`select * from rate_plan where id = $1`, [planId], tx);
      if (!before) throw new NotFoundException('Rate plan not found');
      const row = await this.db.one(`update rate_plan set ${set.join(', ')} where id = $1 returning *`, [planId, ...params], tx);
      await this.audit(tx, user, 'rate_plan.update', 'rate_plan', planId, before, row);
      return toOwnerRatePlan(row!);
    });
  }

  deleteRatePlan(user: SessionUser, planId: string) {
    // Rate plans are deactivated, not deleted, so past quotes stay explainable.
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(`update rate_plan set active = false where id = $1 returning *`, [planId], tx);
      if (!row) throw new NotFoundException('Rate plan not found');
      await this.audit(tx, user, 'rate_plan.deactivate', 'rate_plan', planId, null, { active: false });
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- iCal sources
  listIcalSources(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select s.*, r.name as room_name, r.ical_export_token from ical_source s join room r on r.id = s.room_id
          where r.property_id = $1 order by r.sort_order, r.name, s.created_at`,
        [propertyId],
        tx,
      );
      return rows.map((s) => ({
        id: s.id,
        roomId: s.room_id,
        roomName: s.room_name,
        url: s.url,
        channel: s.channel,
        lastFetchAt: s.last_fetch_at,
        lastSuccessAt: s.last_success_at,
        lastStatus: s.last_status,
        lastError: s.last_error,
        consecutiveFailures: s.consecutive_failures,
      }));
    });
  }

  addIcalSource(user: SessionUser, roomId: string, input: { url: string; channel: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const room = await this.db.one(`select id from room where id = $1`, [roomId], tx);
      if (!room) throw new NotFoundException('Room not found');
      const count = await this.db.one<{ n: number }>(`select count(*)::int as n from ical_source where room_id = $1`, [roomId], tx);
      if ((count?.n ?? 0) >= MAX_ICAL_SOURCES_PER_ROOM) {
        throw new BadRequestException(`A room can have at most ${MAX_ICAL_SOURCES_PER_ROOM} calendar imports`);
      }
      try {
        const row = await this.db.one(
          `insert into ical_source (tenant_id, room_id, url, channel) values ($1, $2, $3, $4) returning id`,
          [user.tenantId, roomId, input.url, input.channel],
          tx,
        );
        return { id: row!.id };
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException('That calendar URL is already imported for this room');
        throw err;
      }
    });
  }

  removeIcalSource(user: SessionUser, sourceId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      // Release the nights this feed created, then drop the feed.
      await this.db.query(
        `update night_inventory set status = 'released', released_at = now()
          where ical_source_id = $1 and status in ('reserved', 'blocked')`,
        [sourceId],
        tx,
      );
      const row = await this.db.one(`delete from ical_source where id = $1 returning id`, [sourceId], tx);
      if (!row) throw new NotFoundException('Calendar import not found');
      await this.audit(tx, user, 'ical_source.delete', 'ical_source', sourceId, null, null);
      return { ok: true };
    });
  }

  exportUrl(token: string): string {
    return `${this.config.PUBLIC_API_URL.replace(/\/$/, '')}/ical/${token}.ics`;
  }

  // ---------------------------------------------------------------- helpers
  private async requireProperty(tx: Parameters<DbService['query']>[2], propertyId: string) {
    const p = await this.db.one(`select id from property where id = $1`, [propertyId], tx);
    if (!p) throw new NotFoundException('Property not found');
  }

  private async audit(tx: any, user: SessionUser, action: string, entity: string, id: string, before: unknown, after: unknown) {
    await this.db.query(
      `insert into audit_log (tenant_id, actor, action, entity, entity_id, before, after) values ($1, $2, $3, $4, $5, $6, $7)`,
      [user.tenantId, `user:${user.id}`, action, entity, id, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null],
      tx,
    );
  }

  private uniqueError(err: unknown) {
    if (isUniqueViolation(err)) {
      const c = (err as { constraint?: string }).constraint ?? '';
      if (c.includes('slug')) return new ConflictException('That site address is taken');
      if (c.includes('custom_domain')) return new ConflictException('That domain is already connected to another property');
    }
    return err;
  }
}

function strip(row: Record<string, unknown>) {
  const { gateway_config: _secret, ...rest } = row;
  return rest;
}

/** What the owner UI may show about configured gateways: ids yes, secrets never. */
function maskGateways(cfg: GatewayConfig | null) {
  return {
    payhere: cfg?.payhere ? { merchantId: cfg.payhere.merchantId, currency: cfg.payhere.currency } : null,
    paypal: cfg?.paypal ? { clientId: cfg.paypal.clientId, currency: cfg.paypal.currency } : null,
    lankaqr: cfg?.lankaqr ?? null,
    bank: cfg?.bank ?? null,
  };
}
