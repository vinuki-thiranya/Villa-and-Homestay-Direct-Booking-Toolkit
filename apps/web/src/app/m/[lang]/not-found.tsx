import Link from 'next/link';
import { lang as rootLang } from 'next/root-params';
import { MARKETING_TEXT } from '@/i18n/marketing';
import { langPrefix, type MarketingLang } from '@/lib/site-routing';

export default async function MarketingNotFound() {
  const lang: MarketingLang = (await rootLang()) === 'si' ? 'si' : 'en';
  const t = MARKETING_TEXT[lang].notFound;
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{t.title}</h1>
      <p className="mt-3 text-muted">{t.body}</p>
      <Link href={langPrefix(lang) || '/'} className="btn-secondary mt-6">
        {t.home}
      </Link>
    </div>
  );
}
