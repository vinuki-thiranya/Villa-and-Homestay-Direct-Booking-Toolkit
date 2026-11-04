// Server-side only: imported from server components, route handlers and server actions.
import type { PublicProperty } from '@staydirect/shared';

export const API_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

/** Nest error bodies: { message: string | string[], issues?: [...] }. */
export function errorMessage(body: unknown, fallback = 'Something went wrong'): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as { message?: unknown; issues?: { path: string; message: string }[] };
  if (b.issues?.length) return b.issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join('; ');
  if (Array.isArray(b.message)) return b.message.join('; ');
  if (typeof b.message === 'string') return b.message;
  return fallback;
}

interface FetchOpts {
  method?: string;
  body?: unknown;
  token?: string;
  tags?: string[];
  revalidate?: number | false;
}

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const cacheable = !opts.token && (opts.method ?? 'GET') === 'GET' && opts.revalidate !== undefined;
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    ...(cacheable ? { next: { revalidate: opts.revalidate, tags: opts.tags } } : { cache: 'no-store' as const }),
  });
  const text = await res.text();
  const json = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, errorMessage(json, `HTTP ${res.status}`), json);
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Guest-site data, cached 5 minutes and tagged so the API can revalidate it after an owner edit.
 * The API sends `property:{id}`, which this app cannot map to a site key before fetching, so the
 * revalidate route also marks the shared `sites` tag stale (stale-while-revalidate, so cheap).
 */
export async function getSite(site: string): Promise<PublicProperty | null> {
  try {
    return await apiFetch<PublicProperty>(`/public/sites/${encodeURIComponent(site)}`, {
      revalidate: 300,
      tags: [`site:${site}`, 'sites'],
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface PublicAddOn {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  leadTimeHours: number;
  photoUrl: string | null;
}

export interface PublicReviews {
  average: number | null;
  count: number;
  reviews: { rating: number; body: string; guestName: string; ownerReply: string | null; createdAt: string }[];
}

/** Public add-on catalogue for the experiences page (cached like site data). */
export async function getSiteAddOns(site: string): Promise<PublicAddOn[]> {
  try {
    return await apiFetch<PublicAddOn[]>(`/public/sites/${encodeURIComponent(site)}/add-ons`, { revalidate: 300, tags: [`site:${site}`, 'sites'] });
  } catch {
    return [];
  }
}

/** Public reviews; a failure hides the block rather than breaking the home page. */
export async function getSiteReviews(site: string): Promise<PublicReviews> {
  try {
    return await apiFetch<PublicReviews>(`/public/sites/${encodeURIComponent(site)}/reviews`, { revalidate: 300, tags: [`site:${site}`, 'sites'] });
  } catch {
    return { average: null, count: 0, reviews: [] };
  }
}
