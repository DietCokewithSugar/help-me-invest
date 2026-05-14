import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Link from 'next/link';
import { Home } from 'lucide-react';
import TextSelectionMenu from '@/components/TextSelectionMenu';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import { UnitModeProvider } from '@/lib/UnitModeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CompareProvider } from '@/contexts/CompareContext';
import { defaultMetadata, siteName, siteUrl } from '@/lib/seo';
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
    target: `${siteUrl}/?symbol={search_term_string}`,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* 字体预加载 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Favicon - Next.js automatically uses src/app/icon.png */}
        <meta name="theme-color" content="#0A0A0B" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <CompareProvider>
            <UnitModeProvider>
              <div className="relative z-10">
                {children}
              </div>
              <Link
                href="/"
                aria-label="返回首页"
                title="返回首页"
                className="fixed bottom-5 left-5 z-[95] inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 bg-surface text-mist-300 shadow-lg transition-colors hover:bg-white/10 hover:text-white"
              >
                <Home className="h-4 w-4" />
              </Link>
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
