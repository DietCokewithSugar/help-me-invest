'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRightLeft } from 'lucide-react';
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from '@/types';

interface Props {
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
}

type TabType = 'income' | 'balance' | 'cashflow';

export default function FinancialStatements({ incomeStatements, balanceSheets, cashFlowStatements }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('income');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return 'N/A';
    if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'income', label: '利润表', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'balance', label: '资产负债表', icon: <Wallet className="w-4 h-4" /> },
    { key: 'cashflow', label: '现金流量表', icon: <ArrowRightLeft className="w-4 h-4" /> },
  ];

  // ==================== 利润表图表 ====================
  const renderIncomeChart = () => {
    const years = incomeStatements.map(i => i.date?.split('-')[0] || '').reverse();
    const revenues = incomeStatements.map(i => (i.revenue || 0) / 1e9).reverse();
    const grossProfits = incomeStatements.map(i => (i.grossProfit || 0) / 1e9).reverse();
    const operatingIncomes = incomeStatements.map(i => (i.operatingIncome || 0) / 1e9).reverse();
    const netIncomes = incomeStatements.map(i => (i.netIncome || 0) / 1e9).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(20, 184, 166, 0.3)',
        textStyle: { color: '#f8fafc' },
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
        data: ['营收', '毛利润', '营业利润', '净利润'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '60px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontFamily: 'JetBrains Mono' },
      },
      yAxis: {
        type: 'value',
        name: '金额 (十亿美元)',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', formatter: (v: number) => `$${v}B` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          name: '营收',
          type: 'bar',
          data: revenues,
          itemStyle: { color: '#14b8a6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '毛利润',
          type: 'bar',
          data: grossProfits,
          itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '营业利润',
          type: 'bar',
          data: operatingIncomes,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '净利润',
          type: 'bar',
          data: netIncomes,
          itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };

    return <ReactECharts option={option} style={{ height: '350px' }} />;
  };

  // ==================== 资产负债表图表 ====================
  const renderBalanceChart = () => {
    const years = balanceSheets.map(b => b.date?.split('-')[0] || '').reverse();
    const totalAssets = balanceSheets.map(b => (b.totalAssets || 0) / 1e9).reverse();
    const totalLiabilities = balanceSheets.map(b => (b.totalLiabilities || 0) / 1e9).reverse();
    const totalEquity = balanceSheets.map(b => (b.totalStockholdersEquity || 0) / 1e9).reverse();
    const totalDebt = balanceSheets.map(b => (b.totalDebt || 0) / 1e9).reverse();
    const cash = balanceSheets.map(b => (b.cashAndCashEquivalents || 0) / 1e9).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(20, 184, 166, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['总资产', '总负债', '股东权益', '总债务', '现金'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '60px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        name: '金额 (十亿美元)',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', formatter: (v: number) => `$${v}B` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '总资产', type: 'line', data: totalAssets, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#14b8a6' } },
        { name: '总负债', type: 'line', data: totalLiabilities, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#ef4444' } },
        { name: '股东权益', type: 'line', data: totalEquity, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#22c55e' } },
        { name: '总债务', type: 'line', data: totalDebt, smooth: true, lineStyle: { width: 3, type: 'dashed' }, itemStyle: { color: '#f59e0b' } },
        { name: '现金', type: 'line', data: cash, smooth: true, lineStyle: { width: 3, type: 'dashed' }, itemStyle: { color: '#3b82f6' } },
      ],
    };

    return <ReactECharts option={option} style={{ height: '350px' }} />;
  };

  // ==================== 现金流量表图表 ====================
  const renderCashFlowChart = () => {
    const years = cashFlowStatements.map(c => c.date?.split('-')[0] || '').reverse();
    const operatingCF = cashFlowStatements.map(c => (c.netCashProvidedByOperatingActivities || 0) / 1e9).reverse();
    const investingCF = cashFlowStatements.map(c => (c.netCashUsedForInvestingActivites || 0) / 1e9).reverse();
    const financingCF = cashFlowStatements.map(c => (c.netCashUsedProvidedByFinancingActivities || 0) / 1e9).reverse();
    const freeCF = cashFlowStatements.map(c => (c.freeCashFlow || 0) / 1e9).reverse();
    const capex = cashFlowStatements.map(c => (c.capitalExpenditure || 0) / 1e9).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(20, 184, 166, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['经营现金流', '投资现金流', '融资现金流', '自由现金流', '资本开支'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '60px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        name: '金额 (十亿美元)',
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', formatter: (v: number) => `$${v}B` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '经营现金流', type: 'bar', data: operatingCF, itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] } },
        { name: '投资现金流', type: 'bar', data: investingCF, itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] } },
        { name: '融资现金流', type: 'bar', data: financingCF, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
        { name: '自由现金流', type: 'line', data: freeCF, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#14b8a6' } },
        { name: '资本开支', type: 'line', data: capex, smooth: true, lineStyle: { width: 3, type: 'dashed' }, itemStyle: { color: '#8b5cf6' } },
      ],
    };

    return <ReactECharts option={option} style={{ height: '350px' }} />;
  };

  // ==================== 表格视图 ====================
  const renderIncomeTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-slate-400 font-medium">指标</th>
            {incomeStatements.map((s, i) => (
              <th key={i} className="text-right py-3 px-4 text-slate-400 font-mono">{s.date?.split('-')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: '营收', key: 'revenue' },
            { label: '营业成本', key: 'costOfRevenue' },
            { label: '毛利润', key: 'grossProfit' },
            { label: '研发费用', key: 'researchAndDevelopmentExpenses' },
            { label: '销售管理费用', key: 'sellingGeneralAndAdministrativeExpenses' },
            { label: '营业利润', key: 'operatingIncome' },
            { label: 'EBITDA', key: 'ebitda' },
            { label: '税前利润', key: 'incomeBeforeTax' },
            { label: '所得税', key: 'incomeTaxExpense' },
            { label: '净利润', key: 'netIncome' },
            { label: 'EPS (稀释)', key: 'epsdiluted' },
          ].map((row) => (
            <tr key={row.key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-3 px-4 text-slate-300">{row.label}</td>
              {incomeStatements.map((s: any, i) => (
                <td key={i} className="text-right py-3 px-4 font-mono text-white">
                  {row.key === 'epsdiluted' ? `$${s[row.key]?.toFixed(2) || 'N/A'}` : `$${formatNumber(s[row.key])}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBalanceTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-slate-400 font-medium">指标</th>
            {balanceSheets.map((s, i) => (
              <th key={i} className="text-right py-3 px-4 text-slate-400 font-mono">{s.date?.split('-')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: '现金及等价物', key: 'cashAndCashEquivalents', section: '资产' },
            { label: '短期投资', key: 'shortTermInvestments', section: '资产' },
            { label: '应收账款', key: 'netReceivables', section: '资产' },
            { label: '存货', key: 'inventory', section: '资产' },
            { label: '流动资产合计', key: 'totalCurrentAssets', section: '资产' },
            { label: '固定资产净值', key: 'propertyPlantEquipmentNet', section: '资产' },
            { label: '商誉', key: 'goodwill', section: '资产' },
            { label: '总资产', key: 'totalAssets', section: '资产' },
            { label: '应付账款', key: 'accountPayables', section: '负债' },
            { label: '短期债务', key: 'shortTermDebt', section: '负债' },
            { label: '流动负债合计', key: 'totalCurrentLiabilities', section: '负债' },
            { label: '长期债务', key: 'longTermDebt', section: '负债' },
            { label: '总负债', key: 'totalLiabilities', section: '负债' },
            { label: '留存收益', key: 'retainedEarnings', section: '权益' },
            { label: '股东权益', key: 'totalStockholdersEquity', section: '权益' },
            { label: '总债务', key: 'totalDebt', section: '其他' },
            { label: '净债务', key: 'netDebt', section: '其他' },
          ].map((row, idx) => (
            <tr key={row.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
              row.key === 'totalCurrentAssets' || row.key === 'totalAssets' || 
              row.key === 'totalCurrentLiabilities' || row.key === 'totalLiabilities' ||
              row.key === 'totalStockholdersEquity' ? 'bg-white/5 font-semibold' : ''
            }`}>
              <td className="py-3 px-4 text-slate-300">{row.label}</td>
              {balanceSheets.map((s: any, i) => (
                <td key={i} className={`text-right py-3 px-4 font-mono ${
                  s[row.key] < 0 ? 'text-red-400' : 'text-white'
                }`}>
                  ${formatNumber(s[row.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCashFlowTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-slate-400 font-medium">指标</th>
            {cashFlowStatements.map((s, i) => (
              <th key={i} className="text-right py-3 px-4 text-slate-400 font-mono">{s.date?.split('-')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: '净利润', key: 'netIncome', section: '经营' },
            { label: '折旧摊销', key: 'depreciationAndAmortization', section: '经营' },
            { label: '股权激励', key: 'stockBasedCompensation', section: '经营' },
            { label: '营运资本变动', key: 'changeInWorkingCapital', section: '经营' },
            { label: '经营活动现金流', key: 'netCashProvidedByOperatingActivities', section: '经营' },
            { label: '资本开支', key: 'capitalExpenditure', section: '投资' },
            { label: '收购净额', key: 'acquisitionsNet', section: '投资' },
            { label: '投资购买', key: 'purchasesOfInvestments', section: '投资' },
            { label: '投资活动现金流', key: 'netCashUsedForInvestingActivites', section: '投资' },
            { label: '债务偿还', key: 'debtRepayment', section: '融资' },
            { label: '股票回购', key: 'commonStockRepurchased', section: '融资' },
            { label: '股息支付', key: 'dividendsPaid', section: '融资' },
            { label: '融资活动现金流', key: 'netCashUsedProvidedByFinancingActivities', section: '融资' },
            { label: '现金净变动', key: 'netChangeInCash', section: '汇总' },
            { label: '自由现金流', key: 'freeCashFlow', section: '汇总' },
          ].map((row) => (
            <tr key={row.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
              row.key.includes('netCash') || row.key === 'freeCashFlow' ? 'bg-white/5 font-semibold' : ''
            }`}>
              <td className="py-3 px-4 text-slate-300">{row.label}</td>
              {cashFlowStatements.map((s: any, i) => (
                <td key={i} className={`text-right py-3 px-4 font-mono ${
                  s[row.key] < 0 ? 'text-red-400' : 'text-white'
                }`}>
                  ${formatNumber(s[row.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!incomeStatements?.length && !balanceSheets?.length && !cashFlowStatements?.length) {
    return null;
  }

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">三大财务报表</h2>
            <p className="text-sm text-slate-500">近5年年度财务数据</p>
          </div>
        </div>
        
        {/* 视图切换 */}
        <div className="flex items-center gap-2 bg-midnight/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'chart' ? 'bg-aurora-500/20 text-aurora-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            图表
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'table' ? 'bg-aurora-500/20 text-aurora-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            表格
          </button>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-aurora-500/20 text-aurora-400 border border-aurora-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="bg-midnight/30 rounded-xl p-4 border border-white/5">
        {activeTab === 'income' && (
          viewMode === 'chart' ? renderIncomeChart() : renderIncomeTable()
        )}
        {activeTab === 'balance' && (
          viewMode === 'chart' ? renderBalanceChart() : renderBalanceTable()
        )}
        {activeTab === 'cashflow' && (
          viewMode === 'chart' ? renderCashFlowChart() : renderCashFlowTable()
        )}
      </div>
    </div>
  );
}
