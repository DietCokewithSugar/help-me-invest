import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekClient } from '@/lib/deepseek';
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

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'DeepSeek API 密钥未配置' }, { status: 500 });
    }

    const deepseek = new DeepSeekClient(deepseekApiKey);
    const limitedTranscript = truncateText(transcriptText, MAX_TRANSCRIPT_CHARS);
    const earningsCallSummary = await withRetryAndTimeout(
      (signal) => deepseek.summarizeEarningsCall(limitedTranscript, companyName, symbol.toUpperCase(), undefined, signal),
      { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000, label: 'summarizeEarningsCall' },
      ''
    );

    return NextResponse.json({ earningsCallSummary });
  } catch (error: any) {
    console.error('AI earnings summary error:', error);
    return apiErrorResponse(error, '财报摘要失败，请稍后重试');
  }
}
