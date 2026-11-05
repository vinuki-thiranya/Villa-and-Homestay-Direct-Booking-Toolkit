'use client';

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Languages, X } from 'lucide-react';
import { makeTranslator, type GuestDict, type GuestLang, type GuestTranslator } from '@/i18n/guest/translator';
import { LANG_CODES, LANG_NAMES, PREFIXED_LANGS, SITE_LANGS, switchLangPath } from '@/lib/site-routing';

const LangContext = createContext<GuestLang>('en');
const TContext = createContext<GuestTranslator | null>(null);

/**
 * The page's language and its dictionary for client components (set once in the site layout). Only
 * this language's strings reach the browser, not all five.
 */
export function GuestI18nProvider({ lang, dict, children }: { lang: GuestLang; dict: GuestDict; children: React.ReactNode }) {
  const t = useMemo(() => makeTranslator(lang, dict), [lang, dict]);
  return (
    <LangContext.Provider value={lang}>
      <TContext.Provider value={t}>{children}</TContext.Provider>
    </LangContext.Provider>
  );
}

/** Translator for guest client components: `const t = useGT(); t('book.title')`. */
export function useGT(): GuestTranslator {
  const t = useContext(TContext);
  if (!t) throw new Error('useGT() outside <GuestI18nProvider>');
  return t;
}

// The browser's path, after hydration; the server renders each language's home page as the link.
const noop = () => () => {};
function usePath(): string | null {
  return useSyncExternalStore(noop, () => window.location.pathname, () => null);
}

function remember(lang: GuestLang) {
  document.cookie = `sd_glang=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/** Language names and codes in their own scripts, in the system font: they must not pull the Sinhala or Hindi web fonts into an English page. */
const SYSTEM_FONT = { fontFamily: 'system-ui, sans-serif' } as const;

/**
 * Language menu: plain links to this page in each language (/de/rooms), so it works without
 * JavaScript and every language is a real URL. The choice is remembered for unprefixed links.
 */
export function GuestLanguageSwitch({ root }: { root: string }) {
  const lang = useContext(LangContext);
  const path = usePath();
  const t = useGT();
  return (
    <details className="relative">
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-[var(--btn-radius,9999px)] border border-line bg-surface px-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden"
        aria-label={t('common.language')}
      >
        <Languages aria-hidden className="h-4 w-4" />
        <span style={SYSTEM_FONT}>{LANG_CODES[lang]}</span>
      </summary>
      <ul className="absolute right-0 top-12 z-40 w-44 rounded-card border border-line bg-surface p-1.5 shadow-xl">
        {SITE_LANGS.map((l) => (
          <li key={l}>
            <a
              href={path ? switchLangPath(path, root, l) : `${root}${l === 'en' ? '' : `/${l}`}` || '/'}
              hrefLang={l}
              lang={l}
              aria-current={l === lang ? 'true' : undefined}
              onClick={() => remember(l)}
              className="flex min-h-11 items-center rounded-lg px-3 font-medium hover:bg-surface-2 aria-[current]:text-brand"
              style={SYSTEM_FONT}
            >
              {LANG_NAMES[l]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

const SUGGEST: Record<(typeof PREFIXED_LANGS)[number], string> = {
  si: 'මෙම පිටුව සිංහලෙන් බලන්න',
  de: 'Diese Seite auf Deutsch ansehen',
  fr: 'Voir cette page en français',
  hi: 'यह पेज हिन्दी में देखें',
};

/**
 * On an English page, offers the guest's browser language when the site has it. Never redirects
 * on its own (search engines and shared links must get the URL's language). Fixed position, so it
 * never moves the page.
 */
export function LanguageSuggest({ root }: { root: string }) {
  const lang = useContext(LangContext);
  const [offer, setOffer] = useState<(typeof PREFIXED_LANGS)[number] | null>(null);

  useEffect(() => {
    if (lang !== 'en' || /(?:^|;\s*)sd_glang=/.test(document.cookie)) return;
    const wanted = navigator.languages.map((l) => l.slice(0, 2).toLowerCase()).find((l) => l === 'en' || (PREFIXED_LANGS as readonly string[]).includes(l));
    if (wanted && wanted !== 'en') setOffer(wanted as (typeof PREFIXED_LANGS)[number]);
  }, [lang]);

  if (!offer) return null;
  return (
    <div className="fixed inset-x-4 top-20 z-40 mx-auto flex max-w-sm items-center gap-2 rounded-card border border-line bg-surface p-2 pl-4 shadow-xl" role="region" aria-label={LANG_NAMES[offer]}>
      <a href={switchLangPath(window.location.pathname, root, offer)} lang={offer} hrefLang={offer} onClick={() => remember(offer)} className="flex-1 font-medium text-brand underline-offset-4 hover:underline" style={SYSTEM_FONT}>
        {SUGGEST[offer]}
      </a>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2"
        aria-label="Close"
        onClick={() => {
          remember('en');
          setOffer(null);
        }}
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
