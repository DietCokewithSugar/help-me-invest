import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekClient } from '@/lib/deepseek';
import { fetchReportData } from '@/lib/market-data';
import { apiErrorResponse, readJsonWithLimit, requireInternalApiKey } from '@/lib/api-security';

export const maxDuration = 60; // 设置最大执行时间为60秒
// 行情数据源在香港区域访问更稳定（见 report-data/route.ts）
export const preferredRegion = 'hkg1';
const MAX_REQUEST_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  try {
    requireInternalApiKey(request);
    const { symbol } = await readJsonWithLimit<any>(request, MAX_REQUEST_BYTES);
    
    if (!symbol) {
      return NextResponse.json({ error: '请提供股票代码' }, { status: 400 });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'API密钥未配置' }, { status: 500 });
    }

    const deepseek = new DeepSeekClient(deepseekApiKey);
    const upperSymbol = symbol.toUpperCase();

    let reportData;
    try {
      reportData = await fetchReportData({ symbol: upperSymbol });
    } catch {
      return NextResponse.json({ error: '未找到该公司信息，请检查股票代码是否正确' }, { status: 404 });
    }

    const { profile, peers, incomeStatements: incomeData } = reportData;
    const transcriptData = null;

    // ==================== AI 分析 ====================
    
    const aiAnalysisRaw = await deepseek.analyzeCompany(
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
      searchResults = await deepseek.searchAndAnalyze(
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

    return NextResponse.json({
      ...reportData,
      aiAnalysis,
      searchResults,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return apiErrorResponse(error, '分析过程中发生错误，请稍后重试');
  }
}
