import { textResponse } from '@/lib/sitemap';

/** app.staydirect.lk and admin.staydirect.lk: nothing to index. */
export function GET() {
  return textResponse('User-agent: *\nDisallow: /\n');
}
