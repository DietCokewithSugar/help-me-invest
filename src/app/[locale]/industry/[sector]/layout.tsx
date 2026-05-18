import type { Metadata } from 'next';
import { createPageMetadata, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/seo';

function formatSectorName(value: string): string {
  return decodeURIComponent(value).replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; sector: string };
}): Promise<Metadata> {
  const sector = formatSectorName(params.sector || 'Sector');
  const encodedSector = encodeURIComponent(sector);
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : undefined;

  return createPageMetadata({
    title: `${sector} Sector Analysis`,
    description: `Explore ${sector} sector leaders, supply-chain structure, sentiment, and growth signals.`,
    path: `/industry/${encodedSector}`,
    keywords: [`${sector} stocks`, `${sector} sector`, 'industry supply chain', 'sector leaders'],
    locale,
  });
}

export default function IndustrySectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
