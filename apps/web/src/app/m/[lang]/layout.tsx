import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarketingLangSwitch } from '@/components/marketing/client';
import { AREA_NAMES, MARKETING_TEXT } from '@/i18n/marketing';
import { CLUSTERS } from '@/lib/marketing';
import { langPrefix, MARKETING_LANGS, type MarketingLang } from '@/lib/site-routing';
import { FONT_STACK, FONT_VARIABLES } from '@/themes/fonts';
import '../../globals.css';
import './marketing.css';

/*
 * Root layout of the marketing site: staydirect.lk in English, staydirect.lk/si in Sinhala
 * (proxy.ts rewrites to /m/{lang}). Every page is static, built from content/marketing/.
 */
export function generateStaticParams() {
  return MARKETING_LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

export const metadata: Metadata = {
  title: { default: 'StayDirect LK — direct bookings for villas and homestays', template: '%s' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f6e6b' };

// Lagoon's colours with a serif display face; Sinhala falls back per glyph to Abhaya Libre / Noto Sans Sinhala.
const FONTS = `:root{--g-sans:${FONT_STACK.manrope};--g-display:${FONT_STACK.lora}}`;

export default async function MarketingRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!(MARKETING_LANGS as readonly string[]).includes(raw)) notFound();
  const lang = raw as MarketingLang;
  const t = MARKETING_TEXT[lang];
  const p = langPrefix(lang);
  return (
    <html lang={lang} data-theme="lagoon" className={FONT_VARIABLES}>
      <body className="min-h-dvh bg-bg">
        <style dangerouslySetInnerHTML={{ __html: FONTS }} />
        <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <Link href={p || '/'} className="font-display text-xl font-semibold">
              StayDirect <span className="text-brand">LK</span>
            </Link>
            <nav aria-label={t.nav.main} className="ml-auto hidden items-center gap-5 text-sm font-medium md:flex">
              <Link href={`${p}/pricing`} className="hover:text-brand">
                {t.nav.pricing}
              </Link>
              <Link href={`${p}/direct-booking/mirissa`} className="hover:text-brand">
                {t.nav.areas}
              </Link>
              <Link href={`${p}/blog`} className="hover:text-brand">
                {t.nav.blog}
              </Link>
              <Link href={`${p}/faq`} className="hover:text-brand">
                {t.nav.faq}
              </Link>
            </nav>
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <MarketingLangSwitch lang={lang} label={t.langLabel} />
              <a href="/owner/login" className="btn-secondary hidden min-h-10 px-4 sm:inline-flex">
                {t.nav.login}
              </a>
            </div>
          </div>
          <nav aria-label={t.nav.main} className="flex gap-5 overflow-x-auto border-t border-line/60 px-4 py-2 text-sm font-medium md:hidden">
            <Link href={`${p}/pricing`}>{t.nav.pricing}</Link>
            <Link href={`${p}/direct-booking/mirissa`}>{t.nav.areas}</Link>
            <Link href={`${p}/blog`}>{t.nav.blog}</Link>
            <Link href={`${p}/faq`}>{t.nav.faq}</Link>
            <a href="/owner/login">{t.nav.login}</a>
          </nav>
        </header>

        <main id="main">{children}</main>

        <footer className="mt-16 border-t border-line bg-surface-2/70">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-3">
            <div>
              <p className="font-display text-lg font-semibold">
                StayDirect <span className="text-brand">LK</span>
              </p>
              <p className="mt-2 text-muted">{t.brandTag}</p>
            </div>
            <div>
              <h2 className="font-semibold">{t.footer.areas}</h2>
              <ul className="mt-2 space-y-1.5 text-muted">
                {CLUSTERS.map((c) => (
                  <li key={c}>
                    <Link href={`${p}/direct-booking/${c}`} className="hover:text-brand">
                      {AREA_NAMES[lang][c]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">{t.footer.company}</h2>
              <ul className="mt-2 space-y-1.5 text-muted">
                <li>
                  <Link href={`${p}/pricing`} className="hover:text-brand">
                    {t.footer.pricing}
                  </Link>
                </li>
                <li>
                  <Link href={`${p}/booking-com-commission-alternative`} className="hover:text-brand">
                    {t.footer.alternative}
                  </Link>
                </li>
                <li>
                  <Link href={`${p}/blog`} className="hover:text-brand">
                    {t.footer.guides}
                  </Link>
                </li>
                <li>
                  <Link href={`${p}/faq`} className="hover:text-brand">
                    {t.footer.faq}
                  </Link>
                </li>
                <li>
                  <Link href={`${p}/case-study`} className="hover:text-brand">
                    {t.footer.caseStudy}
                  </Link>
                </li>
                <li>
                  <a href="/owner/login" className="hover:text-brand">
                    {t.footer.login}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
