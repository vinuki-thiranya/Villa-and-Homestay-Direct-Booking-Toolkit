import Link from 'next/link';
import { Menu, MessageCircle } from 'lucide-react';
import { CurrencySwitcher } from '@/components/guest/CurrencySwitcher';
import { GuestI18nProvider, GuestLanguageSwitch } from '@/components/guest/GuestI18n';
import { rich } from '@/components/guest/rich';
import { waLink } from '@/lib/format';
import { siteContext, siteThemeCss } from '@/lib/site';
import { FONT_VARIABLES } from '@/themes/fonts';

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ site: string }> }) {
  const { site } = await params;
  const { property: p, base, currency, theme, lang, t } = await siteContext(site);
  const wa = waLink(p.whatsappNumber, t('layout.waText', { name: p.name }));
  const nav = [
    { href: `${base}/rooms`, label: t('layout.rooms') },
    { href: `${base}/experiences`, label: t('layout.experiences') },
    { href: `${base}/location`, label: t('layout.location') },
    { href: `${base}/contact`, label: t('layout.contact') },
  ];

  return (
    <GuestI18nProvider lang={lang}>
    <div data-theme={theme.key} lang={lang} className={`g-site ${FONT_VARIABLES} flex min-h-dvh flex-col bg-bg text-fg`}>
      {/* Validated colours and fixed font stacks only (themes/registry.ts themeCss). */}
      <style dangerouslySetInnerHTML={{ __html: siteThemeCss(p, theme) }} />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        {t('layout.skip')}
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16">
          <Link href={base || '/'} className="g-display min-w-0 truncate text-xl leading-none">
            {p.name}
          </Link>
          <nav aria-label={t('layout.mainNav')} className="ml-auto hidden items-center gap-6 text-sm font-medium md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-brand">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
            <GuestLanguageSwitch />
            <CurrencySwitcher current={currency} />
            <Link href={`${base}/book`} className="g-cta hidden min-h-10 px-4 md:inline-flex">
              {t('layout.book')}
            </Link>
            {/* No-JS menu for phones: keeps the first screen free for the photo and the date search. */}
            <details className="relative md:hidden">
              <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-surface-2 [&::-webkit-details-marker]:hidden" aria-label={t('layout.menu')}>
                <Menu aria-hidden className="h-5 w-5" />
              </summary>
              <nav aria-label={t('layout.siteNav')} className="absolute right-0 top-12 w-52 rounded-card border border-line bg-surface p-2 shadow-xl">
                {[...nav, { href: `${base}/book`, label: t('layout.bookYourStay') }].map((n) => (
                  <Link key={n.href} href={n.href} className="flex min-h-11 items-center rounded-lg px-3 font-medium hover:bg-surface-2">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line bg-surface-2/60 pb-24 md:pb-0">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-3">
          <div>
            <p className="g-display text-lg text-fg">{p.name}</p>
            <p className="mt-1">{p.address}</p>
            {p.sltdaNumber && <p className="mt-1">{t('layout.sltda', { number: p.sltdaNumber })}</p>}
          </div>
          <div className="space-y-1">
            <p>{t('layout.checkInFrom', { time: p.checkIn })}</p>
            <p>{t('layout.checkOutBy', { time: p.checkOut })}</p>
            {p.email && (
              <p>
                <a className="underline-offset-2 hover:underline" href={`mailto:${p.email}`}>
                  {p.email}
                </a>
              </p>
            )}
          </div>
          <div className="space-y-1 sm:text-right">
            <p>
              <Link className="underline-offset-2 hover:underline" href={`${base}/privacy`}>
                {t('layout.privacy')}
              </Link>
            </p>
            {p.whiteLabel ? (
              p.brand?.displayName ? (
                <p className="flex items-center gap-2 sm:justify-end">
                  {p.brand.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-supplied logo URL, any host
                    <img src={p.brand.logoUrl} alt="" className="h-5 w-auto" loading="lazy" />
                  )}
                  <span>{rich(t('layout.managedBy'), { brand: <span className="font-medium text-fg">{p.brand.displayName}</span> })}</span>
                </p>
              ) : null
            ) : (
              <p>
                {rich(t('layout.poweredBy'), {
                  brand: (
                    <a className="font-medium text-fg underline-offset-2 hover:underline" href="https://staydirect.lk" rel="noopener">
                      StayDirect LK
                    </a>
                  ),
                })}
              </p>
            )}
          </div>
        </div>
      </footer>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-[#063b1b] shadow-lg md:bottom-6"
          aria-label={t('layout.waLabel', { name: p.name })}
        >
          <MessageCircle aria-hidden className="h-7 w-7" />
        </a>
      )}
    </div>
    </GuestI18nProvider>
  );
}
