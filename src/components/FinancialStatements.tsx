'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { FileSpreadsheet } from 'lucide-react';
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from '@/types';
import { formatNumber as formatNumberUtil } from '@/lib/format-number';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
  incomeStatementsQuarter?: IncomeStatement[];
  balanceSheetsQuarter?: BalanceSheet[];
  cashFlowStatementsQuarter?: CashFlowStatement[];
  currencySymbol?: string;
  currencyCode?: string;
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
  currencySymbol = '$',
  currencyCode = 'USD',
  theme = 'dark'
}: Props) {
  const isLight = theme === 'light';
  const [period, setPeriod] = useState<'annual' | 'quarter'>('annual');
  const [activeTab, setActiveTab] = useState<TabType>('income');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const { locale, t } = useLanguage();
  const fsT = t.report.financialStatements;
  const incomeT = fsT.income;
  const balanceT = fsT.balance;
  const cashflowT = fsT.cashflow;

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return 'N/A';
    return formatNumberUtil(num, locale === 'zh' ? 'zh' : 'en');
  };

  const getChartUnit = () => locale === 'zh' ? '亿' : 'B';
  const getChartScale = () => locale === 'zh' ? 1e8 : 1e9;
  const currencyPrefix = currencySymbol;
  const currencySuffix = ` ${currencyCode}`;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'income', label: fsT.tabs.income },
    { key: 'balance', label: fsT.tabs.balance },
    { key: 'cashflow', label: fsT.tabs.cashflow },
  ];

  const activeIncome = period === 'quarter' && incomeStatementsQuarter?.length ? incomeStatementsQuarter : incomeStatements;
  const activeBalance = period === 'quarter' && balanceSheetsQuarter?.length ? balanceSheetsQuarter : balanceSheets;
  const activeCashFlow = period === 'quarter' && cashFlowStatementsQuarter?.length ? cashFlowStatementsQuarter : cashFlowStatements;

  // ==================== 利润表图表 ====================
  const renderIncomeChart = () => {
    // 颜色定义
    const TEXT_PRIMARY = isLight ? '#222222' : '#D8DCE2';
    const TEXT_SECONDARY = isLight ? '#545B65' : '#A3ABB6';
    const TEXT_MUTED = isLight ? '#78808B' : '#7A838F';
    const BORDER_COLOR = isLight ? 'rgba(23,25,28,0.12)' : 'rgba(236,238,241,0.10)';
    const AXIS_LINE_COLOR = isLight ? 'rgba(23,25,28,0.18)' : 'rgba(236,238,241,0.18)';
    const SPLIT_LINE_COLOR = isLight ? 'rgba(23,25,28,0.07)' : 'rgba(236,238,241,0.07)';
    const TOOLTIP_BG = isLight ? '#FFFFFF' : '#1B1F24';

    const years = activeIncome.map(i => {
      if (period === 'quarter') return `${i.fiscalYear} ${i.period}`;
      return i.date?.split('-')[0] || '';
    }).reverse();

    // Use dynamic scale based on unit mode
    const chartScale = getChartScale();
    const chartUnit = getChartUnit();
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
        textStyle: { color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
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
              <td style="padding: 2px 0 2px 8px; text-align: right; color: ${TEXT_PRIMARY}; font-weight: 500;">${currencyPrefix}${p.value.toFixed(2)}${chartUnit}${currencySuffix}</td>
            </tr>`;
          });
          result += '</table>';
          return result;
        },
      },
      legend: {
        data: [incomeT.legend.revenue, incomeT.legend.grossProfit, incomeT.legend.operatingIncome, incomeT.legend.netIncome],
        textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
        top: 0,
        itemGap: 24,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        axisLabel: { color: TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' },
        axisTick: { show: true, lineStyle: { color: AXIS_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        name: '',
        nameTextStyle: { color: TEXT_MUTED, fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: TEXT_MUTED, fontSize: 11, formatter: (v: number) => `${currencyPrefix}${v}${chartUnit}${currencySuffix}` },
        splitLine: { lineStyle: { color: SPLIT_LINE_COLOR, opacity: 1 } },
      },
      series: [
        {
          name: incomeT.legend.revenue,
          type: 'bar',
          data: revenues,
          barWidth: '20%',
          itemStyle: { color: '#4A86E8', borderRadius: 0 },
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}${currencySuffix}` },
        },
        {
          name: incomeT.legend.grossProfit,
          type: 'bar',
          data: grossProfits,
          barWidth: '20%',
          itemStyle: { color: '#7FA3BF', borderRadius: 0 },
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}${currencySuffix}` },
        },
        {
          name: incomeT.legend.operatingIncome,
          type: 'bar',
          data: operatingIncomes,
          barWidth: '20%',
          itemStyle: { color: '#D9534F', borderRadius: 0 },
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}${currencySuffix}` },
        },
        {
          name: incomeT.legend.netIncome,
          type: 'bar',
          data: netIncomes,
          barWidth: '20%',
          itemStyle: { color: '#3FA66B', borderRadius: 0 },
          label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif', formatter: (params: any) => `${currencyPrefix}${params.value.toFixed(1)}${chartUnit}${currencySuffix}` },
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
    const totalAssets = activeBalance.map(b => (b.totalAssets || 0) / chartScale).reverse();
    const totalLiabilities = activeBalance.map(b => (b.totalLiabilities || 0) / chartScale).reverse();
    const totalEquity = activeBalance.map(b => (b.totalStockholdersEquity || 0) / chartScale).reverse();
    const totalDebt = activeBalance.map(b => (b.totalDebt || 0) / chartScale).reverse();
    const cash = activeBalance.map(b => (b.cashAndCashEquivalents || 0) / chartScale).reverse();

    const TEXT_PRIMARY = isLight ? '#222222' : '#D8DCE2';
    const TEXT_SECONDARY = isLight ? '#545B65' : '#A3ABB6';
    const TEXT_MUTED = isLight ? '#78808B' : '#7A838F';
    const BORDER_COLOR = isLight ? 'rgba(23,25,28,0.12)' : 'rgba(236,238,241,0.10)';
    const AXIS_LINE_COLOR = isLight ? 'rgba(23,25,28,0.18)' : 'rgba(236,238,241,0.18)';
    const SPLIT_LINE_COLOR = isLight ? 'rgba(23,25,28,0.07)' : 'rgba(236,238,241,0.07)';
    const TOOLTIP_BG = isLight ? '#FFFFFF' : '#1B1F24';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: TOOLTIP_BG,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 500; margin-bottom: 4px; color: ${TEXT_SECONDARY}; font-size: 11px;">${params[0].axisValue}</div>`;
          result += '<table style="width:100%; border-collapse: collapse;">';
          params.forEach((p: any) => {
            result += `<tr>
              <td style="padding: 2px 8px 2px 0; display: flex; align-items: center;">
                <span style="width: 6px; height: 6px; background: ${p.color}; margin-right: 6px; display: inline-block; border-radius: 50%;"></span>
                <span style="color: ${TEXT_SECONDARY}; font-size: 12px;">${p.seriesName}</span>
              </td>
              <td style="padding: 2px 0 2px 8px; text-align: right; color: ${TEXT_PRIMARY}; font-weight: 500;">${currencyPrefix}${p.value.toFixed(2)}${chartUnit}${currencySuffix}</td>
            </tr>`;
          });
          result += '</table>';
          return result;
        },
      },
      legend: {
        data: [balanceT.legend.totalAssets, balanceT.legend.totalLiabilities, balanceT.legend.totalEquity, balanceT.legend.totalDebt, balanceT.legend.cash],
        textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
        top: 0,
        itemGap: 20,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        axisLabel: { color: TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' },
        axisTick: { show: true, lineStyle: { color: AXIS_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        name: '',
        nameTextStyle: { color: TEXT_MUTED, fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: TEXT_MUTED, fontSize: 11, formatter: (v: number) => `${currencyPrefix}${v}${chartUnit}${currencySuffix}` },
        splitLine: { lineStyle: { color: SPLIT_LINE_COLOR, opacity: 1 } },
      },
      series: [
        { name: balanceT.legend.totalAssets, type: 'line', data: totalAssets, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#4A86E8' }, symbol: 'none', label: { show: true, position: 'top', color: TEXT_MUTED, fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: balanceT.legend.totalLiabilities, type: 'line', data: totalLiabilities, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#D9534F' }, symbol: 'none', label: { show: true, position: 'bottom', color: '#D9534F', fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: balanceT.legend.totalEquity, type: 'line', data: totalEquity, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#3FA66B' }, symbol: 'none', label: { show: true, position: 'top', color: '#3FA66B', fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: balanceT.legend.totalDebt, type: 'line', data: totalDebt, smooth: false, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: '#B8B2A0' }, symbol: 'none', label: { show: true, position: 'bottom', color: '#B8B2A0', fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: balanceT.legend.cash, type: 'line', data: cash, smooth: false, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: TEXT_SECONDARY }, symbol: 'none', label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
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
    const operatingCF = activeCashFlow.map(c => (c.netCashProvidedByOperatingActivities || 0) / chartScale).reverse();
    const investingCF = activeCashFlow.map(c => (c.netCashUsedForInvestingActivites || 0) / chartScale).reverse();
    const financingCF = activeCashFlow.map(c => (c.netCashUsedProvidedByFinancingActivities || 0) / chartScale).reverse();
    const freeCF = activeCashFlow.map(c => (c.freeCashFlow || 0) / chartScale).reverse();
    const capex = activeCashFlow.map(c => (c.capitalExpenditure || 0) / chartScale).reverse();

    const TEXT_PRIMARY = isLight ? '#222222' : '#D8DCE2';
    const TEXT_SECONDARY = isLight ? '#545B65' : '#A3ABB6';
    const TEXT_MUTED = isLight ? '#78808B' : '#7A838F';
    const BORDER_COLOR = isLight ? 'rgba(23,25,28,0.12)' : 'rgba(236,238,241,0.10)';
    const AXIS_LINE_COLOR = isLight ? 'rgba(23,25,28,0.18)' : 'rgba(236,238,241,0.18)';
    const SPLIT_LINE_COLOR = isLight ? 'rgba(23,25,28,0.07)' : 'rgba(236,238,241,0.07)';
    const TOOLTIP_BG = isLight ? '#FFFFFF' : '#1B1F24';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: TOOLTIP_BG,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: TEXT_PRIMARY, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 500; margin-bottom: 4px; color: ${TEXT_SECONDARY}; font-size: 11px;">${params[0].axisValue}</div>`;
          result += '<table style="width:100%; border-collapse: collapse;">';
          params.forEach((p: any) => {
            result += `<tr>
              <td style="padding: 2px 8px 2px 0; display: flex; align-items: center;">
                <span style="width: 6px; height: 6px; background: ${p.color}; margin-right: 6px; display: inline-block;"></span>
                <span style="color: ${TEXT_SECONDARY}; font-size: 12px;">${p.seriesName}</span>
              </td>
              <td style="padding: 2px 0 2px 8px; text-align: right; color: ${TEXT_PRIMARY}; font-weight: 500;">${currencyPrefix}${p.value.toFixed(2)}${chartUnit}${currencySuffix}</td>
            </tr>`;
          });
          result += '</table>';
          return result;
        },
      },
      legend: {
        data: [cashflowT.legend.operatingCF, cashflowT.legend.investingCF, cashflowT.legend.financingCF, cashflowT.legend.freeCF, cashflowT.legend.capex],
        textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
        top: 0,
        itemGap: 16,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        axisLabel: { color: TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' },
        axisTick: { show: true, lineStyle: { color: AXIS_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        name: '',
        nameTextStyle: { color: TEXT_MUTED, fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: TEXT_MUTED, fontSize: 11, formatter: (v: number) => `${currencyPrefix}${v}${chartUnit}${currencySuffix}` },
        splitLine: { lineStyle: { color: SPLIT_LINE_COLOR, opacity: 1 } },
      },
      series: [
        { name: cashflowT.legend.operatingCF, type: 'bar', data: operatingCF, barWidth: '18%', itemStyle: { color: '#3FA66B', borderRadius: 0 }, label: { show: true, position: 'top', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: cashflowT.legend.investingCF, type: 'bar', data: investingCF, barWidth: '18%', itemStyle: { color: '#D9534F', borderRadius: 0 }, label: { show: true, position: 'bottom', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: cashflowT.legend.financingCF, type: 'bar', data: financingCF, barWidth: '18%', itemStyle: { color: '#B8B2A0', borderRadius: 0 }, label: { show: true, position: 'bottom', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: cashflowT.legend.freeCF, type: 'line', data: freeCF, smooth: false, lineStyle: { width: 2 }, itemStyle: { color: '#7FA3BF' }, symbol: 'none', label: { show: true, position: 'top', color: '#7FA3BF', fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
        { name: cashflowT.legend.capex, type: 'line', data: capex, smooth: false, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: TEXT_SECONDARY }, symbol: 'none', label: { show: true, position: 'bottom', color: TEXT_SECONDARY, fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', formatter: (p: any) => `${currencyPrefix}${p.value.toFixed(0)}${chartUnit}${currencySuffix}` } },
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
            <th className="text-left py-2 px-3 text-mist-400 font-medium whitespace-nowrap">{fsT.metricHeader}</th>
            {activeIncome.map((s, i) => (
              <th key={i} className="text-right py-2 px-3 text-mist-400 font-mono whitespace-nowrap">
                {period === 'quarter' ? `${s.fiscalYear} ${s.period}` : s.date?.split('-')[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: incomeT.rows.revenue, key: 'revenue' },
            { label: incomeT.rows.costOfRevenue, key: 'costOfRevenue' },
            { label: incomeT.rows.grossProfit, key: 'grossProfit' },
            { label: incomeT.rows.researchAndDevelopmentExpenses, key: 'researchAndDevelopmentExpenses' },
            { label: incomeT.rows.sellingGeneralAndAdministrativeExpenses, key: 'sellingGeneralAndAdministrativeExpenses' },
            { label: incomeT.rows.operatingIncome, key: 'operatingIncome' },
            { label: incomeT.rows.ebitda, key: 'ebitda' },
            { label: incomeT.rows.incomeBeforeTax, key: 'incomeBeforeTax' },
            { label: incomeT.rows.incomeTaxExpense, key: 'incomeTaxExpense' },
            { label: incomeT.rows.netIncome, key: 'netIncome' },
            { label: incomeT.rows.epsdiluted, key: 'epsdiluted' },
          ].map((row) => (
            <tr key={row.key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-2 px-3 text-mist-300 whitespace-nowrap">{row.label}</td>
              {activeIncome.map((s: any, i) => (
                <td key={i} className={`text-right py-2 px-3 font-mono whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {row.key === 'epsdiluted'
                    ? `${currencyPrefix}${s[row.key]?.toFixed(2) || 'N/A'}${currencySuffix}`
                    : `${currencyPrefix}${formatNumber(s[row.key])}${currencySuffix}`}
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
            <th className="text-left py-2 px-3 text-mist-400 font-medium whitespace-nowrap">{fsT.metricHeader}</th>
            {activeBalance.map((s, i) => (
              <th key={i} className="text-right py-2 px-3 text-mist-400 font-mono whitespace-nowrap">
                {period === 'quarter' ? `${s.fiscalYear} ${s.period}` : s.date?.split('-')[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: balanceT.rows.cashAndCashEquivalents, key: 'cashAndCashEquivalents' },
            { label: balanceT.rows.shortTermInvestments, key: 'shortTermInvestments' },
            { label: balanceT.rows.netReceivables, key: 'netReceivables' },
            { label: balanceT.rows.inventory, key: 'inventory' },
            { label: balanceT.rows.totalCurrentAssets, key: 'totalCurrentAssets' },
            { label: balanceT.rows.propertyPlantEquipmentNet, key: 'propertyPlantEquipmentNet' },
            { label: balanceT.rows.goodwill, key: 'goodwill' },
            { label: balanceT.rows.totalAssets, key: 'totalAssets' },
            { label: balanceT.rows.accountPayables, key: 'accountPayables' },
            { label: balanceT.rows.shortTermDebt, key: 'shortTermDebt' },
            { label: balanceT.rows.totalCurrentLiabilities, key: 'totalCurrentLiabilities' },
            { label: balanceT.rows.longTermDebt, key: 'longTermDebt' },
            { label: balanceT.rows.totalLiabilities, key: 'totalLiabilities' },
            { label: balanceT.rows.retainedEarnings, key: 'retainedEarnings' },
            { label: balanceT.rows.totalStockholdersEquity, key: 'totalStockholdersEquity' },
            { label: balanceT.rows.totalDebt, key: 'totalDebt' },
            { label: balanceT.rows.netDebt, key: 'netDebt' },
          ].map((row) => (
            <tr key={row.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${row.key === 'totalCurrentAssets' || row.key === 'totalAssets' ||
              row.key === 'totalCurrentLiabilities' || row.key === 'totalLiabilities' ||
              row.key === 'totalStockholdersEquity' ? 'bg-white/5 font-semibold' : ''
              }`}>
              <td className="py-2 px-3 text-mist-300 whitespace-nowrap">{row.label}</td>
              {activeBalance.map((s: any, i) => (
                <td key={i} className={`text-right py-2 px-3 font-mono whitespace-nowrap ${s[row.key] < 0 ? (isLight ? 'text-down' : 'text-down') : (isLight ? 'text-slate-900' : 'text-white')
                  }`}>
                  {currencyPrefix}{formatNumber(s[row.key])}{currencySuffix}
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
            <th className="text-left py-2 px-3 text-mist-400 font-medium whitespace-nowrap">{fsT.metricHeader}</th>
            {activeCashFlow.map((s, i) => (
              <th key={i} className="text-right py-2 px-3 text-mist-400 font-mono whitespace-nowrap">
                {period === 'quarter' ? `${s.fiscalYear} ${s.period}` : s.date?.split('-')[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: cashflowT.rows.netIncome, key: 'netIncome' },
            { label: cashflowT.rows.depreciationAndAmortization, key: 'depreciationAndAmortization' },
            { label: cashflowT.rows.stockBasedCompensation, key: 'stockBasedCompensation' },
            { label: cashflowT.rows.changeInWorkingCapital, key: 'changeInWorkingCapital' },
            { label: cashflowT.rows.netCashProvidedByOperatingActivities, key: 'netCashProvidedByOperatingActivities' },
            { label: cashflowT.rows.capitalExpenditure, key: 'capitalExpenditure' },
            { label: cashflowT.rows.acquisitionsNet, key: 'acquisitionsNet' },
            { label: cashflowT.rows.purchasesOfInvestments, key: 'purchasesOfInvestments' },
            { label: cashflowT.rows.netCashUsedForInvestingActivites, key: 'netCashUsedForInvestingActivites' },
            { label: cashflowT.rows.debtRepayment, key: 'debtRepayment' },
            { label: cashflowT.rows.commonStockRepurchased, key: 'commonStockRepurchased' },
            { label: cashflowT.rows.dividendsPaid, key: 'dividendsPaid' },
            { label: cashflowT.rows.netCashUsedProvidedByFinancingActivities, key: 'netCashUsedProvidedByFinancingActivities' },
            { label: cashflowT.rows.netChangeInCash, key: 'netChangeInCash' },
            { label: cashflowT.rows.freeCashFlow, key: 'freeCashFlow' },
          ].map((row) => (
            <tr key={row.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${row.key.includes('netCash') || row.key === 'freeCashFlow' ? 'bg-white/5 font-semibold' : ''
              }`}>
              <td className="py-2 px-3 text-mist-300 whitespace-nowrap">{row.label}</td>
              {activeCashFlow.map((s: any, i) => (
                <td key={i} className={`text-right py-2 px-3 font-mono whitespace-nowrap ${s[row.key] < 0 ? (isLight ? 'text-down' : 'text-down') : (isLight ? 'text-slate-900' : 'text-white')
                  }`}>
                  {currencyPrefix}{formatNumber(s[row.key])}{currencySuffix}
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
    <div className="panel">
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <FileSpreadsheet className="w-4 h-4 shrink-0 text-text-3" />
          <div className="min-w-0">
            <h3 className="panel-title">{fsT.title}</h3>
            <p className="text-xs text-mist-500 mt-0.5 font-mono">{period === 'quarter' ? fsT.subtitleQuarter : fsT.subtitleAnnual}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="inline-flex overflow-hidden rounded-md border border-line-strong">
            <button
              onClick={() => setPeriod('annual')}
              className={`h-7 px-3 text-[12px] font-medium transition-colors ${period === 'annual'
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-text-2 hover:bg-hover hover:text-fg'
                }`}
            >
              {fsT.period.annual}
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`h-7 border-l border-line px-3 text-[12px] font-medium transition-colors ${period === 'quarter'
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-text-2 hover:bg-hover hover:text-fg'
                }`}
            >
              {fsT.period.quarter}
            </button>
          </div>

          <div className="inline-flex overflow-hidden rounded-md border border-line-strong">
            <button
              onClick={() => setViewMode('chart')}
              className={`h-7 px-3 text-[12px] font-medium transition-colors ${viewMode === 'chart' ? 'bg-accent/10 text-accent' : 'text-text-2 hover:bg-hover hover:text-fg'
                }`}
            >
              {fsT.view.chart}
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`h-7 border-l border-line px-3 text-[12px] font-medium transition-colors ${viewMode === 'table' ? 'bg-accent/10 text-accent' : 'text-text-2 hover:bg-hover hover:text-fg'
                }`}
            >
              {fsT.view.table}
            </button>
          </div>
        </div>
      </div>

      {/* 标签栏 — horizontal scroll on narrow viewports so long labels
          ("Cash Flow Statement") never wrap or push siblings off-screen. */}
      <div role="tablist" className="mt-2 flex overflow-x-auto border-b border-line px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab shrink-0 whitespace-nowrap ${activeTab === tab.key ? 'tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
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
