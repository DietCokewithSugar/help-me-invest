import type { Metadata } from 'next';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : undefined;
  return createPageMetadata({
    title: 'AI Asset Allocation Planner',
    description:
      'Build a personalized, multi-asset allocation plan with AI based on return targets, risk profile, and investment horizon.',
    path: '/asset-allocation',
    keywords: ['asset allocation', 'portfolio planning', 'risk profile', 'investment strategy'],
    locale,
  });
}

export default function AssetAllocationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
