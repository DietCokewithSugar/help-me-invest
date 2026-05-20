import { NextRequest, NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';
import { fetchFmpReportData } from '@/lib/fmp-data';
import { saveFmpDataToCache, getCachedReportV2 } from '@/lib/supabase';
import { buildSankeyData } from '@/lib/sankey-utils';
import { MARKET_CONFIGS, type MarketType } from '@/lib/markets';

export const maxDuration = 60;

// 错误类型枚举
type ErrorType = 'timeout' | 'network' | 'rate_limit' | 'api_error' | 'validation' | 'unknown';

// 识别错误类型
function classifyError(error: any): { type: ErrorType; message: string; retryable: boolean } {
  const errorMessage = error.message || '';
  const errorCode = error.cause?.code || '';
  const status = error.status;

  // 超时错误
  if (error.name === 'AbortError' || errorCode === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
    return {
      type: 'timeout',
      message: '请求超时，服务器响应时间过长。请稍后重试。',
      retryable: true,
    };
  }

  // 网络连接错误
  const networkCodes = ['UND_ERR_CONNECT_TIMEOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH'];
  if (networkCodes.includes(errorCode) || errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
    return {
      type: 'network',
      message: '网络连接失败。如果您在中国大陆，可能需要使用 VPN 访问 FMP API。',
      retryable: true,
    };
  }

  // 速率限制
  if (status === 429) {
    return {
      type: 'rate_limit',
      message: 'API 请求过于频繁，请稍等片刻后重试。',
      retryable: true,
    };
  }

  // 服务不可用
  if (status === 503 || status === 502 || status === 504) {
    return {
      type: 'network',
      message: 'FMP 服务暂时不可用，请稍后重试。',
      retryable: true,
    };
  }

  // API 错误（4xx）
  if (status >= 400 && status < 500) {
    return {
      type: 'api_error',
      message: errorMessage || '请求参数错误或资源未找到。',
      retryable: false,
    };
  }

  // 未知错误
  return {
    type: 'unknown',
    message: errorMessage || '发生未知错误，请稍后重试。',
    retryable: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, market, period, useCache } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        {
          error: '请提供股票代码',
          errorType: 'validation' as ErrorType,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const marketType: MarketType = typeof market === 'string' && market in MARKET_CONFIGS ? (market as MarketType) : 'US';
    const upperSymbol = symbol.toUpperCase().trim();

    // 检查是否可以使用缓存的 FMP 数据
    if (useCache) {
      const cachedReport = await getCachedReportV2(upperSymbol, marketType);
      if (cachedReport && cachedReport.income_statements) {
        console.log(`使用缓存的 FMP 数据: ${upperSymbol}`);
        // 返回缓存的数据（需要从数据库获取 profile 等基础信息）
        // 注意：profile 不在缓存中，仍需从 API 获取
      }
    }

    const fmpApiKey = process.env.FMP_API_KEY;
    if (!fmpApiKey) {
      return NextResponse.json(
        {
          error: 'FMP API 密钥未配置',
          errorType: 'api_error' as ErrorType,
          retryable: false,
        },
        { status: 500 }
      );
    }

    const fmp = new FMPClient(fmpApiKey);
    const fmpData = await fetchFmpReportData(fmp, {
      symbol,
      market: marketType,
      period: period as 'annual' | 'quarter' | undefined
    });

    // 异步保存 FMP 数据到缓存（不阻塞响应）
    const saveFmpDataAsync = async () => {
      try {
        // 构建成本结构数据
        const costStructure = fmpData.incomeStatements?.slice(0, 5).map((stmt: any) => ({
          date: stmt.date,
          calendarYear: stmt.calendarYear,
          revenue: stmt.revenue,
          costOfRevenue: stmt.costOfRevenue,
          grossProfit: stmt.grossProfit,
          operatingExpenses: stmt.operatingExpenses,
          operatingIncome: stmt.operatingIncome,
          netIncome: stmt.netIncome,
        })) || [];

        // 构建营收趋势数据
        const revenueTrend = fmpData.incomeStatements?.slice(0, 10).map((stmt: any) => ({
          date: stmt.date,
          calendarYear: stmt.calendarYear,
          period: stmt.period,
          revenue: stmt.revenue,
          netIncome: stmt.netIncome,
          grossProfit: stmt.grossProfit,
        })) || [];

        // 构建资本与回报数据（用于专业版）
        const latestMetrics = fmpData.keyMetrics?.[0];
        const latestMetricsTTM = fmpData.keyMetricsTTM?.[0];
        const latestRatios = fmpData.financialRatios?.[0];
        const capitalReturnData = {
          // 资本结构
          researchAndDevelopementToRevenue: latestMetricsTTM?.researchAndDevelopementToRevenueTTM || latestMetrics?.researchAndDdevelopementToRevenue,
          capexToRevenue: latestMetricsTTM?.capexToRevenueTTM || latestMetrics?.capexToRevenue,
          stockBasedCompensationToRevenue: latestMetricsTTM?.stockBasedCompensationToRevenueTTM || latestMetrics?.stockBasedCompensationToRevenue,
          // 股东回报
          dividendYield: latestRatios?.dividendYield,
          payoutRatio: latestMetrics?.payoutRatio,
          freeCashFlowPerShare: latestMetrics?.freeCashFlowPerShare,
        };

        await saveFmpDataToCache(upperSymbol, marketType, {
          sankeyData: fmpData.sankeyData,
          revenueTrend,
          costStructure,
          incomeStatements: fmpData.incomeStatements?.slice(0, 5),
          balanceSheets: fmpData.balanceSheets?.slice(0, 5),
          cashFlowStatements: fmpData.cashFlowStatements?.slice(0, 5),
          incomeStatementsQuarter: fmpData.incomeStatementsQuarter?.slice(0, 8),
          balanceSheetsQuarter: fmpData.balanceSheetsQuarter?.slice(0, 8),
          cashFlowStatementsQuarter: fmpData.cashFlowStatementsQuarter?.slice(0, 8),
          capitalReturnData,
        });
        console.log(`FMP 数据已保存到缓存: ${upperSymbol}`);
      } catch (err) {
        console.error('保存 FMP 数据到缓存失败:', err);
      }
    };

    // 异步保存，不阻塞响应
    saveFmpDataAsync();

    return NextResponse.json(fmpData);
  } catch (error: any) {
    console.error('FMP data error:', error);

    const { type, message, retryable } = classifyError(error);

    return NextResponse.json(
      {
        error: message,
        errorType: type,
        retryable,
        // 仅在开发环境显示详细错误
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          stack: error.stack?.split('\n').slice(0, 5),
        }),
      },
      { status: 500 }
    );
  }
}
