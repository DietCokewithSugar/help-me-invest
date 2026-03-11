import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Stock Screener & Diagnostics',
  description:
    'Screen and diagnose global companies with AI-driven financial insights across strategy, risk, valuation, and growth signals.',
  path: '/companies',
  keywords: ['stock screener', 'company diagnostics', 'equity screening', 'global stocks'],
});

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
