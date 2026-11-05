import { randomUUID } from 'node:crypto';
import { SiteContentUpsertSchema, SiteVerificationSchema, SITE_LANGUAGES, type SessionUser } from '@staydirect/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RevalidateService } from '../src/common/revalidate.service.js';
import { CONFIG, type AppConfig } from '../src/config.js';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import type { LlmClient } from '../src/modules/concierge/concierge.service.js';
import { FlagsService } from '../src/modules/flags/flags.service.js';
import { SeoContentService } from '../src/modules/seo/seo-content.service.js';
import { bookingInput, futureStay, setupApp, type TestCtx } from './helpers.js';

let ctx: TestCtx;
let owner: SessionUser;
let propertyId: string;
let roomIds: string[];

beforeAll(async () => {
  ctx = await setupApp();
  const u = (await ctx.db.one(`select * from app_user where phone = '+94770000000'`))!;
  owner = { id: u.id, tenantId: u.tenant_id, phone: u.phone, name: u.name, role: u.role };
  propertyId = (await ctx.db.one(`select id from property where slug = 'villa-lagoon'`))!.id;
  roomIds = (await ctx.db.query(`select id from room where property_id = $1 and active order by sort_order`, [propertyId])).map((r) => r.id);
});
afterAll(() => ctx.close());

/** A model stub that answers with the structured draft, the way output_config.format makes Claude answer. */
function stubLlm(calls: unknown[]): LlmClient {
  const per = (s: string, langs: readonly string[]) => Object.fromEntries(langs.map((l) => [l, `${s} (${l})`]));
  const out = {
    blocks: {
      getting_here: per('Take the coast road to Mirissa', SITE_LANGUAGES),
      things_to_do: per('Whale watching from the harbour', SITE_LANGUAGES),
      best_time: per('December to April is calm and dry', SITE_LANGUAGES),
    },
    description: per('A quiet villa by the lagoon', ['si', 'de', 'fr', 'hi']),
    rooms: [
      { id: roomIds[0], description: per('Sea-view room', ['si', 'de', 'fr', 'hi']) },
      { id: randomUUID(), description: per('Not a room of this property', ['si', 'de', 'fr', 'hi']) },
    ],
  };
  return {
    create: async (params) => {
      calls.push(params);
      return {
        id: 'msg_seo',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(out) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 3000, output_tokens: 6000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      } as any;
    },
  };
}

function service(llm: LlmClient | null) {
  return new SeoContentService(ctx.db, ctx.get(FlagsService), ctx.get(RevalidateService), ctx.app.get<AppConfig>(CONFIG), llm);
}

describe('site content (local guide blocks and translations)', () => {
  it('shows only published text on the public site', async () => {
    const svc = service(null);
    await svc.upsert(owner, propertyId, { key: 'getting_here', lang: 'de', body: 'Mit dem Tuk-Tuk vom Bahnhof Weligama.' });
    expect((await svc.published(propertyId)).content.de?.getting_here).toBeUndefined();

    const r = await svc.setStatus(owner, propertyId, { keys: ['getting_here'], langs: ['de'], status: 'published' });
    expect(r.updated).toBe(1);
    const pub = await svc.published(propertyId);
    expect(pub.content.de?.getting_here).toBe('Mit dem Tuk-Tuk vom Bahnhof Weligama.');
    expect(pub.updatedAt).toBeTruthy();

    // Editing a published block keeps it live; `publish: false` takes it off.
    await svc.upsert(owner, propertyId, { key: 'getting_here', lang: 'de', body: 'Neu.' });
    expect((await svc.published(propertyId)).content.de?.getting_here).toBe('Neu.');
    await svc.upsert(owner, propertyId, { key: 'getting_here', lang: 'de', body: 'Neu.', publish: false });
    expect((await svc.published(propertyId)).content.de?.getting_here).toBeUndefined();
  });

  it('drafts every block in five languages with one model call, never replacing the owner’s text', async () => {
    const calls: any[] = [];
    const svc = service(stubLlm(calls));
    await svc.upsert(owner, propertyId, { key: 'best_time', lang: 'en', body: 'Owner wrote this.', publish: true });

    const res = await svc.generate(owner, propertyId, { overwrite: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].output_config.format.type).toBe('json_schema');
    expect(calls[0].system[0].cache_control).toEqual({ type: 'ephemeral' });

    const rows = res.rows;
    const ai = rows.filter((r) => r.source === 'ai');
    expect(ai.every((r) => r.status === 'draft')).toBe(true);
    expect(rows.find((r) => r.key === 'best_time' && r.lang === 'en')).toMatchObject({ body: 'Owner wrote this.', source: 'owner', status: 'published' });
    expect(rows.find((r) => r.key === 'things_to_do' && r.lang === 'hi')?.body).toBe('Whale watching from the harbour (hi)');
    expect(rows.find((r) => r.key === `room:${roomIds[0]}` && r.lang === 'fr')?.body).toBe('Sea-view room (fr)');
    // A room id the model invented is dropped.
    expect(rows.filter((r) => r.key.startsWith('room:')).every((r) => r.key === `room:${roomIds[0]}`)).toBe(true);
    // Drafts are not public.
    expect((await svc.published(propertyId)).content.hi).toBeUndefined();
    expect(res.ai.used).toBe(1);
    const usage = (await ctx.db.one(`select content_generations, cost_usd from ai_usage where property_id = $1`, [propertyId]))!;
    expect(usage.content_generations).toBe(1);
    expect(Number(usage.cost_usd)).toBeGreaterThan(0);
  });

  it('keeps to the monthly limit and needs the AI set up', async () => {
    await ctx.db.query(`update ai_usage set content_generations = 3 where property_id = $1`, [propertyId]);
    await expect(service(stubLlm([])).generate(owner, propertyId, { overwrite: true })).rejects.toThrow(/3 times a month/);
    await expect(service(null).generate(owner, propertyId, { overwrite: false })).rejects.toThrow(/not set up/);
  });

  it('is invisible to other tenants', async () => {
    const stranger: SessionUser = { ...owner, id: randomUUID(), tenantId: randomUUID() };
    await expect(service(null).list(stranger, propertyId)).rejects.toThrow(/Property not found/);
    const rows = await ctx.db.withTenant(stranger.tenantId, (tx) => ctx.db.query(`select * from site_content`, [], tx));
    expect(rows).toEqual([]);
  });

  it('validates keys, languages and the Search Console code', async () => {
    expect(SiteContentUpsertSchema.safeParse({ key: 'menu', lang: 'en', body: 'x' }).success).toBe(false);
    expect(SiteContentUpsertSchema.safeParse({ key: 'best_time', lang: 'ja', body: 'x' }).success).toBe(false);
    const tag = SiteVerificationSchema.parse({ code: '<meta name="google-site-verification" content="AbC_123-xyzXYZ987" />' });
    expect(tag.code).toBe('AbC_123-xyzXYZ987');
    expect(SiteVerificationSchema.safeParse({ code: 'javascript:alert(1)' }).success).toBe(false);
    const saved = await service(null).setVerification(owner, propertyId, tag.code);
    expect(saved.googleSiteVerification).toBe('AbC_123-xyzXYZ987');
    await service(null).setVerification(owner, propertyId, null);
  });
});

describe('availability cache', () => {
  it('asks the guest site to refresh its calendar when nights change', async () => {
    const spy = vi.spyOn(ctx.get(RevalidateService), 'availability');
    const { from, to } = futureStay(140);
    await ctx.get(BookingsService).create(bookingInput(roomIds[1]!, from, to));
    expect(spy).toHaveBeenCalledWith(roomIds[1]);
    spy.mockRestore();
  });
});
