'use client';

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { getChartTheme, tooltipStyle } from '@/lib/chart-theme';
import { useLanguage } from '@/contexts/LanguageContext';

interface PricePoint {
  date: string;
  close: number;
}

const RANGES = [
  { key: '1M', days: 31 },
  { key: '3M', days: 92 },
  { key: '6M', days: 183 },
  { key: '1Y', days: 366 },
  { key: '5Y', days: 366 * 5 },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

/**
 * 收盘价走势。区间切换即时重绘（关闭 ECharts 动画），不做入场动画。
 * history 为新→旧（与 FMP / Yahoo 归一化结果一致）。
 */
export default function PriceChart({
  history,
  theme,
  currencyCode,
}: {
  history: PricePoint[];
  theme: 'dark' | 'light';
  currencyCode: string;
}) {
  const { t } = useLanguage();
  const [range, setRange] = useState<RangeKey>('1Y');
  const chartTheme = getChartTheme(theme);

  const series = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return [];
    const latest = new Date(`${history[0].date}T00:00:00Z`).getTime();
    const days = RANGES.find((r) => r.key === range)?.days ?? 366;
    const cutoff = latest - days * 86_400_000;
    return history
      .filter((point) => typeof point?.close === 'number' && new Date(`${point.date}T00:00:00Z`).getTime() >= cutoff)
      .slice()
      .reverse();
  }, [history, range]);

  const first = series[0]?.close;
  const last = series[series.length - 1]?.close;
  const change = first && last ? last - first : null;
  const changePct = first && change !== null ? (change / first) * 100 : null;
  const lineColor = change !== null && change < 0 ? chartTheme.down : chartTheme.up;

  const option = useMemo(() => ({
    animation: false,
    backgroundColor: 'transparent',
    grid: { left: 4, right: 4, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      ...tooltipStyle(chartTheme),
      axisPointer: { type: 'line', lineStyle: { color: chartTheme.axisLine } },
      valueFormatter: (value: number) => value?.toFixed(2),
    },
    xAxis: {
      type: 'category',
      data: series.map((p) => p.date),
      boundaryGap: false,
      axisLine: { lineStyle: { color: chartTheme.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: chartTheme.textMuted, fontSize: 11, fontFamily: chartTheme.fontFamily, hideOverlap: true, alignMinLabel: 'left', alignMaxLabel: 'right' },
    },
    yAxis: {
      type: 'value',
      position: 'right',
      scale: true,
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
      axisLabel: { color: chartTheme.textMuted, fontSize: 11, fontFamily: chartTheme.fontFamily },
    },
    series: [
      {
        type: 'line',
        name: currencyCode,
        data: series.map((p) => p.close),
        showSymbol: false,
        lineStyle: { width: 1.5, color: lineColor },
        itemStyle: { color: lineColor },
        areaStyle: { color: lineColor, opacity: 0.06 },
      },
    ],
  }), [series, chartTheme, lineColor, currencyCode]);

  return (
    <section className="panel flex flex-col">
      <div className="panel-header">
        <div className="flex items-baseline gap-3">
          <span className="panel-title">{t.report.overview.priceChart}</span>
          {changePct !== null && (
            <span className={`font-mono text-[13px] font-medium ${change! >= 0 ? 'text-up' : 'text-down'}`}>
              {change! >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          )}
        </div>
        <div role="tablist" className="flex items-center gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`h-7 min-w-[36px] rounded-sm px-2 font-mono text-[12px] font-medium ${
                range === r.key ? 'bg-accent/10 text-accent' : 'text-text-3 hover:bg-hover hover:text-fg'
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>
      <div className="px-2 pb-2 pt-1">
        {series.length > 1 ? (
          <ReactECharts option={option} notMerge style={{ height: 260, width: '100%' }} opts={{ renderer: 'svg' }} />
        ) : (
          <div className="flex h-[260px] items-center justify-center text-[13px] text-text-3">
            {t.report.overview.noChartData}
          </div>
        )}
      </div>
    </section>
  );
}
