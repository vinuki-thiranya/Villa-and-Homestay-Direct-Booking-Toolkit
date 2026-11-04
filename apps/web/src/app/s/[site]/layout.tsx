import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { CurrencySwitcher } from '@/components/guest/CurrencySwitcher';
import { waLink } from '@/lib/format';
import { siteContext } from '@/lib/site';

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ site: string }> }) {
  const { site } = await params;
  const { property: p, base, currency } = await siteContext(site);
  const wa = waLink(p.whatsappNumber, `Hello ${p.name}, I have a question about a stay.`);
  const nav = [
    { href: `${base}/rooms`, label: 'Rooms' },
    { href: `${base}/experiences`, label: 'Experiences' },
    { href: `${base}/location`, label: 'Location' },
    { href: `${base}/contact`, label: 'Contact' },
  ];

  return (
    <div data-theme={p.theme} className="flex min-h-dvh flex-col bg-bg text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href={base || '/'} className="font-display text-lg font-semibold tracking-tight">
            {p.name}
          </Link>
          <nav aria-label="Main" className="ml-auto hidden items-center gap-6 text-sm font-medium md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-brand">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <CurrencySwitcher current={currency} />
            <Link href={`${base}/book`} className="btn-primary min-h-9 px-4">
              Book
            </Link>
          </div>
        </div>
        <nav aria-label="Sections" className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 pb-2 text-sm font-medium md:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap text-muted hover:text-brand">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line bg-surface-2/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-3">
          <div>
            <p className="font-display text-base font-semibold text-fg">{p.name}</p>
            <p className="mt-1">{p.address}</p>
            {p.sltdaNumber && <p className="mt-1">SLTDA registration {p.sltdaNumber}</p>}
          </div>
          <div className="space-y-1">
            <p>
              Check-in from {p.checkIn} · Check-out by {p.checkOut}
            </p>
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
                Privacy notice
              </Link>
            </p>
            <p>
              Powered by{' '}
              <a className="font-medium text-fg underline-offset-2 hover:underline" href="https://staydirect.lk" rel="noopener">
                StayDirect LK
              </a>
            </p>
          </div>
        </div>
      </footer>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg md:bottom-6"
          aria-label={`Message ${p.name} on WhatsApp`}
        >
          <MessageCircle aria-hidden className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
