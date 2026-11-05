import Link from 'next/link';
import { SITE_CONTENT_BLOCKS, type SiteContentRow } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Check, Field, Section, TextArea } from '@/components/owner/fields';
import type { Translator } from '@/i18n/owner/t';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { siteOrigin } from '@/lib/seo';
import { isSiteLang, LANG_NAMES, SITE_LANGS, type SiteLang } from '@/lib/site-routing';
import {
  deleteSiteContentAction,
  generateSiteContentAction,
  saveSiteContentAction,
  saveVerificationAction,
  setSiteContentStatusAction,
} from '../../../actions-seo';

// One AI draft takes about a minute.
export const maxDuration = 300;

export async function generateMetadata() {
  return { title: (await getT())('local.metaTitle') };
}

interface SiteContentList {
  rows: SiteContentRow[];
  googleSiteVerification: string | null;
  ai: { enabled: boolean; configured: boolean; used: number; limit: number };
}

const BACKLINKS = ['drivers', 'surf', 'tours', 'food', 'wellness', 'blogs', 'association', 'events', 'tripadvisor', 'social'] as const;
const CHECKLIST = ['domain', 'searchConsole', 'sitemap', 'gbp', 'guide', 'reviews', 'backlinks'] as const;

/**
 * Setup → Google & local guide: the three local guide blocks and description translations per
 * language (draft → publish), an AI first draft, the Search Console code and the launch checklist.
 */
export default async function LocalGuidePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const property = await currentProperty();
  if (!property) return null;
  const pid = property.id;
  const q = (await searchParams).lang;
  const lang: SiteLang = isSiteLang(q) ? q : 'en';
  const [data, rooms, t] = await Promise.all([
    ownerApi<SiteContentList>(`/properties/${pid}/site-content`),
    ownerApi<OwnerRoom[]>(`/properties/${pid}/rooms`),
    getT(),
  ]);
  const byKey = new Map(data.rows.filter((r) => r.lang === lang).map((r) => [r.key, r]));
  const drafts = data.rows.filter((r) => r.lang === lang && r.status === 'draft').length;
  const live = data.rows.filter((r) => r.lang === lang && r.status === 'published').length;
  const origin = siteOrigin(property);
  const sitemap = `${origin}/sitemap.xml`;
  const gbp = `${origin}/?utm_source=google&utm_medium=organic&utm_campaign=gbp`;
  const langName = LANG_NAMES[lang];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t('local.intro')}</p>

      <nav aria-label={t('local.langTabs')} className="flex flex-wrap gap-2">
        {SITE_LANGS.map((l) => (
          <Link
            key={l}
            href={`/owner/setup/local?lang=${l}`}
            lang={l}
            aria-current={l === lang ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${l === lang ? 'border-brand bg-brand text-brand-fg' : 'border-line hover:bg-surface-2'}`}
          >
            {LANG_NAMES[l]}
          </Link>
        ))}
      </nav>

      <AiSection pid={pid} ai={data.ai} t={t} />

      <Section
        title={t('local.blocksTitle')}
        action={
          drafts > 0 ? (
            <ActionForm action={setSiteContentStatusAction.bind(null, pid, lang, 'published')} submitLabel={t('local.publishAll', { lang: langName })} variant="secondary" />
          ) : live > 0 ? (
            <ActionForm action={setSiteContentStatusAction.bind(null, pid, lang, 'draft')} submitLabel={t('local.unpublishAll', { lang: langName })} variant="secondary" />
          ) : null
        }
      >
        <div className="space-y-4">
          {SITE_CONTENT_BLOCKS.map((b) => (
            <ContentEditor key={b} pid={pid} lang={lang} contentKey={b} label={t(`local.blocks.${b}`)} hint={t(`local.blockHint.${b}`)} row={byKey.get(b)} t={t} />
          ))}
        </div>
      </Section>

      {lang !== 'en' && (
        <Section title={t('local.translationsTitle', { lang: langName })}>
          <p className="mb-4 text-sm text-muted">{t('local.translationsIntro', { lang: langName })}</p>
          <div className="space-y-4">
            <ContentEditor pid={pid} lang={lang} contentKey="description" label={t('local.description')} original={property.description} row={byKey.get('description')} t={t} />
            {rooms.map((r) => (
              <ContentEditor key={r.id} pid={pid} lang={lang} contentKey={`room:${r.id}`} label={t('local.room', { name: r.name })} original={r.description} row={byKey.get(`room:${r.id}`)} t={t} />
            ))}
          </div>
        </Section>
      )}

      <Section title={t('local.googleTitle')}>
        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">{t('local.siteUrl')}</dt>
          <dd className="flex flex-wrap items-center gap-2 break-all">
            <a href={origin} className="font-medium text-brand underline-offset-4 hover:underline" target="_blank" rel="noopener">
              {origin}
            </a>
          </dd>
          <dt className="text-muted">{t('local.sitemap')}</dt>
          <dd className="flex flex-wrap items-center gap-2 break-all">
            <span>{sitemap}</span> <CopyButton text={sitemap} />
          </dd>
          <dt className="text-muted">{t('local.gbpLink')}</dt>
          <dd className="flex flex-wrap items-center gap-2 break-all">
            <span>{gbp}</span> <CopyButton text={gbp} />
          </dd>
        </dl>

        <ActionForm action={saveVerificationAction.bind(null, pid)} submitLabel={t('local.verifySave')} className="mt-5">
          <Field label={t('local.verifyLabel')} name="code" defaultValue={data.googleSiteVerification ?? ''} hint={t('local.verifyHint')} autoComplete="off" spellCheck={false} />
        </ActionForm>
        {data.googleSiteVerification && (
          <ActionForm action={saveVerificationAction.bind(null, pid)} submitLabel={t('local.verifyRemove')} variant="secondary" className="mt-2">
            <input type="hidden" name="remove" value="1" />
          </ActionForm>
        )}

        <h3 className="mt-6 font-semibold">{t('local.checklistTitle')}</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
          {CHECKLIST.map((c) => (
            <li key={c}>{t(`local.checklist.${c}`, { site: origin.replace('https://', ''), sitemap })}</li>
          ))}
        </ol>

        <h3 className="mt-6 font-semibold">{t('local.backlinksTitle')}</h3>
        <p className="mt-1 text-sm text-muted">{t('local.backlinksIntro')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {BACKLINKS.map((b) => (
            <li key={b}>{t(`local.backlinks.${b}`)}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function AiSection({ pid, ai, t }: { pid: string; ai: SiteContentList['ai']; t: Translator }) {
  const note = !ai.configured ? t('local.aiNotConfigured') : !ai.enabled ? t('local.aiOff') : ai.used >= ai.limit ? t('local.aiLimit') : null;
  return (
    <Section title={t('local.aiTitle')}>
      <p className="mb-3 text-sm text-muted">{t('local.aiIntro')}</p>
      {note ? (
        <p className="rounded-xl bg-surface-2 p-3 text-sm">{note}</p>
      ) : (
        <ActionForm action={generateSiteContentAction.bind(null, pid)} submitLabel={t('local.aiButton')} pendingLabel={t('local.aiPending')}>
          <Check label={t('local.aiOverwrite')} name="overwrite" />
        </ActionForm>
      )}
      {ai.configured && <p className="mt-2 text-xs text-muted">{t('local.aiUsed', { used: Math.min(ai.used, ai.limit), limit: ai.limit })}</p>}
    </Section>
  );
}

function ContentEditor({
  pid,
  lang,
  contentKey,
  label,
  hint,
  original,
  row,
  t,
}: {
  pid: string;
  lang: SiteLang;
  contentKey: string;
  label: string;
  hint?: string;
  original?: string;
  row: SiteContentRow | undefined;
  t: Translator;
}) {
  const id = `c-${contentKey.replace(/[^a-z0-9]/gi, '-')}`;
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{label}</h3>
        {row ? (
          <>
            <span className={`pill ${row.status === 'published' ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn'}`}>{t(`local.status.${row.status}`)}</span>
            <span className="pill bg-surface-2 text-muted">{t(`local.source.${row.source}`)}</span>
          </>
        ) : (
          <span className="pill bg-surface-2 text-muted">{t('local.empty')}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {original && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted">{t('local.original')}</summary>
          <p className="mt-1 whitespace-pre-line text-muted">{original}</p>
        </details>
      )}
      <ActionForm action={saveSiteContentAction.bind(null, pid, contentKey, lang)} submitLabel={t('common.save')} className="mt-3">
        <TextArea label={label} name="body" id={id} rows={6} lang={lang} defaultValue={row?.body ?? ''} required maxLength={6000} className="[&_label]:sr-only" />
        <Check label={t('local.publishCheck')} name="publish" defaultChecked={row?.status === 'published'} />
      </ActionForm>
      {row && (
        <ActionForm action={deleteSiteContentAction.bind(null, pid, contentKey, lang)} submitLabel={t('local.remove')} variant="danger" confirm={t('local.removeConfirm')} className="mt-2" />
      )}
    </div>
  );
}
