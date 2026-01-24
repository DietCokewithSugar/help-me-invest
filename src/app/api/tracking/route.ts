import { NextRequest, NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const { symbols } = await request.json();

        if (!Array.isArray(symbols) || symbols.length === 0) {
            return NextResponse.json({ error: '请提供股票代码列表' }, { status: 400 });
        }

        const fmpApiKey = process.env.FMP_API_KEY;
        if (!fmpApiKey) {
            return NextResponse.json({ error: 'FMP API 密钥未配置' }, { status: 500 });
        }

        const fmp = new FMPClient(fmpApiKey);

        // 并行获取所有股票的实时行情和简要历史数据
        const results = await Promise.all(
            symbols.map(async (symbol) => {
                try {
                    const [quote, historyData] = await Promise.all([
                        fmp.getQuote(symbol),
                        // 获取一个月的历史数据用于趋势图
                        fmp.getHistoricalPrice(symbol, undefined, undefined)
                    ]);

                    // Debug: 打印历史数据格式
                    if (historyData && symbol === 'AAPL') {
                        console.log('Historical data sample for AAPL:', JSON.stringify(historyData).substring(0, 500));
                    }

                    // FMP stable API 直接返回数组，取前30条（最近一个月）
                    const history = Array.isArray(historyData) ? historyData.slice(0, 30) :
                        (historyData as any)?.historical?.slice(0, 30) || [];

                    return {
                        symbol,
                        quote: (quote as any[])[0] || null,
                        history,
                    };
                } catch (e) {
                    console.error(`Error fetching data for ${symbol}:`, e);
                    return { symbol, quote: null, history: [], error: true };
                }
            })
        );

        return NextResponse.json({ success: true, data: results });
    } catch (error: any) {
        console.error('Tracking API error:', error);
        return NextResponse.json(
            { error: error.message || '获取追踪数据失败，请稍后重试' },
            { status: 500 }
        );
    }
}
