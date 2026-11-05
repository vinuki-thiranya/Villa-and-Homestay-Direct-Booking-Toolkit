import { NextResponse, type NextRequest } from 'next/server';
import { isCurrency } from '@/lib/format';
import { currencyForCountry, defaultCurrency, regionFromAcceptLanguage } from '@/lib/guest-locale';
import { langPrefix, MARKETING_LANGS, MOVED_PATHS, PREFIXED_LANGS, previewAllowed, siteParam, splitLang } from '@/lib/site-routing';

/**
 * Host routing (docs/plan.md §4, §10):
 *   staydirect.lk, www.staydirect.lk  → marketing: /… → /m/en/…, /si/… → /m/si/…
 *   app.staydirect.lk                 → /owner/*
 *   admin.staydirect.lk               → /admin/* (StayDirect staff console)
 *   {slug}.staydirect.lk              → /s/{slug}/{lang}/…
 *   any other host (custom domain)    → /s/{host}/{lang}/…
 *   {slug}.localhost:3000             → /s/{slug}/{lang}/… (dev)
 *   localhost, *.vercel.app           → /s/{site}/… path-routed guest sites, /owner, /admin, marketing
 *
 * Guest languages live in the URL (/de/rooms), so pages are cacheable and Google sees every
 * language (hreflang). An unprefixed URL is sent to the guest's earlier choice (cookie) only, never
 * guessed from Accept-Language. robots.txt and sitemap.xml are answered per host.
 * Outside production (or with ALLOW_THEME_PREVIEW=1), `?previewTheme=jungle` renders a guest site in another theme.
 */
const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? 'staydirect.lk').toLowerCase();
const OWNER_HOST = (process.env.OWNER_HOST ?? `app.${ROOT_DOMAIN}`).toLowerCase();
const ADMIN_HOST = (process.env.ADMIN_HOST ?? `admin.${ROOT_DOMAIN}`).toLowerCase();
const YEAR = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').toLowerCase().split(':')[0]!;
  const { pathname } = request.nextUrl;

  // No-login staff links work on any host: cleaner lists (/t/…, sent from the owner host) and
  // provider job cards (/j/…, sent from the guest-site host).
  if (pathname.startsWith('/t/') || pathname.startsWith('/j/')) return NextResponse.next();

  // Dev and platform preview hosts: everything by path.
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) {
    const s = /^\/s\/([^/]+)(.*)$/.exec(pathname);
    if (s) return guest(request, decodeURIComponent(s[1]!).split('~')[0]!, s[2] || '/', true);
    if (pathname.startsWith('/owner') || pathname.startsWith('/admin')) return NextResponse.next();
    return marketing(request, pathname);
  }

  if (host.endsWith('.localhost')) return guest(request, host.slice(0, -'.localhost'.length), pathname, false);

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    // Links that work by path in dev (/owner/login, /s/villa-lagoon) go to their own hosts here.
    const app = /^\/(owner|admin)(\/.*)?$/.exec(pathname);
    if (app) return NextResponse.redirect(`https://${app[1] === 'owner' ? OWNER_HOST : ADMIN_HOST}${app[2] ?? '/'}`, 307);
    const site = /^\/s\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
    if (site) return NextResponse.redirect(`https://${site[1]}.${ROOT_DOMAIN}${site[2] ?? '/'}`, 307);
    return marketing(request, pathname);
  }

  if (host === OWNER_HOST || host === ADMIN_HOST) {
    const app = host === OWNER_HOST ? '/owner' : '/admin';
    if (pathname === '/robots.txt') return rewrite(request, '/m/robots-private.txt');
    if (pathname.startsWith(app)) return NextResponse.next();
    return rewrite(request, `${app}${pathname === '/' ? '' : pathname}`);
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) return guest(request, host.slice(0, -(ROOT_DOMAIN.length + 1)), pathname, false);

  // Custom domain: the page resolves property.custom_domain = host through the API.
  return guest(request, host.replace(/^www\./, ''), pathname, false);
}

function guest(request: NextRequest, site: string, path: string, direct: boolean) {
  const root = direct ? `/s/${encodeURIComponent(site)}` : '';

  if (path === '/robots.txt' || path === '/sitemap.xml') return rewrite(request, `/s/${encodeURIComponent(siteParam({ site, preview: null, direct }))}${path}`);

  const { lang, rest, explicitEn } = splitLang(path);
  if (explicitEn) return redirect(request, `${root}${rest}` || '/', 308);
  const moved = MOVED_PATHS[rest];
  if (moved) return redirect(request, `${root}${langPrefix(lang)}${moved}`, 308);

  // A guest who picked a language before gets it on unprefixed links (shared links, the owner's
  // WhatsApp messages). Crawlers carry no cookie and always see the URL's own language.
  const chosen = request.cookies.get('sd_glang')?.value;
  if (lang === 'en' && request.method === 'GET' && chosen && (PREFIXED_LANGS as readonly string[]).includes(chosen)) {
    return redirect(request, `${root}/${chosen}${rest}`, 307);
  }

  // The guest's display currency: their choice, else a guess from country or browser region (kept as a
  // cookie from the first visit), else the language's usual one. It is part of the cached page's key,
  // so prices arrive already converted and never jump after load.
  const chosenCurrency = request.cookies.get('sd_cur')?.value;
  const h = request.headers;
  const guessed = isCurrency(chosenCurrency)
    ? null
    : (currencyForCountry(h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country')) ?? currencyForCountry(regionFromAcceptLanguage(h.get('accept-language'))));
  const currency = isCurrency(chosenCurrency) ? chosenCurrency : (guessed ?? defaultCurrency(lang));

  const preview = request.nextUrl.searchParams.get('previewTheme');
  const variant = siteParam({ site, preview: preview && previewAllowed() && /^[a-z]{2,20}$/.test(preview) ? preview : null, direct, currency });
  const res = rewrite(request, `/s/${encodeURIComponent(variant)}/${lang}${rest}`);
  if (guessed) res.cookies.set('sd_cur', guessed, { path: '/', maxAge: YEAR, sameSite: 'lax' });
  return res;
}

function marketing(request: NextRequest, pathname: string) {
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') return rewrite(request, `/m${pathname}`);
  const { lang, rest, explicitEn } = splitLang(pathname, MARKETING_LANGS.filter((l) => l !== 'en'));
  if (explicitEn) return redirect(request, rest || '/', 308);
  return rewrite(request, `/m/${lang}${rest}`);
}

function rewrite(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

function redirect(request: NextRequest, pathname: string, status: 307 | 308) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url, status);
}

export const config = {
  matcher: ['/((?!api/|_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|css|js|woff2?|map)$).*)'],
};
