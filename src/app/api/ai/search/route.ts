import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import type { MarketType } from '@/lib/markets';

export const maxDuration = 15;

const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label: string
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  return new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`AI timeout: ${label}`);
      resolve(fallback);
    }, ms);

    promise
      .then((result) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        if (timeoutId) clearTimeout(timeoutId);
        console.error(`AI error: ${label}`, error?.message || error);
        resolve(fallback);
      });
  });
};

export async function POST(request: NextRequest) {
  try {
    const { symbol, companyName, market } = await request.json();

    if (!symbol || !companyName) {
      return NextResponse.json({ error: '缺少必要的公司信息' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API 密钥未配置' }, { status: 500 });
    }

    const gemini = new GeminiClient(googleApiKey);
    const marketType = (market as MarketType) || 'US';
    const isNonUS = marketType !== 'US';

    const searchResults = await withTimeout(
      gemini.searchAndAnalyze(companyName, symbol.toUpperCase(), marketType),
      12000,
      '',
      'searchAndAnalyze'
    );

    let supplementary = { competitors: '', recentNews: '', analystViews: '' };
    if (isNonUS) {
      supplementary = await withTimeout(
        gemini.searchCompanyDetails(companyName, symbol.toUpperCase(), marketType),
        8000,
        supplementary,
        'searchCompanyDetails'
      );
    }

    return NextResponse.json({ searchResults, supplementary });
  } catch (error: any) {
    console.error('AI search error:', error);
    return NextResponse.json(
      { error: error.message || '搜索失败，请稍后重试' },
      { status: 500 }
    );
  }
}
