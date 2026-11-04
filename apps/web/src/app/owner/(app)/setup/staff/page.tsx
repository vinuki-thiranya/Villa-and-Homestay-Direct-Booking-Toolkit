import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Check, Empty, Field, Section, Select } from '@/components/owner/fields';
import type { Translator } from '@/i18n/owner/t';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { STAFF_ROLE_LABEL, type Staff } from '@/lib/owner-types';
import { saveStaffAction } from '../../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('setup.staff.metaTitle') };
}

const ROLE_KEYS = ['cleaner', 'maintenance', 'front_desk'] as const;
const roleLabel = (t: Translator, role: string) =>
  (ROLE_KEYS as readonly string[]).includes(role) ? t(`setup.staff.roles.${role as (typeof ROLE_KEYS)[number]}`) : (STAFF_ROLE_LABEL[role] ?? role);

export default async function StaffPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [staff, t] = await Promise.all([ownerApi<Staff[]>(`/properties/${property.id}/staff`), getT()]);

  return (
    <div className="space-y-5">
      <Section title={t('setup.staff.title', { n: staff.length })}>
        <p className="mb-3 text-sm text-muted">{t('setup.staff.intro')}</p>
        {staff.length === 0 ? (
          <Empty>{t('setup.staff.empty')}</Empty>
        ) : (
          <ul className="space-y-3">
            {staff.map((s) => (
              <li key={s.id} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  <span className="pill bg-surface-2 text-muted">{roleLabel(t, s.role)}</span>
                  {!s.active && <span className="pill bg-bad-bg text-bad">{t('setup.staff.inactive')}</span>}
                  {s.taskListUrl && (
                    <span className="ml-auto">
                      <CopyButton text={s.taskListUrl} label={t('setup.staff.copyLink')} />
                    </span>
                  )}
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-brand">{t('common.edit')}</summary>
                  <div className="mt-3">
                    <ActionForm action={saveStaffAction.bind(null, property.id, s.id)} submitLabel={t('common.save')}>
                      <StaffFields s={s} idPrefix={s.id} t={t} />
                      <Check label={t('setup.staff.active')} name="active" defaultChecked={s.active} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title={t('setup.staff.addTitle')}>
        <ActionForm action={saveStaffAction.bind(null, property.id, null)} submitLabel={t('common.add')}>
          <StaffFields idPrefix="new" t={t} />
        </ActionForm>
      </Section>
    </div>
  );
}

function StaffFields({ s, idPrefix, t }: { s?: Staff; idPrefix: string; t: Translator }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label={t('setup.staff.name')} name="name" id={`${idPrefix}-name`} required defaultValue={s?.name} />
      <Field label={t('setup.staff.phone')} name="phone" id={`${idPrefix}-phone`} type="tel" placeholder="+94 77 123 4567" defaultValue={s?.phone ?? ''} />
      <Select
        label={t('setup.staff.role')}
        name="role"
        id={`${idPrefix}-role`}
        options={ROLE_KEYS.map((r) => [r, roleLabel(t, r)] as [string, string])}
        defaultValue={s?.role ?? 'cleaner'}
      />
    </div>
  );
}
