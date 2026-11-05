import { MeUpdateSchema } from '@staydirect/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { HolidaysService } from '../src/modules/holidays/holidays.service.js';
import { setupApp, type TestCtx } from './helpers.js';

let ctx: TestCtx;

beforeAll(async () => {
  ctx = await setupApp();
});
afterAll(() => ctx.close());

describe('owner UI language', () => {
  it('saves Sinhala for the signed-in user and returns it from /auth/me', async () => {
    const u = (await ctx.db.one(`select * from app_user where phone = '+94770000000'`))!;
    const owner = { id: u.id, tenantId: u.tenant_id, phone: u.phone, name: u.name, role: u.role };
    const me = await ctx.get(AuthService).updateMe(owner, { language: 'si' });
    expect(me.user!.language).toBe('si');
    expect((await ctx.get(AuthService).me(owner)).user!.language).toBe('si');
    await ctx.get(AuthService).updateMe(owner, { language: 'en' });
  });

  it('accepts only en and si, in the API and in the database', async () => {
    expect(MeUpdateSchema.safeParse({ language: 'xx' }).success).toBe(false);
    expect(MeUpdateSchema.safeParse({ language: 'hi' }).success).toBe(false);
    await expect(ctx.db.query(`update app_user set language = 'xx' where phone = '+94770000000'`)).rejects.toThrow(/app_user_language/);
  });
});

describe('public holidays', () => {
  it('lists the gazetted Poya days with Sinhala names', async () => {
    const h = await ctx.get(HolidaysService).list('2026-01-01', '2026-12-31');
    const poya = h.filter((x) => x.isPoya);
    expect(poya).toHaveLength(13); // the usual 12 plus Adhi (extra) Poson in 2026
    expect(poya[0]).toMatchObject({ date: '2026-01-03', nameEn: 'Duruthu Full Moon Poya Day' });
    expect(poya.find((x) => x.date === '2026-05-01')!.nameSi).toContain('වෙසක්');
    // Vesak and May Day fall on the same day in 2026: both are listed, the Poya first.
    expect(h.filter((x) => x.date === '2026-05-01').map((x) => x.isPoya)).toEqual([true, false]);
    expect((await ctx.get(HolidaysService).list('2027-01-01', '2027-12-31')).filter((x) => x.isPoya)).toHaveLength(12);
  });

  it('lets an admin correct the list after a gazette change', async () => {
    const svc = ctx.get(HolidaysService);
    await svc.upsert('Test Admin', { date: '2026-12-26', nameEn: 'Special Bank Holiday', nameSi: 'විශේෂ බැංකු නිවාඩු දිනය', isPoya: false, types: ['bank'] });
    expect((await svc.list('2026-12-26', '2026-12-26'))[0]).toMatchObject({ nameEn: 'Special Bank Holiday', types: ['bank'] });
    await svc.remove('2026-12-26', 'Special Bank Holiday');
    expect(await svc.list('2026-12-26', '2026-12-26')).toEqual([]);
    await expect(svc.list('2026-01-01', '2029-01-01')).rejects.toThrow(/At most/);
  });
});
