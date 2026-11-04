import { minorToFixed, toMinor } from '@staydirect/shared';
import { timingSafeEqual } from 'node:crypto';
import { md5Upper } from '../../common/crypto.js';

/** PayHere hosted checkout (https://support.payhere.lk/api-&-mobile-sdk/checkout-api). */
export function payhereCheckoutUrl(sandbox: boolean): string {
  return sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout';
}

/** hash = UPPER(md5(merchant_id + order_id + amount + currency + UPPER(md5(merchant_secret)))) */
export function payhereCheckoutHash(merchantId: string, orderId: string, amount: string, currency: string, secret: string): string {
  return md5Upper(merchantId + orderId + amount + currency + md5Upper(secret));
}

export interface PayhereNotify {
  merchant_id: string;
  order_id: string;
  payment_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  method?: string;
  status_message?: string;
  custom_1?: string;
  custom_2?: string;
}

/** md5sig = UPPER(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + UPPER(md5(secret)))) */
export function verifyPayhereNotify(n: PayhereNotify, merchantSecret: string): boolean {
  if (!n?.md5sig || !n.merchant_id || !n.order_id) return false;
  const expected = md5Upper(
    n.merchant_id + n.order_id + n.payhere_amount + n.payhere_currency + n.status_code + md5Upper(merchantSecret),
  );
  const a = Buffer.from(expected);
  const b = Buffer.from(String(n.md5sig).toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** PayHere expects exactly two decimals, no thousands separators. */
export function payhereAmount(amount: number): string {
  return minorToFixed(toMinor(amount));
}

export const PAYHERE_STATUS = { SUCCESS: '2', PENDING: '0', CANCELLED: '-1', FAILED: '-2', CHARGEDBACK: '-3' } as const;
