import type { Metadata, Viewport } from 'next';
import '../globals.css';

/** Root layout for the no-login staff links: cleaner lists (/t/…) and provider job cards (/j/…). */
export const metadata: Metadata = {
  title: { default: 'StayDirect LK', template: '%s' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f6e6b' };

export default function LinksRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
