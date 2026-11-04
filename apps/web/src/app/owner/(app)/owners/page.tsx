import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { listProperties } from '@/lib/owner';
import { getMe, ownerTry, type PropertyOwnerRow } from '@/lib/owner-r3';
import { assignOwnerAction, saveOwnerAction } from '../../actions-r3';

export const metadata = { title: 'Property owners' };

/** Manager companies: the owners whose properties you run, their fee, and who owns what. */
export default async function OwnersPage() {
  const me = await getMe();
  if (!me.flags.owner_statements) return <UpgradeNote feature="owner_statements" />;
  const [res, properties] = await Promise.all([ownerTry<PropertyOwnerRow[]>('/owners'), listProperties()]);
  if (!res.data) return <UpgradeNote feature="owner_statements" message={res.error.message} />;
  const owners = res.data;
  const ownerOptions: [string, string][] = [['', 'No owner (yours)'], ...owners.map((o) => [o.id, o.name] as [string, string])];
  const ownerOf = new Map(owners.flatMap((o) => o.propertyIds.map((pid) => [pid, o.id] as const)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Property owners</h1>
        <p className="mt-1 text-sm text-muted">Each month you send every owner a statement: room revenue, their share of add-ons, minus your fee and expenses.</p>
      </div>

      <Section title={`Owners (${owners.length})`}>
        {owners.length === 0 ? (
          <Empty>No owners yet. Add the people whose properties you manage.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {owners.map((o) => (
              <li key={o.id} className="py-3">
                <Link href={`/owner/owners/${o.id}`} className="flex min-h-11 items-center gap-3 rounded-lg hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {o.name} {!o.active && <span className="pill bg-surface-2 text-muted">Inactive</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {o.managementFeePct}% fee · {o.propertyIds.length} propert{o.propertyIds.length === 1 ? 'y' : 'ies'}
                      {o.hasPayoutDetails ? ' · bank details on file' : ' · no bank details'}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-brand">Statements</span>
                  <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
                </Link>
                <details className="mt-1">
                  <summary className="cursor-pointer text-sm font-medium text-brand">Edit</summary>
                  <div className="mt-3">
                    <ActionForm action={saveOwnerAction.bind(null, o.id)} submitLabel="Save owner">
                      <OwnerFields o={o} idPrefix={o.id} />
                      <Check label="Active" name="active" defaultChecked={o.active} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">Add an owner</summary>
          <div className="mt-3">
            <ActionForm action={saveOwnerAction.bind(null, null)} submitLabel="Add owner">
              <OwnerFields idPrefix="new" />
            </ActionForm>
          </div>
        </details>
      </Section>

      <Section title="Who owns each property">
        <ul className="divide-y divide-line">
          {properties.map((p) => (
            <li key={p.id} className="py-3">
              <ActionForm action={assignOwnerAction.bind(null, p.id)} submitLabel="Save" variant="secondary" inline>
                <span className="min-w-40 flex-1 font-medium">{p.name}</span>
                <Select label={`Owner of ${p.name}`} name="ownerId" id={`own-${p.id}`} options={ownerOptions} defaultValue={ownerOf.get(p.id) ?? ''} className="[&_label]:sr-only" />
              </ActionForm>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function OwnerFields({ o, idPrefix }: { o?: PropertyOwnerRow; idPrefix: string }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Name" name="name" id={`${idPrefix}-name`} required defaultValue={o?.name} className="sm:col-span-2" />
        <Field label="Management fee %" name="managementFeePct" id={`${idPrefix}-fee`} type="number" min={0} max={60} step="0.5" defaultValue={o?.managementFeePct ?? 20} />
        <Field label="Phone" name="phone" id={`${idPrefix}-phone`} type="tel" defaultValue={o?.phone ?? ''} />
        <Field label="Email" name="email" id={`${idPrefix}-email`} type="email" defaultValue={o?.email ?? ''} className="sm:col-span-2" />
      </div>
      <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">Payout bank account {o?.hasPayoutDetails ? '(on file — leave blank to keep)' : ''}</legend>
        <Field label="Bank" name="bankName" id={`${idPrefix}-bank`} autoComplete="off" />
        <Field label="Account name" name="accountName" id={`${idPrefix}-accname`} autoComplete="off" />
        <Field label="Account number" name="accountNumber" id={`${idPrefix}-accno`} autoComplete="off" inputMode="numeric" />
        <Field label="Branch" name="branch" id={`${idPrefix}-branch`} autoComplete="off" />
        <Field label="SWIFT" name="swift" id={`${idPrefix}-swift`} autoComplete="off" />
      </fieldset>
      <TextArea label="Notes" name="notes" id={`${idPrefix}-notes`} defaultValue={o?.notes} rows={2} />
    </div>
  );
}
