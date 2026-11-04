import type { Holiday } from '@staydirect/shared';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { isOwnerLang, makeT, type OwnerLang, type Translator } from '@/i18n/owner/t';
import { getToken, ownerApi } from './owner';
import { getMe } from './owner-r3';

/** Remembers the last language on this device, so the login page opens in it too. */
export const LANG_COOKIE = 'sd_lang';

/** The owner's UI language: their saved setting when signed in, else this device's last choice. */
export const getOwnerLang = cache(async (): Promise<OwnerLang> => {
  if (await getToken()) {
    const lang = (await getMe()).user.language;
    if (isOwnerLang(lang)) return lang;
  }
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isOwnerLang(c) ? c : 'en';
});

/** Translator for server components: `const t = await getT(); t('today.arriving')`. */
export async function getT(): Promise<Translator> {
  return makeT(await getOwnerLang());
}

/** Public holidays (Poya days marked) between two dates, for calendars and Today. */
export const getHolidays = cache(async (from: string, to: string): Promise<Holiday[]> => {
  try {
    return await ownerApi<Holiday[]>(`/holidays?from=${from}&to=${to}`);
  } catch {
    return []; // a missing holiday list must never break the page
  }
});
