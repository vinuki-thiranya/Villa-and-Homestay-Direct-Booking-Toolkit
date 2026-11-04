import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm } from '@/components/admin/AdminForm';
import { ApiError } from '@/lib/api';
import { adminApi, type AdminFlag, type AdminTenantDetail } from '@/lib/admin';
import { ago, FLAG_LABELS, formatDate, PLAN_LABELS } from '@/lib/admin-format';
import { setFlagOverrideAction, updateTenantAction } from '../../../actions';

export const metadata = { title: 'Tenant' };

const PLANS = ['basic', 'pro', 'pro_multi', 'manager'];
const BILLING_STATUSES = [
  { v: 'trial', label: 'Trial (pilot, not billed)' },
  { v: 'active', label: 'Active' },
  { v: 'grace', label: 'Grace (7 days unpaid)' },
  { v: 'suspended', label: 'Suspended (guest sites show enquire-only)' },
];

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let t: AdminTenantDetail;
  try {
    t = await adminApi<AdminTenantDetail>(`/admin/tenants/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const defs = await adminApi<AdminFlag[]>('/admin/flags');
  const overrides = new Map(t.overrides.map((o) => [o.key, o]));

  return (
    <>
      <div className="adm-crumb">
        <Link href="/admin/tenants">Tenants</Link> / {t.name}
      </div>
      <header className="adm-head">
        <div>
          <h1>{t.name}</h1>
          <p>
            {t.type === 'manager_company' ? 'Caretaker company' : 'Owner'} on the {PLAN_LABELS[t.plan] ?? t.plan} plan, {t.properties.length}{' '}
            propert{t.properties.length === 1 ? 'y' : 'ies'}.
          </p>
        </div>
      </header>

      <div className="adm-grid-2">
        <section className="adm-panel" aria-labelledby="plan">
          <div className="adm-panel-head">
            <h2 id="plan">Plan and billing</h2>
            <p>Changes apply immediately and re-evaluate the tenant&apos;s features.</p>
          </div>
          <div className="adm-panel-body">
            <AdminForm action={updateTenantAction.bind(null, t.id)} submitLabel="Save plan and billing">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="adm-field">
                  <span>Plan</span>
                  <select className="adm-select" name="plan" defaultValue={t.plan}>
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {PLAN_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adm-field">
                  <span>Billing status</span>
                  <select className="adm-select" name="billingStatus" defaultValue={t.billingStatus}>
                    {BILLING_STATUSES.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adm-field">
                  <span>Billing model</span>
                  <select className="adm-select" name="billingModel" defaultValue={t.subscription?.billingModel ?? 'flat'}>
                    <option value="flat">Flat monthly fee</option>
                    <option value="pct">% of direct bookings</option>
                  </select>
                </label>
              </div>
            </AdminForm>
          </div>
        </section>

        <section className="adm-panel" aria-labelledby="users">
          <div className="adm-panel-head">
            <h2 id="users">People</h2>
            <p>{t.users.length} account{t.users.length === 1 ? '' : 's'}</p>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Since</th>
                </tr>
              </thead>
              <tbody>
                {t.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>
                      <a href={`tel:${u.phone}`}>{u.phone}</a>
                    </td>
                    <td>{formatDate(u.since)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="adm-panel" aria-labelledby="flags" style={{ marginTop: 16 }}>
        <div className="adm-panel-head">
          <h2 id="flags">Features</h2>
          <p>Plan default comes from the plan; an override wins for this tenant only.</p>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Plan default</th>
                <th scope="col">Effective</th>
                <th scope="col">Override</th>
              </tr>
            </thead>
            <tbody>
              {defs.map((d) => {
                const planDefault = d.plans.includes(t.plan) || d.defaultEnabled;
                const ov = overrides.get(d.key);
                const effective = t.flags[d.key] ?? false;
                return (
                  <tr key={d.key}>
                    <td>
                      <strong>{FLAG_LABELS[d.key] ?? d.key}</strong>
                      <div className="adm-help">{d.description}</div>
                    </td>
                    <td>{planDefault ? 'Included' : 'Not included'}</td>
                    <td>
                      <span className="adm-mark" data-tone={effective ? 'ok' : 'muted'}>
                        {effective ? 'On' : 'Off'}
                      </span>
                      {ov && <div className="adm-help">Overridden by {ov.updatedBy ?? 'admin'}</div>}
                    </td>
                    <td>
                      <AdminForm action={setFlagOverrideAction.bind(null, t.id, d.key)} submitLabel="Apply" variant="quiet" layout="row">
                        <label className="adm-field">
                          <span className="sr-only">Override for {FLAG_LABELS[d.key] ?? d.key}</span>
                          <select className="adm-select" name="value" defaultValue={ov ? (ov.enabled ? 'on' : 'off') : 'default'}>
                            <option value="default">Use plan default</option>
                            <option value="on">Force on</option>
                            <option value="off">Force off</option>
                          </select>
                        </label>
                      </AdminForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <h2 style={{ fontSize: 17, fontWeight: 700, margin: '24px 0 10px' }}>Properties</h2>
      {t.properties.length === 0 && <p className="adm-empty adm-panel">No properties yet: the owner has not finished onboarding.</p>}
      {t.properties.map((p) => {
        const failing = p.sync.filter((s) => s.failures > 0).length;
        return (
          <section key={p.id} className="adm-panel adm-section" aria-labelledby={`p-${p.id}`}>
            <div className="adm-panel-head">
              <h2 id={`p-${p.id}`}>{p.name}</h2>
              <a className="adm-help" href={p.siteUrl} target="_blank" rel="noreferrer">
                {p.customDomain ?? p.slug} (opens guest site)
              </a>
            </div>
            <div className="adm-panel-body">
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-4">
                <div>
                  <dt className="adm-help">Published</dt>
                  <dd>{p.published ? <span className="adm-mark" data-tone="ok">Live</span> : <span className="adm-mark" data-tone="muted">Hidden</span>}</dd>
                </div>
                <div>
                  <dt className="adm-help">Payment methods</dt>
                  <dd>{p.gateways.length ? p.gateways.join(', ') : <span className="adm-mark" data-tone="warn">None connected</span>}</dd>
                </div>
                <div>
                  <dt className="adm-help">AI concierge</dt>
                  <dd>{p.conciergeEnabled ? 'On' : 'Off'}</dd>
                </div>
                <div>
                  <dt className="adm-help">Direct OTA connection</dt>
                  <dd>
                    {p.channel ? (
                      <>
                        <span className="adm-mark" data-tone={p.channel.last_error ? 'bad' : p.channel.status === 'active' ? 'ok' : 'muted'}>
                          {p.channel.partner}, {p.channel.last_error ? 'error' : p.channel.status}
                        </span>
                        <div className="adm-help">Last push {ago(p.channel.last_push_at)}</div>
                        {p.channel.last_error && <div className="adm-help">{p.channel.last_error}</div>}
                      </>
                    ) : (
                      'Not connected'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="adm-table-wrap" style={{ borderTop: '1px solid var(--a-rule)' }}>
              {p.sync.length === 0 ? (
                <p className="adm-empty">No iCal calendars imported.</p>
              ) : (
                <table className="adm-table">
                  <caption className="sr-only">Calendar sync for {p.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Room</th>
                      <th scope="col">Channel</th>
                      <th scope="col">State</th>
                      <th scope="col">Last success</th>
                      <th scope="col">Last error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.sync.map((s, i) => (
                      <tr key={i}>
                        <td>{s.roomName}</td>
                        <td>{s.channel}</td>
                        <td>
                          {s.failures > 0 ? (
                            <span className="adm-mark" data-tone="bad">
                              Failing ({s.failures}×)
                            </span>
                          ) : s.lastStatus === 'skipped_direct_api' ? (
                            <span className="adm-mark" data-tone="muted">Covered by direct API</span>
                          ) : (
                            <span className="adm-mark" data-tone="ok">OK</span>
                          )}
                        </td>
                        <td>{ago(s.lastSuccessAt)}</td>
                        <td className="adm-help">{s.lastError ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {failing > 0 && (
                <p className="adm-note" style={{ margin: 12 }}>
                  {failing} calendar{failing === 1 ? ' is' : 's are'} failing. Call the owner before a double booking happens.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
