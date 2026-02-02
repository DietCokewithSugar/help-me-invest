import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import type { MarketType } from '@/types'; // Ensure correct import path for types if needed, or use string

export const runtime = 'edge'; // Optional: Use edge if supported, but Node.js is fine too. Let's stick to default/nodejs if strict timeout is needed, but streaming supports edge well.
// Actually standard Node runtime is safer for now unless configured otherwise.
export const maxDuration = 120; // Allow longer timeout for streaming (Pro model with thinking needs more time)

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
        const { 
            section, 
            data, 
            market, 
            prevContext, 
            // 年度财务数据
            incomeStatements, 
            balanceSheets,
            cashFlowStatements,
            keyMetrics, 
            keyMetricsTTM,
            financialRatios, 
            financialRatiosTTM,
            financialGrowth,
            financialScores,
            // 季度财务数据
            incomeStatementsQuarter,
            balanceSheetsQuarter,
            cashFlowStatementsQuarter,
        } = await request.json();
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
            // ============ 专业版报告 - 7个独立的并发请求 ============
            case 'proBusinessModel':
                // 专业版 - 生意模式分析
                streamIterator = await client.streamProBusinessModel(data, marketType);
                break;
            case 'proOperatingModel':
                // 专业版 - 运营模式分析
                streamIterator = await client.streamProOperatingModel(data, marketType);
                break;
            case 'proIndustryOutlook':
                // 专业版 - 行业前景评估
                streamIterator = await client.streamProIndustryOutlook(data, marketType);
                break;
            case 'proMoatAnalysis':
                // 专业版 - 竞争地位与护城河
                streamIterator = await client.streamProMoatAnalysis(
                    data,
                    data.profitabilityData || {},
                    data.capitalReturnData || {},
                    marketType
                );
                break;
            case 'proFinancialHealth':
                // 专业版 - 财务健康与经营质量
                streamIterator = await client.streamProFinancialHealth(
                    data,
                    data.annualFinancials || [],
                    data.quarterlyFinancials || [],
                    data.profitabilityData || {},
                    data.debtData || {},
                    data.healthScores || {},
                    marketType
                );
                break;
            case 'proValuation':
                // 专业版 - 估值与买入时机
                streamIterator = await client.streamProValuation(
                    data,
                    data.valuationData || {},
                    data.growthData || {},
                    data.quarterlyFinancials || [],
                    marketType
                );
                break;
            case 'proInvestmentConclusion':
                // 专业版 - 综合投资建议（需要前6个章节内容）
                if (!prevContext) {
                    return NextResponse.json({ error: 'Context required for pro conclusion' }, { status: 400 });
                }
                streamIterator = await client.streamProInvestmentConclusion(data, prevContext, marketType);
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
