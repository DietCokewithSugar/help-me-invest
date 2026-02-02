import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import type { MarketType } from '@/types'; // Ensure correct import path for types if needed, or use string

export const runtime = 'edge'; // Optional: Use edge if supported, but Node.js is fine too. Let's stick to default/nodejs if strict timeout is needed, but streaming supports edge well.
// Actually standard Node runtime is safer for now unless configured otherwise.
export const maxDuration = 60; // Allow longer timeout for streaming

function iteratorToStream(iterator: AsyncGenerator<string, void, unknown>) {
    return new ReadableStream({
        async pull(controller) {
            const { value, done } = await iterator.next();
            if (done) {
                controller.close();
            } else {
                controller.enqueue(new TextEncoder().encode(value));
            }
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const { section, data, market, prevContext, incomeStatements, keyMetrics, financialRatios, financialGrowth } = await request.json();
        const googleApiKey = process.env.GOOGLE_API_KEY;

        if (!googleApiKey) {
            return NextResponse.json({ error: 'Google API Key missing' }, { status: 500 });
        }

        const client = new GeminiClient(googleApiKey);
        const marketType = (market as MarketType) || 'US';

        let streamIterator: AsyncGenerator<string, void, unknown>;

        switch (section) {
            case 'companyOverview':
                streamIterator = await client.streamCompanyOverview(data, marketType);
                break;
            case 'industryAnalysis':
                streamIterator = await client.streamIndustryAnalysis(data, marketType);
                break;
            case 'industryPainPoints':
                streamIterator = await client.streamIndustryPainPoints(data, marketType);
                break;
            case 'competitors':
                streamIterator = await client.streamCompetitors(data, data.peers || [], marketType);
                break;
            case 'competitiveAdvantage':
                streamIterator = await client.streamCompetitiveAdvantage(data, marketType);
                break;
            case 'moat':
                streamIterator = await client.streamMoat(data, marketType);
                break;
            case 'recentDevelopments':
                streamIterator = await client.streamRecentDevelopments(data.companyName, data.symbol, marketType);
                break;
            case 'earningsCallSummary':
                // For earnings call, data might be passed differently, or we assume transcript is in data.
                // Based on original usage: client.summarizeEarningsCall(transcriptText, companyName, symbol)
                // So we expect data to have `transcript` property.
                if (!data.transcript) {
                    // Fallback or empty if no transcript. But API called implies we have it.
                    return NextResponse.json({ error: 'Transcript missing' }, { status: 400 });
                }
                streamIterator = await client.streamEarningsCallSummary(data.transcript, data.companyName, data.symbol);
                break;
            case 'investmentConclusion':
                if (!prevContext) {
                    return NextResponse.json({ error: 'Context required for conclusion' }, { status: 400 });
                }
                streamIterator = await client.streamInvestmentConclusion(data, prevContext, marketType);
                break;
            case 'proAnalysis':
                // 专业版报告分析（使用 Gemini 3 Flash + Google Search）
                streamIterator = await client.streamProAnalysis(
                    data,
                    incomeStatements || [],
                    keyMetrics || [],
                    financialRatios || [],
                    financialGrowth || [],
                    marketType
                );
                break;
            default:
                return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
        }

        const stream = iteratorToStream(streamIterator);

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
