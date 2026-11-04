import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  /**
   * Properties a manager or staff user may access; null/undefined = every property of the tenant.
   * Set by AuthGuard, applied by DbService.withTenant as app.property_ids (RLS property_scope).
   */
  propertyIds?: string[] | null;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/** Express middleware: one mutable context object per request. */
export function requestContextMiddleware(_req: unknown, _res: unknown, next: () => void): void {
  requestContext.run({}, next);
}

/** Run fn as a property-restricted user (tests, workers acting for a user). */
export function runWithProperties<T>(propertyIds: string[] | null, fn: () => Promise<T>): Promise<T> {
  return requestContext.run({ propertyIds }, fn);
}
