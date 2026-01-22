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
      backgroundColor: '#121212',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.2)',
          type: 'dashed'
        }
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: 500; margin-bottom: 4px; color: #94a3b8; font-size: 11px;">${params[0].axisValue}</div>`;
        result += '<table style="width:100%; border-collapse: collapse;">';
        params.forEach((p: any) => {
          const isMargin = p.seriesName === '毛利率';
          const valueStr = isMargin ? `${p.value.toFixed(1)}%` : `$${p.value.toFixed(2)}B`;
          result += `<tr>
            <td style="padding: 2px 8px 2px 0; display: flex; align-items: center;">
              <span style="width: 6px; height: 6px; background: ${p.color}; margin-right: 6px; display: inline-block;"></span>
              <span style="color: #cbd5e1; font-size: 12px;">${p.seriesName}</span>
            </td>
            <td style="padding: 2px 0 2px 8px; text-align: right; color: #fff; font-weight: 500;">${valueStr}</td>
          </tr>`;
        });
        result += '</table>';
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
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      axisTick: { show: true, lineStyle: { color: '#334155' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '',
        axisLine: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (value: number) => `${value}`,
        },
        splitLine: {
          lineStyle: {
            color: '#1e293b',
            type: 'dashed',
            opacity: 0.5
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
          color: '#2dd4bf', // Teal 400
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
          color: '#94a3b8', // Slate 400
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
          color: '#10b981', // Emerald 500
          borderRadius: 0
        },
      },
      {
        name: '毛利率',
        type: 'line',
        yAxisIndex: 1,
        data: grossProfitMargins,
        smooth: false, // Sharp lines
        symbol: 'none',
        lineStyle: {
          color: '#f43f5e', // Rose 500 (distinct from others)
          width: 1.5,
        },
        itemStyle: {
          color: '#f43f5e',
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
        <div className="flex p-0.5 bg-white/5 border border-white/10 rounded-sm">
          <button
            onClick={() => setPeriod('annual')}
            className={`px-3 py-1 text-xs font-mono rounded-sm transition-all ${period === 'annual'
              ? 'bg-glacier-500 text-obsidian font-bold'
              : 'text-mist-500 hover:text-mist-200'
              }`}
          >
            年度
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            className={`px-3 py-1 text-xs font-mono rounded-sm transition-all ${period === 'quarter'
              ? 'bg-glacier-500 text-obsidian font-bold'
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
            成本结构 ({(pieData[0]?.value / 1e9).toFixed(1)}B+)
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
