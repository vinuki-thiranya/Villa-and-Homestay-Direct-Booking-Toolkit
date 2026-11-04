import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import type { OwnerKey, Translator } from '@/i18n/owner/t';
import { money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import {
  LANGUAGE_LABEL,
  PLACE_KINDS,
  TRIGGER_LABEL,
  type ConciergeSettings,
  type KnowledgeEntry,
  type QuickReply,
  type SequenceSetting,
} from '@/lib/owner-types';
import {
  deleteKnowledgeAction,
  deleteQuickReplyAction,
  loadQuickRepliesAction,
  saveConciergeAction,
  saveGuideAction,
  saveKnowledgeAction,
  saveQuickReplyAction,
  saveSequenceAction,
} from '../../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('setup.concierge.metaTitle') };
}

const LANG_OPTIONS = Object.entries(LANGUAGE_LABEL) as [string, string][];
const CHANNELS = [
  ['auto', 'channelAuto'],
  ['whatsapp', 'channelWhatsapp'],
  ['email', 'channelEmail'],
] as const;

/** Translated trigger title and timing, falling back to the English labels for unknown triggers. */
function triggerText(t: Translator, trigger: string): { title: string; when: string } {
  const key = `setup.concierge.trigger.${trigger}` as OwnerKey;
  const title = t(key);
  if (title === key) return { title: TRIGGER_LABEL[trigger]?.title ?? trigger, when: TRIGGER_LABEL[trigger]?.when ?? '' };
  return { title, when: t(`${key}_when` as OwnerKey) };
}

export default async function ConciergeSetupPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const property = await currentProperty();
  if (!property) return null;
  const { lang = 'en' } = await searchParams;
  const pid = property.id;
  const [s, knowledge, replies, sequences] = await Promise.all([
    ownerApi<ConciergeSettings>(`/properties/${pid}/concierge`),
    ownerApi<KnowledgeEntry[]>(`/properties/${pid}/knowledge`),
    ownerApi<QuickReply[]>(`/properties/${pid}/quick-replies?language=${encodeURIComponent(lang)}`),
    ownerApi<SequenceSetting[]>(`/properties/${pid}/sequences`),
  ]);
  const g = s.guide;
  const t = await getT();

  return (
    <div className="space-y-5">
      <Section title={t('setup.concierge.aiTitle')}>
        <p className="mb-4 text-sm text-muted">{t('setup.concierge.aiIntro')}</p>
        <ActionForm action={saveConciergeAction.bind(null, pid)} submitLabel={t('common.save')}>
          <Check label={t('setup.concierge.enable')} name="conciergeEnabled" defaultChecked={s.conciergeEnabled} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label={t('setup.concierge.phoneId')}
              name="whatsappPhoneNumberId"
              defaultValue={s.whatsappPhoneNumberId ?? ''}
              hint={t('setup.concierge.phoneIdHint')}
            />
            <Field
              label={t('setup.concierge.googleReview')}
              name="googleReviewUrl"
              type="url"
              defaultValue={s.googleReviewUrl ?? ''}
              hint={t('setup.concierge.googleReviewHint')}
            />
            <Field
              label={t('setup.concierge.repeatDiscount')}
              name="repeatGuestDiscountPct"
              type="number"
              min={0}
              max={50}
              step="0.5"
              defaultValue={s.repeatGuestDiscountPct}
              hint={t('setup.concierge.repeatDiscountHint')}
            />
          </div>
        </ActionForm>
        <p className="mt-4 text-sm text-muted">
          {t('setup.concierge.usage', { month: s.aiUsage.month, requests: s.aiUsage.requests, cost: money(Number(s.aiUsage.costUsd), 'USD') })}
        </p>
      </Section>

      <Section title={t('setup.concierge.guideTitle')} action={<CopyButton text={s.guideUrl} label={t('setup.concierge.copyGuide')} />}>
        <p className="mb-4 text-sm text-muted">
          {t('setup.concierge.guideIntro')}{' '}
          <a href={s.guideUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline-offset-2 hover:underline">
            {s.guideUrl}
          </a>
        </p>
        <ActionForm action={saveGuideAction.bind(null, pid)} submitLabel={t('setup.concierge.saveGuide')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('setup.concierge.wifiName')} name="wifiName" defaultValue={g.wifiName} />
            <Field label={t('setup.concierge.wifiPassword')} name="wifiPassword" defaultValue={g.wifiPassword} />
          </div>
          <TextArea label={t('setup.concierge.arrival')} name="arrival" defaultValue={g.arrival} rows={3} />
          <TextArea label={t('setup.concierge.rules')} name="rules" defaultValue={g.rules} rows={3} />
          <TextArea label={t('setup.concierge.checkout')} name="checkoutNotes" defaultValue={g.checkoutNotes} rows={2} />
          <TextArea
            label={t('setup.concierge.emergency')}
            name="emergency"
            rows={4}
            defaultValue={g.emergency.map((e) => `${e.label} | ${e.phone}`).join('\n')}
            hint={t('setup.concierge.emergencyHint')}
          />
          <TextArea
            label={t('setup.concierge.places')}
            name="places"
            rows={5}
            defaultValue={g.places.map((p) => [p.name, p.kind, p.note, p.mapsUrl ?? ''].join(' | ')).join('\n')}
            hint={t('setup.concierge.placesHint', { kinds: PLACE_KINDS.join(', ') })}
          />
        </ActionForm>
      </Section>

      <Section title={t('setup.concierge.knowledgeTitle', { n: knowledge.length })}>
        <p className="mb-3 text-sm text-muted">{t('setup.concierge.knowledgeIntro')}</p>
        <div className="space-y-3">
          {knowledge.map((k) => (
            <details key={k.id} className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer font-medium">
                {k.title} <span className="text-sm font-normal text-muted">· {LANGUAGE_LABEL[k.language] ?? k.language}</span>
              </summary>
              <div className="mt-3 space-y-3">
                <ActionForm action={saveKnowledgeAction.bind(null, pid, k.id)} submitLabel={t('common.save')}>
                  <KnowledgeFields entry={k} idPrefix={k.id} t={t} />
                </ActionForm>
                <ActionForm
                  action={deleteKnowledgeAction.bind(null, k.id)}
                  submitLabel={t('common.delete')}
                  variant="danger"
                  confirm={t('setup.concierge.deleteConfirm', { title: k.title })}
                />
              </div>
            </details>
          ))}
          <details className="rounded-xl border border-dashed border-line p-3">
            <summary className="cursor-pointer font-medium text-brand">{t('setup.concierge.addEntry')}</summary>
            <div className="mt-3">
              <ActionForm action={saveKnowledgeAction.bind(null, pid, null)} submitLabel={t('common.add')}>
                <KnowledgeFields idPrefix="new" t={t} />
              </ActionForm>
            </div>
          </details>
        </div>
      </Section>

      <Section
        title={t('setup.concierge.quickTitle')}
        action={<ActionForm action={loadQuickRepliesAction.bind(null, pid)} submitLabel={t('setup.concierge.loadDefaults')} variant="secondary" inline />}
      >
        <nav aria-label={t('setup.concierge.language')} className="mb-3 flex gap-2 overflow-x-auto">
          {LANG_OPTIONS.map(([code, label]) => (
            <Link
              key={code}
              href={`/owner/setup/concierge?lang=${code}`}
              aria-current={lang === code ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${lang === code ? 'bg-brand text-brand-fg' : 'border border-line text-muted hover:bg-surface-2'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {replies.length === 0 ? (
          <Empty>{t('setup.concierge.quickEmpty', { lang: LANGUAGE_LABEL[lang] ?? lang })}</Empty>
        ) : (
          <ul className="space-y-2">
            {replies.map((q) => (
              <li key={q.id}>
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer">
                    <span className="font-medium">{q.title}</span> <span className="text-sm text-muted">· {q.topic}</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={saveQuickReplyAction.bind(null, pid)} submitLabel={t('common.save')}>
                      <QuickReplyFields reply={q} idPrefix={q.id} t={t} />
                    </ActionForm>
                    <ActionForm
                      action={deleteQuickReplyAction.bind(null, q.id)}
                      submitLabel={t('common.delete')}
                      variant="danger"
                      confirm={t('setup.concierge.deleteQuickConfirm')}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">{t('setup.concierge.addQuick')}</summary>
          <div className="mt-3">
            <ActionForm action={saveQuickReplyAction.bind(null, pid)} submitLabel={t('common.add')}>
              <QuickReplyFields idPrefix="new-qr" language={lang} t={t} />
            </ActionForm>
          </div>
        </details>
      </Section>

      <Section title={t('setup.concierge.autoTitle')}>
        <p className="mb-3 text-sm text-muted">{t('setup.concierge.autoIntro')}</p>
        <ul className="divide-y divide-line">
          {sequences.map((seq) => {
            const text = triggerText(t, seq.trigger);
            return (
            <li key={seq.trigger} className="py-3">
              <ActionForm action={saveSequenceAction.bind(null, pid, seq.trigger)} submitLabel={t('common.save')} variant="secondary" inline className="w-full">
                <div className="min-w-0 basis-full sm:min-w-48 sm:flex-1 sm:basis-auto">
                  <p className="font-medium">{text.title}</p>
                  <p className="text-sm text-muted">{text.when}</p>
                </div>
                <Check label={t('setup.concierge.on')} name="enabled" defaultChecked={seq.enabled} />
                <label htmlFor={`ch-${seq.trigger}`} className="sr-only">
                  {t('setup.concierge.channel')}
                </label>
                <select id={`ch-${seq.trigger}`} name="channel" defaultValue={seq.channel} className="field w-full max-w-full sm:w-auto sm:min-w-52">
                  {CHANNELS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {t(`setup.concierge.${l}`)}
                    </option>
                  ))}
                </select>
              </ActionForm>
            </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

function KnowledgeFields({ entry, idPrefix, t }: { entry?: KnowledgeEntry; idPrefix: string; t: Translator }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field label={t('setup.concierge.title')} name="title" id={`${idPrefix}-title`} required minLength={2} defaultValue={entry?.title} />
        <Select label={t('setup.concierge.language')} name="language" id={`${idPrefix}-lang`} options={LANG_OPTIONS} defaultValue={entry?.language ?? 'en'} />
      </div>
      <TextArea label={t('setup.concierge.knowledgeBody')} name="body" id={`${idPrefix}-body`} required minLength={2} rows={4} defaultValue={entry?.body} />
    </>
  );
}

function QuickReplyFields({ reply, idPrefix, language, t }: { reply?: QuickReply; idPrefix: string; language?: string; t: Translator }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('setup.concierge.title')} name="title" id={`${idPrefix}-title`} required defaultValue={reply?.title} />
        <Field
          label={t('setup.concierge.topic')}
          name="topic"
          id={`${idPrefix}-topic`}
          required
          pattern="[a-z0-9_]+"
          defaultValue={reply?.topic}
          hint={t('setup.concierge.topicHint')}
        />
        <Select label={t('setup.concierge.language')} name="language" id={`${idPrefix}-lang`} options={LANG_OPTIONS} defaultValue={reply?.language ?? language ?? 'en'} />
      </div>
      <TextArea label={t('setup.concierge.message')} name="body" id={`${idPrefix}-body`} required rows={3} defaultValue={reply?.body} />
      <input type="hidden" name="sortOrder" value={reply?.sortOrder ?? 0} />
    </>
  );
}
