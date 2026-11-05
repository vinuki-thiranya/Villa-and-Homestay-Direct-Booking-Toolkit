import type { Currency } from './format';

/** Euro-area countries (ISO 3166-1 alpha-2). */
const EURO = new Set(['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES']);

/** Country to display currency; anything else shows USD. */
export function currencyForCountry(country: string | null | undefined): Currency | null {
  const c = (country ?? '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c) || c === 'XX') return null;
  if (c === 'IN') return 'INR';
  if (c === 'LK') return 'LKR';
  if (c === 'GB') return 'GBP';
  if (EURO.has(c)) return 'EUR';
  return 'USD';
}

/** Region from the first Accept-Language tag that names one, e.g. "de-DE,de;q=0.9" → "DE". */
export function regionFromAcceptLanguage(header: string | null | undefined): string | null {
  for (const part of (header ?? '').split(',')) {
    const m = part.trim().match(/^[a-z]{2,3}-([A-Za-z]{2})\b/i);
    if (m) return m[1]!.toUpperCase();
  }
  return null;
}

/**
 * The guest's likely currency when they have not picked one: the CDN's country header first
 * (Cloudflare, Vercel), then the browser's language region.
 */
export function guessCurrency(h: { get(name: string): string | null }): Currency | null {
  return currencyForCountry(h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country')) ?? currencyForCountry(regionFromAcceptLanguage(h.get('accept-language')));
}

/**
 * The currency a page shows before the guest's own choice is known: what most readers of that
 * language pay in. proxy.ts sets the guest's real guess (country, browser region) as a cookie on
 * their first visit, so this is mainly what crawlers see.
 */
export function defaultCurrency(lang: string): Currency {
  if (lang === 'si') return 'LKR';
  if (lang === 'hi') return 'INR';
  if (lang === 'de' || lang === 'fr') return 'EUR';
  return 'USD';
}

export type GuestRegion = 'abroad' | 'india' | 'sri_lanka';

/** Which payment group to show first. */
export function regionForCurrency(currency: string): GuestRegion {
  return currency === 'INR' ? 'india' : currency === 'LKR' ? 'sri_lanka' : 'abroad';
}
