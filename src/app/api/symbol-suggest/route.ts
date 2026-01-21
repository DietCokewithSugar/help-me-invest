import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { formatSymbolForMarket, type MarketType } from '@/lib/markets';

const VALID_MARKETS: MarketType[] = ['US', 'CN', 'HK', 'JP'];

const MARKET_SYMBOL_REGEX: Record<MarketType, RegExp> = {
  US: /^[A-Z0-9.-]{1,10}$/,
  CN: /^\d{6}\.(SS|SZ)$/,
  HK: /^\d{4,5}\.HK$/,
  JP: /^\d{4}\.T$/,
};

function normalizeSuggestion(item: any) {
  const market = (item?.market || '').toUpperCase() as MarketType;
  if (!VALID_MARKETS.includes(market)) return null;

  let symbol = String(item?.symbol || '').toUpperCase().trim();
  if (!symbol) return null;

  if (market === 'US' && symbol.endsWith('.US')) {
    symbol = symbol.replace(/\.US$/i, '');
  }

  if (!symbol.includes('.')) {
    if (market === 'HK' && /^\d{1,5}$/.test(symbol)) {
      symbol = symbol.padStart(symbol.length <= 4 ? 4 : 5, '0');
    }
    if (market === 'JP' && /^\d{1,4}$/.test(symbol)) {
      symbol = symbol.padStart(4, '0');
    }
    symbol = formatSymbolForMarket(symbol, market);
  }

  if (!MARKET_SYMBOL_REGEX[market].test(symbol)) {
    return null;
  }

  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  const nameCn = typeof item?.nameCn === 'string' ? item.nameCn.trim() : '';
  const confidenceRaw = Number(item?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : undefined;

  return {
    symbol,
    market,
    name,
    nameCn,
    confidence,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { query, market } = await request.json();
    const trimmedQuery = String(query || '').trim();
    const marketHint = (market || '') as MarketType;

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return NextResponse.json({ query: trimmedQuery, suggestions: [] });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API 密钥未配置' }, { status: 500 });
    }

    const gemini = new GeminiClient(googleApiKey);
    const aiResult = await gemini.suggestSymbol(trimmedQuery, marketHint);
    const rawSuggestions = Array.isArray(aiResult?.suggestions) ? aiResult.suggestions : [];
    const suggestions = rawSuggestions
      .map(normalizeSuggestion)
      .filter(Boolean)
      .slice(0, 5);

    return NextResponse.json({
      query: trimmedQuery,
      suggestions,
    });
  } catch (error: any) {
    console.error('Symbol suggest error:', error?.message || error);
    return NextResponse.json(
      { error: '联想搜索失败，请稍后重试' },
      { status: 500 }
    );
  }
}
