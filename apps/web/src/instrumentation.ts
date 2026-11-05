import type { Instrumentation } from 'next';

/**
 * Server-side error reporting (spec §11 Monitoring). Only the server reports: there is no Sentry in
 * the browser bundle, so guest pages stay as light as they are (Lighthouse budgets, spec §5).
 * Off without SENTRY_DSN. Same rules as the API (apps/api/src/instrument.ts): no request bodies,
 * cookies, auth headers or query strings (booking links carry access tokens).
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.query_string;
        if (event.request.url) event.request.url = event.request.url.split('?')[0];
        if (event.request.headers) {
          event.request.headers = Object.fromEntries(
            Object.entries(event.request.headers).filter(([k]) => !/^(authorization|cookie|set-cookie|x-revalidate-secret)$/i.test(k)),
          );
        }
      }
      if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
      return event;
    },
    beforeBreadcrumb: (b) => (b.category === 'console' ? null : b),
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
