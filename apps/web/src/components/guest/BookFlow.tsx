'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AvailabilityResult,
  CreateBookingResult,
  PaymentMethod,
  PublicRoom,
  RoomAvailability,
} from '@staydirect/shared';
import { ClientApiError, publicApi } from '@/lib/client-api';
import { formatMoney, METHOD_LABEL, nightsLabel } from '@/lib/format';
import { COUNTRIES, LANGUAGES, POLICY_TEXT, violationText } from '@/lib/guest-copy';
import { Steps } from './Steps';

interface Props {
  site: string;
  base: string;
  currency: string;
  property: {
    name: string;
    baseCurrency: string;
    defaultDepositPct: number;
    rooms: PublicRoom[];
    fx: Record<string, number>;
    paymentMethods: PaymentMethod[];
  };
  initial: { from?: string; to?: string; guests: number; roomId?: string };
}

const todayIso = () => new Date().toISOString().slice(0, 10);
function plusDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function BookFlow({ site, base, currency, property, initial }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [guests, setGuests] = useState(initial.guests);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const maxGuests = Math.max(1, ...property.rooms.map((r) => r.maxGuests));

  const search = useCallback(
    async (f: string, t: string, g: number) => {
      if (!f || !t) return;
      if (t <= f) {
        setError('Check-out must be after check-in.');
        return;
      }
      setLoading(true);
      setError(null);
      setSelected(null);
      try {
        const qs = new URLSearchParams({ from: f, to: t, guests: String(g), currency });
        const res = await publicApi<AvailabilityResult>(`/public/sites/${encodeURIComponent(site)}/availability?${qs}`);
        setResult(res);
        const preferred = res.rooms.find((r) => r.roomId === initial.roomId && r.available);
        if (preferred) setSelected(preferred.roomId);
        const url = new URL(window.location.href);
        url.searchParams.set('from', f);
        url.searchParams.set('to', t);
        url.searchParams.set('guests', String(g));
        window.history.replaceState(null, '', url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not check availability. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [site, currency, initial.roomId],
  );

  useEffect(() => {
    if (initial.from && initial.to) void search(initial.from, initial.to, initial.guests);
    // run once with the dates from the search form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roomsById = useMemo(() => new Map(property.rooms.map((r) => [r.id, r])), [property.rooms]);
  const choice = result?.rooms.find((r) => r.roomId === selected) ?? null;
  const step: 0 | 1 = choice ? 1 : 0;

  async function submit(form: HTMLFormElement) {
    if (!choice) return;
    const fd = new FormData(form);
    setSubmitting(true);
    setError(null);
    try {
      const res = await publicApi<CreateBookingResult>('/public/bookings', {
        json: {
          site,
          roomId: choice.roomId,
          from,
          to,
          guests,
          guest: {
            name: String(fd.get('name') ?? ''),
            email: String(fd.get('email') ?? ''),
            phone: String(fd.get('phone') ?? ''),
            country: String(fd.get('country') ?? ''),
            language: String(fd.get('language') ?? 'en'),
          },
          specialRequests: String(fd.get('requests') ?? ''),
          displayCurrency: currency,
          acceptPolicy: fd.get('accept') === 'on',
        },
      });
      router.push(`${base}/booking/${res.reference}?t=${res.token}`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ClientApiError && err.status === 409) {
        setError('Sorry — those nights were just booked by someone else. Here is what is still free.');
        void search(from, to, guests);
        return;
      }
      if (err instanceof ClientApiError && err.status === 422) {
        const v = (err.body?.violations as string[] | undefined) ?? [];
        setError(v.length ? v.map((x) => violationText(x, choice.quote?.minNights)).join('. ') : err.message);
        return;
      }
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <Steps current={step} />

      <form
        className="card grid grid-cols-2 items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_7rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void search(from, to, guests);
        }}
      >
        <div>
          <label htmlFor="bf-from" className="label">
            Check-in
          </label>
          <input
            id="bf-from"
            type="date"
            required
            min={todayIso()}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (!to || to <= e.target.value) setTo(plusDays(e.target.value, 2));
            }}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="bf-to" className="label">
            Check-out
          </label>
          <input id="bf-to" type="date" required min={from ? plusDays(from, 1) : todayIso()} value={to} onChange={(e) => setTo(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="bf-guests" className="label">
            Guests
          </label>
          <select id="bf-guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="field">
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary h-11" disabled={loading}>
          {loading ? 'Checking…' : result ? 'Update' : 'Check availability'}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {result && !choice && (
        <section aria-labelledby="choose" aria-busy={loading}>
          <h2 id="choose" className="text-lg font-semibold">
            Choose a room · {nightsLabel(result.rooms[0]?.quote?.nightCount ?? 0)}
          </h2>
          {result.rooms.every((r) => !r.available) && (
            <p className="mt-2 text-sm text-muted">Nothing is free for these dates. Try moving your dates by a day or two.</p>
          )}
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {result.rooms.map((ra) => {
              const room = roomsById.get(ra.roomId);
              if (!room) return null;
              return (
                <li key={ra.roomId}>
                  <RoomOption room={room} ra={ra} baseCurrency={result.baseCurrency} onSelect={() => setSelected(ra.roomId)} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {choice && choice.quote && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <form
            className="card space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your details</h2>
              <button type="button" className="text-sm font-medium text-brand underline-offset-2 hover:underline" onClick={() => setSelected(null)}>
                Change room
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="g-name" className="label">
                  Full name
                </label>
                <input id="g-name" name="name" required minLength={2} autoComplete="name" className="field" />
              </div>
              <div>
                <label htmlFor="g-email" className="label">
                  Email
                </label>
                <input id="g-email" name="email" type="email" required autoComplete="email" className="field" />
              </div>
              <div>
                <label htmlFor="g-phone" className="label">
                  WhatsApp / phone
                </label>
                <input id="g-phone" name="phone" type="tel" required autoComplete="tel" placeholder="+44 7700 900123" className="field" />
              </div>
              <div>
                <label htmlFor="g-country" className="label">
                  Country
                </label>
                <select id="g-country" name="country" required defaultValue="" className="field" autoComplete="country">
                  <option value="" disabled>
                    Select…
                  </option>
                  {COUNTRIES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="g-lang" className="label">
                  Messages in
                </label>
                <select id="g-lang" name="language" defaultValue="en" className="field">
                  {LANGUAGES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="g-req" className="label">
                  Special requests <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea id="g-req" name="requests" rows={3} maxLength={1000} className="field py-2" placeholder="Arrival time, airport pickup, dietary needs…" />
              </div>
            </div>
            <div className="rounded-xl bg-surface-2 p-4 text-sm">
              <p className="font-semibold">Cancellation policy</p>
              <p className="mt-1 text-muted">{POLICY_TEXT[choice.quote.cancellationPolicy]}</p>
              <label className="mt-3 flex items-start gap-2">
                <input type="checkbox" name="accept" required className="mt-1 h-4 w-4 accent-[var(--brand)]" />
                <span>
                  I accept the cancellation policy and agree to pay a {choice.quote.depositPct}% deposit now.
                </span>
              </label>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Reserving your room…' : 'Continue to payment'}
            </button>
            <p className="text-center text-xs text-muted">
              Your room is held for 15 minutes while you pay
              {property.paymentMethods.length ? ` by ${property.paymentMethods.map((m) => METHOD_LABEL[m]).join(', ')}` : ''}.
            </p>
          </form>
          <Summary room={roomsById.get(choice.roomId)!} ra={choice} from={from} to={to} guests={guests} baseCurrency={result!.baseCurrency} />
        </div>
      )}
    </div>
  );
}

function RoomOption({ room, ra, baseCurrency, onSelect }: { room: PublicRoom; ra: RoomAvailability; baseCurrency: string; onSelect: () => void }) {
  const d = ra.display;
  const approx = d && d.currency !== baseCurrency;
  return (
    <div className={`card flex h-full gap-4 p-3 ${ra.available ? '' : 'opacity-60'}`}>
      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {room.photos[0] && <Image src={room.photos[0]} alt="" fill sizes="112px" className="object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold">{room.name}</p>
        <p className="text-xs text-muted">
          Up to {room.maxGuests} · {room.beds}
        </p>
        {ra.available && d ? (
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <p className="text-sm">
              <span className="text-lg font-semibold">
                {approx && '≈ '}
                {formatMoney(d.total, d.currency)}
              </span>
              <span className="block text-xs text-muted">
                {formatMoney(d.deposit, d.currency)} deposit
                {ra.quote?.discountLabel ? ` · ${ra.quote.discountLabel}` : ''}
              </span>
            </p>
            <button type="button" className="btn-primary min-h-10 px-4" onClick={onSelect}>
              Select
            </button>
          </div>
        ) : (
          <p className="mt-auto pt-2 text-sm text-bad">{ra.violations.map((v) => violationText(v, ra.quote?.minNights)).join(' · ')}</p>
        )}
      </div>
    </div>
  );
}

function Summary({
  room,
  ra,
  from,
  to,
  guests,
  baseCurrency,
}: {
  room: PublicRoom;
  ra: RoomAvailability;
  from: string;
  to: string;
  guests: number;
  baseCurrency: string;
}) {
  const q = ra.quote!;
  const d = ra.display;
  const showDisplay = d && d.currency !== baseCurrency;
  return (
    <aside className="card h-fit space-y-3 p-5 text-sm lg:sticky lg:top-24" aria-label="Price summary">
      <p className="text-base font-semibold">{room.name}</p>
      <p className="text-muted">
        {from} → {to} · {nightsLabel(q.nightCount)} · {guests} guest{guests === 1 ? '' : 's'}
      </p>
      <dl className="space-y-1.5 border-t border-line pt-3">
        <Row label="Room" value={formatMoney(q.roomSubtotal, baseCurrency)} />
        {q.extraGuestTotal > 0 && <Row label="Extra guests" value={formatMoney(q.extraGuestTotal, baseCurrency)} />}
        {q.discount > 0 && <Row label={q.discountLabel ?? 'Discount'} value={`− ${formatMoney(q.discount, baseCurrency)}`} />}
        {q.taxes > 0 && <Row label="Taxes" value={formatMoney(q.taxes, baseCurrency)} />}
        <Row label="Total" value={formatMoney(q.total, baseCurrency)} strong />
        <Row label={`Deposit due now (${q.depositPct}%)`} value={formatMoney(q.deposit, baseCurrency)} strong />
      </dl>
      {showDisplay && (
        <p className="text-xs text-muted">
          ≈ {formatMoney(d.total, d.currency)} total, {formatMoney(d.deposit, d.currency)} deposit. The exact charge currency is shown before you pay.
        </p>
      )}
    </aside>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
