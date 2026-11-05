import { Check, Minus } from 'lucide-react';
import type { FeatureFlag } from '@staydirect/shared';
import { Empty, Section } from '@/components/owner/fields';
import { money } from '@/lib/format';
import { getT } from '@/lib/owner-i18n';
import { FEATURE_INFO, getMe, ownerTry, PLAN_LABEL, type LedgerRow } from '@/lib/owner-r3';

export async function generateMetadata() {
  return { title: (await getT())('billing.title') };
}

interface BillingOverview {
  ledger: LedgerRow[];
  flags: Record<FeatureFlag, boolean>;
  pricing: Record<string, { flat: number; extraPropertyFee: number; extraFrom: number; pct: number; maxProperties: number | null }>;
}

const PLANS = ['basic', 'pro', 'pro_multi', 'manager'] as const;

/** What the owner pays StayDirect: plan, included features, and the monthly commission ledger. */
export default async function BillingPage() {
  const [me, res, t] = await Promise.all([getMe(), ownerTry<BillingOverview>('/billing'), getT()]);
  const data = res.data;
  const plan = me.tenant.plan;
  const p = data?.pricing[plan];
  const planName = (PLANS as readonly string[]).includes(plan) ? t(`billing.plans.${plan}`) : (PLAN_LABEL[plan] ?? plan);
  const lkr = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t('billing.title')}</h1>
      <Section title={t('billing.planTitle', { plan: planName })}>
        {p && (
          <p className="text-sm text-muted">
            {t('billing.priceFlat', { flat: lkr(p.flat) })}
            {p.extraPropertyFee ? t(plan === 'manager' ? 'billing.priceExtraManaged' : 'billing.priceExtra', { fee: lkr(p.extraPropertyFee) }) : ''}
            {t('billing.priceOr', { pct: p.pct })}
            {me.tenant.billing_status === 'trial' && <strong className="text-fg"> {t('billing.pilot')}</strong>}
          </p>
        )}
        <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {(Object.keys(FEATURE_INFO) as FeatureFlag[]).map((k) => {
            const on = me.flags[k];
            return (
              <li key={k} className="flex items-center gap-2">
                {on ? <Check aria-hidden className="h-4 w-4 text-ok" /> : <Minus aria-hidden className="h-4 w-4 text-muted" />}
                <span className={on ? '' : 'text-muted'}>
                  {t(`billing.features.${k}`)}
                  <span className="sr-only">: {on ? t('billing.included') : t('billing.notIncluded')}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t('billing.statementsTitle')}>
        {!data || data.ledger.length === 0 ? (
          <Empty>{t('billing.empty')}</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">{t('billing.caption')}</caption>
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t('billing.month')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {t('billing.plan')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {t('billing.addOns')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {t('billing.total')}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t('billing.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.ledger.map((l) => (
                  <tr key={l.id}>
                    <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                      {t.month(l.period)}
                      <span className="block text-xs font-normal text-muted">
                        {t.n('billing.properties', l.properties)},{' '}
                        {l.billingModel === 'pct' ? t('billing.pctOf', { amount: money(l.directBookingValue, 'LKR') }) : t('billing.flat')}
                      </span>
                    </th>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(l.billingModel === 'pct' ? l.pctFee : l.subscriptionFee, l.currency)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(l.addOnCommission, l.currency)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{money(l.totalDue, l.currency)}</td>
                    <td className="py-2.5">
                      <span className={`pill ${l.status === 'paid' ? 'bg-ok-bg text-ok' : l.status === 'void' ? 'bg-surface-2 text-muted' : 'bg-bad-bg text-bad'}`}>
                        {l.status === 'paid'
                          ? l.paidAt
                            ? t('billing.paidOn', { date: t.date(l.paidAt.slice(0, 10)) })
                            : t('billing.paid')
                          : l.status === 'void'
                            ? t('billing.void')
                            : t('billing.due')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">{t('billing.payNote')}</p>
      </Section>
    </div>
  );
}
