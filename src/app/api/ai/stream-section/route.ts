import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { saveReportSection } from '@/lib/supabase';
import type { MarketType } from '@/types';

// 使用 Node.js Runtime（不使用 Edge），Pro 计划最大超时 300 秒
export const maxDuration = 300;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

type StreamIterator = AsyncGenerator<string, void, unknown>;

/**
 * 创建一个预置首值的迭代器
 */
async function* createPrependedIterator(
    firstValue: string | undefined,
    iterator: StreamIterator
): StreamIterator {
    if (firstValue !== undefined) {
        yield firstValue;
    }
    yield* iterator;
}

/**
 * 创建一个错误迭代器
 */
async function* createErrorIterator(errorMessage: string): StreamIterator {
    yield errorMessage;
}

/**
 * 带重试的流迭代器获取
 */
async function getStreamWithRetry(
    getIterator: () => Promise<AsyncGenerator<string, void, unknown>>,
    label: string
): Promise<AsyncGenerator<string, void, unknown>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const iterator = await getIterator();
            // 尝试获取第一个值来验证流是否正常工作
            const firstResult = await iterator.next();

            // 返回包含已获取首值的迭代器
            const firstValue = !firstResult.done ? firstResult.value : undefined;
            return createPrependedIterator(firstValue, iterator);
        } catch (error: any) {
            lastError = error;
            console.warn(`[${label}] 第 ${attempt}/${MAX_RETRIES} 次尝试失败:`, error?.message || error);

            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                console.log(`[${label}] 等待 ${delay}ms 后重试...`);
                await sleep(delay);
            }
        }
    }

    // 所有重试失败，返回一个错误迭代器
    console.error(`[${label}] 所有 ${MAX_RETRIES} 次重试均失败`);
    return createErrorIterator(`生成失败，请稍后重试。错误: ${lastError?.message || '未知错误'}`);
}

/**
 * 将迭代器转换为流，并在完成后保存到缓存
 */
function iteratorToStreamWithCache(
    iterator: AsyncGenerator<string, void, unknown>,
    saveToCache: boolean,
    symbol: string,
    market: string,
    section: string,
    language?: string
) {
    let fullContent = '';

    return new ReadableStream({
        async pull(controller) {
            try {
                const { value, done } = await iterator.next();
                if (done) {
                    // 流结束，保存到缓存
                    if (saveToCache && fullContent.trim().length > 0) {
                        // 重要：必须等待保存完成后再关闭流
                        // 否则 Vercel Serverless Function 会在保存完成前终止
                        try {
                            await saveReportSection(symbol, market, section, fullContent, language);
                        } catch (err) {
                            console.error(`保存模块 ${section} 到缓存失败:`, err);
                        }
                    }
                    controller.close();
                } else {
                    fullContent += value;
                    controller.enqueue(new TextEncoder().encode(value));
                }
            } catch (error: any) {
                console.error('Stream error:', error);
                controller.enqueue(new TextEncoder().encode(`\n\n[流式传输错误: ${error?.message || '未知错误'}]`));
                controller.close();
            }
        },
    });
}

// 保留原始函数用于不需要缓存的场景
function iteratorToStream(iterator: AsyncGenerator<string, void, unknown>) {
    return new ReadableStream({
        async pull(controller) {
            try {
                const { value, done } = await iterator.next();
                if (done) {
                    controller.close();
                } else {
                    controller.enqueue(new TextEncoder().encode(value));
                }
            } catch (error: any) {
                console.error('Stream error:', error);
                controller.enqueue(new TextEncoder().encode(`\n\n[流式传输错误: ${error?.message || '未知错误'}]`));
                controller.close();
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
            // 用于缓存的参数
            symbol,
            saveToCache = true,
            // 语言参数
            language = 'zh',
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
            return NextResponse.json({ error: 'Google API key missing' }, { status: 500 });
        }

        const client = new GeminiClient(googleApiKey);
        const marketType = (market as MarketType) || 'US';

        let streamIterator: AsyncGenerator<string, void, unknown>;

        switch (section) {
            case 'companyOverview':
                streamIterator = await getStreamWithRetry(
                    () => client.streamCompanyOverview(data, marketType, language),
                    'companyOverview'
                );
                break;
            case 'industryAnalysis':
                streamIterator = await getStreamWithRetry(
                    () => client.streamIndustryAnalysis(data, marketType, language),
                    'industryAnalysis'
                );
                break;
            case 'industryPainPoints':
                streamIterator = await getStreamWithRetry(
                    () => client.streamIndustryPainPoints(data, marketType, language),
                    'industryPainPoints'
                );
                break;
            case 'competitors':
                streamIterator = await getStreamWithRetry(
                    () => client.streamCompetitors(data, data.peers || [], marketType, language),
                    'competitors'
                );
                break;
            case 'competitiveAdvantage':
                streamIterator = await getStreamWithRetry(
                    () => client.streamCompetitiveAdvantage(data, marketType, language),
                    'competitiveAdvantage'
                );
                break;
            case 'moat':
                streamIterator = await getStreamWithRetry(
                    () => client.streamMoat(data, marketType, language),
                    'moat'
                );
                break;
            case 'recentDevelopments':
                streamIterator = await getStreamWithRetry(
                    () => client.streamRecentDevelopments(data.companyName, data.symbol, marketType, language),
                    'recentDevelopments'
                );
                break;
            case 'earningsCallSummary':
                if (!data.transcript) {
                    return NextResponse.json({ error: 'Transcript missing' }, { status: 400 });
                }
                streamIterator = await getStreamWithRetry(
                    () => client.streamEarningsCallSummary(data.transcript, data.companyName, data.symbol, language),
                    'earningsCallSummary'
                );
                break;
            case 'investmentConclusion':
                if (!prevContext) {
                    return NextResponse.json({ error: 'Context required for conclusion' }, { status: 400 });
                }
                streamIterator = await getStreamWithRetry(
                    () => client.streamInvestmentConclusion(data, prevContext, marketType, language),
                    'investmentConclusion'
                );
                break;
            case 'proBusinessModel':
                streamIterator = await getStreamWithRetry(
                    () => client.streamProBusinessModel(data, marketType, language),
                    'proBusinessModel'
                );
                break;
            case 'proOperatingModel':
                streamIterator = await getStreamWithRetry(
                    () => client.streamProOperatingModel(data, marketType, language),
                    'proOperatingModel'
                );
                break;
            case 'proIndustryOutlook':
                streamIterator = await getStreamWithRetry(
                    () => client.streamProIndustryOutlook(data, marketType, language),
                    'proIndustryOutlook'
                );
                break;
            case 'proMoatAnalysis':
                streamIterator = await getStreamWithRetry(
                    () => client.streamProMoatAnalysis(
                        data,
                        data.profitabilityData || {},
                        data.capitalReturnData || {},
                        marketType,
                        language
                    ),
                    'proMoatAnalysis'
                );
                break;
            case 'proFinancialHealth':
                streamIterator = await getStreamWithRetry(
                    () => client.streamProFinancialHealth(
                        data,
                        data.annualFinancials || [],
                        data.quarterlyFinancials || [],
                        data.profitabilityData || {},
                        data.debtData || {},
                        data.healthScores || {},
                        marketType,
                        language
                    ),
                    'proFinancialHealth'
                );
                break;
            case 'proValuation':
                streamIterator = await getStreamWithRetry(
                    () => client.streamProValuation(
                        data,
                        data.valuationData || {},
                        data.growthData || {},
                        data.quarterlyFinancials || [],
                        marketType,
                        language
                    ),
                    'proValuation'
                );
                break;
            case 'proInvestmentConclusion':
                if (!prevContext) {
                    return NextResponse.json({ error: 'Context required for pro conclusion' }, { status: 400 });
                }
                streamIterator = await getStreamWithRetry(
                    () => client.streamProInvestmentConclusion(data, prevContext, marketType, language),
                    'proInvestmentConclusion'
                );
                break;
            case 'beginnerVerdict':
                streamIterator = await getStreamWithRetry(
                    () => client.streamBeginnerVerdict(data, data.incomeStatements || [], marketType, language),
                    'beginnerVerdict'
                );
                break;
            case 'beginnerCompanyIntro':
                streamIterator = await getStreamWithRetry(
                    () => client.streamBeginnerCompanyIntro(data, marketType, language),
                    'beginnerCompanyIntro'
                );
                break;
            case 'beginnerRiskReward':
                streamIterator = await getStreamWithRetry(
                    () => client.streamBeginnerRiskReward(data, marketType, language),
                    'beginnerRiskReward'
                );
                break;
            case 'beginnerActionPlan':
                if (!prevContext) {
                    return NextResponse.json({ error: 'Context required for beginner action plan' }, { status: 400 });
                }
                streamIterator = await getStreamWithRetry(
                    () => client.streamBeginnerActionPlan(data, prevContext, marketType, language),
                    'beginnerActionPlan'
                );
                break;
            default:
                return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
        }

        // 从 data 中提取 symbol，如果没有直接传递的话
        const effectiveSymbol = symbol || data?.symbol || '';
        const effectiveMarket = marketType;

        // 使用带缓存的流，如果有有效的 symbol
        const stream = (saveToCache && effectiveSymbol)
            ? iteratorToStreamWithCache(streamIterator, true, effectiveSymbol, effectiveMarket, section, language)
            : iteratorToStream(streamIterator);

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
