'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Clock, Map as MapIcon, MapPin, MessageCircle } from 'lucide-react';
import type { PublicBooking } from '@staydirect/shared';
import { publicApi } from '@/lib/client-api';
import { approxIn, formatMoney, waLink, type DisplayCurrency } from '@/lib/format';
import { policyText } from '@/lib/guest-copy';
import type { GuestRegion } from '@/lib/guest-locale';
import { AddOnsPanel } from './AddOnsPanel';
import { useGT } from './GuestI18n';
import { GuestInvoices } from './GuestInvoices';
import { PaymentPanel } from './PaymentPanel';
import { rich } from './rich';
import { Steps } from './Steps';

interface Props {
  reference: string;
  token: string;
  base: string;
  returnedFromPayment: boolean;
  propertyName: string;
  paypalClientId: string | null;
  region: GuestRegion;
  /** lat,lng or address for the tap-to-load map. */
  mapQuery: string | null;
  /** The guest's browsing currency: approximate amounts beside the exact charge. */
  display: DisplayCurrency;
}

export function BookingView({ reference, token, base, returnedFromPayment, propertyName, region, mapQuery, display }: Props) {
  const t = useGT();
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await publicApi<PublicBooking>(`/public/bookings/${encodeURIComponent(reference)}?t=${encodeURIComponent(token)}`);
      setBooking(b);
      setError(null);
      return b;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('booking.loadFailed'));
      return null;
    }
  }, [reference, token, t]);

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
        <h1 className="text-xl font-semibold">{t('booking.notFound')}</h1>
        <p className="mt-2 text-muted">{t('booking.notFoundHint', { property: propertyName })}</p>
      </div>
    );
  }
  if (!booking) return <div className="card h-64 animate-pulse" aria-busy="true" aria-label={t('booking.loading')} />;

  const b = booking;
  const confirmed = ['confirmed', 'checked_in', 'checked_out'].includes(b.status);

  if (confirmed) return <Confirmation b={b} reference={reference} token={token} onPaid={load} region={region} mapQuery={mapQuery} display={display} />;

  if (b.status === 'abandoned' || b.status === 'cancelled' || b.status === 'no_show') {
    return (
      <div className="card space-y-3 p-6">
        <h1 className="text-xl font-semibold">{b.status === 'abandoned' ? t('booking.expired') : t('booking.cancelled')}</h1>
        <p className="text-muted">
          {t('booking.stay', { room: b.roomName, from: t.date(b.from), to: t.date(b.to) })} {b.status === 'abandoned' ? t('booking.expiredHint') : ''}
        </p>
        <Link href={`${base}/book?from=${b.from}&to=${b.to}&guests=${b.guests}`} className="btn-primary">
          {t('booking.checkAgain')}
        </Link>
      </div>
    );
  }

  const depositNow = Math.max(0, b.deposit - b.paid);
  const balanceLater = Math.max(0, b.total - b.deposit);
  return (
    <div className="space-y-6">
      <Steps current={2} />
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{t('booking.reference', { reference: b.reference })}</p>
            <h1 className="g-display text-3xl">{b.roomName}</h1>
            <p className="text-muted">{t('booking.datesGuests', { from: t.date(b.from), to: t.date(b.to), guests: t.n('common.guests', b.guests) })}</p>
          </div>
          {b.holdExpiresAt && !b.awaitingApproval && <Countdown until={b.holdExpiresAt} onExpire={load} />}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <Fact label={t('booking.facts.total')} value={formatMoney(b.total, b.currency)} note={approxIn(b.total, b.currency, display)} />
          <Fact label={t('booking.facts.depositNow')} value={formatMoney(depositNow, b.currency)} note={approxIn(depositNow, b.currency, display)} strong />
          <Fact label={t('booking.facts.balanceLater')} value={formatMoney(balanceLater, b.currency)} note={approxIn(balanceLater, b.currency, display)} />
          <Fact label={t('booking.facts.balanceDue')} value={t.date(b.balanceDueDate)} />
        </dl>
        <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
          <strong>{t('booking.policyLabel')}</strong> {policyText(t, b.cancellationPolicy) || b.cancellationPolicyText}
        </p>
      </div>

      {b.awaitingApproval ? (
        <div className="card p-6" role="status">
          <h2 className="text-lg font-semibold">{t('booking.requestSent', { property: b.propertyName })}</h2>
          <p className="mt-2 text-muted">{t('booking.requestHint')}</p>
        </div>
      ) : returnedFromPayment ? (
        <div className="card p-6" role="status" aria-live="polite">
          <h2 className="text-lg font-semibold">{t('booking.confirming')}</h2>
          <p className="mt-2 text-muted">{t('booking.confirmingHint')}</p>
        </div>
      ) : (
        <PaymentPanel booking={b} reference={reference} token={token} onPaid={load} region={region} display={display} />
      )}
    </div>
  );
}

function Fact({ label, value, strong, note }: { label: string; value: string; strong?: boolean; note?: string | null }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? 'text-base font-semibold' : 'font-medium'}>{value}</dd>
      {note && <dd className="text-xs text-muted">{note}</dd>}
    </div>
  );
}

function Countdown({ until, onExpire }: { until: string; onExpire: () => void }) {
  const t = useGT();
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
      <Clock aria-hidden className="h-3.5 w-3.5" /> {t('booking.heldFor', { time: text })}
    </p>
  );
}

/** Confirmed: the same words the guest just got on WhatsApp, then how to get there. */
function Confirmation({
  b,
  reference,
  token,
  onPaid,
  region,
  mapQuery,
  display,
}: {
  b: PublicBooking;
  reference: string;
  token: string;
  onPaid: () => void;
  region: GuestRegion;
  mapQuery: string | null;
  display: DisplayCurrency;
}) {
  const t = useGT();
  const wa = waLink(b.hostWhatsapp, t('booking.confirmed.whatsappHello', { name: b.guestName, reference: b.reference }));
  const nights = Math.round((new Date(`${b.to}T00:00:00Z`).getTime() - new Date(`${b.from}T00:00:00Z`).getTime()) / 86_400_000);
  const [map, setMap] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="g-display text-3xl leading-tight sm:text-4xl" data-testid="booked-heading">
          {t('booking.confirmed.title', { property: b.propertyName })}
        </h1>
        <p className="mt-2 text-muted">
          {rich(t('booking.confirmed.thanks'), { name: b.guestName.split(' ')[0], reference: <strong className="text-fg">{b.reference}</strong> })}
        </p>
      </div>

      <figure className="g-chat overflow-hidden rounded-card border border-line p-4">
        <figcaption className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
          <MessageCircle aria-hidden className="h-4 w-4 text-[#1f9d55]" /> {t('booking.confirmed.whatsappFrom', { property: b.propertyName })}
        </figcaption>
        <div className="g-bubble ml-2 max-w-[34rem] px-4 py-3 shadow-sm">
          <p className="whitespace-pre-line break-words text-[0.95rem] leading-relaxed">{linkify(b.confirmationMessage)}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[0.7rem] text-muted">
            <CheckCheck aria-hidden className="h-3.5 w-3.5 text-[#34b7f1]" /> {t('booking.confirmed.sent')}
          </p>
        </div>
      </figure>

      <div className="card p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Fact label={t('booking.confirmed.dates')} value={t('booking.confirmed.datesValue', { from: t.date(b.from), to: t.date(b.to), nights: t.n('common.nights', nights) })} />
          <Fact label={t('booking.confirmed.room')} value={t('booking.confirmed.roomValue', { room: b.roomName, guests: t.n('common.guests', b.guests) })} />
          <Fact label={t('booking.confirmed.paid')} value={formatMoney(b.paid, b.currency)} />
          <Fact
            label={t('booking.confirmed.stillToPay')}
            value={
              b.balance > 0
                ? t('booking.confirmed.stillToPayValue', { amount: formatMoney(b.balance, b.currency), date: t.date(b.balanceDueDate) })
                : t('booking.confirmed.fullyPaid')
            }
            note={b.balance > 0 ? approxIn(b.balance, b.currency, display) : null}
            strong={b.balance > 0}
          />
          <Fact label={t('booking.confirmed.checkIn')} value={t('booking.confirmed.checkInValue', { time: b.checkIn })} />
          <Fact label={t('booking.confirmed.checkOut')} value={t('booking.confirmed.checkOutValue', { time: b.checkOut })} />
        </dl>
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
          <strong className="text-fg">{t('booking.policyLabel')}</strong> {policyText(t, b.cancellationPolicy) || b.cancellationPolicyText}
        </p>
      </div>

      <section className="card overflow-hidden" aria-labelledby="getting-there">
        <div className="p-5">
          <h2 id="getting-there" className="g-display text-2xl">
            {t('booking.confirmed.gettingThere')}
          </h2>
          <p className="mt-1 text-sm text-muted">{b.address}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {b.mapsUrl && (
              <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer" className="g-cta">
                <MapPin aria-hidden className="h-4 w-4" /> {t('booking.confirmed.directions')}
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <MessageCircle aria-hidden className="h-4 w-4" /> {t('booking.confirmed.whatsappHost')}
              </a>
            )}
          </div>
        </div>
        {mapQuery &&
          (map ? (
            <iframe
              title={t('booking.confirmed.mapTitle', { property: b.propertyName })}
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
              className="aspect-[4/3] w-full border-0 sm:aspect-[16/9]"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <button
              type="button"
              onClick={() => setMap(true)}
              className="flex min-h-14 w-full items-center justify-center gap-2 border-t border-line bg-surface-2 text-sm font-semibold hover:bg-surface-2/70"
            >
              <MapIcon aria-hidden className="h-4 w-4" /> {t('booking.confirmed.showMap')}
            </button>
          ))}
      </section>

      {['confirmed', 'checked_in', 'checked_out'].includes(b.status) && <GuestInvoices reference={reference} token={token} />}
      {(b.status === 'confirmed' || b.status === 'checked_in') && <AddOnsPanel reference={reference} token={token} onOrdered={onPaid} />}
      {b.balance > 0 && b.status !== 'checked_out' && b.paymentMethods.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold">{t('booking.confirmed.payBalance')}</summary>
          <div className="mt-4">
            <PaymentPanel booking={b} reference={reference} token={token} onPaid={onPaid} region={region} display={display} />
          </div>
        </details>
      )}
    </div>
  );
}

/** Make the booking-page link in the WhatsApp text tappable, as it is in WhatsApp. */
function linkify(text: string): React.ReactNode[] {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} className="break-all text-[#027eb5] underline underline-offset-2">
        {part}
      </a>
    ) : (
      part
    ),
  );
}
