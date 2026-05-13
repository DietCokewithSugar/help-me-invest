import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { withRetryAndTimeout } from '@/lib/api-utils';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { transcriptText, companyName, symbol } = await request.json();

    if (!transcriptText || !companyName || !symbol) {
      return NextResponse.json({ error: '缺少必要的电话会议信息' }, { status: 400 });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'DeepSeek API 密钥未配置' }, { status: 500 });
    }

    const gemini = new GeminiClient(deepseekApiKey);
    const earningsCallSummary = await withRetryAndTimeout(
      () => gemini.summarizeEarningsCall(transcriptText, companyName, symbol.toUpperCase()),
      { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000, label: 'summarizeEarningsCall' },
      ''
    );

    return NextResponse.json({ earningsCallSummary });
  } catch (error: any) {
    console.error('AI earnings summary error:', error);
    return NextResponse.json(
      { error: error.message || '财报摘要失败，请稍后重试' },
      { status: 500 }
    );
  }
}
