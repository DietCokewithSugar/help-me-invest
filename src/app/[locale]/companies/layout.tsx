import type { Metadata } from 'next';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : undefined;
  return createPageMetadata({
    title: 'Stock Screener & Diagnostics',
    description:
      'Screen and diagnose global companies with AI-driven financial insights across strategy, risk, valuation, and growth signals.',
    path: '/companies',
    keywords: ['stock screener', 'company diagnostics', 'equity screening', 'global stocks'],
    locale,
  });
}

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
