import type { Metadata } from 'next';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : undefined;
  return createPageMetadata({
    title: 'Stock Comparison Tool',
    description:
      'Compare multiple companies side-by-side with key valuation, profitability, growth, and balance-sheet metrics.',
    path: '/compare',
    keywords: ['stock comparison', 'peer analysis', 'financial metrics comparison'],
    locale,
  });
}

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
