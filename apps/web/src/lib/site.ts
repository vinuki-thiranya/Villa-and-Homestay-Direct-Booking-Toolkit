import type { PublicProperty } from '@staydirect/shared';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { FONT_STACK } from '@/themes/fonts';
import { isThemeKey, themeCss, THEMES, type GuestTheme } from '@/themes/registry';
import { getSite } from './api';
import { isCurrency, type Currency } from './format';
import { guessCurrency } from './guest-locale';

export const CURRENCY_COOKIE = 'sd_cur';
/** Set by proxy.ts from ?previewTheme= (dev, or ALLOW_THEME_PREVIEW=1), for screenshots of every theme. */
export const PREVIEW_THEME_HEADER = 'x-sd-preview-theme';

export interface SiteContext {
  property: PublicProperty;
  /** Prefix for internal links: '' on a subdomain/custom domain, '/s/{site}' when path-routed (dev). */
  base: string;
  currency: Currency;
  siteKey: string;
  theme: GuestTheme;
}

/** Per-request site context; memoised so layout and page share one fetch. */
export const siteContext = cache(async (rawSite: string): Promise<SiteContext> => {
  const site = decodeURIComponent(rawSite);
  const property = await getSite(site);
  if (!property) notFound();
  const h = await headers();
  const base = h.get('x-sd-base') === '' ? '' : `/s/${encodeURIComponent(site)}`;
  const c = (await cookies()).get(CURRENCY_COOKIE)?.value;
  const currency: Currency = isCurrency(c) ? c : (guessCurrency(h) ?? (isCurrency(property.baseCurrency) ? property.baseCurrency : 'USD'));
  // proxy.ts only sets the header when previews are allowed and strips any copy sent by the client.
  const preview = h.get(PREVIEW_THEME_HEADER);
  const key = isThemeKey(preview) ? preview : isThemeKey(property.theme) ? property.theme : 'lagoon';
  return { property, base, currency, siteKey: site, theme: THEMES[key] };
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

/**
 * CSS variables for a guest site: the theme's palettes, the admin theme editor's tokens on top (when
 * the site shows its own theme, not a preview), then the white-label brand colours (Manager plan).
 */
export function siteThemeCss(p: PublicProperty, theme: GuestTheme): string {
  const own = theme.key === p.theme;
  return themeCss(
    theme,
    { tokens: own ? p.themeTokens : null, brand: p.whiteLabel ? p.brand : null },
    (f) => FONT_STACK[f],
  );
}

/** "Usually replies within …" from the median first-reply time. */
export function responseTimeText(minutes: number | null): string | null {
  if (minutes == null) return null;
  if (minutes <= 15) return 'Usually replies within 15 minutes';
  if (minutes <= 60) return 'Usually replies within an hour';
  if (minutes <= 180) return 'Usually replies within a few hours';
  if (minutes <= 24 * 60) return 'Usually replies within a day';
  return null;
}
