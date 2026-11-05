import type { Metadata } from 'next';
import type { PublicProperty } from '@staydirect/shared';
import { HREFLANG, langPrefix, OG_LOCALE, SITE_LANGS, type SiteLang } from './site-routing';

/*
 * Search metadata for guest sites (CLAUDE.md rule 20): every indexable page builds its metadata with
 * guestMetadata(), so canonical, hreflang, Open Graph and Search Console verification stay right
 * for every property without per-page work.
 */

export function rootDomain(): string {
  return process.env.ROOT_DOMAIN ?? 'staydirect.lk';
}

/** The site's public origin: its custom domain when set, else {slug}.staydirect.lk. */
export function siteOrigin(p: Pick<PublicProperty, 'customDomain' | 'slug'>): string {
  return `https://${p.customDomain ?? `${p.slug}.${rootDomain()}`}`;
}

/** Absolute URL of a page in a language: ('de', '/rooms') → https://villa.staydirect.lk/de/rooms */
export function localeUrl(p: Pick<PublicProperty, 'customDomain' | 'slug'>, lang: string, path = ''): string {
  return `${siteOrigin(p)}${langPrefix(lang)}${path}` + (lang === 'en' && !path ? '/' : '');
}

/** Canonical plus one alternate per language and x-default (English). */
export function alternatesFor(p: Pick<PublicProperty, 'customDomain' | 'slug'>, lang: string, path = ''): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = {};
  for (const l of SITE_LANGS) languages[HREFLANG[l]] = localeUrl(p, l, path);
  languages['x-default'] = localeUrl(p, 'en', path);
  return { canonical: localeUrl(p, lang, path), languages };
}

/** A photo resized to 1200 px wide by the site's own image optimiser, for link previews. */
export function ogImage(p: Pick<PublicProperty, 'customDomain' | 'slug'>, src: string): string {
  return `${siteOrigin(p)}/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`;
}

/** Shortens to `max` characters on a word boundary (titles ≤ 60, descriptions ≤ 155). */
export function clip(text: string, max: number): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,;:.–—-]+$/, '')}…`;
}

export interface GuestMeta {
  /** Path after the language prefix: '' (home), '/rooms', '/rooms/{id}'. */
  path: string;
  title: string;
  description: string;
  /** Photos for link previews; the property gallery when omitted. */
  images?: string[];
}

export function guestMetadata(p: PublicProperty, lang: SiteLang, m: GuestMeta): Metadata {
  const title = clip(m.title, 60);
  const description = clip(m.description, 155);
  const url = localeUrl(p, lang, m.path);
  const images = (m.images?.length ? m.images : p.photos).slice(0, 4).map((src) => ({ url: ogImage(p, src), width: 1200, alt: p.name }));
  return {
    title,
    description,
    metadataBase: new URL(siteOrigin(p)),
    alternates: alternatesFor(p, lang, m.path),
    openGraph: {
      type: 'website',
      url,
      siteName: p.name,
      locale: OG_LOCALE[lang],
      alternateLocale: SITE_LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
      title,
      description,
      images,
    },
    twitter: { card: images.length ? 'summary_large_image' : 'summary', title, description, images: images.slice(0, 1).map((i) => i.url) },
    verification: p.googleSiteVerification ? { google: p.googleSiteVerification } : undefined,
  };
}
