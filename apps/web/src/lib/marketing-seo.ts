import type { Metadata } from 'next';
import { clip, rootDomain } from './seo';
import { langPrefix, MARKETING_LANGS, OG_LOCALE, type MarketingLang } from './site-routing';

/** Search metadata for staydirect.lk pages: canonical, hreflang en/si (+ x-default), Open Graph. */

export function marketingOrigin(): string {
  return `https://${rootDomain()}`;
}

export function marketingUrl(lang: string, path = ''): string {
  return `${marketingOrigin()}${langPrefix(lang)}${path}` + (lang === 'en' && !path ? '/' : '');
}

export function marketingAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of MARKETING_LANGS) languages[l] = marketingUrl(l, path);
  languages['x-default'] = marketingUrl('en', path);
  return languages;
}

export function marketingMeta(
  lang: MarketingLang,
  path: string,
  m: { title: string; description: string; noindex?: boolean; article?: { published: string }; canonicalLang?: MarketingLang },
): Metadata {
  const title = clip(m.title, 70);
  const description = clip(m.description, 155);
  const url = marketingUrl(m.canonicalLang ?? lang, path);
  return {
    title,
    description,
    metadataBase: new URL(marketingOrigin()),
    alternates: { canonical: url, languages: m.noindex ? undefined : marketingAlternates(path) },
    robots: m.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: m.article ? 'article' : 'website',
      url,
      siteName: 'StayDirect LK',
      locale: OG_LOCALE[lang],
      title,
      description,
      ...(m.article ? { publishedTime: m.article.published } : {}),
    },
    twitter: { card: 'summary', title, description },
  };
}
