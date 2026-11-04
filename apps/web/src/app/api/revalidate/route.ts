import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

/** Called by the API after an owner edits a property, room or gateway. */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET ?? '';
  const given = request.headers.get('x-revalidate-secret') ?? '';
  if (!secret || !safeEqual(secret, given)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string').slice(0, 50) : [];
  for (const tag of tags) revalidateTag(tag, 'max');
  // Older API versions sent only property:{id}; without a site:{key} tag we cannot tell which site changed.
  if (!tags.some((t) => t.startsWith('site:')) && tags.some((t) => t.startsWith('property:'))) revalidateTag('sites', 'max');
  return NextResponse.json({ ok: true, revalidated: tags });
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
