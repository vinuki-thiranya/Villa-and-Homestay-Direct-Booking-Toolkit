'use client';

import { createContext, useContext } from 'react';
import { makeT, type OwnerLang, type Translator } from '@/i18n/owner/t';

const LangContext = createContext<OwnerLang>('en');

/** Puts the owner's language in context for client components (set once in the owner layout). */
export function OwnerI18nProvider({ lang, children }: { lang: OwnerLang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Translator for client components: `const t = useT(); t('common.save')`. */
export function useT(): Translator {
  return makeT(useContext(LangContext));
}
