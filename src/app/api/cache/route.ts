import { NextRequest, NextResponse } from 'next/server';
import { getCachedReportV2, deleteReportCache, type ReportCacheRecord } from '@/lib/supabase';
import type { MarketType } from '@/types';

export const maxDuration = 30;

/**
 * GET /api/cache
 * 获取缓存的报告数据
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const market = (searchParams.get('market') as MarketType) || 'US';
    const language = searchParams.get('language') || 'zh';

    if (!symbol) {
      return NextResponse.json({ error: '缺少股票代码' }, { status: 400 });
    }

    const cachedReport = await getCachedReportV2(symbol, market, language);

    if (!cachedReport) {
      return NextResponse.json({ cached: false });
    }

    // 转换数据库字段名到前端使用的格式
    const aiAnalysis = {
      companyOverview: cachedReport.company_overview || '',
      industryAnalysis: cachedReport.industry_analysis || '',
      industryPainPoints: cachedReport.industry_pain_points || '',
      competitors: cachedReport.competitors || '',
      competitiveAdvantage: cachedReport.competitive_advantage || '',
      moat: cachedReport.moat || '',
      recentDevelopments: cachedReport.recent_developments || '',
      investmentConclusion: cachedReport.investment_conclusion || '',
    };

    const proAiAnalysis = {
      proBusinessModel: cachedReport.pro_business_model || '',
      proOperatingModel: cachedReport.pro_operating_model || '',
      proIndustryOutlook: cachedReport.pro_industry_outlook || '',
      proMoatAnalysis: cachedReport.pro_moat_analysis || '',
      proFinancialHealth: cachedReport.pro_financial_health || '',
      proValuation: cachedReport.pro_valuation || '',
      proInvestmentConclusion: cachedReport.pro_investment_conclusion || '',
    };

    // 检查是否有有效的 AI 分析内容
    // 必须所有核心字段都有内容才算有效缓存，避免使用流式输出中断导致的不完整数据
    const requiredStandardFields = [
      aiAnalysis.companyOverview,
      aiAnalysis.industryAnalysis,
      aiAnalysis.competitors,
      aiAnalysis.moat,
      aiAnalysis.investmentConclusion,
    ];
    const hasStandardAnalysis = requiredStandardFields.every(v => v && v.trim().length > 0);

    // 专业版同样需要所有核心字段都有内容
    const requiredProFields = [
      proAiAnalysis.proBusinessModel,
      proAiAnalysis.proFinancialHealth,
      proAiAnalysis.proValuation,
      proAiAnalysis.proInvestmentConclusion,
    ];
    const hasProAnalysis = requiredProFields.every(v => v && v.trim().length > 0);

    // 检查是否有有效的 FMP 数据
    const hasFmpData = !!(
      cachedReport.income_statements ||
      cachedReport.balance_sheets ||
      cachedReport.cash_flow_statements
    );

    return NextResponse.json({
      cached: true,
      hasStandardAnalysis,
      hasProAnalysis,
      hasFmpData,
      data: {
        aiAnalysis: hasStandardAnalysis ? aiAnalysis : null,
        proAiAnalysis: hasProAnalysis ? proAiAnalysis : null,
        earningsCallSummary: cachedReport.earnings_call_summary || '',
        // FMP 数据
        sankeyData: cachedReport.sankey_data,
        revenueTrend: cachedReport.revenue_trend,
        costStructure: cachedReport.cost_structure,
        incomeStatements: cachedReport.income_statements,
        balanceSheets: cachedReport.balance_sheets,
        cashFlowStatements: cachedReport.cash_flow_statements,
        incomeStatementsQuarter: cachedReport.income_statements_quarter,
        balanceSheetsQuarter: cachedReport.balance_sheets_quarter,
        cashFlowStatementsQuarter: cachedReport.cash_flow_statements_quarter,
        capitalReturnData: cachedReport.capital_return_data,
      },
      updatedAt: cachedReport.updated_at,
    });
  } catch (error: any) {
    console.error('获取缓存失败:', error);
    return NextResponse.json(
      { error: error.message || '获取缓存失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache
 * 删除缓存的报告数据（用于强制重新生成）
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const market = (searchParams.get('market') as MarketType) || 'US';
    const language = searchParams.get('language') || 'zh';

    if (!symbol) {
      return NextResponse.json({ error: '缺少股票代码' }, { status: 400 });
    }

    const result = await deleteReportCache(symbol, market, language);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除缓存失败:', error);
    return NextResponse.json(
      { error: error.message || '删除缓存失败' },
      { status: 500 }
    );
  }
}
