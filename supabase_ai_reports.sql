-- Supabase SQL: 创建 ai_reports 表用于缓存 LLM 报告
-- 在 Supabase Dashboard -> SQL Editor 中执行此脚本

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  market text not null default 'US',
  ai_analysis jsonb not null,
  earnings_call_summary text,
  created_at timestamptz default now(),
  unique(symbol, market)
);

-- 创建索引以加速查询
create index if not exists ai_reports_symbol_market_idx on ai_reports(symbol, market);
create index if not exists ai_reports_created_at_idx on ai_reports(created_at);

-- 可选：启用 RLS（如果需要）
-- alter table ai_reports enable row level security;
