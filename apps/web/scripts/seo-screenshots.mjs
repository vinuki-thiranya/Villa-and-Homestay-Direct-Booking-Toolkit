#!/usr/bin/env node
/**
 * Screenshots at 375 px for the SEO release: the marketing site in English and Sinhala, and one guest
 * site in every language (home first view, location with "how to get here", things to do).
 *
 *   WEB=http://localhost:3100 OUT=./screenshots node scripts/seo-screenshots.mjs
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:3000';
const SITE = process.env.SITE ?? 'villa-lagoon';
const OUT = resolve(process.env.OUT ?? 'screenshots');
mkdirSync(OUT, { recursive: true });

const marketing = ['en', 'si'].flatMap((l) => {
  const p = l === 'en' ? '' : '/si';
  return [
    [`m-${l}-home`, `${p}/`],
    [`m-${l}-pricing`, `${p}/pricing`],
    [`m-${l}-area`, `${p}/direct-booking/mirissa`],
    [`m-${l}-blog`, `${p}/blog`],
    [`m-${l}-post`, `${p}/blog/ical-sync-double-bookings`],
    [`m-${l}-faq`, `${p}/faq`],
  ];
});
const guest = ['en', 'si', 'de', 'fr', 'hi'].flatMap((l) => {
  const p = `/s/${SITE}${l === 'en' ? '' : `/${l}`}`;
  return [
    [`g-${l}-home`, p, false],
    [`g-${l}-location`, `${p}/location`, true],
    [`g-${l}-things`, `${p}/things-to-do`, true],
  ];
});

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? 'chrome', headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, colorScheme: 'light' });
  // Pretend this browser chose English before, so the "view in …" chip stays away.
  await ctx.addCookies([{ name: 'sd_glang', value: 'en', url: WEB }, { name: 'sd_cur', value: 'USD', url: WEB }]);
  const page = await ctx.newPage();
  for (const [name, path, full = true] of [...marketing, ...guest]) {
    await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({
      path: resolve(OUT, `${name}.jpg`),
      type: 'jpeg',
      quality: 70,
      ...(full ? { fullPage: true, clip: { x: 0, y: 0, width: 375, height: Math.min(height, 2600) } } : {}),
    });
    console.log(`  ${name}.jpg`);
  }
} finally {
  await browser.close();
}
