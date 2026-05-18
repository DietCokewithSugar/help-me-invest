import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string; ticker: string };
}

/**
 * Allowed ticker shape. Permits A-Z, 0-9, dot/dash/equals/caret. This covers
 * every market suffix we support (`.SS`, `.SZ`, `.HK`, `.T`, `.KS`, `.KQ`,
 * `.AX`) plus class-share variants like `BRK.B`. 12 chars is enough for the
 * longest real-world tickers (e.g. `005930.KS`); the upper bound also makes
 * sure obviously-bad payloads — e.g. `<script>alert(1)</script>` — get
 * rejected before we render anything.
 */
const TICKER_REGEX = /^[A-Z0-9.\-=^]{1,12}$/;

function isValidTicker(rawTicker: string | undefined | null): boolean {
  if (!rawTicker) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawTicker);
  } catch {
    return false;
  }
  return TICKER_REGEX.test(decoded.toUpperCase());
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

export default function CompanyReportLayout({ children, params }: LayoutProps) {
  // Reject obviously-bogus ticker URLs at the server layout level so we
  // return a real HTTP 404 instead of rendering a broken-looking client page
  // that just falls through to an FMP error. The page component re-checks the
  // same regex defensively in case this layout is ever bypassed.
  if (!isValidTicker(params.ticker)) {
    notFound();
  }
  return children;
}
