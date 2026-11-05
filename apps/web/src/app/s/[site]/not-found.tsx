import Link from 'next/link';
import { guestT } from '@/lib/site';

export default async function SiteNotFound() {
  const t = await guestT();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{t('pages.notFound.title')}</h1>
      <p className="mt-3 text-muted">{t('pages.notFound.body')}</p>
      <Link href="/" className="btn-secondary mt-6">
        {t('pages.notFound.home')}
      </Link>
    </div>
  );
}
