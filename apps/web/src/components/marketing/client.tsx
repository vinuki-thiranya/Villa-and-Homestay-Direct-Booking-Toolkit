'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import { Languages } from 'lucide-react';
import { LANG_CODES, LANG_NAMES, MARKETING_LANGS, switchLangPath, type MarketingLang } from '@/lib/site-routing';
import type { MarketingText } from '@/i18n/marketing';

const noop = () => () => {};
const SYSTEM_FONT = { fontFamily: 'system-ui, sans-serif' } as const;

/** English / සිංහල: a link to this page in the other language (staydirect.lk/… ↔ staydirect.lk/si/…). */
export function MarketingLangSwitch({ lang, label }: { lang: MarketingLang; label: string }) {
  const path = useSyncExternalStore(noop, () => window.location.pathname, () => null);
  const other: MarketingLang = MARKETING_LANGS.find((l) => l !== lang)!;
  const href = path ? switchLangPath(path, '', other) : other === 'en' ? '/' : `/${other}`;
  return (
    <a
      href={href}
      hrefLang={other}
      lang={other}
      className="flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface-2"
      title={`${label}: ${LANG_NAMES[other]}`}
    >
      <Languages aria-hidden className="h-4 w-4" />
      <span style={SYSTEM_FONT}>{LANG_CODES[other]}</span>
      <span className="sr-only" style={SYSTEM_FONT}>
        {' '}
        {LANG_NAMES[other]}
      </span>
    </a>
  );
}

const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString('en-US')}`;

/** What an owner keeps on direct nights: OTA commission vs card fee + our 2.5% percentage plan. */
export function CommissionCalculator({ t }: { t: MarketingText['pricing'] }) {
  const id = useId();
  const [rate, setRate] = useState(18000);
  const [nights, setNights] = useState(30);
  const [commission, setCommission] = useState(15);
  const [card, setCard] = useState(3.3);
  const revenue = rate * nights;
  const ota = (revenue * commission) / 100;
  const direct = (revenue * (card + 2.5)) / 100;
  const keep = Math.max(0, ota - direct);
  const field = (key: string, label: string, value: number, set: (n: number) => void, step: number, max: number) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="label">
        {label}
      </label>
      <input
        id={`${id}-${key}`}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
        className="field tabular-nums"
      />
    </div>
  );
  return (
    <div className="card p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {field('rate', t.rate, rate, setRate, 500, 1_000_000)}
        {field('nights', t.nights, nights, setNights, 1, 1000)}
        {field('commission', t.commission, commission, setCommission, 0.5, 40)}
        {field('card', t.cardFee, card, setCard, 0.1, 10)}
      </div>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3" aria-live="polite">
        <div className="rounded-xl bg-surface-2 p-4">
          <dt className="text-muted">{t.otaCost}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{lkr(ota)}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-4">
          <dt className="text-muted">{t.directCost}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{lkr(direct)}</dd>
        </div>
        <div className="rounded-xl bg-brand p-4 text-brand-fg">
          <dt className="opacity-90">{t.keep}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {lkr(keep)} <span className="text-sm font-normal opacity-90">{t.perMonthShort}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted">{t.note}</p>
    </div>
  );
}
