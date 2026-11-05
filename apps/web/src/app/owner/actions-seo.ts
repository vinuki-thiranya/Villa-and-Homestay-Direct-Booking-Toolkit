'use server';

// Server actions for Setup → Google & local guide (local content blocks, translations, Search Console code).
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { OwnerKey } from '@/i18n/owner/t';
import { ownerApi } from '@/lib/owner';
import { errorMsg, msg } from './action-messages';
import type { ActionResult } from './actions';

type Prev = ActionResult | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

async function attempt<T>(fn: () => Promise<T>, success: (r: T) => Promise<string>): Promise<ActionResult> {
  let r: T;
  try {
    r = await fn();
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, message: await errorMsg(err) };
  }
  revalidatePath('/owner/setup/local');
  return { ok: true, message: await success(r) };
}

const say = (key: OwnerKey, vars?: Record<string, string | number>) => () => msg(key, vars);

export async function saveSiteContentAction(propertyId: string, key: string, lang: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = { key, lang, body: str(fd, 'body'), publish: fd.get('publish') === 'on' };
  return attempt(() => ownerApi(`/properties/${propertyId}/site-content`, { method: 'PUT', body }), say('actions.saved'));
}

export async function deleteSiteContentAction(propertyId: string, key: string, lang: string, _: Prev): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/properties/${propertyId}/site-content/${encodeURIComponent(key)}/${lang}`, { method: 'DELETE' }),
    say('actions.deleted'),
  );
}

export async function setSiteContentStatusAction(propertyId: string, lang: string, status: 'draft' | 'published', _: Prev): Promise<ActionResult> {
  return attempt(
    () => ownerApi<{ updated: number }>(`/properties/${propertyId}/site-content/status`, { method: 'POST', body: { langs: [lang], status } }),
    (r) => (status === 'published' ? msg(r.updated === 1 ? 'actions.contentPublished_one' : 'actions.contentPublished_other', { n: r.updated }) : msg('actions.contentUnpublished')),
  );
}

export async function generateSiteContentAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/properties/${propertyId}/site-content/generate`, { method: 'POST', body: { overwrite: fd.get('overwrite') === 'on' } }),
    say('actions.contentDrafted'),
  );
}

export async function saveVerificationAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const code = fd.get('remove') === '1' ? null : str(fd, 'code') || null;
  return attempt(
    () => ownerApi(`/properties/${propertyId}/site-content/verification`, { method: 'PUT', body: { code } }),
    say(code ? 'actions.verificationSaved' : 'actions.deleted'),
  );
}
