'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CURRENCIES } from '@/lib/format';

export function CurrencySwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="sr-only">Currency</span>
      <select
        className="min-h-9 rounded-full border border-line bg-surface px-2 text-sm font-medium"
        value={current}
        disabled={pending}
        onChange={(e) => {
          document.cookie = `sd_cur=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
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
