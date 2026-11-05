/*
 * The guest-site translator without any dictionary: t('book.title'), t.n('common.nights', 3),
 * t.date(iso). Server code gets it with every language from ./t.ts (makeGuestT); client components
 * get it from <GuestI18nProvider>, which receives only the page's own dictionary.
 */
import type { en } from './en';
import type { Dict } from '../owner/t';
import type { SiteLang } from '@/lib/site-routing';

export type GuestLang = SiteLang;
export type GuestDict = Dict<typeof en>;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type GuestKey = Leaves<typeof en>;
/** Keys that come in _one / _other pairs, named without the suffix. */
export type GuestCountKey = GuestKey extends infer K ? (K extends `${infer B}_one` ? B : never) : never;

type Vars = Record<string, string | number>;

const LOCALE: Record<GuestLang, string> = { en: 'en-GB', si: 'si-LK', de: 'de-DE', fr: 'fr-FR', hi: 'hi-IN' };

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

export interface GuestTranslator {
  (key: GuestKey, vars?: Vars): string;
  /** Count form: `${key}_one` for 1, `${key}_other` otherwise; {n} is filled in. */
  n(key: GuestCountKey, n: number, vars?: Vars): string;
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
  lang: GuestLang;
  locale: string;
}

/** A translator over one language's dictionary. Holds no dictionaries itself, so client bundles stay small. */
export function makeTranslator(lang: GuestLang, dict: GuestDict): GuestTranslator {
  const locale = LOCALE[lang];
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Colombo' });
  const colomboDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' });
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const months = { long: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }), short: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }) };
  const monthName = (d: Date, style: 'long' | 'short') =>
    lang === 'si' ? (style === 'long' ? SI_MONTHS : SI_MONTHS_SHORT)[d.getUTCMonth()]! : months[style].format(d);
  // "14 Dec 2026" (en, si); each language's own short date elsewhere ("14. Dez. 2026"). Western digits.
  const dayFmt = {
    year: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC', numberingSystem: 'latn' }),
    noYear: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC', numberingSystem: 'latn' }),
  };
  const fmtDay = (d: Date, year: boolean) =>
    lang === 'en' || lang === 'si' ? `${d.getUTCDate()} ${monthName(d, 'short')}${year ? ` ${d.getUTCFullYear()}` : ''}` : dayFmt[year ? 'year' : 'noYear'].format(d);

  const t = ((key: GuestKey, vars?: Vars) => fill(lookup(dict, key) ?? key, vars)) as GuestTranslator;
  t.n = (key, n, vars) => t(`${key}_${n === 1 ? 'one' : 'other'}` as GuestKey, { n, ...vars });
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
  return t;
}
