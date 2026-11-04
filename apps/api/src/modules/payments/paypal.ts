/** Minimal PayPal Orders v2 client using the OWNER's REST app credentials. */
export interface PaypalCreds {
  clientId: string;
  clientSecret: string;
}

export interface PaypalOrder {
  id: string;
  status: string;
  purchase_units?: {
    reference_id?: string;
    custom_id?: string;
    amount?: { currency_code: string; value: string };
    payments?: { captures?: { id: string; status: string; amount: { currency_code: string; value: string } }[] };
  }[];
}

export class PaypalClient {
  constructor(
    private readonly creds: PaypalCreds,
    private readonly sandbox: boolean,
  ) {}

  private get base() {
    return this.sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  }

  private async token(): Promise<string> {
    const res = await fetch(`${this.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${this.creds.clientId}:${this.creds.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`PayPal auth failed: HTTP ${res.status}`);
    return ((await res.json()) as { access_token: string }).access_token;
  }

  private async call<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${await this.token()}`,
        'content-type': 'application/json',
        ...(idempotencyKey ? { 'paypal-request-id': idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { message?: string; details?: unknown };
    if (!res.ok) throw new Error(`PayPal ${method} ${path} failed: HTTP ${res.status} ${json.message ?? ''}`);
    return json;
  }

  createOrder(a: { reference: string; bookingId: string; currency: string; amount: string; description: string }) {
    return this.call<PaypalOrder>(
      'POST',
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: a.reference,
            custom_id: a.bookingId,
            description: a.description.slice(0, 127),
            amount: { currency_code: a.currency, value: a.amount },
          },
        ],
        payment_source: { paypal: { experience_context: { shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } } },
      },
      `${a.bookingId}-${a.amount}-${a.currency}-${Date.now()}`,
    );
  }

  getOrder(orderId: string) {
    return this.call<PaypalOrder>('GET', `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  }

  capture(orderId: string) {
    return this.call<PaypalOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, `capture-${orderId}`);
  }

  refund(captureId: string, amount: { currency_code: string; value: string }, key: string) {
    return this.call<{ id: string; status: string }>('POST', `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { amount }, key);
  }
}
