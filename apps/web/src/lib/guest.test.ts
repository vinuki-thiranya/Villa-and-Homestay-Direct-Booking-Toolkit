import { describe, expect, it } from 'vitest';
import { contrastChecks, resolvePalette, themeCss, THEME_KEYS, THEMES, type ThemeFont } from '@/themes/registry';
import { approxIn } from './format';
import { canCheckIn, canCheckOut, monthGrid, monthsFrom, pick, selectable } from './calendar';
import { currencyForCountry, guessCurrency, regionForCurrency, regionFromAcceptLanguage } from './guest-locale';
import { makeGuestT } from '@/i18n/guest/t';
import { countryOptions, policyText, violationText } from './guest-copy';
import { paymentGroups } from './payment-groups';

const headers = (h: Record<string, string>) => ({ get: (k: string) => h[k.toLowerCase()] ?? null });

describe('themes', () => {
  it.each(THEME_KEYS.flatMap((k) => (['light', 'dark'] as const).map((mode) => [k, mode] as const)))(
    '%s (%s) meets WCAG AA for every text and focus pair',
    (key, mode) => {
      const failing = contrastChecks(THEMES[key][mode]).filter((c) => c.ratio < c.min);
      expect(failing).toEqual([]);
    },
  );

  it('re-derives button text when an owner brand colour is too light for white text', () => {
    const p = resolvePalette(THEMES.lagoon, { brand: { primaryColor: '#f5d76e', accentColor: null } });
    expect(p.brand).toBe('#f5d76e');
    expect(p.brandFg).toBe(THEMES.lagoon.light.fg);
    expect(contrastChecks(p).find((c) => c.pair === 'brandFg on brand')!.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('only lets validated values into the inlined CSS', () => {
    const css = themeCss(
      THEMES.surf,
      { tokens: { brand: 'red;}body{display:none', radius: '9999px', fontDisplay: 'Comic Sans', bg: '#ffffff' } },
      (f: ThemeFont) => `stack-${f}`,
    );
    expect(css).not.toContain('display:none');
    expect(css).toContain(`--brand:${THEMES.surf.light.brand}`);
    expect(css).toContain('--bg:#ffffff');
    expect(css).toContain(`--radius:${THEMES.surf.radius}`);
    expect(css).toContain('--g-display:stack-barlow-condensed');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });
});

describe('guest currency', () => {
  it('maps countries to display currencies', () => {
    expect(currencyForCountry('IN')).toBe('INR');
    expect(currencyForCountry('de')).toBe('EUR');
    expect(currencyForCountry('GB')).toBe('GBP');
    expect(currencyForCountry('LK')).toBe('LKR');
    expect(currencyForCountry('AU')).toBe('USD');
    expect(currencyForCountry('XX')).toBeNull();
    expect(currencyForCountry('')).toBeNull();
  });

  it('prefers the CDN country, then the browser language region', () => {
    expect(guessCurrency(headers({ 'cf-ipcountry': 'IN', 'accept-language': 'en-GB' }))).toBe('INR');
    expect(guessCurrency(headers({ 'accept-language': 'fr,de-DE;q=0.8' }))).toBe('EUR');
    expect(guessCurrency(headers({ 'accept-language': 'en' }))).toBeNull();
    expect(regionFromAcceptLanguage('zh-Hant-TW')).toBeNull();
  });
});

describe('payment groups', () => {
  const all = ['payhere', 'paypal', 'lankaqr', 'bank'];

  it("puts the guest's own group first and keeps only connected methods", () => {
    expect(paymentGroups(all, regionForCurrency('INR')).map((g) => g.region)).toEqual(['india', 'abroad', 'sri_lanka']);
    expect(paymentGroups(all, regionForCurrency('EUR'))[0]!.methods).toEqual(['payhere', 'paypal', 'bank']);
    expect(paymentGroups(['paypal'], 'sri_lanka').map((g) => g.region)).toEqual(['abroad']);
    expect(paymentGroups([], 'abroad')).toEqual([]);
  });

  it('names UPI for Indian guests and wallets for Sri Lankan guests, in English and Sinhala', () => {
    const groups = paymentGroups(all, 'india');
    expect(groups.find((g) => g.region === 'india')!.methods[0]).toBe('lankaqr');
    const en = makeGuestT('en');
    const si = makeGuestT('si');
    expect(en('pay.options.india.lankaqr.title')).toBe('UPI');
    expect(en('pay.options.sri_lanka.payhere.title')).toContain('Genie');
    expect(si('pay.options.sri_lanka.payhere.title')).toContain('Genie');
    expect(si('pay.groups.sri_lanka')).toBe('ශ්‍රී ලංකාවේ සිට ගෙවීම');
  });
});

describe('date range picker', () => {
  const today = '2026-12-01';
  const closed = new Set(['2026-12-10', '2026-12-11']);

  it('lays months out Monday first', () => {
    const dec = monthGrid(2026, 11); // 1 Dec 2026 is a Tuesday
    expect(dec[0]).toEqual([null, '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
    expect(dec.flat().filter(Boolean)).toHaveLength(31);
    expect(monthsFrom('2026-11-15', 3)).toEqual([[2026, 10], [2026, 11], [2027, 0]]);
  });

  it('never starts a stay on a past or booked night', () => {
    expect(canCheckIn('2026-11-30', today, closed)).toBe(false);
    expect(canCheckIn('2026-12-10', today, closed)).toBe(false);
    expect(canCheckIn('2026-12-12', today, closed)).toBe(true);
  });

  it('allows checking out on the first booked night but not past it', () => {
    expect(canCheckOut('2026-12-10', '2026-12-05', closed)).toBe(true);
    expect(canCheckOut('2026-12-11', '2026-12-05', closed)).toBe(false);
    expect(canCheckOut('2026-12-05', '2026-12-05', closed)).toBe(false);
  });

  it('a second tap ends the stay; an impossible check-out starts a new one', () => {
    let r = pick({ from: null, to: null }, '2026-12-05', today, closed);
    expect(r).toEqual({ from: '2026-12-05', to: null });
    expect(selectable(r, '2026-12-10', today, closed)).toBe(true);
    expect(pick(r, '2026-12-14', today, closed)).toEqual({ from: '2026-12-14', to: null });
    r = pick(r, '2026-12-08', today, closed);
    expect(r).toEqual({ from: '2026-12-05', to: '2026-12-08' });
    expect(pick(r, '2026-12-03', today, closed)).toEqual({ from: '2026-12-03', to: null });
    expect(pick(r, '2026-12-10', today, closed)).toEqual(r);
  });
});

describe('approximate amounts on the pay step', () => {
  const fx = { USD: 1, GBP: 0.8, LKR: 300 };
  it('shows the guest currency beside a charge in another currency, nothing when they match', () => {
    expect(approxIn(100, 'USD', { currency: 'GBP', fx })).toBe('≈ £81.20'); // includes the 1.5% FX buffer
    expect(approxIn(100, 'USD', { currency: 'USD', fx })).toBeNull();
    expect(approxIn(100, 'USD', null)).toBeNull();
    expect(approxIn(100, 'USD', { currency: 'EUR', fx })).toBeNull(); // no rate: no guess
  });
});

describe('guest copy in Sinhala', () => {
  it('translates policies, violations and country names', () => {
    const si = makeGuestT('si');
    expect(policyText(si, 'moderate')).toContain('50%');
    expect(policyText(si, 'nonsense')).toBe('');
    expect(violationText(si, 'min_nights', 3)).toContain('රාත්‍රී 3');
    expect(violationText(makeGuestT('en'), 'whatever')).toBe('Not available');
    expect(countryOptions('si').find(([c]) => c === 'LK')![1]).toBe('ශ්‍රී ලංකාව');
    expect(countryOptions('en').find(([c]) => c === 'GB')![1]).toBe('United Kingdom');
  });
});
