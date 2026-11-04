import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
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

export const metadata = { title: 'Concierge setup' };

const LANG_OPTIONS = Object.entries(LANGUAGE_LABEL) as [string, string][];
const CHANNELS: [string, string][] = [
  ['auto', 'WhatsApp, email if no phone'],
  ['whatsapp', 'WhatsApp only'],
  ['email', 'Email only'],
];

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

  return (
    <div className="space-y-5">
      <Section title="AI concierge on WhatsApp">
        <p className="mb-4 text-sm text-muted">
          The concierge answers guests from your house guide and knowledge base, checks availability and prices, and sends booking links. It never
          confirms a booking — only a paid deposit does. Complaints, refunds, changes and anything it is unsure about are handed to you in the
          inbox.
        </p>
        <ActionForm action={saveConciergeAction.bind(null, pid)} submitLabel="Save">
          <Check label="Let the AI concierge answer guests" name="conciergeEnabled" defaultChecked={s.conciergeEnabled} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="WhatsApp phone number ID"
              name="whatsappPhoneNumberId"
              defaultValue={s.whatsappPhoneNumberId ?? ''}
              hint="From Meta's WhatsApp Manager. Leave empty to use the StayDirect number."
            />
            <Field label="Google review link" name="googleReviewUrl" type="url" defaultValue={s.googleReviewUrl ?? ''} hint="Happy guests are sent here." />
            <Field
              label="Repeat-guest discount (%)"
              name="repeatGuestDiscountPct"
              type="number"
              min={0}
              max={50}
              step="0.5"
              defaultValue={s.repeatGuestDiscountPct}
              hint="Code sent 11 months after a stay. 0 = off."
            />
          </div>
        </ActionForm>
        <p className="mt-4 text-sm text-muted">
          This month ({s.aiUsage.month}): {s.aiUsage.requests} AI replies · {money(Number(s.aiUsage.costUsd), 'USD')} of the monthly budget.
        </p>
      </Section>

      <Section title="House guide" action={<CopyButton text={s.guideUrl} label="Copy guide link" />}>
        <p className="mb-4 text-sm text-muted">
          Sent to guests on arrival day and used by the concierge. Guests open it from a private link:{' '}
          <a href={s.guideUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline-offset-2 hover:underline">
            {s.guideUrl}
          </a>
        </p>
        <ActionForm action={saveGuideAction.bind(null, pid)} submitLabel="Save house guide">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Wi-Fi network" name="wifiName" defaultValue={g.wifiName} />
            <Field label="Wi-Fi password" name="wifiPassword" defaultValue={g.wifiPassword} />
          </div>
          <TextArea label="Arrival instructions" name="arrival" defaultValue={g.arrival} rows={3} />
          <TextArea label="House rules" name="rules" defaultValue={g.rules} rows={3} />
          <TextArea label="Check-out notes" name="checkoutNotes" defaultValue={g.checkoutNotes} rows={2} />
          <TextArea
            label="Emergency numbers"
            name="emergency"
            rows={4}
            defaultValue={g.emergency.map((e) => `${e.label} | ${e.phone}`).join('\n')}
            hint="One per line: Label | phone"
          />
          <TextArea
            label="Places nearby"
            name="places"
            rows={5}
            defaultValue={g.places.map((p) => [p.name, p.kind, p.note, p.mapsUrl ?? ''].join(' | ')).join('\n')}
            hint={`One per line: Name | kind | note | Google Maps link (optional). Kinds: ${PLACE_KINDS.join(', ')}`}
          />
        </ActionForm>
      </Section>

      <Section title={`Knowledge base (${knowledge.length})`}>
        <p className="mb-3 text-sm text-muted">Facts the concierge may use: breakfast, transfers, pets, laundry, surf boards… Write them as you would tell a guest.</p>
        <div className="space-y-3">
          {knowledge.map((k) => (
            <details key={k.id} className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer font-medium">
                {k.title} <span className="text-sm font-normal text-muted">· {LANGUAGE_LABEL[k.language] ?? k.language}</span>
              </summary>
              <div className="mt-3 space-y-3">
                <ActionForm action={saveKnowledgeAction.bind(null, pid, k.id)} submitLabel="Save">
                  <KnowledgeFields entry={k} idPrefix={k.id} />
                </ActionForm>
                <ActionForm action={deleteKnowledgeAction.bind(null, k.id)} submitLabel="Delete" variant="danger" confirm={`Delete "${k.title}"?`} />
              </div>
            </details>
          ))}
          <details className="rounded-xl border border-dashed border-line p-3">
            <summary className="cursor-pointer font-medium text-brand">Add an entry</summary>
            <div className="mt-3">
              <ActionForm action={saveKnowledgeAction.bind(null, pid, null)} submitLabel="Add">
                <KnowledgeFields idPrefix="new" />
              </ActionForm>
            </div>
          </details>
        </div>
      </Section>

      <Section title="Quick replies" action={<ActionForm action={loadQuickRepliesAction.bind(null, pid)} submitLabel="Load 30 defaults" variant="secondary" inline />}>
        <nav aria-label="Language" className="mb-3 flex gap-2 overflow-x-auto">
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
          <Empty>No quick replies in {LANGUAGE_LABEL[lang] ?? lang} yet. “Load 30 defaults” adds the most common guest questions in all four languages.</Empty>
        ) : (
          <ul className="space-y-2">
            {replies.map((q) => (
              <li key={q.id}>
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer">
                    <span className="font-medium">{q.title}</span> <span className="text-sm text-muted">· {q.topic}</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={saveQuickReplyAction.bind(null, pid)} submitLabel="Save">
                      <QuickReplyFields reply={q} idPrefix={q.id} />
                    </ActionForm>
                    <ActionForm action={deleteQuickReplyAction.bind(null, q.id)} submitLabel="Delete" variant="danger" confirm="Delete this quick reply?" />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">Add a quick reply</summary>
          <div className="mt-3">
            <ActionForm action={saveQuickReplyAction.bind(null, pid)} submitLabel="Add">
              <QuickReplyFields idPrefix="new-qr" language={lang} />
            </ActionForm>
          </div>
        </details>
      </Section>

      <Section title="Automated messages">
        <p className="mb-3 text-sm text-muted">Sent between 8 am and 9 pm property time, in the guest&apos;s language. Each one goes out once per booking.</p>
        <ul className="divide-y divide-line">
          {sequences.map((seq) => (
            <li key={seq.trigger} className="py-3">
              <ActionForm action={saveSequenceAction.bind(null, pid, seq.trigger)} submitLabel="Save" variant="secondary" inline>
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{TRIGGER_LABEL[seq.trigger]?.title ?? seq.trigger}</p>
                  <p className="text-sm text-muted">{TRIGGER_LABEL[seq.trigger]?.when}</p>
                </div>
                <Check label="On" name="enabled" defaultChecked={seq.enabled} />
                <label htmlFor={`ch-${seq.trigger}`} className="sr-only">
                  Channel
                </label>
                <select id={`ch-${seq.trigger}`} name="channel" defaultValue={seq.channel} className="field w-auto min-w-52">
                  {CHANNELS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </ActionForm>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function KnowledgeFields({ entry, idPrefix }: { entry?: KnowledgeEntry; idPrefix: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field label="Title" name="title" id={`${idPrefix}-title`} required minLength={2} defaultValue={entry?.title} />
        <Select label="Language" name="language" id={`${idPrefix}-lang`} options={LANG_OPTIONS} defaultValue={entry?.language ?? 'en'} />
      </div>
      <TextArea label="What guests should know" name="body" id={`${idPrefix}-body`} required minLength={2} rows={4} defaultValue={entry?.body} />
    </>
  );
}

function QuickReplyFields({ reply, idPrefix, language }: { reply?: QuickReply; idPrefix: string; language?: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Title" name="title" id={`${idPrefix}-title`} required defaultValue={reply?.title} />
        <Field label="Topic key" name="topic" id={`${idPrefix}-topic`} required pattern="[a-z0-9_]+" defaultValue={reply?.topic} hint="e.g. wifi, breakfast" />
        <Select label="Language" name="language" id={`${idPrefix}-lang`} options={LANG_OPTIONS} defaultValue={reply?.language ?? language ?? 'en'} />
      </div>
      <TextArea label="Message" name="body" id={`${idPrefix}-body`} required rows={3} defaultValue={reply?.body} />
      <input type="hidden" name="sortOrder" value={reply?.sortOrder ?? 0} />
    </>
  );
}
