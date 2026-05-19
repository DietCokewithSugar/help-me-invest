'use client';

import { useState, useCallback, useRef } from 'react';
import type { ReportData, MarketType } from '@/types';
import { detectMarketFromSymbol, formatSymbolForMarket } from '@/lib/markets';

export type ReportType = 'beginner' | 'standard' | 'pro';
export type ReportVersion = 'beginner' | 'standard' | 'professional';

interface Translations {
  home: {
    errors: {
      nonJsonResponse: string;
      timeout: string;
      analysisFailed: string;
      networkError: string;
    };
  };
}

interface UseCompanyReportOptions {
  locale: 'zh' | 'en';
  t: Translations;
}

/**
 * Encapsulates the full report generation flow that previously lived inline
 * in `src/app/page.tsx`. Now used by `/companies/[ticker]` page.
 *
 * It manages FMP fetching, cache hit-or-miss, per-section streaming for the
 * three report tiers (beginner/standard/professional), and exposes high-level
 * `analyze` / `regenerate` / `changeVersion` methods.
 */
export function useCompanyReport({ locale, t }: UseCompanyReportOptions) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetryable, setIsRetryable] = useState(false);

  const reportTypeRef = useRef<ReportType>('standard');
  const marketRef = useRef<MarketType>('US');

  // Streaming helper - per-section streaming from /api/ai/stream-section.
  // Chunks are coalesced via requestAnimationFrame so React renders at most
  // once per frame (~60fps) instead of on every byte from the network —
  // dramatically cuts layout thrash when 6-7 sections stream in parallel.
  const streamSection = useCallback(
    async (section: string, payload: any, symbol?: string) => {
      try {
        const response = await fetch('/api/ai/stream-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, symbol, language: locale, ...payload }),
        });

        if (!response.body) return '';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let text = '';
        let pendingFrame = 0;
        let lastFlushed = '';

        const flush = () => {
          pendingFrame = 0;
          if (text === lastFlushed) return;
          lastFlushed = text;
          const snapshot = text;
          setReportData((prev) => {
            if (!prev) return prev;

            if (section === 'earningsCallSummary') {
              return { ...prev, earningsCallSummary: snapshot };
            }

            const beginnerSections = [
              'beginnerVerdict',
              'beginnerCompanyIntro',
              'beginnerRiskReward',
              'beginnerActionPlan',
            ];
            if (beginnerSections.includes(section)) {
              return {
                ...prev,
                beginnerAiAnalysis: {
                  ...(prev.beginnerAiAnalysis || ({} as any)),
                  [section]: snapshot,
                } as any,
              };
            }

            const proSections = [
              'proBusinessModel',
              'proOperatingModel',
              'proIndustryOutlook',
              'proMoatAnalysis',
              'proFinancialHealth',
              'proValuation',
              'proInvestmentConclusion',
            ];
            if (proSections.includes(section)) {
              return {
                ...prev,
                proAiAnalysis: {
                  ...(prev.proAiAnalysis || ({} as any)),
                  [section]: snapshot,
                } as any,
              };
            }

            return {
              ...prev,
              aiAnalysis: {
                ...(prev.aiAnalysis || ({} as any)),
                [section]: snapshot,
              } as any,
            };
          });
        };

        const scheduleFlush = () => {
          if (pendingFrame) return;
          if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
            flush();
            return;
          }
          pendingFrame = window.requestAnimationFrame(flush);
        };

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value, { stream: !done });
          text += chunkValue;
          scheduleFlush();
        }
        // Final flush so the last bytes always make it in.
        if (pendingFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(pendingFrame);
          pendingFrame = 0;
        }
        flush();
        return text;
      } catch (err) {
        console.error(`Stream error for ${section}:`, err);
        return '';
      }
    },
    [locale]
  );

  const checkCache = useCallback(
    async (symbol: string, market: MarketType, reportType: string = 'standard') => {
      try {
        const response = await fetch(
          `/api/cache?symbol=${encodeURIComponent(symbol)}&market=${market}&language=${locale}&type=${reportType}`
        );
        if (!response.ok) return null;
        return await response.json();
      } catch (err) {
        console.error('检查缓存失败:', err);
        return null;
      }
    },
    [locale]
  );

  const recordSearchToDb = useCallback(
    async (sym: string, companyName?: string, isInvalid?: boolean) => {
      try {
        await fetch('/api/search-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: sym,
            companyName,
            action: isInvalid ? 'invalidate' : 'record',
          }),
        });
      } catch (e) {
        console.log('记录搜索失败:', e);
      }
    },
    []
  );

  const generateReportForVersion = useCallback(
    async (version: ReportVersion, existingReportData: ReportData) => {
      const companyData = existingReportData.profile;
      const formattedSymbol = companyData.symbol;
      const market = existingReportData.market || marketRef.current;
      const peers = existingReportData.peers || [];

      const cacheType = version === 'professional' ? 'professional' : version;
      try {
        const cacheResponse = await fetch(
          `/api/cache?symbol=${encodeURIComponent(formattedSymbol)}&market=${market}&language=${locale}&type=${cacheType}`
        );
        if (cacheResponse.ok) {
          const cacheData = await cacheResponse.json();
          if (cacheData.hasAiContent && cacheData.data?.aiAnalysis) {
            if (version === 'beginner') {
              setReportData((prev) =>
                prev ? { ...prev, beginnerAiAnalysis: cacheData.data.aiAnalysis } : prev
              );
            } else if (version === 'standard') {
              setReportData((prev) =>
                prev
                  ? {
                      ...prev,
                      aiAnalysis: cacheData.data.aiAnalysis,
                      earningsCallSummary:
                        cacheData.data.earningsCallSummary || prev.earningsCallSummary || '',
                    }
                  : prev
              );
            } else {
              setReportData((prev) =>
                prev ? { ...prev, proAiAnalysis: cacheData.data.aiAnalysis } : prev
              );
            }
            return;
          }
        }
      } catch (e) {
        console.error('Cache check failed:', e);
      }

      if (version === 'beginner') {
        setReportData((prev) =>
          prev
            ? {
                ...prev,
                beginnerAiAnalysis: {
                  beginnerVerdict: '',
                  beginnerCompanyIntro: '',
                  beginnerRiskReward: '',
                  beginnerActionPlan: '',
                },
              }
            : prev
        );

        const tasks: Promise<string>[] = [];
        tasks.push(
          streamSection(
            'beginnerVerdict',
            {
              data: { ...companyData, incomeStatements: existingReportData.incomeStatements },
              market,
            },
            formattedSymbol
          )
        );
        tasks.push(streamSection('beginnerCompanyIntro', { data: companyData, market }, formattedSymbol));
        tasks.push(streamSection('beginnerRiskReward', { data: companyData, market }, formattedSymbol));
        const results = await Promise.all(tasks);
        const context = `Verdict: ${results[0]}\nCompany Intro: ${results[1]}\nRisk/Reward: ${results[2]}`;
        await streamSection(
          'beginnerActionPlan',
          { data: companyData, prevContext: context, market },
          formattedSymbol
        );
      } else if (version === 'standard') {
        setReportData((prev) =>
          prev
            ? {
                ...prev,
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
              }
            : prev
        );

        const tasks: Promise<string>[] = [];
        tasks.push(streamSection('companyOverview', { data: companyData, market }, formattedSymbol));
        tasks.push(streamSection('industryAnalysis', { data: companyData, market }, formattedSymbol));
        tasks.push(streamSection('industryPainPoints', { data: companyData, market }, formattedSymbol));
        tasks.push(streamSection('competitors', { data: { ...companyData, peers }, market }, formattedSymbol));
        tasks.push(streamSection('competitiveAdvantage', { data: companyData, market }, formattedSymbol));
        tasks.push(streamSection('moat', { data: companyData, market }, formattedSymbol));
        tasks.push(
          streamSection(
            'recentDevelopments',
            { data: { companyName: companyData.companyName, symbol: formattedSymbol }, market },
            formattedSymbol
          )
        );

        const transcript = existingReportData.earningsTranscripts?.[0];
        let earningsPromise: Promise<string> | null = null;
        if (transcript && companyData.companyName) {
          const transcriptText =
            (transcript as any).content || (transcript as any).transcript || (transcript as any).text || '';
          if (transcriptText) {
            earningsPromise = streamSection(
              'earningsCallSummary',
              {
                data: {
                  transcript: transcriptText,
                  companyName: companyData.companyName,
                  symbol: formattedSymbol,
                },
                market,
              },
              formattedSymbol
            );
          }
        }

        const results = await Promise.all(tasks);
        const earningsResult = earningsPromise ? await earningsPromise : '';

        const context = `Company Overview: ${results[0]}\nIndustry Analysis: ${results[1]}\nIndustry Pain Points: ${results[2]}\nCompetitors: ${results[3]}\nCompetitive Advantage: ${results[4]}\nMoat: ${results[5]}\nRecent Developments: ${results[6]}\nEarnings Call Summary: ${earningsResult}`;
        await streamSection(
          'investmentConclusion',
          { data: companyData, prevContext: context, market },
          formattedSymbol
        );
      } else if (version === 'professional') {
        setReportData((prev) =>
          prev
            ? {
                ...prev,
                proAiAnalysis: {
                  proBusinessModel: '',
                  proOperatingModel: '',
                  proIndustryOutlook: '',
                  proMoatAnalysis: '',
                  proFinancialHealth: '',
                  proValuation: '',
                  proInvestmentConclusion: '',
                },
              }
            : prev
        );

        const latestMetrics = existingReportData.keyMetrics?.[0] || {};
        const latestMetricsTTM = existingReportData.keyMetricsTTM?.[0] || {};
        const latestBalance: any = existingReportData.balanceSheets?.[0] || {};
        const latestRatios = existingReportData.financialRatios?.[0] || {};
        const latestRatiosTTM = existingReportData.financialRatiosTTM?.[0] || {};
        const latestGrowth: any = existingReportData.financialGrowth?.[0] || {};

        const annualFinancials =
          existingReportData.incomeStatements?.slice(0, 5).map((stmt: any, idx: number) => {
            const balance: any = existingReportData.balanceSheets?.[idx] || {};
            const cashFlow: any = existingReportData.cashFlowStatements?.[idx] || {};
            const metrics: any = existingReportData.keyMetrics?.[idx] || {};
            const ratios: any = existingReportData.financialRatios?.[idx] || {};
            return {
              period: stmt.calendarYear || stmt.date?.split('-')[0] || `Y${idx + 1}`,
              revenue: stmt.revenue,
              netIncome: stmt.netIncome,
              grossProfit: stmt.grossProfit,
              operatingIncome: stmt.operatingIncome,
              ebitda: stmt.ebitda,
              grossProfitMargin: ratios.grossProfitMargin || stmt.grossProfitRatio,
              netProfitMargin: ratios.netProfitMargin || stmt.netIncomeRatio,
              totalAssets: balance.totalAssets,
              totalLiabilities: balance.totalLiabilities,
              freeCashFlow: cashFlow.freeCashFlow,
              roe: ratios.returnOnEquity || metrics.roe,
            };
          }) || [];

        const quarterlyFinancials =
          existingReportData.incomeStatementsQuarter?.slice(0, 5).map((stmt: any, idx: number) => {
            const balance: any = existingReportData.balanceSheetsQuarter?.[idx] || {};
            return {
              period: stmt.date || `Q${idx + 1}`,
              revenue: stmt.revenue,
              netIncome: stmt.netIncome,
              grossProfitMargin: stmt.grossProfitRatio,
              netProfitMargin: stmt.netIncomeRatio,
              totalAssets: balance.totalAssets,
              totalLiabilities: balance.totalLiabilities,
            };
          }) || [];

        const profitabilityData = {
          grossProfitMargin: (latestRatios as any).grossProfitMargin || (latestRatiosTTM as any)?.grossProfitMargin,
          netProfitMargin: (latestRatios as any).netProfitMargin || (latestRatiosTTM as any)?.netProfitMargin,
          roe: (latestRatios as any).returnOnEquity || (latestMetrics as any).roe,
          roic: (latestMetrics as any).roic || (latestMetricsTTM as any)?.roic,
          incomeQuality: (latestMetrics as any).incomeQuality || (latestMetricsTTM as any)?.incomeQuality,
        };
        const capitalReturnData = {
          rdToRevenue:
            (latestMetrics as any).researchAndDdevelopementToRevenue ||
            (latestMetricsTTM as any)?.researchAndDdevelopementToRevenue,
        };
        const debtData = {
          workingCapital:
            (latestMetrics as any).workingCapital || existingReportData.financialScores?.workingCapital,
          totalLiabilities:
            latestBalance.totalLiabilities || existingReportData.financialScores?.totalLiabilities,
          debtToEquity: (latestRatios as any).debtEquityRatio || (latestMetrics as any).debtToEquity,
          currentRatio: (latestRatios as any).currentRatio || (latestMetrics as any).currentRatio,
        };
        const healthScores = {
          altmanZScore: existingReportData.financialScores?.altmanZScore,
          piotroskiScore: existingReportData.financialScores?.piotroskiScore,
        };
        const valuationData = {
          peRatio:
            (latestMetrics as any).peRatio ||
            (latestRatios as any).priceEarningsRatio ||
            (latestMetricsTTM as any)?.peRatio,
          pbRatio:
            (latestMetrics as any).pbRatio ||
            (latestRatios as any).priceToBookRatio ||
            (latestMetricsTTM as any)?.pbRatio,
          psRatio:
            (latestMetrics as any).priceToSalesRatio || (latestRatios as any).priceToSalesRatio,
          evToEbitda:
            (latestMetrics as any).enterpriseValueOverEBITDA ||
            (latestMetricsTTM as any)?.enterpriseValueOverEBITDA,
          grahamNumber: (latestMetrics as any).grahamNumber || (latestMetricsTTM as any)?.grahamNumber,
          earningsYield: (latestMetrics as any).earningsYield || (latestMetricsTTM as any)?.earningsYield,
          freeCashFlowYield:
            (latestMetrics as any).freeCashFlowYield || (latestMetricsTTM as any)?.freeCashFlowYield,
        };
        const growthData = {
          revenueGrowth: latestGrowth.revenueGrowth,
          netIncomeGrowth: latestGrowth.netIncomeGrowth,
          threeYRevenueGrowth: latestGrowth.threeYRevenueGrowthPerShare,
          fiveYRevenueGrowth: latestGrowth.fiveYRevenueGrowthPerShare,
        };

        const proTasks: Promise<string>[] = [];
        proTasks.push(streamSection('proBusinessModel', { data: companyData, market }, formattedSymbol));
        proTasks.push(streamSection('proOperatingModel', { data: companyData, market }, formattedSymbol));
        proTasks.push(streamSection('proIndustryOutlook', { data: companyData, market }, formattedSymbol));
        proTasks.push(
          streamSection(
            'proMoatAnalysis',
            { data: { ...companyData, profitabilityData, capitalReturnData }, market },
            formattedSymbol
          )
        );
        proTasks.push(
          streamSection(
            'proFinancialHealth',
            {
              data: {
                ...companyData,
                annualFinancials,
                quarterlyFinancials,
                profitabilityData,
                debtData,
                healthScores,
              },
              market,
            },
            formattedSymbol
          )
        );
        proTasks.push(
          streamSection(
            'proValuation',
            { data: { ...companyData, valuationData, growthData, quarterlyFinancials }, market },
            formattedSymbol
          )
        );

        const proResults = await Promise.all(proTasks);
        const proContext = proResults.map((r, i) => `Section ${i + 1}: ${r}`).join('\n');
        await streamSection(
          'proInvestmentConclusion',
          { data: companyData, market, prevContext: proContext },
          formattedSymbol
        );
      }
    },
    [locale, streamSection]
  );

  const analyze = useCallback(
    async (rawSymbol: string, opts?: { reportType?: ReportType; force?: boolean }) => {
      const reportType: ReportType = opts?.reportType || reportTypeRef.current || 'standard';
      reportTypeRef.current = reportType;

      const trimmedSymbol = rawSymbol.trim().toUpperCase();
      if (!trimmedSymbol) {
        return;
      }

      const marketForAnalyze = detectMarketFromSymbol(trimmedSymbol);
      const formattedSymbol = formatSymbolForMarket(trimmedSymbol, marketForAnalyze);
      marketRef.current = marketForAnalyze;

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
        } catch {
          throw new Error(t.home.errors.nonJsonResponse);
        }
      };

      const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 90000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            throw new Error(t.home.errors.timeout);
          }
          throw err;
        }
      };

      try {
        const cachedData = opts?.force
          ? null
          : await checkCache(
              formattedSymbol,
              marketForAnalyze,
              reportType === 'pro' ? 'professional' : reportType
            );
        const useCachedAI = cachedData?.cached && cachedData?.hasAiContent;

        const response = await fetchWithTimeout(
          '/api/fmp',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: formattedSymbol,
              market: marketForAnalyze,
              period: 'annual',
              language: locale,
            }),
          },
          90000
        );
        const data = await parseJsonResponse(response);

        if (!response.ok) {
          const errorMsg = data?.error || t.home.errors.analysisFailed;
          const retryable = data?.retryable ?? true;
          setIsRetryable(retryable);
          if (errorMsg.includes('找不到') || errorMsg.includes('not found') || errorMsg.includes('无效')) {
            recordSearchToDb(formattedSymbol, undefined, true);
            setIsRetryable(false);
          }
          throw new Error(errorMsg);
        }
        setRetryCount(0);
        setIsRetryable(false);

        recordSearchToDb(formattedSymbol, data?.profile?.companyName);

        if (useCachedAI && cachedData?.data?.aiAnalysis) {
          const cachedReportType = cachedData.reportType || 'standard';
          const cachedUpdate: Record<string, any> = {
            ...data,
            earningsCallSummary: cachedData.data.earningsCallSummary || '',
            reportGeneratedAt: cachedData.updatedAt,
          };
          if (cachedReportType === 'beginner') {
            cachedUpdate.beginnerAiAnalysis = cachedData.data.aiAnalysis;
          } else if (cachedReportType === 'professional') {
            cachedUpdate.proAiAnalysis = cachedData.data.aiAnalysis;
          } else {
            cachedUpdate.aiAnalysis = cachedData.data.aiAnalysis;
          }
          setReportData(cachedUpdate as ReportData);
          setLoading(false);
          return;
        }

        const initialData: ReportData = { ...data, earningsCallSummary: '' };
        setReportData(initialData);
        setLoading(false);

        const versionToGenerate: ReportVersion =
          reportType === 'pro' ? 'professional' : (reportType as 'beginner' | 'standard');
        await generateReportForVersion(versionToGenerate, initialData);

        setReportData((prev) =>
          prev ? { ...prev, reportGeneratedAt: new Date().toISOString() } : prev
        );
      } catch (err: any) {
        console.error(err);
        setRetryCount((prev) => prev + 1);
        setError(err.message || t.home.errors.networkError);
        setIsRetryable(true);
        setLoading(false);
      }
    },
    [checkCache, generateReportForVersion, locale, recordSearchToDb, t]
  );

  const changeVersion = useCallback(
    async (newVersion: ReportVersion) => {
      const data = reportData;
      if (!data) return;
      reportTypeRef.current = newVersion === 'professional' ? 'pro' : newVersion;
      await generateReportForVersion(newVersion, data);
    },
    [generateReportForVersion, reportData]
  );

  const regenerate = useCallback(async () => {
    if (!reportData) return;
    const symbolToRegenerate = reportData.profile.symbol;
    const market =
      reportData.market ||
      ((reportData.profile as any)?.market as MarketType | undefined) ||
      detectMarketFromSymbol(symbolToRegenerate);
    const cacheType = reportTypeRef.current === 'pro' ? 'professional' : reportTypeRef.current;

    try {
      await fetch(
        `/api/cache?symbol=${encodeURIComponent(symbolToRegenerate)}&market=${market}&language=${locale}&type=${cacheType}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      console.error('删除缓存失败:', e);
    }

    setReportData(null);
    await analyze(symbolToRegenerate, { force: true, reportType: reportTypeRef.current });
  }, [analyze, locale, reportData]);

  return {
    loading,
    aiLoading,
    aiError,
    error,
    reportData,
    loadingStep,
    setLoadingStep,
    retryCount,
    isRetryable,
    analyze,
    changeVersion,
    regenerate,
    setReportData,
    setError,
  };
}
