import type { Metadata } from 'next';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : undefined;
  return createPageMetadata({
    title: 'Industry Dashboard & Sector Rotation',
    description:
      'Monitor sector momentum, market-cap weights, and sentiment to identify global industry rotation opportunities.',
    path: '/industry',
    keywords: ['industry analysis', 'sector dashboard', 'sector rotation', 'market sentiment'],
    locale,
  });
}

export default function IndustryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
