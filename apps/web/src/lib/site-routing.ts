/*
 * Public URLs of guest sites and the marketing site, shared by proxy.ts and the pages. Pure functions
 * only (proxy.ts imports this), no dictionaries or server-only modules.
 *
 *   /rooms        English, no prefix (x-default)
 *   /de/rooms     German; likewise /si, /fr, /hi
 *
 * Internally a guest page lives at /s/[site]/[lang]/…, where [site] is the site key plus variants:
 *   villa-lagoon~t-jungle   theme preview (dev, or ALLOW_THEME_PREVIEW=1)
 *   villa-lagoon~d          path-routed (/s/villa-lagoon/… on localhost and preview deployments)
 *   villa-lagoon~c-EUR      the guest's display currency, so a cached page already shows their prices
 */

export const SITE_LANGS = ['en', 'si', 'de', 'fr', 'hi'] as const;
export type SiteLang = (typeof SITE_LANGS)[number];

/** Languages with a URL prefix; English is the unprefixed default. */
export const PREFIXED_LANGS = ['si', 'de', 'fr', 'hi'] as const satisfies readonly SiteLang[];

/** The marketing site's languages (staydirect.lk, staydirect.lk/si). */
export const MARKETING_LANGS = ['en', 'si'] as const;
export type MarketingLang = (typeof MARKETING_LANGS)[number];

/** hreflang / og:locale per language. */
export const HREFLANG: Record<SiteLang, string> = { en: 'en', si: 'si', de: 'de', fr: 'fr', hi: 'hi' };
export const OG_LOCALE: Record<SiteLang, string> = { en: 'en_GB', si: 'si_LK', de: 'de_DE', fr: 'fr_FR', hi: 'hi_IN' };

/** Each language's own name, for language menus. */
export const LANG_NAMES: Record<SiteLang, string> = { en: 'English', si: 'සිංහල', de: 'Deutsch', fr: 'Français', hi: 'हिन्दी' };
/** Short labels for the compact switch. */
export const LANG_CODES: Record<SiteLang, string> = { en: 'EN', si: 'සිං', de: 'DE', fr: 'FR', hi: 'हि' };

export function isSiteLang(v: unknown): v is SiteLang {
  return typeof v === 'string' && (SITE_LANGS as readonly string[]).includes(v);
}

export function langPrefix(lang: string): string {
  return lang === 'en' ? '' : `/${lang}`;
}

/**
 * Splits a public path into its language and the rest: '/de/rooms' → de + '/rooms', '/rooms' → en.
 * `explicitEn` is true for '/en/…', which proxy.ts redirects to the unprefixed URL.
 */
export function splitLang(pathname: string, langs: readonly string[] = PREFIXED_LANGS): { lang: string; rest: string; explicitEn: boolean } {
  const m = /^\/([a-z]{2})(?=\/|$)(.*)$/.exec(pathname);
  if (m && langs.includes(m[1]!)) return { lang: m[1]!, rest: m[2] || '', explicitEn: false };
  if (m && m[1] === 'en') return { lang: 'en', rest: m[2] || '', explicitEn: true };
  return { lang: 'en', rest: pathname === '/' ? '' : pathname, explicitEn: false };
}

/** The same page in another language: ('/de/rooms', 'fr') → '/fr/rooms'; ('/rooms', 'en') → '/rooms'. */
export function switchLangPath(pathname: string, root: string, lang: string): string {
  const inside = root && pathname.startsWith(root) ? pathname.slice(root.length) : pathname;
  const { rest } = splitLang(inside || '/');
  return `${root}${langPrefix(lang)}${rest}` || '/';
}

export interface SiteVariant {
  site: string;
  preview: string | null;
  direct: boolean;
  currency?: string | null;
}

export function siteParam({ site, preview, direct, currency }: SiteVariant): string {
  return `${site}${preview ? `~t-${preview}` : ''}${direct ? '~d' : ''}${currency ? `~c-${currency}` : ''}`;
}

export function parseSiteParam(raw: string): SiteVariant {
  const [site, ...mods] = decodeURIComponent(raw).split('~');
  let preview: string | null = null;
  let direct = false;
  let currency: string | null = null;
  for (const m of mods) {
    if (m === 'd') direct = true;
    else if (m.startsWith('t-') && /^[a-z]{2,20}$/.test(m.slice(2))) preview = m.slice(2);
    else if (/^c-[A-Z]{3}$/.test(m)) currency = m.slice(2);
  }
  return { site: site ?? '', preview, direct, currency };
}

/** Theme previews: always in dev; in a production build only with ALLOW_THEME_PREVIEW=1 (Lighthouse, screenshots). */
export function previewAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_THEME_PREVIEW === '1';
}

/** Guest pages that moved; proxy.ts answers the old path with a permanent redirect. */
export const MOVED_PATHS: Record<string, string> = { '/experiences': '/things-to-do' };

/** Guest paths that must never be indexed (also disallowed in robots.txt). */
export const PRIVATE_GUEST_PATHS = ['/book', '/booking/', '/guide/', '/review/'] as const;
