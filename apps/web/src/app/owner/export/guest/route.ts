import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/api';
import { TOKEN_COOKIE } from '@/lib/owner';

/**
 * A guest's data as a JSON file, for a GDPR / PDPA access request. The API wants a bearer token,
 * which the browser cannot send (httpOnly cookie), so this route forwards it.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL('/owner/login', request.url));
  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ message: 'id is required' }, { status: 400 });
  const res = await fetch(`${API_URL}/guests/${id}/export`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ message: `Could not export (${res.status})` }, { status: res.status });
  return new NextResponse(JSON.stringify(await res.json(), null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="guest-${id}.json"`,
      'cache-control': 'no-store',
    },
  });
}
