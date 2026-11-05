import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import '../globals.css';
import './admin.css';

/**
 * StayDirect admin console (spec §3.11) — staff only, served on ADMIN_HOST (admin.staydirect.lk).
 * Typeface: Atkinson Hyperlegible, chosen because staff read booking references, phone numbers
 * and LKR amounts all day and its glyphs keep 0/O and 1/l/I apart. Self-hosted by next/font.
 */
const atkinson = Atkinson_Hyperlegible({ weight: ['400', '700'], subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'StayDirect admin', template: '%s · StayDirect admin' },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f6e6b' };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <div className={`adm ${atkinson.className}`}>{children}</div>
      </body>
    </html>
  );
}
