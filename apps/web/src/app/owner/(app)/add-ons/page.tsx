import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Section } from '@/components/owner/fields';
import { fmtDate, fmtDateTime, money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { OrderBadge } from '@/components/owner/OrderBadge';
import type { AddOnOrder, Commissions } from '@/lib/owner-types';
import { orderStatusAction, resendJobCardAction } from '../../actions-r2';

export const metadata = { title: 'Add-ons' };

const isDate = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function AddOnOrdersPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; month?: string }> }) {
  const property = await currentProperty();
  if (!property) return null;
  const q = await searchParams;
  const from = isDate(q.from);
  const to = isDate(q.to);
  const month = q.month && /^\d{4}-\d{2}$/.test(q.month) ? q.month : new Date().toISOString().slice(0, 7);
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const [orders, commissions] = await Promise.all([
    ownerApi<AddOnOrder[]>(`/properties/${property.id}/add-on-orders${qs.size ? `?${qs}` : ''}`),
    ownerApi<Commissions>(`/properties/${property.id}/add-on-commissions?month=${month}`),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">Add-ons</h1>
        <Link href="/owner/setup/add-ons" className="text-sm font-medium text-brand">
          Catalogue & providers
        </Link>
      </div>

      <Section title={`Commissions · ${month}`}>
        <form className="mb-3 flex items-end gap-2">
          <div>
            <label htmlFor="month" className="label">
              Month
            </label>
            <input id="month" name="month" type="month" defaultValue={month} className="field" />
          </div>
          <button className="btn-secondary">Show</button>
        </form>
        {commissions.byCurrency.length === 0 ? (
          <p className="text-sm text-muted">No confirmed add-on sales this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 font-medium">Currency</th>
                  <th className="py-1 text-right font-medium">Orders</th>
                  <th className="py-1 text-right font-medium">Sales</th>
                  <th className="py-1 text-right font-medium">You earned</th>
                  <th className="py-1 text-right font-medium">Providers</th>
                  <th className="py-1 text-right font-medium">StayDirect fee</th>
                </tr>
              </thead>
              <tbody>
                {commissions.byCurrency.map((c) => (
                  <tr key={c.currency} className="border-t border-line">
                    <td className="py-2">{c.currency}</td>
                    <td className="py-2 text-right">{c.orders}</td>
                    <td className="py-2 text-right">{money(Number(c.sales), c.currency)}</td>
                    <td className="py-2 text-right font-semibold text-ok">{money(Number(c.ownerEarned), c.currency)}</td>
                    <td className="py-2 text-right">{money(Number(c.providerPayouts), c.currency)}</td>
                    <td className="py-2 text-right">{money(Number(c.platformDue), c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">The StayDirect fee is invoiced monthly with your subscription.</p>
          </div>
        )}
      </Section>

      <Section title={`Orders (${orders.length})`}>
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="from" className="label">
              From
            </label>
            <input id="from" name="from" type="date" defaultValue={from} className="field" />
          </div>
          <div>
            <label htmlFor="to" className="label">
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={to} className="field" />
          </div>
          <button className="btn-secondary">Filter</button>
          {(from || to) && (
            <Link href="/owner/add-ons" className="text-sm text-brand">
              Clear
            </Link>
          )}
        </form>
        {orders.length === 0 ? (
          <Empty>No add-on orders yet. Guests order from their booking page, or you can order for them from a booking.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="py-3">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {o.addOnName} × {o.qty}
                    </p>
                    <p className="text-sm text-muted">
                      {fmtDate(o.date)}
                      {o.time ? ` ${o.time}` : ''} ·{' '}
                      <Link href={`/owner/bookings/${o.bookingId}`} className="text-brand underline-offset-2 hover:underline">
                        {o.guestName ?? o.bookingReference}
                      </Link>{' '}
                      · {o.providerName ?? 'No provider'}
                    </p>
                    <p className="text-sm">
                      {money(o.amount, o.currency)} · you {money(o.ownerAmount, o.currency)} · provider {money(o.providerAmount, o.currency)}
                    </p>
                    {o.notes && <p className="text-sm text-muted">“{o.notes}”</p>}
                    <p className="text-xs text-muted">
                      Job card {o.providerNotifiedAt ? `sent ${fmtDateTime(o.providerNotifiedAt)}` : 'not sent'}
                      {o.providerConfirmedAt ? ` · accepted ${fmtDateTime(o.providerConfirmedAt)}` : ''}
                    </p>
                  </div>
                  <OrderBadge status={o.status} />
                </div>
                {o.status !== 'cancelled' && o.status !== 'done' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {o.status === 'requested' && <ActionForm action={orderStatusAction.bind(null, o.id, 'confirmed')} submitLabel="Confirm" inline />}
                    <ActionForm action={orderStatusAction.bind(null, o.id, 'done')} submitLabel="Mark done" variant="secondary" inline />
                    {o.providerId && <ActionForm action={resendJobCardAction.bind(null, o.id)} submitLabel="Resend job card" variant="secondary" inline />}
                    <ActionForm
                      action={orderStatusAction.bind(null, o.id, 'cancelled')}
                      submitLabel="Cancel"
                      variant="danger"
                      confirm="Cancel this order? The amount is removed from the guest's balance."
                      inline
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

