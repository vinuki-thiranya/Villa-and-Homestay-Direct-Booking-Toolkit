import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, CtaBand } from '@/components/marketing/parts';
import { fill, MARKETING_TEXT } from '@/i18n/marketing';
import { listPosts, str } from '@/lib/marketing';
import { marketingMeta } from '@/lib/marketing-seo';
import { langPrefix, type MarketingLang } from '@/lib/site-routing';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = (await params).lang as MarketingLang;
  const t = MARKETING_TEXT[lang].blog;
  return marketingMeta(lang, '/blog', { title: t.metaTitle, description: t.metaDescription });
}

export default async function BlogIndex({ params }: Props) {
  const lang = (await params).lang as MarketingLang;
  const t = MARKETING_TEXT[lang];
  const posts = listPosts(lang);
  return (
    <>
      <section className="mx-auto max-w-4xl px-4 pt-8">
        <Breadcrumbs lang={lang} trail={[[t.nav.blog, '/blog']]} />
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t.blog.h1}</h1>
        <p className="mt-3 text-lg text-muted">{t.blog.lede}</p>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <li key={post.slug} className="py-6">
              <h2 className="font-display text-2xl font-semibold leading-snug">
                <Link href={`${langPrefix(lang)}/blog/${post.slug}`} className="hover:text-brand">
                  {str(post.meta.title)}
                </Link>
              </h2>
              <p className="mt-2 text-muted">{str(post.meta.description)}</p>
              <p className="mt-2 text-sm text-muted">
                <time dateTime={str(post.meta.date)}>{str(post.meta.date)}</time> · {fill(t.blog.minutes, { n: str(post.meta.readingMinutes) })}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <CtaBand lang={lang} />
    </>
  );
}
