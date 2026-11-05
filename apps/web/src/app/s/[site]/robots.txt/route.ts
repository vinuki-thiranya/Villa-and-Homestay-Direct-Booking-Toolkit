import { notFound } from 'next/navigation';
import { getSite } from '@/lib/api';
import { siteOrigin } from '@/lib/seo';
import { langPrefix, parseSiteParam, PRIVATE_GUEST_PATHS, SITE_LANGS } from '@/lib/site-routing';
import { textResponse } from '@/lib/sitemap';

// Per host at request time; the site data underneath is cached (lib/api.ts tags).
export const dynamic = 'force-dynamic';

/** robots.txt of one guest site: booking, payment, guide and review links stay out of search. */
export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = parseSiteParam((await params).site);
  const p = await getSite(site);
  if (!p) notFound();
  const disallow = SITE_LANGS.flatMap((l) => PRIVATE_GUEST_PATHS.map((path) => `Disallow: ${langPrefix(l)}${path}`));
  return textResponse(['User-agent: *', ...disallow, '', `Sitemap: ${siteOrigin(p)}/sitemap.xml`, ''].join('\n'));
}
