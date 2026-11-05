/*
 * sitemap.xml with hreflang alternates (xhtml:link), for guest sites and the marketing site. Each
 * entry lists every language version of the page, as Google asks for multilingual sitemaps.
 */

export interface SitemapEntry {
  /** One URL per language, keyed by hreflang; the first is the entry's own <loc> per language. */
  alternates: Record<string, string>;
  /** The URL for x-default (English). */
  xDefault?: string;
  lastmod?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function sitemapXml(entries: SitemapEntry[]): string {
  const urls: string[] = [];
  for (const e of entries) {
    const links = Object.entries(e.alternates)
      .map(([hl, href]) => `    <xhtml:link rel="alternate" hreflang="${esc(hl)}" href="${esc(href)}"/>`)
      .concat(e.xDefault ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(e.xDefault)}"/>`] : [])
      .join('\n');
    for (const loc of Object.values(e.alternates)) {
      urls.push(`  <url>\n    <loc>${esc(loc)}</loc>\n${e.lastmod ? `    <lastmod>${esc(e.lastmod.slice(0, 10))}</lastmod>\n` : ''}${links}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export function xmlResponse(body: string): Response {
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

export function textResponse(body: string): Response {
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
