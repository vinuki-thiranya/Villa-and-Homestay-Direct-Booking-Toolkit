import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { OwnerBookingRow } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { PaidPill, StatusBadge } from '@/components/owner/BookingList';
import { Check, Field, Section, Select } from '@/components/owner/fields';
import { ApiError } from '@/lib/api';
import { tLabel } from '@/components/owner/labels';
import type { OwnerKey } from '@/i18n/owner/t';
import { money, waLink } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { BookingDocuments } from '@/components/owner/BookingDocuments';
import { OrderBadge } from '@/components/owner/OrderBadge';
import type { AddOnOrder, OwnerAddOn } from '@/lib/owner-types';
import { ownerOrderAction } from '../../../actions-r2';
import {
  bookingAction,
  cancelAction,
  completeRefundAction,
  declineAction,
  recordPaymentAction,
  refundAction,
  reviewSlipAction,
} from '../../../actions';

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  baseAmount: number;
  method: string;
  kind: 'charge' | 'refund';
  status: 'pending' | 'confirmed' | 'reversed';
  gatewayRef: string | null;
  slipUrl: string | null;
  confirmedAt: string | null;
  createdAt: string;
  note: string | null;
}

interface BookingDetail extends OwnerBookingRow {
  specialRequests: string;
  guestId: string | null;
  passportLast4: string | null;
  cancellationPolicy: string | null;
  balanceDueDate: string | null;
  cancelReason: string | null;
  quote: { monthly?: { planId: string; name: string; utilities: 'included' | 'metered' } | null } | null;
  payments: PaymentRow[];
  history: { from_status: string | null; to_status: string; actor: string; note: string | null; at: string }[];
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  let b: BookingDetail;
  try {
    b = await ownerApi<BookingDetail>(`/bookings/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const wa = waLink(b.guestPhone, `Hello ${b.guestName ?? ''}, this is about your booking ${b.reference}.`);
  const active = b.status === 'confirmed' || b.status === 'checked_in';
  const pendingSlips = b.payments.filter((p) => p.kind === 'charge' && p.status === 'pending' && p.slipUrl);
  const pendingRefunds = b.payments.filter((p) => p.kind === 'refund' && p.status === 'pending');
  const property = await currentProperty();
  const [catalogue, orders] = await Promise.all([
    property ? ownerApi<OwnerAddOn[]>(`/properties/${property.id}/add-ons`) : Promise.resolve([] as OwnerAddOn[]),
    ownerApi<AddOnOrder[]>(`/bookings/${b.id}/add-on-orders`),
  ]);
  const orderable = catalogue.filter((a) => a.active);
  const dayBefore = new Date(Date.parse(`${b.from}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <Link href="/owner/bookings" className="text-sm text-brand">
        {t('bookings.back')}
      </Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              {b.reference} · {tLabel(t, 'source', b.source)}
              {b.mode === 'request' ? ` · ${t('bookings.requestToBook')}` : ''}
            </p>
            <h1 className="text-2xl font-semibold">{b.guestName ?? t('shared.guest')}</h1>
            <p className="text-muted">
              {b.roomName} · {t.date(b.from)} → {t.date(b.to)} · {t.n('common.guests', b.guests)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={b.status} />
            <PaidPill status={b.status} balance={b.balance} paid={b.paid} currency={b.currency} />
          </div>
        </div>
        {b.needsRefund && (
          <p role="alert" className="mt-3 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad">
            {t('bookings.needsRefund')}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">{t('bookings.total')}</dt>
            <dd className="font-semibold">{money(b.total, b.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('bookings.paid')}</dt>
            <dd className="font-semibold text-ok">{money(b.paid, b.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('bookings.balance')}</dt>
            <dd className={`font-semibold ${b.balance > 0 ? 'text-bad' : 'text-ok'}`}>{money(b.balance, b.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('bookings.balanceDue')}</dt>
            <dd className="font-semibold">{t.date(b.balanceDueDate)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-9 px-4">
              {t('bookings.whatsapp')}
            </a>
          )}
          {b.guestEmail && (
            <a href={`mailto:${b.guestEmail}`} className="btn-secondary min-h-9 px-4">
              {t('bookings.email')}
            </a>
          )}
        </div>
        {b.specialRequests && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">“{b.specialRequests}”</p>}
        {b.cancelReason && <p className="mt-3 text-sm text-muted">{t('bookings.cancelledReason', { reason: b.cancelReason })}</p>}
      </div>

      {b.status === 'pending' && b.mode === 'request' && (
        <Section title={t('bookings.request.title')}>
          <div className="flex flex-wrap items-start gap-4">
            <ActionForm action={bookingAction.bind(null, b.id, 'approve')} submitLabel={t('bookings.request.approve')} />
            <ActionForm action={declineAction.bind(null, b.id)} submitLabel={t('bookings.request.decline')} variant="danger" inline>
              <label htmlFor="decline-reason" className="sr-only">
                {t('bookings.request.reason')}
              </label>
              <input id="decline-reason" name="reason" required minLength={3} placeholder={t('bookings.request.reasonPlaceholder')} className="field max-w-xs" />
            </ActionForm>
          </div>
        </Section>
      )}

      {pendingSlips.length > 0 && (
        <Section title={t('bookings.slips.title')}>
          <ul className="space-y-4">
            {pendingSlips.map((p) => (
              <li key={p.id} className="rounded-xl border border-warn/40 bg-warn-bg/40 p-3 text-sm">
                <p>
                  {t('bookings.slips.claimed', { method: tLabel(t, 'method', p.method), amount: money(p.amount, p.currency) })} ·{' '}
                  <a href={p.slipUrl!} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">
                    {t('bookings.slips.view')}
                  </a>
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <ActionForm action={reviewSlipAction.bind(null, p.id, true)} submitLabel={t('bookings.slips.confirm')} inline>
                    <label htmlFor={`amt-${p.id}`} className="sr-only">
                      {t('bookings.slips.amountReceived')}
                    </label>
                    <input id={`amt-${p.id}`} name="amount" type="number" step="0.01" min="0.01" defaultValue={p.amount} className="field w-32" />
                  </ActionForm>
                  <ActionForm action={reviewSlipAction.bind(null, p.id, false)} submitLabel={t('bookings.slips.reject')} variant="danger" confirm={t('bookings.slips.rejectConfirm')} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(b.status === 'pending' || active) && (
        <Section title={t('bookings.record.title')}>
          <ActionForm action={recordPaymentAction.bind(null, b.id)} submitLabel={t('bookings.record.submit')}>
            <div className="grid gap-3 sm:grid-cols-4">
              <Select
                label={t('bookings.record.method')}
                name="method"
                options={(['cash', 'bank', 'lankaqr'] as const).map((m) => [m, tLabel(t, 'method', m)] as [string, string])}
              />
              <Field label={t('bookings.record.amount')} name="amount" type="number" step="0.01" min="0.01" required defaultValue={b.balance || undefined} />
              <Select label={t('bookings.record.currency')} name="currency" options={[[b.currency, b.currency], ...(['LKR', 'USD'].filter((c) => c !== b.currency).map((c) => [c, c]) as [string, string][])]} />
              <Field label={t('bookings.record.reference')} name="reference" placeholder={t('bookings.record.referencePlaceholder')} />
            </div>
          </ActionForm>
        </Section>
      )}

      {active && (
        <Section title={t('bookings.stay.title')}>
          <div className="flex flex-wrap gap-3">
            {b.status === 'confirmed' && <ActionForm action={bookingAction.bind(null, b.id, 'check-in')} submitLabel={t('bookings.stay.checkIn')} />}
            {b.status === 'checked_in' && <ActionForm action={bookingAction.bind(null, b.id, 'check-out')} submitLabel={t('bookings.stay.checkOut')} />}
            {b.status === 'confirmed' && (
              <ActionForm action={bookingAction.bind(null, b.id, 'no-show')} submitLabel={t('bookings.stay.noShow')} variant="secondary" confirm={t('bookings.stay.noShowConfirm')} />
            )}
          </div>
        </Section>
      )}


      {(active || orders.length > 0) && (
        <Section title={t('bookings.addOns.title', { n: orders.length })}>
          {orders.length > 0 && (
            <ul className="mb-4 divide-y divide-line text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">
                    {o.addOnName} × {o.qty} · {t.date(o.date)}
                    {o.time ? ` ${o.time}` : ''} · {money(o.amount, o.currency)}
                    {o.providerName ? <span className="text-muted"> · {o.providerName}</span> : null}
                  </span>
                  <OrderBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
          {active && orderable.length > 0 ? (
            <ActionForm action={ownerOrderAction.bind(null, b.id)} submitLabel={t('bookings.addOns.order')}>
              <div className="grid gap-3 sm:grid-cols-4">
                <Select
                  label={t('bookings.addOns.experience')}
                  name="addOnId"
                  options={orderable.map((a) => [a.id, `${a.name} (${money(a.price, a.currency)})`] as [string, string])}
                  className="sm:col-span-2"
                />
                <Field label={t('bookings.addOns.date')} name="date" type="date" required min={dayBefore} max={b.to} defaultValue={b.from} />
                <Field label={t('bookings.addOns.time')} name="time" type="time" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <Field label={t('bookings.addOns.quantity')} name="qty" type="number" min={1} max={20} defaultValue={1} />
                <Field label={t('bookings.addOns.notes')} name="notes" placeholder={t('bookings.addOns.notesPlaceholder')} />
              </div>
            </ActionForm>
          ) : active ? (
            <p className="text-sm text-muted">
              {t('bookings.addOns.none')}{' '}
              <Link href="/owner/setup/add-ons" className="text-brand underline">
                {t('bookings.addOns.addLink')}
              </Link>
            </p>
          ) : null}
        </Section>
      )}

      {(b.status === 'pending' || b.status === 'confirmed') && (
        <Section title={t('bookings.cancel.title')}>
          <ActionForm action={cancelAction.bind(null, b.id)} submitLabel={t('bookings.cancel.submit')} variant="danger" confirm={t('bookings.cancel.confirm')}>
            <Field label={t('bookings.cancel.reason')} name="reason" required minLength={3} />
            <Check
              label={t('bookings.cancel.refundPolicy', { policy: b.cancellationPolicy ? t(`bookings.policy.${b.cancellationPolicy}` as OwnerKey) : '' })}
              name="refund"
              defaultChecked
            />
          </ActionForm>
        </Section>
      )}

      {b.paid > 0 && (
        <Section title={t('bookings.refund.title')}>
          <ActionForm action={refundAction.bind(null, b.id)} submitLabel={t('bookings.refund.submit')} variant="secondary" confirm={t('bookings.refund.confirm')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('bookings.refund.amount', { currency: b.currency })} name="amount" type="number" step="0.01" min="0.01" max={b.paid} required />
              <Field label={t('bookings.refund.reason')} name="reason" required minLength={3} />
            </div>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">{t('bookings.refund.note')}</p>
        </Section>
      )}

      {pendingRefunds.length > 0 && (
        <Section title={t('bookings.refund.toPay')}>
          <ul className="space-y-3 text-sm">
            {pendingRefunds.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3">
                <span>
                  {t('bookings.refund.via', { amount: money(Math.abs(p.amount), p.currency), method: tLabel(t, 'method', p.method), note: p.note ?? '' })}
                </span>
                <ActionForm action={completeRefundAction.bind(null, p.id)} submitLabel={t('bookings.refund.markPaid')} inline>
                  <label htmlFor={`rref-${p.id}`} className="sr-only">
                    {t('bookings.refund.transferRef')}
                  </label>
                  <input id={`rref-${p.id}`} name="reference" placeholder={t('bookings.refund.transferPlaceholder')} className="field w-40" />
                </ActionForm>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <BookingDocuments
        bookingId={b.id}
        status={b.status}
        currency={b.currency}
        from={b.from}
        to={b.to}
        monthly={b.quote?.monthly ?? null}
        guest={b.guestId ? { id: b.guestId, passportLast4: b.passportLast4 } : null}
      />

      <Section title={t('bookings.payments.title')}>
        {b.payments.length === 0 ? (
          <p className="text-sm text-muted">{t('bookings.payments.none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 font-medium">{t('bookings.payments.when')}</th>
                  <th className="py-1 font-medium">{t('bookings.payments.method')}</th>
                  <th className="py-1 font-medium">{t('bookings.payments.status')}</th>
                  <th className="py-1 text-right font-medium">{t('bookings.payments.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {b.payments.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2">{t.dateTime(p.confirmedAt ?? p.createdAt)}</td>
                    <td className="py-2">
                      {tLabel(t, 'method', p.method)}
                      {p.kind === 'refund' ? ` ${t('bookings.payments.refund')}` : ''}
                      {p.gatewayRef && <span className="block font-mono text-xs text-muted">{p.gatewayRef}</span>}
                    </td>
                    <td className="py-2">
                      <span className={`pill ${p.status === 'confirmed' ? 'bg-ok-bg text-ok' : p.status === 'pending' ? 'bg-warn-bg text-warn' : 'bg-surface-2 text-muted'}`}>{t(`bookings.payments.statuses.${p.status}`)}</span>
                    </td>
                    <td className={`py-2 text-right font-medium ${p.amount < 0 ? 'text-bad' : ''}`}>{money(p.amount, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={t('bookings.history')}>
        <ol className="space-y-2 text-sm">
          {b.history.map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-36 shrink-0 text-muted">{t.dateTime(h.at)}</span>
              <span>
                {h.from_status && h.from_status !== h.to_status ? `${tLabel(t, 'status', h.from_status)} → ` : ''}
                <strong>{tLabel(t, 'status', h.to_status)}</strong>
                {h.note ? ` — ${h.note}` : ''} <span className="text-muted">({h.actor})</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
