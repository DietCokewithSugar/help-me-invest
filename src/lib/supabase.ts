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
  search_count: number;
  is_valid: boolean;
  last_searched_at: string;
  created_at: string;
}

// 热门股票类型
export interface TrendingStock {
  symbol: string;
  company_name: string | null;
  total_searches: number;
  last_searched: string;
}

/**
 * 记录用户搜索
 * 使用 upsert 来处理：如果 symbol 已存在则增加计数，否则创建新记录
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
    
    // 先查询是否存在该 symbol 的记录
    const { data: existing, error: selectError } = await supabase
      .from('search_records')
      .select('id, search_count')
      .eq('symbol', upperSymbol)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, 这是正常的
      console.error('查询搜索记录失败:', selectError);
      return { success: false, error: selectError.message };
    }

    if (existing) {
      // 更新现有记录：增加计数，更新时间和公司名
      const { error: updateError } = await supabase
        .from('search_records')
        .update({
          search_count: existing.search_count + 1,
          last_searched_at: new Date().toISOString(),
          company_name: companyName || undefined,
          is_valid: true, // 有效搜索重置为有效
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('更新搜索记录失败:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, recordId: existing.id };
    } else {
      // 创建新记录
      const { data: newRecord, error: insertError } = await supabase
        .from('search_records')
        .insert({
          symbol: upperSymbol,
          company_name: companyName || null,
          search_count: 1,
          is_valid: true,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('创建搜索记录失败:', insertError);
        return { success: false, error: insertError.message };
      }

      return { success: true, recordId: newRecord?.id };
    }
  } catch (error: any) {
    console.error('记录搜索失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 标记搜索记录为无效（当 Gemini 返回"这不是股票"错误时调用）
 */
export async function markSearchInvalid(symbol: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return true;

  try {
    const upperSymbol = symbol.toUpperCase().trim();
    
    const { error } = await supabase
      .from('search_records')
      .update({ is_valid: false })
      .eq('symbol', upperSymbol);

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
 */
async function fetchTrendingStocksRaw(limit: number = 10): Promise<TrendingStock[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('Supabase 未配置，返回空热门列表');
    return [];
  }

  try {
    // 计算本周开始日期（周一）
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 调整为周一开始
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('search_records')
      .select('symbol, company_name, search_count, last_searched_at')
      .eq('is_valid', true)
      .gte('last_searched_at', weekStart.toISOString())
      .order('search_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取热门搜索失败:', error);
      return [];
    }

    // 聚合相同 symbol 的搜索次数（以防有重复）
    const aggregated = new Map<string, TrendingStock>();
    
    for (const record of data || []) {
      const existing = aggregated.get(record.symbol);
      if (existing) {
        existing.total_searches += record.search_count;
        if (new Date(record.last_searched_at) > new Date(existing.last_searched)) {
          existing.last_searched = record.last_searched_at;
          existing.company_name = record.company_name;
        }
      } else {
        aggregated.set(record.symbol, {
          symbol: record.symbol,
          company_name: record.company_name,
          total_searches: record.search_count,
          last_searched: record.last_searched_at,
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
      .select('symbol, company_name, search_count, last_searched_at')
      .eq('is_valid', true)
      .order('search_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取热门搜索失败:', error);
      return [];
    }

    return (data || []).map((record) => ({
      symbol: record.symbol,
      company_name: record.company_name,
      total_searches: record.search_count,
      last_searched: record.last_searched_at,
    }));
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
