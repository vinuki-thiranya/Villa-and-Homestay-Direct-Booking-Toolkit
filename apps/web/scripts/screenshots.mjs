#!/usr/bin/env node
/**
 * Guest-site screenshots at 375 px for every theme, driving a real booking through the checkout:
 * home (first view, calendar, full page), rooms, a room, checkout steps 1 and 2, the pay step and the
 * confirmation. Doubles as the end-to-end smoke test in CI: any missing step fails the run.
 *
 *   WEB=http://localhost:3000 API=http://localhost:4000 OUT=./screenshots node scripts/screenshots.mjs
 *   GUEST_LANG=si|de|fr|hi … books in that language; files are then named <lang>-<theme>-<step>.jpg
 *   (LANG=si works too)
 *
 * Needs the seeded demo (npm run db:seed), the API with OTP_DEV_CODE, and Chrome installed
 * (playwright-core drives the system Chrome; no browser download). Themes are switched with the
 * dev-only ?previewTheme= query, so run against `next dev` or a non-production build.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const WEB = process.env.WEB ?? 'http://localhost:3000';
const API = process.env.API ?? 'http://localhost:4000';
const SITE = process.env.SITE ?? 'villa-lagoon';
const OWNER_PHONE = process.env.OWNER_PHONE ?? '0770000000';
const OTP = process.env.OTP ?? '123456';
const OUT = resolve(process.env.OUT ?? 'screenshots');
const THEMES = (process.env.THEMES ?? 'lagoon,jungle,surf').split(',');
// Guest site language. LANG is often a system locale (en_US.UTF-8), so only its first two letters count.
const WANTED = (process.env.GUEST_LANG ?? process.env.LANG ?? 'en').slice(0, 2);
const GUEST_LANG = ['si', 'de', 'fr', 'hi'].includes(WANTED) ? WANTED : 'en';
const PREFIX = GUEST_LANG === 'en' ? '' : `${GUEST_LANG}-`;
const LOCALES = { en: 'en-GB', si: 'si-LK', de: 'de-DE', fr: 'fr-FR', hi: 'hi-IN' };
const langCookie = (ctx) => ctx.addCookies([{ name: 'sd_glang', value: GUEST_LANG, url: WEB }]);

mkdirSync(OUT, { recursive: true });

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    body: init.json ? JSON.stringify(init.json) : undefined,
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

const iso = (d) => d.toISOString().slice(0, 10);
const plus = (days) => iso(new Date(Date.now() + days * 86_400_000));

/** A stay window with at least one free room, searching forward so repeated runs do not collide. */
async function freeStay(startOffset) {
  for (let k = 0; k < 60; k++) {
    const from = plus(startOffset + k * 3);
    const to = plus(startOffset + k * 3 + 3);
    const r = await api(`/public/sites/${SITE}/availability?from=${from}&to=${to}&guests=2&currency=USD`);
    if (r.rooms.some((x) => x.available)) return { from, to };
  }
  throw new Error('No free stay found in the next months');
}

async function ownerToken() {
  await api('/auth/otp/request', { method: 'POST', json: { phone: OWNER_PHONE } });
  const { token } = await api('/auth/otp/verify', { method: 'POST', json: { phone: OWNER_PHONE, code: OTP } });
  return token;
}

const site = await api(`/public/sites/${SITE}`);
const roomId = site.rooms[0].id;
const token = await ownerToken();
const shots = [];

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? 'chrome', headless: true });
try {
  for (const [i, theme] of THEMES.entries()) {
    const q = `previewTheme=${theme}`;
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, colorScheme: 'light', locale: LOCALES[GUEST_LANG] });
    await langCookie(ctx);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const shot = async (name, opts = {}) => {
      const file = `${PREFIX}${theme}-${name}.jpg`;
      // Full-page captures from the top, so the sticky header is not stamped mid-page.
      if (opts.fullPage) await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: resolve(OUT, file), type: 'jpeg', quality: 72, ...opts });
      shots.push({ theme, name, file });
      console.log(`  ${file}`);
    };
    console.log(theme);

    // Home: first view, the calendar sheet, then the whole page.
    await page.goto(`${WEB}/s/${SITE}?${q}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#search-card');
    const fold = await page.locator('#search-card button[type=submit]').boundingBox();
    if (!fold || fold.y + fold.height > 667) throw new Error(`${theme}: the date search is not inside a 375×667 first view (button bottom ${fold && fold.y + fold.height}px)`);
    await shot('home');
    await page.click('#search-from');
    await page.waitForSelector('[role=dialog]');
    await page.waitForTimeout(500);
    await shot('calendar');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role=dialog]', { state: 'detached' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('home-full', { fullPage: true });

    await page.goto(`${WEB}/s/${SITE}/rooms?${q}`, { waitUntil: 'networkidle' });
    await shot('rooms', { fullPage: true });
    await page.goto(`${WEB}/s/${SITE}/rooms/${roomId}?${q}`, { waitUntil: 'networkidle' });
    await shot('room');

    // Checkout step 1: rooms and prices for the dates.
    const stay = await freeStay(40 + i * 11);
    await page.goto(`${WEB}/s/${SITE}/book?from=${stay.from}&to=${stay.to}&guests=2&${q}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="choose-room"]');
    await shot('checkout-1', { fullPage: true });

    // Step 2: details, money and policy before payment.
    await page.locator('[data-testid="choose-room"]').first().click();
    await page.waitForSelector('#g-name');
    await page.fill('#g-name', 'Emma Taylor');
    await page.fill('#g-email', `emma+${theme}-${Date.now()}@example.co.uk`);
    await page.fill('#g-phone', '+447700900123');
    await page.selectOption('#g-country', 'GB');
    await page.check('input[name=accept]');
    await page.waitForTimeout(300);
    await shot('checkout-2', { fullPage: true });

    // Step 3: pay.
    await Promise.all([page.waitForURL(/\/booking\//), page.click('[data-testid="continue-to-pay"]')]);
    const url = new URL(page.url());
    const reference = decodeURIComponent(url.pathname.split('/').pop());
    url.searchParams.set('previewTheme', theme);
    await page.goto(url.toString(), { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="pay-heading"]');
    await shot('pay', { fullPage: true });

    // Confirmation: the owner records the deposit (bank transfer), then the guest page reloads.
    const list = await api(`/properties/${site.id}/bookings?search=${encodeURIComponent(reference)}`, { headers: { authorization: `Bearer ${token}` } });
    const booking = (list.items ?? list).find((b) => b.reference === reference);
    if (!booking) throw new Error(`${theme}: booking ${reference} not found for the owner`);
    const pub = await api(`/public/bookings/${encodeURIComponent(reference)}?t=${url.searchParams.get('t')}`);
    await api(`/bookings/${booking.id}/payments`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      json: { method: 'bank', amount: pub.deposit, reference: `screenshot-${reference}` },
    });
    await page.goto(url.toString(), { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="booked-heading"]');
    await shot('confirmed', { fullPage: true });

    // Dark mode first view.
    const dark = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, colorScheme: 'dark' });
    await langCookie(dark);
    const dp = await dark.newPage();
    await dp.goto(`${WEB}/s/${SITE}?${q}`, { waitUntil: 'networkidle' });
    await dp.screenshot({ path: resolve(OUT, `${PREFIX}${theme}-home-dark.jpg`), type: 'jpeg', quality: 72 });
    shots.push({ theme, name: 'home-dark', file: `${PREFIX}${theme}-home-dark.jpg` });
    console.log(`  ${PREFIX}${theme}-home-dark.jpg`);
    await dark.close();

    if (errors.length) throw new Error(`${theme}: page errors\n${errors.join('\n')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

writeFileSync(resolve(OUT, `${PREFIX}manifest.json`), JSON.stringify({ site: SITE, lang: GUEST_LANG, viewport: '375x812@2x', shots }, null, 2));
console.log(`${shots.length} screenshots in ${OUT}`);
