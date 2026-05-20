import { NextRequest, NextResponse } from 'next/server';
import { FMPMCPClient } from '@/lib/fmp-mcp';
import {
  SECTOR_STRUCTURE,
  flattenSectorSymbols,
  buildSectorNameMap,
  type IndustrySegment,
  type SectorStructure,
} from '@/lib/industry-data';

export const maxDuration = 60;

interface SymbolFallback {
  symbol: string;
  quote: any | null;
  profile: any | null;
}

interface CompanyMetrics {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  change: number;
  revenueGrowth: number;
  industry: string;
  image: string;
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

    const fmpApiKey = process.env.FMP_API_KEY;
    if (!fmpApiKey) {
      return NextResponse.json(
        { success: false, error: 'FMP_API_KEY is required for industry detail data.' },
        { status: 500 }
      );
    }

    const mcp = new FMPMCPClient(fmpApiKey);

    const [screenerRows, growthRows] = await Promise.all([
      mcp
        .searchCompanyScreener({
          sector,
          limit: 250,
          isActivelyTrading: true,
          includeAllShareClasses: false,
        })
        .catch(() => []),
      runWithConcurrency(allSymbols, 5, async (symbol) => {
        const growthData = await mcp.getFinancialStatementGrowth(symbol, 'annual', 1).catch(() => []);
        const latest = Array.isArray(growthData) ? growthData[0] : null;
        return {
          symbol,
          revenueGrowth: normalizeRevenueGrowth(latest?.revenueGrowth),
        };
      }),
    ]);

    const screenerMap = new Map<string, any>();
    for (const row of Array.isArray(screenerRows) ? screenerRows : []) {
      if (typeof row?.symbol === 'string') {
        screenerMap.set(row.symbol, row);
      }
    }

    const growthMap = new Map<string, number>();
    for (const row of growthRows) {
      if (row.revenueGrowth !== null) {
        growthMap.set(row.symbol, row.revenueGrowth);
      }
    }

    const missingSymbols = allSymbols.filter((symbol) => !screenerMap.has(symbol));
    const fallbackRows = await runWithConcurrency(missingSymbols, 5, async (symbol): Promise<SymbolFallback> => {
      const [quoteRows, profileRows] = await Promise.all([
        mcp.getQuote(symbol).catch(() => []),
        mcp.getProfile(symbol).catch(() => []),
      ]);
      return {
        symbol,
        quote: Array.isArray(quoteRows) ? quoteRows[0] ?? null : null,
        profile: Array.isArray(profileRows) ? profileRows[0] ?? null : null,
      };
    });

    const fallbackMap = new Map<string, SymbolFallback>();
    for (const row of fallbackRows) {
      if (row.quote || row.profile) {
        fallbackMap.set(row.symbol, row);
      }
    }

    const companies: CompanyMetrics[] = allSymbols
      .map((symbol) => {
        const screener = screenerMap.get(symbol);
        const fallback = fallbackMap.get(symbol);

        const marketCap =
          pickFirstNumber([
            screener?.marketCap,
            fallback?.quote?.marketCap,
            fallback?.profile?.mktCap,
            fallback?.profile?.marketCap,
          ]) ?? 0;

        const price =
          pickFirstNumber([
            screener?.price,
            fallback?.quote?.price,
            fallback?.profile?.price,
          ]) ?? 0;

        const change =
          pickFirstNumber([
            screener?.changePercentage,
            fallback?.quote?.changePercentage,
            fallback?.quote?.change,
            fallback?.profile?.changesPercentage,
            fallback?.profile?.change,
          ]) ?? 0;

        return {
          symbol,
          name:
            (typeof screener?.companyName === 'string' && screener.companyName) ||
            (typeof fallback?.profile?.companyName === 'string' && fallback.profile.companyName) ||
            nameMap[symbol] ||
            symbol,
          marketCap,
          price,
          change: round(change, 3),
          revenueGrowth: growthMap.get(symbol) ?? 0,
          industry:
            (typeof screener?.industry === 'string' && screener.industry) ||
            (typeof fallback?.profile?.industry === 'string' && fallback.profile.industry) ||
            '',
          image:
            (typeof fallback?.profile?.image === 'string' && fallback.profile.image) ||
            '',
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
            return {
              ...metrics,
              note: seed.note,
            };
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
            note: seed.note,
          };
        })
        .sort((a, b) => b.marketCap - a.marketCap);

      const segmentMarketCap = segmentCompanies.reduce((sum, c) => sum + c.marketCap, 0);
      const withGrowth = segmentCompanies.filter((c) => Number.isFinite(c.revenueGrowth));
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
    const companiesWithGrowth = companies.filter((c) => Number.isFinite(c.revenueGrowth));
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
      try {
        const rawNews = await mcp.searchStockNews(topSymbols, 10);
        if (Array.isArray(rawNews)) {
          news = rawNews
            .map((item: any) => ({
              title: item?.title || '',
              url: item?.url || '',
              date: item?.publishedDate || '',
              source: item?.site || item?.publisher || '',
              sentiment: deriveNewsSentiment(item?.title || ''),
            }))
            .filter((item) => item.title && item.url)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 6);
        }
      } catch {
        // news is optional
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sector,
        overview: structure.overview,
        segments,
        companies,
        totalMarketCap,
        avgGrowth: round(avgGrowth, 1),
        companyCount: companies.length,
        topCompany: companies[0] || null,
        news,
      },
    });
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
