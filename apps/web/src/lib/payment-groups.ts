import type { GuestRegion } from './guest-locale';

export type GuestMethod = 'payhere' | 'paypal' | 'lankaqr' | 'bank';

export interface PaymentOption {
  method: GuestMethod;
  title: string;
  detail: string;
}

export interface PaymentGroup {
  region: GuestRegion;
  title: string;
  options: PaymentOption[];
}

/**
 * Payment options grouped by who is paying (spec §4.3). A method can sit in more than one group with
 * wording for that guest: PayHere is "Visa or Mastercard" from abroad and "Card, Genie or FriMi" at
 * home; LankaQR is UPI for Indian guests.
 */
const GROUPS: PaymentGroup[] = [
  {
    region: 'abroad',
    title: 'Paying from abroad',
    options: [
      { method: 'payhere', title: 'Card', detail: 'Visa or Mastercard on the secure PayHere page' },
      { method: 'paypal', title: 'PayPal', detail: 'Your PayPal balance or any card, in USD, EUR or GBP' },
      { method: 'bank', title: 'Bank transfer or Wise', detail: 'Transfer, then upload the slip; the host confirms' },
    ],
  },
  {
    region: 'india',
    title: 'Paying from India',
    options: [
      { method: 'lankaqr', title: 'UPI', detail: 'Scan the LankaQR code with GPay, PhonePe or Paytm' },
      { method: 'payhere', title: 'Card', detail: 'Visa or Mastercard on the secure PayHere page' },
    ],
  },
  {
    region: 'sri_lanka',
    title: 'Paying in Sri Lanka',
    options: [
      { method: 'payhere', title: 'Card, Genie or FriMi', detail: 'Sri Lankan cards and wallets on PayHere' },
      { method: 'lankaqr', title: 'LankaQR', detail: 'Scan with any Sri Lankan banking app' },
      { method: 'bank', title: 'Bank transfer', detail: 'Transfer, then upload the slip; the host confirms' },
    ],
  },
];

/** Groups with only the methods the owner connected, the guest's own group first; empty groups dropped. */
export function paymentGroups(enabled: readonly string[], region: GuestRegion): PaymentGroup[] {
  return GROUPS.map((g) => ({ ...g, options: g.options.filter((o) => enabled.includes(o.method)) }))
    .filter((g) => g.options.length > 0)
    .sort((a, b) => Number(b.region === region) - Number(a.region === region));
}
