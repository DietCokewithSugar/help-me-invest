import { NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';
import { getTrendCategory } from '@/lib/industry-data';

export const maxDuration = 60;

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

export async function GET() {
  try {
    const fmpApiKey = process.env.FMP_API_KEY;
    if (!fmpApiKey) {
      return NextResponse.json({ success: false, error: 'FMP API key not configured' }, { status: 500 });
    }

    const fmp = new FMPClient(fmpApiKey);

    const [sectorPerf, sectorPE, historicalPerf] = await Promise.all([
      fmp.getSectorPerformance().catch(() => []),
      fmp.getSectorPE().catch(() => []),
      fmp.getHistoricalSectorPerformance(50).catch(() => []),
    ]);

    const perfMap = new Map<string, any>();
    if (Array.isArray(sectorPerf)) {
      for (const item of sectorPerf) {
        const key = item.sector || item.name;
        if (key) perfMap.set(key, item);
      }
    }

    const peMap = new Map<string, number>();
    if (Array.isArray(sectorPE)) {
      for (const item of sectorPE) {
        if (item.sector && item.pe) peMap.set(item.sector, item.pe);
      }
    }

    const sectorWeights: Record<string, number> = {
      Technology: 32,
      Healthcare: 12,
      'Financial Services': 13,
      'Consumer Cyclical': 11,
      'Communication Services': 9,
      Industrials: 8,
      'Consumer Defensive': 6,
      Energy: 4,
      'Basic Materials': 2,
      'Real Estate': 2,
      Utilities: 2,
    };

    const leadingCompanies: Record<string, { symbol: string; name: string }> = {
      Technology: { symbol: 'AAPL', name: 'Apple' },
      Healthcare: { symbol: 'UNH', name: 'UnitedHealth' },
      'Financial Services': { symbol: 'JPM', name: 'JPMorgan' },
      'Consumer Cyclical': { symbol: 'AMZN', name: 'Amazon' },
      'Communication Services': { symbol: 'GOOGL', name: 'Alphabet' },
      Industrials: { symbol: 'GE', name: 'GE Aerospace' },
      'Consumer Defensive': { symbol: 'WMT', name: 'Walmart' },
      Energy: { symbol: 'XOM', name: 'ExxonMobil' },
      'Basic Materials': { symbol: 'LIN', name: 'Linde' },
      'Real Estate': { symbol: 'PLD', name: 'Prologis' },
      Utilities: { symbol: 'NEE', name: 'NextEra' },
    };

    const sectors = SECTOR_KEYS.map((sector) => {
      const perf = perfMap.get(sector);
      const changeStr = perf?.changesPercentage ?? perf?.change ?? '0';
      const change1D = parseFloat(String(changeStr).replace('%', '')) || 0;

      const cagr3y = estimateCagr(sector, change1D, historicalPerf);
      const trend = getTrendCategory(cagr3y);
      const sentiment = deriveSentiment(change1D, cagr3y);

      return {
        sector,
        marketCapWeight: sectorWeights[sector] || 2,
        change1D,
        cagr3y: Math.round(cagr3y * 10) / 10,
        trend,
        sentiment,
        pe: peMap.get(sector) || null,
        leadingCompany: leadingCompanies[sector] || { symbol: '', name: '' },
      };
    });

    return NextResponse.json({ success: true, data: sectors });
  } catch (error: any) {
    console.error('Industry overview error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function estimateCagr(
  sector: string,
  change1D: number,
  historicalPerf: any[]
): number {
  const baseCagr: Record<string, number> = {
    Technology: 18,
    Healthcare: 8,
    'Financial Services': 10,
    'Consumer Cyclical': 12,
    'Communication Services': 14,
    Industrials: 7,
    'Consumer Defensive': 4,
    Energy: -2,
    'Basic Materials': 3,
    'Real Estate': 1,
    Utilities: 3,
  };

  let cagr = baseCagr[sector] ?? 5;

  if (Array.isArray(historicalPerf) && historicalPerf.length > 0) {
    const sectorChanges = historicalPerf
      .filter((h: any) => {
        const entries = Object.entries(h).filter(([k]) => k !== 'date');
        return entries.some(([k]) => k.toLowerCase().includes(sector.toLowerCase().split(' ')[0]));
      });

    if (sectorChanges.length > 10) {
      const recent = sectorChanges.slice(0, 20);
      const avgChange = recent.reduce((sum: number, h: any) => {
        const entries = Object.entries(h).filter(([k]) => k !== 'date');
        const match = entries.find(([k]) => k.toLowerCase().includes(sector.toLowerCase().split(' ')[0]));
        return sum + (match ? parseFloat(String(match[1]).replace('%', '')) || 0 : 0);
      }, 0) / recent.length;
      cagr = cagr * 0.6 + avgChange * 252 * 0.4;
    }
  }

  cagr += change1D * 0.5;
  return Math.max(-30, Math.min(40, cagr));
}

function deriveSentiment(change1D: number, cagr3y: number): number {
  let score = 50;
  score += change1D * 5;
  score += cagr3y * 1.5;
  return Math.max(0, Math.min(100, Math.round(score)));
}
