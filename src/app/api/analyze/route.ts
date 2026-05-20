import { NextRequest, NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';
import { GeminiClient } from '@/lib/gemini';
import type { SankeyData } from '@/types';
import { buildSankeyData } from '@/lib/sankey-utils';

export const maxDuration = 60; // 设置最大执行时间为60秒

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();
    
    if (!symbol) {
      return NextResponse.json({ error: '请提供股票代码' }, { status: 400 });
    }

    const fmpApiKey = process.env.FMP_API_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!fmpApiKey || !googleApiKey) {
      return NextResponse.json({ error: 'API密钥未配置' }, { status: 500 });
    }

    const fmp = new FMPClient(fmpApiKey);
    const gemini = new GeminiClient(googleApiKey);

    const upperSymbol = symbol.toUpperCase();

    // ==================== 并行获取所有数据 ====================
    
    const [
      // 基础信息
      profileData,
      peersData,
      newsData,
      // 三大财务报表
      incomeData,
      balanceSheetData,
      cashFlowData,
      // 关键指标
      keyMetricsData,
      financialRatiosData,
      financialGrowthData,
      // 估值数据
      dcfData,
      enterpriseValueData,
      // 事件日历
      earningsCalendarData,
      dividendHistoryData,
      stockSplitsData,
      // 机构与内幕
      institutionalHoldersData,
      insiderTradingData,
    ] = await Promise.all([
      // 基础信息
      fmp.getProfile(upperSymbol),
      fmp.getPeers(upperSymbol),
      fmp.getNews(upperSymbol, 15),
      // 三大财务报表
      fmp.getIncomeStatement(upperSymbol, 'annual', 5),
      fmp.getBalanceSheet(upperSymbol, 'annual', 5),
      fmp.getCashFlowStatement(upperSymbol, 'annual', 5),
      // 关键指标
      fmp.getKeyMetrics(upperSymbol, 'annual', 5),
      fmp.getFinancialRatios(upperSymbol, 'annual', 5),
      fmp.getFinancialGrowth(upperSymbol, 'annual', 5),
      // 估值数据
      fmp.getDCF(upperSymbol).catch(() => []),
      fmp.getEnterpriseValue(upperSymbol, 'annual', 5).catch(() => []),
      // 事件日历
      fmp.getHistoricalEarnings(upperSymbol, 10).catch(() => []),
      fmp.getHistoricalDividends(upperSymbol).catch(() => []),
      fmp.getStockSplits(upperSymbol).catch(() => []),
      // 机构与内幕
      fmp.getInstitutionalHolders(upperSymbol).catch(() => []),
      fmp.getInsiderTrading(upperSymbol, 30).catch(() => []),
    ]);

    if (!profileData || profileData.length === 0) {
      return NextResponse.json({ error: '未找到该公司信息，请检查股票代码是否正确' }, { status: 404 });
    }

    const profile = profileData[0];
    const peers = peersData || [];

    // 尝试获取财报电话会议记录
    let transcriptData = null;
    try {
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      const targetQuarter = currentQuarter - 1 || 4;
      const targetYear = targetQuarter === 4 ? currentYear - 1 : currentYear;
      
      transcriptData = await fmp.getEarningsTranscript(
        upperSymbol,
        targetYear,
        targetQuarter
      );
    } catch (e) {
      console.log('Transcript not available');
    }

    // ==================== AI 分析 ====================
    
    const aiAnalysisRaw = await gemini.analyzeCompany(
      profile,
      incomeData,
      peers,
      transcriptData
    );

    // 解析 AI 返回的 JSON
    let aiAnalysis;
    
    // 定义默认值
    const defaultAnalysis = {
      companyOverview: profile.description || '暂无企业概况',
      industryAnalysis: `${profile.companyName} 属于 ${profile.sector} 行业，主要从事 ${profile.industry} 领域的业务。`,
      industryPainPoints: `${profile.industry} 行业面临的主要挑战包括：市场竞争加剧、技术迭代加速、监管政策变化等。企业需要持续创新以保持竞争力。`,
      competitors: peers.length > 0 ? `主要竞争对手包括: ${peers.slice(0, 5).join(', ')}` : '暂无竞争对手数据',
      competitiveAdvantage: '正在分析竞争优势...',
      moat: '正在分析企业护城河...',
      recentDevelopments: '正在获取最新动态...',
      investmentConclusion: '请结合其他信息进行综合判断。',
    };
    
    try {
      const cleanedResponse = aiAnalysisRaw
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsedAnalysis = JSON.parse(cleanedResponse);
      
      // 合并解析结果与默认值，确保每个字段都有值
      aiAnalysis = {
        companyOverview: parsedAnalysis.companyOverview?.trim() || defaultAnalysis.companyOverview,
        industryAnalysis: parsedAnalysis.industryAnalysis?.trim() || defaultAnalysis.industryAnalysis,
        industryPainPoints: parsedAnalysis.industryPainPoints?.trim() || defaultAnalysis.industryPainPoints,
        competitors: parsedAnalysis.competitors?.trim() || defaultAnalysis.competitors,
        competitiveAdvantage: parsedAnalysis.competitiveAdvantage?.trim() || defaultAnalysis.competitiveAdvantage,
        moat: parsedAnalysis.moat?.trim() || defaultAnalysis.moat,
        recentDevelopments: parsedAnalysis.recentDevelopments?.trim() || defaultAnalysis.recentDevelopments,
        investmentConclusion: parsedAnalysis.investmentConclusion?.trim() || defaultAnalysis.investmentConclusion,
      };
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      aiAnalysis = defaultAnalysis;
    }

    // 使用 AI 获取最新新闻和动态
    let searchResults = '';
    try {
      searchResults = await gemini.searchAndAnalyze(
        profile.companyName,
        upperSymbol
      );
    } catch (e) {
      console.log('AI search not available:', e);
    }

    // 如果有搜索结果，更新最新动态
    if (searchResults) {
      aiAnalysis.recentDevelopments = searchResults;
    }

    // 构建桑基图数据
    const sankeyData = buildSankeyData(incomeData[0]);

    // ==================== 返回完整数据 ====================
    
    return NextResponse.json({
      profile,
      // 三大财务报表
      incomeStatements: incomeData || [],
      balanceSheets: balanceSheetData || [],
      cashFlowStatements: cashFlowData || [],
      // 关键指标
      keyMetrics: keyMetricsData || [],
      financialRatios: financialRatiosData || [],
      financialGrowth: financialGrowthData || [],
      // 估值
      dcfValuation: dcfData && dcfData.length > 0 ? dcfData[0] : null,
      enterpriseValues: enterpriseValueData || [],
      // 事件日历
      earningsCalendar: earningsCalendarData || [],
      dividendHistory: dividendHistoryData || [],
      stockSplits: stockSplitsData || [],
      // 机构与内幕
      institutionalHolders: institutionalHoldersData || [],
      insiderTrading: insiderTradingData || [],
      // 其他
      peers,
      news: newsData || [],
      aiAnalysis,
      searchResults,
      sankeyData,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || '分析过程中发生错误，请稍后重试' },
      { status: 500 }
    );
  }
}
