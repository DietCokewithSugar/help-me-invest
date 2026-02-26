-- =============================================
-- 报告缓存 v3：三表分离架构
-- 每种报告类型独立存储，支持多语言
-- =============================================

-- 1. 小白版报告表
CREATE TABLE IF NOT EXISTS reports_beginner (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'US',
  language TEXT NOT NULL DEFAULT 'zh',
  
  beginner_verdict TEXT,
  beginner_company_intro TEXT,
  beginner_risk_reward TEXT,
  beginner_action_plan TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT reports_beginner_unique UNIQUE (symbol, market, language)
);

CREATE INDEX IF NOT EXISTS idx_reports_beginner_lookup 
  ON reports_beginner(symbol, market, language);
CREATE INDEX IF NOT EXISTS idx_reports_beginner_updated 
  ON reports_beginner(updated_at DESC);

-- 2. 普通版报告表
CREATE TABLE IF NOT EXISTS reports_standard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'US',
  language TEXT NOT NULL DEFAULT 'zh',
  
  company_overview TEXT,
  industry_analysis TEXT,
  industry_pain_points TEXT,
  competitors TEXT,
  competitive_advantage TEXT,
  moat TEXT,
  recent_developments TEXT,
  investment_conclusion TEXT,
  earnings_call_summary TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT reports_standard_unique UNIQUE (symbol, market, language)
);

CREATE INDEX IF NOT EXISTS idx_reports_standard_lookup 
  ON reports_standard(symbol, market, language);
CREATE INDEX IF NOT EXISTS idx_reports_standard_updated 
  ON reports_standard(updated_at DESC);

-- 3. 专业版报告表
CREATE TABLE IF NOT EXISTS reports_professional (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'US',
  language TEXT NOT NULL DEFAULT 'zh',
  
  pro_business_model TEXT,
  pro_operating_model TEXT,
  pro_industry_outlook TEXT,
  pro_moat_analysis TEXT,
  pro_financial_health TEXT,
  pro_valuation TEXT,
  pro_investment_conclusion TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT reports_professional_unique UNIQUE (symbol, market, language)
);

CREATE INDEX IF NOT EXISTS idx_reports_professional_lookup 
  ON reports_professional(symbol, market, language);
CREATE INDEX IF NOT EXISTS idx_reports_professional_updated 
  ON reports_professional(updated_at DESC);

-- 4. FMP 数据缓存表（共享，不分语言和报告类型）
CREATE TABLE IF NOT EXISTS reports_fmp_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'US',
  
  sankey_data JSONB,
  revenue_trend JSONB,
  cost_structure JSONB,
  income_statements JSONB,
  balance_sheets JSONB,
  cash_flow_statements JSONB,
  income_statements_quarter JSONB,
  balance_sheets_quarter JSONB,
  cash_flow_statements_quarter JSONB,
  capital_return_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT reports_fmp_data_unique UNIQUE (symbol, market)
);

CREATE INDEX IF NOT EXISTS idx_reports_fmp_data_lookup 
  ON reports_fmp_data(symbol, market);
