import { useState, useRef, useCallback } from 'react';
import type { ReportData, MarketType, AIAnalysis, ProAIAnalysis } from '@/types';
import { formatSymbolForMarket } from '@/lib/markets';

// 缓存响应类型
interface CacheResponse {
    cached: boolean;
    hasStandardAnalysis?: boolean;
    hasProAnalysis?: boolean;
    hasFmpData?: boolean;
    data?: {
        aiAnalysis: AIAnalysis | null;
        proAiAnalysis: ProAIAnalysis | null;
        earningsCallSummary: string;
        sankeyData: any;
        revenueTrend: any;
        costStructure: any;
        incomeStatements: any;
        balanceSheets: any;
        cashFlowStatements: any;
        incomeStatementsQuarter: any;
        balanceSheetsQuarter: any;
        cashFlowStatementsQuarter: any;
        capitalReturnData: any;
    };
    updatedAt?: string;
}

export function useReportAnalysis() {
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loadingStep, setLoadingStep] = useState(0);
    const [fromCache, setFromCache] = useState(false);

    // Streaming helper
    const streamSection = async (section: string, payload: any, saveToCache: boolean = true) => {
        try {
            const response = await fetch('/api/ai/stream-section', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, saveToCache, ...payload }),
            });

            if (!response.body) return '';

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let text = '';

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value, { stream: !done });
                text += chunkValue;

                setReportData((prev) => {
                    if (!prev) return prev;

                    if (section === 'earningsCallSummary') {
                        return { ...prev, earningsCallSummary: text };
                    }

                    // 处理专业版模块
                    if (section.startsWith('pro')) {
                        return {
                            ...prev,
                            proAiAnalysis: {
                                ...(prev.proAiAnalysis || {} as any),
                                [section]: text,
                            } as any,
                        };
                    }

                    // For AI Analysis fields
                    return {
                        ...prev,
                        aiAnalysis: {
                            ...(prev.aiAnalysis || {} as any),
                            [section]: text,
                        } as any,
                    };
                });
            }
            return text;
        } catch (error) {
            console.error(`Stream error for ${section}:`, error);
            return '';
        }
    };

    // 检查缓存
    const checkCache = async (symbol: string, market: MarketType): Promise<CacheResponse | null> => {
        try {
            const response = await fetch(`/api/cache?symbol=${encodeURIComponent(symbol)}&market=${market}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('检查缓存失败:', error);
            return null;
        }
    };

    const analyze = useCallback(async (symbol: string, market: MarketType, forceRefresh: boolean = false) => {
        const formattedSymbol = formatSymbolForMarket(symbol, market);

        setLoading(true);
        setAiLoading(false);
        setAiError('');
        setError('');
        setReportData(null);
        setLoadingStep(0);
        setFromCache(false);

        const parseJsonResponse = async (response: Response) => {
            const text = await response.text();
            if (!text) return null;
            try {
                return JSON.parse(text);
            } catch (error) {
                throw new Error('服务返回了非 JSON 响应');
            }
        };

        const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 90000) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error: any) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('请求超时，服务器响应时间过长。请检查网络连接后重试。');
                }
                throw error;
            }
        };

        try {
            // 0. 检查缓存（如果不是强制刷新）
            let cachedData: CacheResponse | null = null;
            if (!forceRefresh) {
                cachedData = await checkCache(formattedSymbol, market);
            }

            // 1. Fetch Basic FMP Data
            const response = await fetchWithTimeout('/api/fmp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: formattedSymbol,
                    market: market,
                    period: 'annual',
                    // 如果缓存中有 FMP 数据，告诉后端可以使用缓存
                    useCache: !forceRefresh && cachedData?.hasFmpData,
                }),
            }, 90000);
            const data = await parseJsonResponse(response);

            if (!response.ok) {
                throw new Error(data?.error || '分析失败，请稍后重试');
            }

            // 检查是否可以使用缓存的 AI 分析
            const useCachedAI = !forceRefresh && cachedData?.cached && cachedData?.hasStandardAnalysis;
            const useCachedProAI = !forceRefresh && cachedData?.cached && cachedData?.hasProAnalysis;

            if (useCachedAI && cachedData?.data?.aiAnalysis) {
                // 使用缓存的 AI 分析
                setFromCache(true);
                setReportData({
                    ...data,
                    aiAnalysis: cachedData.data.aiAnalysis,
                    proAiAnalysis: useCachedProAI ? cachedData.data.proAiAnalysis || undefined : undefined,
                    earningsCallSummary: cachedData.data.earningsCallSummary || '',
                    reportGeneratedAt: cachedData.updatedAt,
                });
                setLoading(false);
                console.log('使用缓存的报告数据');
                return;
            }

            // 没有缓存或强制刷新，需要生成新的报告
            setReportData({
                ...data,
                aiAnalysis: {
                    companyOverview: '',
                    industryAnalysis: '',
                    industryPainPoints: '',
                    competitors: '',
                    competitiveAdvantage: '',
                    moat: '',
                    recentDevelopments: '',
                    investmentConclusion: '',
                },
                earningsCallSummary: '',
            });

            setLoading(false);

            // 2. Start Parallel Streaming
            const companyData = data.profile;
            const peers = data.peers || [];

            const tasks: Promise<string>[] = [];

            // 传递 symbol 和 market 用于保存到缓存
            const streamPayload = { symbol: formattedSymbol, market };

            tasks.push(streamSection('companyOverview', { ...streamPayload, data: companyData }));
            tasks.push(streamSection('industryAnalysis', { ...streamPayload, data: companyData }));
            tasks.push(streamSection('industryPainPoints', { ...streamPayload, data: companyData }));
            tasks.push(streamSection('competitors', { ...streamPayload, data: { ...companyData, peers } }));
            tasks.push(streamSection('competitiveAdvantage', { ...streamPayload, data: companyData }));
            tasks.push(streamSection('moat', { ...streamPayload, data: companyData }));
            tasks.push(streamSection('recentDevelopments', { ...streamPayload, data: { companyName: companyData.companyName, symbol: formattedSymbol } }));

            const transcript = data.earningsTranscripts?.[0];
            let earningsPromise: Promise<string> | null = null;
            if (transcript && companyData.companyName) {
                const transcriptText = transcript.content || transcript.transcript || transcript.text || '';
                if (transcriptText) {
                    earningsPromise = streamSection('earningsCallSummary', {
                        ...streamPayload,
                        data: {
                            transcript: transcriptText,
                            companyName: companyData.companyName,
                            symbol: formattedSymbol
                        },
                    });
                }
            }

            const results = await Promise.all(tasks);
            const earningsResult = earningsPromise ? await earningsPromise : '';

            const context = `
      Company Overview: ${results[0]}
      Industry Analysis: ${results[1]}
      Industry Pain Points: ${results[2]}
      Competitors: ${results[3]}
      Competitive Advantage: ${results[4]}
      Moat: ${results[5]}
      Recent Developments: ${results[6]}
      Earnings Call Summary: ${earningsResult}
      `;

            await streamSection('investmentConclusion', {
                ...streamPayload,
                data: companyData,
                prevContext: context
            });

            // 更新报告生成时间
            setReportData(prev => prev ? { ...prev, reportGeneratedAt: new Date().toISOString() } : prev);

        } catch (err: any) {
            console.error(err);
            setError(err.message || '网络错误，请检查连接后重试');
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setReportData(null);
        setLoading(false);
        setError('');
        setFromCache(false);
    }, []);

    // 强制重新生成报告
    const regenerate = useCallback(async (symbol: string, market: MarketType) => {
        // 先删除缓存
        try {
            await fetch(`/api/cache?symbol=${encodeURIComponent(symbol)}&market=${market}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.error('删除缓存失败:', error);
        }
        // 强制刷新重新分析
        await analyze(symbol, market, true);
    }, [analyze]);

    return {
        loading,
        aiLoading,
        reportData,
        error,
        loadingStep,
        analyze,
        reset,
        setLoadingStep,
        fromCache,
        regenerate,
    };
}
