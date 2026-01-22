'use client';

import { Info, Zap } from 'lucide-react';
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
      <div className="bg-white/5 border border-white/10 rounded-md p-6 text-center text-mist-400 font-mono text-sm">
        暂无估值指标数据
      </div>
    );
  }

  const latestMetrics = keyMetrics[0];
  const latestMetricsTTM = keyMetricsTTM?.[0];
  const latestRatios = financialRatios?.[0];
  const latestRatiosTTM = financialRatiosTTM?.[0];

  // 紧凑的指标行组件（带 tooltip）
  const CompactMetricRow = ({
    label,
    value,
    metricKey,
    highlight = false,
    highlightColor = 'text-glacier-400',
  }: {
    label: string;
    value: string;
    metricKey?: string;
    highlight?: boolean;
    highlightColor?: string;
  }) => {
    const desc = metricKey ? metricDescriptions[metricKey] : null;
    const showTooltip = desc && hoveredMetric === metricKey;

    return (
      <div
        className="relative flex justify-between items-center py-1.5 group cursor-help"
        onMouseEnter={() => metricKey && setHoveredMetric(metricKey)}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        <span className="text-mist-400 text-sm group-hover:text-mist-300 transition-colors">
          {label}
        </span>
        <span className={`font-mono text-sm font-medium ${highlight ? highlightColor : 'text-white'}`}>
          {value}
        </span>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full right-0 mb-2 w-72 max-w-[calc(100vw-2rem)] p-4 bg-midnight border border-white/20 rounded-lg shadow-xl text-xs text-mist-200 leading-relaxed pointer-events-none">
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
            <div className="absolute bottom-0 right-4 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
          </div>
        )}
      </div>
    );
  };

  // 指标列组件
  const MetricColumn = ({
    title,
    metrics,
  }: {
    title: string;
    metrics: { label: string; value: string; metricKey?: string; highlight?: boolean; highlightColor?: string }[];
  }) => {
    const validMetrics = metrics.filter(m => m.value !== 'N/A');
    if (validMetrics.length === 0) return null;

    return (
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold text-sm mb-3 pb-2 border-b border-white/10">{title}</h4>
        <div className="space-y-0.5">
          {validMetrics.map((m, i) => (
            <CompactMetricRow key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 1. 核心风控与综合评分 - 使用 FinancialScoresDisplay 组件
  const renderCoreRiskScores = () => {
    if (!financialScores) return null;
    return <FinancialScoresDisplay financialScores={financialScores} />;
  };

  // 2. 主要财务指标 - 紧凑 3 列布局
  const renderFundamentals = () => {
    // 估值指标列
    const valuationMetrics = [
      {
        label: '市盈率 (TTM)',
        value: formatRatio(latestRatiosTTM?.peRatioTTM),
        metricKey: 'peRatioTTM',
      },
      {
        label: 'EV/EBITDA',
        value: formatRatio(latestRatiosTTM?.enterpriseValueMultipleTTM || latestRatiosTTM?.evToEBITDATTM),
        metricKey: 'evToEBITDATTM',
      },
      {
        label: '盈利收益率',
        value: formatPercent(latestRatiosTTM?.earningsYieldTTM),
        metricKey: 'earningsYieldTTM',
      },
      {
        label: 'FCF 收益率',
        value: formatPercent(latestRatiosTTM?.freeCashFlowYieldTTM),
        metricKey: 'freeCashFlowYieldTTM',
        highlight: true,
        highlightColor: 'text-glacier-400',
      },
      {
        label: '格雷厄姆数字',
        value: formatCurrency(latestMetrics.grahamNumber),
        metricKey: 'grahamNumber',
      },
      {
        label: '企业价值 (EV)',
        value: formatCurrency(latestMetrics.enterpriseValue),
        metricKey: 'enterpriseValue',
      },
    ];

    // 盈利能力列
    const profitabilityMetrics = [
      {
        label: '毛利率',
        value: formatPercent(latestRatios?.grossProfitMargin),
        metricKey: 'grossProfitMargin',
      },
      {
        label: '净利率',
        value: formatPercent(latestRatios?.netProfitMargin),
        metricKey: 'netProfitMargin',
      },
      {
        label: 'ROE',
        value: formatPercent(latestMetricsTTM?.roeTTM || latestMetrics.roe),
        metricKey: 'returnOnEquity',
        highlight: (latestMetricsTTM?.roeTTM || latestMetrics.roe) > 0.15,
        highlightColor: 'text-gemini-green',
      },
      {
        label: 'ROIC',
        value: formatPercent(latestMetricsTTM?.roicTTM || latestMetrics.roic),
        metricKey: 'returnOnInvestedCapital',
        highlight: (latestMetricsTTM?.roicTTM || latestMetrics.roic) > 0.15,
        highlightColor: 'text-gemini-green',
      },
      {
        label: '收益质量',
        value: formatRatio(latestMetrics.incomeQuality),
        metricKey: 'incomeQuality',
        highlight: latestMetrics.incomeQuality > 1,
        highlightColor: 'text-gemini-green',
      },
    ];

    // 效率与周期列
    const ccc = latestMetricsTTM?.cashConversionCycleTTM || latestRatios?.cashConversionCycle;
    const efficiencyMetrics = [
      {
        label: '现金循环周期',
        value: formatDays(ccc),
        metricKey: 'cashConversionCycle',
        highlight: ccc && ccc < 0,
        highlightColor: 'text-gemini-green',
      },
      {
        label: '库存周转天数',
        value: formatDays(latestMetricsTTM?.daysOfInventoryOutstandingTTM || latestMetrics.daysOfInventoryOnHand),
        metricKey: 'daysOfInventoryOutstanding',
      },
      {
        label: '应付账款天数',
        value: formatDays(latestMetricsTTM?.daysOfPayablesOutstandingTTM || latestMetrics.daysPayablesOutstanding),
        metricKey: 'daysOfPayablesOutstanding',
      },
      {
        label: '总资产周转率',
        value: formatRatio(latestRatiosTTM?.assetTurnoverTTM),
        metricKey: 'assetTurnover',
      },
      {
        label: '库存周转率',
        value: formatRatio(latestRatiosTTM?.inventoryTurnoverTTM),
        metricKey: 'inventoryTurnover',
      },
    ];

    // 检查是否有任何有效数据
    const hasValuation = valuationMetrics.some(m => m.value !== 'N/A');
    const hasProfitability = profitabilityMetrics.some(m => m.value !== 'N/A');
    const hasEfficiency = efficiencyMetrics.some(m => m.value !== 'N/A');

    if (!hasValuation && !hasProfitability && !hasEfficiency) return null;

    if (!hasValuation && !hasProfitability && !hasEfficiency) return null;

    return (
      <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md">
        <h3 className="text-sm font-semibold text-mist-200 mb-6 flex items-center gap-2">
          <span className="w-1 h-4 bg-glacier-500 rounded-sm"></span>
          财务指标
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <MetricColumn title="估值" metrics={valuationMetrics} />
          <MetricColumn title="盈利能力" metrics={profitabilityMetrics} />
          <MetricColumn title="效率与周期" metrics={efficiencyMetrics} />
        </div>
      </div>
    );
  };

  // 3. 资本结构与股东回报 - 紧凑 2 列布局
  const renderCapitalAndReturns = () => {
    // 资本结构列
    const capitalMetrics = [
      {
        label: '研发占比',
        value: formatPercent(latestMetricsTTM?.researchAndDevelopementToRevenueTTM || latestMetrics.researchAndDdevelopementToRevenue),
        metricKey: 'researchAndDevelopementToRevenue',
      },
      {
        label: '资本开支占比',
        value: formatPercent(latestMetricsTTM?.capexToRevenueTTM || latestMetrics.capexToRevenue),
        metricKey: 'capexToRevenue',
      },
      {
        label: '股权激励占比',
        value: formatPercent(latestMetricsTTM?.stockBasedCompensationToRevenueTTM || latestMetrics.stockBasedCompensationToRevenue),
        metricKey: 'stockBasedCompensationToRevenue',
        highlight: (latestMetricsTTM?.stockBasedCompensationToRevenueTTM || latestMetrics.stockBasedCompensationToRevenue) > 0.1,
        highlightColor: 'text-gemini-red',
      },
    ];

    // 股东回报列
    const returnMetrics = [
      {
        label: '股息率',
        value: formatPercent(latestRatios?.dividendYield),
        metricKey: 'dividendYield',
      },
      {
        label: '派息率',
        value: formatPercent(latestMetrics?.payoutRatio),
        metricKey: 'dividendPayoutRatio',
      },
      {
        label: '每股自由现金流',
        value: formatCurrency(latestMetrics.freeCashFlowPerShare),
        metricKey: 'freeCashFlowPerShare',
      },
    ];

    // 检查是否有任何有效数据
    const hasCapital = capitalMetrics.some(m => m.value !== 'N/A');
    const hasReturns = returnMetrics.some(m => m.value !== 'N/A');

    if (!hasCapital && !hasReturns) return null;

    return (
      <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md">
        <h3 className="text-sm font-semibold text-mist-200 mb-6 flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-500 rounded-sm"></span>
          资本与回报
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <MetricColumn title="资本结构" metrics={capitalMetrics} />
          <MetricColumn title="股东回报" metrics={returnMetrics} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 核心风控与综合评分 */}
      {renderCoreRiskScores()}

      {/* 2. 财务指标 - 紧凑 3 列布局 */}
      {renderFundamentals()}

      {/* 3. 资本与回报 - 紧凑 2 列布局 */}
      {renderCapitalAndReturns()}
    </div>
  );
}
