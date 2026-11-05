import { notFound } from 'next/navigation';
import { getSite } from '@/lib/api';
import { localeUrl } from '@/lib/seo';
import { HREFLANG, parseSiteParam, SITE_LANGS } from '@/lib/site-routing';
import { sitemapXml, xmlResponse } from '@/lib/sitemap';

// Per host at request time; the site data underneath is cached (lib/api.ts tags).
export const dynamic = 'force-dynamic';

/** Every indexable page of one guest site, in every language (proxy.ts sends /sitemap.xml here). */
export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = parseSiteParam((await params).site);
  const p = await getSite(site);
  if (!p) notFound();
  const paths = ['', '/rooms', ...p.rooms.map((r) => `/rooms/${r.id}`), '/location', '/things-to-do', '/contact'];
  return xmlResponse(
    sitemapXml(
      paths.map((path) => ({
        alternates: Object.fromEntries(SITE_LANGS.map((l) => [HREFLANG[l], localeUrl(p, l, path)])),
        xDefault: localeUrl(p, 'en', path),
        lastmod: p.updatedAt,
      })),
    ),
  );
}
