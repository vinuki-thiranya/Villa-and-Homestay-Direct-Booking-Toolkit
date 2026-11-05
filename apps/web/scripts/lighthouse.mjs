#!/usr/bin/env node
/**
 * Lighthouse (mobile, simulated slow 4G) and the 150 KB image budget for the guest site, per theme:
 * the home page and checkout step 1. Run against a production build started with
 * ALLOW_THEME_PREVIEW=1 so ?previewTheme= works:
 *
 *   npm run build && ALLOW_THEME_PREVIEW=1 npx next start --port 3100
 *   WEB=http://localhost:3100 OUT=../../docs/lighthouse node scripts/lighthouse.mjs
 *
 * Each page runs RUNS times (default 3) and the median-performance run is reported, as Google advises
 * for lab scores. Fails (exit 1) when a score is under its minimum or an image is over budget.
 * MIN_PERF defaults to 95; CI uses 90 because shared runners are noisy.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const WEB = process.env.WEB ?? 'http://localhost:3100';
const API = process.env.API ?? 'http://localhost:4000';
const SITE = process.env.SITE ?? 'villa-lagoon';
const OUT = resolve(process.env.OUT ?? 'lighthouse');
const THEMES = (process.env.THEMES ?? 'lagoon,jungle,surf').split(',');
const MIN = { performance: Number(process.env.MIN_PERF ?? 95), accessibility: 100, 'best-practices': 95 };
const IMAGE_BUDGET = 150 * 1024;
const RUNS = Math.max(1, Number(process.env.RUNS ?? 3));

mkdirSync(OUT, { recursive: true });

const plus = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const stay = `from=${plus(60)}&to=${plus(63)}&guests=2`;
// Warm the API cache so the first run is not penalised for a cold start.
await fetch(`${API}/public/sites/${SITE}`);

const pages = THEMES.flatMap((t) => [
  { theme: t, page: 'home', url: `${WEB}/s/${SITE}?previewTheme=${t}` },
  { theme: t, page: 'checkout', url: `${WEB}/s/${SITE}/book?${stay}&previewTheme=${t}` },
]);

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const rows = [];
let failed = false;
try {
  for (const p of pages) {
    await fetch(p.url); // compile/warm the route
    const runs = [];
    for (let r = 0; r < RUNS; r++) {
      runs.push(
        await lighthouse(p.url, {
          port: chrome.port,
          output: 'html',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        }),
      );
    }
    runs.sort((a, b) => (a.lhr.categories.performance.score ?? 0) - (b.lhr.categories.performance.score ?? 0));
    const result = runs[Math.floor(runs.length / 2)];
    const lhr = result.lhr;
    const name = `${p.theme}-${p.page}`;
    writeFileSync(resolve(OUT, `${name}.html`), result.report);
    if (process.env.KEEP_JSON) writeFileSync(resolve(OUT, `${name}.json`), JSON.stringify(lhr));
    const score = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
    const images = (lhr.audits['network-requests']?.details?.items ?? []).filter((r) => r.resourceType === 'Image');
    const heavy = images.filter((r) => r.transferSize > IMAGE_BUDGET).map((r) => `${r.url} (${Math.round(r.transferSize / 1024)} KB)`);
    const row = {
      page: name,
      runs: runs.map((r) => Math.round((r.lhr.categories.performance.score ?? 0) * 100)),
      performance: score('performance'),
      accessibility: score('accessibility'),
      bestPractices: score('best-practices'),
      seo: score('seo'),
      lcpMs: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
      fcpMs: Math.round(lhr.audits['first-contentful-paint'].numericValue),
      cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
      totalKb: Math.round((lhr.audits['total-byte-weight'].numericValue ?? 0) / 1024),
      largestImageKb: Math.round(Math.max(0, ...images.map((r) => r.transferSize)) / 1024),
      heavyImages: heavy,
    };
    const misses = [
      row.performance < MIN.performance && `performance ${row.performance} < ${MIN.performance}`,
      row.accessibility < MIN.accessibility && `accessibility ${row.accessibility} < ${MIN.accessibility}`,
      row.bestPractices < MIN['best-practices'] && `best practices ${row.bestPractices} < ${MIN['best-practices']}`,
      heavy.length > 0 && `images over 150 KB: ${heavy.join(', ')}`,
    ].filter(Boolean);
    if (misses.length) {
      failed = true;
      row.failures = misses;
      // Name the failing audits so the fix is obvious from the log.
      row.failingAudits = Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
        .map((a) => `${a.id}: ${a.displayValue ?? a.score}`)
        .slice(0, 12);
    }
    rows.push(row);
    console.log(
      `${name.padEnd(16)} perf ${row.performance} (runs ${row.runs.join('/')})  a11y ${row.accessibility}  bp ${row.bestPractices}  seo ${row.seo}  LCP ${row.lcpMs}ms  CLS ${row.cls}  ${row.totalKb} KB  largest image ${row.largestImageKb} KB${misses.length ? `  ✗ ${misses.join('; ')}` : ''}`,
    );
    if (row.failingAudits) console.log(`    ${row.failingAudits.join('\n    ')}`);
  }
} finally {
  await chrome.kill();
}

writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify({ site: SITE, at: new Date().toISOString(), min: MIN, rows }, null, 2));
process.exit(failed ? 1 : 0);
