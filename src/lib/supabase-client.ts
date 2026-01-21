import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 客户端 Supabase 实例（使用公开的 anon key，用于 Realtime 订阅）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 检查客户端 Supabase 是否已配置
export const isSupabaseClientConfigured = !!(supabaseUrl && supabaseAnonKey);

// 延迟创建客户端，避免在未配置时报错
let _supabaseClient: SupabaseClient | null = null;

/**
 * 获取客户端 Supabase 实例（用于浏览器端 Realtime 订阅）
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    // 服务端渲染时不创建客户端
    return null;
  }
  
  if (!isSupabaseClientConfigured) {
    return null;
  }
  
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  
  return _supabaseClient;
}
