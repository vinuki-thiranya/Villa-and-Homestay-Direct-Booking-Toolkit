import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/api';
import { TOKEN_COOKIE } from '@/lib/owner';

/**
 * Excel download of an owner statement. The API wants a bearer token, which the browser cannot
 * send (it lives in an httpOnly cookie), so this route forwards it and streams the file back.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL('/owner/login', request.url));
  const ownerId = request.nextUrl.searchParams.get('ownerId') ?? '';
  const period = request.nextUrl.searchParams.get('period') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(ownerId) || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ message: 'ownerId and period (YYYY-MM) are required' }, { status: 400 });
  }
  const res = await fetch(`${API_URL}/owners/${ownerId}/statement.xlsx?period=${period}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ message: `Could not create the file (${res.status})` }, { status: res.status });
  return new NextResponse(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="statement-${period}.xlsx"`,
      'cache-control': 'no-store',
    },
  });
}
