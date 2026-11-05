'use client';

import type { FxTable } from '@staydirect/shared';
import { createContext, useContext, useSyncExternalStore } from 'react';
import { displayPrice, isCurrency, type Currency } from '@/lib/format';

/*
 * The guest's display currency. proxy.ts puts it in the cached page's key (the sd_cur cookie, first set
 * from their country), so the server already renders it; the browser only takes over when the guest
 * switches currency on the page.
 */

interface CurrencyState {
  fallback: Currency;
  fx: FxTable;
}

const Ctx = createContext<CurrencyState>({ fallback: 'USD', fx: {} });
const listeners = new Set<() => void>();

function readCookie(): Currency | null {
  const m = /(?:^|;\s*)sd_cur=([A-Z]{3})/.exec(document.cookie);
  return m && isCurrency(m[1]) ? m[1] : null;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function GuestCurrencyProvider({ fallback, fx, children }: CurrencyState & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ fallback, fx }}>{children}</Ctx.Provider>;
}

/** The currency to show prices in, and today's rates. */
export function useGuestCurrency(): { currency: Currency; fx: FxTable } {
  const { fallback, fx } = useContext(Ctx);
  const currency = useSyncExternalStore(
    subscribe,
    () => readCookie() ?? fallback,
    () => fallback,
  );
  return { currency, fx };
}

/** Saves the guest's currency for every page and updates prices already on screen. */
export function setGuestCurrency(c: Currency) {
  document.cookie = `sd_cur=${c}; path=/; max-age=31536000; samesite=lax`;
  listeners.forEach((l) => l());
}

/** A rate in the guest's currency: "≈ €41.20" when converted, the exact amount when not. */
export function Price({ amount, from }: { amount: number; from: string }) {
  const { currency, fx } = useGuestCurrency();
  const p = displayPrice(amount, from, currency, fx);
  return (
    <span className="tabular-nums">
      {p.approx && '≈ '}
      {p.text}
    </span>
  );
}
