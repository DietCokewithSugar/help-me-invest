import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { headers, cookies } from 'next/headers';
import TextSelectionMenu from '@/components/TextSelectionMenu';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import { UnitModeProvider } from '@/lib/UnitModeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CompareProvider } from '@/contexts/CompareContext';
import { defaultMetadata, siteName, siteUrl } from '@/lib/seo';
import HomeButton from '@/components/HomeButton';
import './globals.css';

export const metadata: Metadata = defaultMetadata;

const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: siteUrl,
  description: 'AI-powered investment research platform for global public equities.',
  inLanguage: ['en', 'zh'],
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl}/companies/{search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const organizationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: siteUrl,
  logo: `${siteUrl}/icon.png`,
};

const SUPPORTED_LOCALES = ['zh', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string | undefined | null): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale resolution order:
  //   1. `x-next-locale` request header (set by middleware after URL prefix check).
  //   2. `NEXT_LOCALE` cookie (user toggled language client-side).
  //   3. Default to `zh`.
  const headerStore = headers();
  const cookieStore = cookies();
  const headerLocale = headerStore.get('x-next-locale');
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const resolvedLocale: SupportedLocale = isSupportedLocale(headerLocale)
    ? headerLocale
    : isSupportedLocale(cookieLocale)
      ? cookieLocale
      : 'zh';
  const htmlLang = resolvedLocale === 'zh' ? 'zh-CN' : 'en';

  // Theme SSR bootstrap: read cookie so we can paint `<html data-theme>`
  // before any client JS runs. The inline script below is a defensive
  // fallback for users hitting cached / non-cookie paths.
  const themeCookie = cookieStore.get('theme')?.value;
  const initialTheme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';

  const themeBootstrap = `
    try {
      var stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        document.documentElement.setAttribute('data-theme', stored);
      }
    } catch (e) {}
  `;

  return (
    <html lang={htmlLang} data-theme={initialTheme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0A0A0B" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
        {/* Inline fallback in case the cookie wasn't sent (first paint after
            a fresh login on a stale cache); avoids a flash of wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <CompareProvider>
            <UnitModeProvider>
              <div className="relative z-10">{children}</div>
              <HomeButton />
              <FeedbackWidget />
              <Analytics />
              <TextSelectionMenu />
            </UnitModeProvider>
          </CompareProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
