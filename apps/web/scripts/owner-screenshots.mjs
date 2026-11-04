#!/usr/bin/env node
/**
 * Owner web app screenshots at 375 px in Sinhala (and English for comparison): Today, bookings, a
 * booking, calendar, inbox, tasks, setup, channels, More, and the login page. Also fails if a Sinhala
 * page still shows obvious English UI words.
 *
 *   WEB=http://localhost:3000 API=http://localhost:4000 OUT=./owner-shots node scripts/owner-screenshots.mjs
 *
 * Signs in once with the dev OTP (the endpoint is rate-limited, so reuse TOKEN=... when re-running),
 * switches the owner to Sinhala through PATCH /auth/me, and switches back to English at the end.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const WEB = process.env.WEB ?? 'http://localhost:3000';
const API = process.env.API ?? 'http://localhost:4000';
const PHONE = process.env.OWNER_PHONE ?? '0770000000';
const OUT = resolve(process.env.OUT ?? 'owner-shots');
const LANGS = (process.env.LANGS ?? 'si,en').split(',');
mkdirSync(OUT, { recursive: true });

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
    body: init.json ? JSON.stringify(init.json) : undefined,
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

let token = process.env.TOKEN;
if (!token) {
  await api('/auth/otp/request', { method: 'POST', json: { phone: PHONE } });
  token = (await api('/auth/otp/verify', { method: 'POST', json: { phone: PHONE, code: process.env.OTP ?? '123456' } })).token;
  console.log(`token (reuse with TOKEN=…): ${token.slice(0, 12)}…`);
}
const props = await api('/properties', { token });
const bookings = await api(`/properties/${props[0].id}/bookings`, { token });
const firstBooking = (bookings.items ?? bookings)[0];

const pages = [
  ['today', '/owner'],
  ['bookings', '/owner/bookings'],
  ['booking', firstBooking ? `/owner/bookings/${firstBooking.id}` : '/owner/bookings'],
  ['calendar', '/owner/calendar'],
  ['inbox', '/owner/inbox'],
  ['tasks', '/owner/tasks'],
  ['setup', '/owner/setup'],
  ['sync', '/owner/sync'],
  ['more', '/owner/more'],
];
// UI words that must not survive on a Sinhala screen (data such as names and Booking.com may).
const ENGLISH_UI = /\b(Today|Bookings|Arriving|Leaving|Unpaid|Save|Cancel|Log out|Calendar|Tasks|Settings|Setup|More)\b/;

const shots = [];
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? 'chrome', headless: true });
let failed = false;
try {
  for (const lang of LANGS) {
    await api('/auth/me', { method: 'PATCH', token, json: { language: lang } });
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, locale: lang === 'si' ? 'si-LK' : 'en-GB' });
    await ctx.addCookies([
      { name: 'sd_token', value: token, url: WEB },
      { name: 'sd_lang', value: lang, url: WEB },
    ]);
    const page = await ctx.newPage();
    for (const [name, path] of pages) {
      await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle' });
      const file = `owner-${lang}-${name}.jpg`;
      await page.screenshot({ path: resolve(OUT, file), type: 'jpeg', quality: 72, fullPage: true });
      shots.push({ lang, name, file });
      if (lang === 'si') {
        // Text marked lang="en" (OTA menu paths, guest-facing previews) is English on purpose.
        const text = await page.evaluate(() =>
          [...document.querySelectorAll('main, header, nav')]
            .map((el) => {
              const copy = el.cloneNode(true);
              copy.querySelectorAll('[lang="en"]').forEach((n) => n.remove());
              return copy.textContent ?? '';
            })
            .join('\n'),
        );
        const hit = text.match(ENGLISH_UI);
        if (hit) {
          failed = true;
          console.log(`  ${file}  ✗ English left: "${hit[0]}"`);
          continue;
        }
      }
      console.log(`  ${file}`);
    }
    // the login page in the same language (signed out)
    const anon = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
    await anon.addCookies([{ name: 'sd_lang', value: lang, url: WEB }]);
    const lp = await anon.newPage();
    await lp.goto(`${WEB}/owner/login`, { waitUntil: 'networkidle' });
    await lp.screenshot({ path: resolve(OUT, `owner-${lang}-login.jpg`), type: 'jpeg', quality: 72 });
    shots.push({ lang, name: 'login', file: `owner-${lang}-login.jpg` });
    await anon.close();
    await ctx.close();
  }
} finally {
  await api('/auth/me', { method: 'PATCH', token, json: { language: 'en' } }).catch(() => {});
  await browser.close();
}
writeFileSync(resolve(OUT, 'manifest.json'), JSON.stringify({ shots }, null, 2));
console.log(`${shots.length} screenshots in ${OUT}`);
process.exit(failed ? 1 : 0);
