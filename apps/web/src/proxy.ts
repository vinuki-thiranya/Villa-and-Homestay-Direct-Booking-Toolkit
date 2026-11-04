import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host routing (docs/plan.md §4):
 *   staydirect.lk, www.staydirect.lk  → marketing (/)
 *   app.staydirect.lk                 → /owner/*
 *   admin.staydirect.lk               → /admin/* (StayDirect staff console)
 *   {slug}.staydirect.lk              → /s/{slug}/*
 *   any other host (custom domain)    → /s/{host}/*
 *   {slug}.localhost:3000             → /s/{slug}/* (dev)
 *   localhost:3000                    → unchanged (/, /s/villa-lagoon, /owner work directly)
 *
 * Rewritten guest requests carry `x-sd-base: ''` so pages build links without the /s/{site} prefix.
 * Outside production (or with ALLOW_THEME_PREVIEW=1), `?previewTheme=jungle` renders a guest site in another theme.
 */
const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? 'staydirect.lk').toLowerCase();
const OWNER_HOST = (process.env.OWNER_HOST ?? `app.${ROOT_DOMAIN}`).toLowerCase();
const ADMIN_HOST = (process.env.ADMIN_HOST ?? `admin.${ROOT_DOMAIN}`).toLowerCase();

export function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').toLowerCase().split(':')[0]!;
  const { pathname } = request.nextUrl;

  // No-login staff links work on any host: cleaner lists (/t/…, sent from the owner host) and
  // provider job cards (/j/…, sent from the guest-site host).
  if (pathname.startsWith('/t/') || pathname.startsWith('/j/')) return NextResponse.next();

  // Dev and platform preview hosts pass through untouched.
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) {
    return NextResponse.next({ request: { headers: guestHeaders(request) } });
  }

  if (host.endsWith('.localhost')) return rewriteSite(request, host.slice(0, -'.localhost'.length), pathname);

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return NextResponse.next();

  if (host === OWNER_HOST) {
    if (pathname.startsWith('/owner')) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/owner${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (host === ADMIN_HOST) {
    if (pathname.startsWith('/admin')) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) return rewriteSite(request, host.slice(0, -(ROOT_DOMAIN.length + 1)), pathname);

  // Custom domain: the page resolves property.custom_domain = host through the API.
  return rewriteSite(request, host.replace(/^www\./, ''), pathname);
}

function rewriteSite(request: NextRequest, site: string, pathname: string) {
  if (pathname.startsWith('/s/')) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/s/${encodeURIComponent(site)}${pathname === '/' ? '' : pathname}`;
  const headers = guestHeaders(request);
  headers.set('x-sd-base', '');
  return NextResponse.rewrite(url, { request: { headers } });
}

/** Theme previews: always in dev; in a production build only when ALLOW_THEME_PREVIEW=1 (Lighthouse runs). */
function previewAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_THEME_PREVIEW === '1';
}

function guestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete('x-sd-preview-theme'); // never trust it from the client
  const preview = request.nextUrl.searchParams.get('previewTheme');
  if (preview && previewAllowed() && /^[a-z]{2,20}$/.test(preview)) headers.set('x-sd-preview-theme', preview);
  return headers;
}

export const config = {
  matcher: ['/((?!api/|_next/|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|css|js|txt|xml)$).*)'],
};
