'use client';

import { Check } from 'lucide-react';
import { useGT } from './GuestI18n';

const STEPS = ['dates', 'details', 'pay'] as const;

/** Three-step progress indicator for checkout (dates → details → pay). */
export function Steps({ current }: { current: 0 | 1 | 2 }) {
  const t = useGT();
  const labels = STEPS.map((s) => t(`book.steps.${s}`));
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={t('book.steps.progress', { n: current + 1, total: STEPS.length, step: labels[current]! })}>
      {labels.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={STEPS[i]} className="flex flex-1 items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                state === 'todo' ? 'border border-line text-muted' : state === 'done' ? 'bg-brand/15 text-brand' : 'bg-brand text-brand-fg'
              }`}
            >
              {state === 'done' ? <Check aria-hidden className="h-4 w-4" /> : i + 1}
              {state === 'done' && <span className="sr-only">{t('book.steps.done')}</span>}
            </span>
            <span className={state === 'todo' ? 'text-muted' : 'font-semibold'}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden className={`h-0.5 flex-1 rounded ${i < current ? 'bg-brand' : 'bg-line'}`} />}
          </li>
        );
      })}
    </ol>
  );
}
