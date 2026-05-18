'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { zh, en, type Locale, type TranslationKeys } from '@/i18n';

const translations: Record<Locale, TranslationKeys> = { zh, en };
const SUPPORTED_LOCALES: Locale[] = ['zh', 'en'];
const DEFAULT_LOCALE: Locale = 'zh';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: translations[DEFAULT_LOCALE],
});

function extractLocaleFromPath(pathname: string | null): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  const seg = pathname.split('/').filter(Boolean)[0];
  return SUPPORTED_LOCALES.includes(seg as Locale) ? (seg as Locale) : DEFAULT_LOCALE;
}

function swapLocaleInPath(pathname: string | null, nextLocale: Locale): string {
  if (!pathname) return `/${nextLocale}`;
  const parts = pathname.split('/');
  // pathname always starts with "/", so parts[0] is empty string.
  if (SUPPORTED_LOCALES.includes(parts[1] as Locale)) {
    parts[1] = nextLocale;
    const swapped = parts.join('/');
    return swapped || `/${nextLocale}`;
  }
  return `/${nextLocale}${pathname === '/' ? '' : pathname}`;
}

/**
 * URL-driven LanguageProvider:
 * - `locale` is read from the current pathname's first segment.
 * - `setLocale` swaps the prefix and pushes the new URL via the App Router,
 *   preserving query string. It also writes a `NEXT_LOCALE` cookie so the
 *   middleware honors the user's preference on subsequent visits.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = extractLocaleFromPath(pathname);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) return;
      const nextPath = swapLocaleInPath(pathname, nextLocale);
      const queryString = searchParams?.toString();
      const target = queryString ? `${nextPath}?${queryString}` : nextPath;

      // Persist preference so root / and old paths honor it on next visit.
      if (typeof document !== 'undefined') {
        const maxAge = 60 * 60 * 24 * 365; // 1 year
        document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      }
      router.push(target);
    },
    [locale, pathname, router, searchParams]
  );

  // Keep `<html lang>` in sync with client-side navigations: the root layout
  // (a server component) only renders once per full document, so SPA locale
  // switches need to fix the attribute imperatively.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
  }, [locale]);

  const value = useMemo<LanguageContextType>(
    () => ({
      locale,
      setLocale,
      t: translations[locale],
    }),
    [locale, setLocale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
