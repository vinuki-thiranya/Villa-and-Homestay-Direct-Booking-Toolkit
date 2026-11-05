import type { PublicProperty } from '@staydirect/shared';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { lang as rootLang, site as rootSite } from 'next/root-params';
import { cache } from 'react';
import { isGuestLang, makeGuestT, type GuestLang, type GuestTranslator } from '@/i18n/guest/t';
import { FONT_STACK } from '@/themes/fonts';
import { isThemeKey, themeCss, THEMES, type GuestTheme } from '@/themes/registry';
import { getSite } from './api';
import { isCurrency, type Currency } from './format';
import { defaultCurrency, guessCurrency } from './guest-locale';
import { langPrefix, parseSiteParam, previewAllowed } from './site-routing';

export const CURRENCY_COOKIE = 'sd_cur';
/** The guest's chosen site language; proxy.ts sends an unprefixed URL to it. */
export const GUEST_LANG_COOKIE = 'sd_glang';

export interface SiteContext {
  property: PublicProperty;
  /**
   * Prefix for internal links in this language: '' or '/de' on a subdomain/custom domain,
   * '/s/{site}' or '/s/{site}/de' when path-routed (dev, preview deployments).
   */
  base: string;
  /** `base` without the language: the site root, for links to the same page in another language. */
  root: string;
  /** The guest's display currency, from the URL variant proxy.ts adds (cookie or country), else the language's usual one. */
  defaultCurrency: Currency;
  siteKey: string;
  theme: GuestTheme;
  lang: GuestLang;
  /** Guest-site translator for server components. */
  t: GuestTranslator;
}

/**
 * The page's language, from the URL (`/s/[site]/[lang]`, filled in by proxy.ts). Pages read no
 * cookies or headers, so every indexable guest page can be rendered once and cached (ISR).
 */
export const guestLang = cache(async (): Promise<GuestLang> => {
  const l = await rootLang();
  if (!isGuestLang(l)) notFound();
  return l;
});

/** Guest translator for server components below the guest root layout (Hero, RoomCard, not-found). */
export async function guestT(): Promise<GuestTranslator> {
  return makeGuestT(await guestLang());
}

/** The site and its context for this page; memoised so layout, metadata and page share one fetch. */
export const siteContext = cache(async (): Promise<SiteContext> => {
  const raw = await rootSite();
  if (!raw) notFound();
  const { site, preview, direct, currency } = parseSiteParam(raw);
  const [property, lang] = await Promise.all([getSite(site), guestLang()]);
  if (!property) notFound();
  const root = direct ? `/s/${encodeURIComponent(site)}` : '';
  const key = preview && previewAllowed() && isThemeKey(preview) ? preview : isThemeKey(property.theme) ? property.theme : 'lagoon';
  return {
    property,
    base: root + langPrefix(lang),
    root,
    defaultCurrency: isCurrency(currency) ? currency : defaultCurrency(lang),
    siteKey: site,
    theme: THEMES[key],
    lang,
    t: makeGuestT(lang),
  };
});

/**
 * The guest's currency on the dynamic pages (book, booking): their choice, else a guess from the
 * country or browser region, else the language's default. Indexable pages use <Price> instead.
 */
export async function guestCurrency(): Promise<Currency> {
  const c = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (isCurrency(c)) return c;
  return guessCurrency(await headers()) ?? defaultCurrency(await guestLang());
}

/**
 * Owner content in the page's language: the published translation, else the English block, else the
 * owner's original text (`fallback`). Drafts never reach the site (the API sends published rows only).
 */
export function siteText(p: PublicProperty, lang: GuestLang, key: string, fallback = ''): string {
  return p.content[lang]?.[key] ?? p.content.en?.[key] ?? fallback;
}

/** Lowest base rate across rooms, for "from" prices. */
export function fromRate(p: PublicProperty): number | null {
  const rates = p.rooms.map((r) => r.baseRate);
  return rates.length ? Math.min(...rates) : null;
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

/** "Usually replies within …" from the median first-reply time, in the guest's language. */
export function responseTimeText(minutes: number | null, t: GuestTranslator): string | null {
  if (minutes == null) return null;
  if (minutes <= 15) return t('home.reply15');
  if (minutes <= 60) return t('home.replyHour');
  if (minutes <= 180) return t('home.replyFew');
  if (minutes <= 24 * 60) return t('home.replyDay');
  return null;
}

/** Property type in the guest's language ("Villa", "විලා"). */
export function propertyTypeLabel(type: string, t: GuestTranslator): string {
  const key = ['villa', 'guesthouse', 'homestay', 'surf_camp', 'boutique_hotel', 'bungalow'].includes(type) ? type : 'stay';
  return t(`home.types.${key}` as Parameters<GuestTranslator>[0]);
}
