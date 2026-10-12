'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { IncomeStatement } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  incomeStatements: IncomeStatement[];
  incomeStatementsQuarter?: IncomeStatement[];
  currencySymbol?: string;
  currencyCode?: string;
  theme?: 'dark' | 'light';
}

export default function RevenueCharts({
  incomeStatements,
  incomeStatementsQuarter,
  currencySymbol = '$',
  currencyCode = 'USD',
  theme = 'dark',
}: Props) {
  const isLight = theme === 'light';
  const [period, setPeriod] = useState<'annual' | 'quarter'>('annual');
  const { locale, t } = useLanguage();
  const rcT = t.report.revenueCharts;

  const activeStatements = period === 'quarter' && incomeStatementsQuarter?.length
    ? incomeStatementsQuarter
    : incomeStatements;

  if (!activeStatements || activeStatements.length === 0) {
    return (
      <div className="text-center text-mist-400 p-8">
        {rcT.noData}
      </div>
    );
  }

  // Dynamic scale based on unit mode
  const isZh = locale === 'zh';
  const chartScale = isZh ? 1e8 : 1e9;
  const chartUnit = isZh ? '亿' : 'B';
  const currencyPrefix = currencySymbol;
  const currencySuffix = ` ${currencyCode}`;

  // 颜色定义
  const TEXT_PRIMARY = isLight ? '#222222' : '#D8DCE2';
  const TEXT_SECONDARY = isLight ? '#545B65' : '#A3ABB6';
  const TEXT_MUTED = isLight ? '#78808B' : '#7A838F';
  const BORDER_COLOR = isLight ? 'rgba(23,25,28,0.12)' : 'rgba(236,238,241,0.10)';
  const AXIS_LINE_COLOR = isLight ? 'rgba(23,25,28,0.18)' : 'rgba(236,238,241,0.18)';
  const SPLIT_LINE_COLOR = isLight ? 'rgba(23,25,28,0.07)' : 'rgba(236,238,241,0.07)';
  const TOOLTIP_BG = isLight ? '#FFFFFF' : '#1B1F24';
  const ACCENT_COLOR = isLight ? '#1565C0' : '#5CA0FF';

  // 传统色分类配色 (白青 Bai Qing, 窈蓝 Yao Lan, 鞠尘 Ju Chen, 艳炽 Yan Chi)
  const CATEGORICAL_COLORS = ['#7FA3BF', '#4A86E8', '#3FA66B', '#D9534F'];

  const years = activeStatements.map(i => {
    if (period === 'quarter') return `${i.fiscalYear} ${i.period}`;
    return i.date?.split('-')[0] || '';
  }).reverse();
  const revenues = activeStatements.map(i => (i.revenue || 0) / chartScale).reverse();
  const netIncomes = activeStatements.map(i => (i.netIncome || 0) / chartScale).reverse();
  const grossProfits = activeStatements.map(i => (i.grossProfit || 0) / chartScale).reverse();
  const grossProfitMargins = activeStatements.map(i => {
    const revenue = i.revenue || 0;
    const grossProfit = i.grossProfit || 0;
    return revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  }).reverse();

  // 柱状图 - 营收趋势
  const barOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: TOOLTIP_BG,
      borderColor: BORDER_COLOR,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.2)',
          type: 'dashed'
        }
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: 500; margin-bottom: 4px; color: ${TEXT_SECONDARY}; font-size: 11px;">${params[0].axisValue}</div>`;
        result += '<table style="width:100%; border-collapse: collapse;">';
        params.forEach((p: any) => {
          const isMargin = p.seriesName === rcT.legend.grossMargin;
          const valueStr = isMargin ? `${p.value.toFixed(1)}%` : `${currencyPrefix}${p.value.toFixed(2)}${chartUnit}${currencySuffix}`;
          result += `<tr>
            <td style="padding: 2px 8px 2px 0; display: flex; align-items: center;">
              <span style="width: 6px; height: 6px; background: ${p.color}; margin-right: 6px; display: inline-block;"></span>
              <span style="color: ${TEXT_SECONDARY}; font-size: 12px;">${p.seriesName}</span>
            </td>
            <td style="padding: 2px 0 2px 8px; text-align: right; color: ${TEXT_PRIMARY}; font-weight: 500;">${valueStr}</td>
          </tr>`;
        });
        result += '</table>';
        return result;
      },
    },
    legend: {
      data: [rcT.legend.revenue, rcT.legend.grossProfit, rcT.legend.netIncome, rcT.legend.grossMargin],
      textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
      top: 0,
      itemGap: 24,
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      top: '70px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: years,
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
      axisLabel: {
        color: TEXT_SECONDARY,
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      axisTick: { show: true, lineStyle: { color: AXIS_LINE_COLOR } },
    },
    yAxis: [
      {
        type: 'value',
        name: '',
        axisLine: { show: false },
        axisLabel: {
          color: TEXT_MUTED,
          fontSize: 10,
          fontFamily: 'Inter, system-ui, sans-serif',
          formatter: (value: number) => `${currencyPrefix}${value}${chartUnit}${currencySuffix}`,
        },
        splitLine: {
          lineStyle: {
            color: SPLIT_LINE_COLOR,
            type: 'dashed',
            opacity: isLight ? 0.8 : 0.5
          }
        },
      },
      {
        type: 'value',
        name: '',
        position: 'right',
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisLabel: {
          show: false,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: rcT.legend.revenue,
        type: 'bar',
        yAxisIndex: 0,
        data: revenues,
        barWidth: '20%',
        itemStyle: { color: '#4A86E8', borderRadius: 0 },
      },
      {
        name: rcT.legend.grossProfit,
        type: 'bar',
        yAxisIndex: 0,
        data: grossProfits,
        barWidth: '20%',
        itemStyle: { color: '#7FA3BF', borderRadius: 0 },
      },
      {
        name: rcT.legend.netIncome,
        type: 'bar',
        yAxisIndex: 0,
        data: netIncomes,
        barWidth: '20%',
        itemStyle: { color: '#3FA66B', borderRadius: 0 },
      },
      {
        name: rcT.legend.grossMargin,
        type: 'line',
        yAxisIndex: 1,
        data: grossProfitMargins,
        smooth: false,
        symbol: 'none',
        lineStyle: { color: '#D9534F', width: 1.5 },
        itemStyle: { color: '#D9534F' },
      },
    ],
  };

  const latestIncome = activeStatements[0];
  const pieData = latestIncome ? [
    { name: rcT.pie.costOfRevenue, value: latestIncome.costOfRevenue || 0 },
    { name: rcT.pie.rd, value: latestIncome.researchAndDevelopmentExpenses || 0 },
    { name: rcT.pie.sga, value: latestIncome.sellingGeneralAndAdministrativeExpenses || 0 },
    { name: rcT.pie.netIncome, value: latestIncome.netIncome || 0 },
  ].filter(d => d.value > 0) : [];

  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: TOOLTIP_BG,
      borderColor: BORDER_COLOR,
      borderWidth: 1,
      textStyle: { color: TEXT_PRIMARY },
      formatter: (params: any) => {
        const value = params.value / chartScale;
        return `<div style="font-weight: 600; color: ${TEXT_PRIMARY};">${params.name}</div>
                <div style="margin-top: 4px;">
                  <span style="color: ${ACCENT_COLOR}; font-size: 16px; font-weight: 600;">${currencyPrefix}${value.toFixed(2)}${chartUnit}${currencySuffix}</span>
                  <span style="color: ${TEXT_MUTED}; margin-left: 8px;">(${params.percent}%)</span>
                </div>`;
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: '0',
      left: 'center',
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      formatter: (name: string) => {
        const item = pieData.find(d => d.name === name);
        if (item) {
          const value = item.value / chartScale;
          const total = pieData.reduce((sum, d) => sum + d.value, 0);
          const percent = ((item.value / total) * 100).toFixed(1);
          return `{name|${name}}\n{value|${currencyPrefix}${value.toFixed(1)}${chartUnit}${currencySuffix}} {percent|(${percent}%)}`;
        }
        return name;
      },
      textStyle: {
        color: TEXT_PRIMARY,
        fontSize: 13,
        fontWeight: 500,
        rich: {
          name: {
            color: TEXT_PRIMARY,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 20,
          },
          value: {
            color: ACCENT_COLOR,
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
          },
          percent: {
            color: TEXT_MUTED,
            fontSize: 11,
          },
        },
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderWidth: 0,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          label: { show: false },
          scaleSize: 8,
        },
        data: pieData.map((d, i) => ({
          ...d,
          itemStyle: {
            color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length],
          },
        })),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="inline-flex overflow-hidden rounded-md border border-line-strong">
          <button
            onClick={() => setPeriod('annual')}
            className={`h-7 px-3 text-[12px] font-medium transition-colors ${period === 'annual'
              ? 'bg-accent/10 text-accent'
              : 'text-text-2 hover:bg-hover hover:text-fg'
              }`}
          >
            {rcT.annual}
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            className={`h-7 border-l border-line px-3 text-[12px] font-medium transition-colors ${period === 'quarter'
              ? 'bg-accent/10 text-accent'
              : 'text-text-2 hover:bg-hover hover:text-fg'
              }`}
          >
            {rcT.quarter}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-sm p-4 border border-white/10">
          <h4 className="text-xs font-mono font-medium text-mist-500 mb-4 uppercase tracking-wider">
            {period === 'quarter' ? rcT.quarter : rcT.annual} {rcT.revenueTrendSuffix}
          </h4>
          <ReactECharts
            option={barOption}
            style={{ height: '300px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
        <div className="bg-white/5 rounded-sm p-4 border border-white/10">
          <h4 className="text-xs font-mono font-medium text-mist-500 mb-4 uppercase tracking-wider">
            {rcT.costStructure} ({currencyPrefix}{(pieData[0]?.value / chartScale).toFixed(1)}{chartUnit}{currencySuffix}+)
          </h4>
          <ReactECharts
            option={pieOption}
            style={{ height: '300px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      </div>
    </div>
  );
}
