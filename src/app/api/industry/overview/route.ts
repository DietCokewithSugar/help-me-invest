import { NextResponse } from 'next/server';
import { FMPMCPClient } from '@/lib/fmp-mcp';
import { getTrendCategory } from '@/lib/industry-data';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SECTOR_KEYS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Communication Services',
  'Industrials',
  'Consumer Defensive',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities',
];

const FALLBACK_SECTOR_WEIGHTS: Record<string, number> = {
  Technology: 40,
  Healthcare: 10,
  'Financial Services': 10,
  'Consumer Cyclical': 13,
  'Communication Services': 4,
  Industrials: 6,
  'Consumer Defensive': 8,
  Energy: 4,
  'Basic Materials': 2,
  'Real Estate': 1.5,
  Utilities: 2.5,
};

const FALLBACK_LEADING_COMPANIES: Record<string, { symbol: string; name: string }> = {
  Technology: { symbol: 'NVDA', name: 'NVIDIA' },
  Healthcare: { symbol: 'LLY', name: 'Eli Lilly' },
  'Financial Services': { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
  'Consumer Cyclical': { symbol: 'AMZN', name: 'Amazon' },
  'Communication Services': { symbol: 'NFLX', name: 'Netflix' },
  Industrials: { symbol: 'GE', name: 'GE Aerospace' },
  'Consumer Defensive': { symbol: 'WMT', name: 'Walmart' },
  Energy: { symbol: 'XOM', name: 'ExxonMobil' },
  'Basic Materials': { symbol: 'LIN', name: 'Linde' },
  'Real Estate': { symbol: 'WELL', name: 'Welltower' },
  Utilities: { symbol: 'GEV', name: 'GE Vernova' },
};

interface SectorSnapshot {
  sector: string;
  proxyMarketCap: number;
  cagr3y: number;
  leadingCompany: { symbol: string; name: string };
}

export async function GET() {
  try {
    const fmpApiKey = process.env.FMP_API_KEY;
    if (!fmpApiKey) {
      return NextResponse.json(
        { success: false, error: 'FMP_API_KEY is required for industry data.' },
        { status: 500 }
      );
    }

    const mcp = new FMPMCPClient(fmpApiKey);
    const today = new Date().toISOString().slice(0, 10);
    const fromDate = getDateYearsAgo(3);

    const [sectorPerfRows, sectorPERows, snapshots] = await Promise.all([
      mcp.getSectorPerformanceSnapshot(today).catch(() => []),
      mcp.getSectorPESnapshot(today).catch(() => []),
      runWithConcurrency(SECTOR_KEYS, 4, async (sector): Promise<SectorSnapshot> => {
        const [screenerRows, historyRows] = await Promise.all([
          mcp
            .searchCompanyScreener({
              sector,
              limit: 80,
              isActivelyTrading: true,
              includeAllShareClasses: false,
            })
            .catch(() => []),
          mcp.getHistoricalSectorPerformance(sector, { from: fromDate }).catch(() => []),
        ]);

        const sortedCompanies = (Array.isArray(screenerRows) ? screenerRows : [])
          .map((row: any) => ({
            symbol: typeof row?.symbol === 'string' ? row.symbol : '',
            name: typeof row?.companyName === 'string' ? row.companyName : '',
            marketCap: toNumber(row?.marketCap) ?? 0,
          }))
          .filter((company) => company.symbol && company.marketCap > 0)
          .sort((a, b) => b.marketCap - a.marketCap);

        const proxyMarketCap = sortedCompanies
          .slice(0, 40)
          .reduce((sum, company) => sum + company.marketCap, 0);

        const topCompany = sortedCompanies[0];
        const leadingCompany = topCompany
          ? { symbol: topCompany.symbol, name: topCompany.name || topCompany.symbol }
          : FALLBACK_LEADING_COMPANIES[sector] || { symbol: '', name: '' };

        const historyArray = Array.isArray(historyRows) ? historyRows : [];
        const cagr3y = calculateAnnualizedCagr(historyArray);

        if (historyArray.length === 0) {
          console.warn(`[industry-overview] No historical data for sector: ${sector}`);
        }

        return {
          sector,
          proxyMarketCap,
          cagr3y,
          leadingCompany,
        };
      }),
    ]);

    const perfMap = new Map<string, number>();
    for (const row of Array.isArray(sectorPerfRows) ? sectorPerfRows : []) {
      const sector = typeof row?.sector === 'string' ? row.sector : '';
      if (!sector) continue;
      const change = toNumber(row?.averageChange ?? row?.changesPercentage ?? row?.change);
      if (change !== null) perfMap.set(sector, change);
    }

    const peMap = new Map<string, number>();
    for (const row of Array.isArray(sectorPERows) ? sectorPERows : []) {
      const sector = typeof row?.sector === 'string' ? row.sector : '';
      if (!sector) continue;
      const pe = toNumber(row?.pe);
      if (pe !== null) peMap.set(sector, pe);
    }

    const snapshotMap = new Map<string, SectorSnapshot>();
    for (const snapshot of snapshots) {
      snapshotMap.set(snapshot.sector, snapshot);
    }

    const totalProxyMarketCap = snapshots.reduce((sum, snapshot) => sum + snapshot.proxyMarketCap, 0);

    const sectors = SECTOR_KEYS.map((sector) => {
      const snapshot = snapshotMap.get(sector);
      const change1D = round(perfMap.get(sector) ?? 0, 2);
      const cagr3yRaw = snapshot?.cagr3y ?? 0;
      const cagr3y = round(cagr3yRaw, 1);
      const trend = getTrendCategory(cagr3y);
      const sentiment = deriveSentiment(change1D, cagr3y);

      const marketCapWeight =
        totalProxyMarketCap > 0
          ? round(((snapshot?.proxyMarketCap ?? 0) / totalProxyMarketCap) * 100, 1)
          : FALLBACK_SECTOR_WEIGHTS[sector] || 0;

      return {
        sector,
        marketCapWeight,
        change1D,
        cagr3y,
        trend,
        sentiment,
        pe: peMap.get(sector) || null,
        leadingCompany: snapshot?.leadingCompany || FALLBACK_LEADING_COMPANIES[sector] || { symbol: '', name: '' },
      };
    });

    return NextResponse.json({ success: true, data: sectors });
  } catch (error: any) {
    console.error('Industry overview error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function deriveSentiment(change1D: number, cagr3y: number): number {
  let score = 50;
  score += change1D * 5;
  score += cagr3y * 1.5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateAnnualizedCagr(rows: any[]): number {
  const points = rows
    .map((row) => {
      const dateStr = typeof row?.date === 'string' ? row.date : '';
      const date = new Date(dateStr);
      const change = toNumber(row?.averageChange ?? row?.changesPercentage ?? row?.change);
      return { date, change };
    })
    .filter((point) => Number.isFinite(point.date.getTime()) && point.change !== null) as Array<{
    date: Date;
    change: number;
  }>;

  if (points.length < 2) return 0;
  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumulative = 1;
  for (const point of points) {
    cumulative *= 1 + point.change / 100;
  }

  if (!Number.isFinite(cumulative) || cumulative <= 0) {
    return -100;
  }

  const start = points[0].date.getTime();
  const end = points[points.length - 1].date.getTime();
  const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
  if (!Number.isFinite(years) || years <= 0) {
    return 0;
  }

  const annualized = (Math.pow(cumulative, 1 / years) - 1) * 100;
  if (!Number.isFinite(annualized)) {
    return 0;
  }

  return Math.max(-80, Math.min(80, annualized));
}

function getDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
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
