import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import type { MarketType } from '@/lib/markets';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { symbol, profile, incomeStatements, peers, earningsTranscripts, market } = await request.json();

    if (!symbol || !profile) {
      return NextResponse.json({ error: '缺少必要的公司信息' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API 密钥未配置' }, { status: 500 });
    }

    const gemini = new GeminiClient(googleApiKey);
    const marketType = (market as MarketType) || 'US';
    const isNonUS = marketType !== 'US';

    // 对于非美股市场，先获取补充信息
    let supplementaryData: { competitors: string; recentNews: string; analystViews: string } | null = null;
    if (isNonUS && (!peers || peers.length === 0)) {
      try {
        supplementaryData = await gemini.searchCompanyDetails(
          profile.companyName,
          symbol.toUpperCase(),
          marketType
        );
      } catch (e) {
        console.log('Supplementary data search failed:', e);
      }
    }

    const aiAnalysisRaw = await gemini.analyzeCompany(
      profile,
      incomeStatements || [],
      peers || [],
      earningsTranscripts && earningsTranscripts.length > 0 ? earningsTranscripts[0] : null,
      marketType
    );

    const defaultAnalysis = {
      companyOverview: profile.description || '暂无企业概况',
      industryAnalysis: `${profile.companyName} 属于 ${profile.sector} 行业，主要从事 ${profile.industry} 领域的业务。`,
      industryPainPoints: `${profile.industry} 行业面临的主要挑战包括：市场竞争加剧、技术迭代加速、监管政策变化等。企业需要持续创新以保持竞争力。`,
      competitors: supplementaryData?.competitors || (peers && peers.length > 0 ? `主要竞争对手包括: ${peers.slice(0, 5).join(', ')}` : '暂无竞争对手数据'),
      competitiveAdvantage: '正在分析竞争优势...',
      moat: '正在分析企业护城河...',
      recentDevelopments: supplementaryData?.recentNews || '正在获取最新动态...',
      investmentConclusion: '请结合其他信息进行综合判断。',
    };

    let aiAnalysis;
    try {
      const cleanedResponse = aiAnalysisRaw
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsedAnalysis = JSON.parse(cleanedResponse);

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

    // 使用 Google Search 获取最新动态
    let searchResults = '';
    try {
      searchResults = await gemini.searchAndAnalyze(
        profile.companyName,
        symbol.toUpperCase(),
        marketType
      );
    } catch (e) {
      console.log('Google Search not available:', e);
    }

    if (searchResults) {
      aiAnalysis.recentDevelopments = searchResults;
    }

    // 对于非美股，如果没有财报电话会议数据，使用搜索获取的分析师观点
    let earningsCallSummary = '';
    const latestTranscript = earningsTranscripts && earningsTranscripts.length > 0 ? earningsTranscripts[0] : null;
    const transcriptText = latestTranscript?.content || latestTranscript?.transcript || latestTranscript?.text || '';
    
    if (transcriptText) {
      try {
        earningsCallSummary = await gemini.summarizeEarningsCall(
          transcriptText,
          profile.companyName,
          symbol.toUpperCase()
        );
      } catch (e) {
        console.log('Earnings call summary not available:', e);
      }
    } else if (isNonUS && supplementaryData?.analystViews) {
      // 对于非美股，如果没有财报会议记录，使用分析师观点作为替代
      earningsCallSummary = `## 分析师观点\n\n${supplementaryData.analystViews}`;
    }

    return NextResponse.json({ aiAnalysis, searchResults, earningsCallSummary });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'AI 分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}
