'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { ADMIN_COOKIE, adminApi } from '@/lib/admin';

export interface AdminResult {
  ok: boolean;
  message?: string;
}
type Prev = AdminResult | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[a-z0-9_-]{2,40}$/;

/** Server actions are public endpoints: inputs are checked here, authorisation happens in the API (AdminGuard). */
async function attempt(fn: () => Promise<unknown>, success: string, paths: string[]): Promise<AdminResult> {
  try {
    await fn();
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong' };
  }
  for (const p of paths) revalidatePath(p);
  return { ok: true, message: success };
}

function requireId(id: string): string {
  if (!UUID.test(id)) throw new Error('Invalid id');
  return id;
}

// ---------------------------------------------------------------- auth
export interface AdminLoginState {
  step: 'phone' | 'code';
  phone?: string;
  message?: string;
}

export async function adminLoginAction(prev: AdminLoginState, fd: FormData): Promise<AdminLoginState> {
  const phone = str(fd, 'phone') || prev.phone || '';
  if (prev.step === 'phone' || fd.get('resend')) {
    try {
      await apiFetch('/auth/otp/request', { method: 'POST', body: { phone } });
      return { step: 'code', phone, message: 'We sent a 6-digit code by SMS.' };
    } catch (err) {
      return { step: 'phone', phone, message: err instanceof Error ? err.message : 'Could not send the code' };
    }
  }
  let token: string;
  try {
    token = (await apiFetch<{ token: string }>('/auth/admin/verify', { method: 'POST', body: { phone, code: str(fd, 'code') } })).token;
  } catch (err) {
    return { step: 'code', phone, message: err instanceof ApiError ? err.message : 'Could not verify the code' };
  }
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // admin tokens last 12 h
  });
  redirect('/admin');
}

export async function adminLogoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

// ---------------------------------------------------------------- tenants
export async function updateTenantAction(tenantId: string, _prev: Prev, fd: FormData): Promise<AdminResult> {
  const body = {
    plan: str(fd, 'plan') || undefined,
    billingStatus: str(fd, 'billingStatus') || undefined,
    billingModel: str(fd, 'billingModel') || undefined,
  };
  return attempt(() => adminApi(`/admin/tenants/${requireId(tenantId)}`, { method: 'PATCH', body }), 'Plan and billing saved', [`/admin/tenants/${tenantId}`, '/admin/tenants']);
}

/** value: 'on' | 'off' | 'default' (removes the override). */
export async function setFlagOverrideAction(tenantId: string, key: string, _prev: Prev, fd: FormData): Promise<AdminResult> {
  const v = str(fd, 'value');
  const enabled = v === 'on' ? true : v === 'off' ? false : null;
  if (!KEY.test(key)) return { ok: false, message: 'Invalid flag' };
  return attempt(
    () => adminApi(`/admin/tenants/${requireId(tenantId)}/flags/${key}`, { method: 'PUT', body: { enabled } }),
    enabled === null ? 'Back to the plan default' : `Turned ${enabled ? 'on' : 'off'} for this tenant`,
    [`/admin/tenants/${tenantId}`, '/admin/flags'],
  );
}

// ---------------------------------------------------------------- feature flags
export async function updateFlagAction(key: string, _prev: Prev, fd: FormData): Promise<AdminResult> {
  if (!KEY.test(key)) return { ok: false, message: 'Invalid flag' };
  const body = {
    description: str(fd, 'description') || undefined,
    defaultEnabled: fd.get('defaultEnabled') === 'on',
    plans: fd.getAll('plans').map(String),
  };
  return attempt(() => adminApi(`/admin/flags/${key}`, { method: 'PUT', body }), 'Flag saved', ['/admin/flags']);
}

// ---------------------------------------------------------------- commission ledger
export async function settleLedgerAction(ledgerId: string, status: 'paid' | 'void', _prev: Prev, fd: FormData): Promise<AdminResult> {
  const note = str(fd, 'note').slice(0, 300);
  if (status === 'void' && note.length < 3) return { ok: false, message: 'Say why this month is voided' };
  return attempt(
    () => adminApi(`/admin/ledger/${requireId(ledgerId)}/${status === 'paid' ? 'paid' : 'void'}`, { method: 'POST', body: { note } }),
    status === 'paid' ? 'Recorded as paid (new ledger entry added)' : 'Voided (new ledger entry added)',
    ['/admin/ledger', '/admin', '/admin/tenants'],
  );
}

export async function runBillingAction(_prev: Prev, fd: FormData): Promise<AdminResult> {
  const period = str(fd, 'period');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return { ok: false, message: 'Choose a month' };
  let created = 0;
  const res = await attempt(
    async () => {
      created = (await adminApi<{ created: number }>('/admin/billing/run', { method: 'POST', body: { period } })).created;
    },
    '',
    ['/admin/ledger', '/admin'],
  );
  if (!res.ok) return res;
  return { ok: true, message: created ? `${created} ledger entr${created === 1 ? 'y' : 'ies'} created for ${period}` : `${period} was already billed for every tenant` };
}

// ---------------------------------------------------------------- tickets
export async function replyTicketAction(ticketId: string, _prev: Prev, fd: FormData): Promise<AdminResult> {
  const body = str(fd, 'body');
  if (!body) return { ok: false, message: 'Write a reply first' };
  return attempt(() => adminApi(`/admin/tickets/${requireId(ticketId)}/messages`, { method: 'POST', body: { body } }), 'Reply sent; ticket set to waiting on owner', [
    `/admin/tickets/${ticketId}`,
    '/admin/tickets',
  ]);
}

export async function ticketStatusAction(ticketId: string, _prev: Prev, fd: FormData): Promise<AdminResult> {
  const status = str(fd, 'status');
  if (!['open', 'pending', 'closed'].includes(status)) return { ok: false, message: 'Invalid status' };
  return attempt(() => adminApi(`/admin/tickets/${requireId(ticketId)}`, { method: 'PATCH', body: { status } }), `Ticket marked ${status}`, [
    `/admin/tickets/${ticketId}`,
    '/admin/tickets',
  ]);
}

// ---------------------------------------------------------------- themes & translations (called from client components)
export async function saveThemeAction(input: {
  key: string;
  name: string;
  published: boolean;
  tokens: Record<string, string>;
}): Promise<AdminResult> {
  if (!/^[a-z0-9-]{2,30}$/.test(input.key)) return { ok: false, message: 'Key: 2–30 lowercase letters, numbers or dashes' };
  const tokens = Object.fromEntries(Object.entries(input.tokens).filter(([, v]) => v !== ''));
  let updated = 0;
  const res = await attempt(
    async () => {
      updated = (await adminApi<{ propertiesUpdated: number }>(`/admin/themes/${input.key}`, { method: 'PUT', body: { ...input, tokens } })).propertiesUpdated;
    },
    '',
    ['/admin/themes'],
  );
  if (!res.ok) return res;
  return { ok: true, message: `Saved. ${updated} guest site${updated === 1 ? '' : 's'} use this theme and will refresh.` };
}

export async function saveTranslationAction(lang: string, key: string, value: string): Promise<AdminResult> {
  if (!['en', 'de', 'fr', 'hi', 'si'].includes(lang)) return { ok: false, message: 'Invalid language' };
  if (!value.trim()) return { ok: false, message: 'Empty text: use Reset to go back to the default' };
  return attempt(() => adminApi('/admin/translations', { method: 'PUT', body: { lang, key, value: value.trim() } }), 'Saved', ['/admin/translations']);
}

export async function resetTranslationAction(lang: string, key: string): Promise<AdminResult> {
  if (!['en', 'de', 'fr', 'hi', 'si'].includes(lang)) return { ok: false, message: 'Invalid language' };
  return attempt(() => adminApi(`/admin/translations/${lang}/${encodeURIComponent(key)}`, { method: 'DELETE' }), 'Back to default', ['/admin/translations']);
}

// ---------------------------------------------------------------- public holidays (Poya days)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HOLIDAY_TYPES = ['public', 'bank', 'mercantile'];

/** Add or correct a holiday (keyed by date + English name) after a gazette change. */
export async function saveHolidayAction(_prev: Prev, fd: FormData): Promise<AdminResult> {
  const date = str(fd, 'date');
  const nameEn = str(fd, 'nameEn');
  const nameSi = str(fd, 'nameSi');
  const types = fd.getAll('types').map(String).filter((t) => HOLIDAY_TYPES.includes(t));
  if (!ISO_DATE.test(date)) return { ok: false, message: 'Pick a date' };
  if (nameEn.length < 2 || nameSi.length < 2) return { ok: false, message: 'Enter the English and Sinhala names' };
  if (types.length === 0) return { ok: false, message: 'Tick at least one holiday type' };
  return attempt(
    () => adminApi('/admin/holidays', { method: 'PUT', body: { date, nameEn, nameSi, isPoya: fd.get('isPoya') === 'on', types } }),
    `Saved: ${nameEn}, ${date}`,
    ['/admin/holidays'],
  );
}

export async function deleteHolidayAction(date: string, nameEn: string): Promise<AdminResult> {
  if (!ISO_DATE.test(date) || !nameEn) return { ok: false, message: 'Invalid holiday' };
  return attempt(
    () => adminApi(`/admin/holidays/${date}/${encodeURIComponent(nameEn)}`, { method: 'DELETE' }),
    `Deleted: ${nameEn}`,
    ['/admin/holidays'],
  );
}
