import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language } from '../types';
import { translations, type Dict } from './translations';

const STORAGE_KEY = 'vox-lang';
/** Browser languages that get the Russian interface; everyone else gets English. */
const RU_SEGMENT = ['ru', 'uk', 'be', 'kk'];

function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* storage unavailable */
  }
  const code = (navigator.language || 'en').toLowerCase().split('-')[0];
  return RU_SEGMENT.includes(code) ? 'ru' : 'en';
}

interface I18n {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Dict;
}

const Ctx = createContext<I18n | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: translations[lang] }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used inside <LangProvider>');
  return ctx;
}
