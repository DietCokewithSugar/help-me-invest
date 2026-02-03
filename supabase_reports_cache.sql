-- ============================================================
-- 报告缓存表 v2
-- 用于存储基础版和专业版报告的各个模块内容
-- 创建时间: 2026-02
-- ============================================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS reports_cache;

-- 创建新的报告缓存表
CREATE TABLE reports_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'US',
  
  -- ==================== 基础版 AI 分析模块 ====================
  -- 每个模块单独存储，便于单独更新
  company_overview TEXT,              -- 企业概况
  industry_analysis TEXT,             -- 行业分析
  industry_pain_points TEXT,          -- 行业痛点与障碍
  competitors TEXT,                   -- 竞争格局
  competitive_advantage TEXT,         -- 竞争优势
  moat TEXT,                          -- 核心护城河
  recent_developments TEXT,           -- 最新发展动态
  investment_conclusion TEXT,         -- 投资建议总结
  
  -- ==================== 专业版 AI 分析模块 ====================
  pro_business_model TEXT,            -- 一、生意模式分析
  pro_operating_model TEXT,           -- 二、运营模式分析
  pro_industry_outlook TEXT,          -- 三、行业前景评估
  pro_moat_analysis TEXT,             -- 四、竞争地位与护城河
  pro_financial_health TEXT,          -- 五、财务健康与经营质量
  pro_valuation TEXT,                 -- 六、估值与买入时机
  pro_investment_conclusion TEXT,     -- 七、综合投资建议
  
  -- ==================== FMP 财务数据（季度更新） ====================
  -- 这些数据通常一个季度才变一次，缓存可减少 API 压力
  sankey_data JSONB,                  -- 营收流向分析（桑基图）
  revenue_trend JSONB,                -- 年度营收趋势数据
  cost_structure JSONB,               -- 成本结构数据
  income_statements JSONB,            -- 利润表（年度）
  balance_sheets JSONB,               -- 资产负债表（年度）
  cash_flow_statements JSONB,         -- 现金流量表（年度）
  income_statements_quarter JSONB,    -- 利润表（季度）
  balance_sheets_quarter JSONB,       -- 资产负债表（季度）
  cash_flow_statements_quarter JSONB, -- 现金流量表（季度）
  
  -- ==================== 专业版估值数据 ====================
  -- 只存储资本与回报模块数据，计算因子详情和财务指标暂不存
  capital_return_data JSONB,          -- 资本与回报模块数据
  
  -- ==================== 财报电话会议 ====================
  earnings_call_summary TEXT,         -- 财报电话会议摘要
  
  -- ==================== 元数据 ====================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束：每个股票代码+市场只有一条记录
  CONSTRAINT reports_cache_symbol_market_unique UNIQUE (symbol, market)
);

-- 创建索引以加速查询
CREATE INDEX idx_reports_cache_symbol_market ON reports_cache (symbol, market);
CREATE INDEX idx_reports_cache_updated_at ON reports_cache (updated_at);

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_reports_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reports_cache_updated_at
  BEFORE UPDATE ON reports_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_cache_updated_at();

-- 添加注释
COMMENT ON TABLE reports_cache IS '报告缓存表 - 存储基础版和专业版报告的各个模块内容';
COMMENT ON COLUMN reports_cache.symbol IS '股票代码（大写）';
COMMENT ON COLUMN reports_cache.market IS '市场类型: US, CN, HK, JP';
COMMENT ON COLUMN reports_cache.company_overview IS '基础版 - 企业概况';
COMMENT ON COLUMN reports_cache.industry_analysis IS '基础版 - 行业分析';
COMMENT ON COLUMN reports_cache.industry_pain_points IS '基础版 - 行业痛点与障碍';
COMMENT ON COLUMN reports_cache.competitors IS '基础版 - 竞争格局';
COMMENT ON COLUMN reports_cache.competitive_advantage IS '基础版 - 竞争优势';
COMMENT ON COLUMN reports_cache.moat IS '基础版 - 核心护城河';
COMMENT ON COLUMN reports_cache.recent_developments IS '基础版 - 最新发展动态';
COMMENT ON COLUMN reports_cache.investment_conclusion IS '基础版 - 投资建议总结';
COMMENT ON COLUMN reports_cache.pro_business_model IS '专业版 - 生意模式分析';
COMMENT ON COLUMN reports_cache.pro_operating_model IS '专业版 - 运营模式分析';
COMMENT ON COLUMN reports_cache.pro_industry_outlook IS '专业版 - 行业前景评估';
COMMENT ON COLUMN reports_cache.pro_moat_analysis IS '专业版 - 竞争地位与护城河';
COMMENT ON COLUMN reports_cache.pro_financial_health IS '专业版 - 财务健康与经营质量';
COMMENT ON COLUMN reports_cache.pro_valuation IS '专业版 - 估值与买入时机';
COMMENT ON COLUMN reports_cache.pro_investment_conclusion IS '专业版 - 综合投资建议';
COMMENT ON COLUMN reports_cache.sankey_data IS 'FMP - 营收流向分析桑基图数据';
COMMENT ON COLUMN reports_cache.revenue_trend IS 'FMP - 年度营收趋势数据';
COMMENT ON COLUMN reports_cache.cost_structure IS 'FMP - 成本结构数据';
COMMENT ON COLUMN reports_cache.capital_return_data IS '专业版 - 资本与回报模块数据';
