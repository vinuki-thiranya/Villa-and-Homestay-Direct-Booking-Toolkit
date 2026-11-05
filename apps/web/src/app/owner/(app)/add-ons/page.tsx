import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Section } from '@/components/owner/fields';
import { money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { OrderBadge } from '@/components/owner/OrderBadge';
import type { AddOnOrder, Commissions } from '@/lib/owner-types';
import { orderStatusAction, resendJobCardAction } from '../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('addons.title') };
}

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
  const [orders, commissions, t] = await Promise.all([
    ownerApi<AddOnOrder[]>(`/properties/${property.id}/add-on-orders${qs.size ? `?${qs}` : ''}`),
    ownerApi<Commissions>(`/properties/${property.id}/add-on-commissions?month=${month}`),
    getT(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('addons.title')}</h1>
        <Link href="/owner/setup/add-ons" className="text-sm font-medium text-brand">
          {t('addons.catalogue')}
        </Link>
      </div>

      <Section title={t('addons.commissions', { month })}>
        <form className="mb-3 flex items-end gap-2">
          <div>
            <label htmlFor="month" className="label">
              {t('addons.month')}
            </label>
            <input id="month" name="month" type="month" defaultValue={month} className="field" />
          </div>
          <button className="btn-secondary">{t('addons.show')}</button>
        </form>
        {commissions.byCurrency.length === 0 ? (
          <p className="text-sm text-muted">{t('addons.noSales')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 font-medium">{t('addons.currency')}</th>
                  <th className="py-1 text-right font-medium">{t('addons.orders')}</th>
                  <th className="py-1 text-right font-medium">{t('addons.sales')}</th>
                  <th className="py-1 text-right font-medium">{t('addons.earned')}</th>
                  <th className="py-1 text-right font-medium">{t('addons.providers')}</th>
                  <th className="py-1 text-right font-medium">{t('addons.platformFee')}</th>
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
            <p className="mt-2 text-xs text-muted">{t('addons.feeNote')}</p>
          </div>
        )}
      </Section>

      <Section title={t('addons.ordersTitle', { n: orders.length })}>
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="from" className="label">
              {t('addons.from')}
            </label>
            <input id="from" name="from" type="date" defaultValue={from} className="field" />
          </div>
          <div>
            <label htmlFor="to" className="label">
              {t('addons.to')}
            </label>
            <input id="to" name="to" type="date" defaultValue={to} className="field" />
          </div>
          <button className="btn-secondary">{t('addons.filter')}</button>
          {(from || to) && (
            <Link href="/owner/add-ons" className="text-sm text-brand">
              {t('addons.clear')}
            </Link>
          )}
        </form>
        {orders.length === 0 ? (
          <Empty>{t('addons.empty')}</Empty>
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
                      {t.date(o.date)}
                      {o.time ? ` ${o.time}` : ''},{' '}
                      <Link href={`/owner/bookings/${o.bookingId}`} className="text-brand underline-offset-2 hover:underline">
                        {o.guestName ?? o.bookingReference}
                      </Link>
                      , {o.providerName ?? t('addons.noProvider')}
                    </p>
                    <p className="text-sm">
                      {t('addons.split', {
                        amount: money(o.amount, o.currency),
                        own: money(o.ownerAmount, o.currency),
                        provider: money(o.providerAmount, o.currency),
                      })}
                    </p>
                    {o.notes && <p className="text-sm text-muted">“{o.notes}”</p>}
                    <p className="text-xs text-muted">
                      {o.providerNotifiedAt ? t('addons.jobCardSent', { when: t.dateTime(o.providerNotifiedAt) }) : t('addons.jobCardNotSent')}
                      {o.providerConfirmedAt ? `, ${t('addons.accepted', { when: t.dateTime(o.providerConfirmedAt) })}` : ''}
                    </p>
                  </div>
                  <OrderBadge status={o.status} />
                </div>
                {o.status !== 'cancelled' && o.status !== 'done' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {o.status === 'requested' && <ActionForm action={orderStatusAction.bind(null, o.id, 'confirmed')} submitLabel={t('addons.confirm')} inline />}
                    <ActionForm action={orderStatusAction.bind(null, o.id, 'done')} submitLabel={t('addons.markDone')} variant="secondary" inline />
                    {o.providerId && (
                      <ActionForm action={resendJobCardAction.bind(null, o.id)} submitLabel={t('addons.resend')} variant="secondary" inline />
                    )}
                    <ActionForm
                      action={orderStatusAction.bind(null, o.id, 'cancelled')}
                      submitLabel={t('addons.cancel')}
                      variant="danger"
                      confirm={t('addons.cancelConfirm')}
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

