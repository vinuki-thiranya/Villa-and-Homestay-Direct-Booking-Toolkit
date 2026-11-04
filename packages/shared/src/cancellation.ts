import { diffDays } from './dates.js';
import type { CancellationPolicy } from './enums.js';
import { fromMinor, pctOf, toMinor } from './money.js';

export const CANCELLATION_POLICY_TEXT: Record<CancellationPolicy, string> = {
  flexible: 'Full refund if you cancel at least 7 days before arrival. No refund after that.',
  moderate: '50% refund if you cancel at least 14 days before arrival. No refund after that.',
  strict: 'The deposit is non-refundable. Any amount paid above the deposit is refunded.',
};

export interface RefundInput {
  policy: CancellationPolicy;
  /** Net amount the guest has paid so far (sum of confirmed payment rows). */
  paid: number;
  deposit: number;
  arrival: string;
  /** Property-local date of cancellation. */
  cancelledOn: string;
}

/** Amount to refund to the guest under the snapshotted policy (spec §4.4). */
export function refundDue({ policy, paid, deposit, arrival, cancelledOn }: RefundInput): number {
  const paidMinor = toMinor(paid);
  if (paidMinor <= 0) return 0;
  const daysBefore = diffDays(cancelledOn, arrival);
  switch (policy) {
    case 'flexible':
      return daysBefore >= 7 ? fromMinor(paidMinor) : 0;
    case 'moderate':
      return daysBefore >= 14 ? fromMinor(pctOf(paidMinor, 50)) : 0;
    case 'strict':
      return fromMinor(Math.max(0, paidMinor - toMinor(deposit)));
  }
}
