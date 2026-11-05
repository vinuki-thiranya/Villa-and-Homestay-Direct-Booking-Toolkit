import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { MARKETING_LANGS } from '@/lib/site-routing';
import '../../globals.css';

/** Root layout of the marketing site (staydirect.lk in English, staydirect.lk/si in Sinhala). */
export function generateStaticParams() {
  return MARKETING_LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

export const metadata: Metadata = {
  title: { default: 'StayDirect LK — direct bookings for villas and homestays', template: '%s' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f6e6b' };

export default async function MarketingRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!(MARKETING_LANGS as readonly string[]).includes(lang)) notFound();
  return (
    <html lang={lang}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
