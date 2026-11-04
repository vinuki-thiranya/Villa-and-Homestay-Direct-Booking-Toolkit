import type { PublicProperty } from '@staydirect/shared';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getSite } from './api';
import { isCurrency, type Currency } from './format';

export const CURRENCY_COOKIE = 'sd_cur';

export interface SiteContext {
  property: PublicProperty;
  /** Prefix for internal links: '' on a subdomain/custom domain, '/s/{site}' when path-routed (dev). */
  base: string;
  currency: Currency;
  siteKey: string;
}

/** Per-request site context; memoised so layout and page share one fetch. */
export const siteContext = cache(async (rawSite: string): Promise<SiteContext> => {
  const site = decodeURIComponent(rawSite);
  const property = await getSite(site);
  if (!property) notFound();
  const h = await headers();
  const base = h.get('x-sd-base') === '' ? '' : `/s/${encodeURIComponent(site)}`;
  const c = (await cookies()).get(CURRENCY_COOKIE)?.value;
  const currency: Currency = isCurrency(c) ? c : isCurrency(property.baseCurrency) ? property.baseCurrency : 'USD';
  return { property, base, currency, siteKey: site };
});

/** Lowest base rate across rooms, for "from" prices. */
export function fromRate(p: PublicProperty): number | null {
  const rates = p.rooms.map((r) => r.baseRate);
  return rates.length ? Math.min(...rates) : null;
}

export function canonicalUrl(p: PublicProperty, path = ''): string {
  const root = process.env.ROOT_DOMAIN ?? 'staydirect.lk';
  const host = p.customDomain ?? `${p.slug}.${root}`;
  return `https://${host}${path}`;
}
