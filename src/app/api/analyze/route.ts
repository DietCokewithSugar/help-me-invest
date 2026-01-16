import { NextRequest, NextResponse } from 'next/server';
import { FMPClient } from '@/lib/fmp';
import { GeminiClient } from '@/lib/gemini';
import type { SankeyData } from '@/types';

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

    // 并行获取所有数据
    const [profileData, incomeData, peersData, newsData] = await Promise.all([
      fmp.getProfile(upperSymbol),
      fmp.getIncomeStatement(upperSymbol, 'annual', 5),
      fmp.getPeers(upperSymbol),
      fmp.getNews(upperSymbol, 15),
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

    // AI 分析
    const aiAnalysisRaw = await gemini.analyzeCompany(
      profile,
      incomeData,
      peers,
      transcriptData
    );

    // 解析 AI 返回的 JSON
    let aiAnalysis;
    try {
      // 清理可能的 markdown 代码块
      const cleanedResponse = aiAnalysisRaw
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      aiAnalysis = JSON.parse(cleanedResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // 如果解析失败，创建一个默认结构
      aiAnalysis = {
        companyOverview: profile.description || '暂无企业概况',
        industryAnalysis: `${profile.companyName} 属于 ${profile.sector} 行业，主要从事 ${profile.industry} 领域的业务。`,
        industryPainPoints: '正在分析行业痛点...',
        competitors: peers.length > 0 ? `主要竞争对手包括: ${peers.slice(0, 5).join(', ')}` : '暂无竞争对手数据',
        competitiveAdvantage: '正在分析竞争优势...',
        moat: '正在分析企业护城河...',
        recentDevelopments: '正在获取最新动态...',
        investmentConclusion: '请结合其他信息进行综合判断。',
      };
    }

    // 使用 Google Search 获取最新新闻和动态
    let searchResults = '';
    try {
      searchResults = await gemini.searchAndAnalyze(
        profile.companyName,
        upperSymbol
      );
    } catch (e) {
      console.log('Google Search not available:', e);
    }

    // 如果有搜索结果，更新最新动态
    if (searchResults) {
      aiAnalysis.recentDevelopments = searchResults;
    }

    // 构建桑基图数据
    const sankeyData = buildSankeyData(incomeData[0]);

    return NextResponse.json({
      profile,
      incomeStatements: incomeData,
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

function buildSankeyData(income: any): SankeyData {
  if (!income) return { nodes: [], links: [] };

  const revenue = income.revenue || 0;
  const costOfRevenue = income.costOfRevenue || 0;
  const grossProfit = income.grossProfit || 0;
  const rdExpenses = income.researchAndDevelopmentExpenses || 0;
  const sgaExpenses = income.sellingGeneralAndAdministrativeExpenses || 0;
  const operatingIncome = income.operatingIncome || 0;
  const netIncome = income.netIncome || 0;
  const incomeTax = income.incomeTaxExpense || 0;

  const nodes = [
    { name: '总营收' },
    { name: '营业成本' },
    { name: '毛利润' },
    { name: '研发费用' },
    { name: '销售及管理费用' },
    { name: '营业利润' },
    { name: '税费及其他' },
    { name: '净利润' },
  ];

  const links = [
    { source: '总营收', target: '营业成本', value: costOfRevenue },
    { source: '总营收', target: '毛利润', value: grossProfit },
    { source: '毛利润', target: '研发费用', value: rdExpenses },
    { source: '毛利润', target: '销售及管理费用', value: sgaExpenses },
    { source: '毛利润', target: '营业利润', value: Math.max(0, operatingIncome) },
    { source: '营业利润', target: '税费及其他', value: Math.max(0, operatingIncome - netIncome) },
    { source: '营业利润', target: '净利润', value: Math.max(0, netIncome) },
  ].filter(link => link.value > 0);

  return { nodes, links };
}
