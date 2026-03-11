import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Stock Comparison Tool',
  description:
    'Compare multiple companies side-by-side with key valuation, profitability, growth, and balance-sheet metrics.',
  path: '/compare',
  keywords: ['stock comparison', 'peer analysis', 'financial metrics comparison'],
});

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
