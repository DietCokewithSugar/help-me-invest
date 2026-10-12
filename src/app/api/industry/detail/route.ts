import { NextRequest, NextResponse } from 'next/server';
import { getChart, getQuoteSummary, getQuotes, search } from '@/lib/yahoo/client';
import { buildPriceHistory, num } from '@/lib/yahoo/normalize';
import {
  SECTOR_STRUCTURE,
  flattenSectorSymbols,
  buildSectorNameMap,
  type IndustrySegment,
  type SectorStructure,
} from '@/lib/industry-data';

export const maxDuration = 60;

const CACHE_TTL_MS = 15 * 60 * 1000;
const detailCache = new Map<string, { data: unknown; expiresAt: number }>();

interface CompanyMetrics {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  change: number;
  revenueGrowth: number;
  industry: string;
  image: string;
  history: number[];
}

export async function POST(request: NextRequest) {
  try {
    const { sector } = await request.json();
    if (!sector || typeof sector !== 'string') {
      return NextResponse.json({ success: false, error: 'Sector is required' }, { status: 400 });
    }

    const structure: SectorStructure | undefined = SECTOR_STRUCTURE[sector];
    const allSymbols = flattenSectorSymbols(sector);
    const nameMap = buildSectorNameMap(sector);

    if (!structure || allSymbols.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sector,
          overview: structure?.overview ?? null,
          segments: [],
          companies: [],
          totalMarketCap: 0,
          avgGrowth: 0,
          companyCount: 0,
          topCompany: null,
          news: [],
        },
      });
    }

    const hit = detailCache.get(sector);
    if (hit && hit.expiresAt > Date.now()) {
      return NextResponse.json({ success: true, data: hit.data });
    }

    // 批量行情一次拿到价格 / 市值 / 涨跌；逐个取近三个月日线与营收增速
    const [quoteRows, perSymbolRows] = await Promise.all([
      getQuotes(allSymbols).catch(() => [] as Record<string, any>[]),
      runWithConcurrency(allSymbols, 8, async (symbol) => {
        const [chart, summary] = await Promise.all([
          getChart(symbol, '3mo', '1d').catch(() => null),
          getQuoteSummary(symbol, ['financialData', 'assetProfile']).catch(() => null),
        ]);
        return {
          symbol,
          chartMeta: chart?.meta ?? null,
          history: buildPriceHistory(chart).map((bar) => bar.close).reverse(),
          revenueGrowth: num(summary?.financialData?.revenueGrowth),
          industry: typeof summary?.assetProfile?.industry === 'string' ? summary.assetProfile.industry : '',
        };
      }),
    ]);

    const quoteMap = new Map<string, any>();
    for (const row of quoteRows) {
      if (typeof row?.symbol === 'string') {
        quoteMap.set(row.symbol, row);
      }
    }

    const perSymbolMap = new Map<string, (typeof perSymbolRows)[number]>();
    for (const row of perSymbolRows) {
      perSymbolMap.set(row.symbol, row);
    }

    const companies: CompanyMetrics[] = allSymbols
      .map((symbol) => {
        const quote = quoteMap.get(symbol);
        const extra = perSymbolMap.get(symbol);
        const history = extra?.history ?? [];
        const lastClose = history[history.length - 1];
        const prevClose = history[history.length - 2];

        const price = pickFirstNumber([quote?.regularMarketPrice, extra?.chartMeta?.regularMarketPrice, lastClose]) ?? 0;
        const change =
          pickFirstNumber([
            quote?.regularMarketChangePercent,
            lastClose && prevClose ? ((lastClose - prevClose) / prevClose) * 100 : null,
          ]) ?? 0;

        return {
          symbol,
          name:
            (typeof quote?.longName === 'string' && quote.longName) ||
            (typeof quote?.shortName === 'string' && quote.shortName) ||
            (typeof extra?.chartMeta?.longName === 'string' && extra.chartMeta.longName) ||
            nameMap[symbol] ||
            symbol,
          marketCap: pickFirstNumber([quote?.marketCap]) ?? 0,
          price,
          change: round(change, 3),
          revenueGrowth: normalizeRevenueGrowth(extra?.revenueGrowth) ?? 0,
          industry: extra?.industry || '',
          image: `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
          history,
        };
      })
      .sort((a, b) => b.marketCap - a.marketCap);

    const metricsBySymbol = new Map<string, CompanyMetrics>();
    for (const company of companies) {
      metricsBySymbol.set(company.symbol, company);
    }

    const segments = structure.segments.map((segment: IndustrySegment) => {
      const segmentCompanies = segment.companies
        .map((seed) => {
          const metrics = metricsBySymbol.get(seed.symbol);
          if (metrics) {
            return { ...metrics, note: seed.note };
          }
          return {
            symbol: seed.symbol,
            name: seed.name,
            marketCap: 0,
            price: 0,
            change: 0,
            revenueGrowth: 0,
            industry: '',
            image: '',
            history: [] as number[],
            note: seed.note,
          };
        })
        .sort((a, b) => b.marketCap - a.marketCap);

      const segmentMarketCap = segmentCompanies.reduce((sum, c) => sum + c.marketCap, 0);
      const withGrowth = segmentCompanies.filter((c) => c.marketCap > 0 && Number.isFinite(c.revenueGrowth));
      const segmentAvgGrowth =
        withGrowth.length > 0
          ? withGrowth.reduce((sum, c) => sum + c.revenueGrowth, 0) / withGrowth.length
          : 0;

      return {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        position: segment.position ?? null,
        themes: segment.themes ?? null,
        companies: segmentCompanies,
        totalMarketCap: segmentMarketCap,
        avgGrowth: round(segmentAvgGrowth, 1),
      };
    });

    const totalMarketCap = companies.reduce((sum, company) => sum + company.marketCap, 0);
    const companiesWithGrowth = companies.filter((c) => c.marketCap > 0 && Number.isFinite(c.revenueGrowth));
    const avgGrowth =
      companiesWithGrowth.length > 0
        ? companiesWithGrowth.reduce((sum, c) => sum + c.revenueGrowth, 0) / companiesWithGrowth.length
        : 0;

    let news: any[] = [];
    const topSymbols = companies
      .slice(0, 3)
      .map((company) => company.symbol)
      .filter(Boolean);

    if (topSymbols.length > 0) {
      const results = await Promise.all(
        topSymbols.map((symbol) => search(symbol, { quotesCount: 0, newsCount: 4 }).catch(() => ({ quotes: [], news: [] })))
      );
      const seen = new Set<string>();
      news = results
        .flatMap((result) => result.news)
        .filter((item) => item?.title && item?.link && !seen.has(item.link) && seen.add(item.link))
        .map((item) => ({
          title: item.title,
          url: item.link,
          date: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : '',
          source: item.publisher || '',
          sentiment: deriveNewsSentiment(item.title),
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);
    }

    const data = {
      sector,
      overview: structure.overview,
      segments,
      companies,
      totalMarketCap,
      avgGrowth: round(avgGrowth, 1),
      companyCount: companies.filter((c) => c.marketCap > 0).length,
      topCompany: companies[0] || null,
      news,
    };
    detailCache.set(sector, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Industry detail error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function normalizeRevenueGrowth(value: unknown): number | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  const asPercent = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return round(asPercent, 1);
}

function pickFirstNumber(values: unknown[]): number | null {
  for (const value of values) {
    const numeric = toNumber(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[%,$,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function deriveNewsSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['surge', 'gain', 'rise', 'up', 'beat', 'exceed', 'growth', 'record', 'high', 'strong', 'boost', 'rally', 'profit', 'upgrade'];
  const negativeWords = ['drop', 'fall', 'decline', 'down', 'miss', 'loss', 'weak', 'cut', 'low', 'risk', 'crash', 'sell', 'warning', 'downgrade'];
  const lower = title.toLowerCase();
  const posCount = positiveWords.filter((word) => lower.includes(word)).length;
  const negCount = negativeWords.filter((word) => lower.includes(word)).length;
  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let index = 0;

  async function runner() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) break;
      results[current] = await worker(items[current]);
    }
  }

  const workerCount = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runner()));
  return results;
}
