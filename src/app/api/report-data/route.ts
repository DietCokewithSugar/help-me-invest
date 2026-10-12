import { NextRequest, NextResponse } from 'next/server';
import { fetchReportData } from '@/lib/market-data';
import { saveFmpDataToCache, getCachedReportV2 } from '@/lib/supabase';
import type { MarketType } from '@/lib/markets';

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
      message: '网络连接失败，行情数据源暂时无法访问，请稍后重试。',
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
      message: '行情数据源暂时不可用，请稍后重试。',
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

    const marketType = (market as MarketType) || 'US';
    const upperSymbol = symbol.toUpperCase().trim();

    // 检查是否可以使用缓存的报表数据
    if (useCache) {
      const cachedReport = await getCachedReportV2(upperSymbol, marketType);
      if (cachedReport && cachedReport.income_statements) {
        console.log(`使用缓存的报表数据: ${upperSymbol}`);
        // 返回缓存的数据（需要从数据库获取 profile 等基础信息）
        // 注意：profile 不在缓存中，仍需从 API 获取
      }
    }

    const reportData = await fetchReportData({
      symbol,
      market: market as MarketType | undefined,
      period: period as 'annual' | 'quarter' | undefined
    });

    // 异步保存报表数据到缓存（不阻塞响应）
    const saveFmpDataAsync = async () => {
      try {
        // 构建成本结构数据
        const costStructure = reportData.incomeStatements?.slice(0, 5).map((stmt: any) => ({
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
        const revenueTrend = reportData.incomeStatements?.slice(0, 10).map((stmt: any) => ({
          date: stmt.date,
          calendarYear: stmt.calendarYear,
          period: stmt.period,
          revenue: stmt.revenue,
          netIncome: stmt.netIncome,
          grossProfit: stmt.grossProfit,
        })) || [];

        // 构建资本与回报数据（用于专业版）
        const latestMetrics = reportData.keyMetrics?.[0];
        const latestMetricsTTM = reportData.keyMetricsTTM?.[0];
        const latestRatios = reportData.financialRatios?.[0];
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
          sankeyData: reportData.sankeyData,
          revenueTrend,
          costStructure,
          incomeStatements: reportData.incomeStatements?.slice(0, 5),
          balanceSheets: reportData.balanceSheets?.slice(0, 5),
          cashFlowStatements: reportData.cashFlowStatements?.slice(0, 5),
          incomeStatementsQuarter: reportData.incomeStatementsQuarter?.slice(0, 8),
          balanceSheetsQuarter: reportData.balanceSheetsQuarter?.slice(0, 8),
          cashFlowStatementsQuarter: reportData.cashFlowStatementsQuarter?.slice(0, 8),
          capitalReturnData,
        });
        console.log(`报表数据已保存到缓存: ${upperSymbol}`);
      } catch (err) {
        console.error('保存报表数据到缓存失败:', err);
      }
    };

    // 异步保存，不阻塞响应
    saveFmpDataAsync();

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error('Report data error:', error);

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
