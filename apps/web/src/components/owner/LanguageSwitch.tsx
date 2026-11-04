import { Languages } from 'lucide-react';
import { setLanguageAction } from '@/app/owner/actions-lang';
import type { OwnerLang } from '@/i18n/owner/t';

const LABEL: Record<OwnerLang, string> = { en: 'English', si: 'සිංහල' };

/**
 * English / සිංහල switch. `compact` (header): one button offering the other language, labelled in
 * that language so a Sinhala reader finds it on an English screen and vice versa. Full: both options.
 * A plain form, so it works before JavaScript loads.
 */
export function LanguageSwitch({ lang, compact = false }: { lang: OwnerLang; compact?: boolean }) {
  if (compact) {
    const other: OwnerLang = lang === 'en' ? 'si' : 'en';
    return (
      <form action={setLanguageAction}>
        <input type="hidden" name="lang" value={other} />
        <button
          lang={other}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:bg-surface-2"
          aria-label={other === 'si' ? 'සිංහලෙන් පෙන්වන්න (Show in Sinhala)' : 'Show in English (ඉංග්‍රීසියෙන් පෙන්වන්න)'}
        >
          <Languages aria-hidden className="h-4 w-4" />
          {/* System font: the Sinhala web font should only download for Sinhala pages. */}
          <span style={{ fontFamily: 'system-ui, sans-serif' }}>{other === 'si' ? 'සිං' : 'EN'}</span>
        </button>
      </form>
    );
  }
  return (
    <form action={setLanguageAction} className="flex gap-2" role="group" aria-label="Language / භාෂාව">
      {(['si', 'en'] as const).map((l) => (
        <button
          key={l}
          name="lang"
          value={l}
          lang={l}
          aria-pressed={lang === l}
          className={`min-h-12 flex-1 rounded-xl border px-4 text-base font-semibold ${lang === l ? 'border-brand bg-brand text-brand-fg' : 'border-line bg-surface hover:bg-surface-2'}`}
        >
          {LABEL[l]}
        </button>
      ))}
    </form>
  );
}
