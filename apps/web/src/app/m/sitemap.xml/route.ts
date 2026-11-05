import { blogSlugs, CLUSTERS, getDoc, str } from '@/lib/marketing';
import { marketingAlternates } from '@/lib/marketing-seo';
import { sitemapXml, xmlResponse } from '@/lib/sitemap';

/** staydirect.lk/sitemap.xml: every page in English and Sinhala. The example case study stays out until it is real. */
export const dynamic = 'force-static';

export function GET() {
  const pages: [string, string?][] = [
    [''],
    ['/pricing'],
    ['/booking-com-commission-alternative'],
    ['/faq'],
    ['/blog'],
    ...CLUSTERS.map((c): [string] => [`/direct-booking/${c}`]),
    ...blogSlugs().map((s): [string, string] => [`/blog/${s}`, str(getDoc('en', `blog/${s}`)?.meta.date)]),
  ];
  return xmlResponse(
    sitemapXml(
      pages.map(([path, lastmod]) => {
        const { 'x-default': xDefault, ...alternates } = marketingAlternates(path);
        return { alternates, xDefault, lastmod: lastmod || undefined };
      }),
    ),
  );
}
