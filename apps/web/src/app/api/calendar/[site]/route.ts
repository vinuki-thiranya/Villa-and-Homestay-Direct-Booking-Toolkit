import type { SiteCalendar } from '@staydirect/shared';
import { ApiError, apiFetch } from '@/lib/api';
import { addDaysIso } from '@/lib/calendar';

/*
 * The guest date picker's closed nights for the next 12 months, cached at the edge per site so a
 * guest in Europe or India never waits for the API in Singapore. The API clears the `avail:` tag a
 * few seconds after any night changes (booking, hold, expiry, cancellation, iCal import); the hourly
 * revalidate only moves "today" forward. The booking step re-checks availability live regardless.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

const colomboToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = decodeURIComponent((await params).site).toLowerCase();
  if (!/^[a-z0-9.-]{1,253}$/.test(site)) return Response.json({ message: 'Not found' }, { status: 404 });
  const today = colomboToday();
  try {
    const cal = await apiFetch<SiteCalendar>(`/public/sites/${encodeURIComponent(site)}/calendar?from=${today}&to=${addDaysIso(today, 366)}`, {
      revalidate: 3600,
      tags: [`avail:${site}`],
    });
    return Response.json(cal);
  } catch (err) {
    return Response.json({ message: 'Not found' }, { status: err instanceof ApiError ? err.status : 502 });
  }
}
