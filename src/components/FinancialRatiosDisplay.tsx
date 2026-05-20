'use client';

import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Percent, TrendingUp, Zap, Shield, DollarSign, BarChart3,
  Info, Activity, Calculator, PiggyBank, Target, Building2
} from 'lucide-react';
import type { FinancialRatios, KeyMetrics } from '@/types';

interface Props {
  financialRatios: FinancialRatios[];
  keyMetrics: KeyMetrics[];
}

// 指标说明映射 - 根据用户提供的详细说明
const ratioDescriptions: Record<string, string> = {
  // 利润率 (Margins)
  grossProfitMargin: '毛利率：卖一部手机，扣除硬件成本（BOM）后剩多少钱。46% 对于硬件公司来说是非常惊人的暴利（小米通常在 10-15%）。',
  operatingProfitMargin: '营业利润率：扣掉研发、销售、管理工资后剩下的利润。',
  netProfitMargin: '净利率：交完税后，真正落到口袋里的钱。每卖 100 块钱，净赚 24 块。',
  pretaxProfitMargin: '税前利润率：交税前的利润率。',
  effectiveTaxRate: '有效税率：公司实际缴纳的税率。',

  // 运营效率 (Efficiency/Turnover)
  inventoryTurnover: '库存周转率：非常恐怖的数字！意味着苹果一年能把仓库里的货清空并卖掉 29 次。平均不到 2 周就换一轮货。',
  receivablesTurnover: '应收账款周转率：一年内能收回 6 次账款。',
  assetTurnover: '总资产周转率：每一块钱资产一年能带来 1.07 块钱的营收。',
  fixedAssetTurnover: '固定资产周转率：衡量固定资产的使用效率。',

  // 流动性与偿债能力 (Liquidity & Solvency)
  currentRatio: '流动比率（流动资产 / 流动负债）。通常教科书说 <1 很危险，但在苹果这里，这代表它把资金利用到了极致（不需要留闲钱还债，因为每天都有现金进账）。',
  quickRatio: '速动比率：剔除掉库存（因为库存可能卖不掉）后的变现能力。',
  debtToEquityRatio: '产权比率：借的钱是股东投入钱的 1.8 倍。高杠杆，但苹果还得起。',
  interestCoverageRatio: '利息保障倍数：赚的钱够还几次利息？如果这里显示 0，可能是因为苹果的利息收入甚至覆盖了利息支出，或者 API 对"净利息支出"为负的情况处理为了 0。',
  solvencyRatio: '偿债能力比率：衡量公司长期偿债能力。',
  cashRatio: '现金比率：手头的现金能还多少流动负债。',

  // 估值比率 (Valuation)
  priceToEarningsRatio: 'PE, 市盈率：按现在的利润，37 年回本。处于历史高位。',
  priceToBookRatio: 'PB, 市净率：极高。因为苹果回购注销了大量股票，分母（净资产）变小，导致 PB 失真。对苹果这种公司，看 PB 没意义。',
  priceToSalesRatio: 'PS, 市销率：每一块钱销售额卖 8.9 块钱股价。',
  priceToFreeCashFlowRatio: '市值是自由现金流的 32 倍。这个比 PE 更靠谱。',
  priceToEarningsGrowthRatio: 'PEG：市盈率 / 净利润增长率。负数通常意味着当年净利润是负增长（2024年苹果面临了一些增长压力），导致公式失效。',
  enterpriseValueMultiple: 'EV/EBITDA：企业价值倍数。',

  // 现金流与分红 (Cash Flow & Dividends)
  dividendYield: '股息率：单纯靠分红，回报很低。苹果主要靠股价上涨和回购来回馈股东。',
  dividendPayoutRatio: '派息率：赚的钱里，只拿 16% 出来分红，剩下的钱拿去研发或回购了。',
  operatingCashFlowRatio: '经营现金流比率：衡量经营现金流的健康程度。',
  freeCashFlowOperatingCashFlowRatio: '自由现金流/经营现金流：经营赚来的现金流（OCF），有 92% 都转化成了自由现金流（FCF）。说明资本开支（建厂房）很少，是轻资产赚钱机器。',

  // 每股数据 (Per Share Metrics)
  revenuePerShare: '每股贡献营收：每股贡献营收 25.48 美元。',
  netIncomePerShare: 'EPS, 每股收益：每股赚 6.1 美元。',
  freeCashFlowPerShare: '每股自由现金流：每股产生 7.09 美元的自由现金流。注意：FCF (7.09) > EPS (6.1)。这意味着苹果收到的真金白银比账面利润还多！这是顶级高质量公司的特征（很多公司是利润很高，但全是应收账款白条，没现金）。',
  bookValuePerShare: '每股净资产：每股对应的净资产价值。',
};

export default function FinancialRatiosDisplay({
  financialRatios = [],
  keyMetrics = [],
}: Props) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  if (!financialRatios || financialRatios.length === 0) {
    return (
      <div className="gemini-card p-6 text-center text-mist-400">
        暂无财务比率数据
      </div>
    );
  }

  const latestRatios = financialRatios[0];
  const latestMetrics = keyMetrics?.[0];

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const value = Math.abs(num) > 1 ? num : num * 100;
    return value.toFixed(2) + '%';
  };

  const formatRatio = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return num.toFixed(2);
  };

  const formatCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return '$' + num.toFixed(2);
  };

  // 指标卡片组件（带 tooltip）
  const MetricCard = ({ 
    label, 
    value, 
    format, 
    icon: Icon, 
    metricKey,
    gradient = 'from-glacier-500/20 to-glacier-600/20',
    highlight = false
  }: { 
    label: string; 
    value: number | undefined | null; 
    format: (val: number | undefined | null) => string;
    icon: any;
    metricKey?: string;
    gradient?: string;
    highlight?: boolean;
  }) => {
    const description = metricKey ? ratioDescriptions[metricKey] : null;
    const showTooltip = description && hoveredMetric === metricKey;

    return (
      <div 
        className={`relative p-4 rounded-xl bg-white/5 border ${highlight ? 'border-gemini-blue/30' : 'border-white/5'} max-md:border-0 group cursor-help transition-all hover:bg-white/10`}
        onMouseEnter={() => metricKey && setHoveredMetric(metricKey)}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        <div className="flex items-center gap-2 mb-2 text-mist-400">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`text-lg md:text-xl font-bold font-mono ${highlight ? 'text-gemini-blue' : 'text-white'} whitespace-nowrap`}>
          {format(value)}
        </p>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-w-[calc(100vw-2rem)] p-4 bg-midnight border border-white/20 rounded-lg shadow-xl text-xs text-mist-200 leading-relaxed pointer-events-none">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-glacier-400 shrink-0 mt-0.5" />
              <p>{description}</p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
          </div>
        )}
      </div>
    );
  };

  // 1. 利润率 (Margins)
  const renderMargins = () => {
    const margins = [
      { 
        label: '毛利率', 
        value: latestRatios.grossProfitMargin, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'grossProfitMargin',
      },
      { 
        label: '营业利润率', 
        value: latestRatios.operatingProfitMargin, 
        format: formatPercent,
        icon: TrendingUp,
        metricKey: 'operatingProfitMargin',
      },
      { 
        label: '净利率', 
        value: latestRatios.netProfitMargin, 
        format: formatPercent,
        icon: Target,
        metricKey: 'netProfitMargin',
        highlight: true,
      },
      { 
        label: '税前利润率', 
        value: latestRatios.pretaxProfitMargin, 
        format: formatPercent,
        icon: Calculator,
        metricKey: 'pretaxProfitMargin',
      },
      { 
        label: '有效税率', 
        value: latestRatios.effectiveTaxRate, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'effectiveTaxRate',
      },
    ];

    // 准备图表数据
    const years = financialRatios.map(r => r.calendarYear || r.fiscalYear || r.date?.split('-')[0] || '').reverse();
    const grossMargin = financialRatios.map(r => (r.grossProfitMargin || 0) * 100).reverse();
    const operatingMargin = financialRatios.map(r => (r.operatingProfitMargin || 0) * 100).reverse();
    const netMargin = financialRatios.map(r => (r.netProfitMargin || 0) * 100).reverse();

    const chartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
        formatter: (params: any) => {
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            result += `${param.marker}${param.seriesName}: ${param.value.toFixed(2)}%<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['毛利率', '营业利润率', '净利率'],
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
      yAxis: {
        type: 'value',
        name: '百分比 (%)',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '毛利率', type: 'line', data: grossMargin, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#64948b' }, symbol: 'circle', symbolSize: 6 },
        { name: '营业利润率', type: 'line', data: operatingMargin, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#7a8494' }, symbol: 'circle', symbolSize: 6 },
        { name: '净利率', type: 'line', data: netMargin, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#948a6a' }, symbol: 'circle', symbolSize: 6 },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gemini-blue rounded-full"></span>
          利润率 (Margins) —— 赚钱有多&quot;轻松&quot;？
        </h3>
        <p className="text-xs text-mist-500 mb-4">
          这一组数据全都是 ...Margin 结尾，衡量公司把收入转化为利润的能力。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {margins.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
        {financialRatios.length > 1 && (
          <div className="mt-4">
            <ReactECharts option={chartOption} style={{ height: '300px' }} />
          </div>
        )}
      </div>
    );
  };

  // 2. 运营效率 (Efficiency/Turnover)
  const renderEfficiency = () => {
    const efficiency = [
      { 
        label: '库存周转率', 
        value: latestMetrics?.inventoryTurnover, 
        format: formatRatio,
        icon: Zap,
        metricKey: 'inventoryTurnover',
        highlight: true,
      },
      { 
        label: '应收账款周转率', 
        value: latestMetrics?.receivablesTurnover, 
        format: formatRatio,
        icon: Activity,
        metricKey: 'receivablesTurnover',
      },
      { 
        label: '总资产周转率', 
        value: (latestRatios as unknown as { assetTurnover?: number }).assetTurnover || (latestMetrics as unknown as { assetTurnover?: number } | undefined)?.assetTurnover, 
        format: formatRatio,
        icon: BarChart3,
        metricKey: 'assetTurnover',
      },
      { 
        label: '固定资产周转率', 
        value: (latestRatios as unknown as { fixedAssetTurnover?: number }).fixedAssetTurnover, 
        format: formatRatio,
        icon: Building2,
        metricKey: 'fixedAssetTurnover',
      },
    ];

    // 准备图表数据
    const years = financialRatios.map(r => r.calendarYear || r.fiscalYear || r.date?.split('-')[0] || '').reverse();
    const inventoryTurnover = keyMetrics.map(m => m.inventoryTurnover || 0).reverse();
    const receivablesTurnover = keyMetrics.map(m => m.receivablesTurnover || 0).reverse();

    const chartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['库存周转率', '应收账款周转率'],
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
      yAxis: {
        type: 'value',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '库存周转率', type: 'bar', data: inventoryTurnover, itemStyle: { color: '#64948b' } },
        { name: '应收账款周转率', type: 'bar', data: receivablesTurnover, itemStyle: { color: '#7a8494' } },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          运营效率 (Efficiency/Turnover) —— 资产转得有多快？
        </h3>
        <p className="text-xs text-mist-500 mb-4">
          这一组通常带有 Turnover（周转率），数值越高越好。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {efficiency.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
        {keyMetrics.length > 1 && (
          <div className="mt-4">
            <ReactECharts option={chartOption} style={{ height: '300px' }} />
          </div>
        )}
      </div>
    );
  };

  // 3. 流动性与偿债能力 (Liquidity & Solvency)
  const renderLiquidity = () => {
    const liquidity = [
      { 
        label: '流动比率', 
        value: latestRatios.currentRatio, 
        format: formatRatio,
        icon: Shield,
        metricKey: 'currentRatio',
      },
      { 
        label: '速动比率', 
        value: latestRatios.quickRatio, 
        format: formatRatio,
        icon: Zap,
        metricKey: 'quickRatio',
      },
      { 
        label: '产权比率', 
        value: latestRatios.debtEquityRatio, 
        format: formatRatio,
        icon: Calculator,
        metricKey: 'debtToEquityRatio',
      },
      { 
        label: '利息保障倍数', 
        value: latestRatios.interestCoverage, 
        format: formatRatio,
        icon: Shield,
        metricKey: 'interestCoverageRatio',
      },
      { 
        label: '现金比率', 
        value: latestRatios.cashRatio, 
        format: formatRatio,
        icon: DollarSign,
        metricKey: 'cashRatio',
      },
    ];

    // 准备图表数据
    const years = financialRatios.map(r => r.calendarYear || r.fiscalYear || r.date?.split('-')[0] || '').reverse();
    const currentRatio = financialRatios.map(r => r.currentRatio || 0).reverse();
    const quickRatio = financialRatios.map(r => r.quickRatio || 0).reverse();
    const debtEquity = financialRatios.map(r => r.debtEquityRatio || 0).reverse();

    const chartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['流动比率', '速动比率', '产权比率'],
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
      yAxis: {
        type: 'value',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '流动比率', type: 'line', data: currentRatio, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#64948b' }, symbol: 'circle', symbolSize: 6 },
        { name: '速动比率', type: 'line', data: quickRatio, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#7a8494' }, symbol: 'circle', symbolSize: 6 },
        { name: '产权比率', type: 'line', data: debtEquity, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#948a6a' }, symbol: 'circle', symbolSize: 6 },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gemini-green rounded-full"></span>
          流动性与偿债能力 (Liquidity & Solvency) —— 会不会倒闭？
        </h3>
        <p className="text-xs text-mist-500 mb-4">
          这一组用来评估风险。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {liquidity.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
        {financialRatios.length > 1 && (
          <div className="mt-4">
            <ReactECharts option={chartOption} style={{ height: '300px' }} />
          </div>
        )}
      </div>
    );
  };

  // 4. 估值比率 (Valuation)
  const renderValuation = () => {
    const valuation = [
      { 
        label: 'PE (市盈率)', 
        value: latestRatios.priceEarningsRatio, 
        format: formatRatio,
        icon: Calculator,
        metricKey: 'priceToEarningsRatio',
      },
      { 
        label: 'PB (市净率)', 
        value: latestRatios.priceToBookRatio || latestRatios.priceBookValueRatio, 
        format: formatRatio,
        icon: BarChart3,
        metricKey: 'priceToBookRatio',
      },
      { 
        label: 'PS (市销率)', 
        value: latestRatios.priceToSalesRatio || latestRatios.priceSalesRatio, 
        format: formatRatio,
        icon: TrendingUp,
        metricKey: 'priceToSalesRatio',
      },
      { 
        label: 'P/FCF', 
        value: latestRatios.priceToFreeCashFlowsRatio, 
        format: formatRatio,
        icon: DollarSign,
        metricKey: 'priceToFreeCashFlowRatio',
        highlight: true,
      },
      { 
        label: 'PEG', 
        value: latestRatios.priceEarningsToGrowthRatio, 
        format: formatRatio,
        icon: Target,
        metricKey: 'priceToEarningsGrowthRatio',
      },
      { 
        label: 'EV/EBITDA', 
        value: latestRatios.enterpriseValueMultiple, 
        format: formatRatio,
        icon: Calculator,
        metricKey: 'enterpriseValueMultiple',
      },
    ];

    // 准备图表数据
    const years = financialRatios.map(r => r.calendarYear || r.fiscalYear || r.date?.split('-')[0] || '').reverse();
    const pe = financialRatios.map(r => r.priceEarningsRatio || 0).reverse();
    const pb = financialRatios.map(r => r.priceToBookRatio || r.priceBookValueRatio || 0).reverse();
    const ps = financialRatios.map(r => r.priceToSalesRatio || r.priceSalesRatio || 0).reverse();

    const chartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['PE', 'PB', 'PS'],
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
      yAxis: {
        type: 'value',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: 'PE', type: 'line', data: pe, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#64948b' }, symbol: 'circle', symbolSize: 6 },
        { name: 'PB', type: 'line', data: pb, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#7a8494' }, symbol: 'circle', symbolSize: 6 },
        { name: 'PS', type: 'line', data: ps, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#948a6a' }, symbol: 'circle', symbolSize: 6 },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          估值比率 (Valuation) —— 现在买贵不贵？
        </h3>
        <p className="text-xs text-mist-500 mb-4">
          这一组通常以 priceTo... 开头。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {valuation.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
        {financialRatios.length > 1 && (
          <div className="mt-4">
            <ReactECharts option={chartOption} style={{ height: '300px' }} />
          </div>
        )}
      </div>
    );
  };

  // 5. 现金流与分红 (Cash Flow & Dividends)
  const renderCashFlow = () => {
    // 计算自由现金流/经营现金流比率
    const fcfPerShare = latestMetrics?.freeCashFlowPerShare;
    const ocfPerShare = latestMetrics?.operatingCashFlowPerShare;
    const freeCashFlowOperatingCashFlowRatio = (fcfPerShare && ocfPerShare && ocfPerShare !== 0) 
      ? fcfPerShare / ocfPerShare 
      : null;

    const cashFlow = [
      { 
        label: '股息率', 
        value: latestRatios.dividendYield, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'dividendYield',
      },
      { 
        label: '派息率', 
        value: latestMetrics?.payoutRatio, 
        format: formatPercent,
        icon: PiggyBank,
        metricKey: 'dividendPayoutRatio',
      },
      { 
        label: 'FCF/OCF', 
        value: freeCashFlowOperatingCashFlowRatio, 
        format: formatPercent,
        icon: Zap,
        metricKey: 'freeCashFlowOperatingCashFlowRatio',
        highlight: true,
      },
    ];

    // 准备图表数据
    const years = financialRatios.map(r => r.calendarYear || r.fiscalYear || r.date?.split('-')[0] || '').reverse();
    const dividendYield = financialRatios.map(r => (r.dividendYield || 0) * 100).reverse();
    const payoutRatio = keyMetrics.map(m => (m.payoutRatio || 0) * 100).reverse();

    const chartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
        formatter: (params: any) => {
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            result += `${param.marker}${param.seriesName}: ${param.value.toFixed(2)}%<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['股息率', '派息率'],
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
      yAxis: {
        type: 'value',
        name: '百分比 (%)',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '股息率', type: 'bar', data: dividendYield, itemStyle: { color: '#64948b' } },
        { name: '派息率', type: 'bar', data: payoutRatio, itemStyle: { color: '#7a8494' } },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gemini-purple rounded-full"></span>
          现金流与分红 (Cash Flow & Dividends) —— 股东回报
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {cashFlow.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
        {financialRatios.length > 1 && (
          <div className="mt-4">
            <ReactECharts option={chartOption} style={{ height: '300px' }} />
          </div>
        )}
      </div>
    );
  };

  // 6. 每股数据 (Per Share Metrics)
  const renderPerShare = () => {
    const perShare = [
      { 
        label: '每股营收', 
        value: latestMetrics?.revenuePerShare, 
        format: formatCurrency,
        icon: DollarSign,
        metricKey: 'revenuePerShare',
      },
      { 
        label: 'EPS', 
        value: latestMetrics?.netIncomePerShare, 
        format: formatCurrency,
        icon: Target,
        metricKey: 'netIncomePerShare',
      },
      { 
        label: '每股自由现金流', 
        value: latestMetrics?.freeCashFlowPerShare, 
        format: formatCurrency,
        icon: Zap,
        metricKey: 'freeCashFlowPerShare',
        highlight: true,
      },
      { 
        label: '每股净资产', 
        value: latestMetrics?.bookValuePerShare, 
        format: formatCurrency,
        icon: PiggyBank,
        metricKey: 'bookValuePerShare',
      },
    ];

    // 准备图表数据
    const years = keyMetrics.map(m => m.calendarYear || m.fiscalYear || m.date?.split('-')[0] || '').reverse();
    const revenuePerShare = keyMetrics.map(m => m.revenuePerShare || 0).reverse();
    const eps = keyMetrics.map(m => m.netIncomePerShare || 0).reverse();
    const fcfPerShare = keyMetrics.map(m => m.freeCashFlowPerShare || 0).reverse();

    const chartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
        formatter: (params: any) => {
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            result += `${param.marker}${param.seriesName}: $${param.value.toFixed(2)}<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['每股营收', 'EPS', '每股自由现金流'],
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
      yAxis: {
        type: 'value',
        name: '美元 ($)',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', formatter: (v: number) => `$${v.toFixed(0)}` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '每股营收', type: 'line', data: revenuePerShare, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#64948b' }, symbol: 'circle', symbolSize: 6 },
        { name: 'EPS', type: 'line', data: eps, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#7a8494' }, symbol: 'circle', symbolSize: 6 },
        { name: '每股自由现金流', type: 'line', data: fcfPerShare, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#948a6a' }, symbol: 'circle', symbolSize: 6 },
      ],
    };

    // 检查 FCF > EPS 的情况
    const fcfVsEps = latestMetrics?.freeCashFlowPerShare && latestMetrics?.netIncomePerShare
      ? latestMetrics.freeCashFlowPerShare > latestMetrics.netIncomePerShare
      : false;

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-mist-500 rounded-full"></span>
          每股数据 (Per Share Metrics)
        </h3>
        <p className="text-xs text-mist-500 mb-4">
          这一组是把总数除以了&quot;总股本&quot;，方便散户看&quot;每一股&quot;含金量。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {perShare.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
        {fcfVsEps && (
          <div className="mb-4 p-4 bg-gemini-green/10 border border-gemini-green/20 rounded-lg">
            <div className="flex items-center gap-2 text-gemini-green text-sm">
              <Info className="w-4 h-4" />
              <span className="font-medium">优质公司特征</span>
            </div>
            <p className="text-xs text-mist-300 mt-2">
              FCF ({formatCurrency(latestMetrics?.freeCashFlowPerShare)}) &gt; EPS ({formatCurrency(latestMetrics?.netIncomePerShare)})。
              这意味着公司收到的真金白银比账面利润还多！这是顶级高质量公司的特征（很多公司是利润很高，但全是应收账款白条，没现金）。
            </p>
          </div>
        )}
        {keyMetrics.length > 1 && (
          <div className="mt-4">
            <ReactECharts option={chartOption} style={{ height: '300px' }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {renderMargins()}
      {renderEfficiency()}
      {renderLiquidity()}
      {renderValuation()}
      {renderCashFlow()}
      {renderPerShare()}
    </div>
  );
}
