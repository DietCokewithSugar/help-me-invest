'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { IncomeStatement } from '@/types';
import { useUnitMode } from '@/lib/UnitModeContext';

interface Props {
  incomeStatements: IncomeStatement[];
  incomeStatementsQuarter?: IncomeStatement[];
  theme?: 'dark' | 'light';
}

export default function RevenueCharts({ incomeStatements, incomeStatementsQuarter, theme = 'dark' }: Props) {
  const isLight = theme === 'light';
  const [period, setPeriod] = useState<'annual' | 'quarter'>('annual');
  const { unitMode } = useUnitMode();

  const activeStatements = period === 'quarter' && incomeStatementsQuarter?.length
    ? incomeStatementsQuarter
    : incomeStatements;

  if (!activeStatements || activeStatements.length === 0) {
    return (
      <div className="text-center text-slate-400 p-8">
        暂无财务数据
      </div>
    );
  }

  // Dynamic scale based on unit mode
  const chartScale = unitMode === 'zh' ? 1e8 : 1e9;
  const chartUnit = unitMode === 'zh' ? '亿' : 'B';
  const currencyPrefix = unitMode === 'zh' ? '¥' : '$';

  // 颜色定义
  const TEXT_PRIMARY = isLight ? '#1e293b' : '#e2e8f0';
  const TEXT_SECONDARY = isLight ? '#475569' : '#94a3b8';
  const TEXT_MUTED = isLight ? '#64748b' : '#64748b';
  const BORDER_COLOR = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const AXIS_LINE_COLOR = isLight ? '#e2e8f0' : '#334155';
  const SPLIT_LINE_COLOR = isLight ? '#f1f5f9' : '#1e293b';
  const TOOLTIP_BG = isLight ? '#ffffff' : '#121212';
  const ACCENT_COLOR = isLight ? '#0d9488' : '#14b8a6';

  // 传统色分类配色 (白青 Bai Qing, 窈蓝 Yao Lan, 鞠尘 Ju Chen, 艳炽 Yan Chi)
  const CATEGORICAL_COLORS = ['#98B6C2', '#88ABDA', '#C0D09D', '#CB523E'];

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
      textStyle: { color: TEXT_PRIMARY, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
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
          const isMargin = p.seriesName === '毛利率';
          const valueStr = isMargin ? `${p.value.toFixed(1)}%` : `${currencyPrefix}${p.value.toFixed(2)}${chartUnit}`;
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
      data: ['营收', '毛利润', '净利润', '毛利率'],
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
        fontFamily: 'JetBrains Mono, monospace',
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
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (value: number) => `${value}`,
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
        name: '营收',
        type: 'bar',
        yAxisIndex: 0,
        data: revenues,
        barWidth: '20%',
        itemStyle: {
          color: '#88ABDA', // 窈蓝
          borderRadius: 0
        },
      },
      {
        name: '毛利润',
        type: 'bar',
        yAxisIndex: 0,
        data: grossProfits,
        barWidth: '20%',
        itemStyle: {
          color: '#98B6C2', // 白青
          borderRadius: 0
        },
      },
      {
        name: '净利润',
        type: 'bar',
        yAxisIndex: 0,
        data: netIncomes,
        barWidth: '20%',
        itemStyle: {
          color: '#C0D09D', // 鞠尘
          borderRadius: 0
        },
      },
      {
        name: '毛利率',
        type: 'line',
        yAxisIndex: 1,
        data: grossProfitMargins,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#CB523E', // 艳炽
          width: 1.5,
        },
        itemStyle: {
          color: '#CB523E',
        },
      },
    ],
  };

  // 饼图 - 成本结构
  const latestIncome = activeStatements[0];
  const pieData = latestIncome ? [
    { name: '营业成本', value: latestIncome.costOfRevenue || 0 },
    { name: '研发', value: latestIncome.researchAndDevelopmentExpenses || 0 },
    { name: '销售管理', value: latestIncome.sellingGeneralAndAdministrativeExpenses || 0 },
    { name: '净利润', value: latestIncome.netIncome || 0 },
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
                  <span style="color: ${ACCENT_COLOR}; font-size: 16px; font-weight: 600;">${currencyPrefix}${value.toFixed(2)}${chartUnit}</span>
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
          return `{name|${name}}\n{value|${currencyPrefix}${value.toFixed(1)}${chartUnit}} {percent|(${percent}%)}`;
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
            fontFamily: 'JetBrains Mono, monospace',
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
        <div className="flex p-0.5 bg-white/5 border border-white/10 rounded-sm">
          <button
            onClick={() => setPeriod('annual')}
            className={`px-3 py-1 text-xs font-mono rounded-sm transition-all ${period === 'annual'
              ? 'bg-glacier-500 text-white'
              : 'text-mist-500 hover:text-mist-200'
              }`}
          >
            年度
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            className={`px-3 py-1 text-xs font-mono rounded-sm transition-all ${period === 'quarter'
              ? 'bg-glacier-500 text-white'
              : 'text-mist-500 hover:text-mist-200'
              }`}
          >
            季度
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-sm p-4 border border-white/10">
          <h4 className="text-xs font-mono font-medium text-mist-500 mb-4 uppercase tracking-wider">
            {period === 'quarter' ? '季度' : '年度'}营收趋势
          </h4>
          <ReactECharts
            option={barOption}
            style={{ height: '300px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
        <div className="bg-white/5 rounded-sm p-4 border border-white/10">
          <h4 className="text-xs font-mono font-medium text-mist-500 mb-4 uppercase tracking-wider">
            成本结构 ({currencyPrefix}{(pieData[0]?.value / chartScale).toFixed(1)}{chartUnit}+)
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
