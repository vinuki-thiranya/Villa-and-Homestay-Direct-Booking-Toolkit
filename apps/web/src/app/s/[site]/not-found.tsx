import Link from 'next/link';

export default function SiteNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-muted">The property or page may have moved.</p>
      <Link href="/" className="btn-secondary mt-6">
        Go to the home page
      </Link>
    </div>
  );
}
