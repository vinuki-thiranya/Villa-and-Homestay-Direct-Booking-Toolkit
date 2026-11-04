import { Injectable, NotFoundException } from '@nestjs/common';
import { GuideSchema, SEQUENCE_TRIGGERS, type Guide, type SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { RevalidateService } from '../../common/revalidate.service.js';
import { CatalogService } from '../properties/catalog.service.js';
import { DEFAULT_QUICK_REPLIES } from './quick-replies.defaults.js';

const LANG_INDEX = { en: 2, de: 3, fr: 4, hi: 5 } as const;

/** Owner setup for Release 2: concierge switch, house guide, quick replies, knowledge base, sequences. */
@Injectable()
export class SetupService {
  constructor(
    private readonly db: DbService,
    private readonly catalog: CatalogService,
    private readonly revalidate: RevalidateService,
  ) {}

  // ---------------------------------------------------------------- concierge settings & guide
  getSettings(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.property(tx, propertyId);
      const month = new Date().toISOString().slice(0, 7);
      const usage = await this.db.one(`select * from ai_usage where property_id = $1 and month = $2`, [propertyId, month], tx);
      return {
        conciergeEnabled: p.concierge_enabled,
        whatsappPhoneNumberId: p.whatsapp_phone_number_id,
        googleReviewUrl: p.google_review_url,
        repeatGuestDiscountPct: p.repeat_guest_discount_pct,
        guide: GuideSchema.parse(p.guide ?? {}),
        guideUrl: `${this.catalog.siteUrl(p)}/guide/${p.guide_token}`,
        aiUsage: {
          month,
          requests: usage?.requests ?? 0,
          costUsd: usage?.cost_usd ?? 0,
        },
      };
    });
  }

  async updateSettings(
    user: SessionUser,
    propertyId: string,
    input: { conciergeEnabled?: boolean; whatsappPhoneNumberId?: string | null; googleReviewUrl?: string | null; repeatGuestDiscountPct?: number; guide?: Guide },
  ) {
    await this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      await this.db.query(
        `update property set
           concierge_enabled = coalesce($2, concierge_enabled),
           whatsapp_phone_number_id = case when $3::boolean then $4 else whatsapp_phone_number_id end,
           google_review_url = case when $5::boolean then $6 else google_review_url end,
           repeat_guest_discount_pct = coalesce($7, repeat_guest_discount_pct),
           guide = coalesce($8::jsonb, guide),
           updated_at = now()
         where id = $1`,
        [
          propertyId,
          input.conciergeEnabled ?? null,
          input.whatsappPhoneNumberId !== undefined,
          input.whatsappPhoneNumberId ?? null,
          input.googleReviewUrl !== undefined,
          input.googleReviewUrl ?? null,
          input.repeatGuestDiscountPct ?? null,
          input.guide ? JSON.stringify(input.guide) : null,
        ],
        tx,
      );
    });
    this.revalidate.property(propertyId);
    return this.getSettings(user, propertyId);
  }

  /** House guide page for guests (link sent on arrival day; contains the Wi-Fi password, so it is token-gated). */
  async publicGuide(token: string) {
    const p = /^[a-f0-9]{16,64}$/.test(token) ? await this.db.one(`select * from property where guide_token = $1 and published`, [token]) : null;
    if (!p) throw new NotFoundException('Guide not found');
    return {
      propertyName: p.name,
      propertySlug: p.slug,
      address: p.address,
      mapsUrl: this.catalog.mapsUrl(p),
      checkIn: p.check_in,
      checkOut: p.check_out,
      houseRules: p.house_rules,
      whatsappNumber: p.whatsapp_number,
      hostName: p.host_name,
      guide: GuideSchema.parse(p.guide ?? {}),
    };
  }

  // ---------------------------------------------------------------- quick replies
  listQuickReplies(user: SessionUser, propertyId: string, language?: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select * from quick_reply where property_id = $1 ${language ? 'and language = $2' : ''} order by sort_order, topic, language`,
        language ? [propertyId, language] : [propertyId],
        tx,
      );
      return rows.map(toQuickReply);
    });
  }

  /** Load the 30 default replies in 4 languages, filled from the profile. Existing topics are kept. */
  loadDefaultQuickReplies(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const p = await this.property(tx, propertyId);
      const guide = GuideSchema.parse(p.guide ?? {});
      const vars: Record<string, string> = {
        property: p.name,
        address: p.address || p.name,
        maps: this.catalog.mapsUrl(p) ?? '',
        checkIn: p.check_in,
        checkOut: p.check_out,
        wifiName: guide.wifiName || '(ask reception)',
        wifiPassword: guide.wifiPassword || '(ask reception)',
        whatsapp: p.whatsapp_number ?? '',
        site: `${this.catalog.siteUrl(p)}/guide/${p.guide_token}`,
      };
      const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
      let added = 0;
      for (const [i, row] of DEFAULT_QUICK_REPLIES.entries()) {
        for (const [lang, idx] of Object.entries(LANG_INDEX)) {
          const r = await this.db.one(
            `insert into quick_reply (tenant_id, property_id, topic, language, title, body, sort_order)
             values ($1, $2, $3, $4, $5, $6, $7) on conflict (property_id, topic, language) do nothing returning id`,
            [user.tenantId, propertyId, row[0], lang, row[1], fill(row[idx]!), i],
            tx,
          );
          if (r) added++;
        }
      }
      return { added };
    });
  }

  upsertQuickReply(user: SessionUser, propertyId: string, input: { topic: string; language: string; title: string; body: string; sortOrder: number }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      const row = await this.db.one(
        `insert into quick_reply (tenant_id, property_id, topic, language, title, body, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (property_id, topic, language) do update set title = excluded.title, body = excluded.body, sort_order = excluded.sort_order
         returning *`,
        [user.tenantId, propertyId, input.topic, input.language, input.title, input.body, input.sortOrder],
        tx,
      );
      return toQuickReply(row!);
    });
  }

  deleteQuickReply(user: SessionUser, id: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`delete from quick_reply where id = $1 returning id`, [id], tx);
      if (!r) throw new NotFoundException('Quick reply not found');
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- knowledge base
  listKnowledge(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from knowledge_entry where property_id = $1 order by title`, [propertyId], tx);
      return rows.map(toKnowledge);
    });
  }

  createKnowledge(user: SessionUser, propertyId: string, input: { title: string; body: string; language: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      const row = await this.db.one(
        `insert into knowledge_entry (tenant_id, property_id, title, body, language) values ($1, $2, $3, $4, $5) returning *`,
        [user.tenantId, propertyId, input.title, input.body, input.language],
        tx,
      );
      return toKnowledge(row!);
    });
  }

  updateKnowledge(user: SessionUser, id: string, input: { title: string; body: string; language: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `update knowledge_entry set title = $2, body = $3, language = $4, updated_at = now() where id = $1 returning *`,
        [id, input.title, input.body, input.language],
        tx,
      );
      if (!row) throw new NotFoundException('Entry not found');
      return toKnowledge(row);
    });
  }

  deleteKnowledge(user: SessionUser, id: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`delete from knowledge_entry where id = $1 returning id`, [id], tx);
      if (!r) throw new NotFoundException('Entry not found');
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- sequences
  /** Every trigger with its effective setting (missing rows = enabled, channel auto). */
  listSequences(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      const rows = await this.db.query(`select trigger, enabled, channel from sequence where property_id = $1`, [propertyId], tx);
      const byTrigger = new Map(rows.map((r) => [r.trigger, r]));
      return SEQUENCE_TRIGGERS.map((trigger) => ({
        trigger,
        enabled: byTrigger.get(trigger)?.enabled ?? true,
        channel: byTrigger.get(trigger)?.channel ?? 'auto',
      }));
    });
  }

  updateSequence(user: SessionUser, propertyId: string, input: { trigger: string; enabled: boolean; channel: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.property(tx, propertyId);
      await this.db.query(
        `insert into sequence (tenant_id, property_id, trigger, enabled, channel) values ($1, $2, $3, $4, $5)
         on conflict (property_id, trigger) do update set enabled = excluded.enabled, channel = excluded.channel`,
        [user.tenantId, propertyId, input.trigger, input.enabled, input.channel],
        tx,
      );
      return { ok: true };
    });
  }

  private async property(tx: pg.PoolClient, propertyId: string): Promise<Row> {
    const p = await this.db.one(`select * from property where id = $1`, [propertyId], tx);
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }
}

function toQuickReply(r: Row) {
  return { id: r.id, topic: r.topic, language: r.language, title: r.title, body: r.body, sortOrder: r.sort_order };
}

function toKnowledge(r: Row) {
  return { id: r.id, title: r.title, body: r.body, language: r.language, updatedAt: r.updated_at };
}
