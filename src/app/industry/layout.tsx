import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Industry Dashboard & Sector Rotation',
  description:
    'Monitor sector momentum, market-cap weights, and sentiment to identify global industry rotation opportunities.',
  path: '/industry',
  keywords: ['industry analysis', 'sector dashboard', 'sector rotation', 'market sentiment'],
});

export default function IndustryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
