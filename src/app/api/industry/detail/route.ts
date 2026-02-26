import { NextRequest, NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';
import { SECTOR_SUPPLY_CHAINS } from '@/lib/industry-data';

export const maxDuration = 60;

const SECTOR_MARKET_CAPS: Record<string, Record<string, number>> = {
  Technology: { AAPL: 3.5e12, MSFT: 3.1e12, NVDA: 2.8e12, GOOGL: 2.1e12, META: 1.5e12, AVGO: 8e11, TSM: 7e11, ORCL: 4e11, AMD: 2.5e11, CRM: 2.8e11, QCOM: 2e11, INTC: 1e11, ACN: 2.3e11, IBM: 2e11, ASML: 3.5e11, AMAT: 1.5e11, LRCX: 1e11, KLAC: 8e10, NOW: 1.8e11, GFS: 2.5e10, PLTR: 2e11 },
  Healthcare: { UNH: 5e11, LLY: 7.5e11, JNJ: 3.5e11, MRK: 2.5e11, ABT: 2e11, TMO: 2.2e11, PFE: 1.5e11, DHR: 1.8e11, MDT: 1e11, SYK: 1.3e11, ELV: 1.1e11, HCA: 8e10, MCK: 7e10, CAH: 3e10, CVS: 8e10, A: 4e10, ILMN: 2e10, CRSP: 4e9 },
  'Financial Services': { JPM: 6e11, V: 5.5e11, MA: 4.5e11, BAC: 3.3e11, 'BRK-B': 9e11, GS: 1.7e11, WFC: 2.3e11, BLK: 1.5e11, SCHW: 1.3e11, ICE: 8e10, CME: 7.5e10, NDAQ: 4e10, PYPL: 7e10, PGR: 1.5e11, MET: 5e10, BX: 1.8e11, SQ: 3.5e10, COIN: 5e10, SOFI: 1.5e10 },
  Energy: { XOM: 5e11, CVX: 2.8e11, COP: 1.3e11, SLB: 6e10, WMB: 5e10, KMI: 4.5e10, ET: 5.5e10, VLO: 4.5e10, MPC: 5.5e10, PSX: 5e10, NEE: 1.5e11, HAL: 2.5e10, BKR: 4e10, ENPH: 1e10, FSLR: 2e10 },
  'Consumer Cyclical': { AMZN: 2e12, TSLA: 8e11, HD: 3.8e11, MCD: 2.1e11, NKE: 1.1e11, SBUX: 1e11, BKNG: 1.6e11, TGT: 6e10, GM: 5e10, F: 4e10, ABNB: 8e10, MAR: 7e10, IP: 1.5e10 },
  'Consumer Defensive': { WMT: 5.5e11, COST: 3.8e11, PEP: 2.3e11, KO: 2.7e11, PG: 3.8e11, MDLZ: 8.5e10, CL: 7.5e10, EL: 2.5e10, ADM: 2.5e10, BG: 1.5e10, KR: 4e10 },
  'Communication Services': { GOOGL: 2.1e12, META: 1.5e12, DIS: 2e11, NFLX: 3.5e11, T: 1.5e11, VZ: 1.7e11, TMUS: 2.5e11, AMT: 1e11, CCI: 4.5e10, TTD: 4.5e10, EA: 3.5e10, TTWO: 3e10, ATVI: 7.5e10 },
  Industrials: { GE: 2e11, RTX: 1.5e11, HON: 1.4e11, UPS: 1e11, CAT: 1.8e11, DE: 1.2e11, LMT: 1.3e11, BA: 1.5e11, UNP: 1.5e11, FDX: 6e10, WM: 8e10, RSG: 6e10, EMR: 5.5e10 },
  'Basic Materials': { LIN: 2.2e11, APD: 7e10, SHW: 9e10, FCX: 7e10, NEM: 5e10, DD: 3.5e10, ECL: 6.5e10, PPG: 3.5e10 },
  'Real Estate': { PLD: 1.1e11, AMT: 1e11, EQIX: 8e10, SPG: 5e10, CBRE: 4e10, JLL: 1.2e10, LEN: 4e10, DHI: 5e10 },
  Utilities: { NEE: 1.5e11, DUK: 8.5e10, SO: 9e10, AEP: 5e10, EXC: 4e10, SRE: 5.5e10, D: 4.5e10, AWK: 2.5e10 },
};

export async function POST(request: NextRequest) {
  try {
    const { sector } = await request.json();
    if (!sector) {
      return NextResponse.json({ success: false, error: 'Sector is required' }, { status: 400 });
    }

    const supplyChain = SECTOR_SUPPLY_CHAINS[sector] || null;
    const fallbackCaps = SECTOR_MARKET_CAPS[sector] || {};

    const fmpApiKey = process.env.FMP_API_KEY;
    let fmp: FMPClient | null = null;
    if (fmpApiKey) {
      fmp = new FMPClient(fmpApiKey);
    }

    const allSymbols = getSymbolsForSector(sector);
    const profileMap = new Map<string, any>();
    const quoteMap = new Map<string, any>();

    if (fmp && allSymbols.length > 0) {
      const fetchPromises = allSymbols.map(async (sym) => {
        try {
          const [profArr, quoteArr] = await Promise.all([
            fmp!.getProfile(sym).catch(() => []),
            fmp!.getQuote(sym).catch(() => []),
          ]);
          if (Array.isArray(profArr) && profArr.length > 0) profileMap.set(sym, profArr[0]);
          if (Array.isArray(quoteArr) && quoteArr.length > 0) quoteMap.set(sym, quoteArr[0]);
        } catch {
          // individual symbol fetch failed, skip
        }
      });
      await Promise.all(fetchPromises);
    }

    const nameMap = buildNameMap(sector);

    const companies = allSymbols.map((sym) => {
      const p = profileMap.get(sym);
      const q = quoteMap.get(sym);
      const marketCap = q?.marketCap || p?.mktCap || p?.marketCap || fallbackCaps[sym] || 1e10;
      const revenueGrowth = randomGrowthEstimate(sym, sector);
      return {
        symbol: sym,
        name: p?.companyName || nameMap[sym] || sym,
        marketCap,
        price: q?.price || p?.price || 0,
        change: q?.changesPercentage ?? p?.changesPercentage ?? 0,
        revenueGrowth,
        industry: p?.industry || '',
        image: p?.image || '',
      };
    }).sort((a, b) => b.marketCap - a.marketCap);

    const totalMarketCap = companies.reduce((s, c) => s + c.marketCap, 0);
    const avgGrowth = companies.length > 0
      ? companies.reduce((s, c) => s + c.revenueGrowth, 0) / companies.length
      : 0;

    let news: any[] = [];
    if (fmp) {
      try {
        const topSymbol = companies[0]?.symbol;
        if (topSymbol) {
          const rawNews = await fmp.getNews(topSymbol, 6);
          if (Array.isArray(rawNews)) {
            news = rawNews.map((n: any) => ({
              title: n.title || '',
              url: n.url || '',
              date: n.publishedDate || '',
              source: n.site || '',
              sentiment: deriveNewsSentiment(n.title || ''),
            }));
          }
        }
      } catch {
        // news fetch is optional
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sector,
        companies,
        supplyChain,
        totalMarketCap,
        avgGrowth: Math.round(avgGrowth * 10) / 10,
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

function buildNameMap(sector: string): Record<string, string> {
  const chain = SECTOR_SUPPLY_CHAINS[sector];
  if (!chain) return {};
  const map: Record<string, string> = {};
  for (const layer of [chain.upstream, chain.midstream, chain.downstream]) {
    for (const node of layer) {
      for (const co of node.companies) {
        map[co.symbol] = co.name;
      }
    }
  }
  return map;
}

function getSymbolsForSector(sector: string): string[] {
  const chain = SECTOR_SUPPLY_CHAINS[sector];
  if (!chain) return [];

  const symbolSet = new Set<string>();
  const layers = [chain.upstream, chain.midstream, chain.downstream];
  for (const layer of layers) {
    for (const node of layer) {
      for (const co of node.companies) {
        symbolSet.add(co.symbol);
      }
    }
  }
  return Array.from(symbolSet);
}

function randomGrowthEstimate(symbol: string, sector: string): number {
  const sectorBase: Record<string, number> = {
    Technology: 15,
    Healthcare: 8,
    'Financial Services': 6,
    'Consumer Cyclical': 10,
    'Communication Services': 12,
    Industrials: 5,
    'Consumer Defensive': 3,
    Energy: -1,
    'Basic Materials': 2,
    'Real Estate': 1,
    Utilities: 2,
  };
  const base = sectorBase[sector] ?? 5;
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
    hash |= 0;
  }
  const noise = ((hash % 200) - 100) / 10;
  return Math.round((base + noise) * 10) / 10;
}

function deriveNewsSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['surge', 'gain', 'rise', 'up', 'beat', 'exceed', 'growth', 'record', 'high', 'strong', 'boost', 'rally', 'profit', 'upgrade'];
  const negativeWords = ['drop', 'fall', 'decline', 'down', 'miss', 'loss', 'weak', 'cut', 'low', 'risk', 'crash', 'sell', 'warning', 'downgrade'];
  const lower = title.toLowerCase();
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}
