/*
 * Owner app translations (English, Sinhala). Shared by server and client code: no server-only imports.
 *
 *   t('today.arriving', { n: 2 })     → "2 arriving" / "2 ක් පැමිණේ"
 *   t.n('bookings.nights', 3)         → picks bookings.nights_one / bookings.nights_other, with {n}
 *   t.date('2026-12-14')              → "14 Dec 2026" / Sinhala month names
 *
 * Every key exists in en/ (the source); si/ files are typed against en/, so a missing Sinhala string
 * fails the typecheck. Terms follow GLOSSARY.md.
 */
import { en } from './en';
import { si } from './si';

export const OWNER_LANGS = ['en', 'si'] as const;
export type OwnerLang = (typeof OWNER_LANGS)[number];

export function isOwnerLang(v: unknown): v is OwnerLang {
  return v === 'en' || v === 'si';
}

/** Same shape as T with every leaf a string (what si/ files must provide). */
export type Dict<T> = { [K in keyof T]: T[K] extends string ? string : Dict<T[K]> };

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type OwnerKey = Leaves<typeof en>;
/** Keys that come in _one / _other pairs, named without the suffix. */
export type OwnerCountKey = OwnerKey extends infer K ? (K extends `${infer B}_one` ? B : never) : never;

type Vars = Record<string, string | number>;

const DICTS: Record<OwnerLang, Dict<typeof en>> = { en, si };
const LOCALE: Record<OwnerLang, string> = { en: 'en-GB', si: 'si-LK' };

function lookup(dict: unknown, key: string): string | undefined {
  let cur = dict;
  for (const part of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function fill(template: string, vars?: Vars): string {
  return vars ? template.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : String(vars[k]))) : template;
}

export interface Translator {
  (key: OwnerKey, vars?: Vars): string;
  /** Count form: `${key}_one` for 1, `${key}_other` otherwise; {n} is filled in. */
  n(key: OwnerCountKey, n: number, vars?: Vars): string;
  /** 14 Dec 2026 */
  date(iso: string | null | undefined): string;
  /** 14 Dec */
  short(iso: string): string;
  /** 14 Dec 2026, 09:30 */
  dateTime(iso: string | null | undefined): string;
  /** Monday */
  weekday(iso: string): string;
  lang: OwnerLang;
  locale: string;
}

const cache = new Map<OwnerLang, Translator>();

export function makeT(lang: OwnerLang): Translator {
  const hit = cache.get(lang);
  if (hit) return hit;
  const dict = DICTS[lang];
  const locale = LOCALE[lang];
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const shortFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const dtFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' });
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

  const t = ((key: OwnerKey, vars?: Vars) => fill(lookup(dict, key) ?? lookup(en, key) ?? key, vars)) as Translator;
  t.n = (key, n, vars) => t(`${key}_${n === 1 ? 'one' : 'other'}` as OwnerKey, { n, ...vars });
  t.date = (iso) => (iso ? dateFmt.format(day(iso)) : '—');
  t.short = (iso) => shortFmt.format(day(iso));
  t.dateTime = (iso) => (iso ? dtFmt.format(new Date(iso)) : '—');
  t.weekday = (iso) => weekdayFmt.format(day(iso));
  t.lang = lang;
  t.locale = locale;
  cache.set(lang, t);
  return t;
}
