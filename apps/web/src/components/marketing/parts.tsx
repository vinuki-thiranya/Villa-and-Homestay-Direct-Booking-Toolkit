import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLAN_PRICING, PLANS } from '@staydirect/shared';
import { JsonLd } from '@/components/JsonLd';
import { fill, MARKETING_TEXT } from '@/i18n/marketing';
import type { Doc } from '@/lib/marketing';
import { marketingUrl } from '@/lib/marketing-seo';
import { langPrefix, type MarketingLang } from '@/lib/site-routing';

const PLAN_NAMES: Record<(typeof PLANS)[number], string> = { basic: 'Basic', pro: 'Pro', pro_multi: 'Pro Multi', manager: 'Manager' };

/** The four plans from shared PLAN_PRICING (spec §8), so the site never disagrees with billing. */
export function PlansGrid({ lang }: { lang: MarketingLang }) {
  const t = MARKETING_TEXT[lang].plans;
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((key) => {
        const p = PLAN_PRICING[key];
        const [who, ...items] = t[key];
        const featured = key === 'pro';
        return (
          <div key={key} className={`card flex flex-col p-6 ${featured ? 'border-brand ring-2 ring-brand/20' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{PLAN_NAMES[key]}</h3>
              {featured && <span className="pill bg-brand/10 text-brand">{t.popular}</span>}
            </div>
            <p className="mt-3">
              <span className="text-3xl font-semibold tabular-nums">LKR {p.flat.toLocaleString('en-US')}</span>
              <span className="text-sm text-muted"> {t.perMonth}</span>
            </p>
            {p.extraPropertyFee > 0 && (
              <p className="text-sm text-muted">{fill(key === 'manager' ? t.extraManaged : t.extra, { fee: p.extraPropertyFee.toLocaleString('en-US') })}</p>
            )}
            <p className="mt-1 text-sm text-muted">{fill(t.orPct, { pct: p.pct })}</p>
            <p className="mt-4 text-sm font-medium">{who}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              {items.map((i) => (
                <li key={i} className="flex gap-2">
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {i}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function CtaBand({ lang }: { lang: MarketingLang }) {
  const t = MARKETING_TEXT[lang].cta;
  return (
    <section className="mx-auto mt-16 max-w-6xl px-4">
      <div className="flex flex-col items-start gap-4 rounded-card bg-brand p-8 text-brand-fg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">{t.title}</h2>
          <p className="mt-1 opacity-90">{t.body}</p>
        </div>
        <a href="/owner/login" className="btn bg-surface text-fg hover:bg-surface-2">
          {t.button}
        </a>
      </div>
    </section>
  );
}

/** Markdown rendered at build time from our own content files (lib/marketing.ts). */
export function Prose({ html, lang }: { html: string; lang: MarketingLang }) {
  return <div className="m-prose" lang={lang} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Breadcrumbs({ lang, trail }: { lang: MarketingLang; trail: [string, string][] }) {
  const all: [string, string][] = [['StayDirect LK', ''], ...trail];
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: all.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: marketingUrl(lang, path) })),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-1">
          {all.slice(0, -1).map(([name, path]) => (
            <li key={path} className="after:ml-1 after:content-['/']">
              <Link href={`${langPrefix(lang)}${path}` || '/'} className="hover:text-brand">
                {name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

/** A long-form page from a Markdown file: heading, optional notice, the text, then the call to action. */
export function DocArticle({ doc, lang, notice, trail }: { doc: Doc; lang: MarketingLang; notice?: string; trail: [string, string][] }) {
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 pt-8">
        <Breadcrumbs lang={lang} trail={trail} />
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">{String(doc.meta.h1 ?? doc.meta.title)}</h1>
        {notice && <p className="mt-4 rounded-xl border border-warn/40 bg-warn-bg p-3 text-sm font-medium text-fg">{notice}</p>}
        <div className="mt-6">
          <Prose html={doc.html} lang={doc.lang} />
        </div>
      </article>
      <CtaBand lang={lang} />
    </>
  );
}
