import { Check, Minus } from 'lucide-react';
import type { FeatureFlag } from '@staydirect/shared';
import { Empty, Section } from '@/components/owner/fields';
import { fmtDate, money } from '@/lib/format';
import { FEATURE_INFO, getMe, monthLabel, ownerTry, PLAN_LABEL, type LedgerRow } from '@/lib/owner-r3';

export const metadata = { title: 'Plan and billing' };

interface BillingOverview {
  ledger: LedgerRow[];
  flags: Record<FeatureFlag, boolean>;
  pricing: Record<string, { flat: number; extraPropertyFee: number; extraFrom: number; pct: number; maxProperties: number | null }>;
}

/** What the owner pays StayDirect: plan, included features, and the monthly commission ledger. */
export default async function BillingPage() {
  const me = await getMe();
  const res = await ownerTry<BillingOverview>('/billing');
  const data = res.data;
  const plan = me.tenant.plan;
  const p = data?.pricing[plan];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Plan and billing</h1>
      <Section title={`${PLAN_LABEL[plan] ?? plan} plan`}>
        {p && (
          <p className="text-sm text-muted">
            LKR {p.flat.toLocaleString('en-US')} a month
            {p.extraPropertyFee ? ` + LKR ${p.extraPropertyFee.toLocaleString('en-US')} per ${plan === 'manager' ? 'managed' : 'extra'} property` : ''}, or {p.pct}% of direct
            bookings instead. Plus 10% of every add-on sold.
            {me.tenant.billing_status === 'trial' && <strong className="text-fg"> You are on the free pilot: the subscription is waived.</strong>}
          </p>
        )}
        <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {(Object.keys(FEATURE_INFO) as FeatureFlag[]).map((k) => {
            const on = me.flags[k];
            return (
              <li key={k} className="flex items-center gap-2">
                {on ? <Check aria-hidden className="h-4 w-4 text-ok" /> : <Minus aria-hidden className="h-4 w-4 text-muted" />}
                <span className={on ? '' : 'text-muted'}>
                  {FEATURE_INFO[k].label}
                  <span className="sr-only">{on ? ' — included' : ' — not included'}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Monthly statements from StayDirect">
        {!data || data.ledger.length === 0 ? (
          <Empty>Nothing billed yet. Statements appear on the 1st of each month.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">Amounts owed to StayDirect per month, in LKR</caption>
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Month</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Plan</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Add-ons</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Total</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.ledger.map((l) => (
                  <tr key={l.id}>
                    <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                      {monthLabel(l.period)}
                      <span className="block text-xs font-normal text-muted">
                        {l.properties} propert{l.properties === 1 ? 'y' : 'ies'} · {l.billingModel === 'pct' ? `% of ${money(l.directBookingValue, 'LKR')} direct` : 'flat'}
                      </span>
                    </th>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(l.billingModel === 'pct' ? l.pctFee : l.subscriptionFee, l.currency)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(l.addOnCommission, l.currency)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{money(l.totalDue, l.currency)}</td>
                    <td className="py-2.5">
                      <span className={`pill ${l.status === 'paid' ? 'bg-ok-bg text-ok' : l.status === 'void' ? 'bg-surface-2 text-muted' : 'bg-bad-bg text-bad'}`}>
                        {l.status === 'paid' ? `Paid${l.paidAt ? ` ${fmtDate(l.paidAt.slice(0, 10))}` : ''}` : l.status === 'void' ? 'Void' : 'Due'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">Pay by bank transfer, LankaQR or PayHere. Questions about a statement? Open a support ticket.</p>
      </Section>
    </div>
  );
}
