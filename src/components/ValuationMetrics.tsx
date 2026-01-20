'use client';

import ReactECharts from 'echarts-for-react';
import { Calculator, TrendingUp, TrendingDown, Target, Percent, PiggyBank, BarChart3, Activity } from 'lucide-react';
import type { KeyMetrics, FinancialRatios, FinancialGrowth, DCFValuation, EnterpriseValue, CompanyProfile } from '@/types';

interface Props {
  profile: CompanyProfile;
  keyMetrics: KeyMetrics[];
  financialRatios: FinancialRatios[];
  financialGrowth: FinancialGrowth[];
  dcfValuation: DCFValuation | null;
  enterpriseValues: EnterpriseValue[];
}

export default function ValuationMetrics({
  profile,
  keyMetrics,
  financialRatios,
  financialGrowth,
  dcfValuation,
  enterpriseValues,
}: Props) {
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toFixed(2);
  };

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return (num * 100).toFixed(2) + '%';
  };

  const formatRatio = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return num.toFixed(2);
  };

  const latestMetrics = keyMetrics?.[0];
  const latestRatios = financialRatios?.[0];
  const latestGrowth = financialGrowth?.[0];

  // DCF 估值分析 - 低饱和度配色
  const renderDCFAnalysis = () => {
    if (!dcfValuation) return null;

    const currentPrice = profile.price || dcfValuation.price;
    const dcfValue = dcfValuation.dcf;
    const upside = ((dcfValue - currentPrice) / currentPrice) * 100;
    const isUndervalued = upside > 0;

    // 低饱和度颜色
    const positiveColor = '#5a9472';  // 低饱和度绿
    const negativeColor = '#94655a';  // 低饱和度红
    const accentColor = isUndervalued ? positiveColor : negativeColor;

    return (
      <div className="bg-midnight/30 rounded-xl p-5 border border-white/5 max-md:border-0">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-glacier-500" />
          <h3 className="text-base font-semibold text-white">DCF 估值分析</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">当前股价</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-white whitespace-nowrap">${currentPrice?.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">DCF 内在价值</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-glacier-400 whitespace-nowrap">${dcfValue?.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-white/5">
            <p className="text-sm text-slate-400 mb-1">潜在空间</p>
            <p className="text-xl md:text-2xl font-bold font-mono whitespace-nowrap" style={{ color: accentColor }}>
              {isUndervalued ? '+' : ''}{upside.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            {isUndervalued ? (
              <TrendingUp className="w-5 h-5" style={{ color: positiveColor }} />
            ) : (
              <TrendingDown className="w-5 h-5" style={{ color: negativeColor }} />
            )}
            <p className="text-sm font-medium text-mist-300">
              {isUndervalued 
                ? `基于 DCF 模型，该股票可能被低估约 ${upside.toFixed(1)}%`
                : `基于 DCF 模型，该股票可能被高估约 ${Math.abs(upside).toFixed(1)}%`
              }
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 关键估值指标 - 统一低饱和度冷色调
  const renderValuationMetrics = () => {
    if (!latestMetrics && !latestRatios) return null;

    const metrics = [
      { 
        label: 'P/E 市盈率', 
        value: latestMetrics?.peRatio || latestRatios?.priceEarningsRatio, 
        format: formatRatio,
        icon: <BarChart3 className="w-4 h-4" />,
      },
      { 
        label: 'P/B 市净率', 
        value: latestMetrics?.pbRatio || latestRatios?.priceBookValueRatio, 
        format: formatRatio,
        icon: <PiggyBank className="w-4 h-4" />,
      },
      { 
        label: 'P/S 市销率', 
        value: latestMetrics?.priceToSalesRatio || latestRatios?.priceToSalesRatio, 
        format: formatRatio,
        icon: <Target className="w-4 h-4" />,
      },
      { 
        label: 'EV/EBITDA', 
        value: latestMetrics?.enterpriseValueOverEBITDA, 
        format: formatRatio,
        icon: <Calculator className="w-4 h-4" />,
      },
      { 
        label: '股息率', 
        value: latestMetrics?.dividendYield, 
        format: formatPercent,
        icon: <Percent className="w-4 h-4" />,
      },
      { 
        label: '收益率', 
        value: latestMetrics?.earningsYield, 
        format: formatPercent,
        icon: <Activity className="w-4 h-4" />,
      },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 max-md:border-0">
            <div className="flex items-center gap-2 mb-2 text-mist-400">
              {m.icon}
              <span className="text-xs font-medium">{m.label}</span>
            </div>
            <p className="text-lg md:text-xl font-bold font-mono text-white whitespace-nowrap">{m.format(m.value)}</p>
          </div>
        ))}
      </div>
    );
  };

  // 盈利能力指标 - 低饱和度配色
  const renderProfitabilityMetrics = () => {
    if (!latestMetrics && !latestRatios) return null;

    const metrics = [
      { label: 'ROE 净资产收益率', value: latestMetrics?.roe || latestRatios?.returnOnEquity, isPercent: true },
      { label: 'ROA 总资产收益率', value: latestRatios?.returnOnAssets, isPercent: true },
      { label: 'ROIC 投资资本回报', value: latestMetrics?.roic, isPercent: true },
      { label: '毛利率', value: latestRatios?.grossProfitMargin, isPercent: true },
      { label: '营业利润率', value: latestRatios?.operatingProfitMargin, isPercent: true },
      { label: '净利润率', value: latestRatios?.netProfitMargin, isPercent: true },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-5 border border-white/5 max-md:border-0">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-glacier-500 rounded-full"></span>
          盈利能力指标
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-slate-400">{m.label}</span>
              <span className="font-mono font-semibold" style={{ 
                color: m.value && m.value > 0 ? '#5a9472' : '#94655a' 
              }}>
                {m.isPercent ? formatPercent(m.value) : formatRatio(m.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 财务健康指标 - 低饱和度配色
  const renderFinancialHealthMetrics = () => {
    if (!latestMetrics && !latestRatios) return null;

    const metrics = [
      { label: '流动比率', value: latestMetrics?.currentRatio || latestRatios?.currentRatio, threshold: 1.5, higherBetter: true },
      { label: '速动比率', value: latestRatios?.quickRatio, threshold: 1, higherBetter: true },
      { label: '现金比率', value: latestRatios?.cashRatio, threshold: 0.5, higherBetter: true },
      { label: '负债/权益比', value: latestMetrics?.debtToEquity || latestRatios?.debtEquityRatio, threshold: 1, higherBetter: false },
      { label: '利息覆盖率', value: latestMetrics?.interestCoverage || latestRatios?.interestCoverage, threshold: 5, higherBetter: true },
      { label: '净债务/EBITDA', value: latestMetrics?.netDebtToEBITDA, threshold: 3, higherBetter: false },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-5 border border-white/5 max-md:border-0">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          财务健康指标
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => {
            const isGood = m.value !== undefined && m.value !== null && !isNaN(m.value) && 
              (m.higherBetter ? m.value >= m.threshold : m.value <= m.threshold);
            return (
              <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">{m.label}</span>
                <span className="font-mono font-semibold" style={{ color: isGood ? '#5a9472' : '#947a5a' }}>
                  {formatRatio(m.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 增长指标图表 - 低饱和度配色
  const renderGrowthChart = () => {
    if (!financialGrowth?.length) return null;

    const years = financialGrowth.map(g => g.calendarYear || g.date?.split('-')[0] || '').reverse();
    const revenueGrowth = financialGrowth.map(g => (g.revenueGrowth || 0) * 100).reverse();
    const netIncomeGrowth = financialGrowth.map(g => (g.netIncomeGrowth || 0) * 100).reverse();
    const epsGrowth = financialGrowth.map(g => (g.epsgrowth || 0) * 100).reverse();
    const fcfGrowth = financialGrowth.map(g => (g.freeCashFlowGrowth || 0) * 100).reverse();

    // 低饱和度配色方案
    const colors = {
      revenue: '#64948b',     // 低饱和度青绿
      netIncome: '#7a8494',   // 低饱和度蓝灰
      eps: '#948a6a',         // 低饱和度琥珀
      fcf: '#6a8494',         // 低饱和度蓝
      positive: '#5a9472',    // 低饱和度绿
      negative: '#94655a',    // 低饱和度红
    };

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const color = p.value >= 0 ? colors.positive : colors.negative;
            result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
              <span style="width: 10px; height: 10px; background: ${p.color}; border-radius: 50%;"></span>
              <span>${p.seriesName}: </span>
              <span style="font-weight: 600; color: ${color};">${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%</span>
            </div>`;
          });
          return result;
        },
      },
      legend: {
        data: ['营收增长', '净利润增长', 'EPS增长', '自由现金流增长'],
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
        name: '增长率 (%)',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '营收增长', type: 'line', data: revenueGrowth, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.revenue }, symbol: 'circle', symbolSize: 5, label: { show: true, position: 'top', color: colors.revenue, fontSize: 9, fontFamily: 'JetBrains Mono', formatter: (p: any) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` } },
        { name: '净利润增长', type: 'line', data: netIncomeGrowth, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.netIncome }, symbol: 'circle', symbolSize: 5, label: { show: true, position: 'top', color: colors.netIncome, fontSize: 9, fontFamily: 'JetBrains Mono', formatter: (p: any) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` } },
        { name: 'EPS增长', type: 'line', data: epsGrowth, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.eps }, symbol: 'circle', symbolSize: 5, label: { show: true, position: 'bottom', color: colors.eps, fontSize: 9, fontFamily: 'JetBrains Mono', formatter: (p: any) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` } },
        { name: '自由现金流增长', type: 'line', data: fcfGrowth, smooth: true, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: colors.fcf }, symbol: 'circle', symbolSize: 5, label: { show: true, position: 'bottom', color: colors.fcf, fontSize: 9, fontFamily: 'JetBrains Mono', formatter: (p: any) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` } },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-5 border border-white/5 max-md:border-0">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          财务增长趋势
        </h3>
        <ReactECharts option={option} style={{ height: '300px' }} />
      </div>
    );
  };

  // 长期增长指标 - 低饱和度配色
  const renderLongTermGrowth = () => {
    if (!latestGrowth) return null;

    const metrics = [
      { label: '3年营收增长 (年化)', value: latestGrowth.threeYRevenueGrowthPerShare },
      { label: '5年营收增长 (年化)', value: latestGrowth.fiveYRevenueGrowthPerShare },
      { label: '10年营收增长 (年化)', value: latestGrowth.tenYRevenueGrowthPerShare },
      { label: '3年净利润增长 (年化)', value: latestGrowth.threeYNetIncomeGrowthPerShare },
      { label: '5年净利润增长 (年化)', value: latestGrowth.fiveYNetIncomeGrowthPerShare },
      { label: '10年净利润增长 (年化)', value: latestGrowth.tenYNetIncomeGrowthPerShare },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-5 border border-white/5 max-md:border-0">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
          长期增长指标
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-slate-400">{m.label}</span>
              <span className="font-mono font-semibold" style={{
                color: m.value && m.value > 0 ? '#5a9472' : m.value && m.value < 0 ? '#94655a' : '#64748b'
              }}>
                {formatPercent(m.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!keyMetrics?.length && !financialRatios?.length && !dcfValuation) {
    return null;
  }

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-white">估值与财务指标</h2>
          <p className="text-sm text-slate-500">关键财务比率和估值分析</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* DCF 估值 */}
        {renderDCFAnalysis()}

        {/* 估值指标 */}
        {renderValuationMetrics()}

        {/* 盈利能力和财务健康 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderProfitabilityMetrics()}
          {renderFinancialHealthMetrics()}
        </div>

        {/* 增长趋势 */}
        {renderGrowthChart()}

        {/* 长期增长 */}
        {renderLongTermGrowth()}
      </div>
    </div>
  );
}
