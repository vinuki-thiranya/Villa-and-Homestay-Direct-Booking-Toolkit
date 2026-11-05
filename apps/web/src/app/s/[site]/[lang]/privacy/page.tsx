import type { Metadata } from 'next';
import { siteContext } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const { property: p, t } = await siteContext();
  return { title: t('pages.privacy.metaTitle', { name: p.name }), robots: { index: false } };
}

export default async function PrivacyPage() {
  const { property: p, t } = await siteContext();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
      <h1 className="font-display text-3xl font-semibold">{t('pages.privacy.title')}</h1>
      <p className="mt-4">
        {t('pages.privacy.controller', {
          name: p.name,
          address: p.address,
          provider: p.whiteLabel ? t('pages.privacy.techProvider') : 'StayDirect LK',
        })}
      </p>
      <h2 className="mt-6 text-lg font-semibold">{t('pages.privacy.collectTitle')}</h2>
      <p className="mt-2">{t('pages.privacy.collect')}</p>
      <h2 className="mt-6 text-lg font-semibold">{t('pages.privacy.keepTitle')}</h2>
      <p className="mt-2">{t('pages.privacy.keep')}</p>
      <h2 className="mt-6 text-lg font-semibold">{t('pages.privacy.rightsTitle')}</h2>
      <p className="mt-2">
        {t('pages.privacy.rights', {
          contact: p.email ?? t('pages.privacy.theProperty'),
          whatsapp: p.whatsappNumber ? t('pages.privacy.orWhatsapp', { number: p.whatsappNumber }) : '',
        })}
      </p>
    </article>
  );
}
