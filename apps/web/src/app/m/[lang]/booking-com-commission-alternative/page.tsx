import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocArticle } from '@/components/marketing/parts';
import { MARKETING_TEXT } from '@/i18n/marketing';
import { getDoc, str } from '@/lib/marketing';
import { marketingMeta } from '@/lib/marketing-seo';
import type { MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string }> };
const PATH = '/booking-com-commission-alternative';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = (await params).lang as MarketingLang;
  const doc = getDoc(lang, 'booking-com-commission-alternative');
  if (!doc) return {};
  return marketingMeta(lang, PATH, { title: str(doc.meta.title), description: str(doc.meta.description), canonicalLang: doc.lang });
}

/** Landing page for "Booking.com commission alternative" searches. */
export default async function CommissionAlternativePage({ params }: Props) {
  const lang = (await params).lang as MarketingLang;
  const doc = getDoc(lang, 'booking-com-commission-alternative');
  if (!doc) notFound();
  return <DocArticle doc={doc} lang={lang} trail={[[MARKETING_TEXT[lang].footer.alternative, PATH]]} />;
}
