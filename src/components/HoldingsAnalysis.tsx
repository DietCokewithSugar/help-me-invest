'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Building, Users, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ExternalLink, Briefcase, UserCheck
} from 'lucide-react';
import type { InstitutionalHolder, InsiderTrading } from '@/types';

interface Props {
  institutionalHolders: InstitutionalHolder[];
  insiderTrading: InsiderTrading[];
  theme?: 'dark' | 'light';
}

type TabType = 'institutional' | 'insider';

export default function HoldingsAnalysis({ institutionalHolders, insiderTrading, theme = 'dark' }: Props) {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<TabType>('institutional');

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

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

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'institutional', label: '机构持仓', icon: <Building className="w-4 h-4" />, count: institutionalHolders?.length || 0 },
    { key: 'insider', label: '内幕交易', icon: <UserCheck className="w-4 h-4" />, count: insiderTrading?.length || 0 },
  ];

  // ==================== 机构持仓 ====================
  const renderInstitutionalHolders = () => {
    if (!institutionalHolders?.length) {
      return <div className="text-center py-8 text-slate-400">暂无机构持仓数据</div>;
    }

    // 计算统计数据
    const totalShares = institutionalHolders.reduce((sum, h) => sum + (h.shares || 0), 0);
    const totalValue = institutionalHolders.reduce((sum, h) => sum + (h.value || 0), 0);
    const increases = institutionalHolders.filter(h => h.change > 0).length;
    const decreases = institutionalHolders.filter(h => h.change < 0).length;

    // Top 10 机构饼图
    const top10 = institutionalHolders.slice(0, 10);
    const pieData = top10.map(h => ({
      name: h.holder.length > 20 ? h.holder.substring(0, 20) + '...' : h.holder,
      value: h.shares,
    }));

    return (
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">机构数量</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-white whitespace-nowrap">{institutionalHolders.length}</p>
          </div>
          <div className="bg-aurora-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">总持仓股数</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-aurora-400 whitespace-nowrap">{formatNumber(totalShares)}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">增持机构</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-green-400 whitespace-nowrap">{increases}</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">减持机构</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-red-400 whitespace-nowrap">{decreases}</p>
          </div>
        </div>

        {/* Top 10 持仓饼图 */}
        <div className="bg-midnight/30 rounded-xl p-4 border border-white/5 max-md:border-0 mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Top 10 机构持仓分布</h4>
          <ReactECharts
            option={{
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'item',
                backgroundColor: isLight ? '#ffffff' : '#121212',
                borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                textStyle: { color: isLight ? '#1e293b' : '#f8fafc' },
                formatter: (params: any) => {
                  return `<div style="font-weight: 600; color: ${isLight ? '#1e293b' : '#f8fafc'};">${params.name}</div>
                          <div style="margin-top: 4px;">
                            <span style="color: ${isLight ? '#0d9488' : '#14b8a6'}; font-weight: 600;">${formatNumber(params.value)} 股</span>
                            <span style="color: ${isLight ? '#64748b' : '#64748b'}; margin-left: 8px;">(${params.percent}%)</span>
                          </div>`;
                },
              },
              series: [
                {
                  type: 'pie',
                  radius: ['40%', '70%'],
                  center: ['50%', '50%'],
                  avoidLabelOverlap: true,
                  itemStyle: {
                    borderRadius: 8,
                    borderColor: isLight ? '#ffffff' : '#1a1a2e',
                    borderWidth: 2,
                  },
                  label: {
                    show: true,
                    position: 'outside',
                    color: isLight ? '#475569' : '#94a3b8',
                    fontSize: 10,
                    formatter: (params: any) => {
                      return params.name.length > 15
                        ? params.name.substring(0, 15) + '...'
                        : params.name;
                    },
                  },
                  labelLine: {
                    lineStyle: { color: isLight ? '#cbd5e1' : '#475569' },
                  },
                  emphasis: {
                    label: { show: true, fontSize: 12, fontWeight: 'bold', color: isLight ? '#1e293b' : '#f8fafc' },
                    scaleSize: 8,
                  },
                  data: pieData.map((d, i) => ({
                    ...d,
                    itemStyle: {
                      color: [
                        '#14b8a6', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b',
                        '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316'
                      ][i % 10],
                    },
                  })),
                },
              ],
            }}
            style={{ height: '300px' }}
          />
        </div>

        {/* 持仓列表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">机构名称</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium whitespace-nowrap">持仓股数</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium whitespace-nowrap">持仓市值</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium whitespace-nowrap">变动</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">报告日期</th>
              </tr>
            </thead>
            <tbody>
              {institutionalHolders.slice(0, 20).map((h, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white max-w-[200px] truncate" title={h.holder}>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">{h.holder}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-white whitespace-nowrap">{formatNumber(h.shares)}</td>
                  <td className="text-right py-3 px-4 font-mono text-aurora-400 whitespace-nowrap">${formatNumber(h.value)}</td>
                  <td className={`text-right py-3 px-4 font-mono whitespace-nowrap ${h.change > 0 ? (isLight ? 'text-emerald-600' : 'text-green-400') :
                      h.change < 0 ? (isLight ? 'text-red-600' : 'text-red-400') :
                        'text-slate-400'
                    }`}>
                    <div className="flex items-center justify-end gap-1">
                      {h.change > 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : h.change < 0 ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : null}
                      {h.change > 0 ? '+' : ''}{formatNumber(h.change)}
                      {h.changePercentage ? ` (${h.changePercentage > 0 ? '+' : ''}${h.changePercentage.toFixed(1)}%)` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{formatDate(h.dateReported)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ==================== 内幕交易 ====================
  const renderInsiderTrading = () => {
    if (!insiderTrading?.length) {
      return <div className="text-center py-8 text-slate-400">暂无内幕交易数据</div>;
    }

    // 统计买入和卖出
    const buys = insiderTrading.filter(t =>
      t.acquistionOrDisposition === 'A' ||
      t.transactionType?.toLowerCase().includes('buy') ||
      t.transactionType?.toLowerCase().includes('purchase')
    );
    const sells = insiderTrading.filter(t =>
      t.acquistionOrDisposition === 'D' ||
      t.transactionType?.toLowerCase().includes('sell') ||
      t.transactionType?.toLowerCase().includes('sale')
    );

    const totalBuyValue = buys.reduce((sum, t) => sum + ((t.securitiesTransacted || 0) * (t.price || 0)), 0);
    const totalSellValue = sells.reduce((sum, t) => sum + ((t.securitiesTransacted || 0) * (t.price || 0)), 0);

    // 按月汇总交易
    const monthlyData: Record<string, { buys: number; sells: number }> = {};
    insiderTrading.forEach(t => {
      const month = t.transactionDate?.substring(0, 7);
      if (month) {
        if (!monthlyData[month]) {
          monthlyData[month] = { buys: 0, sells: 0 };
        }
        const value = (t.securitiesTransacted || 0) * (t.price || 0);
        if (t.acquistionOrDisposition === 'A') {
          monthlyData[month].buys += value;
        } else {
          monthlyData[month].sells += value;
        }
      }
    });

    const months = Object.keys(monthlyData).sort().slice(-12);
    const buyValues = months.map(m => monthlyData[m].buys / 1e6);
    const sellValues = months.map(m => monthlyData[m].sells / 1e6);

    return (
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">交易记录数</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-white whitespace-nowrap">{insiderTrading.length}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">买入次数</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-green-400 whitespace-nowrap">{buys.length}</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">卖出次数</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-red-400 whitespace-nowrap">{sells.length}</p>
          </div>
          <div className={`rounded-lg p-4 text-center ${totalBuyValue > totalSellValue ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
            <p className="text-sm text-slate-400 mb-1">净买入金额</p>
            <p className={`font-bold font-mono ${totalBuyValue > totalSellValue ? (isLight ? 'text-emerald-600' : 'text-green-400') : (isLight ? 'text-red-600' : 'text-red-400')
              } whitespace-nowrap text-xl md:text-2xl`}>
              ${formatNumber(totalBuyValue - totalSellValue)}
            </p>
          </div>
        </div>

        {/* 月度交易趋势 */}
        {months.length > 1 && (
          <div className="bg-midnight/30 rounded-xl p-4 border border-white/5 max-md:border-0 mb-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">内幕交易月度趋势</h4>
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
                  data: ['买入', '卖出'],
                  textStyle: { color: isLight ? '#475569' : '#94a3b8' },
                  top: 0,
                },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '50px', containLabel: true },
                xAxis: {
                  type: 'category',
                  data: months,
                  axisLine: { lineStyle: { color: isLight ? '#e2e8f0' : '#334155' } },
                  axisLabel: { color: isLight ? '#475569' : '#94a3b8', rotate: 45 },
                },
                yAxis: {
                  type: 'value',
                  name: '金额 (百万美元)',
                  nameTextStyle: { color: isLight ? '#64748b' : '#64748b' },
                  axisLine: { show: false },
                  axisLabel: { color: isLight ? '#64748b' : '#64748b', formatter: (v: number) => `$${v.toFixed(1)}M` },
                  splitLine: { lineStyle: { color: isLight ? '#f1f5f9' : '#1e293b', type: 'dashed' } },
                },
                series: [
                  {
                    name: '买入',
                    type: 'bar',
                    stack: 'total',
                    data: buyValues,
                    itemStyle: { color: isLight ? '#059669' : '#22c55e', borderRadius: [4, 4, 0, 0] },
                  },
                  {
                    name: '卖出',
                    type: 'bar',
                    stack: 'total',
                    data: sellValues.map(v => -v),
                    itemStyle: { color: isLight ? '#dc2626' : '#ef4444', borderRadius: [0, 0, 4, 4] },
                  },
                ],
              }}
              style={{ height: '250px' }}
            />
          </div>
        )}

        {/* 交易列表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">日期</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">内部人</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">职位</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium whitespace-nowrap">类型</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium whitespace-nowrap">股数</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium whitespace-nowrap">价格</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium whitespace-nowrap">总价值</th>
              </tr>
            </thead>
            <tbody>
              {insiderTrading.slice(0, 30).map((t, i) => {
                const isBuy = t.acquistionOrDisposition === 'A';
                const value = (t.securitiesTransacted || 0) * (t.price || 0);
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-white font-mono whitespace-nowrap">{formatDate(t.transactionDate)}</td>
                    <td className="py-3 px-4 text-white max-w-[150px] truncate" title={t.reportingName}>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">{t.reportingName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[100px] truncate" title={t.typeOfOwner}>
                      {t.typeOfOwner}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isBuy ? (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-green-500/20 text-green-400') : (isLight ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-400')
                        }`}>
                        {isBuy ? (
                          <>
                            <TrendingUp className="w-3 h-3" /> 买入
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3 h-3" /> 卖出
                          </>
                        )}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-white whitespace-nowrap">
                      {formatNumber(t.securitiesTransacted)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      ${t.price?.toFixed(2) || 'N/A'}
                    </td>
                    <td className={`text-right py-3 px-4 font-mono font-semibold whitespace-nowrap ${isBuy ? (isLight ? 'text-emerald-600' : 'text-green-400') : (isLight ? 'text-red-600' : 'text-red-400')
                      }`}>
                      ${formatNumber(value)}
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

  const hasData = institutionalHolders?.length || insiderTrading?.length;

  if (!hasData) {
    return null;
  }

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-md animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
          <Briefcase className="w-5 h-5 text-cyan-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">持仓与交易分析</h2>
          <p className="text-sm text-mist-500">机构持仓 (13F) 与内幕交易记录</p>
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
              ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
              : tab.count === 0
                ? 'text-mist-600 cursor-not-allowed'
                : 'text-mist-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-sm ${activeTab === tab.key ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-mist-400'}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="bg-white/5 rounded-md p-4 border border-white/10">
        {activeTab === 'institutional' && renderInstitutionalHolders()}
        {activeTab === 'insider' && renderInsiderTrading()}
      </div>
    </div>
  );
}
