'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { IncomeStatement } from '@/types';

interface Props {
  incomeStatements: IncomeStatement[];
  incomeStatementsQuarter?: IncomeStatement[];
}

export default function RevenueCharts({ incomeStatements, incomeStatementsQuarter }: Props) {
  const [period, setPeriod] = useState<'annual' | 'quarter'>('annual');
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

  const years = activeStatements.map(i => {
    if (period === 'quarter') return `${i.fiscalYear} ${i.period}`;
    return i.date?.split('-')[0] || '';
  }).reverse();
  const revenues = activeStatements.map(i => (i.revenue || 0) / 1e9).reverse();
  const netIncomes = activeStatements.map(i => (i.netIncome || 0) / 1e9).reverse();
  const grossProfits = activeStatements.map(i => (i.grossProfit || 0) / 1e9).reverse();
  // 计算毛利率 (毛利润 / 营收 * 100%)
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
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      borderColor: 'rgba(20, 184, 166, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#f8fafc' },
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(20, 184, 166, 0.1)',
        }
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
        params.forEach((p: any) => {
          const isMargin = p.seriesName === '毛利率';
          const valueStr = isMargin ? `${p.value.toFixed(1)}%` : `$${p.value.toFixed(2)}B`;
          result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="width: 10px; height: 10px; background: ${p.color}; border-radius: ${isMargin ? '50%' : '2px'};"></span>
            <span>${p.seriesName}: </span>
            <span style="font-weight: 600;">${valueStr}</span>
          </div>`;
        });
        return result;
      },
    },
    legend: {
      data: ['营收', '毛利润', '净利润', '毛利率'],
      textStyle: { color: '#94a3b8', fontSize: 12 },
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
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '金额 (十亿美元)',
        nameTextStyle: {
          color: '#64748b',
          fontSize: 11,
          padding: [0, 0, 8, 0],
        },
        axisLine: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (value: number) => `$${value}B`,
        },
        splitLine: {
          lineStyle: {
            color: '#1e293b',
            type: 'dashed',
          }
        },
      },
      {
        type: 'value',
        name: '毛利率 (%)',
        nameTextStyle: {
          color: '#e879a0',
          fontSize: 11,
          padding: [0, 0, 8, 0],
        },
        position: 'right',
        min: 0,
        max: 100,
        axisLine: {
          show: true,
          lineStyle: { color: '#e879a0', opacity: 0.3 }
        },
        axisLabel: {
          color: '#e879a0',
          fontSize: 11,
          formatter: (value: number) => `${value}%`,
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
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#64948b' },  // 低饱和度青绿
              { offset: 1, color: '#4a7a72' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          color: '#94a3b8',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (params: any) => `$${params.value.toFixed(1)}B`,
        },
      },
      {
        name: '毛利润',
        type: 'bar',
        yAxisIndex: 0,
        data: grossProfits,
        barWidth: '20%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#7a8494' },  // 低饱和度蓝灰
              { offset: 1, color: '#5a6474' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          color: '#94a3b8',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (params: any) => `$${params.value.toFixed(1)}B`,
        },
      },
      {
        name: '净利润',
        type: 'bar',
        yAxisIndex: 0,
        data: netIncomes,
        barWidth: '20%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#5a9472' },  // 低饱和度绿
              { offset: 1, color: '#3a7452' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          color: '#94a3b8',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (params: any) => `$${params.value.toFixed(1)}B`,
        },
      },
      {
        name: '毛利率',
        type: 'line',
        yAxisIndex: 1,
        data: grossProfitMargins,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#e879a0',
          width: 2.5,
          shadowColor: 'rgba(232, 121, 160, 0.3)',
          shadowBlur: 8,
        },
        itemStyle: {
          color: '#e879a0',
          borderColor: '#1a1a2e',
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(232, 121, 160, 0.15)' },
              { offset: 1, color: 'rgba(232, 121, 160, 0)' }
            ]
          },
        },
        label: {
          show: true,
          position: 'top',
          color: '#e879a0',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (params: any) => `${params.value.toFixed(1)}%`,
        },
      },
    ],
  };

  // 饼图 - 成本结构
  const latestIncome = activeStatements[0];
  const pieData = latestIncome ? [
    { name: '营业成本', value: latestIncome.costOfRevenue || 0 },
    { name: '研发费用', value: latestIncome.researchAndDevelopmentExpenses || 0 },
    { name: '销售管理费用', value: latestIncome.sellingGeneralAndAdministrativeExpenses || 0 },
    { name: '净利润', value: latestIncome.netIncome || 0 },
  ].filter(d => d.value > 0) : [];

  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      borderColor: 'rgba(20, 184, 166, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#f8fafc' },
      formatter: (params: any) => {
        const value = params.value / 1e9;
        return `<div style="font-weight: 600;">${params.name}</div>
                <div style="margin-top: 4px;">
                  <span style="color: #14b8a6; font-size: 16px; font-weight: 600;">$${value.toFixed(2)}B</span>
                  <span style="color: #64748b; margin-left: 8px;">(${params.percent}%)</span>
                </div>`;
      },
    },
    legend: {
      orient: 'vertical',
      right: '3%',
      top: 'center',
      itemWidth: 16,
      itemHeight: 16,
      itemGap: 16,
      formatter: (name: string) => {
        const item = pieData.find(d => d.name === name);
        if (item) {
          const value = item.value / 1e9;
          const total = pieData.reduce((sum, d) => sum + d.value, 0);
          const percent = ((item.value / total) * 100).toFixed(1);
          return `{name|${name}}\n{value|$${value.toFixed(1)}B} {percent|(${percent}%)}`;
        }
        return name;
      },
      textStyle: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: 500,
        rich: {
          name: {
            color: '#e2e8f0',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 20,
          },
          value: {
            color: '#14b8a6',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
          },
          percent: {
            color: '#64748b',
            fontSize: 11,
          },
        },
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '80%'],
        center: ['30%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#1a1a2e',
          borderWidth: 3,
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          label: {
            show: false,
          },
          scaleSize: 8,
        },
        data: pieData.map((d, i) => ({
          ...d,
          itemStyle: {
            // 低饱和度配色：暗红、蓝灰、琥珀灰、暗绿
            color: ['#94655a', '#7a8494', '#947a5a', '#5a9472'][i],
          },
        })),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setPeriod('annual')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${period === 'annual'
              ? 'bg-glacier-500 text-white shadow-lg shadow-glacier-500/20'
              : 'text-mist-400 hover:text-mist-200'
              }`}
          >
            年度
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${period === 'quarter'
              ? 'bg-glacier-500 text-white shadow-lg shadow-glacier-500/20'
              : 'text-mist-400 hover:text-mist-200'
              }`}
          >
            季度
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-midnight/50 rounded-xl p-4 md:p-5 border border-white/5 max-md:border-0">
          <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            {period === 'quarter' ? '季度' : '年度'}营收趋势
          </h4>
          <ReactECharts
            option={barOption}
            style={{ height: '320px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
        <div className="bg-midnight/50 rounded-xl p-4 md:p-5 border border-white/5 max-md:border-0">
          <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
            {latestIncome ? (period === 'quarter' ? `${latestIncome.fiscalYear} ${latestIncome.period}` : latestIncome.date?.split('-')[0]) : ''} 成本结构分布
          </h4>
          <ReactECharts
            option={pieOption}
            style={{ height: '320px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      </div>
    </div>
  );
}
