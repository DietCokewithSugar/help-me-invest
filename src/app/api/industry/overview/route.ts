import { NextResponse } from 'next/server';
import { getTrendCategory } from '@/lib/industry-data';
import { getChart, getQuotes, getSector } from '@/lib/yahoo/client';
import { buildPriceHistory, num } from '@/lib/yahoo/normalize';
import { fetchQuoteWithHistory } from '@/lib/market-data';

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

const YAHOO_SECTOR_KEYS: Record<string, string> = {
  Technology: 'technology',
  Healthcare: 'healthcare',
  'Financial Services': 'financial-services',
  'Consumer Cyclical': 'consumer-cyclical',
  'Communication Services': 'communication-services',
  Industrials: 'industrials',
  'Consumer Defensive': 'consumer-defensive',
  Energy: 'energy',
  'Basic Materials': 'basic-materials',
  'Real Estate': 'real-estate',
  Utilities: 'utilities',
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let cached: { data: unknown; expiresAt: number } | null = null;

interface SectorSnapshot {
  sector: string;
  marketWeight: number | null;
  marketCap: number | null;
  change1D: number | null;
  cagr3y: number | null;
  leadingCompany: { symbol: string; name: string } | null;
}

async function loadSnapshot(sector: string): Promise<SectorSnapshot> {
  const etf = SECTOR_BENCHMARK_ETFS[sector];
  const [sectorData, etfChart] = await Promise.all([
    getSector(YAHOO_SECTOR_KEYS[sector]).catch(() => null),
    etf ? getChart(etf, '5y', '1d').catch(() => null) : Promise.resolve(null),
  ]);

  // 新→旧；Yahoo 不可用时改用东方财富日 K（前复权）
  let bars = buildPriceHistory(etfChart).map((bar) => ({ date: bar.date, close: bar.adjClose ?? bar.close }));
  if (bars.length === 0 && etf) {
    bars = (await fetchQuoteWithHistory(etf, '5y').catch(() => null))?.history ?? [];
  }
  const change1D = bars.length >= 2 && bars[1].close ? ((bars[0].close - bars[1].close) / bars[1].close) * 100 : null;
  const threeYearsAgo = getDateYearsAgo(3);
  const start = bars.find((bar) => bar.date <= threeYearsAgo);
  const cagr3y = start ? calculatePriceCagr([start, bars[0]]) : null;

  const top = Array.isArray(sectorData?.topCompanies) ? sectorData!.topCompanies[0] : null;
  return {
    sector,
    marketWeight: num(sectorData?.overview?.marketWeight),
    marketCap: num(sectorData?.overview?.marketCap),
    change1D,
    cagr3y,
    leadingCompany: top?.symbol ? { symbol: String(top.symbol), name: String(top.name || top.symbol) } : null,
  };
}

export async function GET() {
  try {
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ success: true, data: cached.data });
    }

    const [snapshots, etfQuotes] = await Promise.all([
      runWithConcurrency(SECTOR_KEYS, 4, loadSnapshot),
      getQuotes(Object.values(SECTOR_BENCHMARK_ETFS)).catch(() => [] as Record<string, any>[]),
    ]);

    const peByEtf = new Map<string, number>();
    for (const quote of etfQuotes) {
      const pe = toNumber(quote?.trailingPE);
      if (typeof quote?.symbol === 'string' && pe !== null) peByEtf.set(quote.symbol, pe);
    }

    const weightTotal = snapshots.reduce((sum, s) => sum + (s.marketWeight ?? 0), 0);
    const capTotal = snapshots.reduce((sum, s) => sum + (s.marketCap ?? 0), 0);

    const sectors = snapshots.map((snapshot) => {
      const { sector } = snapshot;
      const change1D = round(snapshot.change1D ?? 0, 2);
      const cagr3y = round(firstFiniteNumber(snapshot.cagr3y, FALLBACK_SECTOR_CAGR3Y[sector]) ?? 0, 1);
      const marketCapWeight =
        weightTotal > 0 && snapshot.marketWeight !== null
          ? round((snapshot.marketWeight / weightTotal) * 100, 1)
          : capTotal > 0 && snapshot.marketCap !== null
            ? round((snapshot.marketCap / capTotal) * 100, 1)
            : FALLBACK_SECTOR_WEIGHTS[sector] || 0;

      return {
        sector,
        marketCapWeight,
        change1D,
        cagr3y,
        trend: getTrendCategory(cagr3y),
        sentiment: deriveSentiment(change1D, cagr3y),
        pe: peByEtf.get(SECTOR_BENCHMARK_ETFS[sector]) ?? null,
        leadingCompany: snapshot.leadingCompany || FALLBACK_LEADING_COMPANIES[sector] || { symbol: '', name: '' },
      };
    });

    cached = { data: sectors, expiresAt: Date.now() + CACHE_TTL_MS };
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
