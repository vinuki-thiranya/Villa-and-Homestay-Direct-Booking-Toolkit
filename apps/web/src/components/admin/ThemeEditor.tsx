'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveThemeAction } from '@/app/admin/actions';
import type { AdminTheme, ThemeTokens } from '@/lib/admin';

const GUEST_FG = '#14201f'; // guest-site body text (globals.css --fg)
const HEX = /^#[0-9a-fA-F]{6}$/;

const COLOR_FIELDS: { key: keyof ThemeTokens; label: string; help: string }[] = [
  { key: 'brand', label: 'Brand', help: 'Buttons, links, header. White text sits on it.' },
  { key: 'brandStrong', label: 'Brand, pressed', help: 'Button hover and pressed state.' },
  { key: 'accent', label: 'Accent', help: 'Focus rings and small highlights.' },
  { key: 'bg', label: 'Page background', help: 'Behind everything. Body text sits on it.' },
  { key: 'surface2', label: 'Soft panel', help: 'Search box, badges, alternating sections.' },
];

const BLANK: ThemeTokens = { brand: '#0f6e6b', brandStrong: '#0a5552', accent: '#e8a33d', bg: '#fbfaf7', surface2: '#eef5f3', radius: '14px' };

// ---------------------------------------------------------------- WCAG contrast
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
export function contrast(a: string, b: string): number {
  if (!HEX.test(a) || !HEX.test(b)) return 0;
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

export function ThemeEditor({ themes }: { themes: AdminTheme[] }) {
  const [selected, setSelected] = useState<string>(themes[0]?.key ?? 'new');
  const current = themes.find((t) => t.key === selected);
  const [key, setKey] = useState(current?.key ?? '');
  const [name, setName] = useState(current?.name ?? '');
  const [published, setPublished] = useState(current?.published ?? true);
  const [tokens, setTokens] = useState<ThemeTokens>({ ...BLANK, ...(current?.tokens ?? {}) });
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();
  const isNew = selected === 'new';

  function pick(k: string) {
    const t = themes.find((x) => x.key === k);
    setSelected(k);
    setKey(t?.key ?? '');
    setName(t?.name ?? '');
    setPublished(t?.published ?? true);
    setTokens({ ...BLANK, ...(t?.tokens ?? {}) });
    setResult(null);
  }

  const checks = useMemo(
    () => [
      { label: 'White text on brand buttons', ratio: contrast('#ffffff', tokens.brand), min: 4.5 },
      { label: 'White text on pressed buttons', ratio: contrast('#ffffff', tokens.brandStrong), min: 4.5 },
      { label: 'Body text on page background', ratio: contrast(GUEST_FG, tokens.bg), min: 4.5 },
      { label: 'Body text on soft panels', ratio: contrast(GUEST_FG, tokens.surface2), min: 4.5 },
      { label: 'Accent focus ring on background', ratio: contrast(tokens.accent, tokens.bg), min: 3 },
    ],
    [tokens],
  );
  const failing = checks.filter((c) => c.ratio < c.min);
  const invalid = COLOR_FIELDS.some((f) => !HEX.test(String(tokens[f.key] ?? '')));

  const set = (k: keyof ThemeTokens, v: string) => setTokens((t) => ({ ...t, [k]: v }));

  function save() {
    setResult(null);
    start(async () => {
      setResult(await saveThemeAction({ key: isNew ? key : selected, name, published, tokens: tokens as unknown as Record<string, string> }));
    });
  }

  // CSS variables for the preview, same names the guest site uses (globals.css).
  const previewVars = {
    '--p-brand': tokens.brand,
    '--p-brand-strong': tokens.brandStrong,
    '--p-accent': tokens.accent,
    '--p-bg': tokens.bg,
    '--p-surface2': tokens.surface2,
    '--p-radius': tokens.radius || '14px',
    '--p-display': tokens.fontDisplay || "ui-serif, Georgia, 'Times New Roman', serif",
    '--p-sans': tokens.fontSans || 'ui-sans-serif, system-ui, sans-serif',
  } as React.CSSProperties;

  return (
    <div className="adm-grid-2">
      <section className="adm-panel" aria-labelledby="edit-theme">
        <div className="adm-panel-head">
          <h2 id="edit-theme">{isNew ? 'New theme' : `Edit ${current?.name ?? selected}`}</h2>
          <div className="adm-segment" role="group" aria-label="Choose a theme">
            {themes.map((t) => (
              <button key={t.key} type="button" aria-pressed={selected === t.key} onClick={() => pick(t.key)}>
                {t.name}
              </button>
            ))}
            <button type="button" aria-pressed={isNew} onClick={() => pick('new')}>
              New
            </button>
          </div>
        </div>
        <div className="adm-panel-body space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="adm-field">
              <span>Key</span>
              <input
                className="adm-input"
                value={isNew ? key : selected}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                readOnly={!isNew}
                pattern="[a-z0-9-]{2,30}"
                aria-describedby="key-help"
              />
              <span id="key-help" className="adm-help">
                {isNew ? 'Lowercase, used by properties to pick the theme. Cannot change later.' : 'Properties refer to the theme by this key.'}
              </span>
            </label>
            <label className="adm-field">
              <span>Name</span>
              <input className="adm-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className="adm-field" style={{ fontWeight: 700, marginBottom: 4 }}>
              Colours
            </legend>
            {COLOR_FIELDS.map((f) => {
              const v = String(tokens[f.key] ?? '');
              const ok = HEX.test(v);
              return (
                <div key={f.key} className="grid items-center gap-2" style={{ gridTemplateColumns: '44px 120px 1fr' }}>
                  <input
                    type="color"
                    aria-label={`${f.label} colour picker`}
                    value={ok ? v : '#000000'}
                    onChange={(e) => set(f.key, e.target.value)}
                    style={{ width: 44, height: 40, padding: 2, border: '1px solid var(--a-rule-strong)', borderRadius: 6, background: '#fff' }}
                  />
                  <label className="adm-field">
                    <span className="sr-only">{f.label} hex</span>
                    <input
                      className="adm-input"
                      value={v}
                      onChange={(e) => set(f.key, e.target.value.trim())}
                      aria-invalid={!ok}
                      spellCheck={false}
                      maxLength={7}
                    />
                  </label>
                  <div>
                    <strong>{f.label}</strong>
                    <div className="adm-help" style={{ marginTop: 0 }}>
                      {ok ? f.help : 'Enter a colour like #0f6e6b'}
                    </div>
                  </div>
                </div>
              );
            })}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="adm-field">
              <span>Corner radius</span>
              <select className="adm-select" value={tokens.radius} onChange={(e) => set('radius', e.target.value)}>
                {['4px', '8px', '14px', '20px', '28px'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Display font (optional)</span>
              <input className="adm-input" value={tokens.fontDisplay ?? ''} onChange={(e) => set('fontDisplay', e.target.value)} placeholder="Georgia, serif" />
            </label>
            <label className="adm-field">
              <span>Body font (optional)</span>
              <input className="adm-input" value={tokens.fontSans ?? ''} onChange={(e) => set('fontSans', e.target.value)} placeholder="system-ui, sans-serif" />
            </label>
          </div>
          <p className="adm-help">Fonts must be ones the guest site already loads; otherwise visitors see the fallback.</p>

          <section aria-labelledby="contrast-h">
            <h3 id="contrast-h" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>
              Contrast (WCAG AA)
            </h3>
            <ul className="space-y-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3">
                  <span>{c.label}</span>
                  <span className="adm-mark" data-tone={c.ratio >= c.min ? 'ok' : 'bad'}>
                    {c.ratio.toFixed(2)}:1 {c.ratio >= c.min ? 'passes' : `fails, needs ${c.min}:1`}
                  </span>
                </li>
              ))}
            </ul>
            {failing.length > 0 && (
              <p className="adm-note" role="alert" style={{ marginTop: 8 }}>
                {failing.length} check{failing.length === 1 ? '' : 's'} fail{failing.length === 1 ? 's' : ''}. Guests with low vision may not be able to read these parts
                of the site. You can still save, but fix this before publishing.
              </p>
            )}
          </section>

          <label className="inline-flex min-h-10 items-center gap-2">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published (owners can choose it and sites using it show these colours)
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button className="adm-btn adm-btn-primary" type="button" onClick={save} disabled={pending || invalid || !name.trim() || (isNew && !/^[a-z0-9-]{2,30}$/.test(key))}>
              {pending ? 'Saving…' : isNew ? 'Create theme' : 'Save theme'}
            </button>
            <span className="adm-msg" data-ok={result?.ok} role={result && !result.ok ? 'alert' : 'status'} aria-live="polite">
              {result?.message}
            </span>
          </div>
        </div>
      </section>

      <section className="adm-panel" aria-labelledby="preview-h" style={{ alignSelf: 'start', position: 'sticky', top: 16 }}>
        <div className="adm-panel-head">
          <h2 id="preview-h">Live preview</h2>
          <p>How a guest site looks with these tokens</p>
        </div>
        <div className="adm-panel-body">
          <ThemePreview style={previewVars} />
        </div>
      </section>
    </div>
  );
}

/** A miniature guest site (header, search, room card, price, deposit badge, button) driven only by the tokens. */
function ThemePreview({ style }: { style: React.CSSProperties }) {
  const r = 'var(--p-radius)';
  return (
    <div
      aria-label="Guest site preview"
      role="img"
      style={{ ...style, background: 'var(--p-bg)', color: GUEST_FG, fontFamily: 'var(--p-sans)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--a-rule)' }}
    >
      <div style={{ background: 'var(--p-brand)', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--p-display)', fontSize: 18 }}>Villa Lagoon Mirissa</span>
        <span style={{ fontSize: 12, opacity: 0.9, display: 'flex', gap: 12 }}>
          <span>Rooms</span>
          <span>Location</span>
          <span>Book</span>
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--p-surface2)', borderRadius: r, padding: 12, display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Check-in</div>
            <div style={{ background: '#fff', borderRadius: `calc(${r} / 2)`, padding: '6px 8px', fontSize: 13 }}>12 Jan</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Check-out</div>
            <div style={{ background: '#fff', borderRadius: `calc(${r} / 2)`, padding: '6px 8px', fontSize: 13 }}>15 Jan</div>
          </div>
          <span style={{ background: 'var(--p-brand)', color: '#fff', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>Search</span>
        </div>
        <div style={{ marginTop: 14, background: '#fff', borderRadius: r, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ height: 96, background: 'linear-gradient(135deg, var(--p-brand), var(--p-accent))', opacity: 0.85 }} />
          <div style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--p-display)', fontSize: 17 }}>Ocean Suite</span>
              <span style={{ fontWeight: 700 }}>USD 120 / night</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>King bed, ocean view, balcony</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <span style={{ background: 'var(--p-surface2)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>30% deposit today</span>
              <span
                style={{ background: 'var(--p-brand)', color: '#fff', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, outline: '3px solid var(--p-accent)', outlineOffset: 2 }}
              >
                Book this room
              </span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Focus ring shown on the button uses the accent colour.</div>
      </div>
    </div>
  );
}
