import { ThemeEditor } from '@/components/admin/ThemeEditor';
import { adminApi, type AdminTheme } from '@/lib/admin';
import { formatDateTime } from '@/lib/admin-format';

export const metadata = { title: 'Themes' };

export default async function ThemesPage() {
  const themes = await adminApi<AdminTheme[]>('/admin/themes');
  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Guest-site themes</h1>
          <p>
            The colour sets owners pick for their booking site. Saving refreshes every site using the theme within seconds. Owners only edit their
            text and photos.
          </p>
        </div>
      </header>
      <ThemeEditor themes={themes} />
      <section className="adm-panel" style={{ marginTop: 16 }} aria-labelledby="th-list">
        <div className="adm-panel-head">
          <h2 id="th-list">All themes</h2>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Theme</th>
                <th scope="col">Key</th>
                <th scope="col">Colours</th>
                <th scope="col">State</th>
                <th scope="col">Last changed</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((t) => (
                <tr key={t.key}>
                  <td>{t.name}</td>
                  <td>{t.key}</td>
                  <td>
                    <span className="inline-flex gap-1" aria-label={`Brand ${t.tokens.brand}, accent ${t.tokens.accent}, background ${t.tokens.bg}`}>
                      {[t.tokens.brand, t.tokens.brandStrong, t.tokens.accent, t.tokens.bg, t.tokens.surface2].map((c, i) => (
                        <span key={i} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid var(--a-rule-strong)' }} />
                      ))}
                    </span>
                  </td>
                  <td>
                    <span className="adm-mark" data-tone={t.published ? 'ok' : 'muted'}>
                      {t.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    {formatDateTime(t.updatedAt)}
                    {t.updatedBy ? `, ${t.updatedBy}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
