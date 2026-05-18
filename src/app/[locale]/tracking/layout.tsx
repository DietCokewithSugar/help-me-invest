import type { Metadata } from 'next';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : undefined;
  return createPageMetadata({
    title: 'Portfolio Tracking & Holdings Analysis',
    description:
      'Track institutional portfolios and inspect holdings, concentration, and trend signals with visual analytics.',
    path: '/tracking',
    keywords: ['portfolio tracking', 'institutional holdings', '13F analysis', 'holdings trends'],
    locale,
  });
}

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
