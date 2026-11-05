/**
 * Background-job failures since the last ops digest, kept in the worker process that runs both the
 * jobs and the digest (scheduler.ts). Lost on restart, which the digest says; Sentry has the full history.
 */
export interface JobFailure {
  name: string;
  error: string;
  at: Date;
}

const MAX = 200;
const failures: JobFailure[] = [];
let since = new Date();

export function recordJobFailure(name: string, err: unknown): void {
  failures.push({ name, error: err instanceof Error ? err.message : String(err), at: new Date() });
  if (failures.length > MAX) failures.shift();
}

/** Returns the failures recorded since the previous call, and starts a new window. */
export function takeJobFailures(): { since: Date; failures: JobFailure[] } {
  const out = { since, failures: failures.splice(0) };
  since = new Date();
  return out;
}
