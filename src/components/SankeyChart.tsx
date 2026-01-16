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

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      borderColor: 'rgba(20, 184, 166, 0.3)',
      borderWidth: 1,
      textStyle: { 
        color: '#f8fafc',
        fontSize: 13,
      },
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `<div style="font-weight: 600;">${params.data.source} → ${params.data.target}</div>
                  <div style="color: #14b8a6; font-size: 16px; margin-top: 4px;">${formatValue(params.data.value)}</div>`;
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
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.5,
        },
        itemStyle: {
          borderWidth: 0,
          borderRadius: 4,
        },
        label: {
          color: '#f8fafc',
          fontSize: 13,
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontWeight: 500,
          position: 'right',
          formatter: (params: any) => {
            // 计算节点的值（流入或流出的总和）
            const nodeValue = data.links
              .filter(link => link.source === params.name || link.target === params.name)
              .reduce((sum, link) => {
                if (link.source === params.name) return Math.max(sum, link.value);
                return sum + link.value;
              }, 0);
            return `${params.name}\n${formatValue(nodeValue)}`;
          },
        },
        data: data.nodes.map((node, index) => ({
          ...node,
          itemStyle: {
            color: [
              '#14b8a6', // 总营收 - 青绿色
              '#ef4444', // 营业成本 - 红色
              '#22c55e', // 毛利润 - 绿色
              '#8b5cf6', // 研发费用 - 紫色
              '#f59e0b', // 销售管理费用 - 橙色
              '#3b82f6', // 营业利润 - 蓝色
              '#ec4899', // 税费及其他 - 粉色
              '#fbbf24', // 净利润 - 金色
            ][index % 8],
          },
        })),
        links: data.links,
      },
    ],
  };

  if (!data.links || data.links.length === 0) {
    return (
      <div className="bg-midnight/50 rounded-xl p-8 text-center text-slate-400">
        <p>暂无足够的财务数据来生成桑基图</p>
      </div>
    );
  }

  return (
    <div className="bg-midnight/50 rounded-xl p-4 border border-white/5">
      <ReactECharts
        option={option}
        style={{ height: '420px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
