/**
 * WhatsApp message templates (needed outside the 24-hour service window). Guest templates are
 * generated from the same i18n strings the API sends inside the window, so the approved text and
 * the free-form text never drift: each {placeholder} becomes a positional {{n}} parameter.
 * Submit with `npm run whatsapp:templates` (scripts/submit-whatsapp-templates.ts).
 */
import { LANGUAGES, t, type Language, type MessageKey } from '@staydirect/shared';

/**
 * Languages with Meta-approved guest templates. Sinhala is not submitted yet: until it is, Sinhala
 * guests get Sinhala free text inside the 24-hour window and the English template outside it
 * (WhatsAppChannel.sendNamedTemplate falls back to 'en'). Add 'si' here once Meta approves it.
 */
const APPROVED: Language[] = LANGUAGES.filter((l) => l !== 'si');

export interface TemplateDef {
  name: string;
  category: 'UTILITY' | 'MARKETING';
  /** i18n key for guest templates, or fixed English text with {placeholders} for staff/owner templates. */
  key?: MessageKey;
  text?: string;
  languages: Language[];
}

export const TEMPLATES: TemplateDef[] = [
  { name: 'sd_booking_confirmed', key: 'seqBookingConfirmed', category: 'UTILITY', languages: [...APPROVED] },
  { name: 'sd_pre_arrival_7d', key: 'seqPreArrival7d', category: 'UTILITY', languages: [...APPROVED] },
  { name: 'sd_pre_arrival_1d', key: 'seqPreArrival1d', category: 'UTILITY', languages: [...APPROVED] },
  { name: 'sd_arrival_guide', key: 'seqArrival', category: 'UTILITY', languages: [...APPROVED] },
  { name: 'sd_mid_stay_addons', key: 'seqMidStay', category: 'MARKETING', languages: [...APPROVED] },
  { name: 'sd_checkout_review', key: 'seqCheckOut', category: 'UTILITY', languages: [...APPROVED] },
  { name: 'sd_repeat_guest_code', key: 'repeatCode', category: 'MARKETING', languages: [...APPROVED] },
  { name: 'owner_alert', text: 'StayDirect alert for {property}: {text} — open the owner app to act.', category: 'UTILITY', languages: ['en'] },
  {
    name: 'sd_cleaner_tasks',
    text: 'Hi {name}, your tasks at {property} for {date}: {count}. Open your list and tick them off here: {link} — thank you!',
    category: 'UTILITY',
    languages: ['en'],
  },
  {
    name: 'sd_provider_job',
    text: 'New job from {property}: {service} on {when} for {guest} ({qty}). Pay: {amount}. Please confirm here: {link} — thank you.',
    category: 'UTILITY',
    languages: ['en'],
  },
];

const PLACEHOLDER = /\{(\w+)\}/g;

function sourceText(def: TemplateDef, lang: Language): string {
  if (def.key) {
    // t() leaves unknown placeholders as {name}; pass no vars to get the raw pattern.
    return t(lang, def.key);
  }
  return def.text!;
}

/** Placeholder names in the order they appear: these become {{1}}, {{2}}, … */
export function templateParams(def: TemplateDef, lang: Language): string[] {
  const names: string[] = [];
  for (const m of sourceText(def, lang).matchAll(PLACEHOLDER)) if (!names.includes(m[1]!)) names.push(m[1]!);
  return names;
}

/** Body in Meta's positional format, plus example values (required by the template API). */
export function templateBody(def: TemplateDef, lang: Language): { text: string; example: string[] } {
  const names = templateParams(def, lang);
  const text = sourceText(def, lang).replace(PLACEHOLDER, (_, n: string) => `{{${names.indexOf(n) + 1}}}`);
  return { text, example: names.map((n) => EXAMPLES[n] ?? n) };
}

/** Ordered parameter values for a send. Missing values become '-' (Meta rejects empty params). */
export function orderedParams(def: TemplateDef, lang: Language, vars: Record<string, string | number>): string[] {
  return templateParams(def, lang).map((n) => {
    const v = vars[n];
    return v === undefined || v === '' ? '-' : String(v);
  });
}

export function templateByName(name: string): TemplateDef {
  const def = TEMPLATES.find((d) => d.name === name);
  if (!def) throw new Error(`Unknown WhatsApp template ${name}`);
  return def;
}

/** Meta language codes for our four guest languages. */
export const META_LANG: Record<Language, string> = { en: 'en', de: 'de', fr: 'fr', hi: 'hi', si: 'si' };

const EXAMPLES: Record<string, string> = {
  property: 'Villa Lagoon Mirissa',
  reference: 'SD-7KQ2MX',
  from: '2027-01-12',
  to: '2027-01-15',
  link: 'https://villa-lagoon.staydirect.lk/booking/SD-7KQ2MX',
  directions: 'https://maps.google.com/?q=5.9483,80.4716',
  checkIn: '14:00',
  checkOut: '11:00',
  address: '12 Bandaramulla Road, Mirissa',
  guide: 'https://villa-lagoon.staydirect.lk/guide/abc123',
  addons: 'https://villa-lagoon.staydirect.lk/booking/SD-7KQ2MX#addons',
  review: 'https://villa-lagoon.staydirect.lk/review/SD-7KQ2MX',
  pct: '10',
  code: 'BACK10-7KQ2',
  date: '2027-12-31',
  text: 'New direct booking SD-7KQ2MX, Ocean Suite, 12–15 Jan',
  name: 'Kamala',
  count: '3 rooms to clean, 2 to prepare',
  service: 'Airport pickup',
  when: '2027-01-12 14:00',
  guest: 'Anna Schmidt',
  qty: '2 people',
  amount: 'LKR 13,000',
};
