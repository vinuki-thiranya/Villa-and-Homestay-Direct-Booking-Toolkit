import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs, CtaBand, Prose } from '@/components/marketing/parts';
import { fill, MARKETING_TEXT } from '@/i18n/marketing';
import { blogSlugs, getDoc, listPosts, str } from '@/lib/marketing';
import { marketingMeta, marketingOrigin, marketingUrl } from '@/lib/marketing-seo';
import { langPrefix, MARKETING_LANGS, type MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  return MARKETING_LANGS.flatMap((lang) => blogSlugs().map((slug) => ({ lang, slug })));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = (await params) as { lang: MarketingLang; slug: string };
  const doc = getDoc(lang, `blog/${slug}`);
  if (!doc) return {};
  return marketingMeta(lang, `/blog/${slug}`, {
    title: str(doc.meta.title),
    description: str(doc.meta.description),
    article: { published: str(doc.meta.date) },
    canonicalLang: doc.lang,
  });
}

export default async function BlogPost({ params }: Props) {
  const { lang, slug } = (await params) as { lang: MarketingLang; slug: string };
  const doc = getDoc(lang, `blog/${slug}`);
  if (!doc) notFound();
  const t = MARKETING_TEXT[lang];
  const p = langPrefix(lang);
  const title = str(doc.meta.title);
  const related = listPosts(lang)
    .filter((x) => x.slug !== slug && x.meta.cluster === doc.meta.cluster)
    .concat(listPosts(lang).filter((x) => x.slug !== slug && x.meta.cluster !== doc.meta.cluster))
    .slice(0, 3);
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description: str(doc.meta.description),
          inLanguage: doc.lang,
          datePublished: str(doc.meta.date),
          dateModified: str(doc.meta.date),
          keywords: str(doc.meta.keywords),
          mainEntityOfPage: marketingUrl(doc.lang, `/blog/${slug}`),
          author: { '@type': 'Organization', name: 'StayDirect LK', url: marketingUrl('en') },
          publisher: { '@type': 'Organization', '@id': `${marketingOrigin()}/#org`, name: 'StayDirect LK' },
        }}
      />
      <article className="mx-auto max-w-3xl px-4 pt-8">
        <Breadcrumbs lang={lang} trail={[[t.nav.blog, '/blog'], [title, `/blog/${slug}`]]} />
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">
          <time dateTime={str(doc.meta.date)}>{str(doc.meta.date)}</time> · {fill(t.blog.minutes, { n: str(doc.meta.readingMinutes) })}
        </p>
        {doc.fallback && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">{t.blog.englishOnly}</p>}
        <div className="mt-6">
          <Prose html={doc.html} lang={doc.lang} />
        </div>
        <h2 className="mt-14 font-display text-2xl font-semibold">{t.blog.related}</h2>
        <ul className="mt-4 space-y-3">
          {related.map((r) => (
            <li key={r.slug}>
              <Link href={`${p}/blog/${r.slug}`} className="font-medium text-brand underline-offset-4 hover:underline">
                {str(r.meta.title)}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={`${p}/blog`} className="mt-6 inline-block text-sm text-muted hover:text-brand">
          ← {t.blog.back}
        </Link>
      </article>
      <CtaBand lang={lang} />
    </>
  );
}
