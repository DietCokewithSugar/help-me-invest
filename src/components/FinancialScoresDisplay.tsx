'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Shield, TrendingUp, AlertTriangle, Info, DollarSign, Building2, Zap, PiggyBank } from 'lucide-react';
import type { FinancialScores } from '@/types';

interface Props {
  financialScores: FinancialScores;
}

// 指标说明映射
const scoreDescriptions: Record<string, { title: string; description: string; interpretation?: string }> = {
  altmanZScore: {
    title: '奥特曼 Z-Score（破产预测模型）',
    description: '用来预测一家公司在未来 2 年内是否会破产的概率。由纽约大学教授 Edward Altman 于 1968 年提出，是金融界最经典的破产预测模型之一。',
    interpretation: '< 1.8：危险区（Distress Zone），破产风险很高\n1.8 - 3.0：灰色区域（Grey Zone），有一定风险\n> 3.0：安全区（Safe Zone），财务非常健康',
  },
  piotroskiScore: {
    title: '皮奥特罗斯基 F-Score（财务改善模型）',
    description: '这是一个 0 到 9 的打分系统，用来衡量公司的财务状况是正在变好还是正在变坏。它考察 9 个维度（盈利、杠杆、运营效率等），每满足一项得 1 分。',
    interpretation: '0-2 分：基本面很差，或者正在恶化\n3-6 分：普通\n7-9 分：优秀，说明公司的盈利能力、偿债能力和运营效率都在提升',
  },
  workingCapital: {
    title: '营运资金',
    description: '流动资产 - 流动负债。代表公司短期内可用于运营的资金。负值意味着公司依靠占用供应商资金来运营，这对于强势公司（如苹果）通常不是问题。',
  },
  totalAssets: {
    title: '总资产',
    description: '公司拥有的所有资产总额，包括现金、应收账款、存货、固定资产、无形资产等。代表公司的整体规模。',
  },
  retainedEarnings: {
    title: '留存收益',
    description: '公司历年累计的净利润减去分红后的金额。负值通常出现在进行大量股票回购的公司，这不是亏损的标志，而是疯狂回报股东的标志。',
  },
  ebit: {
    title: '息税前利润（EBIT）',
    description: '衡量核心业务赚钱能力的绝对值。排除了利息和税收的影响，更能反映公司主营业务的真实盈利能力。',
  },
  marketCap: {
    title: '市值',
    description: '股价 × 总股本。在 Z-Score 模型中，市值非常重要。如果股价很高，说明市场看好，破产概率自然就低。',
  },
  totalLiabilities: {
    title: '总负债',
    description: '公司欠的所有钱，包括短期负债（应付账款、短期借款等）和长期负债（长期贷款、债券等）。',
  },
  revenue: {
    title: '营收',
    description: '公司在一定时期内销售商品或提供服务获得的总收入。是衡量公司规模和增长的重要指标。',
  },
};

// 获取 Z-Score 区域信息
function getZScoreZone(score: number): { zone: string; color: string; bgColor: string; description: string } {
  if (score < 1.8) {
    return {
      zone: '危险区',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      description: '破产风险较高，需要警惕',
    };
  } else if (score < 3.0) {
    return {
      zone: '灰色区域',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      description: '有一定风险，需要关注',
    };
  } else {
    return {
      zone: '安全区',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      description: '财务非常健康',
    };
  }
}

// 获取 F-Score 等级信息
function getFScoreGrade(score: number): { grade: string; color: string; bgColor: string; description: string } {
  if (score <= 2) {
    return {
      grade: '较差',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      description: '基本面很差或正在恶化',
    };
  } else if (score <= 6) {
    return {
      grade: '普通',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      description: '财务状况一般',
    };
  } else {
    return {
      grade: '优秀',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      description: '盈利能力、偿债能力和运营效率都在提升',
    };
  }
}

export default function FinancialScoresDisplay({ financialScores }: Props) {
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

  const zScoreInfo = getZScoreZone(financialScores.altmanZScore);
  const fScoreInfo = getFScoreGrade(financialScores.piotroskiScore);

  // Z-Score 仪表盘配置
  const zScoreGaugeOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 12,
        splitNumber: 6,
        itemStyle: {
          color: financialScores.altmanZScore < 1.8
            ? '#ef4444'
            : financialScores.altmanZScore < 3.0
              ? '#f59e0b'
              : '#10b981',
        },
        progress: {
          show: true,
          roundCap: true,
          width: 12,
        },
        pointer: {
          show: false,
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 12,
            color: [[1, 'rgba(255,255,255,0.1)']],
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        title: {
          show: false,
        },
        detail: {
          fontSize: 28,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: '#fff',
          offsetCenter: [0, 0],
          formatter: (value: number) => value.toFixed(2),
        },
        data: [{ value: Math.min(financialScores.altmanZScore, 12) }],
      },
      // 区域标记
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 12,
        z: 1,
        itemStyle: { color: 'transparent' },
        progress: { show: false },
        pointer: { show: false },
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [1.8 / 12, 'rgba(239, 68, 68, 0.15)'],
              [3.0 / 12, 'rgba(245, 158, 11, 0.15)'],
              [1, 'rgba(16, 185, 129, 0.15)'],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
      },
    ],
  };

  // F-Score 柱状图配置
  const fScoreBarOption = {
    backgroundColor: 'transparent',
    grid: {
      left: 0,
      right: 0,
      top: 20,
      bottom: 20,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: [''],
      show: false,
    },
    yAxis: {
      type: 'value',
      max: 9,
      show: false,
    },
    series: [
      {
        type: 'bar',
        data: [financialScores.piotroskiScore],
        barWidth: '100%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 1,
            x2: 0,
            y2: 0,
            colorStops: [
              { offset: 0, color: financialScores.piotroskiScore <= 2 ? '#ef4444' : financialScores.piotroskiScore <= 6 ? '#f59e0b' : '#10b981' },
              { offset: 1, color: financialScores.piotroskiScore <= 2 ? '#dc2626' : financialScores.piotroskiScore <= 6 ? '#d97706' : '#059669' },
            ],
          },
          borderRadius: [8, 8, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 28,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: '#fff',
          formatter: '{c}/9',
        },
        backgroundStyle: {
          color: 'rgba(255,255,255,0.05)',
          borderRadius: [8, 8, 0, 0],
        },
        showBackground: true,
      },
    ],
  };

  // 紧凑的指标行组件（带 tooltip）
  const CompactMetricRow = ({
    label,
    value,
    metricKey,
    highlight = false,
    highlightColor = 'text-white',
  }: {
    label: string;
    value: string;
    metricKey?: string;
    highlight?: boolean;
    highlightColor?: string;
  }) => {
    const desc = metricKey ? scoreDescriptions[metricKey] : null;
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

  // 计算因子数据 - 分组为三列
  const assetMetrics = [
    {
      label: '总资产',
      value: formatNumber(financialScores.totalAssets),
      metricKey: 'totalAssets',
    },
    {
      label: '市值',
      value: formatNumber(financialScores.marketCap),
      metricKey: 'marketCap',
    },
    {
      label: '营收',
      value: formatNumber(financialScores.revenue),
      metricKey: 'revenue',
    },
  ];

  const profitMetrics = [
    {
      label: '留存收益',
      value: formatNumber(financialScores.retainedEarnings),
      metricKey: 'retainedEarnings',
      highlight: financialScores.retainedEarnings < 0,
      highlightColor: 'text-amber-400',
    },
    {
      label: '息税前利润 (EBIT)',
      value: formatNumber(financialScores.ebit),
      metricKey: 'ebit',
    },
  ];

  const liabilityMetrics = [
    {
      label: '营运资金',
      value: formatNumber(financialScores.workingCapital),
      metricKey: 'workingCapital',
      highlight: financialScores.workingCapital < 0,
      highlightColor: 'text-amber-400',
    },
    {
      label: '总负债',
      value: formatNumber(financialScores.totalLiabilities),
      metricKey: 'totalLiabilities',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 核心评分区域 */}
      <div className="gemini-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-glacier-500 rounded-full" />
          <h3 className="text-lg font-semibold text-white">财务健康评分</h3>
          <span className="text-xs text-mist-500 bg-white/5 px-2 py-1 rounded-full">量化投资核心指标</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Altman Z-Score */}
          <div
            className="relative p-6 rounded-xl bg-white/5 border border-white/5 cursor-help"
            onMouseEnter={() => setHoveredMetric('altmanZScore')}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-glacier-400" />
                <span className="font-semibold text-white">Altman Z-Score</span>
                <Info className="w-3.5 h-3.5 text-mist-500" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${zScoreInfo.bgColor} ${zScoreInfo.color}`}>
                {zScoreInfo.zone}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <ReactECharts option={zScoreGaugeOption} style={{ height: '100%', width: '100%' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-mist-400 mb-3">{zScoreInfo.description}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-mist-500">&lt; 1.8 危险区</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-mist-500">1.8 - 3.0 灰色区域</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-mist-500">&gt; 3.0 安全区</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Z-Score Tooltip */}
            {hoveredMetric === 'altmanZScore' && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-w-[calc(100vw-2rem)] p-4 bg-midnight border border-white/20 rounded-xl shadow-2xl text-xs pointer-events-none">
                <div className="flex items-start gap-2 mb-2">
                  <Shield className="w-4 h-4 text-glacier-400 shrink-0 mt-0.5" />
                  <p className="font-semibold text-white text-sm">{scoreDescriptions.altmanZScore.title}</p>
                </div>
                <p className="text-mist-300 leading-relaxed mb-3">{scoreDescriptions.altmanZScore.description}</p>
                <div className="p-2 bg-white/5 rounded-lg">
                  <p className="text-mist-400 whitespace-pre-line">{scoreDescriptions.altmanZScore.interpretation}</p>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
              </div>
            )}
          </div>

          {/* Piotroski F-Score */}
          <div
            className="relative p-6 rounded-xl bg-white/5 border border-white/5 cursor-help"
            onMouseEnter={() => setHoveredMetric('piotroskiScore')}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gemini-blue" />
                <span className="font-semibold text-white">Piotroski F-Score</span>
                <Info className="w-3.5 h-3.5 text-mist-500" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${fScoreInfo.bgColor} ${fScoreInfo.color}`}>
                {fScoreInfo.grade}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-24 h-32">
                <ReactECharts option={fScoreBarOption} style={{ height: '100%', width: '100%' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-mist-400 mb-3">{fScoreInfo.description}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-mist-500">0-2 分：较差</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-mist-500">3-6 分：普通</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-mist-500">7-9 分：优秀</span>
                  </div>
                </div>
              </div>
            </div>

            {/* F-Score Tooltip */}
            {hoveredMetric === 'piotroskiScore' && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-w-[calc(100vw-2rem)] p-4 bg-midnight border border-white/20 rounded-xl shadow-2xl text-xs pointer-events-none">
                <div className="flex items-start gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gemini-blue shrink-0 mt-0.5" />
                  <p className="font-semibold text-white text-sm">{scoreDescriptions.piotroskiScore.title}</p>
                </div>
                <p className="text-mist-300 leading-relaxed mb-3">{scoreDescriptions.piotroskiScore.description}</p>
                <div className="p-2 bg-white/5 rounded-lg">
                  <p className="text-mist-400 whitespace-pre-line">{scoreDescriptions.piotroskiScore.interpretation}</p>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 计算因子区域 - 紧凑 3 列布局 */}
      <div className="gemini-card p-6 md:p-8">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          计算因子
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <MetricColumn title="资产规模" metrics={assetMetrics} />
          <MetricColumn title="盈利水平" metrics={profitMetrics} />
          <MetricColumn title="负债情况" metrics={liabilityMetrics} />
        </div>
      </div>
    </div>
  );
}
