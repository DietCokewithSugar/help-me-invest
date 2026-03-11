import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

const staticRoutes: Array<{
  path: `/${string}` | '/';
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/companies', changeFrequency: 'daily', priority: 0.9 },
  { path: '/compare', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/tracking', changeFrequency: 'daily', priority: 0.8 },
  { path: '/industry', changeFrequency: 'daily', priority: 0.85 },
  { path: '/asset-allocation', changeFrequency: 'weekly', priority: 0.75 },
];

const industrySectors = [
  'Basic Materials',
  'Communication Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Energy',
  'Financial Services',
  'Healthcare',
  'Industrials',
  'Real Estate',
  'Technology',
  'Utilities',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const coreEntries = staticRoutes.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const sectorEntries = industrySectors.map((sector) => {
    const path = `/industry/${encodeURIComponent(sector)}` as const;
    return {
      url: new URL(path, siteUrl).toString(),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    };
  });

  return [...coreEntries, ...sectorEntries];
}
