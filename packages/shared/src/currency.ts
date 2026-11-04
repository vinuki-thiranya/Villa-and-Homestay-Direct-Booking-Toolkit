import { FX_BUFFER_PCT } from './enums.js';

/** Units of each currency per 1 USD, e.g. { USD: 1, LKR: 300, EUR: 0.92 }. */
export type FxTable = Record<string, number>;

/**
 * Convert for display. Different currencies get the 1.5% buffer (spec §4.5) so the
 * shown price never undercuts what the gateway will actually charge.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: FxTable,
  bufferPct = FX_BUFFER_PCT,
): number {
  if (from === to) return amount;
  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) throw new Error(`No FX rate for ${from}->${to}`);
  const value = (amount / rFrom) * rTo * (1 + bufferPct / 100);
  return Math.round(value * 100) / 100;
}

/** Exact conversion without the display buffer, for charging in a gateway currency. */
export function convertExact(amount: number, from: string, to: string, rates: FxTable): number {
  return convert(amount, from, to, rates, 0);
}
