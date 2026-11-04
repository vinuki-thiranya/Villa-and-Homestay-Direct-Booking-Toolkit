'use client';

import { Lock } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { resetTranslationAction, saveTranslationAction } from '@/app/admin/actions';
import type { TranslationRow } from '@/lib/admin';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
] as const;

export function TranslationsEditor({ rows }: { rows: TranslationRow[] }) {
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<'all' | (typeof LANGS)[number]['code']>('all');
  const [onlyOverrides, setOnlyOverrides] = useState(false);
  const [showLocked, setShowLocked] = useState(true);
  const langs = useMemo(() => (lang === 'all' ? LANGS : LANGS.filter((l) => l.code === lang)), [lang]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showLocked && r.locked) return false;
      if (onlyOverrides && !langs.some((l) => r.values[l.code]?.override)) return false;
      if (!q) return true;
      return r.key.toLowerCase().includes(q) || langs.some((l) => `${r.values[l.code]?.default ?? ''} ${r.values[l.code]?.override ?? ''}`.toLowerCase().includes(q));
    });
  }, [rows, query, onlyOverrides, showLocked, langs]);

  return (
    <>
      <div className="adm-panel adm-panel-body flex flex-wrap items-end gap-3" style={{ marginBottom: 12 }}>
        <label className="adm-field" style={{ minWidth: 220, flex: 1 }}>
          <span>Find a message</span>
          <input className="adm-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Key or text, e.g. checkIn" />
        </label>
        <label className="adm-field">
          <span>Language</span>
          <select className="adm-select" value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
            <option value="all">All four side by side</option>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input type="checkbox" checked={onlyOverrides} onChange={(e) => setOnlyOverrides(e.target.checked)} />
          Changed only
        </label>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
          Show locked WhatsApp templates
        </label>
        <span className="adm-help" aria-live="polite">
          {visible.length} of {rows.length} messages
        </span>
      </div>

      <section className="adm-panel">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: 160 }}>
                  Message
                </th>
                {langs.map((l) => (
                  <th key={l.code} scope="col" style={{ minWidth: 260 }}>
                    {l.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.key}>
                  <th scope="row" style={{ fontWeight: 600 }}>
                    {r.key}
                    {r.locked && (
                      <div className="adm-mark" data-tone="muted" style={{ marginTop: 4 }}>
                        <Lock aria-hidden size={12} /> Approved WhatsApp template
                      </div>
                    )}
                  </th>
                  {langs.map((l) => (
                    <td key={l.code}>
                      <Cell msgKey={r.key} lang={l.code} locked={r.locked} value={r.values[l.code] ?? { default: '', override: null }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="adm-empty">No messages match. Clear the search or untick Changed only.</p>}
        </div>
      </section>
    </>
  );
}

function Cell({ msgKey, lang, locked, value }: { msgKey: string; lang: string; locked: boolean; value: { default: string; override: string | null } }) {
  const [text, setText] = useState(value.override ?? '');
  const [saved, setSaved] = useState(value.override);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = text.trim() !== (saved ?? '');

  if (locked) {
    return (
      <div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }} lang={lang}>
          {value.default}
        </p>
        <p className="adm-help">Read-only: Meta approved this exact text. Change it in code and resubmit the templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="adm-help" style={{ marginTop: 0 }} lang={lang}>
        <span className="sr-only">Default: </span>
        {value.default}
      </p>
      <label className="adm-field">
        <span className="sr-only">
          {msgKey} in {lang}
        </span>
        <textarea
          className="adm-textarea"
          lang={lang}
          rows={2}
          value={text}
          placeholder="Uses the default"
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="adm-btn adm-btn-quiet"
          disabled={pending || !dirty || !text.trim()}
          onClick={() =>
            start(async () => {
              const r = await saveTranslationAction(lang, msgKey, text);
              setResult(r);
              if (r.ok) setSaved(text.trim());
            })
          }
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <button
            type="button"
            className="adm-btn adm-btn-quiet"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resetTranslationAction(lang, msgKey);
                setResult(r);
                if (r.ok) {
                  setSaved(null);
                  setText('');
                }
              })
            }
          >
            Reset to default
          </button>
        )}
        {saved && !dirty && <span className="adm-mark" data-tone="act">Changed</span>}
        <span className="adm-msg" data-ok={result?.ok} role={result && !result.ok ? 'alert' : 'status'} aria-live="polite">
          {result?.message}
        </span>
      </div>
    </div>
  );
}
