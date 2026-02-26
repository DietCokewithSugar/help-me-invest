import { NextRequest, NextResponse } from 'next/server';
import { getCachedReport, getCachedFmpData, deleteReportCache, type BeginnerReportRecord, type StandardReportRecord, type ProfessionalReportRecord } from '@/lib/supabase';
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
    const reportType = (searchParams.get('type') as 'beginner' | 'standard' | 'professional') || 'standard';

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    }

    // Fetch AI report and FMP data in parallel
    const [aiReport, fmpData] = await Promise.all([
      getCachedReport(symbol, market, reportType, language),
      getCachedFmpData(symbol, market),
    ]);

    // Check if AI report has valid content
    let hasValidAiContent = false;
    if (aiReport) {
      if (reportType === 'beginner') {
        const r = aiReport as BeginnerReportRecord;
        hasValidAiContent = !!(r.beginner_verdict && r.beginner_company_intro && r.beginner_action_plan);
      } else if (reportType === 'standard') {
        const r = aiReport as StandardReportRecord;
        hasValidAiContent = !!(r.company_overview && r.industry_analysis && r.competitors && r.moat && r.investment_conclusion);
      } else if (reportType === 'professional') {
        const r = aiReport as ProfessionalReportRecord;
        hasValidAiContent = !!(r.pro_business_model && r.pro_financial_health && r.pro_valuation && r.pro_investment_conclusion);
      }
    }

    const hasFmpData = !!(fmpData?.income_statements || fmpData?.balance_sheets);

    // Build response based on report type
    let aiAnalysis = null;
    if (hasValidAiContent && aiReport) {
      if (reportType === 'beginner') {
        const r = aiReport as BeginnerReportRecord;
        aiAnalysis = {
          beginnerVerdict: r.beginner_verdict || '',
          beginnerCompanyIntro: r.beginner_company_intro || '',
          beginnerRiskReward: r.beginner_risk_reward || '',
          beginnerActionPlan: r.beginner_action_plan || '',
        };
      } else if (reportType === 'standard') {
        const r = aiReport as StandardReportRecord;
        aiAnalysis = {
          companyOverview: r.company_overview || '',
          industryAnalysis: r.industry_analysis || '',
          industryPainPoints: r.industry_pain_points || '',
          competitors: r.competitors || '',
          competitiveAdvantage: r.competitive_advantage || '',
          moat: r.moat || '',
          recentDevelopments: r.recent_developments || '',
          investmentConclusion: r.investment_conclusion || '',
        };
      } else if (reportType === 'professional') {
        const r = aiReport as ProfessionalReportRecord;
        aiAnalysis = {
          proBusinessModel: r.pro_business_model || '',
          proOperatingModel: r.pro_operating_model || '',
          proIndustryOutlook: r.pro_industry_outlook || '',
          proMoatAnalysis: r.pro_moat_analysis || '',
          proFinancialHealth: r.pro_financial_health || '',
          proValuation: r.pro_valuation || '',
          proInvestmentConclusion: r.pro_investment_conclusion || '',
        };
      }
    }

    // Get earnings call summary from standard report if available
    let earningsCallSummary = '';
    if (reportType === 'standard' && aiReport) {
      earningsCallSummary = (aiReport as StandardReportRecord).earnings_call_summary || '';
    }

    return NextResponse.json({
      cached: true,
      hasAiContent: hasValidAiContent,
      hasFmpData,
      reportType,
      data: {
        aiAnalysis: hasValidAiContent ? aiAnalysis : null,
        earningsCallSummary,
        // FMP data
        sankeyData: fmpData?.sankey_data,
        revenueTrend: fmpData?.revenue_trend,
        costStructure: fmpData?.cost_structure,
        incomeStatements: fmpData?.income_statements,
        balanceSheets: fmpData?.balance_sheets,
        cashFlowStatements: fmpData?.cash_flow_statements,
        incomeStatementsQuarter: fmpData?.income_statements_quarter,
        balanceSheetsQuarter: fmpData?.balance_sheets_quarter,
        cashFlowStatementsQuarter: fmpData?.cash_flow_statements_quarter,
        capitalReturnData: fmpData?.capital_return_data,
      },
      updatedAt: aiReport?.updated_at || fmpData?.updated_at,
    });
  } catch (error: any) {
    console.error('获取缓存失败:', error);
    return NextResponse.json({ error: error.message || 'Cache error' }, { status: 500 });
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
    const reportType = searchParams.get('type') as 'beginner' | 'standard' | 'professional' | null;

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    }

    const result = await deleteReportCache(symbol, market, reportType || undefined, language);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除缓存失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
