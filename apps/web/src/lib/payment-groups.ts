import type { GuestRegion } from './guest-locale';

export type GuestMethod = 'payhere' | 'paypal' | 'lankaqr' | 'bank';

/**
 * Payment options grouped by who is paying (spec §4.3). A method can sit in more than one group with
 * wording for that guest: PayHere is "Visa or Mastercard" from abroad and "Card, Genie or FriMi" at
 * home; LankaQR is UPI for Indian guests. The words live in i18n/guest/{en,si}/pay.ts under
 * `pay.groups.<region>` and `pay.options.<region>.<method>.{title,detail}`.
 */
const GROUPS: { region: GuestRegion; methods: GuestMethod[] }[] = [
  { region: 'abroad', methods: ['payhere', 'paypal', 'bank'] },
  { region: 'india', methods: ['lankaqr', 'payhere'] },
  { region: 'sri_lanka', methods: ['payhere', 'lankaqr', 'bank'] },
];

export interface PaymentGroup {
  region: GuestRegion;
  methods: GuestMethod[];
}

/** Groups with only the methods the owner connected, the guest's own group first; empty groups dropped. */
export function paymentGroups(enabled: readonly string[], region: GuestRegion): PaymentGroup[] {
  return GROUPS.map((g) => ({ ...g, methods: g.methods.filter((m) => enabled.includes(m)) }))
    .filter((g) => g.methods.length > 0)
    .sort((a, b) => Number(b.region === region) - Number(a.region === region));
}
