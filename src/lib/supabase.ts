import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

// Supabase 客户端（使用 service role key 进行服务端操作）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 检查 Supabase 是否已配置
export const isSupabaseConfigured = !!(supabaseUrl && supabaseServiceKey);

// 延迟创建客户端，避免在未配置时报错
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl!, supabaseServiceKey!);
  }
  return _supabase;
}

// 搜索记录类型
export interface SearchRecord {
  id: string;
  symbol: string;
  company_name: string | null;
  is_valid: boolean;
  created_at: string;
}

// 热门股票类型
export interface TrendingStock {
  symbol: string;
  company_name: string | null;
  total_searches: number;
  last_searched: string;
}

export async function getTotalReportCount(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('search_records')
      .select('id', { count: 'exact', head: true })
      .eq('is_valid', true);

    if (error) {
      console.error('获取研报总数失败:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('获取研报总数失败:', error);
    return 0;
  }
}

/**
 * 记录用户搜索
 * 每次搜索都创建一条独立记录
 */
export async function recordSearch(
  symbol: string,
  companyName?: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const supabase = getSupabase();

  // 如果 Supabase 未配置，静默跳过
  if (!supabase) {
    console.log('Supabase 未配置，跳过搜索记录');
    return { success: true };
  }

  try {
    const upperSymbol = symbol.toUpperCase().trim();

    // 每次搜索都创建新记录
    const { data: newRecord, error: insertError } = await supabase
      .from('search_records')
      .insert({
        symbol: upperSymbol,
        company_name: companyName || null,
        is_valid: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('创建搜索记录失败:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, recordId: newRecord?.id };
  } catch (error: any) {
    console.error('记录搜索失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 标记搜索记录为无效（当 AI 返回"这不是股票"错误时调用）
 */
export async function markSearchInvalid(symbol: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return true;

  try {
    const upperSymbol = symbol.toUpperCase().trim();

    const { data: latestRecord, error: selectError } = await supabase
      .from('search_records')
      .select('id')
      .eq('symbol', upperSymbol)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('查询最新搜索记录失败:', selectError);
      return false;
    }

    if (!latestRecord) {
      return true;
    }

    const { error } = await supabase
      .from('search_records')
      .update({ is_valid: false })
      .eq('id', latestRecord.id);

    if (error) {
      console.error('标记搜索记录无效失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('标记搜索记录无效失败:', error);
    return false;
  }
}

/**
 * 删除无效的搜索记录
 */
export async function deleteInvalidSearches(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase
      .from('search_records')
      .delete()
      .eq('is_valid', false)
      .select('id');

    if (error) {
      console.error('删除无效搜索记录失败:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('删除无效搜索记录失败:', error);
    return 0;
  }
}

/**
 * 获取本周热门搜索（不带缓存的原始函数）
 * 统计过去七天内按 created_at 创建的搜索记录数，每个企业名称独立计数
 */
async function fetchTrendingStocksRaw(limit: number = 10): Promise<TrendingStock[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('Supabase 未配置，返回空热门列表');
    return [];
  }

  try {
    // 计算七天前的日期
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 获取过去七天内的所有搜索记录，按 created_at 筛选
    const { data, error } = await supabase
      .from('search_records')
      .select('symbol, company_name, created_at')
      .eq('is_valid', true)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false }); // 按创建时间倒序，获取最新的记录

    if (error) {
      console.error('获取热门搜索失败:', error);
      return [];
    }

    // 按 symbol 聚合，统计每个 symbol 在过去七天的搜索记录数
    const aggregated = new Map<string, TrendingStock>();

    for (const record of data || []) {
      const existing = aggregated.get(record.symbol);
      if (existing) {
        existing.total_searches += 1; // 每次搜索都算一次独立记录
        // 更新为最新的公司名称和搜索时间
        if (new Date(record.created_at) > new Date(existing.last_searched)) {
          existing.last_searched = record.created_at;
          existing.company_name = record.company_name;
        }
      } else {
        aggregated.set(record.symbol, {
          symbol: record.symbol,
          company_name: record.company_name,
          total_searches: 1, // 每个 symbol 从 1 开始计数
          last_searched: record.created_at,
        });
      }
    }

    // 按搜索次数倒序排序，返回前 limit 个
    return Array.from(aggregated.values())
      .sort((a, b) => b.total_searches - a.total_searches)
      .slice(0, limit);
  } catch (error: any) {
    // 更详细的错误日志，帮助诊断网络问题
    const errorDetails = {
      message: error?.message || 'Unknown error',
      details: error?.cause?.message || error?.stack?.substring(0, 500) || String(error),
      hint: error?.hint || '',
      code: error?.code || '',
    };
    console.error('获取热门搜索失败:', errorDetails);

    // 网络错误不应影响主流程，静默返回空数组
    return [];
  }
}

/**
 * 获取本周热门搜索（带 1 分钟缓存）
 * 使用 Next.js unstable_cache 减轻数据库压力
 */
export const getTrendingStocks = unstable_cache(
  fetchTrendingStocksRaw,
  ['trending-stocks'],
  {
    revalidate: 60, // 每 60 秒重新验证一次
    tags: ['trending'],
  }
);

/**
 * 获取全部时间的热门搜索（带缓存）
 */
async function fetchAllTimeTrendingRaw(limit: number = 10): Promise<TrendingStock[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('search_records')
      .select('symbol, company_name, created_at')
      .eq('is_valid', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取热门搜索失败:', error);
      return [];
    }

    const aggregated = new Map<string, TrendingStock>();

    for (const record of data || []) {
      const existing = aggregated.get(record.symbol);
      if (existing) {
        existing.total_searches += 1;
        if (new Date(record.created_at) > new Date(existing.last_searched)) {
          existing.last_searched = record.created_at;
          existing.company_name = record.company_name;
        }
      } else {
        aggregated.set(record.symbol, {
          symbol: record.symbol,
          company_name: record.company_name,
          total_searches: 1,
          last_searched: record.created_at,
        });
      }
    }

    return Array.from(aggregated.values())
      .sort((a, b) => b.total_searches - a.total_searches)
      .slice(0, limit);
  } catch (error) {
    console.error('获取热门搜索失败:', error);
    return [];
  }
}

export const getAllTimeTrending = unstable_cache(
  fetchAllTimeTrendingRaw,
  ['all-time-trending'],
  {
    revalidate: 60,
    tags: ['trending'],
  }
);

// ==================== AI 报告缓存（旧版，保留兼容） ====================

/**
 * AI 报告记录类型（旧版）
 */
export interface AIReportRecord {
  id: string;
  symbol: string;
  market: string;
  ai_analysis: {
    companyOverview: string;
    industryAnalysis: string;
    industryPainPoints: string;
    competitors: string;
    competitiveAdvantage: string;
    moat: string;
    recentDevelopments: string;
    investmentConclusion: string;
  };
  earnings_call_summary: string | null;
  created_at: string;
}

/**
 * 获取缓存的AI报告（7天内有效）- 旧版 v1
 */
export async function getCachedReportV1(
  symbol: string,
  market: string
): Promise<AIReportRecord | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  try {
    const upperSymbol = symbol.toUpperCase().trim();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('symbol', upperSymbol)
      .eq('market', market)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116 = no rows found, not an error
      if (error.code !== 'PGRST116') {
        console.error('获取缓存报告失败:', error);
      }
      return null;
    }

    return data as AIReportRecord;
  } catch (error) {
    console.error('获取缓存报告失败:', error);
    return null;
  }
}

/**
 * 保存或更新AI报告到数据库 - 旧版
 */
export async function saveReport(
  symbol: string,
  market: string,
  aiAnalysis: AIReportRecord['ai_analysis'],
  earningsCallSummary?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('Supabase 未配置，跳过报告保存');
    return { success: true };
  }

  try {
    const upperSymbol = symbol.toUpperCase().trim();

    // 使用 upsert 实现插入或更新
    const { error } = await supabase
      .from('ai_reports')
      .upsert(
        {
          symbol: upperSymbol,
          market,
          ai_analysis: aiAnalysis,
          earnings_call_summary: earningsCallSummary || null,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'symbol,market',
        }
      );

    if (error) {
      console.error('保存AI报告失败:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('保存AI报告失败:', error);
    return { success: false, error: error.message };
  }
}

// ==================== 报告缓存 v2（新版） ====================

/**
 * 报告缓存记录类型（新版）
 * 每个模块单独存储，便于单独更新和查询
 */
export interface ReportCacheRecord {
  id: string;
  symbol: string;
  market: string;
  
  // 基础版 AI 分析模块
  company_overview: string | null;
  industry_analysis: string | null;
  industry_pain_points: string | null;
  competitors: string | null;
  competitive_advantage: string | null;
  moat: string | null;
  recent_developments: string | null;
  investment_conclusion: string | null;
  
  // 专业版 AI 分析模块
  pro_business_model: string | null;
  pro_operating_model: string | null;
  pro_industry_outlook: string | null;
  pro_moat_analysis: string | null;
  pro_financial_health: string | null;
  pro_valuation: string | null;
  pro_investment_conclusion: string | null;
  
  // 小白版 AI 分析模块
  beginner_verdict: string | null;
  beginner_company_intro: string | null;
  beginner_risk_reward: string | null;
  beginner_action_plan: string | null;
  
  // FMP 财务数据（季度更新）
  sankey_data: any | null;
  revenue_trend: any | null;
  cost_structure: any | null;
  income_statements: any | null;
  balance_sheets: any | null;
  cash_flow_statements: any | null;
  income_statements_quarter: any | null;
  balance_sheets_quarter: any | null;
  cash_flow_statements_quarter: any | null;
  
  // 专业版估值数据
  capital_return_data: any | null;
  
  // 财报电话会议
  earnings_call_summary: string | null;
  
  // 元数据
  created_at: string;
  updated_at: string;
}

// FMP 数据缓存记录
export interface FmpDataRecord {
  id: string;
  symbol: string;
  market: string;
  sankey_data: any | null;
  revenue_trend: any | null;
  cost_structure: any | null;
  income_statements: any | null;
  balance_sheets: any | null;
  cash_flow_statements: any | null;
  income_statements_quarter: any | null;
  balance_sheets_quarter: any | null;
  cash_flow_statements_quarter: any | null;
  capital_return_data: any | null;
  created_at: string;
  updated_at: string;
}

// 小白版报告记录
export interface BeginnerReportRecord {
  id: string;
  symbol: string;
  market: string;
  language: string;
  beginner_verdict: string | null;
  beginner_company_intro: string | null;
  beginner_risk_reward: string | null;
  beginner_action_plan: string | null;
  created_at: string;
  updated_at: string;
}

// 普通版报告记录
export interface StandardReportRecord {
  id: string;
  symbol: string;
  market: string;
  language: string;
  company_overview: string | null;
  industry_analysis: string | null;
  industry_pain_points: string | null;
  competitors: string | null;
  competitive_advantage: string | null;
  moat: string | null;
  recent_developments: string | null;
  investment_conclusion: string | null;
  earnings_call_summary: string | null;
  created_at: string;
  updated_at: string;
}

// 专业版报告记录
export interface ProfessionalReportRecord {
  id: string;
  symbol: string;
  market: string;
  language: string;
  pro_business_model: string | null;
  pro_operating_model: string | null;
  pro_industry_outlook: string | null;
  pro_moat_analysis: string | null;
  pro_financial_health: string | null;
  pro_valuation: string | null;
  pro_investment_conclusion: string | null;
  created_at: string;
  updated_at: string;
}

type ReportType = 'beginner' | 'standard' | 'professional';

// Map section names to their table and column
const sectionConfig: Record<string, { table: string; column: string }> = {
  // Beginner
  beginnerVerdict: { table: 'reports_beginner', column: 'beginner_verdict' },
  beginnerCompanyIntro: { table: 'reports_beginner', column: 'beginner_company_intro' },
  beginnerRiskReward: { table: 'reports_beginner', column: 'beginner_risk_reward' },
  beginnerActionPlan: { table: 'reports_beginner', column: 'beginner_action_plan' },
  // Standard
  companyOverview: { table: 'reports_standard', column: 'company_overview' },
  industryAnalysis: { table: 'reports_standard', column: 'industry_analysis' },
  industryPainPoints: { table: 'reports_standard', column: 'industry_pain_points' },
  competitors: { table: 'reports_standard', column: 'competitors' },
  competitiveAdvantage: { table: 'reports_standard', column: 'competitive_advantage' },
  moat: { table: 'reports_standard', column: 'moat' },
  recentDevelopments: { table: 'reports_standard', column: 'recent_developments' },
  investmentConclusion: { table: 'reports_standard', column: 'investment_conclusion' },
  earningsCallSummary: { table: 'reports_standard', column: 'earnings_call_summary' },
  // Professional
  proBusinessModel: { table: 'reports_professional', column: 'pro_business_model' },
  proOperatingModel: { table: 'reports_professional', column: 'pro_operating_model' },
  proIndustryOutlook: { table: 'reports_professional', column: 'pro_industry_outlook' },
  proMoatAnalysis: { table: 'reports_professional', column: 'pro_moat_analysis' },
  proFinancialHealth: { table: 'reports_professional', column: 'pro_financial_health' },
  proValuation: { table: 'reports_professional', column: 'pro_valuation' },
  proInvestmentConclusion: { table: 'reports_professional', column: 'pro_investment_conclusion' },
};

/**
 * 获取缓存的报告（7天内有效）- 旧版 v2（保留兼容）
 */
export async function getCachedReportV2(
  symbol: string,
  market: string,
  language?: string
): Promise<ReportCacheRecord | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  try {
    const upperSymbol = symbol.toUpperCase().trim();
    const marketKey = (!language || language === 'zh') ? market : `${market}:${language}`;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('reports_cache')
      .select('*')
      .eq('symbol', upperSymbol)
      .eq('market', marketKey)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('获取缓存报告失败:', error);
      }
      return null;
    }

    return data as ReportCacheRecord;
  } catch (error) {
    console.error('获取缓存报告失败:', error);
    return null;
  }
}

// Get cached report by type (new 3-table architecture)
export async function getCachedReport(
  symbol: string,
  market: string,
  reportType: ReportType,
  language: string = 'zh'
): Promise<BeginnerReportRecord | StandardReportRecord | ProfessionalReportRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const tableMap: Record<ReportType, string> = {
    beginner: 'reports_beginner',
    standard: 'reports_standard',
    professional: 'reports_professional',
  };

  try {
    const upperSymbol = symbol.toUpperCase().trim();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from(tableMap[reportType])
      .select('*')
      .eq('symbol', upperSymbol)
      .eq('market', market)
      .eq('language', language)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error(`获取${reportType}缓存报告失败:`, error);
      }
      return null;
    }

    return data;
  } catch (error) {
    console.error(`获取${reportType}缓存报告失败:`, error);
    return null;
  }
}

// Get cached FMP data
export async function getCachedFmpData(
  symbol: string,
  market: string
): Promise<FmpDataRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const upperSymbol = symbol.toUpperCase().trim();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('reports_fmp_data')
      .select('*')
      .eq('symbol', upperSymbol)
      .eq('market', market)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('获取FMP缓存数据失败:', error);
      }
      return null;
    }

    return data as FmpDataRecord;
  } catch (error) {
    console.error('获取FMP缓存数据失败:', error);
    return null;
  }
}

/**
 * 保存单个模块到缓存 - 新版 3-table 架构
 * 用于流式生成时实时保存每个模块
 */
export async function saveReportSection(
  symbol: string,
  market: string,
  section: string,
  content: string,
  language: string = 'zh'
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: true };
  }

  const config = sectionConfig[section];
  if (!config) {
    console.warn(`未知的模块名称: ${section}`);
    return { success: false, error: `Unknown section: ${section}` };
  }

  try {
    const upperSymbol = symbol.toUpperCase().trim();

    const { error } = await supabase
      .from(config.table)
      .upsert(
        {
          symbol: upperSymbol,
          market,
          language,
          [config.column]: content,
        },
        {
          onConflict: 'symbol,market,language',
        }
      );

    if (error) {
      console.error(`保存模块 ${section} 到 ${config.table} 失败:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error(`保存模块 ${section} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 批量保存 FMP 数据到缓存 - 新版（独立 reports_fmp_data 表）
 * FMP data doesn't need language — it's the same for all languages
 */
export async function saveFmpDataToCache(
  symbol: string,
  market: string,
  data: {
    sankeyData?: any;
    revenueTrend?: any;
    costStructure?: any;
    incomeStatements?: any;
    balanceSheets?: any;
    cashFlowStatements?: any;
    incomeStatementsQuarter?: any;
    balanceSheetsQuarter?: any;
    cashFlowStatementsQuarter?: any;
    capitalReturnData?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: true };
  }

  try {
    const upperSymbol = symbol.toUpperCase().trim();

    const updateData: Record<string, any> = {
      symbol: upperSymbol,
      market,
    };

    if (data.sankeyData !== undefined) updateData.sankey_data = data.sankeyData;
    if (data.revenueTrend !== undefined) updateData.revenue_trend = data.revenueTrend;
    if (data.costStructure !== undefined) updateData.cost_structure = data.costStructure;
    if (data.incomeStatements !== undefined) updateData.income_statements = data.incomeStatements;
    if (data.balanceSheets !== undefined) updateData.balance_sheets = data.balanceSheets;
    if (data.cashFlowStatements !== undefined) updateData.cash_flow_statements = data.cashFlowStatements;
    if (data.incomeStatementsQuarter !== undefined) updateData.income_statements_quarter = data.incomeStatementsQuarter;
    if (data.balanceSheetsQuarter !== undefined) updateData.balance_sheets_quarter = data.balanceSheetsQuarter;
    if (data.cashFlowStatementsQuarter !== undefined) updateData.cash_flow_statements_quarter = data.cashFlowStatementsQuarter;
    if (data.capitalReturnData !== undefined) updateData.capital_return_data = data.capitalReturnData;

    const { error } = await supabase
      .from('reports_fmp_data')
      .upsert(updateData, { onConflict: 'symbol,market' });

    if (error) {
      console.error('保存 FMP 数据失败:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('保存 FMP 数据失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除指定股票的缓存（用于强制重新生成）- 新版 3-table 架构
 */
export async function deleteReportCache(
  symbol: string,
  market: string,
  reportType?: ReportType,
  language: string = 'zh'
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: true };
  }

  try {
    const upperSymbol = symbol.toUpperCase().trim();

    if (reportType) {
      const tableMap: Record<ReportType, string> = {
        beginner: 'reports_beginner',
        standard: 'reports_standard',
        professional: 'reports_professional',
      };

      const { error } = await supabase
        .from(tableMap[reportType])
        .delete()
        .eq('symbol', upperSymbol)
        .eq('market', market)
        .eq('language', language);

      if (error) {
        console.error('删除缓存失败:', error);
        return { success: false, error: error.message };
      }
    } else {
      await Promise.all([
        supabase.from('reports_beginner').delete().eq('symbol', upperSymbol).eq('market', market).eq('language', language),
        supabase.from('reports_standard').delete().eq('symbol', upperSymbol).eq('market', market).eq('language', language),
        supabase.from('reports_professional').delete().eq('symbol', upperSymbol).eq('market', market).eq('language', language),
      ]);
    }

    return { success: true };
  } catch (error: any) {
    console.error('删除缓存失败:', error);
    return { success: false, error: error.message };
  }
}

export type { ReportType };
