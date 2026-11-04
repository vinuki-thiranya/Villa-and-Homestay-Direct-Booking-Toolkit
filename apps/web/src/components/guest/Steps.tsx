import { Check } from 'lucide-react';

const STEPS = ['Dates', 'Details', 'Pay'];

/** Three-step progress indicator for checkout (dates → details → pay). */
export function Steps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={`Booking progress: step ${current + 1} of ${STEPS.length}, ${STEPS[current]}`}>
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                state === 'todo' ? 'border border-line text-muted' : state === 'done' ? 'bg-brand/15 text-brand' : 'bg-brand text-brand-fg'
              }`}
            >
              {state === 'done' ? <Check aria-hidden className="h-4 w-4" /> : i + 1}
              {state === 'done' && <span className="sr-only">Done:</span>}
            </span>
            <span className={state === 'todo' ? 'text-muted' : 'font-semibold'}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden className={`h-0.5 flex-1 rounded ${i < current ? 'bg-brand' : 'bg-line'}`} />}
          </li>
        );
      })}
    </ol>
  );
}
