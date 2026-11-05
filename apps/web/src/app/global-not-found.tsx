import type { Metadata } from 'next';
import './globals.css';

/** A URL that matches no route at all (each app's own not-found page covers the rest). */
export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-fg" data-theme="lagoon">
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-semibold">Page not found</h1>
          <p className="mt-3 text-muted">This page does not exist or has moved.</p>
          <a href="/" className="btn-secondary mt-6">
            Home
          </a>
        </main>
      </body>
    </html>
  );
}
