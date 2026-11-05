// Server-side helpers for the owner app: session cookie, authenticated API calls, selected property.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { API_URL, ApiError, apiFetch, errorMessage } from './api';

export const TOKEN_COOKIE = 'sd_token';
export const PROPERTY_COOKIE = 'sd_property';

/** Owner-facing property (apps/api/src/modules/properties/mappers.ts toOwnerProperty). */
export interface OwnerProperty {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  address: string;
  area: string;
  lat: number | null;
  lng: number | null;
  sltdaNumber: string | null;
  sltdaExpiry: string | null;
  checkIn: string;
  checkOut: string;
  timezone: string;
  whatsappNumber: string | null;
  email: string | null;
  baseCurrency: string;
  defaultDepositPct: number;
  defaultCancellationPolicy: string;
  taxPct: number;
  houseRules: string;
  bookingMode: string;
  cleaningBufferNights: number;
  manualPaymentHoldHours: number;
  theme: string;
  photos: string[];
  customDomain: string | null;
  hostName: string;
  hostPhotoUrl: string | null;
  heroVideoUrl: string | null;
  published: boolean;
}

export interface OwnerPropertyDetail extends OwnerProperty {
  paymentMethods: string[];
  siteUrl: string;
  gateways: {
    payhere: { merchantId: string; currency: string } | null;
    paypal: { clientId: string; currency: string } | null;
    lankaqr: { qrImageUrl: string; merchantName: string } | null;
    bank: { accountName: string; bankName: string; accountNumber: string; branch: string; swift: string; notes: string } | null;
  };
}

export interface OwnerRoom {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  maxGuests: number;
  baseGuests: number;
  beds: string;
  bathroom: string;
  amenities: string[];
  photos: string[];
  baseRate: number;
  extraGuestRate: number;
  minNights: number;
  maxNights: number | null;
  cleaningBufferNights: number | null;
  bookingMode: string | null;
  sortOrder: number;
  active: boolean;
  icalExportToken: string;
}

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

/** Authenticated API call; an expired session sends the owner back to login. */
export async function ownerApi<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  if (!token) redirect('/owner/login');
  try {
    return await apiFetch<T>(path, { ...opts, token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/owner/login?expired=1');
    throw err;
  }
}

/** Multipart upload (task photos) to an owner endpoint; the file is forwarded as field "file". */
export async function ownerUpload<T>(path: string, file: File): Promise<T> {
  const token = await getToken();
  if (!token) redirect('/owner/login');
  const fd = new FormData();
  fd.set('file', file, file.name || 'photo.jpg');
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fd, cache: 'no-store' });
  const body = await res.json().catch(() => null);
  if (res.status === 401) redirect('/owner/login?expired=1');
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, `HTTP ${res.status}`), body);
  return body as T;
}

export const listProperties = cache(() => ownerApi<OwnerProperty[]>('/properties'));

/** The property the owner is working on (cookie), defaulting to the first. Null = onboarding. */
export const currentProperty = cache(async (): Promise<OwnerProperty | null> => {
  const props = await listProperties();
  if (props.length === 0) return null;
  const wanted = (await cookies()).get(PROPERTY_COOKIE)?.value;
  return props.find((p) => p.id === wanted) ?? props[0]!;
});

