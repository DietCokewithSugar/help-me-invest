'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { zh, en, type Locale, type TranslationKeys } from '@/i18n';

const translations: Record<Locale, TranslationKeys> = { zh, en };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const langParam = new URLSearchParams(window.location.search).get('lang');
    if (langParam === 'zh' || langParam === 'en') {
      setLocaleState(langParam);
      localStorage.setItem('locale', langParam);
      return;
    }

    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && (saved === 'zh' || saved === 'en')) {
      setLocaleState(saved);
      return;
    }

    const browserLocale = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    setLocaleState(browserLocale);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
