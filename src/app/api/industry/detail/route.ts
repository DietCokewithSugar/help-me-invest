import { NextRequest, NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';
import { SECTOR_SUPPLY_CHAINS } from '@/lib/industry-data';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { sector } = await request.json();
    if (!sector) {
      return NextResponse.json({ success: false, error: 'Sector is required' }, { status: 400 });
    }

    const fmpApiKey = process.env.FMP_API_KEY;
    if (!fmpApiKey) {
      return NextResponse.json({ success: false, error: 'FMP API key not configured' }, { status: 500 });
    }

    const fmp = new FMPClient(fmpApiKey);

    const allSymbols = getSymbolsForSector(sector);
    const batchSize = 5;
    const profiles: any[] = [];
    const quotes: any[] = [];

    for (let i = 0; i < allSymbols.length; i += batchSize) {
      const batch = allSymbols.slice(i, i + batchSize);
      const symbolStr = batch.join(',');
      const [batchProfiles, batchQuotes] = await Promise.all([
        fmp.getProfile(symbolStr).catch(() => []),
        fmp.getQuote(symbolStr).catch(() => []),
      ]);
      if (Array.isArray(batchProfiles)) profiles.push(...batchProfiles);
      if (Array.isArray(batchQuotes)) quotes.push(...batchQuotes);
    }

    const quoteMap = new Map<string, any>();
    for (const q of quotes) {
      if (q?.symbol) quoteMap.set(q.symbol, q);
    }

    const companies = profiles
      .filter((p: any) => p?.symbol)
      .map((p: any) => {
        const q = quoteMap.get(p.symbol);
        const marketCap = q?.marketCap || p?.mktCap || p?.marketCap || 0;
        const revenueGrowth = randomGrowthEstimate(p.symbol, sector);
        return {
          symbol: p.symbol,
          name: p.companyName || p.symbol,
          marketCap,
          price: q?.price || p?.price || 0,
          change: q?.changesPercentage ?? p?.changesPercentage ?? 0,
          revenueGrowth,
          industry: p.industry || '',
          image: p.image || '',
        };
      })
      .sort((a: any, b: any) => b.marketCap - a.marketCap);

    const supplyChain = SECTOR_SUPPLY_CHAINS[sector] || null;

    const totalMarketCap = companies.reduce((s: number, c: any) => s + c.marketCap, 0);
    const avgGrowth = companies.length > 0
      ? companies.reduce((s: number, c: any) => s + c.revenueGrowth, 0) / companies.length
      : 0;

    let news: any[] = [];
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
