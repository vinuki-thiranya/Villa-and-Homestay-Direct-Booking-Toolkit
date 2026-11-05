import type { PublicProperty } from '@staydirect/shared';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from '../proxy';
import { breadcrumbLd, ldJson, lodgingLd, roomLd } from './jsonld';
import { alternatesFor, clip, guestMetadata, localeUrl, siteOrigin } from './seo';
import { parseSiteParam, siteParam, splitLang, switchLangPath } from './site-routing';
import { sitemapXml } from './sitemap';

const room = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ocean Suite',
  description: 'Sea view',
  maxGuests: 3,
  baseGuests: 2,
  beds: '1 king',
  bathroom: 'En-suite',
  amenities: ['AC', 'Wi-Fi'],
  photos: ['https://images.unsplash.com/a.jpg'],
  baseRate: 120,
  minNights: 1,
  bookingMode: 'instant',
};
const p = {
  slug: 'villa-lagoon',
  customDomain: null,
  name: 'Villa Lagoon',
  description: 'A quiet villa </script> by the lagoon',
  address: 'Mirissa',
  area: 'Mirissa',
  lat: 5.9,
  lng: 80.4,
  checkIn: '14:00',
  checkOut: '11:00',
  whatsappNumber: '+94770000000',
  email: null,
  baseCurrency: 'USD',
  photos: ['https://images.unsplash.com/h.jpg'],
  rooms: [room],
  reviewSummary: { average: 4.75, count: 8 },
  googleReviewUrl: null,
  googleSiteVerification: 'abc123XYZ_-token',
  content: {},
} as unknown as PublicProperty;

describe('guest site URLs', () => {
  it('splits and switches the language prefix', () => {
    expect(splitLang('/de/rooms')).toEqual({ lang: 'de', rest: '/rooms', explicitEn: false });
    expect(splitLang('/rooms')).toEqual({ lang: 'en', rest: '/rooms', explicitEn: false });
    expect(splitLang('/')).toEqual({ lang: 'en', rest: '', explicitEn: false });
    expect(splitLang('/en/rooms').explicitEn).toBe(true);
    expect(splitLang('/designs')).toMatchObject({ lang: 'en', rest: '/designs' }); // not a language prefix
    expect(switchLangPath('/de/rooms/x', '', 'fr')).toBe('/fr/rooms/x');
    expect(switchLangPath('/si', '', 'en')).toBe('/');
    expect(switchLangPath('/s/villa-lagoon/hi/location', '/s/villa-lagoon', 'en')).toBe('/s/villa-lagoon/location');
  });

  it('round-trips the site param variants', () => {
    const v = { site: 'villa-lagoon', preview: 'surf', direct: true, currency: 'EUR' };
    expect(parseSiteParam(siteParam(v))).toEqual(v);
    expect(parseSiteParam('villa.com~t-<x>~c-eur')).toEqual({ site: 'villa.com', preview: null, direct: false, currency: null });
  });

  it('builds canonical and hreflang for the subdomain or the custom domain', () => {
    expect(siteOrigin(p)).toBe('https://villa-lagoon.staydirect.lk');
    expect(siteOrigin({ ...p, customDomain: 'villalagoon.lk' })).toBe('https://villalagoon.lk');
    expect(localeUrl(p, 'en')).toBe('https://villa-lagoon.staydirect.lk/');
    expect(localeUrl(p, 'si', '/rooms')).toBe('https://villa-lagoon.staydirect.lk/si/rooms');
    const a = alternatesFor(p, 'de', '/rooms');
    expect(a.canonical).toBe('https://villa-lagoon.staydirect.lk/de/rooms');
    expect(a.languages).toMatchObject({ en: 'https://villa-lagoon.staydirect.lk/rooms', hi: 'https://villa-lagoon.staydirect.lk/hi/rooms', 'x-default': 'https://villa-lagoon.staydirect.lk/rooms' });
  });

  it('keeps titles and descriptions to search-result length', () => {
    expect(clip('a '.repeat(80), 60).length).toBeLessThanOrEqual(60);
    const m = guestMetadata(p, 'fr', { path: '', title: 'x'.repeat(90), description: 'Une villa calme' });
    expect(String(m.title).length).toBeLessThanOrEqual(60);
    expect(m.verification).toEqual({ google: 'abc123XYZ_-token' });
    expect((m.openGraph as { locale: string }).locale).toBe('fr_FR');
  });
});

describe('structured data', () => {
  it('describes the lodging, its rooms and breadcrumbs, with script-safe JSON', () => {
    const ld = lodgingLd(p, 'en', { reviews: [{ rating: 5, body: 'Lovely', guestName: 'Anna', createdAt: '2026-10-01T00:00:00Z' }] });
    expect(ld).toMatchObject({ '@type': 'LodgingBusiness', '@id': 'https://villa-lagoon.staydirect.lk/#lodging', numberOfRooms: 1 });
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.8, reviewCount: 8 });
    expect((ld.review as unknown[]).length).toBe(1);
    expect(roomLd(p, 'si', room as never)).toMatchObject({ '@type': 'HotelRoom', url: 'https://villa-lagoon.staydirect.lk/si/rooms/' + room.id });
    expect(breadcrumbLd(p, 'en', [['Rooms', '/rooms']]).itemListElement).toHaveLength(2);
    expect(ldJson(ld)).not.toContain('</script>');
  });

  it('writes a sitemap with every language alternate', () => {
    const xml = sitemapXml([{ alternates: { en: 'https://x.lk/', de: 'https://x.lk/de' }, xDefault: 'https://x.lk/', lastmod: '2026-11-05T10:00:00Z' }]);
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="de" href="https://x.lk/de"/>');
    expect(xml).toContain('<lastmod>2026-11-05</lastmod>');
  });
});

describe('proxy', () => {
  const run = (url: string, host: string, cookie?: string) =>
    proxy(new NextRequest(url, { headers: { host, ...(cookie ? { cookie } : {}) } }));
  const rewrite = (r: Response) => new URL(r.headers.get('x-middleware-rewrite') ?? 'http://x/').pathname;

  it('routes guest languages, sitemaps and old paths', () => {
    // The display currency is part of the cached page's key: the language's usual one without a hint…
    expect(rewrite(run('https://villa-lagoon.staydirect.lk/de/rooms', 'villa-lagoon.staydirect.lk'))).toBe('/s/villa-lagoon~c-EUR/de/rooms');
    expect(rewrite(run('https://villa-lagoon.staydirect.lk/', 'villa-lagoon.staydirect.lk'))).toBe('/s/villa-lagoon~c-USD/en');
    // …the guest's choice when they made one.
    expect(rewrite(run('https://villa-lagoon.staydirect.lk/hi', 'villa-lagoon.staydirect.lk', 'sd_cur=LKR'))).toBe('/s/villa-lagoon~c-LKR/hi');
    expect(rewrite(run('https://villalagoon.lk/sitemap.xml', 'www.villalagoon.lk'))).toBe('/s/villalagoon.lk/sitemap.xml');
    expect(run('https://villa-lagoon.staydirect.lk/experiences', 'villa-lagoon.staydirect.lk').headers.get('location')).toMatch(/\/things-to-do$/);
    // Another site's path on this domain is just an unknown page here.
    expect(rewrite(run('https://villa-lagoon.staydirect.lk/s/other', 'villa-lagoon.staydirect.lk'))).toBe('/s/villa-lagoon~c-USD/en/s/other');
  });

  it('sends unprefixed links to the guest’s chosen language, never by Accept-Language', () => {
    const r = run('https://villa-lagoon.staydirect.lk/rooms', 'villa-lagoon.staydirect.lk', 'sd_glang=hi');
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toMatch(/\/hi\/rooms$/);
    expect(run('https://villa-lagoon.staydirect.lk/rooms', 'villa-lagoon.staydirect.lk').status).toBe(200);
  });

  it('serves the marketing site in English and Sinhala and keeps app hosts out of search', () => {
    expect(rewrite(run('https://staydirect.lk/si/pricing', 'staydirect.lk'))).toBe('/m/si/pricing');
    expect(rewrite(run('https://staydirect.lk/', 'staydirect.lk'))).toBe('/m/en');
    expect(rewrite(run('https://app.staydirect.lk/robots.txt', 'app.staydirect.lk'))).toBe('/m/robots-private.txt');
    expect(run('https://staydirect.lk/owner/login', 'staydirect.lk').headers.get('location')).toBe('https://app.staydirect.lk/login');
  });
});
