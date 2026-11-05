import { Injectable, NotFoundException } from '@nestjs/common';
import { BrandSchema, LANGUAGES, MESSAGE_KEYS, defaultMessage, fillMessage, type Brand, type Language, type MessageKey, type SessionUser } from '@staydirect/shared';
import { DbService } from '../../common/db.service.js';
import { RevalidateService } from '../../common/revalidate.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { TEMPLATES } from '../notifications/templates.js';

export interface EffectiveBrand extends Brand {
  /** True when the tenant's plan includes white label: no StayDirect branding on sites or documents. */
  whiteLabel: boolean;
}

/** Message keys whose text is an approved WhatsApp template: editing them would break delivery. */
export const LOCKED_MESSAGE_KEYS = new Set<string>(TEMPLATES.filter((d) => d.key).map((d) => d.key!));

/**
 * Tenant branding (white label, spec §8 Manager plan), guest-site themes and message translations
 * managed from the admin console.
 */
@Injectable()
export class BrandingService {
  private translations: { at: number; map: Map<string, string> } | null = null;

  constructor(
    private readonly db: DbService,
    private readonly flags: FlagsService,
    private readonly revalidate: RevalidateService,
  ) {}

  async forTenant(tenantId: string): Promise<EffectiveBrand> {
    const t = await this.db.one<{ brand: unknown }>(`select brand from tenant where id = $1`, [tenantId]);
    const brand = BrandSchema.parse(t?.brand ?? {});
    return { ...brand, whiteLabel: await this.flags.enabled(tenantId, 'white_label') };
  }

  async updateBrand(user: SessionUser, brand: Brand) {
    await this.flags.require(user.tenantId, 'white_label');
    await this.db.withTenant(user.tenantId, (tx) => this.db.query(`update tenant set brand = $2 where id = $1`, [user.tenantId, JSON.stringify(brand)], tx));
    const props = await this.db.query<{ id: string }>(`select id from property where tenant_id = $1`, [user.tenantId]);
    for (const p of props) this.revalidate.property(p.id);
    return this.forTenant(user.tenantId);
  }

  // ---------------------------------------------------------------- themes
  async themeTokens(key: string): Promise<Record<string, string> | null> {
    const th = await this.db.one<{ tokens: Record<string, string> }>(`select tokens from theme where key = $1 and published`, [key]);
    return th?.tokens ?? null;
  }

  listThemes() {
    return this.db
      .query(`select key, name, tokens, published, updated_by, updated_at from theme order by key`)
      .then((rows) => rows.map((t) => ({ key: t.key, name: t.name, tokens: t.tokens, published: t.published, updatedBy: t.updated_by, updatedAt: t.updated_at })));
  }

  async upsertTheme(admin: string, input: { key: string; name: string; tokens: Record<string, unknown>; published: boolean }) {
    await this.db.query(
      `insert into theme (key, name, tokens, published, updated_by) values ($1, $2, $3, $4, $5)
       on conflict (key) do update set name = excluded.name, tokens = excluded.tokens, published = excluded.published,
         updated_by = excluded.updated_by, updated_at = now()`,
      [input.key, input.name, JSON.stringify(input.tokens), input.published, admin],
    );
    const props = await this.db.query<{ id: string }>(`select id from property where theme = $1`, [input.key]);
    for (const p of props) this.revalidate.property(p.id);
    return { ok: true, propertiesUpdated: props.length };
  }

  // ---------------------------------------------------------------- translations
  private async overrides(): Promise<Map<string, string>> {
    if (this.translations && Date.now() - this.translations.at < 60_000) return this.translations.map;
    const rows = await this.db.query<{ lang: string; key: string; value: string }>(`select lang, key, value from translation`);
    const map = new Map(rows.map((r) => [`${r.lang}:${r.key}`, r.value]));
    this.translations = { at: Date.now(), map };
    return map;
  }

  /** Like shared t(), with admin overrides. Template-backed keys always use the approved default text. */
  async t(lang: Language | string, key: MessageKey, vars: Record<string, string | number> = {}): Promise<string> {
    const l = ((LANGUAGES as readonly string[]).includes(lang) ? lang : 'en') as Language;
    const override = LOCKED_MESSAGE_KEYS.has(key) ? undefined : (await this.overrides()).get(`${l}:${key}`);
    return fillMessage(override ?? defaultMessage(l, key), vars);
  }

  /** Synchronous translator for one language with overrides preloaded (for building whole emails). */
  async translator(lang: Language | string): Promise<(key: MessageKey, vars?: Record<string, string | number>) => string> {
    const l = ((LANGUAGES as readonly string[]).includes(lang) ? lang : 'en') as Language;
    const map = await this.overrides();
    return (key, vars = {}) => fillMessage((LOCKED_MESSAGE_KEYS.has(key) ? undefined : map.get(`${l}:${key}`)) ?? defaultMessage(l, key), vars);
  }

  async listTranslations() {
    const map = await this.overrides();
    return MESSAGE_KEYS.map((key) => ({
      key,
      locked: LOCKED_MESSAGE_KEYS.has(key),
      values: Object.fromEntries(
        [...LANGUAGES].map((lang) => [lang, { default: defaultMessage(lang, key), override: map.get(`${lang}:${key}`) ?? null }]),
      ),
    }));
  }

  async setTranslation(admin: string, input: { lang: string; key: string; value: string }) {
    if (!MESSAGE_KEYS.includes(input.key as MessageKey)) throw new NotFoundException('Unknown message key');
    if (LOCKED_MESSAGE_KEYS.has(input.key)) {
      throw new NotFoundException('This message is an approved WhatsApp template. Change it in code and resubmit the templates.');
    }
    await this.db.query(
      `insert into translation (lang, key, value, updated_by) values ($1, $2, $3, $4)
       on conflict (lang, key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [input.lang, input.key, input.value, admin],
    );
    this.translations = null;
    return { ok: true };
  }

  async deleteTranslation(lang: string, key: string) {
    await this.db.query(`delete from translation where lang = $1 and key = $2`, [lang, key]);
    this.translations = null;
    return { ok: true };
  }
}
