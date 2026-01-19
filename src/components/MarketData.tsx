'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, LineChart, BarChart3, Gauge } from 'lucide-react';
import type { IntradayPrice, HistoricalPrice, TechnicalIndicators } from '@/types';

interface Props {
  intradayPrices?: IntradayPrice[];
  historicalPrices?: HistoricalPrice[];
  technicalIndicators?: TechnicalIndicators;
}

type TabType = 'intraday' | 'historical' | 'technical';

export default function MarketData({ intradayPrices = [], historicalPrices = [], technicalIndicators }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('intraday');

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  const toDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const toDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const intradaySorted = [...intradayPrices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const historicalSorted = [...historicalPrices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const historicalDisplay = historicalSorted.slice(-260);

  const getLatestIndicator = (data?: { date: string }[]) => {
    if (!data?.length) return null;
    const sorted = [...data].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted[sorted.length - 1] as any;
  };

  const latestSma = getLatestIndicator(technicalIndicators?.sma);
  const latestEma = getLatestIndicator(technicalIndicators?.ema);
  const latestRsi = getLatestIndicator(technicalIndicators?.rsi);
  const latestMacd = getLatestIndicator(technicalIndicators?.macd);

  const intradayOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      textStyle: { color: '#f8fafc' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: {
      type: 'category',
      data: intradaySorted.map(p => toDateTime(p.date)),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
    },
    series: [
      {
        name: '收盘价',
        type: 'line',
        data: intradaySorted.map(p => p.close),
        smooth: true,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        symbol: 'circle',
        symbolSize: 4,
      },
    ],
  };

  const historicalOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      textStyle: { color: '#f8fafc' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: {
      type: 'category',
      data: historicalDisplay.map(p => toDate(p.date)),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
    },
    series: [
      {
        name: '收盘价',
        type: 'line',
        data: historicalDisplay.map(p => p.close),
        smooth: true,
        lineStyle: { width: 2, color: '#10b981' },
        itemStyle: { color: '#10b981' },
        symbol: 'circle',
        symbolSize: 3,
      },
    ],
  };

  const tabs = [
    { key: 'intraday' as TabType, label: '1分钟行情', icon: <LineChart className="w-4 h-4" />, count: intradayPrices.length },
    { key: 'historical' as TabType, label: '历史日线', icon: <BarChart3 className="w-4 h-4" />, count: historicalPrices.length },
    { key: 'technical' as TabType, label: '技术指标', icon: <Gauge className="w-4 h-4" />, count: 0 },
  ];

  const hasIndicators = Boolean(
    technicalIndicators?.sma?.length ||
    technicalIndicators?.ema?.length ||
    technicalIndicators?.rsi?.length ||
    technicalIndicators?.macd?.length
  );
  const hasData = intradayPrices.length || historicalPrices.length || hasIndicators;
  if (!hasData) return null;

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-white">行情与技术指标</h2>
          <p className="text-sm text-slate-500">分钟级行情 · 历史走势 · 技术指标</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            disabled={tab.key === 'technical' ? !hasIndicators : tab.count === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : tab.key === 'technical' ? (!hasIndicators ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-white/5')
                  : tab.count === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key !== 'technical' && tab.count > 0 && (
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-midnight/30 rounded-xl p-4 border border-white/5">
        {activeTab === 'intraday' && (
          intradayPrices.length ? (
            <ReactECharts option={intradayOption} style={{ height: '260px' }} />
          ) : (
            <div className="text-center py-8 text-slate-400">暂无分钟级行情数据</div>
          )
        )}

        {activeTab === 'historical' && (
          historicalPrices.length ? (
            <div className="space-y-4">
              <ReactECharts option={historicalOption} style={{ height: '260px' }} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-400">
                <div>历史数据条数：{historicalPrices.length}</div>
                <div>展示区间：最近 {historicalDisplay.length} 个交易日</div>
                <div>最新收盘价：${historicalDisplay[historicalDisplay.length - 1]?.close?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">暂无历史行情数据</div>
          )
        )}

        {activeTab === 'technical' && (
          hasIndicators ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400 mb-1">SMA(20)</p>
                <p className="text-lg font-bold font-mono text-white">{latestSma?.sma?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400 mb-1">EMA(20)</p>
                <p className="text-lg font-bold font-mono text-white">{latestEma?.ema?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400 mb-1">RSI(14)</p>
                <p className="text-lg font-bold font-mono text-white">{latestRsi?.rsi?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400 mb-1">MACD</p>
                <p className="text-lg font-bold font-mono text-white">{latestMacd?.macd?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="col-span-2 md:col-span-4 text-xs text-slate-500">
                技术指标基于日线数据计算，可用于辅助判断趋势与动量强弱。
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">暂无技术指标数据</div>
          )
        )}
      </div>
    </div>
  );
}
