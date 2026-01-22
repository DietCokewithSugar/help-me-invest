'use client';

import ReactECharts from 'echarts-for-react';
import type { SankeyData } from '@/types';

interface SankeyProps {
  data: SankeyData;
}

export default function SankeyChart({ data }: SankeyProps) {
  const formatValue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  // 低饱和度配色 - 电子墨水风格
  // 低饱和度配色 - 实用主义风格
  const REVENUE_COLOR = '#475569';  // Slate 600
  const EXPENSE_COLOR = '#b91c1c';  // Red 700 (darker semantic error)
  const PROFIT_COLOR = '#059669';   // Emerald 600

  const revenueNodes = new Set(['主营业务收入', '其他收入', '总营收']);
  const expenseNodes = new Set(['营业成本', '研发费用', '销售及管理费用', '税费及其他']);
  const profitNodes = new Set(['毛利润', '营业利润', '净利润']);

  const getNodeCategory = (name: string) => {
    if (profitNodes.has(name)) return 'profit';
    if (expenseNodes.has(name)) return 'expense';
    return 'revenue';
  };

  const hasOtherRevenue = data.nodes.some((node) => node.name === '其他收入');
  const positionMap: Record<string, { x: number; y: number }> = {
    主营业务收入: { x: 0.02, y: hasOtherRevenue ? 0.35 : 0.5 },
    其他收入: { x: 0.02, y: 0.65 },
    总营收: { x: 0.18, y: 0.5 },
    营业成本: { x: 0.38, y: 0.72 },
    毛利润: { x: 0.38, y: 0.25 },
    研发费用: { x: 0.58, y: 0.78 },
    销售及管理费用: { x: 0.58, y: 0.9 },
    营业利润: { x: 0.58, y: 0.18 },
    税费及其他: { x: 0.78, y: 0.72 },
    净利润: { x: 0.78, y: 0.1 },
  };

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: '#121212',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: '#e2e8f0',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `<div style="font-weight: 500; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">${params.data.source} → ${params.data.target}</div>
                  <div style="color: #fff; font-size: 13px; font-weight: 600;">${formatValue(params.data.value)}</div>`;
        }
        return `<div style="font-weight: 600;">${params.name}</div>`;
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            opacity: 0.8,
          }
        },
        nodeAlign: 'left',
        orient: 'horizontal',
        nodeWidth: 24,
        nodeGap: 20,
        draggable: false,
        lineStyle: {
          color: REVENUE_COLOR,
          curveness: 0.45,
          opacity: 0.45,
        },
        itemStyle: {
          borderWidth: 0,
          borderRadius: 4,
        },
        label: {
          color: '#e2e8f0',
          fontSize: 11,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          position: 'right',
          formatter: (params: any) => {
            const incoming = data.links
              .filter((link) => link.target === params.name)
              .reduce((sum, link) => sum + link.value, 0);
            const outgoing = data.links
              .filter((link) => link.source === params.name)
              .reduce((sum, link) => sum + link.value, 0);
            const nodeValue = Math.max(incoming, outgoing);
            return `${params.name}\n${formatValue(nodeValue)}`;
          },
        },
        data: data.nodes.map((node) => {
          const category = getNodeCategory(node.name);
          const position = positionMap[node.name];
          const color =
            category === 'profit' ? PROFIT_COLOR : category === 'expense' ? EXPENSE_COLOR : REVENUE_COLOR;
          return {
            ...node,
            ...(position ? position : {}),
            itemStyle: {
              color,
            },
          };
        }),
        links: data.links.map((link) => {
          const category = getNodeCategory(link.target);
          const color =
            category === 'profit' ? PROFIT_COLOR : category === 'expense' ? EXPENSE_COLOR : REVENUE_COLOR;
          return {
            ...link,
            lineStyle: {
              color,
            },
          };
        }),
      },
    ],
  };

  if (!data.links || data.links.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-sm p-8 text-center text-slate-500 font-mono text-xs">
        <p>暂无足够的财务数据生成桑基图</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-sm p-4 overflow-x-auto">
      {/* 移动端：高度窄、可横向滚动查看完整图表 */}
      <div className="md:hidden" style={{ minWidth: '580px' }}>
        <ReactECharts
          option={option}
          style={{ height: '260px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
      {/* 桌面端：正常尺寸 */}
      <div className="hidden md:block">
        <ReactECharts
          option={option}
          style={{ height: '380px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
}
