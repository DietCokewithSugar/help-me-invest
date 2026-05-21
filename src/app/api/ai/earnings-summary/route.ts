import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { withRetryAndTimeout } from '@/lib/api-utils';
import { apiErrorResponse, readJsonWithLimit, requireInternalApiKey, truncateText } from '@/lib/api-security';

export const maxDuration = 60;
const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_TRANSCRIPT_CHARS = 50_000;

export async function POST(request: NextRequest) {
  try {
    requireInternalApiKey(request);
    const { transcriptText, companyName, symbol } = await readJsonWithLimit<any>(request, MAX_REQUEST_BYTES);

    if (!transcriptText || !companyName || !symbol) {
      return NextResponse.json({ error: '缺少必要的电话会议信息' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API 密钥未配置' }, { status: 500 });
    }

    const gemini = new GeminiClient(googleApiKey);
    const limitedTranscript = truncateText(transcriptText, MAX_TRANSCRIPT_CHARS);
    const earningsCallSummary = await withRetryAndTimeout(
      () => gemini.summarizeEarningsCall(limitedTranscript, companyName, symbol.toUpperCase()),
      { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000, label: 'summarizeEarningsCall' },
      ''
    );

    return NextResponse.json({ earningsCallSummary });
  } catch (error: any) {
    console.error('AI earnings summary error:', error);
    return apiErrorResponse(error, '财报摘要失败，请稍后重试');
  }
}
