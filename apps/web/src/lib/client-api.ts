/** Browser-side calls to the public API (availability, checkout, payments). */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: Record<string, unknown> | null,
  ) {
    super(message);
  }
}

function messageOf(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as { message?: unknown; issues?: { path: string; message: string }[] };
  if (b.issues?.length) return b.issues.map((i) => i.message).join('; ');
  if (Array.isArray(b.message)) return b.message.join('; ');
  if (typeof b.message === 'string') return b.message;
  return fallback;
}

export async function publicApi<T>(path: string, init: { method?: string; json?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    method: init.method ?? (init.json || init.form ? 'POST' : 'GET'),
    headers: init.json !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) throw new ClientApiError(res.status, messageOf(body, `Request failed (${res.status})`), body);
  return body as T;
}
