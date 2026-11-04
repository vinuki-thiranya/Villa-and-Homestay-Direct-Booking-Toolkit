'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Building2, CreditCard, QrCode, Wallet } from 'lucide-react';
import type { PaymentMethod, PaymentStart, PublicBooking } from '@staydirect/shared';
import { publicApi } from '@/lib/client-api';
import type { GuestKey } from '@/i18n/guest/t';
import { approxIn, formatMoney, type DisplayCurrency } from '@/lib/format';
import type { GuestRegion } from '@/lib/guest-locale';
import { paymentGroups, type GuestMethod, type PaymentGroup } from '@/lib/payment-groups';
import { useGT } from './GuestI18n';
import { rich } from './rich';

const ICON: Record<GuestMethod, typeof CreditCard> = { payhere: CreditCard, paypal: Wallet, lankaqr: QrCode, bank: Building2 };

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        style?: Record<string, string>;
        createOrder: () => Promise<string> | string;
        onApprove: () => Promise<void>;
        onError?: (err: unknown) => void;
      }) => { render: (el: HTMLElement) => Promise<void> };
    };
  }
}

export function PaymentPanel({
  booking,
  reference,
  token,
  onPaid,
  region,
  display,
}: {
  booking: PublicBooking;
  reference: string;
  token: string;
  onPaid: () => void;
  /** The guest's likely region from their currency: their payment group is shown first. */
  region: GuestRegion;
  display?: DisplayCurrency;
}) {
  const t = useGT();
  const [active, setActive] = useState<GuestMethod | null>(null);
  const [start, setStart] = useState<PaymentStart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groups = paymentGroups(booking.paymentMethods, region);
  const dueNow = Math.max(0, (booking.status === 'pending' ? booking.deposit : booking.total) - booking.paid);
  const [primary, ...others] = groups;

  async function choose(method: GuestMethod) {
    setActive(method);
    setStart(null);
    setError(null);
    setBusy(true);
    try {
      const res = await publicApi<PaymentStart>(`/public/bookings/${encodeURIComponent(reference)}/payments`, { json: { token, method } });
      if (res.method === 'payhere') {
        submitHostedForm(res.action, res.fields);
        return; // navigating away
      }
      setStart(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pay.startFailed'));
      onPaid();
    } finally {
      setBusy(false);
    }
  }

  if (!primary) {
    return (
      <div className="card p-6">
        <p>{t('pay.notSetUp')}</p>
      </div>
    );
  }

  return (
    <section className="card p-5" aria-labelledby="pay-h">
      <h2 id="pay-h" className="text-lg font-semibold" data-testid="pay-heading">
        {t('pay.heading')}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {rich(t('pay.dueNow'), { amount: <strong className="text-fg">{formatMoney(dueNow, booking.currency)}</strong> })}
        {approxIn(dueNow, booking.currency, display) && (
          <span> {t('pay.chargedIn', { approx: approxIn(dueNow, booking.currency, display)!, currency: booking.currency })}</span>
        )}
      </p>
      <Group group={primary} active={active} busy={busy} onChoose={choose} />
      {others.length > 0 && (
        <details className="mt-4 rounded-card border border-line" open={!!active && !primary.methods.includes(active)}>
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-semibold">{t('pay.somewhereElse')}</summary>
          <div className="space-y-5 px-4 pb-4">
            {others.map((g) => (
              <Group key={g.region} group={g} active={active} busy={busy} onChoose={choose} />
            ))}
          </div>
        </details>
      )}

      {busy && (
        <p className="mt-4 text-sm text-muted" role="status">
          {t('pay.preparing')}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {start?.method === 'paypal' && <PaypalButtons start={start} reference={reference} token={token} onDone={onPaid} onError={setError} />}
      {start?.method === 'lankaqr' && (
        <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr]">
          <div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-xl border border-line bg-white">
            <Image src={start.qrImageUrl} alt={t('pay.qr.alt', { merchant: start.merchantName })} fill sizes="220px" className="object-contain p-2" unoptimized />
          </div>
          <div className="space-y-2 text-sm">
            <p>
              {rich(t('pay.qr.scan'), {
                amount: <strong className="text-base">{formatMoney(Number(start.amount), 'LKR')}</strong>,
                merchant: <strong>{start.merchantName}</strong>,
              })}
            </p>
            <p>{rich(t('pay.qr.note'), { reference: <strong className="font-mono">{start.reference}</strong> })}</p>
            <p className="text-muted">{t('pay.qr.held', { time: t.dateTime(start.holdExpiresAt) })}</p>
            <SlipUpload reference={reference} token={token} method="lankaqr" onUploaded={onPaid} />
          </div>
        </div>
      )}
      {start?.method === 'bank' && (
        <div className="mt-5 space-y-3 text-sm">
          <dl className="grid gap-2 rounded-xl bg-surface-2 p-4 sm:grid-cols-2">
            <Detail label={t('pay.bank.accountName')} value={start.accountName} />
            <Detail label={t('pay.bank.bank')} value={start.bankName} />
            <Detail label={t('pay.bank.accountNumber')} value={start.accountNumber} mono />
            {start.branch && <Detail label={t('pay.bank.branch')} value={start.branch} />}
            {start.swift && <Detail label="SWIFT" value={start.swift} mono />}
            <Detail label={t('pay.bank.amount')} value={formatMoney(Number(start.amount), start.currency)} />
            <Detail label={t('pay.bank.reference')} value={start.reference} mono />
          </dl>
          {start.notes && <p className="text-muted">{start.notes}</p>}
          <p className="text-muted">{t('pay.bank.held', { time: t.dateTime(start.holdExpiresAt) })}</p>
          <SlipUpload reference={reference} token={token} method="bank" onUploaded={onPaid} />
        </div>
      )}
      <p className="mt-5 text-xs text-muted">{t('pay.direct', { property: booking.propertyName })}</p>
    </section>
  );
}

function Group({
  group,
  active,
  busy,
  onChoose,
}: {
  group: PaymentGroup;
  active: GuestMethod | null;
  busy: boolean;
  onChoose: (m: GuestMethod) => void;
}) {
  const t = useGT();
  return (
    <div className="mt-4">
      <h3 id={`pay-${group.region}`} className="text-sm font-semibold text-muted">
        {t(`pay.groups.${group.region}`)}
      </h3>
      <div className="mt-2 grid gap-2" role="radiogroup" aria-labelledby={`pay-${group.region}`}>
        {group.methods.map((method) => {
          const Icon = ICON[method];
          const selected = active === method;
          const option = `pay.options.${group.region}.${method}`;
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => onChoose(method)}
              className={`flex min-h-16 w-full items-center gap-4 rounded-card border p-4 text-left transition-colors ${
                selected ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-line hover:border-brand/60'
              }`}
            >
              <Icon aria-hidden className="h-6 w-6 shrink-0 text-brand" />
              <span>
                <span className="block font-semibold">{t(`${option}.title` as GuestKey)}</span>
                <span className="block text-sm text-muted">{t(`${option}.detail` as GuestKey)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={`font-semibold ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

function submitHostedForm(action: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

function loadPaypal(clientId: string, currency: string, failed: string): Promise<void> {
  const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`;
  const existing = document.querySelector<HTMLScriptElement>(`script[data-paypal-sdk="${currency}"]`);
  if (existing && window.paypal) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.paypalSdk = currency;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(failed));
    document.head.appendChild(s);
  });
}

function PaypalButtons({
  start,
  reference,
  token,
  onDone,
  onError,
}: {
  start: Extract<PaymentStart, { method: 'paypal' }>;
  reference: string;
  token: string;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const t = useGT();
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadPaypal(start.clientId, start.currency, t('pay.paypal.loadFailed'))
      .then(() => {
        if (cancelled || !ref.current || !window.paypal) return;
        ref.current.innerHTML = '';
        return window.paypal
          .Buttons({
            style: { layout: 'vertical', shape: 'pill', label: 'pay' },
            createOrder: () => start.orderId,
            onApprove: async () => {
              try {
                await publicApi(`/public/bookings/${encodeURIComponent(reference)}/paypal/capture`, { json: { token, orderId: start.orderId } });
                onDone();
              } catch (err) {
                onError(err instanceof Error ? err.message : t('pay.paypal.captureFailed'));
              }
            },
            onError: () => onError(t('pay.paypal.error')),
          })
          .render(ref.current)
          .then(() => setReady(true));
      })
      .catch((err: Error) => onError(err.message));
    return () => {
      cancelled = true;
    };
  }, [start, reference, token, onDone, onError, t]);
  return (
    <div className="mt-5">
      <p className="mb-3 text-sm">{rich(t('pay.paypal.amount'), { amount: <strong>{formatMoney(Number(start.amount), start.currency)}</strong> })}</p>
      {!ready && <div className="h-24 animate-pulse rounded-xl bg-surface-2" aria-hidden />}
      <div ref={ref} />
    </div>
  );
}

function SlipUpload({ reference, token, method, onUploaded }: { reference: string; token: string; method: 'bank' | 'lankaqr'; onUploaded: () => void }) {
  const t = useGT();
  const [state, setState] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  if (state === 'done') {
    return (
      <p className="rounded-xl bg-ok-bg p-3 font-medium text-ok" role="status">
        {t('pay.slip.received')}
      </p>
    );
  }
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set('token', token);
        fd.set('method', method);
        setState('uploading');
        setError(null);
        try {
          await publicApi(`/public/bookings/${encodeURIComponent(reference)}/slip`, { form: fd });
          setState('done');
          onUploaded();
        } catch (err) {
          setState('idle');
          setError(err instanceof Error ? err.message : t('pay.slip.failed'));
        }
      }}
    >
      <label htmlFor={`slip-${method}`} className="label">
        {t('pay.slip.label')}
      </label>
      <input id={`slip-${method}`} name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="field py-2" />
      <button type="submit" className="btn-primary" disabled={state === 'uploading'}>
        {state === 'uploading' ? t('pay.slip.uploading') : t('pay.slip.upload')}
      </button>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
