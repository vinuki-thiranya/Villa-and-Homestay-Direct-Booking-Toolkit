import type { Metadata, Viewport } from 'next';
import { getOwnerLang } from '@/lib/owner-i18n';
import '../globals.css';

/** Root layout for the owner web app: `<html lang>` follows the owner's language (en | si). */
export const metadata: Metadata = {
  title: { default: 'StayDirect LK — owner', template: '%s' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f6e6b' };

export default async function OwnerRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={await getOwnerLang()}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
