import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';

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
    const { transcriptText, companyName, symbol } = await request.json();

    if (!transcriptText || !companyName || !symbol) {
      return NextResponse.json({ error: '缺少必要的电话会议信息' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API 密钥未配置' }, { status: 500 });
    }

    const gemini = new GeminiClient(googleApiKey);
    const earningsCallSummary = await withTimeout(
      gemini.summarizeEarningsCall(transcriptText, companyName, symbol.toUpperCase()),
      12000,
      '',
      'summarizeEarningsCall'
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
