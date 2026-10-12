import { NextRequest, NextResponse } from 'next/server';
import { fetchQuoteWithHistory } from '@/lib/market-data';

export const maxDuration = 60;

const MAX_SYMBOLS = 50;

export async function POST(request: NextRequest) {
    try {
        const { symbols } = await request.json();

        if (!Array.isArray(symbols) || symbols.length === 0) {
            return NextResponse.json({ error: '请提供股票代码列表' }, { status: 400 });
        }

        const list = symbols
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            .slice(0, MAX_SYMBOLS);

        // 一次 chart 请求同时返回最新价与近一个月日线
        const results = await Promise.all(
            list.map(async (symbol) => {
                try {
                    const { quote, history } = await fetchQuoteWithHistory(symbol, '1mo');
                    return { symbol, quote, history };
                } catch (e: any) {
                    console.error(`Error fetching data for ${symbol}:`, e?.message || e);
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
