import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarSync, CreditCard, Globe, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { CtaBand, PlansGrid } from '@/components/marketing/parts';
import { AREA_NAMES, MARKETING_TEXT } from '@/i18n/marketing';
import { CLUSTERS, faqItems, getDoc, listPosts, str } from '@/lib/marketing';
import { marketingMeta, marketingOrigin, marketingUrl } from '@/lib/marketing-seo';
import { langPrefix, type MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = (await params).lang as MarketingLang;
  const t = MARKETING_TEXT[lang].home;
  return marketingMeta(lang, '', { title: t.metaTitle, description: t.metaDescription });
}

const FEATURES = [
  ['site', Globe],
  ['sync', CalendarSync],
  ['pay', CreditCard],
  ['whatsapp', MessageCircle],
  ['safe', ShieldCheck],
  ['report', Sparkles],
] as const;

export default async function MarketingHome({ params }: Props) {
  const lang = (await params).lang as MarketingLang;
  const t = MARKETING_TEXT[lang];
  const p = langPrefix(lang);
  const faq = getDoc(lang, 'faq');
  const posts = listPosts(lang).slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${marketingOrigin()}/#org`, name: 'StayDirect LK', url: marketingUrl('en'), areaServed: 'LK' },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'StayDirect LK',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web, Android, iOS',
            url: marketingUrl(lang),
            inLanguage: lang,
            publisher: { '@id': `${marketingOrigin()}/#org` },
            offers: { '@type': 'Offer', price: 5000, priceCurrency: 'LKR', url: marketingUrl(lang, '/pricing') },
          },
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-20">
        <p className="pill bg-brand/10 text-brand">{t.home.pill}</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">{t.home.h1}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">{t.home.lede}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/s/villa-lagoon" className="btn-primary">
            {t.home.demo}
          </a>
          <a href="/owner/login" className="btn-secondary">
            {t.home.start}
          </a>
        </div>
      </section>

      <section className="bg-surface-2/70" aria-labelledby="features">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="features" className="font-display text-3xl font-semibold">
            {t.home.featuresTitle}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([key, Icon]) => (
              <div key={key} className="card p-6">
                <Icon aria-hidden className="h-6 w-6 text-brand" />
                <h3 className="mt-3 font-semibold">{t.features[key][0]}</h3>
                <p className="mt-1 text-sm text-muted">{t.features[key][1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="pricing">
        <h2 id="pricing" className="font-display text-3xl font-semibold">
          {t.home.pricingTitle}
        </h2>
        <p className="mt-2 text-muted">{t.home.pricingIntro}</p>
        <div className="mt-8">
          <PlansGrid lang={lang} />
        </div>
        <Link href={`${p}/pricing`} className="mt-6 inline-flex items-center gap-1.5 font-medium text-brand underline-offset-4 hover:underline">
          {t.home.seePricing} <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </section>

      <section className="bg-surface-2/70" aria-labelledby="areas">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="areas" className="font-display text-3xl font-semibold">
            {t.home.areasTitle}
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CLUSTERS.map((c) => (
              <li key={c}>
                <Link href={`${p}/direct-booking/${c}`} className="card flex min-h-14 items-center justify-between px-5 font-medium hover:border-brand">
                  {AREA_NAMES[lang][c]} <ArrowRight aria-hidden className="h-4 w-4 text-brand" />
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`${p}/case-study`} className="mt-6 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline">
            {t.home.caseStudy}
          </Link>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="guides">
          <h2 id="guides" className="font-display text-3xl font-semibold">
            {t.home.blogTitle}
          </h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug} className="card p-6">
                <h3 className="font-semibold leading-snug">
                  <Link href={`${p}/blog/${post.slug}`} className="hover:text-brand">
                    {str(post.meta.title)}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted">{str(post.meta.description)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faq && (
        <section className="bg-surface-2/70" aria-labelledby="faq">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 id="faq" className="font-display text-3xl font-semibold">
              {t.home.faqTitle}
            </h2>
            <div className="mt-6 space-y-3">
              {faqItems(faq)
                .slice(0, 5)
                .map((f) => (
                  <details key={f.q} className="card p-5">
                    <summary className="cursor-pointer font-semibold">{f.q}</summary>
                    <div className="m-prose mt-2 text-muted" dangerouslySetInnerHTML={{ __html: f.html }} />
                  </details>
                ))}
            </div>
            <Link href={`${p}/faq`} className="mt-6 inline-block font-medium text-brand underline-offset-4 hover:underline">
              {t.home.allFaq}
            </Link>
          </div>
        </section>
      )}

      <CtaBand lang={lang} />
    </>
  );
}
