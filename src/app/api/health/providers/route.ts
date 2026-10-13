import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/api-security';
import { MarketDataError, fetchReportDataTraced, normalizeSymbol, type ProviderAttempt } from '@/lib/market-data';
import { detectMarketFromSymbol, type MarketType } from '@/lib/markets';
import * as em from '@/lib/providers/eastmoney';
import * as sina from '@/lib/providers/sina';
import { probeMarketHosts, type HostProbe } from '@/lib/providers/probe';
import { yahooAvailability } from '@/lib/yahoo/client';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
// 与行情 API 同区域（见 report-data/route.ts），诊断结果才有代表性
export const preferredRegion = 'hkg1';

const VALID_MARKETS: MarketType[] = ['US', 'CN', 'HK', 'JP', 'KR', 'AU'];

/**
 * 数据源诊断：GET /api/health/providers?symbol=600519.SS[&raw=1]
 *
 * 在部署环境里实际跑一遍报告数据编排，返回每个数据源每一步的成败与耗时、
 * 各类数据的条数，以及最新一期报表的关键字段，用于确认服务器出口能访问哪些数据源。
 * raw=1 时额外返回东方财富原始字段名（A 股报表列名 / 港股科目名），用于核对字段映射，
 * 以及 hosts：直接探测东财各域名、腾讯、新浪、Frankfurter、SEC 的状态 / 耗时 / 响应开头（见 providers/probe.ts）。
 * region 为函数实际运行的 Vercel 区域（VERCEL_REGION，取不到时看 vercelId / x-vercel-id）。
 * 不含任何密钥；按 IP 限流。
 */
export async function GET(request: NextRequest) {
  try {
    enforceRateLimit(request, { key: 'health-providers', limit: 10, windowMs: 10 * 60 * 1000 });

    const params = request.nextUrl.searchParams;
    const symbolParam = (params.get('symbol') || 'AAPL').trim().slice(0, 20);
    const marketParam = (params.get('market') || '').toUpperCase() as MarketType;
    const market = VALID_MARKETS.includes(marketParam) ? marketParam : detectMarketFromSymbol(symbolParam);
    const symbol = normalizeSymbol(symbolParam, market);
    const started = Date.now();
    const wantRaw = params.get('raw') === '1';

    // 先跑直连探针：避免报告编排的并发请求触发限流后，把「限流」误判成「出口被屏蔽」
    let hosts: Record<string, HostProbe> | undefined;
    if (wantRaw) hosts = await probeMarketHosts(symbol);

    let summary: Record<string, any> | null = null;
    let attempts: ProviderAttempt[] = [];
    let error: string | null = null;
    try {
      const { data, trace } = await fetchReportDataTraced({ symbol, market });
      attempts = trace.attempts;
      const income = data.incomeStatements?.[0];
      const balance = data.balanceSheets?.[0];
      const cash = data.cashFlowStatements?.[0];
      const ttm = data.keyMetricsTTM?.[0];
      summary = {
        companyName: data.profile?.companyName,
        price: data.profile?.price,
        currency: (data.profile as any)?.currency,
        reportedCurrency: (data.profile as any)?.reportedCurrency,
        marketCap: data.profile?.marketCap,
        dataSources: data.dataSources,
        counts: {
          incomeAnnual: data.incomeStatements?.length ?? 0,
          balanceAnnual: data.balanceSheets?.length ?? 0,
          cashAnnual: data.cashFlowStatements?.length ?? 0,
          incomeQuarter: data.incomeStatementsQuarter?.length ?? 0,
          balanceQuarter: data.balanceSheetsQuarter?.length ?? 0,
          cashQuarter: data.cashFlowStatementsQuarter?.length ?? 0,
          priceBars: data.historicalPrices?.length ?? 0,
          news: data.news?.length ?? 0,
          peers: data.peers?.length ?? 0,
        },
        latestIncome: income && {
          date: income.date,
          period: income.period,
          revenue: income.revenue,
          grossProfit: income.grossProfit,
          operatingIncome: income.operatingIncome,
          netIncome: income.netIncome,
          epsdiluted: income.epsdiluted,
          weightedAverageShsOutDil: income.weightedAverageShsOutDil,
        },
        latestBalance: balance && {
          date: balance.date,
          totalAssets: balance.totalAssets,
          totalLiabilities: balance.totalLiabilities,
          totalStockholdersEquity: balance.totalStockholdersEquity,
          cashAndCashEquivalents: balance.cashAndCashEquivalents,
          totalDebt: balance.totalDebt,
        },
        latestCashFlow: cash && {
          date: cash.date,
          operatingCashFlow: cash.operatingCashFlow,
          capitalExpenditure: cash.capitalExpenditure,
          freeCashFlow: cash.freeCashFlow,
          dividendsPaid: cash.dividendsPaid,
        },
        ttm: ttm && {
          peRatioTTM: ttm.peRatioTTM,
          pbRatioTTM: ttm.pbRatioTTM,
          roeTTM: ttm.roeTTM,
          netProfitMarginTTM: ttm.netProfitMarginTTM,
        },
      };
    } catch (err: any) {
      error = err?.message || String(err);
      if (err instanceof MarketDataError) attempts = err.attempts;
    }

    let raw: Record<string, any> | undefined;
    if (wantRaw) {
      raw = {};
      try {
        if (market === 'CN') {
          const statements = await em.getCnStatements(symbol);
          raw.companyType = statements.companyType;
          raw.diag = (statements as { diag?: string }).diag ?? null;
          raw.incomeKeys = Object.keys(statements.incomeAnnual[0] ?? {});
          raw.balanceKeys = Object.keys(statements.balanceAnnual[0] ?? {});
          raw.cashKeys = Object.keys(statements.cashAnnual[0] ?? {});
        } else if (market === 'HK') {
          const bundle = await em.getHkStatements(symbol);
          const names = (rows: em.LongFormRow[]) => Array.from(new Set(rows.map((r) => `${r.STD_ITEM_CODE ?? ''} ${r.STD_ITEM_NAME}`)));
          raw.periods = bundle.periods.slice(0, 8);
          raw.incomeItems = names(bundle.income);
          raw.balanceItems = names(bundle.balance);
          raw.cashItems = names(bundle.cashflow);
        }
      } catch (err: any) {
        raw.error = err?.message || String(err);
        if (typeof err?.detail === 'string') raw.errorDetail = err.detail;
      }
      // 新浪财报科目名（兜底源的标题映射需要据此核对），与东方财富互不影响
      if (market === 'CN') {
        try {
          raw.sinaTitles = await sina.getSinaRawTitles(symbol);
        } catch (err: any) {
          raw.sinaError = `${err?.message || String(err)}${typeof err?.detail === 'string' ? ` (${err.detail})` : ''}`;
        }
      }
    }

    return NextResponse.json({
      symbol,
      market,
      ok: !!summary,
      ms: Date.now() - started,
      region: process.env.VERCEL_REGION ?? null,
      vercelId: request.headers.get('x-vercel-id'),
      error,
      yahoo: yahooAvailability(),
      // 显式列出每个字段（缺省补 null / false），便于比对 ok 与 empty
      providers: attempts.map((a) => ({
        provider: a.provider,
        step: a.step,
        ok: a.ok,
        empty: a.empty === true,
        ms: a.ms,
        error: a.error ?? null,
        detail: a.detail ?? null,
      })),
      summary,
      ...(raw ? { raw } : {}),
      ...(hosts ? { hosts } : {}),
    });
  } catch (error) {
    return apiErrorResponse(error, '诊断失败');
  }
}
