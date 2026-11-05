'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CURRENCIES, isCurrency } from '@/lib/format';
import { setGuestCurrency, useGuestCurrency } from './Currency';
import { useGT } from './GuestI18n';

/**
 * Display currency. Prices on cached pages update in place (<Price>); the refresh re-quotes the
 * booking pages, which price on the server.
 */
export function CurrencySwitcher() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { currency } = useGuestCurrency();
  const t = useGT();
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="sr-only">{t('layout.currency')}</span>
      <select
        className="min-h-11 rounded-[var(--btn-radius,9999px)] border border-line bg-surface px-2 text-sm font-medium"
        value={currency}
        disabled={pending}
        onChange={(e) => {
          if (!isCurrency(e.target.value)) return;
          setGuestCurrency(e.target.value);
          start(() => router.refresh());
        }}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
