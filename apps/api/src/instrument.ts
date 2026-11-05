import * as Sentry from '@sentry/node';
import type { Breadcrumb, ErrorEvent } from '@sentry/node';

/** Headers that carry credentials or signatures; never sent to Sentry. */
const SECRET_HEADERS = /^(authorization|cookie|set-cookie|x-revalidate-secret|x-hub-signature(-256)?|paypal-.*|x-api-key)$/i;

const stripQuery = (url: string) => url.split('?')[0]!;

/**
 * Sentry gets the error, the route and the stack, not guest data (spec §5 GDPR): no request bodies
 * (bookings, messages, payment notifications), no cookies or auth headers, no query strings (booking
 * links carry access tokens), and only the user id.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.url) event.request.url = stripQuery(event.request.url);
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(Object.entries(event.request.headers).filter(([k]) => !SECRET_HEADERS.test(k)));
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  return event;
}

export function scrubBreadcrumb(b: Breadcrumb): Breadcrumb | null {
  if (b.category === 'console') return null; // log lines can quote guest names and messages
  if (typeof b.data?.url === 'string') b.data = { ...b.data, url: stripQuery(b.data.url) };
  return b;
}

/** Errors only (no tracing). A no-op without SENTRY_DSN, so dev and tests send nothing. */
export function initSentry(processName: 'api' | 'worker', env: NodeJS.ProcessEnv = process.env): boolean {
  if (!env.SENTRY_DSN) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'development',
    release: env.FLY_IMAGE_REF || undefined,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    initialScope: { tags: { process: processName } },
  });
  return true;
}
