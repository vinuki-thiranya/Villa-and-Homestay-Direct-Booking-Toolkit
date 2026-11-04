/**
 * Stay dates are calendar dates (YYYY-MM-DD) in the property's local time.
 * All helpers work in UTC on purpose so a date never shifts with the server timezone.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseDate(s: string): Date {
  if (!isIsoDate(s)) throw new Error(`Invalid date: ${s}`);
  return new Date(`${s}T00:00:00Z`);
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

/** The nights of a stay: from (check-in) inclusive to `to` (check-out) exclusive. */
export function nightsBetween(from: string, to: string): string[] {
  const n = diffDays(from, to);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(addDays(from, i));
  return out;
}

/** 0 = Sunday … 6 = Saturday (matches rate_plan.weekday_mask bit positions). */
export function dayOfWeek(s: string): number {
  return parseDate(s).getUTCDay();
}

/** Today's date in an IANA timezone, e.g. todayIn('Asia/Colombo'). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

export const ALL_WEEKDAYS_MASK = 0b1111111;
/** Friday and Saturday nights. */
export const WEEKEND_MASK = (1 << 5) | (1 << 6);

export function weekdayInMask(mask: number, dow: number): boolean {
  return (mask & (1 << dow)) !== 0;
}
