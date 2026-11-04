import type { PublicProperty } from '@staydirect/shared';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache, type CSSProperties } from 'react';
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

const HEX = /^#[0-9a-fA-F]{6}$/;
const TOKEN_VARS: Record<string, string> = {
  brand: '--brand',
  brandStrong: '--brand-strong',
  accent: '--accent',
  bg: '--bg',
  surface2: '--surface-2',
  radius: '--radius',
};

/**
 * CSS variables for a guest site: the admin theme editor's tokens on top of the data-theme defaults,
 * then the white-label brand colours (Manager plan). Only well-formed values are applied.
 */
export function themeStyle(p: PublicProperty): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(TOKEN_VARS)) {
    const v = p.themeTokens?.[key];
    if (v && (HEX.test(v) || (key === 'radius' && /^\d{1,2}px$/.test(v)))) style[cssVar] = v;
  }
  const font = p.themeTokens?.fontSans;
  if (font && /^[\w\s,'"-]{2,120}$/.test(font)) style.fontFamily = font;
  if (p.whiteLabel && p.brand) {
    if (p.brand.primaryColor && HEX.test(p.brand.primaryColor)) {
      style['--brand'] = p.brand.primaryColor;
      style['--brand-strong'] = p.brand.primaryColor;
    }
    if (p.brand.accentColor && HEX.test(p.brand.accentColor)) style['--accent'] = p.brand.accentColor;
  }
  return style as CSSProperties;
}
