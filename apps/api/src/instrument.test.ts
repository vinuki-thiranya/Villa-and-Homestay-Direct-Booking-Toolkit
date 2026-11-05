import type { ErrorEvent } from '@sentry/node';
import { describe, expect, it } from 'vitest';
import { initSentry, scrubBreadcrumb, scrubEvent } from './instrument.js';

describe('Sentry', () => {
  it('is off without a DSN', () => {
    expect(initSentry('api', {})).toBe(false);
  });

  it('never sends guest data, credentials or booking tokens', () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: 'https://api.staydirect.lk/public/bookings/SD-ABC123?token=secret',
        method: 'POST',
        data: { guest: { name: 'Lena Fischer', email: 'lena@example.com' } },
        cookies: { sd_session: 'x' },
        query_string: 'token=secret',
        headers: { authorization: 'Bearer abc', cookie: 'a=b', 'x-revalidate-secret': 's', 'x-hub-signature-256': 'sha', 'user-agent': 'Mozilla' },
      },
      user: { id: 'u1', email: 'owner@example.com', ip_address: '1.2.3.4' },
    } as ErrorEvent);
    expect(event.request).toEqual({ url: 'https://api.staydirect.lk/public/bookings/SD-ABC123', method: 'POST', headers: { 'user-agent': 'Mozilla' } });
    expect(event.user).toEqual({ id: 'u1' });
  });

  it('drops console breadcrumbs and query strings', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'Guest Lena Fischer' })).toBeNull();
    expect(scrubBreadcrumb({ category: 'http', data: { url: 'https://x.test/j/abc?token=1', method: 'GET' } })).toEqual({
      category: 'http',
      data: { url: 'https://x.test/j/abc', method: 'GET' },
    });
  });
});
