import { AdminForm } from '@/components/admin/AdminForm';
import { adminApi, type AdminFlag } from '@/lib/admin';
import { FLAG_LABELS, PLAN_LABELS } from '@/lib/admin-format';
import { updateFlagAction } from '../../actions';

export const metadata = { title: 'Feature flags' };

const PLANS = ['basic', 'pro', 'pro_multi', 'manager'];

export default async function FlagsPage() {
  const flags = await adminApi<AdminFlag[]>('/admin/flags');
  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Feature flags</h1>
          <p>
            Which plans include each feature (spec §8). A tenant gets a feature when its plan is ticked, or when the default is on. Per-tenant
            overrides are set on the tenant&apos;s page and always win.
          </p>
        </div>
      </header>
      <section className="adm-panel">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Included in plans</th>
                <th scope="col">Default for others</th>
                <th scope="col" className="num">Tenant overrides</th>
                <th scope="col">
                  <span className="sr-only">Save</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => {
                const formId = `flag-${f.key}`;
                return (
                  <tr key={f.key}>
                    <td style={{ minWidth: 260 }}>
                      <strong>{FLAG_LABELS[f.key] ?? f.key}</strong>
                      <label className="adm-field" style={{ marginTop: 6 }}>
                        <span className="sr-only">Description of {FLAG_LABELS[f.key] ?? f.key}</span>
                        <input className="adm-input" name="description" form={formId} defaultValue={f.description} maxLength={200} />
                      </label>
                    </td>
                    <td>
                      <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
                        <legend className="sr-only">Plans that include {FLAG_LABELS[f.key] ?? f.key}</legend>
                        {PLANS.map((p) => (
                          <label key={p} className="inline-flex min-h-10 items-center gap-2">
                            <input type="checkbox" name="plans" value={p} form={formId} defaultChecked={f.plans.includes(p)} />
                            {PLAN_LABELS[p]}
                          </label>
                        ))}
                      </fieldset>
                    </td>
                    <td>
                      <label className="inline-flex min-h-10 items-center gap-2">
                        <input type="checkbox" name="defaultEnabled" form={formId} defaultChecked={f.defaultEnabled} />
                        On for every plan
                      </label>
                    </td>
                    <td className="num">{f.overrides || '—'}</td>
                    <td>
                      {/* The description and plan inputs in this row join the form via form="id". */}
                      <AdminForm id={formId} action={updateFlagAction.bind(null, f.key)} submitLabel="Save" variant="quiet" layout="row" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
