import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section } from '@/components/owner/fields';
import { fmtDate } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import type { DiscountCode } from '@/lib/owner-types';
import { createCodeAction, deactivateCodeAction } from '../../../actions-r2';

export const metadata = { title: 'Discount codes' };

export default async function CodesPage() {
  const property = await currentProperty();
  if (!property) return null;
  const codes = await ownerApi<DiscountCode[]>(`/properties/${property.id}/discount-codes`);
  const inSixMonths = new Date(Date.now() + 182 * 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <Link href="/owner/guests" className="text-sm text-brand">
        ← Guests
      </Link>
      <h1 className="text-2xl font-semibold">Discount codes</h1>

      <Section title="Create a code">
        <ActionForm action={createCodeAction.bind(null, property.id)} submitLabel="Create code">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Code" name="code" required minLength={4} maxLength={24} pattern="[A-Za-z0-9-]+" placeholder="SUMMER10" hint="Letters, numbers, dashes" />
            <Field label="Discount (%)" name="pct" type="number" min={1} max={50} step="0.5" required defaultValue={10} />
            <Field label="Valid until" name="expiresAt" type="date" required defaultValue={inSixMonths} />
            <Field label="Max uses" name="maxUses" type="number" min={1} max={1000} defaultValue={1} />
          </div>
        </ActionForm>
        <p className="mt-2 text-xs text-muted">Put a code on your reception card or in OTA messages where allowed. Repeat guests get a personal code automatically 11 months after their stay.</p>
      </Section>

      <Section title={`Codes (${codes.length})`}>
        {codes.length === 0 ? (
          <Empty>No codes yet.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {codes.map((c) => {
              const expired = c.expiresAt < new Date().toISOString().slice(0, 10);
              const usedUp = c.uses >= c.maxUses;
              const live = c.active && !expired && !usedUp;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <code className="font-mono text-base font-semibold">{c.code}</code>
                  <span className="text-sm">
                    {c.pct}% · until {fmtDate(c.expiresAt)} · used {c.uses}/{c.maxUses}
                    {c.reason === 'repeat_guest' && c.guestName ? ` · for ${c.guestName}` : ''}
                  </span>
                  <span className={`pill ${live ? 'bg-ok-bg text-ok' : 'bg-surface-2 text-muted'}`}>
                    {live ? 'Active' : !c.active ? 'Off' : expired ? 'Expired' : 'Used up'}
                  </span>
                  {c.active && (
                    <span className="ml-auto">
                      <ActionForm action={deactivateCodeAction.bind(null, c.id)} submitLabel="Switch off" variant="danger" confirm={`Switch off ${c.code}?`} inline />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
