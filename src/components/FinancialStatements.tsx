'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRightLeft } from 'lucide-react';
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from '@/types';
import { useUnitMode } from '@/lib/UnitModeContext';
import { formatNumber as formatNumberUtil, formatChartValue, type UnitMode } from '@/lib/format-number';

interface Props {
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
  incomeStatementsQuarter?: IncomeStatement[];
  balanceSheetsQuarter?: BalanceSheet[];
  cashFlowStatementsQuarter?: CashFlowStatement[];
  theme?: 'dark' | 'light';
}

type TabType = 'income' | 'balance' | 'cashflow';

export default function FinancialStatements({
  incomeStatements,
  balanceSheets,
  cashFlowStatements,
  incomeStatementsQuarter,
  balanceSheetsQuarter,
  cashFlowStatementsQuarter,
  theme = 'dark'
}: Props) {
  const isLight = theme === 'light';
  const [period, setPeriod] = useState<'annual' | 'quarter'>('annual');
  const [activeTab, setActiveTab] = useState<TabType>('income');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Use unit mode from context
  const { unitMode } = useUnitMode();

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return 'N/A';
    return formatNumberUtil(num, unitMode);
  };

  // Get unit suffix for chart labels based on mode
  const getChartUnit = () => unitMode === 'zh' ? '亿' : 'B';
  const getChartScale = () => unitMode === 'zh' ? 1e8 : 1e9;

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'income', label: '利润表', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'balance', label: '资产负债表', icon: <Wallet className="w-4 h-4" /> },
    { key: 'cashflow', label: '现金流量表', icon: <ArrowRightLeft className="w-4 h-4" /> },
  ];

  const activeIncome = period === 'quarter' && incomeStatementsQuarter?.length ? incomeStatementsQuarter : incomeStatements;
  const activeBalance = period === 'quarter' && balanceSheetsQuarter?.length ? balanceSheetsQuarter : balanceSheets;
  const activeCashFlow = period === 'quarter' && cashFlowStatementsQuarter?.length ? cashFlowStatementsQuarter : cashFlowStatements;

  // ==================== 利润表图表 ====================
  const renderIncomeChart = () => {
    // 颜色定义
    const TEXT_PRIMARY = isLight ? '#1e293b' : '#e2e8f0';
    const TEXT_SECONDARY = isLight ? '#475569' : '#94a3b8';
    const TEXT_MUTED = isLight ? '#64748b' : '#64748b';
    const BORDER_COLOR = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const AXIS_LINE_COLOR = isLight ? '#e2e8f0' : '#334155';
    const SPLIT_LINE_COLOR = isLight ? '#f1f5f9' : '#1e293b';
    const TOOLTIP_BG = isLight ? '#ffffff' : '#121212';

    const years = activeIncome.map(i => {
      if (period === 'quarter') return `${i.fiscalYear} ${i.period}`;
      return i.date?.split('-')[0] || '';
    }).reverse();

    // Use dynamic scale based on unit mode
    const chartScale = getChartScale();
    const chartUnit = getChartUnit();
    const currencyPrefix = unitMode === 'zh' ? '¥' : '$';

    const revenues = activeIncome.map(i => (i.revenue || 0) / chartScale).reverse();
    const grossProfits = activeIncome.map(i => (i.grossProfit || 0) / chartScale).reverse();
    const operatingIncomes = activeIncome.map(i => (i.operatingIncome || 0) / chartScale).reverse();
    const netIncomes = activeIncome.map(i => (i.netIncome || 0) / chartScale).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: TOOLTIP_BG,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: TEXT_PRIMARY, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.2)',
            type: 'dashed'
          }
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 500; margin-bottom: 4px; color: ${TEXT_SECONDARY}; font-size: 11px;">${params[0].axisValue}</div>`;
          result += '<table style="width:100%; border-collapse: collapse;">';
          params.forEach((p: any) => {
            result += `<tr>
              <td style="padding: 2px 8px 2px 0; display: flex; align-items: center;">
                <span style="width: 6px; height: 6px; background: ${p.color}; margin-right: 6px; display: inline-block;"></span>
                <span style="color: ${TEXT_SECONDARY}; font-size: 12px;">${p.seriesName}</span>
              </td>
              <td style="padding: 2px 0 2px 8px; text-align: right; color: ${TEXT_PRIMARY}; font-weight: 500;">${currencyPrefix}${p.value.toFixed(2)}${chartUnit}</td>
            </tr>`;
          });
          result += '</table>';
          return result;
        },
      },
      legend: {
        data: ['营收', '毛利润', '营业利润', '净利润'],
        textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
        top: 0,
        itemGap: 24,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        axisLabel: { color: TEXT_SECONDARY, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
        axisTick: { show: true, lineStyle: { color: AXIS_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        name: '',
        nameTextStyle: { color: TEXT_MUTED, fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: TEXT_MUTED, fontSize: 11, formatter: (v: number) => `${currencyPrefix}${v}${chartUnit}` },
        splitLine: { lineStyle: { color: SPLIT_LINE_COLOR, type: 'dashed', opacity: isLight ? 0.8 : 0.5 } },
      },
      series: [
        {
          name: '营收',
          type: 'bar',
          data: revenues,
          barWidth: '20%',
          itemStyle: { color: '#88ABDA', borderRadius: 0 }, // 窈蓝
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}` },
        },
        {
          name: '毛利润',
          type: 'bar',
          data: grossProfits,
          barWidth: '20%',
          itemStyle: { color: '#98B6C2', borderRadius: 0 }, // 白青
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}` },
        },
        {
          name: '营业利润',
          type: 'bar',
          data: operatingIncomes,
          barWidth: '20%',
          itemStyle: { color: '#CB523E', borderRadius: 0 }, // 黄润
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}` },
        },
        {
          name: '净利润',
          type: 'bar',
          data: netIncomes,
          barWidth: '20%',
          itemStyle: { color: '#C0D09D', borderRadius: 0 }, // 鞠尘
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}` },
        },
      ],
    };

    return <ReactECharts option={option} style={{ height: '350px' }} />;
  };

  // ==================== 资产负债表图表 ====================
  const renderBalanceChart = () => {
    const years = activeBalance.map(b => {
      if (period === 'quarter') return `${b.fiscalYear} ${b.period}`;
      return b.date?.split('-')[0] || '';
    }).reverse();

    // Use dynamic scale based on unit mode
    const chartScale = getChartScale();
    const chartUnit = getChartUnit();
    const currencyPrefix = unitMode === 'zh' ? '¥' : '$';

    const totalAssets = activeBalance.map(b => (b.totalAssets || 0) / chartScale).reverse();
    const totalLiabilities = activeBalance.map(b => (b.totalLiabilities || 0) / chartScale).reverse();
    const totalEquity = activeBalance.map(b => (b.totalStockholdersEquity || 0) / chartScale).reverse();
    const totalDebt = activeBalance.map(b => (b.totalDebt || 0) / chartScale).reverse();
    const cash = activeBalance.map(b => (b.cashAndCashEquivalents || 0) / chartScale).reverse();

    const TEXT_PRIMARY = isLight ? '#1e293b' : '#e2e8f0';
    const TEXT_SECONDARY = isLight ? '#475569' : '#94a3b8';
    const TEXT_MUTED = isLight ? '#64748b' : '#64748b';
    const BORDER_COLOR = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const AXIS_LINE_COLOR = isLight ? '#e2e8f0' : '#334155';
    const SPLIT_LINE_COLOR = isLight ? '#f1f5f9' : '#1e293b';
    const TOOLTIP_BG = isLight ? '#ffffff' : '#121212';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: TOOLTIP_BG,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: TEXT_PRIMARY, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 500; margin-bottom: 4px; color: ${TEXT_SECONDARY}; font-size: 11px;">${params[0].axisValue}</div>`;
          result += '<table style="width:100%; border-collapse: collapse;">';
          params.forEach((p: any) => {
            result += `<tr>
              <td style="padding: 2px 8px 2px 0; display: flex; align-items: center;">
                <span style="width: 6px; height: 6px; background: ${p.color}; margin-right: 6px; display: inline-block; border-radius: 50%;"></span>
                <span style="color: ${TEXT_SECONDARY}; font-size: 12px;">${p.seriesName}</span>
              </td>
              <td style="padding: 2px 0 2px 8px; text-align: right; color: ${TEXT_PRIMARY}; font-weight: 500;">${currencyPrefix}${p.value.toFixed(2)}${chartUnit}</td>
            </tr>`;
          });
          result += '</table>';
          return result;
        },
      },
      legend: {
        data: ['总资产', '总负债', '股东权益', '总债务', '现金'],
        textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
        top: 0,
        itemGap: 20,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        axisLabel: { color: TEXT_SECONDARY, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
        axisTick: { show: true, lineStyle: { color: AXIS_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        name: '',
        nameTextStyle: { color: TEXT_MUTED, fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: TEXT_MUTED, fontSize: 11, formatter: (v: number) => `${currencyPrefix}${v}${chartUnit}` },
        splitLine: { lineStyle: { color: SPLIT_LINE_COLOR, type: 'dashed', opacity: isLight ? 0.8 : 0.5 } },
      },
      series: [
        { name: '总资产', type: 'line', data: totalAssets, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#88ABDA' }, symbol: 'none', label: { show: true, position: 'top', color: TEXT_MUTED, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '总负债', type: 'line', data: totalLiabilities, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#CB523E' }, symbol: 'none', label: { show: true, position: 'bottom', color: '#CB523E', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '股东权益', type: 'line', data: totalEquity, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#C0D09D' }, symbol: 'none', label: { show: true, position: 'top', color: '#C0D09D', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '总债务', type: 'line', data: totalDebt, smooth: false, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: '#EAE4D1' }, symbol: 'none', label: { show: true, position: 'bottom', color: '#EAE4D1', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '现金', type: 'line', data: cash, smooth: false, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: TEXT_SECONDARY }, symbol: 'none', label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
      ],
    };

    return <ReactECharts option={option} style={{ height: '350px' }} />;
  };

  // ==================== 现金流量表图表 ====================
  const renderCashFlowChart = () => {
    const years = activeCashFlow.map(c => {
      if (period === 'quarter') return `${c.fiscalYear} ${c.period}`;
      return c.date?.split('-')[0] || '';
    }).reverse();

    // Use dynamic scale based on unit mode
    const chartScale = getChartScale();
    const chartUnit = getChartUnit();
    const currencyPrefix = unitMode === 'zh' ? '¥' : '$';

    const operatingCF = activeCashFlow.map(c => (c.netCashProvidedByOperatingActivities || 0) / chartScale).reverse();
    const investingCF = activeCashFlow.map(c => (c.netCashUsedForInvestingActivites || 0) / chartScale).reverse();
    const financingCF = activeCashFlow.map(c => (c.netCashUsedProvidedByFinancingActivities || 0) / chartScale).reverse();
    const freeCF = activeCashFlow.map(c => (c.freeCashFlow || 0) / chartScale).reverse();
    const capex = activeCashFlow.map(c => (c.capitalExpenditure || 0) / chartScale).reverse();

    const TEXT_PRIMARY = isLight ? '#1e293b' : '#e2e8f0';
    const TEXT_SECONDARY = isLight ? '#475569' : '#94a3b8';
    const TEXT_MUTED = isLight ? '#64748b' : '#64748b';
    const BORDER_COLOR = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const AXIS_LINE_COLOR = isLight ? '#e2e8f0' : '#334155';
    const SPLIT_LINE_COLOR = isLight ? '#f1f5f9' : '#1e293b';
    const TOOLTIP_BG = isLight ? '#ffffff' : '#121212';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: TOOLTIP_BG,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: TEXT_PRIMARY, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 500; margin-bottom: 4px; color: ${TEXT_SECONDARY}; font-size: 11px;">${params[0].axisValue}</div>`;
          result += '<table style="width:100%; border-collapse: collapse;">';
          params.forEach((p: any) => {
            result += `<tr>
              <td style="padding: 2px 8px 2px 0; display: flex; align-items: center;">
                <span style="width: 6px; height: 6px; background: ${p.color}; margin-right: 6px; display: inline-block;"></span>
                <span style="color: ${TEXT_SECONDARY}; font-size: 12px;">${p.seriesName}</span>
              </td>
              <td style="padding: 2px 0 2px 8px; text-align: right; color: ${TEXT_PRIMARY}; font-weight: 500;">${currencyPrefix}${p.value.toFixed(2)}${chartUnit}</td>
            </tr>`;
          });
          result += '</table>';
          return result;
        },
      },
      legend: {
        data: ['经营现金流', '投资现金流', '融资现金流', '自由现金流', '资本开支'],
        textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
        top: 0,
        itemGap: 16,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        axisLabel: { color: TEXT_SECONDARY, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
        axisTick: { show: true, lineStyle: { color: AXIS_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        name: '',
        nameTextStyle: { color: TEXT_MUTED, fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: TEXT_MUTED, fontSize: 11, formatter: (v: number) => `${currencyPrefix}${v}${chartUnit}` },
        splitLine: { lineStyle: { color: SPLIT_LINE_COLOR, type: 'dashed', opacity: isLight ? 0.8 : 0.5 } },
      },
      series: [
        { name: '经营现金流', type: 'bar', data: operatingCF, barWidth: '18%', itemStyle: { color: '#C0D09D', borderRadius: 0 }, label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '投资现金流', type: 'bar', data: investingCF, barWidth: '18%', itemStyle: { color: '#CB523E', borderRadius: 0 }, label: { show: true, position: 'bottom', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '融资现金流', type: 'bar', data: financingCF, barWidth: '18%', itemStyle: { color: '#EAE4D1', borderRadius: 0 }, label: { show: true, position: 'bottom', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '自由现金流', type: 'line', data: freeCF, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#98B6C2' }, symbol: 'none', label: { show: true, position: 'top', color: '#98B6C2', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
        { name: '资本开支', type: 'line', data: capex, smooth: false, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: TEXT_SECONDARY }, symbol: 'none', label: { show: true, position: 'bottom', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}` } },
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
            <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">指标</th>
            {activeIncome.map((s, i) => (
              <th key={i} className="text-right py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                {period === 'quarter' ? `${s.fiscalYear} ${s.period}` : s.date?.split('-')[0]}
              </th>
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
              <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{row.label}</td>
              {activeIncome.map((s: any, i) => (
                <td key={i} className={`text-right py-3 px-4 font-mono whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
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
            <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">指标</th>
            {activeBalance.map((s, i) => (
              <th key={i} className="text-right py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                {period === 'quarter' ? `${s.fiscalYear} ${s.period}` : s.date?.split('-')[0]}
              </th>
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
            <tr key={row.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${row.key === 'totalCurrentAssets' || row.key === 'totalAssets' ||
              row.key === 'totalCurrentLiabilities' || row.key === 'totalLiabilities' ||
              row.key === 'totalStockholdersEquity' ? 'bg-white/5 font-semibold' : ''
              }`}>
              <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{row.label}</td>
              {activeBalance.map((s: any, i) => (
                <td key={i} className={`text-right py-3 px-4 font-mono whitespace-nowrap ${s[row.key] < 0 ? (isLight ? 'text-red-600' : 'text-red-400') : (isLight ? 'text-slate-900' : 'text-white')
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
            <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">指标</th>
            {activeCashFlow.map((s, i) => (
              <th key={i} className="text-right py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                {period === 'quarter' ? `${s.fiscalYear} ${s.period}` : s.date?.split('-')[0]}
              </th>
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
            <tr key={row.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${row.key.includes('netCash') || row.key === 'freeCashFlow' ? 'bg-white/5 font-semibold' : ''
              }`}>
              <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{row.label}</td>
              {activeCashFlow.map((s: any, i) => (
                <td key={i} className={`text-right py-3 px-4 font-mono whitespace-nowrap ${s[row.key] < 0 ? (isLight ? 'text-red-600' : 'text-red-400') : (isLight ? 'text-slate-900' : 'text-white')
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
    <div className="bg-obsidian border-y border-white/10 py-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center border border-white/10">
              <FileSpreadsheet className="w-4 h-4 text-mist-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">三大财务报表</h2>
            <p className="text-xs text-mist-500 mt-0.5 font-mono">近5{period === 'quarter' ? '季度' : '年度'}财务数据分析</p>
          </div>
        </div>

        {/* 周期及视图切换 */}
        <div className="flex items-center gap-4">
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

          <div className="flex items-center gap-1 bg-white/5 rounded-sm p-0.5 border border-white/5">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'chart' ? 'bg-white/10 text-white' : 'text-mist-500 hover:text-mist-300'
                }`}
            >
              图表
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-mist-500 hover:text-mist-300'
                }`}
            >
              表格
            </button>
          </div>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-2 mb-6 border-b border-white/5 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-all text-sm font-medium ${activeTab === tab.key
              ? 'bg-white/10 text-white border-b-2 border-glacier-500'
              : 'text-mist-500 hover:text-mist-300 hover:bg-white/5'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="bg-white/5 rounded-sm p-4 border border-white/10">
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
