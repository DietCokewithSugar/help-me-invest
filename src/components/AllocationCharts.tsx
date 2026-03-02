'use client';

import ReactECharts from 'echarts-for-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AllocationItem {
  name: string;
  percentage: number;
  amount: number;
  color: string;
}

interface RiskReturnItem {
  name: string;
  risk: number;
  expectedReturn: number;
}

interface ChartData {
  allocation?: AllocationItem[];
  riskReturn?: RiskReturnItem[];
}

interface Props {
  chartData: ChartData;
  theme?: 'dark' | 'light';
  currency?: string;
}

const FALLBACK_COLORS = ['#88ABDA', '#98B6C2', '#C0D09D', '#CB523E', '#DFD6B8', '#EAE4D1', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

export default function AllocationCharts({ chartData, theme = 'dark', currency = 'CNY' }: Props) {
  const { locale } = useLanguage();
  const isLight = theme === 'light';
  const isZh = locale === 'zh';

  const TEXT_PRIMARY = isLight ? '#1e293b' : '#e2e8f0';
  const TEXT_SECONDARY = isLight ? '#475569' : '#94a3b8';
  const BG_SURFACE = isLight ? '#ffffff' : '#121212';
  const BORDER = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const currencyUnit = currency === 'CNY' ? (isZh ? '万元' : '0k CNY') : (isZh ? '万美元' : '0k USD');

  const { allocation, riskReturn } = chartData;

  if (!allocation?.length && !riskReturn?.length) return null;

  const pieOption = allocation?.length ? {
    tooltip: {
      trigger: 'item',
      backgroundColor: BG_SURFACE,
      borderColor: BORDER,
      borderWidth: 1,
      textStyle: { color: TEXT_PRIMARY, fontSize: 12 },
      formatter: (p: any) => {
        return `<strong>${p.name}</strong><br/>${isZh ? '比例' : 'Share'}: ${p.value}%<br/>${isZh ? '金额' : 'Amount'}: ${p.data.amount} ${currencyUnit}`;
      },
    },
    legend: {
      orient: 'vertical' as const,
      right: '2%',
      top: 'center',
      textStyle: { color: TEXT_SECONDARY, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 8,
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: BG_SURFACE,
        borderWidth: 2,
      },
      label: {
        show: false,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 'bold',
          color: TEXT_PRIMARY,
          formatter: '{b}\n{d}%',
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
      data: allocation.map((item, i) => ({
        value: item.percentage,
        name: item.name,
        amount: item.amount,
        itemStyle: { color: item.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] },
      })),
    }],
  } : null;

  const scatterOption = riskReturn?.length ? {
    tooltip: {
      trigger: 'item',
      backgroundColor: BG_SURFACE,
      borderColor: BORDER,
      borderWidth: 1,
      textStyle: { color: TEXT_PRIMARY, fontSize: 12 },
      formatter: (p: any) => {
        return `<strong>${p.data[2]}</strong><br/>${isZh ? '风险等级' : 'Risk Level'}: ${p.data[0]}/10<br/>${isZh ? '预期收益' : 'Expected Return'}: ${p.data[1]}%`;
      },
    },
    grid: {
      left: '12%',
      right: '8%',
      top: '12%',
      bottom: '15%',
    },
    xAxis: {
      name: isZh ? '风险等级' : 'Risk Level',
      nameTextStyle: { color: TEXT_SECONDARY, fontSize: 11 },
      min: 0,
      max: 10,
      axisLine: { lineStyle: { color: BORDER } },
      axisLabel: { color: TEXT_SECONDARY, fontSize: 11 },
      splitLine: { lineStyle: { color: BORDER, type: 'dashed' as const } },
    },
    yAxis: {
      name: isZh ? '预期年化收益 (%)' : 'Expected Return (%)',
      nameTextStyle: { color: TEXT_SECONDARY, fontSize: 11 },
      axisLine: { lineStyle: { color: BORDER } },
      axisLabel: { color: TEXT_SECONDARY, fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: BORDER, type: 'dashed' as const } },
    },
    series: [{
      type: 'scatter',
      symbolSize: (val: number[]) => Math.max(20, val[1] * 2),
      data: riskReturn.map((item) => [item.risk, item.expectedReturn, item.name]),
      label: {
        show: true,
        formatter: (p: any) => p.data[2],
        position: 'top',
        color: TEXT_SECONDARY,
        fontSize: 10,
      },
      itemStyle: {
        color: (params: any) => {
          const alloc = allocation?.find(a => a.name === params.data[2]);
          return alloc?.color || FALLBACK_COLORS[params.dataIndex % FALLBACK_COLORS.length];
        },
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.2)',
      },
    }],
  } : null;

  return (
    <div className="space-y-6 mb-6">
      {pieOption && (
        <div className="p-4 rounded-md border" style={{ borderColor: BORDER, backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>
            {isZh ? '📊 资产配置比例' : '📊 Asset Allocation'}
          </h3>
          <ReactECharts option={pieOption} style={{ height: 280 }} opts={{ renderer: 'svg' }} />
        </div>
      )}
      {scatterOption && (
        <div className="p-4 rounded-md border" style={{ borderColor: BORDER, backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>
            {isZh ? '⚖️ 风险收益分布' : '⚖️ Risk-Return Profile'}
          </h3>
          <ReactECharts option={scatterOption} style={{ height: 280 }} opts={{ renderer: 'svg' }} />
        </div>
      )}
    </div>
  );
}
