/** Date-range picker rules, kept pure for tests. Dates are ISO yyyy-mm-dd strings in UTC. */

export function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsIso(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Weeks of a month, Monday first; days outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** The months to show from `today`: [year, monthIndex] pairs. */
export function monthsFrom(today: string, count: number): [number, number][] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: count }, (_, i) => [y + Math.floor((m + i) / 12), (m + i) % 12]);
}

/** First closed night on or after `from`, or null. */
export function firstClosedFrom(from: string, closed: ReadonlySet<string>, limit = 400): string | null {
  for (let i = 0; i < limit; i++) {
    const d = addDaysIso(from, i);
    if (closed.has(d)) return d;
  }
  return null;
}

export function canCheckIn(day: string, today: string, closed: ReadonlySet<string>): boolean {
  return day >= today && !closed.has(day);
}

/**
 * A check-out day must be after check-in with no closed night in between. The closed night itself
 * can be the check-out day: the guest leaves that morning.
 */
export function canCheckOut(day: string, from: string, closed: ReadonlySet<string>): boolean {
  if (day <= from) return false;
  const blocker = firstClosedFrom(addDaysIso(from, 1), closed, nightsIso(from, day));
  return blocker === null || blocker >= day;
}

export type Range = { from: string | null; to: string | null };

/**
 * What a tap does: the first tap (or a tap that cannot be a check-out) starts a new stay, the second
 * tap ends it. Returns the range unchanged when the day cannot be picked at all.
 */
export function pick(range: Range, day: string, today: string, closed: ReadonlySet<string>): Range {
  if (range.from && !range.to && canCheckOut(day, range.from, closed)) return { from: range.from, to: day };
  if (canCheckIn(day, today, closed)) return { from: day, to: null };
  return range;
}

/** Whether a day is selectable given the current half-picked range (for disabled styling). */
export function selectable(range: Range, day: string, today: string, closed: ReadonlySet<string>): boolean {
  if (range.from && !range.to && canCheckOut(day, range.from, closed)) return true;
  return canCheckIn(day, today, closed);
}
