'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, MapPin, MessageCircle } from 'lucide-react';
import type { PublicBooking } from '@staydirect/shared';
import { publicApi } from '@/lib/client-api';
import { fmtDate, formatMoney, nightsLabel, waLink } from '@/lib/format';
import { PaymentPanel } from './PaymentPanel';
import { Steps } from './Steps';

interface Props {
  reference: string;
  token: string;
  base: string;
  returnedFromPayment: boolean;
  propertyName: string;
  paypalClientId: string | null;
}

export function BookingView({ reference, token, base, returnedFromPayment, propertyName }: Props) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await publicApi<PublicBooking>(`/public/bookings/${encodeURIComponent(reference)}?t=${encodeURIComponent(token)}`);
      setBooking(b);
      setError(null);
      return b;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the booking');
      return null;
    }
  }, [reference, token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Back from PayHere: the webhook usually lands within seconds. Poll for up to two minutes.
  useEffect(() => {
    if (!returnedFromPayment || !booking || booking.status !== 'pending') return;
    let n = 0;
    const id = setInterval(async () => {
      n++;
      const b = await load();
      if (!b || b.status !== 'pending' || n > 24) clearInterval(id);
    }, 5_000);
    return () => clearInterval(id);
  }, [returnedFromPayment, booking?.status, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !booking) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Booking not found</h1>
        <p className="mt-2 text-muted">Check the link in your email, or contact {propertyName}.</p>
      </div>
    );
  }
  if (!booking) return <div className="card h-64 animate-pulse" aria-busy="true" aria-label="Loading booking" />;

  const b = booking;
  const confirmed = ['confirmed', 'checked_in', 'checked_out'].includes(b.status);

  if (confirmed) return <Confirmation b={b} reference={reference} token={token} onPaid={load} />;

  if (b.status === 'abandoned' || b.status === 'cancelled' || b.status === 'no_show') {
    return (
      <div className="card space-y-3 p-6">
        <h1 className="text-xl font-semibold">{b.status === 'abandoned' ? 'This reservation hold expired' : 'This booking was cancelled'}</h1>
        <p className="text-muted">
          {b.roomName}, {fmtDate(b.from)} → {fmtDate(b.to)}. {b.status === 'abandoned' ? 'If the dates are still free you can book them again.' : ''}
        </p>
        <Link href={`${base}/book?from=${b.from}&to=${b.to}&guests=${b.guests}`} className="btn-primary">
          Check availability again
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Steps current={2} />
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Reference {b.reference}</p>
            <h1 className="font-display text-2xl font-semibold">{b.roomName}</h1>
            <p className="text-muted">
              {fmtDate(b.from)} → {fmtDate(b.to)} · {b.guests} guest{b.guests === 1 ? '' : 's'}
            </p>
          </div>
          {b.holdExpiresAt && !b.awaitingApproval && <Countdown until={b.holdExpiresAt} onExpire={load} />}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <Fact label="Total" value={formatMoney(b.total, b.currency)} />
          <Fact label="Deposit now" value={formatMoney(Math.max(0, b.deposit - b.paid), b.currency)} strong />
          <Fact label="Balance later" value={formatMoney(Math.max(0, b.total - b.deposit), b.currency)} />
          <Fact label="Balance due" value={fmtDate(b.balanceDueDate)} />
        </dl>
        <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
          <strong>Cancellation policy:</strong> {b.cancellationPolicyText}
        </p>
      </div>

      {b.awaitingApproval ? (
        <div className="card p-6" role="status">
          <h2 className="text-lg font-semibold">Request sent to {b.propertyName}</h2>
          <p className="mt-2 text-muted">
            The host will reply within 12 hours. We&apos;ll email you a payment link as soon as they accept — your dates are held until then.
          </p>
        </div>
      ) : returnedFromPayment ? (
        <div className="card p-6" role="status" aria-live="polite">
          <h2 className="text-lg font-semibold">Confirming your payment…</h2>
          <p className="mt-2 text-muted">This usually takes a few seconds. You can keep this page open.</p>
        </div>
      ) : (
        <PaymentPanel booking={b} reference={reference} token={token} onPaid={load} />
      )}
    </div>
  );
}

function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? 'text-base font-semibold' : 'font-medium'}>{value}</dd>
    </div>
  );
}

function Countdown({ until, onExpire }: { until: string; onExpire: () => void }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(until).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(id);
        onExpire();
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [until, onExpire]);
  const s = Math.max(0, Math.floor(left / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const text = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(s % 60).padStart(2, '0')}`;
  return (
    <p className={`pill gap-1 ${s < 180 ? 'bg-warn-bg text-warn' : 'bg-surface-2 text-fg'}`} aria-live="off">
      <Clock aria-hidden className="h-3.5 w-3.5" /> Held for {text}
    </p>
  );
}

/** Mirrors the confirmation email/WhatsApp message. */
function Confirmation({ b, reference, token, onPaid }: { b: PublicBooking; reference: string; token: string; onPaid: () => void }) {
  const wa = waLink(b.hostWhatsapp, `Hello, this is ${b.guestName} — booking ${b.reference}.`);
  const nights = Math.round((new Date(`${b.to}T00:00:00Z`).getTime() - new Date(`${b.from}T00:00:00Z`).getTime()) / 86_400_000);
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <CheckCircle2 aria-hidden className="h-10 w-10 text-ok" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Your stay at {b.propertyName} is confirmed</h1>
        <p className="mt-1 text-muted">
          Thank you for booking direct, {b.guestName.split(' ')[0]}. We&apos;ve emailed you the details. Reference <strong className="text-fg">{b.reference}</strong>.
        </p>
        <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <Fact label="Dates" value={`${fmtDate(b.from)} → ${fmtDate(b.to)} (${nightsLabel(nights)})`} />
          <Fact label="Room" value={`${b.roomName} · ${b.guests} guest${b.guests === 1 ? '' : 's'}`} />
          <Fact label="Paid" value={formatMoney(b.paid, b.currency)} />
          <Fact label="Balance due" value={b.balance > 0 ? `${formatMoney(b.balance, b.currency)} by ${fmtDate(b.balanceDueDate)}` : 'Nothing — fully paid'} />
          <Fact label="Check-in / out" value={`from ${b.checkIn} · by ${b.checkOut}`} />
          <Fact label="Address" value={b.address} />
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          {b.mapsUrl && (
            <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <MapPin aria-hidden className="h-4 w-4" /> Directions
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <MessageCircle aria-hidden className="h-4 w-4" /> WhatsApp the host
            </a>
          )}
        </div>
        <p className="mt-5 text-sm text-muted">
          <strong className="text-fg">Cancellation policy:</strong> {b.cancellationPolicyText}
        </p>
      </div>
      {b.balance > 0 && b.status !== 'checked_out' && b.paymentMethods.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold">Pay the balance now</summary>
          <div className="mt-4">
            <PaymentPanel booking={b} reference={reference} token={token} onPaid={onPaid} />
          </div>
        </details>
      )}
    </div>
  );
}

