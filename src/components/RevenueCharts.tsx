'use client';

import ReactECharts from 'echarts-for-react';
import type { IncomeStatement } from '@/types';

interface Props {
  incomeStatements: IncomeStatement[];
}

export default function RevenueCharts({ incomeStatements }: Props) {
  if (!incomeStatements || incomeStatements.length === 0) {
    return (
      <div className="text-center text-slate-400 p-8">
        暂无财务数据
      </div>
    );
  }

  const years = incomeStatements.map(i => i.date?.split('-')[0] || '').reverse();
  const revenues = incomeStatements.map(i => (i.revenue || 0) / 1e9).reverse();
  const netIncomes = incomeStatements.map(i => (i.netIncome || 0) / 1e9).reverse();
  const grossProfits = incomeStatements.map(i => (i.grossProfit || 0) / 1e9).reverse();

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
          result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="width: 10px; height: 10px; background: ${p.color}; border-radius: 2px;"></span>
            <span>${p.seriesName}: </span>
            <span style="font-weight: 600;">$${p.value.toFixed(2)}B</span>
          </div>`;
        });
        return result;
      },
    },
    legend: {
      data: ['营收', '毛利润', '净利润'],
      textStyle: { color: '#94a3b8', fontSize: 12 },
      top: 0,
      itemGap: 24,
    },
    grid: { 
      left: '3%', 
      right: '4%', 
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
    yAxis: {
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
    series: [
      {
        name: '营收',
        type: 'bar',
        data: revenues,
        barWidth: '20%',
        itemStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#14b8a6' },
              { offset: 1, color: '#0f766e' }
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
        data: grossProfits,
        barWidth: '20%',
        itemStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#8b5cf6' },
              { offset: 1, color: '#6d28d9' }
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
        data: netIncomes,
        barWidth: '20%',
        itemStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#fbbf24' },
              { offset: 1, color: '#d97706' }
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
    ],
  };

  // 饼图 - 成本结构
  const latestIncome = incomeStatements[0];
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
      right: '5%',
      top: 'center',
      textStyle: { 
        color: '#94a3b8',
        fontSize: 12,
      },
      itemGap: 12,
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#1a1a2e',
          borderWidth: 3,
        },
        label: { 
          show: true,
          position: 'outside',
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (params: any) => {
            const value = params.value / 1e9;
            return `${params.name}\n$${value.toFixed(1)}B (${params.percent}%)`;
          },
        },
        labelLine: {
          show: true,
          lineStyle: {
            color: '#475569',
          },
        },
        emphasis: {
          label: { 
            show: true, 
            color: '#f8fafc', 
            fontSize: 13,
            fontWeight: 600,
          },
          scaleSize: 10,
        },
        data: pieData.map((d, i) => ({
          ...d,
          itemStyle: {
            color: ['#ef4444', '#8b5cf6', '#f59e0b', '#22c55e'][i],
          },
        })),
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-midnight/50 rounded-xl p-5 border border-white/5">
        <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-aurora-500 rounded-full"></span>
          年度营收趋势
        </h4>
        <ReactECharts
          option={barOption}
          style={{ height: '320px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
      <div className="bg-midnight/50 rounded-xl p-5 border border-white/5">
        <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
          {latestIncome?.date?.split('-')[0] || ''} 成本结构分布
        </h4>
        <ReactECharts
          option={pieOption}
          style={{ height: '320px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
}
