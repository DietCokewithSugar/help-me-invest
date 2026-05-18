import type { MetadataRoute } from 'next';
import { siteUrl, buildLocalePath, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/seo';

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

function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const lc of SUPPORTED_LOCALES) {
    languages[lc] = new URL(buildLocalePath(lc, path), siteUrl).toString();
  }
  languages['x-default'] = new URL(buildLocalePath(DEFAULT_LOCALE, path), siteUrl).toString();
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Emit a sitemap entry for every (locale × static-route) combination, each
  // with `alternates.languages` so search engines can correlate translations.
  for (const route of staticRoutes) {
    const languages = buildAlternates(route.path);
    for (const lc of SUPPORTED_LOCALES) {
      entries.push({
        url: new URL(buildLocalePath(lc, route.path), siteUrl).toString(),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  for (const sector of industrySectors) {
    const path = `/industry/${encodeURIComponent(sector)}` as const;
    const languages = buildAlternates(path);
    for (const lc of SUPPORTED_LOCALES) {
      entries.push({
        url: new URL(buildLocalePath(lc, path), siteUrl).toString(),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
        alternates: { languages },
      });
    }
  }

  return entries;
}
