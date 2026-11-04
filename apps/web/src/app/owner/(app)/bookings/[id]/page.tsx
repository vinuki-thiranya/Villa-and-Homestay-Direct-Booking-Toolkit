import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { OwnerBookingRow } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { StatusBadge } from '@/components/owner/BookingList';
import { Check, Field, Section, Select } from '@/components/owner/fields';
import { ApiError } from '@/lib/api';
import { fmtDate, fmtDateTime, METHOD_LABEL, money, SOURCE_LABEL, waLink } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
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
  cancellationPolicy: string | null;
  balanceDueDate: string | null;
  cancelReason: string | null;
  payments: PaymentRow[];
  history: { from_status: string | null; to_status: string; actor: string; note: string | null; at: string }[];
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
        ← Bookings
      </Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              {b.reference} · {SOURCE_LABEL[b.source]}
              {b.mode === 'request' ? ' · request to book' : ''}
            </p>
            <h1 className="text-2xl font-semibold">{b.guestName ?? 'Guest'}</h1>
            <p className="text-muted">
              {b.roomName} · {fmtDate(b.from)} → {fmtDate(b.to)} · {b.guests} guest{b.guests === 1 ? '' : 's'}
            </p>
          </div>
          <StatusBadge status={b.status} />
        </div>
        {b.needsRefund && (
          <p role="alert" className="mt-3 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad">
            Payment arrived after the hold expired and the nights were taken. Refund the guest or move them to another room.
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">Total</dt>
            <dd className="font-semibold">{money(b.total, b.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Paid</dt>
            <dd className="font-semibold text-ok">{money(b.paid, b.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Balance</dt>
            <dd className={`font-semibold ${b.balance > 0 ? 'text-bad' : 'text-ok'}`}>{money(b.balance, b.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Balance due</dt>
            <dd className="font-semibold">{fmtDate(b.balanceDueDate)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-9 px-4">
              WhatsApp guest
            </a>
          )}
          {b.guestEmail && (
            <a href={`mailto:${b.guestEmail}`} className="btn-secondary min-h-9 px-4">
              Email
            </a>
          )}
        </div>
        {b.specialRequests && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">“{b.specialRequests}”</p>}
        {b.cancelReason && <p className="mt-3 text-sm text-muted">Cancelled: {b.cancelReason}</p>}
      </div>

      {b.status === 'pending' && b.mode === 'request' && (
        <Section title="Request to book">
          <div className="flex flex-wrap items-start gap-4">
            <ActionForm action={bookingAction.bind(null, b.id, 'approve')} submitLabel="Approve & send payment link" />
            <ActionForm action={declineAction.bind(null, b.id)} submitLabel="Decline" variant="danger" inline>
              <label htmlFor="decline-reason" className="sr-only">
                Reason
              </label>
              <input id="decline-reason" name="reason" required minLength={3} placeholder="Reason (e.g. dates taken)" className="field max-w-xs" />
            </ActionForm>
          </div>
        </Section>
      )}

      {pendingSlips.length > 0 && (
        <Section title="Payment slips to confirm">
          <ul className="space-y-4">
            {pendingSlips.map((p) => (
              <li key={p.id} className="rounded-xl border border-warn/40 bg-warn-bg/40 p-3 text-sm">
                <p>
                  {METHOD_LABEL[p.method]} · claimed {money(p.amount, p.currency)} ·{' '}
                  <a href={p.slipUrl!} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">
                    View slip
                  </a>
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <ActionForm action={reviewSlipAction.bind(null, p.id, true)} submitLabel="Confirm received" inline>
                    <label htmlFor={`amt-${p.id}`} className="sr-only">
                      Amount received
                    </label>
                    <input id={`amt-${p.id}`} name="amount" type="number" step="0.01" min="0.01" defaultValue={p.amount} className="field w-32" />
                  </ActionForm>
                  <ActionForm action={reviewSlipAction.bind(null, p.id, false)} submitLabel="Reject" variant="danger" confirm="Reject this slip?" />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(b.status === 'pending' || active) && (
        <Section title="Record a payment">
          <ActionForm action={recordPaymentAction.bind(null, b.id)} submitLabel="Record payment">
            <div className="grid gap-3 sm:grid-cols-4">
              <Select
                label="Method"
                name="method"
                options={[
                  ['cash', 'Cash'],
                  ['bank', 'Bank transfer'],
                  ['lankaqr', 'LankaQR'],
                ]}
              />
              <Field label="Amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={b.balance || undefined} />
              <Select label="Currency" name="currency" options={[[b.currency, b.currency], ...(['LKR', 'USD'].filter((c) => c !== b.currency).map((c) => [c, c]) as [string, string][])]} />
              <Field label="Reference" name="reference" placeholder="Bank ref / receipt no." />
            </div>
          </ActionForm>
        </Section>
      )}

      {active && (
        <Section title="Stay">
          <div className="flex flex-wrap gap-3">
            {b.status === 'confirmed' && <ActionForm action={bookingAction.bind(null, b.id, 'check-in')} submitLabel="Check in" />}
            {b.status === 'checked_in' && <ActionForm action={bookingAction.bind(null, b.id, 'check-out')} submitLabel="Check out" />}
            {b.status === 'confirmed' && (
              <ActionForm action={bookingAction.bind(null, b.id, 'no-show')} submitLabel="Mark no-show" variant="secondary" confirm="Mark as no-show? Remaining nights go back on sale." />
            )}
          </div>
        </Section>
      )}


      {(active || orders.length > 0) && (
        <Section title={`Add-ons (${orders.length})`}>
          {orders.length > 0 && (
            <ul className="mb-4 divide-y divide-line text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">
                    {o.addOnName} × {o.qty} · {fmtDate(o.date)}
                    {o.time ? ` ${o.time}` : ''} · {money(o.amount, o.currency)}
                    {o.providerName ? <span className="text-muted"> · {o.providerName}</span> : null}
                  </span>
                  <OrderBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
          {active && orderable.length > 0 ? (
            <ActionForm action={ownerOrderAction.bind(null, b.id)} submitLabel="Order for guest">
              <div className="grid gap-3 sm:grid-cols-4">
                <Select
                  label="Experience"
                  name="addOnId"
                  options={orderable.map((a) => [a.id, `${a.name} (${money(a.price, a.currency)})`] as [string, string])}
                  className="sm:col-span-2"
                />
                <Field label="Date" name="date" type="date" required min={dayBefore} max={b.to} defaultValue={b.from} />
                <Field label="Time" name="time" type="time" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <Field label="Quantity" name="qty" type="number" min={1} max={20} defaultValue={1} />
                <Field label="Notes for the provider" name="notes" placeholder="Flight number, pickup point…" />
              </div>
            </ActionForm>
          ) : active ? (
            <p className="text-sm text-muted">
              No experiences in your catalogue yet. <Link href="/owner/setup/add-ons" className="text-brand underline">Add airport pickups, surf lessons…</Link>
            </p>
          ) : null}
        </Section>
      )}

      {(b.status === 'pending' || b.status === 'confirmed') && (
        <Section title="Cancel booking">
          <ActionForm action={cancelAction.bind(null, b.id)} submitLabel="Cancel booking" variant="danger" confirm="Cancel this booking and release the nights?">
            <Field label="Reason" name="reason" required minLength={3} />
            <Check label={`Refund per the ${b.cancellationPolicy ?? ''} policy`} name="refund" defaultChecked />
          </ActionForm>
        </Section>
      )}

      {b.paid > 0 && (
        <Section title="Refund">
          <ActionForm action={refundAction.bind(null, b.id)} submitLabel="Record refund" variant="secondary" confirm="Record this refund?">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Amount (${b.currency})`} name="amount" type="number" step="0.01" min="0.01" max={b.paid} required />
              <Field label="Reason" name="reason" required minLength={3} />
            </div>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">PayPal refunds are sent automatically. PayHere, bank, LankaQR and cash refunds are recorded for you to pay back, then marked done.</p>
        </Section>
      )}

      {pendingRefunds.length > 0 && (
        <Section title="Refunds to pay back">
          <ul className="space-y-3 text-sm">
            {pendingRefunds.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3">
                <span>
                  {money(Math.abs(p.amount), p.currency)} via {METHOD_LABEL[p.method]} — {p.note}
                </span>
                <ActionForm action={completeRefundAction.bind(null, p.id)} submitLabel="Mark paid back" inline>
                  <label htmlFor={`rref-${p.id}`} className="sr-only">
                    Transfer reference
                  </label>
                  <input id={`rref-${p.id}`} name="reference" placeholder="Transfer ref" className="field w-40" />
                </ActionForm>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Payments">
        {b.payments.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 font-medium">When</th>
                  <th className="py-1 font-medium">Method</th>
                  <th className="py-1 font-medium">Status</th>
                  <th className="py-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {b.payments.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2">{fmtDateTime(p.confirmedAt ?? p.createdAt)}</td>
                    <td className="py-2">
                      {METHOD_LABEL[p.method]}
                      {p.kind === 'refund' ? ' refund' : ''}
                      {p.gatewayRef && <span className="block font-mono text-xs text-muted">{p.gatewayRef}</span>}
                    </td>
                    <td className="py-2">
                      <span className={`pill ${p.status === 'confirmed' ? 'bg-ok-bg text-ok' : p.status === 'pending' ? 'bg-warn-bg text-warn' : 'bg-surface-2 text-muted'}`}>{p.status}</span>
                    </td>
                    <td className={`py-2 text-right font-medium ${p.amount < 0 ? 'text-bad' : ''}`}>{money(p.amount, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="History">
        <ol className="space-y-2 text-sm">
          {b.history.map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-36 shrink-0 text-muted">{fmtDateTime(h.at)}</span>
              <span>
                {h.from_status && h.from_status !== h.to_status ? `${h.from_status} → ` : ''}
                <strong>{h.to_status}</strong>
                {h.note ? ` — ${h.note}` : ''} <span className="text-muted">({h.actor})</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
