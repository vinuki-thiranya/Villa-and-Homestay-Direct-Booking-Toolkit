import type { Metadata } from 'next';
import Link from 'next/link';
import { CommissionCalculator } from '@/components/marketing/client';
import { Breadcrumbs, CtaBand, PlansGrid } from '@/components/marketing/parts';
import { MARKETING_TEXT } from '@/i18n/marketing';
import { marketingMeta } from '@/lib/marketing-seo';
import { langPrefix, type MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = (await params).lang as MarketingLang;
  const t = MARKETING_TEXT[lang].pricing;
  return marketingMeta(lang, '/pricing', { title: t.metaTitle, description: t.metaDescription });
}

export default async function PricingPage({ params }: Props) {
  const lang = (await params).lang as MarketingLang;
  const t = MARKETING_TEXT[lang];
  const p = langPrefix(lang);
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <Breadcrumbs lang={lang} trail={[[t.nav.pricing, '/pricing']]} />
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t.pricing.h1}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{t.pricing.lede}</p>
        <p className="mt-2 text-sm text-muted">{t.home.pricingIntro}</p>
        <div className="mt-8">
          <PlansGrid lang={lang} level={2} />
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pt-16" aria-labelledby="calc">
        <h2 id="calc" className="font-display text-3xl font-semibold">
          {t.pricing.calcTitle}
        </h2>
        <p className="mt-2 text-muted">{t.pricing.calcIntro}</p>
        <div className="mt-6">
          <CommissionCalculator t={t.pricing} />
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <Link href={`${p}/booking-com-commission-alternative`} className="font-medium text-brand underline-offset-4 hover:underline">
              {t.footer.alternative}
            </Link>
          </li>
          <li>
            <Link href={`${p}/faq`} className="font-medium text-brand underline-offset-4 hover:underline">
              {t.footer.faq}
            </Link>
          </li>
        </ul>
      </section>
      <CtaBand lang={lang} />
    </>
  );
}
