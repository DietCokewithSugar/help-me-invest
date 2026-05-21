import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekClient } from '@/lib/deepseek';
import type { MarketType } from '@/lib/markets';
import { getCachedReportV1, saveReport, type AIReportRecord } from '@/lib/supabase';
import { withRetryAndTimeout } from '@/lib/api-utils';
import { apiErrorResponse, readJsonWithLimit, requireInternalApiKey } from '@/lib/api-security';

export const maxDuration = 60;
const MAX_REQUEST_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  try {
    requireInternalApiKey(request);
    const { symbol, profile, incomeStatements, peers, earningsTranscripts, market } = await readJsonWithLimit<any>(request, MAX_REQUEST_BYTES);

    if (!symbol || !profile) {
      return NextResponse.json({ error: '缺少必要的公司信息' }, { status: 400 });
    }

    const marketType = (market as MarketType) || 'US';
    const upperSymbol = symbol.toUpperCase().trim();

    // 1. 检查数据库中是否有7天内的缓存报告
    const cachedReport = await getCachedReportV1(upperSymbol, marketType);
    if (cachedReport) {
      console.log(`使用缓存报告: ${upperSymbol} (${marketType}), 生成于: ${cachedReport.created_at}`);
      return NextResponse.json({
        aiAnalysis: cachedReport.ai_analysis,
        searchResults: '',
        earningsCallSummary: cachedReport.earnings_call_summary || '',
        generatedAt: cachedReport.created_at,
        fromCache: true,
      });
    }

    // 2. 无缓存，调用 AI 生成报告
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'DeepSeek API 密钥未配置' }, { status: 500 });
    }

    const deepseek = new DeepSeekClient(deepseekApiKey);


    const defaultAnalysis = {
      companyOverview: profile.description || '暂无企业概况',
      industryAnalysis: `${profile.companyName} 属于 ${profile.sector} 行业，主要从事 ${profile.industry} 领域的业务。`,
      industryPainPoints: `${profile.industry} 行业面临的主要挑战包括：市场竞争加剧、技术迭代加速、监管政策变化等。企业需要持续创新以保持竞争力。`,
      competitors: peers && peers.length > 0 ? `主要竞争对手包括: ${peers.slice(0, 5).join(', ')}` : '暂无竞争对手数据',
      competitiveAdvantage: '正在分析竞争优势...',
      moat: '正在分析企业护城河...',
      recentDevelopments: '正在获取最新动态...',
      investmentConclusion: '请结合其他信息进行综合判断。',
    };

    const aiAnalysisRaw = await withRetryAndTimeout(
      () => deepseek.analyzeCompany(
        profile,
        incomeStatements || [],
        peers || [],
        earningsTranscripts && earningsTranscripts.length > 0 ? earningsTranscripts[0] : null,
        marketType
      ),
      { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 25000, label: 'analyzeCompany' },
      ''
    );

    let aiAnalysis;
    let parseSuccess = false;
    try {
      if (!aiAnalysisRaw || aiAnalysisRaw.trim().length === 0) {
        throw new Error('AI 返回空响应');
      }
      // 检查是否返回了错误消息而不是 JSON
      if (aiAnalysisRaw.toLowerCase().startsWith('an error') ||
        aiAnalysisRaw.toLowerCase().startsWith('error') ||
        aiAnalysisRaw.toLowerCase().includes('i apologize') ||
        aiAnalysisRaw.toLowerCase().includes('i cannot')) {
        console.error('AI returned error message instead of JSON:', aiAnalysisRaw.substring(0, 200));
        throw new Error('AI 返回了错误消息');
      }

      const cleanedResponse = aiAnalysisRaw
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // 确保响应看起来像 JSON
      if (!cleanedResponse.startsWith('{')) {
        console.error('AI response does not look like JSON:', cleanedResponse.substring(0, 200));
        throw new Error('AI 响应格式不正确');
      }

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
      parseSuccess = true;
    } catch (e: any) {
      console.error('Failed to parse AI response:', e?.message || e);
      console.error('Raw response (first 500 chars):', aiAnalysisRaw?.substring(0, 500));
      aiAnalysis = defaultAnalysis;
    }

    // 3. 成功解析后保存到数据库
    const generatedAt = new Date().toISOString();
    if (parseSuccess) {
      try {
        await saveReport(upperSymbol, marketType, aiAnalysis);
      } catch (err) {
        console.error('保存报告失败:', err);
        // 保存失败不影响返回结果
      }
    }

    return NextResponse.json({
      aiAnalysis,
      searchResults: '',
      earningsCallSummary: '',
      generatedAt,
      fromCache: false,
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return apiErrorResponse(error, 'AI 分析失败，请稍后重试');
  }
}
