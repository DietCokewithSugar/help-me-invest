'use client';

import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  DollarSign, TrendingUp, Target, Percent, Activity, Shield, 
  Zap, Building2, Calculator, PiggyBank, BarChart3, Info,
  Clock, ArrowUpRight, ArrowDownRight, CircleDot, AlertTriangle
} from 'lucide-react';

interface FinancialRatiosTTM {
  symbol?: string;
  // 动态估值指标
  marketCap?: number;
  enterpriseValueTTM?: number;
  evToEBITDATTM?: number;
  evToSalesTTM?: number;
  earningsYieldTTM?: number;
  freeCashFlowYieldTTM?: number;
  
  // 真实盈利能力
  returnOnEquityTTM?: number;
  returnOnInvestedCapitalTTM?: number;
  returnOnAssetsTTM?: number;
  incomeQualityTTM?: number;
  
  // 运营效率
  daysOfInventoryOutstandingTTM?: number;
  daysOfSalesOutstandingTTM?: number;
  daysOfPayablesOutstandingTTM?: number;
  cashConversionCycleTTM?: number;
  operatingCycleTTM?: number;
  
  // 财务健康
  currentRatioTTM?: number;
  netDebtToEBITDATTM?: number;
  interestBurdenTTM?: number;
  taxBurdenTTM?: number;
  workingCapitalTTM?: number;
  
  // 资本配置
  researchAndDevelopementToRevenueTTM?: number;
  capexToRevenueTTM?: number;
  capexToOperatingCashFlowTTM?: number;
  stockBasedCompensationToRevenueTTM?: number;
  
  // 深度价值模型
  grahamNumberTTM?: number;
  tangibleAssetValueTTM?: number;
  netCurrentAssetValueTTM?: number;
  
  // 可能的其他字段
  peRatioTTM?: number;
  pegRatioTTM?: number;
  priceToSalesRatioTTM?: number;
  dividendYieldTTM?: number;
  dividendPerShareTTM?: number;
  payoutRatioTTM?: number;
  grossProfitMarginTTM?: number;
  operatingProfitMarginTTM?: number;
  netProfitMarginTTM?: number;
  debtRatioTTM?: number;
  debtEquityRatioTTM?: number;
  quickRatioTTM?: number;
  cashRatioTTM?: number;
  priceToBookRatioTTM?: number;
  priceToFreeCashFlowsRatioTTM?: number;
}

interface Props {
  financialRatiosTTM: FinancialRatiosTTM[];
  // 用于检查重复的现有数据
  keyMetrics?: any[];
  financialRatios?: any[];
}

// 指标说明映射 - 根据用户提供的详细说明
const ttmDescriptions: Record<string, { title: string; description: string; insight?: string }> = {
  // 动态估值指标
  marketCap: {
    title: '市值 (Market Cap)',
    description: '当前的股价 × 总股本。代表购买该公司所有流通股票所需的总金额。',
    insight: '市值是衡量公司规模最直观的指标。'
  },
  enterpriseValueTTM: {
    title: '企业价值 (EV)',
    description: '市值 + 总债务 - 现金。代表收购整家公司需要付出的真实成本。',
    insight: '如果 EV < 市值，说明公司账上现金比债务还多，这是极其健康的信号。'
  },
  evToEBITDATTM: {
    title: 'EV/EBITDA',
    description: '企业价值倍数。比 PE 更纯粹的估值指标，剔除了各国税率和公司杠杆的影响。',
    insight: '通常 10-15 倍为合理区间，低于 10 可能被低估，高于 20 可能偏贵。'
  },
  evToSalesTTM: {
    title: 'EV/营收',
    description: '市销率。每 1 块钱营收对应多少块钱的企业价值。',
    insight: '适用于尚未盈利或利润波动大的公司估值。'
  },
  earningsYieldTTM: {
    title: '盈利收益率',
    description: '相当于 PE 的倒数 (1/PE)。代表按当前价格买入，理论上每年的利润回报率。',
    insight: '可以和国债收益率对比，如果盈利收益率高于国债，股票相对有吸引力。'
  },
  freeCashFlowYieldTTM: {
    title: '自由现金流收益率',
    description: '自由现金流 / 市值。代表公司真正赚到手、可以分给股东的钱的收益率。',
    insight: '如果高于盈利收益率，说明公司赚到的真金白银比账面利润还多，含金量极高！'
  },
  
  // 真实盈利能力
  returnOnEquityTTM: {
    title: 'ROE (净资产收益率)',
    description: '净利润 / 股东权益。衡量股东每投入1块钱能赚多少钱。',
    insight: '连续5年 >15% 的公司通常具有稳定的竞争优势。超过 25% 是非常出色的表现。'
  },
  returnOnInvestedCapitalTTM: {
    title: 'ROIC (投入资本回报率)',
    description: '这是巴菲特最爱的指标。衡量公司使用所有资本（股东权益 + 债务）创造利润的能力。',
    insight: '连续 5 年 TTM 数据都 >20%，说明公司具有"顶级护城河"。'
  },
  returnOnAssetsTTM: {
    title: 'ROA (总资产回报率)',
    description: '净利润 / 总资产。衡量所有资产（包括负债买的）的盈利能力。',
    insight: '不同行业差异大：银行通常 1-2%，科技公司可达 10% 以上。'
  },
  incomeQualityTTM: {
    title: '收益质量',
    description: '经营现金流 / 净利润。衡量账面利润中有多少是真金白银。',
    insight: '大于 1 说明利润没有注水，都是实打实的现金。持续小于 1 要警惕。'
  },
  
  // 运营效率
  daysOfInventoryOutstandingTTM: {
    title: '库存周转天数 (DIO)',
    description: '从生产出产品到卖掉，平均需要多少天。',
    insight: '越低越好，说明产品卖得快。要和同行业比较。'
  },
  daysOfSalesOutstandingTTM: {
    title: '应收账款天数 (DSO)',
    description: '卖出东西后，平均多少天能收到钱。',
    insight: '越低越好，说明回款能力强。高 DSO 可能意味着客户质量差或行业惯例。'
  },
  daysOfPayablesOutstandingTTM: {
    title: '应付账款天数 (DPO)',
    description: '欠供应商的钱，平均多少天才还。',
    insight: '越高越好，说明公司对供应商有议价能力，可以占用上游资金。'
  },
  cashConversionCycleTTM: {
    title: '现金循环周期 (CCC)',
    description: 'DIO + DSO - DPO。负数意味着公司还没给供应商付钱，就已经把货卖给消费者并收到钱了。',
    insight: '负数是极其强势的表现！这个指标如果哪天变成正数了，才是公司衰落的开始。'
  },
  operatingCycleTTM: {
    title: '营业周期',
    description: '从进货到收钱的总时长 (DIO + DSO)。',
    insight: '越短越好，说明资金周转效率高。'
  },
  
  // 财务健康
  currentRatioTTM: {
    title: '流动比率',
    description: '流动资产 / 流动负债。衡量短期偿债能力。',
    insight: '通常要求 >1，但对于强势企业（如苹果、沃尔玛），<1 是它们占用上下游资金的证明。'
  },
  netDebtToEBITDATTM: {
    title: '净债务/EBITDA',
    description: '公司不吃不喝大概多少年能还清所有净债务。',
    insight: '<1 非常安全，1-3 属于正常，>5 需要警惕债务风险。'
  },
  interestBurdenTTM: {
    title: '利息负担',
    description: '税前利润 / 息税前利润 (EBT/EBIT)。衡量利息支出占比。',
    insight: '越接近 1，说明利息支出占比越小，财务成本低。'
  },
  taxBurdenTTM: {
    title: '税收负担',
    description: '净利润 / 税前利润。反映公司的实际税率。',
    insight: '可以据此推算有效税率：1 - 税收负担 = 有效税率。'
  },
  workingCapitalTTM: {
    title: '营运资金',
    description: '流动资产 - 流动负债。',
    insight: '对于大多数公司，营运资金为负是危险信号。但对于强势企业，这是它们占用上下游资金的证明。'
  },
  
  // 资本配置
  researchAndDevelopementToRevenueTTM: {
    title: '研发占比',
    description: '研发支出 / 营收。每收入100块，花多少钱做研发。',
    insight: '决定了未来的增长潜力。科技公司通常 10-20%，传统行业 1-5%。'
  },
  capexToRevenueTTM: {
    title: '资本开支占比',
    description: '资本开支 / 营收。用于买厂房设备的钱占比。',
    insight: '低占比说明是轻资产模式，不需要一直花钱建厂就能维持生意。'
  },
  capexToOperatingCashFlowTTM: {
    title: '资本开支/经营现金流',
    description: '赚来的现金流有多少需要拿去再投入。',
    insight: '越低越好！剩下的钱可以分给股东。如果只有 10%，说明 90% 都可以自由支配。'
  },
  stockBasedCompensationToRevenueTTM: {
    title: '股权激励占比',
    description: '分给员工的股票占收入的比例。',
    insight: '太高会稀释股东权益。科技公司通常 3-8%，超过 10% 要警惕。'
  },
  
  // 深度价值模型
  grahamNumberTTM: {
    title: '格雷厄姆数字',
    description: '根据公式 √(22.5 × EPS × BVPS) 算出的"合理价格"。',
    insight: '只适合评估银行、工业等传统重资产行业。对于轻资产公司（如苹果），这个数字没有参考意义。'
  },
  tangibleAssetValueTTM: {
    title: '有形资产价值',
    description: '总资产减去无形资产和负债后的净值。',
    insight: '代表公司清算时最保守的估值下限。'
  },
  netCurrentAssetValueTTM: {
    title: '净流动资产价值',
    description: '流动资产 - 所有负债（NCAV）。',
    insight: '如果股价低于此值，可能是极度低估的"烟蒂股"机会。'
  },
  
  // 额外指标
  peRatioTTM: {
    title: 'PE 市盈率',
    description: '股价 / 每股收益。最常用的估值指标。',
    insight: '不同行业差异大，要和同行业比较。高增长公司 PE 通常较高。'
  },
  grossProfitMarginTTM: {
    title: '毛利率',
    description: '(营收 - 成本) / 营收。衡量产品的基础盈利能力。',
    insight: '高毛利率通常意味着品牌溢价或技术壁垒。'
  },
  operatingProfitMarginTTM: {
    title: '营业利润率',
    description: '营业利润 / 营收。扣除运营费用后的利润率。',
    insight: '反映公司运营效率和管理能力。'
  },
  netProfitMarginTTM: {
    title: '净利润率',
    description: '净利润 / 营收。最终到手的利润比例。',
    insight: '是综合盈利能力的最终体现。'
  },
  dividendYieldTTM: {
    title: '股息率',
    description: '每股股息 / 股价。年度分红收益率。',
    insight: '稳定的股息是公司成熟和健康的标志。'
  },
};

export default function FinancialRatiosTTMDisplay({
  financialRatiosTTM = [],
  keyMetrics = [],
  financialRatios = [],
}: Props) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  if (!financialRatiosTTM || financialRatiosTTM.length === 0) {
    return null;
  }

  const latestTTM = financialRatiosTTM[0];
  const latestMetrics = keyMetrics?.[0];
  const latestRatios = financialRatios?.[0];

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

  // 指标卡片组件（带 tooltip）
  const MetricCard = ({ 
    label, 
    value, 
    format, 
    icon: Icon, 
    metricKey,
    gradient = 'from-glacier-500/20 to-glacier-600/20',
    highlight = false,
    highlightColor = 'gemini-blue',
    suffix = '',
  }: { 
    label: string; 
    value: number | undefined | null; 
    format: (val: number | undefined | null) => string;
    icon: any;
    metricKey?: string;
    gradient?: string;
    highlight?: boolean;
    highlightColor?: string;
    suffix?: string;
  }) => {
    if (value === undefined || value === null || isNaN(value)) {
      return null;
    }

    const desc = metricKey ? ttmDescriptions[metricKey] : null;
    const showTooltip = desc && hoveredMetric === metricKey;
    
    // 判断数值的正负状态
    const isPositive = value >= 0;
    const displayValue = format(value);

    return (
      <div 
        className={`relative p-4 rounded-xl bg-white/5 border ${highlight ? `border-${highlightColor}/30` : 'border-white/5'} max-md:border-0 group cursor-help transition-all hover:bg-white/10 hover:border-white/20`}
        onMouseEnter={() => metricKey && setHoveredMetric(metricKey)}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        <div className="flex items-center gap-2 mb-2 text-mist-400">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        <p className={`text-lg md:text-xl font-bold font-mono ${highlight ? `text-${highlightColor}` : 'text-white'} whitespace-nowrap`}>
          {displayValue}{suffix}
        </p>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-w-[calc(100vw-2rem)] p-4 bg-midnight border border-white/20 rounded-lg shadow-xl text-xs text-mist-200 leading-relaxed pointer-events-none">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-glacier-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white mb-1">{desc.title}</p>
                <p className="text-mist-300">{desc.description}</p>
              </div>
            </div>
            {desc.insight && (
              <div className="mt-3 pt-3 border-t border-white/10">
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

  // 小型指标标签组件
  const MetricBadge = ({
    label,
    value,
    format,
    metricKey,
    isGood = true,
  }: {
    label: string;
    value: number | undefined | null;
    format: (val: number | undefined | null) => string;
    metricKey?: string;
    isGood?: boolean;
  }) => {
    if (value === undefined || value === null || isNaN(value)) return null;
    
    const desc = metricKey ? ttmDescriptions[metricKey] : null;
    const showTooltip = desc && hoveredMetric === metricKey;
    
    return (
      <div 
        className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-xs cursor-help hover:bg-white/10 transition-colors"
        onMouseEnter={() => metricKey && setHoveredMetric(metricKey)}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        <span className="text-mist-400">{label}</span>
        <span className={`font-mono font-medium ${isGood ? 'text-gemini-green' : 'text-mist-300'}`}>
          {format(value)}
        </span>
        
        {showTooltip && desc && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-midnight border border-white/20 rounded-lg shadow-xl text-xs leading-relaxed pointer-events-none">
            <p className="font-semibold text-white mb-1">{desc.title}</p>
            <p className="text-mist-300">{desc.description}</p>
            {desc.insight && (
              <p className="mt-2 text-amber-200/80 text-[11px]">{desc.insight}</p>
            )}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
          </div>
        )}
      </div>
    );
  };

  // 1. 动态估值指标 (Valuation)
  const renderValuationMetrics = () => {
    const ev = latestTTM.enterpriseValueTTM;
    const mc = latestTTM.marketCap || latestMetrics?.marketCap;
    const evLessThanMarketCap = ev && mc && ev < mc;

    const metrics = [
      { 
        label: '市值', 
        value: latestTTM.marketCap || latestMetrics?.marketCap, 
        format: formatCurrency,
        icon: DollarSign,
        metricKey: 'marketCap',
      },
      { 
        label: '企业价值 (EV)', 
        value: latestTTM.enterpriseValueTTM, 
        format: formatCurrency,
        icon: Building2,
        metricKey: 'enterpriseValueTTM',
        highlight: evLessThanMarketCap,
        highlightColor: 'gemini-green',
      },
      { 
        label: 'EV/EBITDA', 
        value: latestTTM.evToEBITDATTM, 
        format: formatRatio,
        icon: Calculator,
        metricKey: 'evToEBITDATTM',
        highlight: true,
      },
      { 
        label: 'EV/营收', 
        value: latestTTM.evToSalesTTM, 
        format: formatRatio,
        icon: BarChart3,
        metricKey: 'evToSalesTTM',
      },
      { 
        label: '盈利收益率', 
        value: latestTTM.earningsYieldTTM, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'earningsYieldTTM',
      },
      { 
        label: '自由现金流收益率', 
        value: latestTTM.freeCashFlowYieldTTM, 
        format: formatPercent,
        icon: Zap,
        metricKey: 'freeCashFlowYieldTTM',
        highlight: true,
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    // 可视化：收益率对比
    const earningsYield = latestTTM.earningsYieldTTM ? (Math.abs(latestTTM.earningsYieldTTM) > 1 ? latestTTM.earningsYieldTTM : latestTTM.earningsYieldTTM * 100) : null;
    const fcfYield = latestTTM.freeCashFlowYieldTTM ? (Math.abs(latestTTM.freeCashFlowYieldTTM) > 1 ? latestTTM.freeCashFlowYieldTTM : latestTTM.freeCashFlowYieldTTM * 100) : null;
    const fcfHigherThanEarnings = fcfYield !== null && earningsYield !== null && fcfYield > earningsYield;
    
    const yieldChartOption = (earningsYield !== null && fcfYield !== null) ? {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params: any) => {
          let result = '<div style="font-weight:600;margin-bottom:4px">收益率对比</div>';
          params.forEach((param: any) => {
            result += `<div style="display:flex;align-items:center;gap:6px">${param.marker}<span>${param.seriesName}</span><span style="font-family:monospace;font-weight:600;margin-left:auto">${param.value.toFixed(2)}%</span></div>`;
          });
          return result;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['收益率'],
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v}` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          name: '盈利收益率',
          type: 'bar',
          data: [earningsYield],
          itemStyle: { color: '#64948b', borderRadius: [4, 4, 0, 0] },
          barWidth: '30%',
        },
        {
          name: '自由现金流收益率',
          type: 'bar',
          data: [fcfYield],
          itemStyle: { color: fcfHigherThanEarnings ? '#4ade80' : '#7a8494', borderRadius: [4, 4, 0, 0] },
          barWidth: '30%',
        },
      ],
    } : null;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-glacier-500 rounded-full"></span>
              动态估值指标
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              &quot;现在的价格贵不贵？&quot; —— 最适合用来做实时的买卖决策
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-mist-500">
            <Clock className="w-3 h-3" />
            <span>TTM</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>

        {/* EV < MarketCap 提示 */}
        {evLessThanMarketCap && (
          <div className="mb-4 p-4 bg-gemini-green/10 border border-gemini-green/20 rounded-lg">
            <div className="flex items-center gap-2 text-gemini-green text-sm mb-1">
              <Zap className="w-4 h-4" />
              <span className="font-medium">极其健康的信号</span>
            </div>
            <p className="text-xs text-mist-300">
              企业价值 (EV) 低于市值，说明公司账上现金比债务还多。这是财务状况极其健康的表现。
            </p>
          </div>
        )}

        {/* 收益率对比图表 */}
        {yieldChartOption && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-mist-400">收益率对比</span>
              {fcfHigherThanEarnings && (
                <span className="text-xs text-gemini-green flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  自由现金流收益率更高，含金量极高
                </span>
              )}
            </div>
            <ReactECharts option={yieldChartOption} style={{ height: '200px' }} />
          </div>
        )}
      </div>
    );
  };

  // 2. 真实盈利能力 (True Profitability)
  const renderProfitabilityMetrics = () => {
    const metrics = [
      { 
        label: 'ROE', 
        value: latestTTM.returnOnEquityTTM, 
        format: formatPercent,
        icon: TrendingUp,
        metricKey: 'returnOnEquityTTM',
        highlight: !!(latestTTM.returnOnEquityTTM && (Math.abs(latestTTM.returnOnEquityTTM) > 1 ? latestTTM.returnOnEquityTTM : latestTTM.returnOnEquityTTM * 100) > 25),
      },
      { 
        label: 'ROIC', 
        value: latestTTM.returnOnInvestedCapitalTTM, 
        format: formatPercent,
        icon: Target,
        metricKey: 'returnOnInvestedCapitalTTM',
        highlight: !!(latestTTM.returnOnInvestedCapitalTTM && (Math.abs(latestTTM.returnOnInvestedCapitalTTM) > 1 ? latestTTM.returnOnInvestedCapitalTTM : latestTTM.returnOnInvestedCapitalTTM * 100) > 20),
      },
      { 
        label: 'ROA', 
        value: latestTTM.returnOnAssetsTTM, 
        format: formatPercent,
        icon: BarChart3,
        metricKey: 'returnOnAssetsTTM',
      },
      { 
        label: '收益质量', 
        value: latestTTM.incomeQualityTTM, 
        format: formatRatio,
        icon: Activity,
        metricKey: 'incomeQualityTTM',
        highlight: !!(latestTTM.incomeQualityTTM && latestTTM.incomeQualityTTM > 1),
        highlightColor: 'gemini-green',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    // 可视化：盈利能力指标对比
    const roe = latestTTM.returnOnEquityTTM ? (Math.abs(latestTTM.returnOnEquityTTM) > 1 ? latestTTM.returnOnEquityTTM : latestTTM.returnOnEquityTTM * 100) : null;
    const roic = latestTTM.returnOnInvestedCapitalTTM ? (Math.abs(latestTTM.returnOnInvestedCapitalTTM) > 1 ? latestTTM.returnOnInvestedCapitalTTM : latestTTM.returnOnInvestedCapitalTTM * 100) : null;
    const roa = latestTTM.returnOnAssetsTTM ? (Math.abs(latestTTM.returnOnAssetsTTM) > 1 ? latestTTM.returnOnAssetsTTM : latestTTM.returnOnAssetsTTM * 100) : null;

    const validData = [
      { name: 'ROE', value: roe, color: '#64948b' },
      { name: 'ROIC', value: roic, color: '#7a8494' },
      { name: 'ROA', value: roa, color: '#948a6a' },
    ].filter(d => d.value !== null);

    const profitabilityChartOption = validData.length > 0 ? {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params: any) => {
          let result = '<div style="font-weight:600;margin-bottom:4px">盈利能力指标</div>';
          params.forEach((param: any) => {
            result += `<div style="display:flex;align-items:center;gap:6px">${param.marker}<span>${param.seriesName}</span><span style="font-family:monospace;font-weight:600;margin-left:auto">${param.value.toFixed(2)}%</span></div>`;
          });
          return result;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['回报率'],
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: validData.map(d => ({
        name: d.name,
        type: 'bar',
        data: [d.value],
        itemStyle: { color: d.color, borderRadius: [4, 4, 0, 0] },
        barWidth: '20%',
      })),
    } : null;

    // ROIC > 20% 的强势提示
    const roicStrong = roic !== null && roic > 20;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-gemini-blue rounded-full"></span>
              真实盈利能力
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              &quot;最近一年赚钱效率如何？&quot; —— TTM 数据消除了季节性波动
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>

        {roicStrong && (
          <div className="mb-4 p-4 bg-gemini-blue/10 border border-gemini-blue/20 rounded-lg">
            <div className="flex items-center gap-2 text-gemini-blue text-sm mb-1">
              <Target className="w-4 h-4" />
              <span className="font-medium">顶级护城河信号</span>
            </div>
            <p className="text-xs text-mist-300">
              ROIC 超过 20%，这是巴菲特最爱的指标。如果连续 5 年保持这个水平，说明公司具有极深的护城河。
            </p>
          </div>
        )}

        {profitabilityChartOption && (
          <div className="mt-4">
            <ReactECharts option={profitabilityChartOption} style={{ height: '200px' }} />
          </div>
        )}
      </div>
    );
  };

  // 3. 运营效率 (Operational Efficiency)
  const renderEfficiencyMetrics = () => {
    const metrics = [
      { 
        label: '库存周转天数', 
        value: latestTTM.daysOfInventoryOutstandingTTM, 
        format: formatDays,
        icon: Activity,
        metricKey: 'daysOfInventoryOutstandingTTM',
      },
      { 
        label: '应收账款天数', 
        value: latestTTM.daysOfSalesOutstandingTTM, 
        format: formatDays,
        icon: TrendingUp,
        metricKey: 'daysOfSalesOutstandingTTM',
      },
      { 
        label: '应付账款天数', 
        value: latestTTM.daysOfPayablesOutstandingTTM, 
        format: formatDays,
        icon: TrendingUp,
        metricKey: 'daysOfPayablesOutstandingTTM',
      },
      { 
        label: '营业周期', 
        value: latestTTM.operatingCycleTTM, 
        format: formatDays,
        icon: Activity,
        metricKey: 'operatingCycleTTM',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    const ccc = latestTTM.cashConversionCycleTTM;
    const hasValidMetrics = metrics.length > 0 || (ccc !== undefined && ccc !== null && !isNaN(ccc));

    if (!hasValidMetrics) return null;

    const cccNegative = ccc !== undefined && ccc !== null && ccc < 0;

    // 运营周期瀑布图
    const dio = latestTTM.daysOfInventoryOutstandingTTM || 0;
    const dso = latestTTM.daysOfSalesOutstandingTTM || 0;
    const dpo = latestTTM.daysOfPayablesOutstandingTTM || 0;

    const waterfallOption = (dio > 0 || dso > 0 || dpo > 0) ? {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = params[0];
          return `<div style="font-weight:600">${p.name}</div><div style="font-family:monospace">${p.value.toFixed(1)} 天</div>`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['库存周转', '应收账款', '应付账款', '现金循环'],
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 0 },
      },
      yAxis: {
        type: 'value',
        name: '天',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: dio, itemStyle: { color: '#64948b', borderRadius: [4, 4, 0, 0] } },
            { value: dso, itemStyle: { color: '#7a8494', borderRadius: [4, 4, 0, 0] } },
            { value: dpo, itemStyle: { color: '#948a6a', borderRadius: [4, 4, 0, 0] } },
            { 
              value: ccc || (dio + dso - dpo), 
              itemStyle: { 
                color: (ccc || (dio + dso - dpo)) < 0 ? '#4ade80' : '#ef4444',
                borderRadius: [4, 4, 0, 0]
              }
            },
          ],
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            color: '#94a3b8',
            fontSize: 10,
            formatter: (p: any) => `${p.value.toFixed(0)}天`,
          },
        },
      ],
    } : null;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
              运营效率
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              &quot;生意做得有多快？&quot; —— 展示最新的供应链管理水平
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>

        {/* 现金循环周期特殊展示 */}
        {ccc !== undefined && ccc !== null && !isNaN(ccc) && (
          <div className={`p-4 rounded-lg border ${cccNegative ? 'bg-gemini-green/10 border-gemini-green/20' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-3 cursor-help"
                onMouseEnter={() => setHoveredMetric('cashConversionCycleTTM')}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <div className={`w-10 h-10 rounded-lg ${cccNegative ? 'bg-gemini-green/20' : 'bg-white/10'} flex items-center justify-center`}>
                  <Zap className={`w-5 h-5 ${cccNegative ? 'text-gemini-green' : 'text-mist-400'}`} />
                </div>
                <div>
                  <div className="text-sm text-mist-400">现金循环周期 (CCC)</div>
                  <div className="text-xs text-mist-500 mt-0.5">DIO + DSO - DPO</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono ${cccNegative ? 'text-gemini-green' : 'text-white'}`}>
                  {formatDays(ccc)}
                </div>
                {cccNegative && (
                  <div className="text-xs text-gemini-green mt-1 flex items-center gap-1 justify-end">
                    <ArrowDownRight className="w-3 h-3" />
                    极其强势
                  </div>
                )}
              </div>
            </div>
            
            {/* Tooltip for CCC */}
            {hoveredMetric === 'cashConversionCycleTTM' && ttmDescriptions.cashConversionCycleTTM && (
              <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                <p className="text-mist-300 mb-2">{ttmDescriptions.cashConversionCycleTTM.description}</p>
                <p className="text-amber-200/80">{ttmDescriptions.cashConversionCycleTTM.insight}</p>
              </div>
            )}
          </div>
        )}

        {waterfallOption && (
          <div className="mt-4">
            <ReactECharts option={waterfallOption} style={{ height: '220px' }} />
          </div>
        )}
      </div>
    );
  };

  // 4. 财务健康 (Financial Health)
  const renderHealthMetrics = () => {
    const metrics = [
      { 
        label: '流动比率', 
        value: latestTTM.currentRatioTTM, 
        format: formatRatio,
        icon: Shield,
        metricKey: 'currentRatioTTM',
      },
      { 
        label: '净债务/EBITDA', 
        value: latestTTM.netDebtToEBITDATTM, 
        format: formatRatio,
        icon: Calculator,
        metricKey: 'netDebtToEBITDATTM',
        highlight: latestTTM.netDebtToEBITDATTM !== undefined && latestTTM.netDebtToEBITDATTM < 1,
        highlightColor: 'gemini-green',
      },
      { 
        label: '利息负担', 
        value: latestTTM.interestBurdenTTM, 
        format: formatRatio,
        icon: Shield,
        metricKey: 'interestBurdenTTM',
      },
      { 
        label: '税收负担', 
        value: latestTTM.taxBurdenTTM, 
        format: formatRatio,
        icon: Percent,
        metricKey: 'taxBurdenTTM',
      },
      { 
        label: '营运资金', 
        value: latestTTM.workingCapitalTTM, 
        format: formatCurrency,
        icon: DollarSign,
        metricKey: 'workingCapitalTTM',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    const workingCapital = latestTTM.workingCapitalTTM;
    const workingCapitalNegative = workingCapital !== undefined && workingCapital !== null && workingCapital < 0;
    const currentRatio = latestTTM.currentRatioTTM;
    const currentRatioLow = currentRatio !== undefined && currentRatio !== null && currentRatio < 1;

    // 财务健康评分可视化
    const netDebt = latestTTM.netDebtToEBITDATTM;
    const healthScore = (() => {
      let score = 0;
      if (netDebt !== undefined && netDebt < 1) score += 30;
      else if (netDebt !== undefined && netDebt < 3) score += 15;
      if (currentRatio !== undefined && currentRatio >= 1) score += 25;
      else if (currentRatio !== undefined && currentRatio >= 0.8) score += 10;
      const interestBurden = latestTTM.interestBurdenTTM;
      if (interestBurden !== undefined && interestBurden > 0.9) score += 25;
      else if (interestBurden !== undefined && interestBurden > 0.7) score += 10;
      const incomeQuality = latestTTM.incomeQualityTTM;
      if (incomeQuality !== undefined && incomeQuality > 1) score += 20;
      return Math.min(score, 100);
    })();

    const gaugeOption = {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 4,
          pointer: { show: false },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: healthScore >= 70 ? '#4ade80' : healthScore >= 40 ? '#facc15' : '#ef4444',
            },
          },
          axisLine: {
            lineStyle: {
              width: 12,
              color: [[1, '#1e293b']],
            },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: {
            fontSize: 24,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            color: healthScore >= 70 ? '#4ade80' : healthScore >= 40 ? '#facc15' : '#ef4444',
            offsetCenter: [0, '-10%'],
            formatter: '{value}',
          },
          data: [{ value: healthScore }],
        },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-gemini-green rounded-full"></span>
              财务健康
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              &quot;抗风险能力&quot; —— 评估公司的财务稳健程度
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：指标卡片 */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {metrics.map((m, i) => (
                <MetricCard key={i} {...m} />
              ))}
            </div>
            
            {/* 警告提示 */}
            {(workingCapitalNegative || currentRatioLow) && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">注意</span>
                </div>
                <p className="text-xs text-mist-300">
                  {workingCapitalNegative && '营运资金为负。'}
                  {currentRatioLow && '流动比率低于1。'}
                  对于大多数公司这是危险信号，但对于强势企业（如苹果、沃尔玛），这可能是它们占用上下游资金的证明。
                </p>
              </div>
            )}
          </div>

          {/* 右侧：健康评分仪表盘 */}
          <div className="flex flex-col items-center justify-center">
            <ReactECharts option={gaugeOption} style={{ height: '150px', width: '100%' }} />
            <div className="text-center -mt-4">
              <div className="text-xs text-mist-400">财务健康评分</div>
              <div className={`text-xs mt-1 ${healthScore >= 70 ? 'text-gemini-green' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {healthScore >= 70 ? '优秀' : healthScore >= 40 ? '良好' : '需关注'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 5. 资本配置 (Capital Allocation)
  const renderCapitalAllocationMetrics = () => {
    const metrics = [
      { 
        label: '研发占比', 
        value: latestTTM.researchAndDevelopementToRevenueTTM, 
        format: formatPercent,
        icon: Zap,
        metricKey: 'researchAndDevelopementToRevenueTTM',
      },
      { 
        label: '资本开支占比', 
        value: latestTTM.capexToRevenueTTM, 
        format: formatPercent,
        icon: Building2,
        metricKey: 'capexToRevenueTTM',
      },
      { 
        label: '资本开支/现金流', 
        value: latestTTM.capexToOperatingCashFlowTTM, 
        format: formatPercent,
        icon: Activity,
        metricKey: 'capexToOperatingCashFlowTTM',
        highlight: latestTTM.capexToOperatingCashFlowTTM !== undefined && (Math.abs(latestTTM.capexToOperatingCashFlowTTM) > 1 ? latestTTM.capexToOperatingCashFlowTTM : latestTTM.capexToOperatingCashFlowTTM * 100) < 20,
        highlightColor: 'gemini-green',
      },
      { 
        label: '股权激励占比', 
        value: latestTTM.stockBasedCompensationToRevenueTTM, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'stockBasedCompensationToRevenueTTM',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    // 资本配置饼图
    const rd = latestTTM.researchAndDevelopementToRevenueTTM ? (Math.abs(latestTTM.researchAndDevelopementToRevenueTTM) > 1 ? latestTTM.researchAndDevelopementToRevenueTTM : latestTTM.researchAndDevelopementToRevenueTTM * 100) : 0;
    const capex = latestTTM.capexToRevenueTTM ? (Math.abs(latestTTM.capexToRevenueTTM) > 1 ? latestTTM.capexToRevenueTTM : latestTTM.capexToRevenueTTM * 100) : 0;
    const sbc = latestTTM.stockBasedCompensationToRevenueTTM ? (Math.abs(latestTTM.stockBasedCompensationToRevenueTTM) > 1 ? latestTTM.stockBasedCompensationToRevenueTTM : latestTTM.stockBasedCompensationToRevenueTTM * 100) : 0;
    const other = Math.max(0, 100 - rd - capex - sbc);

    const pieData = [
      { value: rd, name: '研发投入', itemStyle: { color: '#64948b' } },
      { value: capex, name: '资本开支', itemStyle: { color: '#7a8494' } },
      { value: sbc, name: '股权激励', itemStyle: { color: '#948a6a' } },
      { value: other, name: '其他/留存', itemStyle: { color: '#334155' } },
    ].filter(d => d.value > 0);

    const pieOption = pieData.length > 1 ? {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (p: any) => `<div style="font-weight:600">${p.name}</div><div style="font-family:monospace">${p.value.toFixed(1)}%</div>`,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: '#0a0a0f', borderWidth: 2 },
          label: {
            show: true,
            position: 'outside',
            color: '#94a3b8',
            fontSize: 10,
            formatter: '{b}: {c}%',
          },
          labelLine: { length: 10, length2: 10, lineStyle: { color: '#334155' } },
          data: pieData,
        },
      ],
    } : null;

    // 资本开支占现金流低的提示
    const capexToOCF = latestTTM.capexToOperatingCashFlowTTM ? (Math.abs(latestTTM.capexToOperatingCashFlowTTM) > 1 ? latestTTM.capexToOperatingCashFlowTTM : latestTTM.capexToOperatingCashFlowTTM * 100) : null;
    const lowCapexReinvestment = capexToOCF !== null && capexToOCF < 20;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              资本配置
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              &quot;赚的钱花哪去了？&quot; —— 看出管理层是喜欢乱花钱，还是回报股东
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((m, i) => (
                <MetricCard key={i} {...m} />
              ))}
            </div>
            
            {lowCapexReinvestment && capexToOCF !== null && (
              <div className="mt-4 p-4 bg-gemini-green/10 border border-gemini-green/20 rounded-lg">
                <div className="flex items-center gap-2 text-gemini-green text-sm mb-1">
                  <PiggyBank className="w-4 h-4" />
                  <span className="font-medium">轻资产高回报</span>
                </div>
                <p className="text-xs text-mist-300">
                  赚来的现金流只有 {capexToOCF.toFixed(1)}% 需要拿去再投入，剩下的 {(100 - capexToOCF).toFixed(0)}% 都可以分给股东！
                </p>
              </div>
            )}
          </div>

          {pieOption && (
            <div>
              <div className="text-xs text-mist-400 mb-2 text-center">营收分配结构</div>
              <ReactECharts option={pieOption} style={{ height: '200px' }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // 6. 深度价值模型 (Deep Value)
  const renderValueModels = () => {
    const metrics = [
      { 
        label: '格雷厄姆数字', 
        value: latestTTM.grahamNumberTTM, 
        format: formatCurrency,
        icon: Calculator,
        metricKey: 'grahamNumberTTM',
      },
      { 
        label: '有形资产价值', 
        value: latestTTM.tangibleAssetValueTTM, 
        format: formatCurrency,
        icon: Building2,
        metricKey: 'tangibleAssetValueTTM',
      },
      { 
        label: '净流动资产价值', 
        value: latestTTM.netCurrentAssetValueTTM, 
        format: formatCurrency,
        icon: DollarSign,
        metricKey: 'netCurrentAssetValueTTM',
      },
    ].filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value));

    if (metrics.length === 0) return null;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              深度价值模型
            </h3>
            <p className="text-xs text-mist-500 mt-1">
              格雷厄姆指标 —— 寻找极度低估的价值股
            </p>
          </div>
        </div>

        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
            <Info className="w-4 h-4" />
            <span className="font-medium">适用范围提示</span>
          </div>
          <p className="text-xs text-mist-300">
            这些指标主要适用于银行、工业等传统重资产行业。对于科技公司等靠品牌和生态赚钱的轻资产公司，这些数字可能严重偏低，没有参考意义。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      {/* TTM 说明头部 */}
      <div className="mb-6 p-4 bg-glacier-500/10 border border-glacier-500/20 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-glacier-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-glacier-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              TTM 财务比率
              <span className="text-xs px-2 py-0.5 bg-glacier-500/20 text-glacier-400 rounded-full">过去12个月</span>
            </h4>
            <p className="text-xs text-mist-400 mt-0.5">
              Trailing Twelve Months 数据消除了季节性波动，更适合用于实时投资决策。鼠标悬停查看指标详细说明。
            </p>
          </div>
        </div>
      </div>
      
      {renderValuationMetrics()}
      {renderProfitabilityMetrics()}
      {renderEfficiencyMetrics()}
      {renderHealthMetrics()}
      {renderCapitalAllocationMetrics()}
      {renderValueModels()}
    </div>
  );
}
