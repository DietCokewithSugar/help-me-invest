'use client';

import ReactECharts from 'echarts-for-react';
import { Calculator, TrendingUp, TrendingDown, Target, Percent, PiggyBank, BarChart3, Activity, Info, DollarSign, Shield, Zap, Building2 } from 'lucide-react';
import type { KeyMetrics, CompanyProfile, FinancialRatios, FinancialScores } from '@/types';
import { useState } from 'react';
import FinancialRatiosDisplay from './FinancialRatiosDisplay';
import FinancialRatiosTTMDisplay from './FinancialRatiosTTMDisplay';
import FinancialScoresDisplay from './FinancialScoresDisplay';

interface Props {
  profile: CompanyProfile;
  keyMetrics: KeyMetrics[];
  financialRatios?: FinancialRatios[];
  financialRatiosTTM?: any[];
  financialScores?: FinancialScores | null;
}

// 指标说明映射
const metricDescriptions: Record<string, string> = {
  // 基础信息
  symbol: '股票代码',
  date: '财报截止日期',
  fiscalYear: '财年',
  period: '报表周期（FY=全年，Q1/Q2/Q3/Q4=季度）',
  reportedCurrency: '财报使用的货币单位',
  
  // 估值指标
  marketCap: '市值 = 股价 × 总股本。代表公司股票的总价值。',
  enterpriseValue: '企业价值 = 市值 + 债务 - 现金。代表收购整家公司的真实成本，包括需要承担的债务和可以获得的现金。',
  evToSales: '企业价值/营收比。类似市销率(P/S)，但更考虑债务因素。',
  evToEBITDA: '企业价值倍数 = EV/EBITDA。国际通用的估值指标，表示按目前的息税折旧摊销前利润，需要多少年能回本。',
  evToOperatingCashFlow: 'EV/经营现金流。衡量相对于现金流的估值。',
  evToFreeCashFlow: 'EV/自由现金流。比经营现金流更严格，扣除了资本开支。',
  earningsYield: '盈利收益率 = 1/PE。代表按当前价格买入，理论上每年的利润回报率。可以用来和国债收益率对比。',
  freeCashFlowYield: '自由现金流收益率 = 自由现金流/市值。代表公司真正赚到手、可以分给股东的钱的收益率。通常比盈利收益率更真实。',
  
  // 盈利能力与回报
  roe: '净资产收益率(ROE) = 净利润/股东权益。衡量股东每投1块钱能赚多少钱。',
  returnOnAssets: '总资产回报率(ROA) = 净利润/总资产。衡量所有资产（包括负债买的）的盈利能力。',
  roic: '投入资本回报率(ROIC)。这是区分好公司和烂公司的核心指标。超过15%就算优秀，说明护城河极深。',
  returnOnCapitalEmployed: '已动用资本回报率(ROCE)。类似ROIC，计算口径略有不同（使用EBIT而非净利润）。',
  returnOnTangibleAssets: '有形资产回报率。剔除品牌、专利等无形资产后的回报率。',
  
  // 运营效率与周期
  daysOfInventoryOnHand: '库存周转天数(DIO)。从生产出产品到卖掉，平均需要多少天。',
  daysSalesOutstanding: '应收账款天数(DSO)。卖出东西后，平均多少天能收到钱。',
  daysPayablesOutstanding: '应付账款天数(DPO)。欠供应商的钱，平均多少天才还。',
  cashConversionCycle: '现金循环周期(CCC) = DIO + DSO - DPO。负数意味着公司还没给供应商付钱，就已经把货卖给消费者并收到钱了，极其强势的表现！',
  operatingCycle: '营业周期 = DIO + DSO。从进货到收钱的总时间。',
  averageInventory: '平均库存金额',
  averageReceivables: '平均应收账款',
  averagePayables: '平均应付账款',
  
  // 财务健康与风险
  currentRatio: '流动比率 = 流动资产/流动负债。通常要求>1，但现金流好的公司<1也没问题。',
  netDebtToEBITDA: '净债务/EBITDA。公司不吃不喝大概多少年能还清所有净债务。非常安全的指标。',
  incomeQuality: '收益质量 = 经营现金流/净利润。大于1说明赚的都是真金白银，不是账面富贵。',
  interestCoverage: '利息覆盖率 = 息税前利润/利息支出。越接近1，说明利息支出占比越小。',
  workingCapital: '营运资金 = 流动资产 - 流动负债。',
  investedCapital: '投入资本 = 股东权益 + 有息债务。',
  
  // 成本与开支结构
  researchAndDdevelopementToRevenue: '研发占比。每收入100块，花多少钱做研发。',
  capexToRevenue: '资本开支占比。用于买厂房设备的钱占比。低占比说明是轻资产模式。',
  stockBasedCompensationToRevenue: '股权激励占比。分给员工的股票占收入的比例。太高会稀释股东权益。',
  salesGeneralAndAdministrativeToRevenue: '销售管理费用占比',
  capexToOperatingCashFlow: '赚来的现金流有多少拿去再投资了',
  capexToDepreciation: '资本开支与折旧的比率',
  intangiblesToTotalAssets: '无形资产占比',
  
  // 深度价值模型
  grahamNumber: '格雷厄姆数字。根据公式 √(22.5 × EPS × BVPS) 算出的"合理价格"。',
  grahamNetNet: '净净估值 = 流动资产 - 所有负债。通常用于评估濒临破产公司的清算价值。',
  netCurrentAssetValue: '净流动资产价值',
  tangibleAssetValue: '有形资产价值',
  
  // 现金流细分
  freeCashFlowPerShare: '每股自由现金流',
  operatingCashFlowPerShare: '每股经营现金流',
};

export default function ProfessionalValuationMetrics({
  profile,
  keyMetrics,
  financialRatios = [],
  financialRatiosTTM = [],
  financialScores,
}: Props) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    // 如果已经是百分比形式（>1），直接显示；否则乘以100
    const value = Math.abs(num) > 1 ? num : num * 100;
    return value.toFixed(2) + '%';
  };

  const formatRatio = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return num.toFixed(2);
  };

  if (!keyMetrics || keyMetrics.length === 0) {
    return (
      <div className="gemini-card p-6 text-center text-mist-400">
        暂无估值指标数据
      </div>
    );
  }

  const latestMetrics = keyMetrics[0];
  const latestRatios = financialRatios?.[0];

  // 指标卡片组件（带 tooltip）
  const MetricCard = ({ 
    label, 
    value, 
    format, 
    icon: Icon, 
    metricKey,
    gradient = 'from-glacier-500/20 to-glacier-600/20'
  }: { 
    label: string; 
    value: number | undefined | null; 
    format: (val: number | undefined | null) => string;
    icon: any;
    metricKey?: string;
    gradient?: string;
  }) => {
    const description = metricKey ? metricDescriptions[metricKey] : null;
    const showTooltip = description && hoveredMetric === metricKey;

    return (
      <div 
        className="relative p-4 rounded-xl bg-white/5 border border-white/5 max-md:border-0 group cursor-help"
        onMouseEnter={() => metricKey && setHoveredMetric(metricKey)}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        <div className="flex items-center gap-2 mb-2 text-mist-400">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-lg md:text-xl font-bold font-mono text-white whitespace-nowrap">
          {format(value)}
        </p>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-[calc(100vw-2rem)] p-3 bg-midnight border border-white/20 rounded-lg shadow-xl text-xs text-mist-200 leading-relaxed pointer-events-none">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-glacier-400 shrink-0 mt-0.5" />
              <p>{description}</p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
          </div>
        )}
      </div>
    );
  };

  // 1. 估值指标
  const renderValuationMetrics = () => {
    const metrics = [
      { 
        label: '市值', 
        value: latestMetrics.marketCap, 
        format: formatNumber,
        icon: DollarSign,
        metricKey: 'marketCap',
      },
      { 
        label: '企业价值', 
        value: latestMetrics.enterpriseValue, 
        format: formatNumber,
        icon: Building2,
        metricKey: 'enterpriseValue',
      },
      { 
        label: 'EV/营收', 
        value: latestMetrics.evToSales, 
        format: formatRatio,
        icon: BarChart3,
        metricKey: 'evToSales',
      },
      { 
        label: 'EV/EBITDA', 
        value: latestMetrics.enterpriseValueOverEBITDA, 
        format: formatRatio,
        icon: Calculator,
        metricKey: 'evToEBITDA',
      },
      { 
        label: 'EV/经营现金流', 
        value: latestMetrics.evToOperatingCashFlow, 
        format: formatRatio,
        icon: Activity,
        metricKey: 'evToOperatingCashFlow',
      },
      { 
        label: 'EV/自由现金流', 
        value: latestMetrics.evToFreeCashFlow, 
        format: formatRatio,
        icon: Zap,
        metricKey: 'evToFreeCashFlow',
      },
      { 
        label: '盈利收益率', 
        value: latestMetrics.earningsYield, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'earningsYield',
      },
      { 
        label: '自由现金流收益率', 
        value: latestMetrics.freeCashFlowYield, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'freeCashFlowYield',
      },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-glacier-500 rounded-full"></span>
          估值指标
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 2. 盈利能力与回报
  const renderProfitabilityMetrics = () => {
    const metrics = [
      { 
        label: 'ROE', 
        value: latestMetrics.roe, 
        format: formatPercent,
        icon: TrendingUp,
        metricKey: 'roe',
      },
      { 
        label: 'ROIC', 
        value: latestMetrics.roic, 
        format: formatPercent,
        icon: Target,
        metricKey: 'roic',
      },
      { 
        label: 'ROA', 
        value: latestRatios?.returnOnAssets, 
        format: formatPercent,
        icon: BarChart3,
        metricKey: 'returnOnAssets',
      },
      { 
        label: 'ROCE', 
        value: latestRatios?.returnOnCapitalEmployed, 
        format: formatPercent,
        icon: Activity,
        metricKey: 'returnOnCapitalEmployed',
      },
      { 
        label: '有形资产回报率', 
        value: latestMetrics.returnOnTangibleAssets, 
        format: formatPercent,
        icon: PiggyBank,
        metricKey: 'returnOnTangibleAssets',
      },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gemini-blue rounded-full"></span>
          盈利能力与回报
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 3. 运营效率与周期
  const renderEfficiencyMetrics = () => {
    const metrics = [
      { 
        label: '库存周转天数', 
        value: latestMetrics.daysOfInventoryOnHand, 
        format: formatRatio,
        icon: Activity,
        metricKey: 'daysOfInventoryOnHand',
      },
      { 
        label: '应收账款天数', 
        value: latestMetrics.daysSalesOutstanding, 
        format: formatRatio,
        icon: TrendingUp,
        metricKey: 'daysSalesOutstanding',
      },
      { 
        label: '应付账款天数', 
        value: latestMetrics.daysPayablesOutstanding, 
        format: formatRatio,
        icon: TrendingDown,
        metricKey: 'daysPayablesOutstanding',
      },
      { 
        label: '平均库存', 
        value: latestMetrics.averageInventory, 
        format: formatNumber,
        icon: BarChart3,
        metricKey: 'averageInventory',
      },
      { 
        label: '平均应收账款', 
        value: latestMetrics.averageReceivables, 
        format: formatNumber,
        icon: DollarSign,
        metricKey: 'averageReceivables',
      },
      { 
        label: '平均应付账款', 
        value: latestMetrics.averagePayables, 
        format: formatNumber,
        icon: DollarSign,
        metricKey: 'averagePayables',
      },
    ];

    // 计算现金循环周期（如果数据可用）
    const dso = latestMetrics.daysSalesOutstanding;
    const dio = latestMetrics.daysOfInventoryOnHand;
    const dpo = latestMetrics.daysPayablesOutstanding;
    // 优先使用 FinancialRatios 中的 cashConversionCycle，否则计算
    const ccc = latestRatios?.cashConversionCycle ?? 
                ((dso && dio && dpo) ? dio + dso - dpo : null);

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          运营效率与周期
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
        {ccc !== null && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gemini-blue" />
                <span className="text-sm text-mist-300">现金循环周期 (CCC)</span>
              </div>
              <span className={`font-mono font-bold text-lg ${ccc < 0 ? 'text-gemini-green' : 'text-mist-300'}`}>
                {formatRatio(ccc)} 天
              </span>
            </div>
            {ccc < 0 && (
              <p className="text-xs text-mist-500 mt-2">
                负数表示公司极其强势：还没给供应商付钱，就已经把货卖给消费者并收到钱了！
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // 4. 财务健康与风险
  const renderHealthMetrics = () => {
    const metrics = [
      { 
        label: '流动比率', 
        value: latestMetrics.currentRatio, 
        format: formatRatio,
        icon: Shield,
        metricKey: 'currentRatio',
      },
      { 
        label: '净债务/EBITDA', 
        value: latestMetrics.netDebtToEBITDA, 
        format: formatRatio,
        icon: Calculator,
        metricKey: 'netDebtToEBITDA',
      },
      { 
        label: '收益质量', 
        value: latestMetrics.incomeQuality, 
        format: formatRatio,
        icon: Activity,
        metricKey: 'incomeQuality',
      },
      { 
        label: '利息覆盖率', 
        value: latestMetrics.interestCoverage, 
        format: formatRatio,
        icon: Shield,
        metricKey: 'interestCoverage',
      },
      { 
        label: '营运资金', 
        value: latestMetrics.workingCapital, 
        format: formatNumber,
        icon: DollarSign,
        metricKey: 'workingCapital',
      },
      { 
        label: '投入资本', 
        value: latestMetrics.investedCapital, 
        format: formatNumber,
        icon: Building2,
        metricKey: 'investedCapital',
      },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gemini-green rounded-full"></span>
          财务健康与风险
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 5. 成本与开支结构
  const renderExpenseMetrics = () => {
    const metrics = [
      { 
        label: '研发占比', 
        value: latestMetrics.researchAndDdevelopementToRevenue, 
        format: formatPercent,
        icon: Zap,
        metricKey: 'researchAndDdevelopementToRevenue',
      },
      { 
        label: '资本开支占比', 
        value: latestMetrics.capexToRevenue, 
        format: formatPercent,
        icon: Building2,
        metricKey: 'capexToRevenue',
      },
      { 
        label: '股权激励占比', 
        value: latestMetrics.stockBasedCompensationToRevenue, 
        format: formatPercent,
        icon: Percent,
        metricKey: 'stockBasedCompensationToRevenue',
      },
      { 
        label: '销售管理费用占比', 
        value: latestMetrics.salesGeneralAndAdministrativeToRevenue, 
        format: formatPercent,
        icon: BarChart3,
        metricKey: 'salesGeneralAndAdministrativeToRevenue',
      },
      { 
        label: '资本开支/现金流', 
        value: latestMetrics.capexToOperatingCashFlow, 
        format: formatPercent,
        icon: Activity,
        metricKey: 'capexToOperatingCashFlow',
      },
      { 
        label: '无形资产占比', 
        value: latestMetrics.intangiblesToTotalAssets, 
        format: formatPercent,
        icon: PiggyBank,
        metricKey: 'intangiblesToTotalAssets',
      },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
          成本与开支结构
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 6. 深度价值模型
  const renderValueModels = () => {
    const metrics = [
      { 
        label: '格雷厄姆数字', 
        value: latestMetrics.grahamNumber, 
        format: formatNumber,
        icon: Calculator,
        metricKey: 'grahamNumber',
      },
      { 
        label: '净净估值', 
        value: latestMetrics.grahamNetNet, 
        format: formatNumber,
        icon: PiggyBank,
        metricKey: 'grahamNetNet',
      },
      { 
        label: '净流动资产价值', 
        value: latestMetrics.netCurrentAssetValue, 
        format: formatNumber,
        icon: DollarSign,
        metricKey: 'netCurrentAssetValue',
      },
      { 
        label: '有形资产价值', 
        value: latestMetrics.tangibleAssetValue, 
        format: formatNumber,
        icon: Building2,
        metricKey: 'tangibleAssetValue',
      },
    ];

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          深度价值模型（格雷厄姆指标）
        </h3>
        <p className="text-xs text-mist-500 mb-4">
          这些指标主要用于寻找极度低估的股票，通常不适用于科技巨头等成长型公司。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  // 7. 趋势图表 - 展示关键指标的历史趋势
  const renderTrendCharts = () => {
    if (keyMetrics.length < 2) return null;

    const years = keyMetrics.map(m => m.calendarYear || m.fiscalYear || m.date?.split('-')[0] || '').reverse();
    const evToEbitda = keyMetrics.map(m => m.enterpriseValueOverEBITDA || 0).reverse();
    const roe = keyMetrics.map(m => (m.roe || 0) * 100).reverse();
    const roic = keyMetrics.map(m => (m.roic || 0) * 100).reverse();
    const currentRatio = keyMetrics.map(m => m.currentRatio || 0).reverse();
    const netDebtToEbitda = keyMetrics.map(m => m.netDebtToEBITDA || 0).reverse();

    const colors = {
      evToEbitda: '#64948b',
      roe: '#7a8494',
      roic: '#948a6a',
      currentRatio: '#6a8494',
      netDebtToEbitda: '#94655a',
    };

    const option1 = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['EV/EBITDA', 'ROE (%)', 'ROIC (%)'],
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
      yAxis: [
        {
          type: 'value',
          name: '倍数',
          nameTextStyle: { color: '#64748b' },
          axisLine: { show: false },
          axisLabel: { color: '#64748b' },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '百分比 (%)',
          nameTextStyle: { color: '#64748b' },
          axisLine: { show: false },
          axisLabel: { color: '#64748b', formatter: (v: number) => `${v}%` },
          splitLine: { show: false },
        },
      ],
      series: [
        { name: 'EV/EBITDA', type: 'line', data: evToEbitda, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.evToEbitda }, symbol: 'circle', symbolSize: 6 },
        { name: 'ROE (%)', type: 'line', yAxisIndex: 1, data: roe, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.roe }, symbol: 'circle', symbolSize: 6 },
        { name: 'ROIC (%)', type: 'line', yAxisIndex: 1, data: roic, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.roic }, symbol: 'circle', symbolSize: 6 },
      ],
    };

    const option2 = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['流动比率', '净债务/EBITDA'],
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
        nameTextStyle: { color: '#64748b' },
        axisLine: { show: false },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        { name: '流动比率', type: 'line', data: currentRatio, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.currentRatio }, symbol: 'circle', symbolSize: 6 },
        { name: '净债务/EBITDA', type: 'line', data: netDebtToEbitda, smooth: true, lineStyle: { width: 2 }, itemStyle: { color: colors.netDebtToEbitda }, symbol: 'circle', symbolSize: 6 },
      ],
    };

    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gemini-purple rounded-full"></span>
          关键指标趋势
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ReactECharts option={option1} style={{ height: '300px' }} />
          </div>
          <div>
            <ReactECharts option={option2} style={{ height: '300px' }} />
          </div>
        </div>
      </div>
    );
  };

  // 基础信息展示
  const renderBasicInfo = () => {
    return (
      <div className="bg-midnight/30 rounded-xl p-6 border border-white/5 max-md:border-0">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-mist-500 rounded-full"></span>
          基础信息
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-mist-500 mb-1">财报日期</div>
            <div className="text-sm font-mono text-white">{latestMetrics.date || 'N/A'}</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-mist-500 mb-1">财年</div>
            <div className="text-sm font-mono text-white">{latestMetrics.fiscalYear || latestMetrics.calendarYear || 'N/A'}</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-mist-500 mb-1">报表周期</div>
            <div className="text-sm font-mono text-white">{latestMetrics.period || 'N/A'}</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-mist-500 mb-1">股票代码</div>
            <div className="text-sm font-mono text-white">{latestMetrics.symbol || 'N/A'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 财务健康评分 - 最重要的指标放在最前面 */}
      {financialScores && (
        <FinancialScoresDisplay financialScores={financialScores} />
      )}
      
      {renderBasicInfo()}
      {renderValuationMetrics()}
      {renderProfitabilityMetrics()}
      {renderEfficiencyMetrics()}
      {renderHealthMetrics()}
      {renderExpenseMetrics()}
      {renderValueModels()}
      {renderTrendCharts()}
      
      {/* 财务比率详细展示 */}
      {financialRatios && financialRatios.length > 0 && (
        <div className="mt-8">
          <FinancialRatiosDisplay 
            financialRatios={financialRatios}
            keyMetrics={keyMetrics}
          />
        </div>
      )}
      
      {/* TTM 财务比率展示 */}
      {financialRatiosTTM && financialRatiosTTM.length > 0 && (
        <FinancialRatiosTTMDisplay
          financialRatiosTTM={financialRatiosTTM}
          keyMetrics={keyMetrics}
          financialRatios={financialRatios}
        />
      )}
    </div>
  );
}
