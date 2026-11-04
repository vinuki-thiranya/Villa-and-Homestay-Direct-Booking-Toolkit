import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'StayDirect LK — direct bookings for villas and homestays', template: '%s' },
  description:
    'Your own booking website, a calendar synced with Booking.com and Airbnb, deposits by PayHere, PayPal and LankaQR. Built for Sri Lankan villas and homestays.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f6e6b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
