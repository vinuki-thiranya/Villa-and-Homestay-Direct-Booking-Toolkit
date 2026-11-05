import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, CtaBand, Prose } from '@/components/marketing/parts';
import { AREA_NAMES, MARKETING_TEXT } from '@/i18n/marketing';
import { CLUSTERS, getDoc, str } from '@/lib/marketing';
import { marketingMeta } from '@/lib/marketing-seo';
import { langPrefix, MARKETING_LANGS, type MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string; area: string }> };

export function generateStaticParams() {
  return MARKETING_LANGS.flatMap((lang) => CLUSTERS.map((area) => ({ lang, area })));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, area } = (await params) as { lang: MarketingLang; area: string };
  const doc = getDoc(lang, `clusters/${area}`);
  if (!doc) return {};
  return marketingMeta(lang, `/direct-booking/${area}`, { title: str(doc.meta.title), description: str(doc.meta.description), canonicalLang: doc.lang });
}

/** One page per area (spec Prompt 6 §4): season, guests, payments and the commission maths there. */
export default async function AreaPage({ params }: Props) {
  const { lang, area } = (await params) as { lang: MarketingLang; area: string };
  const doc = getDoc(lang, `clusters/${area}`);
  if (!doc) notFound();
  const t = MARKETING_TEXT[lang];
  const p = langPrefix(lang);
  const name = AREA_NAMES[lang][area] ?? area;
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 pt-8">
        <Breadcrumbs lang={lang} trail={[[name, `/direct-booking/${area}`]]} />
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">{str(doc.meta.h1 ?? doc.meta.title)}</h1>
        <dl className="mt-6 grid gap-x-4 gap-y-2 rounded-card bg-surface-2 p-5 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-semibold">{t.areas.region}</dt>
          <dd>{str(doc.meta.region)}</dd>
          <dt className="font-semibold">{t.areas.season}</dt>
          <dd>{str(doc.meta.season)}</dd>
        </dl>
        <div className="mt-6">
          <Prose html={doc.html} lang={doc.lang} />
        </div>
        <h2 className="mt-12 font-display text-2xl font-semibold">{t.areas.others}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CLUSTERS.filter((c) => c !== area).map((c) => (
            <li key={c}>
              <Link href={`${p}/direct-booking/${c}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-brand">
                {AREA_NAMES[lang][c]}
              </Link>
            </li>
          ))}
        </ul>
      </article>
      <CtaBand lang={lang} />
    </>
  );
}
