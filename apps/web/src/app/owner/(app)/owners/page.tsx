import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { UpgradeNote } from '@/components/owner/Upgrade';
import type { Translator } from '@/i18n/owner/t';
import { listProperties } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { getMe, ownerTry, type PropertyOwnerRow } from '@/lib/owner-r3';
import { assignOwnerAction, saveOwnerAction } from '../../actions-r3';

export async function generateMetadata() {
  return { title: (await getT())('owners.metaTitle') };
}

/** Manager companies: the owners whose properties you run, their fee, and who owns what. */
export default async function OwnersPage() {
  const me = await getMe();
  if (!me.flags.owner_statements) return <UpgradeNote feature="owner_statements" />;
  const [res, properties, t] = await Promise.all([ownerTry<PropertyOwnerRow[]>('/owners'), listProperties(), getT()]);
  if (!res.data) return <UpgradeNote feature="owner_statements" message={res.error.message} />;
  const owners = res.data;
  const ownerOptions: [string, string][] = [['', t('owners.noOwner')], ...owners.map((o) => [o.id, o.name] as [string, string])];
  const ownerOf = new Map(owners.flatMap((o) => o.propertyIds.map((pid) => [pid, o.id] as const)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t('owners.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('owners.intro')}</p>
      </div>

      <Section title={t('owners.listTitle', { n: owners.length })}>
        {owners.length === 0 ? (
          <Empty>{t('owners.empty')}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {owners.map((o) => (
              <li key={o.id} className="py-3">
                <Link href={`/owner/owners/${o.id}`} className="flex min-h-11 items-center gap-3 rounded-lg hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {o.name} {!o.active && <span className="pill bg-surface-2 text-muted">{t('owners.inactive')}</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {t('owners.feePct', { n: o.managementFeePct })}, {t.n('owners.properties', o.propertyIds.length)},{' '}
                      {o.hasPayoutDetails ? t('owners.bankOnFile') : t('owners.noBank')}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-brand">{t('owners.statements')}</span>
                  <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
                </Link>
                <details className="mt-1">
                  <summary className="cursor-pointer text-sm font-medium text-brand">{t('common.edit')}</summary>
                  <div className="mt-3">
                    <ActionForm action={saveOwnerAction.bind(null, o.id)} submitLabel={t('owners.save')}>
                      <OwnerFields o={o} idPrefix={o.id} t={t} />
                      <Check label={t('owners.active')} name="active" defaultChecked={o.active} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3 rounded-xl border border-dashed border-line p-3">
          <summary className="cursor-pointer font-medium text-brand">{t('owners.add')}</summary>
          <div className="mt-3">
            <ActionForm action={saveOwnerAction.bind(null, null)} submitLabel={t('owners.addButton')}>
              <OwnerFields idPrefix="new" t={t} />
            </ActionForm>
          </div>
        </details>
      </Section>

      <Section title={t('owners.whoOwns')}>
        <ul className="divide-y divide-line">
          {properties.map((p) => (
            <li key={p.id} className="py-3">
              <ActionForm action={assignOwnerAction.bind(null, p.id)} submitLabel={t('common.save')} variant="secondary" inline>
                <span className="min-w-40 flex-1 font-medium">{p.name}</span>
                <Select
                  label={t('owners.ownerOf', { name: p.name })}
                  name="ownerId"
                  id={`own-${p.id}`}
                  options={ownerOptions}
                  defaultValue={ownerOf.get(p.id) ?? ''}
                  className="[&_label]:sr-only"
                />
              </ActionForm>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function OwnerFields({ o, idPrefix, t }: { o?: PropertyOwnerRow; idPrefix: string; t: Translator }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t('owners.name')} name="name" id={`${idPrefix}-name`} required defaultValue={o?.name} className="sm:col-span-2" />
        <Field
          label={t('owners.fee')}
          name="managementFeePct"
          id={`${idPrefix}-fee`}
          type="number"
          min={0}
          max={60}
          step="0.5"
          defaultValue={o?.managementFeePct ?? 20}
        />
        <Field label={t('owners.phone')} name="phone" id={`${idPrefix}-phone`} type="tel" defaultValue={o?.phone ?? ''} />
        <Field label={t('owners.email')} name="email" id={`${idPrefix}-email`} type="email" defaultValue={o?.email ?? ''} className="sm:col-span-2" />
      </div>
      <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">{o?.hasPayoutDetails ? t('owners.payoutKept') : t('owners.payout')}</legend>
        <Field label={t('owners.bank')} name="bankName" id={`${idPrefix}-bank`} autoComplete="off" />
        <Field label={t('owners.accountName')} name="accountName" id={`${idPrefix}-accname`} autoComplete="off" />
        <Field label={t('owners.accountNumber')} name="accountNumber" id={`${idPrefix}-accno`} autoComplete="off" inputMode="numeric" />
        <Field label={t('owners.branch')} name="branch" id={`${idPrefix}-branch`} autoComplete="off" />
        <Field label={t('owners.swift')} name="swift" id={`${idPrefix}-swift`} autoComplete="off" />
      </fieldset>
      <TextArea label={t('owners.notes')} name="notes" id={`${idPrefix}-notes`} defaultValue={o?.notes} rows={2} />
    </div>
  );
}
