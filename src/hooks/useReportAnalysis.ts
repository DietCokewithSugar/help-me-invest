import { useState, useRef, useCallback } from 'react';
import type { ReportData, MarketType } from '@/types';
import { formatSymbolForMarket } from '@/lib/markets';

export function useReportAnalysis() {
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loadingStep, setLoadingStep] = useState(0);

    // Streaming helper
    const streamSection = async (section: string, payload: any) => {
        try {
            const response = await fetch('/api/ai/stream-section', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, ...payload }),
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

    const analyze = useCallback(async (symbol: string, market: MarketType) => {
        const formattedSymbol = formatSymbolForMarket(symbol, market);

        setLoading(true);
        setAiLoading(false);
        setAiError('');
        setError('');
        setReportData(null);
        setLoadingStep(0);

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
            // 1. Fetch Basic FMP Data
            const response = await fetchWithTimeout('/api/fmp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: formattedSymbol,
                    market: market,
                    period: 'annual'
                }),
            }, 90000);
            const data = await parseJsonResponse(response);

            if (!response.ok) {
                throw new Error(data?.error || '分析失败，请稍后重试');
            }

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

            tasks.push(streamSection('companyOverview', { data: companyData, market }));
            tasks.push(streamSection('industryAnalysis', { data: companyData, market }));
            tasks.push(streamSection('industryPainPoints', { data: companyData, market }));
            tasks.push(streamSection('competitors', { data: { ...companyData, peers }, market }));
            tasks.push(streamSection('competitiveAdvantage', { data: companyData, market }));
            tasks.push(streamSection('moat', { data: companyData, market }));
            tasks.push(streamSection('recentDevelopments', { data: { companyName: companyData.companyName, symbol: formattedSymbol }, market }));

            const transcript = data.earningsTranscripts?.[0];
            let earningsPromise: Promise<string> | null = null;
            if (transcript && companyData.companyName) {
                const transcriptText = transcript.content || transcript.transcript || transcript.text || '';
                if (transcriptText) {
                    earningsPromise = streamSection('earningsCallSummary', {
                        data: {
                            transcript: transcriptText,
                            companyName: companyData.companyName,
                            symbol: formattedSymbol
                        },
                        market
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
                data: companyData,
                market,
                prevContext: context
            });

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
    }, []);

    return {
        loading,
        aiLoading,
        reportData,
        error,
        loadingStep,
        analyze,
        reset,
        setLoadingStep
    };
}
