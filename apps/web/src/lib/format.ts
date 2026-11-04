import type { FxTable } from '@staydirect/shared';

/*
 * Client-safe copies of shared/currency.ts + shared/money.ts. Importing runtime values from
 * @staydirect/shared would pull zod into the guest bundle (the package is not marked side-effect free).
 */
const FX_BUFFER_PCT = 1.5;

export function convert(amount: number, from: string, to: string, rates: FxTable): number {
  if (from === to) return amount;
  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) throw new Error(`No FX rate for ${from}->${to}`);
  return Math.round((amount / rFrom) * rTo * (1 + FX_BUFFER_PCT / 100) * 100) / 100;
}

export function formatMoney(amount: number, currency: string): string {
  const zero = currency === 'LKR' || currency === 'INR';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: zero ? 0 : 2,
    minimumFractionDigits: zero ? 0 : 2,
  }).format(amount);
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'LKR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && (CURRENCIES as readonly string[]).includes(v);
}

/** Price in the guest's display currency; returns the label and whether it is approximate. */
export function displayPrice(amount: number, base: string, target: string, fx: FxTable): { text: string; approx: boolean } {
  if (base === target) return { text: formatMoney(amount, base), approx: false };
  try {
    return { text: formatMoney(convert(amount, base, target, fx), target), approx: true };
  } catch {
    return { text: formatMoney(amount, base), approx: false };
  }
}

/** The guest's display currency and today's rates, for "≈ £76.80" next to an exact charge. */
export interface DisplayCurrency {
  currency: string;
  fx: FxTable;
}

/** "≈ £76.80" when the guest browses in another currency than the charge; null when they match. */
export function approxIn(amount: number, charged: string, display: DisplayCurrency | null | undefined): string | null {
  if (!display || display.currency === charged) return null;
  const p = displayPrice(amount, charged, display.currency, display.fx);
  return p.approx ? `≈ ${p.text}` : null;
}

export function money(amount: number, currency: string): string {
  return formatMoney(amount, currency);
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const SHORT_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const WEEKDAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return DATE_FMT.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function fmtShort(iso: string): string {
  return SHORT_FMT.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function fmtWeekday(iso: string): string {
  return WEEKDAY_FMT.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function nightsLabel(n: number): string {
  return `${n} night${n === 1 ? '' : 's'}`;
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  villa: 'Villa',
  guesthouse: 'Guesthouse',
  homestay: 'Homestay',
  surf_camp: 'Surf camp',
  boutique_hotel: 'Boutique hotel',
  bungalow: 'Bungalow',
};

export const SOURCE_LABEL: Record<string, string> = {
  direct: 'Direct',
  airbnb: 'Airbnb',
  booking_com: 'Booking.com',
  agoda: 'Agoda',
  vrbo: 'Vrbo',
  other: 'Other OTA',
  manual: 'Manual block',
};

export const METHOD_LABEL: Record<string, string> = {
  payhere: 'PayHere',
  paypal: 'PayPal',
  lankaqr: 'LankaQR',
  bank: 'Bank transfer',
  cash: 'Cash',
};

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  abandoned: 'Abandoned',
};

export function waLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
