/** Guest-facing copy shared by the book and booking pages (kept out of @staydirect/shared runtime to keep zod off the client). */
import type { GuestKey, GuestLang, GuestTranslator } from '@/i18n/guest/t';

const POLICIES = ['flexible', 'moderate', 'strict'] as const;
const VIOLATIONS = ['min_nights', 'max_nights', 'max_guests', 'closed_to_arrival', 'closed_to_departure', 'in_the_past', 'invalid_dates', 'unavailable'] as const;

/** The cancellation policy in the guest's language (the API's policy text is English only). */
export function policyText(t: GuestTranslator, policy: string): string {
  return (POLICIES as readonly string[]).includes(policy) ? t(`policy.${policy}` as GuestKey) : '';
}

/** Why a room can't be booked for these dates. */
export function violationText(t: GuestTranslator, v: string, minNights?: number): string {
  if (!(VIOLATIONS as readonly string[]).includes(v)) return t('policy.violations.other');
  return t(`policy.violations.${v}` as GuestKey, { n: minNights ?? 2 });
}

/** Top source markets first (spec §2), then common others. */
export const COUNTRIES: [string, string][] = [
  ['IN', 'India'],
  ['GB', 'United Kingdom'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['AU', 'Australia'],
  ['LK', 'Sri Lanka'],
  ['US', 'United States'],
  ['RU', 'Russia'],
  ['CN', 'China'],
  ['NL', 'Netherlands'],
  ['IT', 'Italy'],
  ['ES', 'Spain'],
  ['CH', 'Switzerland'],
  ['AT', 'Austria'],
  ['BE', 'Belgium'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['DK', 'Denmark'],
  ['PL', 'Poland'],
  ['IL', 'Israel'],
  ['CA', 'Canada'],
  ['NZ', 'New Zealand'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['SG', 'Singapore'],
  ['MY', 'Malaysia'],
  ['MV', 'Maldives'],
  ['AE', 'United Arab Emirates'],
  ['SA', 'Saudi Arabia'],
  ['BD', 'Bangladesh'],
  ['PK', 'Pakistan'],
  ['IE', 'Ireland'],
  ['CZ', 'Czechia'],
  ['UA', 'Ukraine'],
  ['BR', 'Brazil'],
  ['ZA', 'South Africa'],
];

/*
 * Sinhala country names (CLDR, generated with Node's Intl.DisplayNames). A fixed table, not the
 * browser's Intl: Chrome ships without Sinhala region names and would show bare codes like "GB".
 */
const COUNTRIES_SI: Record<string, string> = {
  IN: 'ඉන්දියාව',
  GB: 'එක්සත් රාජධානිය',
  DE: 'ජර්මනිය',
  FR: 'ප්‍රංශය',
  AU: 'ඕස්ට්‍රේලියාව',
  LK: 'ශ්‍රී ලංකාව',
  US: 'එක්සත් ජනපදය',
  RU: 'රුසියාව',
  CN: 'චීනය',
  NL: 'නෙදර්ලන්තය',
  IT: 'ඉතාලිය',
  ES: 'ස්පාඤ්ඤය',
  CH: 'ස්විස්ටර්ලන්තය',
  AT: 'ඔස්ට්‍රියාව',
  BE: 'බෙල්ජියම',
  SE: 'ස්වීඩනය',
  NO: 'නෝර්වේ',
  DK: 'ඩෙන්මාර්කය',
  PL: 'පෝලන්තය',
  IL: 'ඊශ්‍රායලය',
  CA: 'කැනඩාව',
  NZ: 'නවසීලන්තය',
  JP: 'ජපානය',
  KR: 'දකුණු කොරියාව',
  SG: 'සිංගප්පූරුව',
  MY: 'මැලේසියාව',
  MV: 'මාල දිවයින',
  AE: 'එක්සත් අරාබි එමිර් රාජ්‍යය',
  SA: 'සෞදි අරාබිය',
  BD: 'බංග්ලාදේශය',
  PK: 'පාකිස්තානය',
  IE: 'අයර්ලන්තය',
  CZ: 'චෙචියාව',
  UA: 'යුක්රේනය',
  BR: 'බ්‍රසීලය',
  ZA: 'දකුණු අප්‍රිකාව',
};

/** COUNTRIES with names in the guest's language. */
export function countryOptions(lang: GuestLang): [string, string][] {
  return lang === 'si' ? COUNTRIES.map(([code, en]) => [code, COUNTRIES_SI[code] ?? en]) : COUNTRIES;
}

export const LANGUAGES: [string, string][] = [
  ['en', 'English'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['hi', 'हिन्दी'],
  ['si', 'සිංහල'],
];
