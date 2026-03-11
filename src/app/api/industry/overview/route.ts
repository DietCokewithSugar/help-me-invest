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

const FALLBACK_SECTOR_CAGR3Y: Record<string, number> = {
  Technology: 18,
  Healthcare: 10,
  'Financial Services': 8,
  'Consumer Cyclical': 9,
  'Communication Services': 12,
  Industrials: 8,
  'Consumer Defensive': 7,
  Energy: 6,
  'Basic Materials': 5,
  'Real Estate': 4,
  Utilities: 4,
};

const SECTOR_BENCHMARK_ETFS: Record<string, string> = {
  Technology: 'XLK',
  Healthcare: 'XLV',
  'Financial Services': 'XLF',
  'Consumer Cyclical': 'XLY',
  'Communication Services': 'XLC',
  Industrials: 'XLI',
  'Consumer Defensive': 'XLP',
  Energy: 'XLE',
  'Basic Materials': 'XLB',
  'Real Estate': 'XLRE',
  Utilities: 'XLU',
};

const SECTOR_ALIASES: Record<string, string> = {
  financial: 'Financial Services',
  'financial services': 'Financial Services',
  'consumer cyclical': 'Consumer Cyclical',
  'consumer defensive': 'Consumer Defensive',
  'communication services': 'Communication Services',
  industrials: 'Industrials',
  technology: 'Technology',
  healthcare: 'Healthcare',
  energy: 'Energy',
  utilities: 'Utilities',
  'basic materials': 'Basic Materials',
  'real estate': 'Real Estate',
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
  cagr3y: number | null;
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
      runWithConcurrency(SECTOR_KEYS, 3, async (sector): Promise<SectorSnapshot> => {
        const etfSymbol = SECTOR_BENCHMARK_ETFS[sector];
        const [screenerRows, historyRowsFromRaw, etfPriceRows] = await Promise.all([
          mcp
            .searchCompanyScreener({
              sector,
              limit: 500,
              isActivelyTrading: true,
              includeAllShareClasses: false,
            })
            .catch(() => []),
          mcp.getHistoricalSectorPerformance(sector, { from: fromDate }).catch(() => []),
          etfSymbol ? fetchHistoricalEtfRows(etfSymbol, fromDate, today, fmpApiKey).catch(() => []) : Promise.resolve([]),
        ]);
        const rawScreenerRows = Array.isArray(screenerRows) ? screenerRows : [];
        const sortedCompanies = buildRankedCompanies(rawScreenerRows);
        const historyRowsFrom = normalizeHistoryRows(historyRowsFromRaw);
        let cagr3y = calculatePriceCagr(etfPriceRows);
        if (cagr3y === null) {
          cagr3y = calculateAnnualizedCagr(historyRowsFrom);
        }
        if (cagr3y === null) {
          const historyRowsDefault = normalizeHistoryRows(
            await mcp.getHistoricalSectorPerformance(sector).catch(() => [])
          );
          cagr3y = calculateAnnualizedCagr(historyRowsDefault);
        }

        const proxyMarketCap = sortedCompanies
          .slice(0, 120)
          .reduce((sum, company) => sum + company.marketCap, 0);

        const topCompany = sortedCompanies[0];
        const leadingCompany = topCompany
          ? { symbol: topCompany.symbol, name: topCompany.name || topCompany.symbol }
          : FALLBACK_LEADING_COMPANIES[sector] || { symbol: '', name: '' };

        return {
          sector,
          proxyMarketCap,
          cagr3y,
          leadingCompany,
        };
      }),
    ]);

    const perfMap = new Map<string, number>();
    const perfRowMap = new Map<string, any>();
    for (const row of Array.isArray(sectorPerfRows) ? sectorPerfRows : []) {
      const sector = canonicalizeSectorName(typeof row?.sector === 'string' ? row.sector : '');
      if (!sector) continue;
      perfRowMap.set(sector, row);
      const change = toNumber(row?.averageChange ?? row?.changesPercentage ?? row?.change);
      if (change !== null) perfMap.set(sector, change);
    }

    const peMap = new Map<string, number>();
    for (const row of Array.isArray(sectorPERows) ? sectorPERows : []) {
      const sector = canonicalizeSectorName(typeof row?.sector === 'string' ? row.sector : '');
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
      const perfRow = perfRowMap.get(sector);
      const change1D = round(perfMap.get(sector) ?? 0, 2);
      const cagr3yRaw =
        firstFiniteNumber(
          snapshot?.cagr3y,
          extractThreeYearCagrFromPerfRow(perfRow),
          FALLBACK_SECTOR_CAGR3Y[sector]
        ) ?? 0;
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

function calculateAnnualizedCagr(rows: any[]): number | null {
  const points = rows
    .map((row) => {
      const date = toDate(row?.date ?? row?.datetime ?? row?.timestamp ?? row?.time);
      const change = toNumber(
        row?.averageChange ??
          row?.changesPercentage ??
          row?.change ??
          row?.performance ??
          row?.returnPct ??
          row?.pctChange ??
          row?.value
      );
      return { date, change };
    })
    .filter((point) => point.date && Number.isFinite(point.date.getTime()) && point.change !== null) as Array<{
    date: Date;
    change: number;
  }>;

  if (points.length < 2) {
    return null;
  }
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
    return null;
  }

  const annualized = (Math.pow(cumulative, 1 / years) - 1) * 100;
  if (!Number.isFinite(annualized)) {
    return null;
  }
  return Math.max(-80, Math.min(80, annualized));
}

function calculatePriceCagr(rows: any[]): number | null {
  const points = rows
    .map((row) => {
      const date = toDate(row?.date ?? row?.datetime ?? row?.timestamp ?? row?.time);
      const close = toNumber(row?.close ?? row?.adjClose ?? row?.price ?? row?.value);
      return { date, close };
    })
    .filter((point) => point.date && Number.isFinite(point.date.getTime()) && point.close !== null) as Array<{
    date: Date;
    close: number;
  }>;

  if (points.length < 2) {
    return null;
  }

  points.sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = points[0];
  const end = points[points.length - 1];
  if (start.close <= 0 || end.close <= 0) {
    return null;
  }

  const years = (end.date.getTime() - start.date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (!Number.isFinite(years) || years <= 0) {
    return null;
  }

  const annualized = (Math.pow(end.close / start.close, 1 / years) - 1) * 100;
  if (!Number.isFinite(annualized)) {
    return null;
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

function canonicalizeSectorName(input: string): string {
  const normalized = input.trim();
  if (!normalized) return '';
  if (SECTOR_KEYS.includes(normalized)) return normalized;
  const aliased = SECTOR_ALIASES[normalized.toLowerCase()];
  return aliased || '';
}

function buildRankedCompanies(rows: any[]): Array<{ symbol: string; name: string; marketCap: number }> {
  const normalized = rows
    .map((row: any) => ({
      symbol: typeof row?.symbol === 'string' ? row.symbol.trim() : '',
      name: typeof row?.companyName === 'string' ? row.companyName.trim() : '',
      marketCap: toNumber(row?.marketCap) ?? 0,
      isEtf: row?.isEtf === true,
      isFund: row?.isFund === true,
      isActivelyTrading: row?.isActivelyTrading !== false,
    }))
    .filter((company) => company.symbol && company.marketCap > 0 && company.isActivelyTrading);

  const strictCandidates = normalized.filter(
    (company) => !company.isEtf && !company.isFund && !looksLikeFundOrIndex(company.name)
  );
  const candidatePool = strictCandidates.length > 0 ? strictCandidates : normalized.filter((company) => !company.isEtf && !company.isFund);
  const deduped = new Map<string, { symbol: string; name: string; marketCap: number }>();

  for (const company of candidatePool) {
    const key = normalizeCompanyKey(company.name, company.symbol);
    const existing = deduped.get(key);
    if (!existing || company.marketCap > existing.marketCap) {
      deduped.set(key, {
        symbol: company.symbol,
        name: company.name,
        marketCap: company.marketCap,
      });
    }
  }

  return Array.from(deduped.values()).sort((a, b) => b.marketCap - a.marketCap);
}

function normalizeCompanyKey(name: string, symbol: string): string {
  const cleanedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanedName.length >= 4) return `name:${cleanedName}`;
  const cleanedSymbol = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `symbol:${cleanedSymbol}`;
}

function looksLikeFundOrIndex(name: string): boolean {
  return /\b(etf|fund|trust|index)\b/i.test(name);
}

function normalizeHistoryRows(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.historical)) return record.historical;
    if (Array.isArray(record.results)) return record.results;
  }
  return [];
}

async function fetchHistoricalEtfRows(
  symbol: string,
  from: string,
  to: string,
  apiKey: string
): Promise<any[]> {
  const params = new URLSearchParams({
    symbol,
    from,
    to,
    apikey: apiKey,
  });
  const response = await fetch(`https://financialmodelingprep.com/stable/historical-price-eod/full?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.historical)) return record.historical;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.results)) return record.results;
  }
  return [];
}

function extractThreeYearCagrFromPerfRow(row: any): number | null {
  if (!row || typeof row !== 'object') return null;
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes('3y') ||
      normalizedKey.includes('3yr') ||
      normalizedKey.includes('3year') ||
      normalizedKey.includes('three_year') ||
      normalizedKey.includes('threeyear')
    ) {
      const parsed = toNumber(value);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

function firstFiniteNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 1e12 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
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
