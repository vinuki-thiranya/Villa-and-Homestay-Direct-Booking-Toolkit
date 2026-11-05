'use client';

import Image from 'next/image';
import { AnimatePresence, m } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AvailabilityResult,
  CreateBookingResult,
  PaymentMethod,
  PublicRoom,
  RoomAvailability,
} from '@staydirect/shared';
import { ClientApiError, publicApi } from '@/lib/client-api';
import { addDaysIso } from '@/lib/calendar';
import { formatMoney } from '@/lib/format';
import { countryOptions, LANGUAGES, policyText, violationText } from '@/lib/guest-copy';
import type { GuestTranslator } from '@/i18n/guest/t';
import { useGT } from './GuestI18n';
import { GuestMotion } from './GuestMotion';
import { rich } from './rich';
import { StayDates } from './StayDates';
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
  initial: { from?: string; to?: string; guests: number; roomId?: string; code?: string };
  /** Availability for `initial` fetched on the server, so step 1 arrives with prices (no layout shift). */
  initialResult?: (AvailabilityResult & { promo: { code: string; pct: number } | null }) | null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Same rule as balanceDueDate in packages/shared/src/pricing.ts: 7 days before arrival, or arrival day when flexible. */
function balanceDue(from: string, policy: string): string {
  const due = policy === 'flexible' ? from : addDaysIso(from, -7);
  return due < todayIso() ? todayIso() : due;
}

/** Payment method names for the hold note: brand names as they are, bank transfer translated. */
function methodName(t: GuestTranslator, m: PaymentMethod): string {
  return { payhere: 'PayHere', paypal: 'PayPal', lankaqr: 'LankaQR', bank: t('pay.options.sri_lanka.bank.title'), cash: '' }[m];
}

export function BookFlow({ site, base, currency, property, initial, initialResult }: Props) {
  const router = useRouter();
  const t = useGT();
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [guests, setGuests] = useState(initial.guests);
  const [result, setResult] = useState<AvailabilityResult | null>(initialResult ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(
    initialResult?.rooms.find((r) => r.roomId === initial.roomId && r.available)?.roomId ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState(initial.code ?? '');
  const [promo, setPromo] = useState<{ code: string; pct: number } | null>(initialResult?.promo ?? null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const maxGuests = Math.max(1, ...property.rooms.map((r) => r.maxGuests));

  const search = useCallback(
    async (f: string, until: string, g: number) => {
      if (!f || !until) return;
      if (until <= f) {
        setError(t('book.errors.datesOrder'));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ from: f, to: until, guests: String(g), currency });
        if (promo) qs.set('code', promo.code); // quotes then include the discount
        const res = await publicApi<AvailabilityResult>(`/public/sites/${encodeURIComponent(site)}/availability?${qs}`);
        setResult(res);
        // keep the guest's room choice across re-searches when it is still bookable
        setSelected((prev) => res.rooms.find((r) => r.roomId === (prev ?? initial.roomId) && r.available)?.roomId ?? null);
        const url = new URL(window.location.href);
        url.searchParams.set('from', f);
        url.searchParams.set('to', until);
        url.searchParams.set('guests', String(g));
        window.history.replaceState(null, '', url);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('book.errors.search'));
      } finally {
        setLoading(false);
      }
    },
    [site, currency, initial.roomId, promo, t],
  );

  // Re-price the current search when a code is applied or removed.
  const promoKey = promo?.code ?? '';
  const firstPromoRun = useRef(true);
  useEffect(() => {
    if (firstPromoRun.current) {
      firstPromoRun.current = false; // the server already priced the first search
      if (initialResult) return;
    }
    if (result && from && to) void search(from, to, guests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoKey]);

  const applyCode = useCallback(
    async (raw: string) => {
      const c = raw.trim();
      setCodeMsg(null);
      if (!c) {
        setPromo(null);
        return;
      }
      try {
        setPromo(await publicApi<{ code: string; pct: number }>(`/public/sites/${encodeURIComponent(site)}/discount-codes/${encodeURIComponent(c)}`));
      } catch (err) {
        setPromo(null);
        setCodeMsg(err instanceof ClientApiError && err.status === 422 ? t('book.code.invalid') : t('book.code.checkFailed'));
      }
    },
    [site, t],
  );

  useEffect(() => {
    if (initialResult) {
      if (initial.code && !initialResult.promo) void applyCode(initial.code); // shows why the code was refused
      return;
    }
    if (initial.code) void applyCode(initial.code);
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
            language: String(fd.get('language') ?? t.lang),
          },
          specialRequests: String(fd.get('requests') ?? ''),
          displayCurrency: currency,
          ...(promo ? { discountCode: promo.code } : {}),
          acceptPolicy: fd.get('accept') === 'on',
        },
      });
      router.push(`${base}/booking/${res.reference}?t=${res.token}`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ClientApiError && err.status === 409) {
        setError(t('book.errors.taken'));
        void search(from, to, guests);
        return;
      }
      if (err instanceof ClientApiError && err.status === 422 && err.body?.code === 'invalid_discount_code') {
        setPromo(null);
        setCodeMsg(t('book.code.noLongerValid'));
        setError(t('book.errors.codeRefused'));
        return;
      }
      if (err instanceof ClientApiError && err.status === 422) {
        const v = (err.body?.violations as string[] | undefined) ?? [];
        setError(v.length ? v.map((x) => violationText(t, x, choice.quote?.minNights)).join('. ') : err.message);
        return;
      }
      setError(err instanceof Error ? err.message : t('book.errors.failed'));
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
        <StayDates
          site={site}
          idPrefix="bf"
          value={{ from, to }}
          onChange={(v) => {
            setFrom(v.from);
            setTo(v.to);
            // A full range from the calendar searches straight away.
            if (v.from && v.to && v.to > v.from) void search(v.from, v.to, guests);
          }}
        />
        <div>
          <label htmlFor="bf-guests" className="label">
            {t('book.guests')}
          </label>
          <select id="bf-guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="field">
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="g-cta h-11" disabled={loading}>
          {loading ? t('book.checking') : result ? t('book.update') : t('book.seePrices')}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      <GuestMotion>
      <AnimatePresence mode="wait" initial={false}>
      {result && !choice && (
        <m.section
          key="rooms"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          aria-labelledby="choose"
          aria-busy={loading}
        >
          <h2 id="choose" className="text-lg font-semibold">
            {t('book.choose', { nights: t.n('common.nights', result.rooms[0]?.quote?.nightCount ?? 0) })}
          </h2>
          {result.rooms.every((r) => !r.available) && (
            <p className="mt-2 text-sm text-muted">{t('book.nothingFree')}</p>
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
        </m.section>
      )}

      {choice && choice.quote && (
        <m.div
          key="details"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2 }}
          className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        >
          <div className="lg:hidden">
            <Summary
              room={roomsById.get(choice.roomId)!}
              ra={choice}
              from={from}
              to={to}
              guests={guests}
              baseCurrency={result!.baseCurrency}
              promo={promo}
              collapsible
            />
          </div>
          <form
            className="card space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('book.details.title')}</h2>
              <button type="button" className="text-sm font-medium text-brand underline-offset-2 hover:underline" onClick={() => setSelected(null)}>
                {t('book.details.changeRoom')}
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="g-name" className="label">
                  {t('book.details.name')}
                </label>
                <input id="g-name" name="name" required minLength={2} autoComplete="name" className="field" />
              </div>
              <div>
                <label htmlFor="g-email" className="label">
                  {t('book.details.email')}
                </label>
                <input id="g-email" name="email" type="email" required autoComplete="email" className="field" />
              </div>
              <div>
                <label htmlFor="g-phone" className="label">
                  {t('book.details.phone')}
                </label>
                <input id="g-phone" name="phone" type="tel" required autoComplete="tel" placeholder="+44 7700 900123" className="field" />
              </div>
              <div>
                <label htmlFor="g-country" className="label">
                  {t('book.details.country')}
                </label>
                <select id="g-country" name="country" required defaultValue="" className="field" autoComplete="country">
                  <option value="" disabled>
                    {t('book.details.select')}
                  </option>
                  {countryOptions(t.lang).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="g-lang" className="label">
                  {t('book.details.messagesIn')}
                </label>
                {/* Defaults to the language the guest is reading the site in. */}
                {/* System font: the language names (සිංහල, हिन्दी) must not pull web fonts into English pages. */}
                <select id="g-lang" name="language" defaultValue={t.lang} className="field" style={t.lang === 'si' ? undefined : { fontFamily: 'system-ui, sans-serif' }}>
                  {LANGUAGES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="g-req" className="label">
                  {t('book.details.requests')} <span className="font-normal text-muted">{t('book.details.optional')}</span>
                </label>
                <textarea id="g-req" name="requests" rows={3} maxLength={1000} className="field py-2" placeholder={t('book.details.requestsHint')} />
              </div>
            </div>
            <div>
              <label htmlFor="g-code" className="label">
                {t('book.code.label')} <span className="font-normal text-muted">{t('book.details.optional')}</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="g-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  maxLength={40}
                  className="field font-mono uppercase"
                  aria-describedby="g-code-msg"
                />
                <button type="button" className="btn-secondary shrink-0" onClick={() => void applyCode(code)}>
                  {t('book.code.apply')}
                </button>
              </div>
              <p id="g-code-msg" aria-live="polite" className={`mt-1 text-sm ${promo ? 'text-ok' : 'text-bad'}`}>
                {promo ? t('book.code.applied', { code: promo.code, pct: promo.pct }) : codeMsg}
              </p>
            </div>
            <div className="rounded-card bg-surface-2 p-4 text-sm">
              <p className="font-semibold">{t('book.money.title')}</p>
              <p className="mt-1">
                {choice.quote.deposit >= choice.quote.total
                  ? rich(t('book.money.full'), { total: <strong>{formatMoney(choice.quote.total, result!.baseCurrency)}</strong> })
                  : rich(t('book.money.split'), {
                      deposit: <strong>{formatMoney(choice.quote.deposit, result!.baseCurrency)}</strong>,
                      pct: choice.quote.depositPct,
                      rest: <strong>{formatMoney(Math.round((choice.quote.total - choice.quote.deposit) * 100) / 100, result!.baseCurrency)}</strong>,
                      date: t.date(balanceDue(from, choice.quote.cancellationPolicy)),
                    })}
              </p>
              <p className="mt-3 font-semibold">{t('policy.title')}</p>
              <p className="mt-1 text-muted">{policyText(t, choice.quote.cancellationPolicy)}</p>
              <label className="mt-3 flex items-start gap-2">
                <input type="checkbox" name="accept" required className="mt-1 h-4 w-4 accent-[var(--brand)]" />
                <span>{t('book.money.accept', { pct: choice.quote.depositPct })}</span>
              </label>
            </div>
            <button type="submit" className="g-cta w-full" disabled={submitting} data-testid="continue-to-pay">
              {submitting ? t('book.holding') : t('book.continue')}
            </button>
            <p className="text-center text-xs text-muted">
              {property.paymentMethods.length
                ? t('book.heldNoteMethods', { methods: property.paymentMethods.map((m) => methodName(t, m)).filter(Boolean).join(', ') })
                : t('book.heldNote')}
            </p>
          </form>
          <div className="hidden lg:block">
            <Summary room={roomsById.get(choice.roomId)!} ra={choice} from={from} to={to} guests={guests} baseCurrency={result!.baseCurrency} promo={promo} />
          </div>
        </m.div>
      )}
      </AnimatePresence>
      </GuestMotion>
    </div>
  );
}

function RoomOption({ room, ra, baseCurrency, onSelect }: { room: PublicRoom; ra: RoomAvailability; baseCurrency: string; onSelect: () => void }) {
  const t = useGT();
  const d = ra.display;
  const approx = d && d.currency !== baseCurrency;
  return (
    <div className={`card flex h-full gap-4 p-3 ${ra.available ? '' : 'bg-surface-2/60'}`}>
      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-[calc(var(--radius)*0.6)] bg-surface-2">
        {room.photos[0] && <Image src={room.photos[0]} alt="" fill sizes="112px" quality={60} className={`object-cover ${ra.available ? '' : 'grayscale'}`} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold">{room.name}</p>
        <p className="text-xs text-muted">
          {t('book.room.sleeps', { n: room.maxGuests })}
          {room.beds ? `, ${room.beds}` : ''}
        </p>
        {ra.available && d ? (
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <p className="text-sm">
              <span className="whitespace-nowrap text-lg font-semibold">
                {approx && '≈ '}
                {formatMoney(d.total, d.currency)}
              </span>
              <span className="block text-xs text-muted">
                {t('book.room.deposit', { amount: formatMoney(d.deposit, d.currency) })}
                {ra.quote?.discountLabel ? `, ${ra.quote.discountLabel}` : ''}
              </span>
            </p>
            <button type="button" className="g-cta min-h-10 px-4" onClick={onSelect} aria-label={t('book.room.chooseLabel', { room: room.name })} data-testid="choose-room">
              {t('book.room.choose')}
            </button>
          </div>
        ) : (
          <p className="mt-auto pt-2 text-sm font-medium text-bad">{ra.violations.map((v) => violationText(t, v, ra.quote?.minNights)).join('. ')}</p>
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
  promo,
  collapsible = false,
}: {
  room: PublicRoom;
  ra: RoomAvailability;
  from: string;
  to: string;
  guests: number;
  baseCurrency: string;
  promo: { code: string; pct: number } | null;
  /** Phones: a one-line total that opens to the full breakdown. */
  collapsible?: boolean;
}) {
  const t = useGT();
  const q = ra.quote!;
  const d = ra.display;
  const showDisplay = d && d.currency !== baseCurrency;
  const nights = t.n('common.nights', q.nightCount);
  if (collapsible) {
    return (
      <details className="card text-sm">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-semibold">{room.name}</span>
            <span className="text-muted">{t('book.summary.dates', { from: t.date(from), to: t.date(to), nights })}</span>
          </span>
          <span className="text-right">
            <span className="block font-semibold tabular-nums">{formatMoney(q.total, baseCurrency)}</span>
            <span className="text-xs text-brand underline underline-offset-2">{t('book.summary.details')}</span>
          </span>
        </summary>
        <div className="border-t border-line px-4 pb-4">
          <Lines q={q} baseCurrency={baseCurrency} promo={promo} />
          {showDisplay && (
            <p className="mt-2 text-xs text-muted">
              {t('book.summary.approx', { total: formatMoney(d.total, d.currency), deposit: formatMoney(d.deposit, d.currency) })}
            </p>
          )}
        </div>
      </details>
    );
  }
  return (
    <aside className="card h-fit space-y-3 p-5 text-sm lg:sticky lg:top-24" aria-label={t('book.summary.label')}>
      <p className="text-base font-semibold">{room.name}</p>
      <p className="text-muted">{t('book.summary.datesGuests', { from: t.date(from), to: t.date(to), nights, guests: t.n('common.guests', guests) })}</p>
      <Lines q={q} baseCurrency={baseCurrency} promo={promo} />
      {promo && q.promoDiscount > 0 && (
        <p className="rounded-xl bg-ok-bg p-3 text-ok">
          {t('book.code.saved', { code: promo.code, amount: formatMoney(q.promoDiscount, baseCurrency) })}
        </p>
      )}
      {showDisplay && (
        <p className="text-xs text-muted">
          {t('book.summary.approxNote', { total: formatMoney(d.total, d.currency), deposit: formatMoney(d.deposit, d.currency) })}
        </p>
      )}
    </aside>
  );
}

function Lines({ q, baseCurrency, promo }: { q: NonNullable<RoomAvailability['quote']>; baseCurrency: string; promo: { code: string; pct: number } | null }) {
  const t = useGT();
  return (
    <dl className="space-y-1.5 border-t border-line pt-3">
      <Row label={t('book.summary.room')} value={formatMoney(q.roomSubtotal, baseCurrency)} />
      {q.extraGuestTotal > 0 && <Row label={t('book.summary.extraGuests')} value={formatMoney(q.extraGuestTotal, baseCurrency)} />}
      {q.discount > 0 && <Row label={q.discountLabel ?? t('book.summary.discount')} value={`− ${formatMoney(q.discount, baseCurrency)}`} />}
      {q.promoDiscount > 0 && <Row label={t('book.summary.code', { code: promo?.code ?? '', pct: promo?.pct ?? '' })} value={`− ${formatMoney(q.promoDiscount, baseCurrency)}`} />}
      {q.taxes > 0 && <Row label={t('book.summary.taxes')} value={formatMoney(q.taxes, baseCurrency)} />}
      <Row label={t('book.summary.total')} value={formatMoney(q.total, baseCurrency)} strong />
      <Row label={t('book.summary.depositNow', { pct: q.depositPct })} value={formatMoney(q.deposit, baseCurrency)} strong />
    </dl>
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
