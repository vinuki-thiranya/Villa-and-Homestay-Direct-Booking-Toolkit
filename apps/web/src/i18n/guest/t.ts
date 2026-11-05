/*
 * Guest site translations (English, Sinhala, German, French, Hindi) inside every theme. Same shape as
 * the owner app's i18n/owner/t.ts. Every key exists in en/; the other languages are typed against
 * en/, so a missing string fails the typecheck. Sinhala terms follow i18n/owner/GLOSSARY.md.
 * Server-only in practice: client components use useGT() (components/guest/GuestI18n.tsx).
 */
import { isSiteLang, SITE_LANGS } from '@/lib/site-routing';
import { de } from './de';
import { en } from './en';
import { fr } from './fr';
import { hi } from './hi';
import { si } from './si';
import { makeTranslator, type GuestDict, type GuestLang, type GuestTranslator } from './translator';

import type { Dict } from '../owner/t';

export type { GuestCountKey, GuestDict, GuestKey, GuestLang, GuestTranslator } from './translator';
export type { Dict };

export const GUEST_LANGS = SITE_LANGS;

export function isGuestLang(v: unknown): v is GuestLang {
  return isSiteLang(v);
}

export const GUEST_DICTS: Record<GuestLang, GuestDict> = { en, si, de, fr, hi };

const cache = new Map<GuestLang, GuestTranslator>();

export function makeGuestT(lang: GuestLang): GuestTranslator {
  let t = cache.get(lang);
  if (!t) cache.set(lang, (t = makeTranslator(lang, GUEST_DICTS[lang])));
  return t;
}
