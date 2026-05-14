'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Scissors, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { EarningsCalendar, DividendCalendar, StockSplit } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber as formatNumberUtil } from '@/lib/format-number';

interface Props {
  earningsCalendar: EarningsCalendar[];
  dividendHistory: DividendCalendar[];
  stockSplits: StockSplit[];
  currencySymbol?: string;
  currencyCode?: string;
  theme?: 'dark' | 'light';
}

type TabType = 'earnings' | 'dividends' | 'splits';

export default function EventCalendar({
  earningsCalendar,
  dividendHistory,
  stockSplits,
  currencySymbol = '$',
  currencyCode = 'USD',
  theme = 'dark',
}: Props) {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<TabType>('earnings');
  const { locale } = useLanguage();

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const compact = formatNumberUtil(num, locale === 'zh' ? 'zh' : 'en');
    return `${currencySymbol}${compact} ${currencyCode}`;
  };

  const formatFixedAmount = (num: number | undefined | null, digits = 2) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return `${currencySymbol}${num.toFixed(digits)} ${currencyCode}`;
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'earnings', label: '财报发布', icon: <Calendar className="w-4 h-4" />, count: earningsCalendar?.length || 0 },
    { key: 'dividends', label: '分红记录', icon: <DollarSign className="w-4 h-4" />, count: dividendHistory?.length || 0 },
    { key: 'splits', label: '股票拆分', icon: <Scissors className="w-4 h-4" />, count: stockSplits?.length || 0 },
  ];

  // ==================== 财报发布记录 ====================
  const renderEarningsCalendar = () => {
    if (!earningsCalendar?.length) {
      return <div className="text-center py-8 text-slate-400">暂无财报发布记录</div>;
    }

    // 计算盈利/亏损统计
    const beats = earningsCalendar.filter(e => e.epsActual && e.epsEstimated && e.epsActual > e.epsEstimated).length;
    const misses = earningsCalendar.filter(e => e.epsActual && e.epsEstimated && e.epsActual < e.epsEstimated).length;

    return (
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">财报记录数</p>
            <p className="text-2xl font-bold font-mono text-white">{earningsCalendar.length}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">超预期次数</p>
            <p className="text-2xl font-bold font-mono" style={{ color: isLight ? '#059669' : '#4dd483' }}>{beats}</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">低于预期次数</p>
            <p className="text-2xl font-bold font-mono" style={{ color: isLight ? '#dc2626' : '#ef4444' }}>{misses}</p>
          </div>
        </div>

        {/* EPS 历史图表 */}
        {earningsCalendar.filter(e => e.epsActual !== null).length > 0 && (
          <div className="bg-midnight/30 rounded-xl p-3 md:p-4 border border-white/5 max-md:border-0 mb-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">EPS 历史表现</h4>
            <ReactECharts
              option={{
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'axis',
                  backgroundColor: isLight ? '#ffffff' : '#121212',
                  borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  textStyle: { color: isLight ? '#1e293b' : '#f8fafc' },
                },
                legend: {
                  data: ['预期 EPS', '实际 EPS'],
                  textStyle: { color: isLight ? '#475569' : '#94a3b8' },
                  top: 0,
                },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '50px', containLabel: true },
                xAxis: {
                  type: 'category',
                  data: earningsCalendar.map(e => formatDate(e.date)).reverse(),
                  axisLine: { lineStyle: { color: isLight ? '#e2e8f0' : '#334155' } },
                  axisLabel: { color: isLight ? '#475569' : '#94a3b8', rotate: 45 },
                },
                yAxis: {
                  type: 'value',
                  name: `EPS (${currencyCode})`,
                  nameTextStyle: { color: isLight ? '#64748b' : '#64748b' },
                  axisLine: { show: false },
                  axisLabel: { color: isLight ? '#64748b' : '#64748b', formatter: (v: number) => `${currencySymbol}${v.toFixed(2)} ${currencyCode}` },
                  splitLine: { lineStyle: { color: isLight ? '#f1f5f9' : '#1e293b', type: 'dashed' } },
                },
                series: [
                  {
                    name: '预期 EPS',
                    type: 'bar',
                    data: earningsCalendar.map(e => e.epsEstimated).reverse(),
                    itemStyle: { color: '#64748b', borderRadius: [4, 4, 0, 0] },
                    barWidth: '30%',
                  },
                  {
                    name: '实际 EPS',
                    type: 'bar',
                    data: earningsCalendar.map(e => e.epsActual).reverse(),
                    itemStyle: {
                      color: (params: any) => {
                        const idx = params.dataIndex;
                        const actual = earningsCalendar[earningsCalendar.length - 1 - idx]?.epsActual;
                        const estimated = earningsCalendar[earningsCalendar.length - 1 - idx]?.epsEstimated;
                        return actual >= estimated ? (isLight ? '#059669' : '#22c55e') : (isLight ? '#dc2626' : '#ef4444');
                      },
                      borderRadius: [4, 4, 0, 0],
                    },
                    barWidth: '30%',
                  },
                ],
              }}
              style={{ height: '250px' }}
            />
          </div>
        )}

        {/* 财报列表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">日期</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">预期 EPS</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">实际 EPS</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">预期营收</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">实际营收</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">结果</th>
              </tr>
            </thead>
            <tbody>
              {earningsCalendar.slice(0, 12).map((e, i) => {
                const beat = e.epsActual && e.epsEstimated && e.epsActual > e.epsEstimated;
                const miss = e.epsActual && e.epsEstimated && e.epsActual < e.epsEstimated;
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-white font-mono">{formatDate(e.date)}</td>
                    <td className="text-right py-3 px-4 font-mono text-slate-400">
                      {formatFixedAmount(e.epsEstimated, 2)}
                    </td>
                    <td className={`text-right py-3 px-4 font-mono font-semibold ${beat ? (isLight ? 'text-emerald-600' : 'text-green-400') :
                        miss ? (isLight ? 'text-red-600' : 'text-red-400') :
                          'text-white'
                      }`}>
                      {formatFixedAmount(e.epsActual, 2)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-slate-400">
                      {formatNumber(e.revenueEstimated)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-white">
                      {formatNumber(e.revenueActual)}
                    </td>
                    <td className="text-center py-3 px-4">
                      {beat ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                          <CheckCircle className="w-3 h-3" /> 超预期
                        </span>
                      ) : miss ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                          <XCircle className="w-3 h-3" /> 低于预期
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ==================== 分红记录 ====================
  const renderDividendHistory = () => {
    if (!dividendHistory?.length) {
      return <div className="text-center py-8 text-slate-400">暂无分红记录</div>;
    }

    // 按年汇总分红
    const yearlyDividends = dividendHistory.reduce((acc: Record<string, number>, d) => {
      const year = d.date?.split('-')[0];
      if (year) {
        acc[year] = (acc[year] || 0) + (d.dividend || 0);
      }
      return acc;
    }, {});

    const years = Object.keys(yearlyDividends).sort();
    const dividends = years.map(y => yearlyDividends[y]);

    return (
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">分红次数</p>
            <p className="text-2xl font-bold font-mono text-white">{dividendHistory.length}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">最新分红</p>
            <p className="text-2xl font-bold font-mono text-green-400">
              {formatFixedAmount(dividendHistory[0]?.dividend, 4)}
            </p>
          </div>
          <div className="bg-aurora-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">年度分红 ({years[years.length - 1]})</p>
            <p className="text-2xl font-bold font-mono text-aurora-400">
              {formatFixedAmount(dividends[dividends.length - 1], 2)}
            </p>
          </div>
        </div>

        {/* 年度分红趋势图 */}
        {years.length > 1 && (
          <div className="bg-midnight/30 rounded-xl p-3 md:p-4 border border-white/5 max-md:border-0 mb-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">年度分红趋势</h4>
            <ReactECharts
              option={{
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'axis',
                  backgroundColor: isLight ? '#ffffff' : '#121212',
                  borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  textStyle: { color: isLight ? '#1e293b' : '#f8fafc' },
                },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '30px', containLabel: true },
                xAxis: {
                  type: 'category',
                  data: years,
                  axisLine: { lineStyle: { color: isLight ? '#e2e8f0' : '#334155' } },
                  axisLabel: { color: isLight ? '#475569' : '#94a3b8' },
                },
                yAxis: {
                  type: 'value',
                  name: `分红 (${currencyCode})`,
                  nameTextStyle: { color: isLight ? '#64748b' : '#64748b' },
                  axisLine: { show: false },
                  axisLabel: { color: isLight ? '#64748b' : '#64748b', formatter: (v: number) => `${currencySymbol}${v.toFixed(2)} ${currencyCode}` },
                  splitLine: { lineStyle: { color: isLight ? '#f1f5f9' : '#1e293b', type: 'dashed' } },
                },
                series: [
                  {
                    type: 'bar',
                    data: dividends,
                    itemStyle: {
                      color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: isLight ? '#059669' : '#22c55e' },
                          { offset: 1, color: isLight ? '#047857' : '#16a34a' }
                        ]
                      },
                      borderRadius: [4, 4, 0, 0],
                    },
                    label: {
                      show: true,
                      position: 'top',
                      color: isLight ? '#475569' : '#94a3b8',
                      formatter: (params: any) => `${currencySymbol}${params.value.toFixed(2)} ${currencyCode}`,
                    },
                  },
                ],
              }}
              style={{ height: '200px' }}
            />
          </div>
        )}

        {/* 分红列表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">除息日</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">每股分红</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">调整后分红</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">支付日</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">宣布日</th>
              </tr>
            </thead>
            <tbody>
              {dividendHistory.slice(0, 20).map((d, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white font-mono">{formatDate(d.date)}</td>
                  <td className="text-right py-3 px-4 font-mono text-green-400 font-semibold">
                    {formatFixedAmount(d.dividend, 4)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-slate-400">
                    {formatFixedAmount(d.adjDividend, 4)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{formatDate(d.paymentDate)}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{formatDate(d.declarationDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ==================== 股票拆分 ====================
  const renderStockSplits = () => {
    if (!stockSplits?.length) {
      return <div className="text-center py-8 text-slate-400">暂无股票拆分记录</div>;
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">拆分次数</p>
            <p className="text-2xl font-bold font-mono text-white">{stockSplits.length}</p>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">最近拆分</p>
            <p className="text-xl font-bold font-mono text-purple-400">
              {stockSplits[0]?.numerator}:{stockSplits[0]?.denominator}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">日期</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">拆分比例</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              {stockSplits.map((s, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white font-mono">{formatDate(s.date)}</td>
                  <td className="text-center py-3 px-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full font-mono font-semibold">
                      <Scissors className="w-4 h-4" />
                      {s.numerator}:{s.denominator}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {s.numerator > s.denominator
                      ? `每 ${s.denominator} 股拆分为 ${s.numerator} 股`
                      : `每 ${s.denominator} 股合并为 ${s.numerator} 股`
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const hasData = earningsCalendar?.length || dividendHistory?.length || stockSplits?.length;

  if (!hasData) {
    return null;
  }

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-md animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <Calendar className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">市场事件日历</h2>
          <p className="text-sm text-mist-500">财报发布、分红记录、股票拆分</p>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            disabled={tab.count === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === tab.key
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : tab.count === 0
                ? 'text-mist-600 cursor-not-allowed'
                : 'text-mist-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-sm ${activeTab === tab.key ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-mist-400'}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="bg-white/5 rounded-md p-4 border border-white/10">
        {activeTab === 'earnings' && renderEarningsCalendar()}
        {activeTab === 'dividends' && renderDividendHistory()}
        {activeTab === 'splits' && renderStockSplits()}
      </div>
    </div>
  );
}
