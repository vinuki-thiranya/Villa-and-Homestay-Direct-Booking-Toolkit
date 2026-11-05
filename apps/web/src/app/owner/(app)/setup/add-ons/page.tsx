import { reinstateProviderAction } from '../../../actions-r3';
import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import type { setup as enSetup } from '@/i18n/owner/en/setup';
import type { Translator } from '@/i18n/owner/t';
import { money } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { ADD_ON_CATEGORY_LABEL, type OwnerAddOn, type Provider } from '@/lib/owner-types';
import { saveAddOnAction, saveProviderAction } from '../../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('setup.addOns.metaTitle') };
}

const CATEGORY_KEYS = Object.keys(ADD_ON_CATEGORY_LABEL);
type CategoryKey = keyof typeof enSetup.addOns.categories;
/** Category name in the owner's language; unknown categories keep their English label. */
function categoryLabel(t: Translator, c: string): string {
  const key = `setup.addOns.categories.${c as CategoryKey}` as const;
  const v = t(key);
  return v === key ? (ADD_ON_CATEGORY_LABEL[c] ?? c) : v;
}

export default async function AddOnSetupPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [addOns, providers] = await Promise.all([
    ownerApi<OwnerAddOn[]>(`/properties/${property.id}/add-ons`),
    ownerApi<Provider[]>('/providers'),
  ]);
  const t = await getT();
  const providerOptions: [string, string][] = [['', t('setup.addOns.noProviderOption')], ...providers.filter((p) => p.active).map((p) => [p.id, p.name] as [string, string])];

  return (
    <div className="space-y-5">
      <Section title={t('setup.addOns.title', { n: addOns.length })}>
        <p className="mb-3 text-sm text-muted">{t('setup.addOns.intro')}</p>
        {addOns.length === 0 ? (
          <Empty>{t('setup.addOns.empty')}</Empty>
        ) : (
          <ul className="space-y-3">
            {addOns.map((a) => {
              const providerShare = 100 - a.commissionPct - a.platformPct;
              return (
                <li key={a.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <span className="pill bg-surface-2 text-muted">{categoryLabel(t, a.category)}</span>
                    {!a.active && <span className="pill bg-bad-bg text-bad">{t('setup.addOns.hidden')}</span>}
                    <span className="ml-auto font-semibold">{money(a.price, a.currency)}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {t('setup.addOns.split', {
                      provider: a.providerName ?? t('setup.addOns.noProvider'),
                      providerPct: providerShare,
                      ownPct: a.commissionPct,
                      platformPct: a.platformPct,
                      hours: a.leadTimeHours,
                    })}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-brand">{t('common.edit')}</summary>
                    <div className="mt-3">
                      <ActionForm action={saveAddOnAction.bind(null, property.id, a.id)} submitLabel={t('common.save')}>
                        <AddOnFields a={a} idPrefix={a.id} providerOptions={providerOptions} t={t} />
                        <Check label={t('setup.addOns.showToGuests')} name="active" defaultChecked={a.active} />
                      </ActionForm>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">{t('setup.addOns.addExperience')}</summary>
          <div className="mt-3">
            <ActionForm action={saveAddOnAction.bind(null, property.id, null)} submitLabel={t('common.add')}>
              <AddOnFields idPrefix="new" providerOptions={providerOptions} currency={property.baseCurrency} t={t} />
            </ActionForm>
          </div>
        </details>
      </Section>

      <Section title={t('setup.addOns.providersTitle', { n: providers.length })}>
        <p className="mb-3 text-sm text-muted">{t('setup.addOns.providersIntro')}</p>
        {providers.length === 0 ? (
          <Empty>{t('setup.addOns.providersEmpty')}</Empty>
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
                  {!p.active && !p.removedAt && <span className="pill bg-bad-bg text-bad">{t('setup.addOns.inactive')}</span>}
                  {p.removedAt && <span className="pill bg-bad-bg text-bad">{t('setup.addOns.removed')}</span>}
                </div>
                {p.removedAt && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-bad-bg/60 p-3 text-sm">
                    <p className="min-w-0 flex-1 text-bad">
                      {t('setup.addOns.removedNote', { reason: p.removedReason ?? t('setup.addOns.removedReason') })}
                    </p>
                    <ActionForm
                      action={reinstateProviderAction.bind(null, p.id)}
                      submitLabel={t('setup.addOns.reinstate')}
                      variant="secondary"
                      inline
                      confirm={t('setup.addOns.reinstateConfirm', { name: p.name })}
                    />
                  </div>
                )}
                <p className="text-sm text-muted">{p.serviceTypes.map((c) => categoryLabel(t, c)).join(', ') || t('setup.addOns.noServices')}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-brand">{t('common.edit')}</summary>
                  <div className="mt-3">
                    <ActionForm action={saveProviderAction.bind(null, p.id)} submitLabel={t('common.save')}>
                      <ProviderFields p={p} idPrefix={p.id} t={t} />
                      <Check label={t('setup.addOns.active')} name="active" defaultChecked={p.active} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">{t('setup.addOns.addProvider')}</summary>
          <div className="mt-3">
            <ActionForm action={saveProviderAction.bind(null, null)} submitLabel={t('common.add')}>
              <ProviderFields idPrefix="newp" t={t} />
            </ActionForm>
          </div>
        </details>
      </Section>
    </div>
  );
}

function AddOnFields({
  a,
  idPrefix,
  providerOptions,
  currency,
  t,
}: {
  a?: OwnerAddOn;
  idPrefix: string;
  providerOptions: [string, string][];
  currency?: string;
  t: Translator;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('setup.addOns.name')} name="name" id={`${idPrefix}-name`} required minLength={2} defaultValue={a?.name} className="sm:col-span-2" />
        <Select
          label={t('setup.addOns.category')}
          name="category"
          id={`${idPrefix}-cat`}
          options={CATEGORY_KEYS.map((c) => [c, categoryLabel(t, c)] as [string, string])}
          defaultValue={a?.category ?? 'airport_pickup'}
        />
      </div>
      <TextArea label={t('setup.addOns.description')} name="description" id={`${idPrefix}-desc`} rows={2} defaultValue={a?.description} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t('setup.addOns.price')} name="price" id={`${idPrefix}-price`} type="number" min={0} step="0.01" required defaultValue={a?.price} />
        <Select
          label={t('setup.addOns.currency')}
          name="currency"
          id={`${idPrefix}-cur`}
          options={[
            ['USD', 'USD'],
            ['LKR', 'LKR'],
          ]}
          defaultValue={a?.currency ?? currency ?? 'USD'}
        />
        <Select
          label={t('setup.addOns.provider')}
          name="providerId"
          id={`${idPrefix}-prov`}
          options={providerOptions}
          defaultValue={a?.providerId ?? ''}
          className="sm:col-span-2"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field
          label={t('setup.addOns.yourShare')}
          name="commissionPct"
          id={`${idPrefix}-own`}
          type="number"
          min={0}
          max={50}
          step="0.5"
          defaultValue={a?.commissionPct ?? 12.5}
        />
        <Field
          label={t('setup.addOns.platformFee')}
          name="platformPct"
          id={`${idPrefix}-plat`}
          type="number"
          min={0}
          max={30}
          step="0.5"
          defaultValue={a?.platformPct ?? 10}
        />
        <Field label={t('setup.addOns.leadTime')} name="leadTimeHours" id={`${idPrefix}-lead`} type="number" min={0} max={720} defaultValue={a?.leadTimeHours ?? 24} />
        <Field label={t('setup.addOns.sortOrder')} name="sortOrder" id={`${idPrefix}-sort`} type="number" defaultValue={a?.sortOrder ?? 0} />
      </div>
      <Field label={t('setup.addOns.photo')} name="photoUrl" id={`${idPrefix}-photo`} type="url" defaultValue={a?.photoUrl ?? ''} />
    </>
  );
}

function ProviderFields({ p, idPrefix, t }: { p?: Provider; idPrefix: string; t: Translator }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('setup.addOns.name')} name="name" id={`${idPrefix}-name`} required minLength={2} defaultValue={p?.name} />
        <Field label={t('setup.addOns.phone')} name="phone" id={`${idPrefix}-phone`} type="tel" required defaultValue={p?.phone} />
      </div>
      <fieldset>
        <legend className="label">{t('setup.addOns.services')}</legend>
        <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
          {CATEGORY_KEYS.map((v) => [v, categoryLabel(t, v)] as const).map(([v, l]) => (
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
