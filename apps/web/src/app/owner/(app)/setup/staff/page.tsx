import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Check, Empty, Field, Section, Select } from '@/components/owner/fields';
import { currentProperty, ownerApi } from '@/lib/owner';
import { STAFF_ROLE_LABEL, type Staff } from '@/lib/owner-types';
import { saveStaffAction } from '../../../actions-r2';

export const metadata = { title: 'Staff' };

const ROLES = Object.entries(STAFF_ROLE_LABEL) as [string, string][];

export default async function StaffPage() {
  const property = await currentProperty();
  if (!property) return null;
  const staff = await ownerApi<Staff[]>(`/properties/${property.id}/staff`);

  return (
    <div className="space-y-5">
      <Section title={`Staff (${staff.length})`}>
        <p className="mb-3 text-sm text-muted">
          Cleaners don&apos;t need an account: each gets a private link to today&apos;s list, sent on WhatsApp every morning. Copy it to share it yourself.
        </p>
        {staff.length === 0 ? (
          <Empty>No staff yet. Add your cleaners so they get their task list every morning.</Empty>
        ) : (
          <ul className="space-y-3">
            {staff.map((s) => (
              <li key={s.id} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  <span className="pill bg-surface-2 text-muted">{STAFF_ROLE_LABEL[s.role]}</span>
                  {!s.active && <span className="pill bg-bad-bg text-bad">Inactive</span>}
                  {s.taskListUrl && (
                    <span className="ml-auto">
                      <CopyButton text={s.taskListUrl} label="Copy task-list link" />
                    </span>
                  )}
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-brand">Edit</summary>
                  <div className="mt-3">
                    <ActionForm action={saveStaffAction.bind(null, property.id, s.id)} submitLabel="Save">
                      <StaffFields s={s} idPrefix={s.id} />
                      <Check label="Active" name="active" defaultChecked={s.active} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Add staff member">
        <ActionForm action={saveStaffAction.bind(null, property.id, null)} submitLabel="Add">
          <StaffFields idPrefix="new" />
        </ActionForm>
      </Section>
    </div>
  );
}

function StaffFields({ s, idPrefix }: { s?: Staff; idPrefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Name" name="name" id={`${idPrefix}-name`} required defaultValue={s?.name} />
      <Field label="WhatsApp number" name="phone" id={`${idPrefix}-phone`} type="tel" placeholder="+94 77 123 4567" defaultValue={s?.phone ?? ''} />
      <Select label="Role" name="role" id={`${idPrefix}-role`} options={ROLES} defaultValue={s?.role ?? 'cleaner'} />
    </div>
  );
}
