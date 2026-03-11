import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

function formatSectorName(value: string): string {
  return decodeURIComponent(value).replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({
  params,
}: {
  params: { sector: string };
}): Promise<Metadata> {
  const sector = formatSectorName(params.sector || 'Sector');
  const encodedSector = encodeURIComponent(sector);

  return createPageMetadata({
    title: `${sector} Sector Analysis`,
    description: `Explore ${sector} sector leaders, supply-chain structure, sentiment, and growth signals.`,
    path: `/industry/${encodedSector}`,
    keywords: [`${sector} stocks`, `${sector} sector`, 'industry supply chain', 'sector leaders'],
  });
}

export default function IndustrySectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
