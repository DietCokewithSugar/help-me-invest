'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRightLeft } from 'lucide-react';
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from '@/types';

interface Props {
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
  incomeStatementsQuarter?: IncomeStatement[];
  balanceSheetsQuarter?: BalanceSheet[];
  cashFlowStatementsQuarter?: CashFlowStatement[];
}

type TabType = 'income' | 'balance' | 'cashflow';

export default function FinancialStatements({
  incomeStatements,
  balanceSheets,
  cashFlowStatements,
  incomeStatementsQuarter,
  balanceSheetsQuarter,
  cashFlowStatementsQuarter
}: Props) {
  const [period, setPeriod] = useState<'annual' | 'quarter'>('annual');
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

  const activeIncome = period === 'quarter' && incomeStatementsQuarter?.length ? incomeStatementsQuarter : incomeStatements;
  const activeBalance = period === 'quarter' && balanceSheetsQuarter?.length ? balanceSheetsQuarter : balanceSheets;
  const activeCashFlow = period === 'quarter' && cashFlowStatementsQuarter?.length ? cashFlowStatementsQuarter : cashFlowStatements;

  // ==================== 利润表图表 ====================
  const renderIncomeChart = () => {
    const years = activeIncome.map(i => {
      if (period === 'quarter') return `${i.fiscalYear} ${i.period}`;
      return i.date?.split('-')[0] || '';
    }).reverse();
    const revenues = activeIncome.map(i => (i.revenue || 0) / 1e9).reverse();
    const grossProfits = activeIncome.map(i => (i.grossProfit || 0) / 1e9).reverse();
    const operatingIncomes = activeIncome.map(i => (i.operatingIncome || 0) / 1e9).reverse();
    const netIncomes = activeIncome.map(i => (i.netIncome || 0) / 1e9).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc' },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(100, 116, 139, 0.1)',
          }
        },
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
        textStyle: { color: '#94a3b8', fontSize: 12 },
        top: 0,
        itemGap: 24,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '金额 (十亿美元)',
        nameTextStyle: { color: '#64748b', fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: (v: number) => `$${v}B` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          name: '营收',
          type: 'bar',
          data: revenues,
          barWidth: '18%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#64948b' },
                { offset: 1, color: '#4a7a72' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            color: '#94a3b8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: (params: any) => `$${params.value.toFixed(1)}B`,
          },
        },
        {
          name: '毛利润',
          type: 'bar',
          data: grossProfits,
          barWidth: '18%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#7a8494' },
                { offset: 1, color: '#5a6474' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            color: '#94a3b8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: (params: any) => `$${params.value.toFixed(1)}B`,
          },
        },
        {
          name: '营业利润',
          type: 'bar',
          data: operatingIncomes,
          barWidth: '18%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#947a5a' },
                { offset: 1, color: '#7a5a3a' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            color: '#94a3b8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: (params: any) => `$${params.value.toFixed(1)}B`,
          },
        },
        {
          name: '净利润',
          type: 'bar',
          data: netIncomes,
          barWidth: '18%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#5a9472' },
                { offset: 1, color: '#3a7452' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            color: '#94a3b8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: (params: any) => `$${params.value.toFixed(1)}B`,
          },
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
    const totalAssets = activeBalance.map(b => (b.totalAssets || 0) / 1e9).reverse();
    const totalLiabilities = activeBalance.map(b => (b.totalLiabilities || 0) / 1e9).reverse();
    const totalEquity = activeBalance.map(b => (b.totalStockholdersEquity || 0) / 1e9).reverse();
    const totalDebt = activeBalance.map(b => (b.totalDebt || 0) / 1e9).reverse();
    const cash = activeBalance.map(b => (b.cashAndCashEquivalents || 0) / 1e9).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['总资产', '总负债', '股东权益', '总债务', '现金'],
        textStyle: { color: '#94a3b8', fontSize: 12 },
        top: 0,
        itemGap: 20,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '金额 (十亿美元)',
        nameTextStyle: { color: '#64748b', fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: (v: number) => `$${v}B` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '总资产', type: 'line', data: totalAssets, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#64748b' }, symbol: 'circle', symbolSize: 6, label: { show: true, position: 'top', color: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '总负债', type: 'line', data: totalLiabilities, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#94655a' }, symbol: 'circle', symbolSize: 6, label: { show: true, position: 'bottom', color: '#94655a', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '股东权益', type: 'line', data: totalEquity, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#5a9472' }, symbol: 'circle', symbolSize: 6, label: { show: true, position: 'top', color: '#5a9472', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '总债务', type: 'line', data: totalDebt, smooth: true, lineStyle: { width: 3, type: 'dashed' }, itemStyle: { color: '#947a5a' }, symbol: 'circle', symbolSize: 6, label: { show: true, position: 'bottom', color: '#947a5a', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '现金', type: 'line', data: cash, smooth: true, lineStyle: { width: 3, type: 'dashed' }, itemStyle: { color: '#7a8494' }, symbol: 'circle', symbolSize: 6, label: { show: true, position: 'top', color: '#7a8494', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
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
    const operatingCF = activeCashFlow.map(c => (c.netCashProvidedByOperatingActivities || 0) / 1e9).reverse();
    const investingCF = activeCashFlow.map(c => (c.netCashUsedForInvestingActivites || 0) / 1e9).reverse();
    const financingCF = activeCashFlow.map(c => (c.netCashUsedProvidedByFinancingActivities || 0) / 1e9).reverse();
    const freeCF = activeCashFlow.map(c => (c.freeCashFlow || 0) / 1e9).reverse();
    const capex = activeCashFlow.map(c => (c.capitalExpenditure || 0) / 1e9).reverse();

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['经营现金流', '投资现金流', '融资现金流', '自由现金流', '资本开支'],
        textStyle: { color: '#94a3b8', fontSize: 12 },
        top: 0,
        itemGap: 16,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '70px', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '金额 (十亿美元)',
        nameTextStyle: { color: '#64748b', fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: (v: number) => `$${v}B` },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '经营现金流', type: 'bar', data: operatingCF, barWidth: '15%', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#5a9472' }, { offset: 1, color: '#3a7452' }] }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '投资现金流', type: 'bar', data: investingCF, barWidth: '15%', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#94655a' }, { offset: 1, color: '#74453a' }] }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'bottom', color: '#94a3b8', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '融资现金流', type: 'bar', data: financingCF, barWidth: '15%', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#947a5a' }, { offset: 1, color: '#7a5a3a' }] }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'bottom', color: '#94a3b8', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '自由现金流', type: 'line', data: freeCF, smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#64948b' }, symbol: 'circle', symbolSize: 6, label: { show: true, position: 'top', color: '#64948b', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
        { name: '资本开支', type: 'line', data: capex, smooth: true, lineStyle: { width: 3, type: 'dashed' }, itemStyle: { color: '#7a8494' }, symbol: 'circle', symbolSize: 6, label: { show: true, position: 'bottom', color: '#7a8494', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: (p: any) => `$${p.value.toFixed(0)}B` } },
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
                <td key={i} className="text-right py-3 px-4 font-mono text-white whitespace-nowrap">
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
                <td key={i} className={`text-right py-3 px-4 font-mono ${s[row.key] < 0 ? 'text-red-400' : 'text-white'
                  } whitespace-nowrap`}>
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
                <td key={i} className={`text-right py-3 px-4 font-mono ${s[row.key] < 0 ? 'text-red-400' : 'text-white'
                  } whitespace-nowrap`}>
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
    <div className="bg-midnight/50 rounded-xl p-6 md:p-8 border border-white/5 max-md:border-0 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#64748b]/20 to-[#5a6474]/20 flex items-center justify-center border border-white/5">
              <FileSpreadsheet className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-200">三大财务报表</h2>
            <p className="text-sm text-slate-500 mt-0.5">近5{period === 'quarter' ? '季度' : '年度'}财务数据分析</p>
          </div>
        </div>

        {/* 周期及视图切换 */}
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-lg">
            <button
              onClick={() => setPeriod('annual')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${period === 'annual'
                ? 'bg-glacier-500 text-white shadow-sm'
                : 'text-mist-400 hover:text-mist-200'
                }`}
            >
              年度
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${period === 'quarter'
                ? 'bg-glacier-500 text-white shadow-sm'
                : 'text-mist-400 hover:text-mist-200'
                }`}
            >
              季度
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'chart' ? 'bg-slate-600/30 text-slate-300' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              图表
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'table' ? 'bg-slate-600/30 text-slate-300' : 'text-slate-500 hover:text-slate-300'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.key
              ? 'bg-slate-600/20 text-slate-300 border border-slate-500/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="bg-midnight/30 rounded-xl p-4 border border-white/5 max-md:border-0">
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
