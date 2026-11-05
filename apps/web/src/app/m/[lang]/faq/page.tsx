import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs, CtaBand } from '@/components/marketing/parts';
import { MARKETING_TEXT } from '@/i18n/marketing';
import { faqItems, getDoc, str } from '@/lib/marketing';
import { marketingMeta } from '@/lib/marketing-seo';
import type { MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = (await params).lang as MarketingLang;
  const doc = getDoc(lang, 'faq');
  if (!doc) return {};
  return marketingMeta(lang, '/faq', { title: str(doc.meta.title) || MARKETING_TEXT[lang].faq.metaTitle, description: str(doc.meta.description), canonicalLang: doc.lang });
}

/** The owners' FAQ with FAQPage structured data (plain-text answers). */
export default async function FaqPage({ params }: Props) {
  const lang = (await params).lang as MarketingLang;
  const doc = getDoc(lang, 'faq');
  if (!doc) notFound();
  const items = faqItems(doc);
  const t = MARKETING_TEXT[lang];
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          inLanguage: doc.lang,
          mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.text } })),
        }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-8">
        <Breadcrumbs lang={lang} trail={[[t.nav.faq, '/faq']]} />
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">{str(doc.meta.h1 ?? doc.meta.title)}</h1>
        <div className="mt-8 space-y-3">
          {items.map((f) => (
            <details key={f.q} className="card p-5">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <div className="m-prose mt-2 text-muted" dangerouslySetInnerHTML={{ __html: f.html }} />
            </details>
          ))}
        </div>
      </section>
      <CtaBand lang={lang} />
    </>
  );
}
