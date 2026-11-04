'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { ownerApi, PROPERTY_COOKIE, TOKEN_COOKIE } from '@/lib/owner';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

type Prev = ActionResult | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const num = (fd: FormData, k: string) => (str(fd, k) === '' ? undefined : Number(str(fd, k)));
const optNum = (fd: FormData, k: string) => (str(fd, k) === '' ? null : Number(str(fd, k)));
const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
const list = (fd: FormData, k: string, sep: RegExp = /[\n,]/) =>
  str(fd, k)
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);

/** Run an owner API call, turning API errors into a form message. Redirects pass through. */
async function attempt(fn: () => Promise<unknown>, success: string, paths: string[] = ['/owner']): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong' };
  }
  for (const p of paths) revalidatePath(p, 'layout');
  return { ok: true, message: success };
}

// ---------------------------------------------------------------- auth

export interface LoginState {
  step: 'phone' | 'code';
  phone?: string;
  message?: string;
}

export async function loginAction(prev: LoginState, fd: FormData): Promise<LoginState> {
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
    const res = await apiFetch<{ token: string }>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code: str(fd, 'code'), name: optStr(fd, 'name') ?? undefined },
    });
    token = res.token;
  } catch (err) {
    return { step: 'code', phone, message: err instanceof ApiError ? err.message : 'Could not verify the code' };
  }
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/owner');
}

export async function logoutAction() {
  const c = await cookies();
  c.delete(TOKEN_COOKIE);
  c.delete(PROPERTY_COOKIE);
  redirect('/owner/login');
}

export async function selectPropertyAction(fd: FormData) {
  (await cookies()).set(PROPERTY_COOKIE, str(fd, 'propertyId'), { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/owner', 'layout');
}

// ---------------------------------------------------------------- property setup

function propertyBody(fd: FormData) {
  return {
    name: str(fd, 'name'),
    slug: str(fd, 'slug').toLowerCase(),
    type: str(fd, 'type'),
    description: str(fd, 'description'),
    address: str(fd, 'address'),
    area: str(fd, 'area'),
    lat: optNum(fd, 'lat'),
    lng: optNum(fd, 'lng'),
    sltdaNumber: optStr(fd, 'sltdaNumber'),
    sltdaExpiry: optStr(fd, 'sltdaExpiry'),
    checkIn: str(fd, 'checkIn') || '14:00',
    checkOut: str(fd, 'checkOut') || '11:00',
    whatsappNumber: optStr(fd, 'whatsappNumber'),
    email: optStr(fd, 'email'),
    baseCurrency: str(fd, 'baseCurrency') || 'USD',
    defaultDepositPct: num(fd, 'defaultDepositPct') ?? 30,
    defaultCancellationPolicy: str(fd, 'defaultCancellationPolicy') || 'moderate',
    taxPct: num(fd, 'taxPct') ?? 0,
    houseRules: str(fd, 'houseRules'),
    bookingMode: str(fd, 'bookingMode') || 'instant',
    cleaningBufferNights: num(fd, 'cleaningBufferNights') ?? 0,
    manualPaymentHoldHours: num(fd, 'manualPaymentHoldHours') ?? 24,
    theme: str(fd, 'theme') || 'lagoon',
    photos: list(fd, 'photos', /\s+/),
    customDomain: optStr(fd, 'customDomain'),
    hostName: str(fd, 'hostName'),
    hostPhotoUrl: optStr(fd, 'hostPhotoUrl'),
  };
}

export async function createPropertyAction(_: Prev, fd: FormData): Promise<ActionResult> {
  let id = '';
  const res = await attempt(async () => {
    const p = await ownerApi<{ id: string }>('/properties', { method: 'POST', body: propertyBody(fd) });
    id = p.id;
  }, 'Property created');
  if (res.ok) {
    (await cookies()).set(PROPERTY_COOKIE, id, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
    redirect('/owner/setup/rooms');
  }
  return res;
}

export async function updatePropertyAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/properties/${id}`, { method: 'PATCH', body: propertyBody(fd) }), 'Saved');
}

export async function saveGatewaysAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const body: Record<string, unknown> = {};
  // Secrets are write-only: leaving a secret blank keeps the stored one (method is omitted).
  if (str(fd, 'payhereMerchantId') && str(fd, 'payhereSecret')) {
    body.payhere = { merchantId: str(fd, 'payhereMerchantId'), merchantSecret: str(fd, 'payhereSecret'), currency: str(fd, 'payhereCurrency') || 'LKR' };
  }
  if (bool(fd, 'payhereRemove')) body.payhere = null;
  if (str(fd, 'paypalClientId') && str(fd, 'paypalSecret')) {
    body.paypal = { clientId: str(fd, 'paypalClientId'), clientSecret: str(fd, 'paypalSecret'), currency: str(fd, 'paypalCurrency') || 'USD' };
  }
  if (bool(fd, 'paypalRemove')) body.paypal = null;
  if (str(fd, 'qrImageUrl')) body.lankaqr = { qrImageUrl: str(fd, 'qrImageUrl'), merchantName: str(fd, 'qrMerchantName') };
  if (bool(fd, 'lankaqrRemove')) body.lankaqr = null;
  if (str(fd, 'accountNumber')) {
    body.bank = {
      accountName: str(fd, 'accountName'),
      bankName: str(fd, 'bankName'),
      accountNumber: str(fd, 'accountNumber'),
      branch: str(fd, 'branch'),
      swift: str(fd, 'swift'),
      notes: str(fd, 'bankNotes'),
    };
  }
  if (bool(fd, 'bankRemove')) body.bank = null;
  return attempt(() => ownerApi(`/properties/${id}/gateways`, { method: 'PUT', body }), 'Payment methods saved');
}

function roomBody(fd: FormData) {
  return {
    name: str(fd, 'name'),
    description: str(fd, 'description'),
    maxGuests: num(fd, 'maxGuests'),
    baseGuests: num(fd, 'baseGuests'),
    beds: str(fd, 'beds'),
    bathroom: str(fd, 'bathroom') || 'Private',
    amenities: list(fd, 'amenities'),
    photos: list(fd, 'photos', /\s+/),
    baseRate: num(fd, 'baseRate'),
    extraGuestRate: num(fd, 'extraGuestRate') ?? 0,
    minNights: num(fd, 'minNights') ?? 1,
    maxNights: optNum(fd, 'maxNights'),
    cleaningBufferNights: optNum(fd, 'cleaningBufferNights'),
    bookingMode: optStr(fd, 'bookingMode'),
    sortOrder: num(fd, 'sortOrder') ?? 0,
    active: fd.has('activePresent') ? bool(fd, 'active') : true,
  };
}

export async function createRoomAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/properties/${propertyId}/rooms`, { method: 'POST', body: roomBody(fd) }), 'Room added');
}

export async function updateRoomAction(roomId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/rooms/${roomId}`, { method: 'PATCH', body: roomBody(fd) }), 'Room saved');
}

export async function createRatePlanAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const kind = str(fd, 'kind');
  const days = fd.getAll('weekday').map(Number);
  const body = {
    name: str(fd, 'name'),
    kind,
    roomIds: fd.getAll('roomIds').map(String),
    startDate: optStr(fd, 'startDate'),
    endDate: optStr(fd, 'endDate'),
    weekdayMask: days.length ? days.reduce((m, d) => m | (1 << d), 0) : 127,
    rate: optNum(fd, 'rate'),
    adjustmentPct: optNum(fd, 'adjustmentPct'),
    minStayNights: kind === 'long_stay' ? optNum(fd, 'minStayNights') : null,
    withinDays: kind === 'last_minute' ? optNum(fd, 'withinDays') : null,
    depositPct: optNum(fd, 'depositPct'),
    cancellationPolicy: optStr(fd, 'cancellationPolicy'),
    minNights: optNum(fd, 'minNights'),
    closedToArrival: bool(fd, 'closedToArrival'),
    closedToDeparture: bool(fd, 'closedToDeparture'),
    priority: num(fd, 'priority') ?? 10,
    active: true,
  };
  return attempt(() => ownerApi(`/properties/${propertyId}/rate-plans`, { method: 'POST', body }), 'Rate plan added');
}

export async function deactivateRatePlanAction(planId: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/rate-plans/${planId}`, { method: 'DELETE' }), 'Rate plan switched off');
}

// ---------------------------------------------------------------- calendar & channels

export async function blockAction(_: Prev, fd: FormData): Promise<ActionResult> {
  const roomId = str(fd, 'roomId');
  const body = { from: str(fd, 'from'), to: str(fd, 'to'), note: str(fd, 'note') };
  const release = fd.get('intent') === 'release';
  return attempt(
    () => ownerApi(`/rooms/${roomId}/blocks${release ? '/release' : ''}`, { method: 'POST', body }),
    release ? 'Nights released' : 'Nights blocked',
  );
}

export async function addIcalSourceAction(_: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/rooms/${str(fd, 'roomId')}/ical-sources`, { method: 'POST', body: { url: str(fd, 'url'), channel: str(fd, 'channel') } }),
    'Calendar added — press "Sync now" to import it',
  );
}

export async function removeIcalSourceAction(sourceId: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/ical-sources/${sourceId}`, { method: 'DELETE' }), 'Calendar removed');
}

export async function syncNowAction(propertyId: string, _: Prev): Promise<ActionResult> {
  let summary = '';
  const res = await attempt(async () => {
    const out = await ownerApi<{ ok: boolean; added: number; released: number; conflicts: number; error?: string }[]>(
      `/properties/${propertyId}/sync-now`,
      { method: 'POST' },
    );
    const failed = out.filter((o) => !o.ok).length;
    const added = out.reduce((s, o) => s + o.added, 0);
    const conflicts = out.reduce((s, o) => s + o.conflicts, 0);
    summary = `${out.length} calendar(s) synced · ${added} night(s) added${failed ? ` · ${failed} failed` : ''}${conflicts ? ` · ${conflicts} CONFLICT(S)` : ''}`;
  }, '');
  return res.ok ? { ok: true, message: summary || 'No calendars to sync' } : res;
}

export async function resolveConflictAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/conflicts/${id}/resolve`, { method: 'POST', body: { resolution: str(fd, 'resolution'), note: str(fd, 'note') } }),
    'Conflict resolved',
  );
}

// ---------------------------------------------------------------- bookings & payments

export async function bookingAction(id: string, op: 'approve' | 'no-show' | 'check-in' | 'check-out', _: Prev): Promise<ActionResult> {
  const label = { approve: 'Approved — payment link sent', 'no-show': 'Marked as no-show', 'check-in': 'Checked in', 'check-out': 'Checked out' }[op];
  return attempt(() => ownerApi(`/bookings/${id}/${op}`, { method: 'POST' }), label);
}

export async function declineAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/bookings/${id}/decline`, { method: 'POST', body: { reason: str(fd, 'reason') } }), 'Request declined');
}

export async function cancelAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  let msg = 'Cancelled';
  const res = await attempt(async () => {
    const out = await ownerApi<{ refundDue: number; refund: { status: string; method: string } | null }>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: { reason: str(fd, 'reason'), refund: bool(fd, 'refund') },
    });
    msg = out.refundDue > 0
      ? `Cancelled. Refund of ${out.refundDue} ${out.refund?.status === 'confirmed' ? 'sent' : 'recorded — pay it back and mark it done'}.`
      : 'Cancelled. No refund due under the policy.';
  }, '');
  return res.ok ? { ok: true, message: msg } : res;
}

export async function recordPaymentAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () =>
      ownerApi(`/bookings/${id}/payments`, {
        method: 'POST',
        body: { method: str(fd, 'method'), amount: num(fd, 'amount'), currency: optStr(fd, 'currency') ?? undefined, reference: str(fd, 'reference') },
      }),
    'Payment recorded',
  );
}

export async function reviewSlipAction(paymentId: string, approve: boolean, _: Prev, fd: FormData): Promise<ActionResult> {
  const amount = num(fd, 'amount');
  return attempt(
    () => ownerApi(`/payments/${paymentId}/review`, { method: 'POST', body: { approve, ...(approve && amount ? { amount } : {}) } }),
    approve ? 'Slip confirmed' : 'Slip rejected',
  );
}

export async function refundAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/bookings/${id}/refunds`, { method: 'POST', body: { amount: num(fd, 'amount'), reason: str(fd, 'reason') } }),
    'Refund recorded',
  );
}

export async function completeRefundAction(paymentId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/payments/${paymentId}/complete-refund`, { method: 'POST', body: { reference: str(fd, 'reference') } }),
    'Refund marked as paid',
  );
}
