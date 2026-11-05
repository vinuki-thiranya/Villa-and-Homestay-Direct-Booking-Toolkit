import { rootDomain } from '@/lib/seo';
import { textResponse } from '@/lib/sitemap';

/** staydirect.lk */
export function GET() {
  return textResponse(['User-agent: *', 'Disallow: /owner', 'Disallow: /admin', '', `Sitemap: https://${rootDomain()}/sitemap.xml`, ''].join('\n'));
}
