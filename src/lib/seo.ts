import type { Metadata } from 'next';

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;
export const siteName = 'AI Investment Research';

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

interface PageMetadataInput {
  title: string;
  description: string;
  path: `/${string}` | '/';
  keywords?: string[];
}

export function createPageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path, keywords = [] } = input;

  return {
    title,
    description,
    keywords: [...globalKeywords, ...keywords],
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['zh_CN'],
      url: path,
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
