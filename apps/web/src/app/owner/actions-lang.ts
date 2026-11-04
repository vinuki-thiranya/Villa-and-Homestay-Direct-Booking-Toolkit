'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { isOwnerLang } from '@/i18n/owner/t';
import { getToken, ownerApi } from '@/lib/owner';
import { LANG_COOKIE } from '@/lib/owner-i18n';

/**
 * Switch the owner app between English and Sinhala. Signed in: saved on the user (so the Flutter app
 * follows) and on this device; on the login page: this device only.
 */
export async function setLanguageAction(fd: FormData) {
  const lang = fd.get('lang');
  if (!isOwnerLang(lang)) return;
  if (await getToken()) await ownerApi('/auth/me', { method: 'PATCH', body: { language: lang } });
  (await cookies()).set(LANG_COOKIE, lang, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/owner', 'layout');
}
