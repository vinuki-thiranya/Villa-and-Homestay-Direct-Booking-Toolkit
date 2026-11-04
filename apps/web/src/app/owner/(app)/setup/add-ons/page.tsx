import { reinstateProviderAction } from '../../../actions-r3';
import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { ADD_ON_CATEGORY_LABEL, type OwnerAddOn, type Provider } from '@/lib/owner-types';
import { saveAddOnAction, saveProviderAction } from '../../../actions-r2';

export const metadata = { title: 'Add-ons setup' };

const CATEGORIES = Object.entries(ADD_ON_CATEGORY_LABEL) as [string, string][];

export default async function AddOnSetupPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [addOns, providers] = await Promise.all([
    ownerApi<OwnerAddOn[]>(`/properties/${property.id}/add-ons`),
    ownerApi<Provider[]>('/providers'),
  ]);
  const providerOptions: [string, string][] = [['', 'No provider (you handle it)'], ...providers.filter((p) => p.active).map((p) => [p.id, p.name] as [string, string])];

  return (
    <div className="space-y-5">
      <Section title={`Experiences & services (${addOns.length})`}>
        <p className="mb-3 text-sm text-muted">
          Guests order these from their booking page or the WhatsApp concierge. The provider gets a job card on WhatsApp; the amount is added to the
          guest&apos;s balance. Each sale is split: provider, your share, and the StayDirect fee.
        </p>
        {addOns.length === 0 ? (
          <Empty>No add-ons yet. Airport pickup and surf lessons are the most popular.</Empty>
        ) : (
          <ul className="space-y-3">
            {addOns.map((a) => {
              const providerShare = 100 - a.commissionPct - a.platformPct;
              return (
                <li key={a.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <span className="pill bg-surface-2 text-muted">{ADD_ON_CATEGORY_LABEL[a.category] ?? a.category}</span>
                    {!a.active && <span className="pill bg-bad-bg text-bad">Hidden</span>}
                    <span className="ml-auto font-semibold">{money(a.price, a.currency)}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {a.providerName ?? 'No provider'} · provider {providerShare}% · you {a.commissionPct}% · StayDirect {a.platformPct}% · order{' '}
                    {a.leadTimeHours}h ahead
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-brand">Edit</summary>
                    <div className="mt-3">
                      <ActionForm action={saveAddOnAction.bind(null, property.id, a.id)} submitLabel="Save">
                        <AddOnFields a={a} idPrefix={a.id} providerOptions={providerOptions} />
                        <Check label="Show to guests" name="active" defaultChecked={a.active} />
                      </ActionForm>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">Add an experience</summary>
          <div className="mt-3">
            <ActionForm action={saveAddOnAction.bind(null, property.id, null)} submitLabel="Add">
              <AddOnFields idPrefix="new" providerOptions={providerOptions} currency={property.baseCurrency} />
            </ActionForm>
          </div>
        </details>
      </Section>

      <Section title={`Providers (${providers.length})`}>
        <p className="mb-3 text-sm text-muted">Drivers, guides and surf schools you work with. They only need WhatsApp.</p>
        {providers.length === 0 ? (
          <Empty>No providers yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {providers.map((p) => (
              <li key={p.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  <span className="text-sm text-muted">{p.phone}</span>
                  {p.rating != null && (
                    <span className="text-sm text-muted">
                      · ★ {Number(p.rating).toFixed(1)} ({p.ratingCount})
                    </span>
                  )}
                  {!p.active && !p.removedAt && <span className="pill bg-bad-bg text-bad">Inactive</span>}
                  {p.removedAt && <span className="pill bg-bad-bg text-bad">Removed by guest ratings</span>}
                </div>
                {p.removedAt && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-bad-bg/60 p-3 text-sm">
                    <p className="min-w-0 flex-1 text-bad">{p.removedReason ?? 'Average rating below 4.0'}. Their add-ons were switched off.</p>
                    <ActionForm action={reinstateProviderAction.bind(null, p.id)} submitLabel="Reinstate" variant="secondary" inline confirm={`Reinstate ${p.name}? Their add-ons stay off until you switch them on.`} />
                  </div>
                )}
                <p className="text-sm text-muted">{p.serviceTypes.map((t) => ADD_ON_CATEGORY_LABEL[t] ?? t).join(', ') || 'No services listed'}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-brand">Edit</summary>
                  <div className="mt-3">
                    <ActionForm action={saveProviderAction.bind(null, p.id)} submitLabel="Save">
                      <ProviderFields p={p} idPrefix={p.id} />
                      <Check label="Active" name="active" defaultChecked={p.active} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">Add a provider</summary>
          <div className="mt-3">
            <ActionForm action={saveProviderAction.bind(null, null)} submitLabel="Add">
              <ProviderFields idPrefix="newp" />
            </ActionForm>
          </div>
        </details>
      </Section>
    </div>
  );
}

function AddOnFields({ a, idPrefix, providerOptions, currency }: { a?: OwnerAddOn; idPrefix: string; providerOptions: [string, string][]; currency?: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" name="name" id={`${idPrefix}-name`} required minLength={2} defaultValue={a?.name} className="sm:col-span-2" />
        <Select label="Category" name="category" id={`${idPrefix}-cat`} options={CATEGORIES} defaultValue={a?.category ?? 'airport_pickup'} />
      </div>
      <TextArea label="Description" name="description" id={`${idPrefix}-desc`} rows={2} defaultValue={a?.description} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Price" name="price" id={`${idPrefix}-price`} type="number" min={0} step="0.01" required defaultValue={a?.price} />
        <Select
          label="Currency"
          name="currency"
          id={`${idPrefix}-cur`}
          options={[
            ['USD', 'USD'],
            ['LKR', 'LKR'],
          ]}
          defaultValue={a?.currency ?? currency ?? 'USD'}
        />
        <Select label="Provider" name="providerId" id={`${idPrefix}-prov`} options={providerOptions} defaultValue={a?.providerId ?? ''} className="sm:col-span-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Your share (%)" name="commissionPct" id={`${idPrefix}-own`} type="number" min={0} max={50} step="0.5" defaultValue={a?.commissionPct ?? 12.5} />
        <Field label="StayDirect fee (%)" name="platformPct" id={`${idPrefix}-plat`} type="number" min={0} max={30} step="0.5" defaultValue={a?.platformPct ?? 10} />
        <Field label="Order ahead (hours)" name="leadTimeHours" id={`${idPrefix}-lead`} type="number" min={0} max={720} defaultValue={a?.leadTimeHours ?? 24} />
        <Field label="Sort order" name="sortOrder" id={`${idPrefix}-sort`} type="number" defaultValue={a?.sortOrder ?? 0} />
      </div>
      <Field label="Photo URL" name="photoUrl" id={`${idPrefix}-photo`} type="url" defaultValue={a?.photoUrl ?? ''} />
    </>
  );
}

function ProviderFields({ p, idPrefix }: { p?: Provider; idPrefix: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" id={`${idPrefix}-name`} required minLength={2} defaultValue={p?.name} />
        <Field label="WhatsApp number" name="phone" id={`${idPrefix}-phone`} type="tel" required defaultValue={p?.phone} />
      </div>
      <fieldset>
        <legend className="label">Services</legend>
        <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
          {CATEGORIES.map(([v, l]) => (
            <label key={v} className="flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" name="serviceTypes" value={v} defaultChecked={p?.serviceTypes.includes(v)} className="h-4 w-4 accent-[var(--brand)]" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
