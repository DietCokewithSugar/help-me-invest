import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Portfolio Tracking & Holdings Analysis',
  description:
    'Track institutional portfolios and inspect holdings, concentration, and trend signals with visual analytics.',
  path: '/tracking',
  keywords: ['portfolio tracking', 'institutional holdings', '13F analysis', 'holdings trends'],
});

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
