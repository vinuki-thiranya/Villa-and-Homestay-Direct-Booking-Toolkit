'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useTransition } from 'react';
import { Languages } from 'lucide-react';
import { makeGuestT, type GuestLang, type GuestTranslator } from '@/i18n/guest/t';

const LangContext = createContext<GuestLang>('en');

/** The guest's site language for client components (set once in the site layout). */
export function GuestI18nProvider({ lang, children }: { lang: GuestLang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Translator for guest client components: `const t = useGT(); t('book.title')`. */
export function useGT(): GuestTranslator {
  return makeGuestT(useContext(LangContext));
}

/**
 * English / සිංහල for the guest site: one button offering the other language, labelled in that
 * language so each reader can find it. Saved in a cookie (like the currency).
 */
export function GuestLanguageSwitch() {
  const lang = useContext(LangContext);
  const router = useRouter();
  const [pending, start] = useTransition();
  const other: GuestLang = lang === 'en' ? 'si' : 'en';
  return (
    <button
      type="button"
      lang={other}
      disabled={pending}
      onClick={() => {
        document.cookie = `sd_glang=${other}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className="flex min-h-11 items-center gap-1 rounded-[var(--btn-radius,9999px)] border border-line bg-surface px-2.5 text-sm font-semibold"
      aria-label={other === 'si' ? 'සිංහලෙන් පෙන්වන්න (Show in Sinhala)' : 'Show in English (ඉංග්‍රීසියෙන් පෙන්වන්න)'}
    >
      <Languages aria-hidden className="h-4 w-4" />
      {/* System font, not the web font: two Sinhala letters on an English page must not download a
          127 KB Sinhala font (phones and desktops all ship one). */}
      <span style={{ fontFamily: 'system-ui, sans-serif' }}>{other === 'si' ? 'සිං' : 'EN'}</span>
    </button>
  );
}
