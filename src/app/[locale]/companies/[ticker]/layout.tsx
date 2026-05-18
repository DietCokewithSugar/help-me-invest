import type { Metadata } from 'next';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string; ticker: string };
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; ticker: string };
}): Promise<Metadata> {
  const ticker = decodeURIComponent(params.ticker || '').toUpperCase();
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : undefined;
  return createPageMetadata({
    title: ticker ? `${ticker} - AI Investment Research Report` : 'Company Research Report',
    description: ticker
      ? `AI-generated investment research report for ${ticker}: financial statements, valuation, moat, and recent developments.`
      : 'AI-generated investment research reports for global equities.',
    path: `/companies/${ticker}`,
    keywords: ticker ? [ticker, `${ticker} stock`, `${ticker} analysis`, `${ticker} report`] : [],
    locale,
  });
}

export default function CompanyReportLayout({ children }: LayoutProps) {
  return children;
}
