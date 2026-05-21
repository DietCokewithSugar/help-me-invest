import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import type { MarketType } from '@/lib/markets';
import { withRetryAndTimeout } from '@/lib/api-utils';
import { apiErrorResponse, readJsonWithLimit, requireInternalApiKey } from '@/lib/api-security';

export const maxDuration = 60;
const MAX_REQUEST_BYTES = 16 * 1024;

export async function POST(request: NextRequest) {
  try {
    requireInternalApiKey(request);
    const { symbol, companyName, market } = await readJsonWithLimit<any>(request, MAX_REQUEST_BYTES);

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

    const searchResults = await withRetryAndTimeout(
      () => gemini.searchAndAnalyze(companyName, symbol.toUpperCase(), marketType),
      { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000, label: 'searchAndAnalyze' },
      ''
    );

    let supplementary = { competitors: '', recentNews: '', analystViews: '' };
    if (isNonUS) {
      supplementary = await withRetryAndTimeout(
        () => gemini.searchCompanyDetails(companyName, symbol.toUpperCase(), marketType),
        { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 10000, label: 'searchCompanyDetails' },
        supplementary
      );
    }

    return NextResponse.json({ searchResults, supplementary });
  } catch (error: any) {
    console.error('AI search error:', error);
    return apiErrorResponse(error, '搜索失败，请稍后重试');
  }
}
