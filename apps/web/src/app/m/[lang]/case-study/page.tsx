import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocArticle } from '@/components/marketing/parts';
import { MARKETING_TEXT } from '@/i18n/marketing';
import { getDoc, str } from '@/lib/marketing';
import { marketingMeta } from '@/lib/marketing-seo';
import type { MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string }> };

/** An example with illustrative numbers: noindex and out of the sitemap until a real pilot replaces it. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = (await params).lang as MarketingLang;
  const doc = getDoc(lang, 'case-study');
  if (!doc) return {};
  return marketingMeta(lang, '/case-study', { title: str(doc.meta.title), description: str(doc.meta.description), noindex: true });
}

export default async function CaseStudyPage({ params }: Props) {
  const lang = (await params).lang as MarketingLang;
  const doc = getDoc(lang, 'case-study');
  if (!doc) notFound();
  const t = MARKETING_TEXT[lang];
  return <DocArticle doc={doc} lang={lang} notice={t.caseStudy.banner} trail={[[t.footer.caseStudy, '/case-study']]} />;
}
