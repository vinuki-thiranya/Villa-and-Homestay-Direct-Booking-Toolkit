/**
 * Money is numeric(12,2) in Postgres and integer minor units (cents) in JS maths.
 * Convert at the edges with toMinor/fromMinor; never add floats.
 */
export function toMinor(amount: number | string): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${amount}`);
  return Math.round(n * 100);
}

export function fromMinor(minor: number): number {
  return Math.round(minor) / 100;
}

/** Fixed two-decimal string, e.g. for PayHere hashes and SQL numeric params. */
export function minorToFixed(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minor));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function pctOf(minor: number, pct: number): number {
  return Math.round((minor * pct) / 100);
}

export function formatMoney(amount: number, currency: string, locale = 'en-US'): string {
  const zeroDecimals = currency === 'LKR' || currency === 'INR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
    minimumFractionDigits: zeroDecimals ? 0 : 2,
  }).format(amount);
}
