import type { Metadata } from 'next';

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;
export const siteName = 'AI Investment Research';

export const SUPPORTED_LOCALES = ['zh', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'zh';

const globalKeywords = [
  'AI investment research',
  'stock analysis',
  'equity research',
  'financial statement analysis',
  'global stock market',
  'US stocks',
  'Hong Kong stocks',
  'China A-shares',
  'Japan stocks',
  'fundamental analysis',
];

const defaultTitle = 'AI Investment Research | Global Stock Analysis Platform';
const defaultDescription =
  'AI-powered investment research for global markets. Analyze companies, compare financials, and track portfolios across US, Hong Kong, China, and Japan equities.';

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: defaultTitle,
    template: '%s | AI Investment Research',
  },
  description: defaultDescription,
  keywords: globalKeywords,
  alternates: {
    canonical: '/',
    languages: {
      zh: '/zh',
      en: '/en',
      'x-default': '/zh',
    },
  },
  category: 'finance',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['zh_CN'],
    url: '/',
    siteName,
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
  },
};

/**
 * Build a locale-prefixed path. Idempotent for already-prefixed paths.
 */
export function buildLocalePath(locale: SupportedLocale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `/${locale}`;
  const parts = normalized.split('/').filter(Boolean);
  if (parts[0] === 'zh' || parts[0] === 'en') {
    parts[0] = locale;
    return `/${parts.join('/')}`;
  }
  return `/${locale}${normalized}`;
}

interface PageMetadataInput {
  title: string;
  description: string;
  /**
   * Locale-agnostic path (e.g. `/companies`, `/companies/AAPL`). The helper
   * will produce locale-prefixed canonical + hreflang alternates.
   */
  path: `/${string}` | '/';
  /** The locale this page is being rendered in. */
  locale?: SupportedLocale;
  keywords?: string[];
}

/**
 * Generate page metadata with locale-aware canonical + hreflang alternates.
 *
 * Even when `locale` is omitted (legacy callers), the helper still emits
 * `<link rel="alternate" hreflang>` entries for both supported locales so
 * search engines can correlate the two versions.
 */
export function createPageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path, keywords = [], locale } = input;

  const localePaths: Record<string, string> = {};
  for (const lc of SUPPORTED_LOCALES) {
    localePaths[lc] = buildLocalePath(lc, path);
  }
  // x-default points at the default locale's version of the URL.
  localePaths['x-default'] = buildLocalePath(DEFAULT_LOCALE, path);

  const canonical = locale ? buildLocalePath(locale, path) : buildLocalePath(DEFAULT_LOCALE, path);

  return {
    title,
    description,
    keywords: [...globalKeywords, ...keywords],
    alternates: {
      canonical,
      languages: localePaths,
    },
    openGraph: {
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? ['en_US'] : ['zh_CN'],
      url: canonical,
      siteName,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
