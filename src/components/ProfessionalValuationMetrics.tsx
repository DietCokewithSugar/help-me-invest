'use client';

import ReactECharts from 'echarts-for-react';
import { Calculator, TrendingUp, TrendingDown, Target, Percent, PiggyBank, BarChart3, Activity, Info, DollarSign, Shield, Zap, Building2, AlertTriangle, Gift, CircleDollarSign, Clock } from 'lucide-react';
import type { KeyMetrics, CompanyProfile, FinancialRatios, FinancialScores } from '@/types';
import { useState } from 'react';
import FinancialScoresDisplay from './FinancialScoresDisplay';

interface Props {
  profile: CompanyProfile;
  keyMetrics: KeyMetrics[];
  keyMetricsTTM?: any[];
  financialRatios?: FinancialRatios[];
  financialRatiosTTM?: any[];
  financialScores?: FinancialScores | null;
}

// 指标说明映射 - 按用户要求分类
const metricDescriptions: Record<string, { title: string; description: string; insight?: string }> = {
  // 1. 核心风控与综合评分
  altmanZScore: {
    title: '奥特曼 Z-Score',
    description: '破产预测模型。预测未来2年破产概率。',
    insight: '>3.0 为安全区，<1.8 为危险区。'
  },
  piotroskiScore: {
    title: 'F-Score (皮奥特罗斯基评分)',
    description: '财务改善评分。0-9分，衡量财务状况是在变好还是变坏。',
    insight: '8-9分代表经营效率显著提升。'
  },

  // 2. 估值指标
  peRatioTTM: {
    title: '市盈率 (TTM)',
    description: '回本年限。基于最近12个月利润计算。',
    insight: '比静态PE更反映当前状态。'
  },
  evToEBITDATTM: {
    title: '企业价值倍数',
    description: '收购性价比。剔除税收和杠杆影响后的估值。',
    insight: '适合跨国对比，一般10-15倍为合理区间。'
  },
  earningsYieldTTM: {
    title: '盈利收益率',
    description: '理论回报率 (1/PE)。',
    insight: '可直接与国债收益率对比。'
  },
  freeCashFlowYieldTTM: {
    title: 'FCF 收益率',
    description: '真钱回报率。自由现金流/市值。',
    insight: '比盈利收益率更真实，代表落袋的钱。'
  },
  grahamNumber: {
    title: '格雷厄姆数字',
    description: '价值上限。传统价值投资计算出的"合理价格"。',
    insight: '√(22.5 × EPS × BVPS)'
  },
  enterpriseValue: {
    title: '企业价值 (EV)',
    description: '收购成本。市值+债务-现金。',
    insight: '如果EV<市值，说明现金极多。'
  },

  // 3. 盈利能力
  grossProfitMargin: {
    title: '毛利率',
    description: '产品竞争力。扣除制造成本后的利润比例。',
    insight: '高毛利代表有定价权。'
  },
  netProfitMargin: {
    title: '净利率',
    description: '最终落袋比例。扣除所有费用和税后的利润率。',
  },
  returnOnEquity: {
    title: '净资产收益率 (ROE)',
    description: '股东回报效率。股东每投1块钱能赚多少。',
    insight: '巴菲特最看重的指标，>15%通常较好。'
  },
  returnOnInvestedCapital: {
    title: '投入资本回报率 (ROIC)',
    description: '护城河深浅。衡量公司配置资本的能力。',
    insight: '>15% 通常意味着有宽阔护城河。'
  },
  incomeQuality: {
    title: '收益质量',
    description: '利润含金量。经营现金流/净利润。',
    insight: '>1 说明利润是真金白银，不是账面数字。'
  },

  // 4. 运营效率与周期
  cashConversionCycle: {
    title: '现金循环周期',
    description: '资金占用效率。DIO+DSO-DPO。',
    insight: '负数代表用供应商的钱做生意（极强）。'
  },
  daysOfInventoryOutstanding: {
    title: '库存周转天数',
    description: '去库存速度。',
    insight: '越短说明货卖得越快。'
  },
  daysOfPayablesOutstanding: {
    title: '应付账款天数',
    description: '对供应商账期。',
    insight: '越长说明对上游话语权越强。'
  },
  assetTurnover: {
    title: '总资产周转率',
    description: '资产利用率。1块钱资产能带来多少营收。',
  },
  inventoryTurnover: {
    title: '库存周转率',
    description: '卖货频率。一年能把仓库清空多少次。',
  },

  // 5. 资本结构与开支
  researchAndDevelopementToRevenue: {
    title: '研发占比',
    description: '未来投入。每100块收入花多少做研发。',
    insight: '科技股核心指标。'
  },
  capexToRevenue: {
    title: '资本开支占比',
    description: '重资产程度。用于买设备厂房的钱。',
    insight: '低占比说明是轻资产模式。'
  },
  stockBasedCompensationToRevenue: {
    title: '股权激励占比',
    description: '股东稀释风险。分给员工的股票占比。',
    insight: '太高会稀释散户权益。'
  },

  // 6. 股东回报
  dividendYield: {
    title: '股息率',
    description: '分红回报。当前股价对应的现金分红率。',
  },
  dividendPayoutRatio: {
    title: '派息率',
    description: '分红慷慨度。赚的钱拿百分之多少分给股东。',
  },
  freeCashFlowPerShare: {
    title: '每股自由现金流',
    description: '每股含金量。',
    insight: '如果该值 > EPS，说明公司盈利质量极高。'
  },
};

export default function ProfessionalValuationMetrics({
  profile,
  keyMetrics,
  keyMetricsTTM = [],
  financialRatios = [],
  financialRatiosTTM = [],
  financialScores,
}: Props) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const value = Math.abs(num) > 1 ? num : num * 100;
    return value.toFixed(2) + '%';
  };

  const formatRatio = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return num.toFixed(2);
  };

  const formatDays = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return num.toFixed(1) + ' 天';
  };

  const formatCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return '$' + formatNumber(num);
  };

  if (!keyMetrics || keyMetrics.length === 0) {
    return (
      <div className="gemini-card p-6 text-center text-mist-400">
        暂无估值指标数据
      </div>
    );
  }

  const latestMetrics = keyMetrics[0];
  const latestMetricsTTM = keyMetricsTTM?.[0];
  const latestRatios = financialRatios?.[0];
  const latestRatiosTTM = financialRatiosTTM?.[0];

  // 指标卡片组件（带 tooltip）
  const MetricCard = ({
    label,
    value,
    format,
    icon: Icon,
    metricKey,
    highlight = false,
    highlightColor = 'gemini-blue',
  }: {
    label: string;
    value: number | undefined | null;
    format: (val: number | undefined | null) => string;
    icon: any;
    metricKey?: string;
    highlight?: boolean;
    highlightColor?: string;
  }) => {
    if (value === undefined || value === null || isNaN(value)) {
      return null;
    }

    const desc = metricKey ? metricDescriptions[metricKey] : null;
    const showTooltip = desc && hoveredMetric === metricKey;

    return (
      <div
        className={`relative p-4 rounded-xl bg-white/5 border ${highlight ? `border-${highlightColor}/30` : 'border-white/5'} max-md:border-0 group cursor-help transition-all hover:bg-white/10`}
        onMouseEnter={() => metricKey && setHoveredMetric(metricKey)}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        <div className="flex items-center gap-2 mb-2 text-mist-400">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        <p className={`text-lg md:text-xl font-bold font-mono ${highlight ? `text-${highlightColor}` : 'text-white'} whitespace-nowrap`}>
          {format(value)}
        </p>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[calc(100vw-2rem)] p-4 bg-midnight border border-white/20 rounded-lg shadow-xl text-xs text-mist-200 leading-relaxed pointer-events-none">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-glacier-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white mb-1">{desc.title}</p>
                <p className="text-mist-300">{desc.description}</p>
              </div>
            </div>
            {desc.insight && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex items-start gap-2">
                  <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-200/80">{desc.insight}</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
          </div>
        )}
      </div>
    );
  };

  // 1. 核心风控与综合评分 - 使用 FinancialScoresDisplay 组件
  const renderCoreRiskScores = () => {
    if (!financialScores) return null;
    return <FinancialScoresDisplay financialScores={financialScores} />;
  };

  // 2. 估值指标 (Valuation Metrics)
  const renderValuationMetrics = () => {
    const metrics = [
      {
        label: '市盈率 (TTM)',
        value: latestRatiosTTM?.peRatioTTM,
        format: formatRatio,
        icon: Calculator,
        metricKey: 'peRatioTTM',
      },
      {
        label: 'EV/EBITDA',
        value: latestRatiosTTM?.enterpriseValueMultipleTTM || latestRatiosTTM?.evToEBITDATTM,
        format: formatRatio,
        icon: BarChart3,
        metricKey: 'evToEBITDATTM',
      },
      {
        label: '盈利收益率',
        value: latestRatiosTTM?.earningsYieldTTM,
        format: formatPercent,
        icon: Percent,
        metricKey: 'earningsYieldTTM',
      },
      {
        label: 'FCF 收益率',
        value: latestRatiosTTM?.freeCashFlowYieldTTM,
        format: formatPercent,
        icon: Zap,
        metricKey: 'freeCashFlowYieldTTM',
        highlight: true,
      },
      {
        label: '格雷厄姆数字',
        value: latestMetrics.grahamNumber,
        format: formatCurrency,
        icon: Target,
        metricKey: 'grahamNumber',
      },
      {
        label: '企业价值 (EV)',
        value: latestMetrics.enterpriseValue,
        format: formatCurrency,
        icon: Building2,
        metricKey: 'enterpriseValue',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-glacier-500 rounded-full"></span>
              估值指标
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              "现在买贵不贵？" —— 解决定价问题
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-mist-500">
            <Clock className="w-3 h-3" />
            <span>Ratios TTM + Key Metrics</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 3. 盈利能力 (Profitability)
  const renderProfitabilityMetrics = () => {
    const metrics = [
      {
        label: '毛利率',
        value: latestRatios?.grossProfitMargin,
        format: formatPercent,
        icon: TrendingUp,
        metricKey: 'grossProfitMargin',
      },
      {
        label: '净利率',
        value: latestRatios?.netProfitMargin,
        format: formatPercent,
        icon: DollarSign,
        metricKey: 'netProfitMargin',
      },
      {
        label: 'ROE',
        value: latestMetricsTTM?.roeTTM || latestMetrics.roe,
        format: formatPercent,
        icon: Target,
        metricKey: 'returnOnEquity',
        highlight: (latestMetricsTTM?.roeTTM || latestMetrics.roe) > 0.15,
      },
      {
        label: 'ROIC',
        value: latestMetricsTTM?.roicTTM || latestMetrics.roic,
        format: formatPercent,
        icon: Shield,
        metricKey: 'returnOnInvestedCapital',
        highlight: (latestMetricsTTM?.roicTTM || latestMetrics.roic) > 0.15,
        highlightColor: 'gemini-green',
      },
      {
        label: '收益质量',
        value: latestMetrics.incomeQuality,
        format: formatRatio,
        icon: Activity,
        metricKey: 'incomeQuality',
        highlight: latestMetrics.incomeQuality > 1,
        highlightColor: 'gemini-green',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    const roicValue = latestMetricsTTM?.roicTTM || latestMetrics.roic;
    const roicStrong = roicValue && (Math.abs(roicValue) > 1 ? roicValue : roicValue * 100) > 15;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-gemini-blue rounded-full"></span>
              盈利能力
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              "赚钱能力强不强？"
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-mist-500">
            <Clock className="w-3 h-3" />
            <span>Financial Ratios</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>

        {roicStrong && (
          <div className="p-4 bg-gemini-green/10 border border-gemini-green/20 rounded-lg">
            <div className="flex items-center gap-2 text-gemini-green text-sm mb-1">
              <Shield className="w-4 h-4" />
              <span className="font-medium">护城河信号</span>
            </div>
            <p className="text-xs text-mist-300">
              ROIC {">"} 15%，说明公司具有较深的护城河。
            </p>
          </div>
        )}
      </div>
    );
  };

  // 4. 运营效率与周期 (Efficiency & Cycle)
  const renderEfficiencyMetrics = () => {
    const ccc = latestMetricsTTM?.cashConversionCycleTTM || latestRatios?.cashConversionCycle;

    const metrics = [
      {
        label: '现金循环周期',
        value: ccc,
        format: formatDays,
        icon: Zap,
        metricKey: 'cashConversionCycle',
        highlight: ccc && ccc < 0,
        highlightColor: 'gemini-green',
      },
      {
        label: '库存周转天数',
        value: latestMetricsTTM?.daysOfInventoryOutstandingTTM || latestMetrics.daysOfInventoryOnHand,
        format: formatDays,
        icon: Activity,
        metricKey: 'daysOfInventoryOutstanding',
      },
      {
        label: '应付账款天数',
        value: latestMetricsTTM?.daysOfPayablesOutstandingTTM || latestMetrics.daysPayablesOutstanding,
        format: formatDays,
        icon: TrendingDown,
        metricKey: 'daysOfPayablesOutstanding',
      },
      {
        label: '总资产周转率',
        value: latestRatiosTTM?.assetTurnoverTTM || latestRatios?.assetTurnover,
        format: formatRatio,
        icon: BarChart3,
        metricKey: 'assetTurnover',
      },
      {
        label: '库存周转率',
        value: latestRatiosTTM?.inventoryTurnoverTTM || latestRatios?.inventoryTurnover,
        format: formatRatio,
        icon: Activity,
        metricKey: 'inventoryTurnover',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    const cccNegative = ccc && ccc < 0;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
              运营效率与周期
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              "生意做得顺不顺，资金占用久不久？"
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-mist-500">
            <Clock className="w-3 h-3" />
            <span>Key Metrics TTM</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>

        {cccNegative && (
          <div className="p-4 bg-gemini-green/10 border border-gemini-green/20 rounded-lg">
            <div className="flex items-center gap-2 text-gemini-green text-sm mb-1">
              <Zap className="w-4 h-4" />
              <span className="font-medium">极强供应链话语权</span>
            </div>
            <p className="text-xs text-mist-300">
              现金循环周期为负，意味着公司还没给供应商付钱，就已经把货卖给消费者并收到钱了！
            </p>
          </div>
        )}
      </div>
    );
  };

  // 5. 资本结构与开支 (Capital Structure & Expenses)
  const renderCapitalExpenseMetrics = () => {
    const metrics = [
      {
        label: '研发占比',
        value: latestMetricsTTM?.researchAndDevelopementToRevenueTTM || latestMetrics.researchAndDdevelopementToRevenue,
        format: formatPercent,
        icon: Zap,
        metricKey: 'researchAndDevelopementToRevenue',
      },
      {
        label: '资本开支占比',
        value: latestMetricsTTM?.capexToRevenueTTM || latestMetrics.capexToRevenue,
        format: formatPercent,
        icon: Building2,
        metricKey: 'capexToRevenue',
      },
      {
        label: '股权激励占比',
        value: latestMetricsTTM?.stockBasedCompensationToRevenueTTM || latestMetrics.stockBasedCompensationToRevenue,
        format: formatPercent,
        icon: AlertTriangle,
        metricKey: 'stockBasedCompensationToRevenue',
        highlight: (latestMetricsTTM?.stockBasedCompensationToRevenueTTM || latestMetrics.stockBasedCompensationToRevenue) > 0.1,
        highlightColor: 'gemini-red',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              资本结构与开支
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              "钱花哪儿了，未来的增长动力在哪？"
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-mist-500">
            <Clock className="w-3 h-3" />
            <span>Key Metrics TTM</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 6. 股东回报 (Shareholder Returns)
  const renderShareholderReturns = () => {
    const metrics = [
      {
        label: '股息率',
        value: latestRatios?.dividendYield,
        format: formatPercent,
        icon: Gift,
        metricKey: 'dividendYield',
      },
      {
        label: '派息率',
        value: latestRatios?.payoutRatio || latestMetrics.payoutRatio,
        format: formatPercent,
        icon: CircleDollarSign,
        metricKey: 'dividendPayoutRatio',
      },
      {
        label: '每股自由现金流',
        value: latestMetrics.freeCashFlowPerShare,
        format: formatCurrency,
        icon: DollarSign,
        metricKey: 'freeCashFlowPerShare',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              股东回报
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              "散户能分到多少钱？"
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-mist-500">
            <Clock className="w-3 h-3" />
            <span>Financial Ratios + Key Metrics</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 趋势图表 - 展示关键指标的历史趋势
  const renderTrendCharts = () => {
    if (keyMetrics.length < 2) return null;

    const years = keyMetrics.map(m => m.calendarYear || m.fiscalYear || m.date?.split('-')[0] || '').reverse();
    const evToEbitda = keyMetrics.map(m => m.enterpriseValueOverEBITDA || 0).reverse();
    const roe = keyMetrics.map(m => (m.roe || 0) * 100).reverse();
    const roic = keyMetrics.map(m => (m.roic || 0) * 100).reverse();

    const colors = {
      evToEbitda: '#64948b',
      roe: '#7a8494',
      roic: '#948a6a',
    };

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['EV/EBITDA', 'ROE (%)', 'ROIC (%)'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '60px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: [
        {
          type: 'value',
          name: '倍数',
          nameTextStyle: { color: '#64748b' },
          axisLine: { show: false },
          axisLabel: { color: '#64748b' },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '百分比 (%)',
          nameTextStyle: { color: '#64748b' },
          axisLine: { show: false },
          axisLabel: { color: '#64748b', formatter: (v: number) => `${v}%` },
          splitLine: { show: false },
        },
      ],
      series: [
        { name: 'EV/EBITDA', type: 'line', data: evToEbitda, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.evToEbitda }, symbol: 'circle', symbolSize: 6 },
        { name: 'ROE (%)', type: 'line', yAxisIndex: 1, data: roe, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.roe }, symbol: 'circle', symbolSize: 6 },
        { name: 'ROIC (%)', type: 'line', yAxisIndex: 1, data: roic, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.roic }, symbol: 'circle', symbolSize: 6 },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gemini-purple rounded-full"></span>
          关键指标趋势
        </h3>
        <ReactECharts option={option} style={{ height: '300px' }} />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 核心风控与综合评分 */}
      {renderCoreRiskScores()}

      {/* 2. 估值指标 */}
      {renderValuationMetrics()}

      {/* 3. 盈利能力 */}
      {renderProfitabilityMetrics()}

      {/* 4. 运营效率与周期 */}
      {renderEfficiencyMetrics()}

      {/* 5. 资本结构与开支 */}
      {renderCapitalExpenseMetrics()}

      {/* 6. 股东回报 */}
      {renderShareholderReturns()}
    </div>
  );
}
