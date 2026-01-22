import { NextRequest, NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';
import { fetchFmpReportData } from '@/lib/fmp-data';
import type { MarketType } from '@/lib/markets';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { symbol, market, period } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: '请提供股票代码' }, { status: 400 });
    }

    const fmpApiKey = process.env.FMP_API_KEY;
    if (!fmpApiKey) {
      return NextResponse.json({ error: 'FMP API 密钥未配置' }, { status: 500 });
    }

    const fmp = new FMPClient(fmpApiKey);
    const fmpData = await fetchFmpReportData(fmp, {
      symbol,
      market: market as MarketType | undefined,
      period: period as 'annual' | 'quarter' | undefined
    });

    return NextResponse.json(fmpData);
  } catch (error: any) {
    console.error('FMP data error:', error);
    return NextResponse.json(
      { error: error.message || '获取 FMP 数据失败，请稍后重试' },
      { status: 500 }
    );
  }
}
