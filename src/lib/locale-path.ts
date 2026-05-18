import type { Locale } from '@/i18n';

/**
 * Prefix an internal path with the current locale segment.
 *
 * Examples:
 *   withLocale('zh', '/companies')       → '/zh/companies'
 *   withLocale('en', '/companies/AAPL')  → '/en/companies/AAPL'
 *   withLocale('en', '/')                → '/en'
 *   withLocale('zh', '')                 → '/zh'
 *
 * If the path is already locale-prefixed it is returned as-is (idempotent).
 */
export function withLocale(locale: Locale, path: string): string {
  if (!path) return `/${locale}`;
  if (path === '/') return `/${locale}`;

  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'zh' || segments[0] === 'en') {
    // Replace the existing locale prefix to keep callers honest.
    segments[0] = locale;
    return `/${segments.join('/')}`;
  }

  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}
