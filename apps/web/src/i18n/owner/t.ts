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

/*
 * Sinhala months by hand: ICU's si locale prints the traditional names (දුරුතු, නවම්, … ඉල්), which are
 * also the Poya names. Next to Poya markers that misleads, and Sri Lankan business and banking use the
 * modern names. Same names as the Flutter app (intl's si locale).
 */
const SI_MONTHS = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'];
const SI_MONTHS_SHORT = ['ජන', 'පෙබ', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'];

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
  /** November 2026 (long) or Nov (short) */
  month(iso: string, style?: 'long' | 'short'): string;
  lang: OwnerLang;
  locale: string;
}

const cache = new Map<OwnerLang, Translator>();

export function makeT(lang: OwnerLang): Translator {
  const hit = cache.get(lang);
  if (hit) return hit;
  const dict = DICTS[lang];
  const locale = LOCALE[lang];
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Colombo' });
  const colomboDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' });
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const enMonth = { long: new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }), short: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }) };
  const monthName = (d: Date, style: 'long' | 'short') =>
    lang === 'si' ? (style === 'long' ? SI_MONTHS : SI_MONTHS_SHORT)[d.getUTCMonth()]! : enMonth[style].format(d);
  // "14 Dec 2026" in both languages (day, month, year; Western digits).
  const fmtDay = (d: Date, year: boolean) => `${d.getUTCDate()} ${monthName(d, 'short')}${year ? ` ${d.getUTCFullYear()}` : ''}`;

  const t = ((key: OwnerKey, vars?: Vars) => fill(lookup(dict, key) ?? lookup(en, key) ?? key, vars)) as Translator;
  t.n = (key, n, vars) => t(`${key}_${n === 1 ? 'one' : 'other'}` as OwnerKey, { n, ...vars });
  t.date = (iso) => (iso ? fmtDay(day(iso), true) : '—');
  t.short = (iso) => fmtDay(day(iso), false);
  t.dateTime = (iso) => (iso ? `${fmtDay(day(colomboDay.format(new Date(iso))), true)}, ${timeFmt.format(new Date(iso))}` : '—');
  t.weekday = (iso) => weekdayFmt.format(day(iso));
  t.month = (iso, style = 'long') => {
    const d = day(iso.length === 7 ? `${iso}-01` : iso);
    return style === 'long' ? `${monthName(d, 'long')} ${d.getUTCFullYear()}` : monthName(d, 'short');
  };
  t.lang = lang;
  t.locale = locale;
  cache.set(lang, t);
  return t;
}
