/**
 * 从三大报表 + 价格序列推导估值、财务比率、增长与健康评分。
 *
 * 字段命名与 FMP 的 key-metrics / ratios / financial-growth / *-ttm 保持一致，
 * 报表组件与 AI 提示词因此无需区分数据来自 FMP 还是 Yahoo。
 * 所有比率均以小数表示（0.25 = 25%），与 FMP 一致。
 */

import type {
  BalanceSheet,
  CashFlowStatement,
  EnterpriseValue,
  FinancialGrowth,
  FinancialRatios,
  FinancialScores,
  IncomeStatement,
  KeyMetrics,
} from '@/types';

type Num = number | null;

export interface PricePoint {
  date: string;
  close: number;
}

/** 长周期年度序列（SEC EDGAR 补充），旧→新 */
export interface LongHistoryPoint {
  fiscalYearEnd: string;
  revenue?: number;
  netIncome?: number;
  dilutedShares?: number;
  operatingCashFlow?: number;
  equity?: number;
}

function safeDiv(numerator: Num | undefined, denominator: Num | undefined): Num {
  if (numerator == null || denominator == null || denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function growth(current: Num | undefined, previous: Num | undefined): Num {
  if (current == null || previous == null || previous === 0) return null;
  const value = (current - previous) / Math.abs(previous);
  return Number.isFinite(value) ? value : null;
}

function cagr(end: Num | undefined, start: Num | undefined, years: number): Num {
  if (end == null || start == null || start <= 0 || end <= 0 || years <= 0) return null;
  const value = Math.pow(end / start, 1 / years) - 1;
  return Number.isFinite(value) ? value : null;
}

function avg(a: Num | undefined, b: Num | undefined): Num {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return (a + b) / 2;
}

function positive(value: Num | undefined): Num {
  return value != null && value > 0 ? value : null;
}

function abs(value: Num | undefined): Num {
  return value == null ? null : Math.abs(value);
}

/** 新→旧的价格序列中，取不晚于 date 的最近收盘价；超出序列范围返回 null。 */
export function priceOnOrBefore(history: PricePoint[], date: string): Num {
  if (history.length === 0) return null;
  const oldest = history[history.length - 1];
  if (date < oldest.date) return null;
  for (const bar of history) {
    if (bar.date <= date) return bar.close;
  }
  return null;
}

function matchByDate<T extends { date: string }>(rows: T[], date: string, fallbackIndex: number): T | undefined {
  return rows.find((row) => row.date === date) ?? rows[fallbackIndex];
}

function sharesOf(income: IncomeStatement | undefined, balance: BalanceSheet | undefined): Num {
  return positive(income?.weightedAverageShsOutDil) ?? positive(income?.weightedAverageShsOut) ?? positive((balance as any)?.sharesOutstanding);
}

interface PeriodInputs {
  income: IncomeStatement;
  balance?: BalanceSheet;
  prevBalance?: BalanceSheet;
  cashFlow?: CashFlowStatement;
  price: Num;
  shares: Num;
  /** 年度 = 365；TTM 同样按 365 处理 */
  days: number;
}

/** 单期计算核心：年度与 TTM 共用 */
function computePeriod({ income, balance, prevBalance, cashFlow, price, shares, days }: PeriodInputs) {
  const revenue = income.revenue || null;
  const cogs = income.costOfRevenue || null;
  const netIncome = income.netIncome ?? null;
  const ebit = (income as any).ebit ?? income.operatingIncome ?? null;
  const ebitda = income.ebitda || null;
  const incomeBeforeTax = income.incomeBeforeTax ?? null;
  const taxRate = (() => {
    const rate = safeDiv(income.incomeTaxExpense, incomeBeforeTax);
    return rate !== null && rate >= 0 && rate <= 0.6 ? rate : 0.21;
  })();

  const totalAssets = balance?.totalAssets || null;
  const equity = balance?.totalStockholdersEquity ?? null;
  const totalDebt = balance?.totalDebt ?? null;
  const cash = balance?.cashAndCashEquivalents ?? null;
  const currentAssets = balance?.totalCurrentAssets || null;
  const currentLiabilities = balance?.totalCurrentLiabilities || null;
  const totalLiabilities = balance?.totalLiabilities ?? null;
  const goodwillAndIntangibles = balance?.goodwillAndIntangibleAssets ?? 0;

  const operatingCashFlow = cashFlow?.operatingCashFlow ?? cashFlow?.netCashProvidedByOperatingActivities ?? null;
  const capex = abs(cashFlow?.capitalExpenditure);
  const freeCashFlow = cashFlow?.freeCashFlow ?? (operatingCashFlow != null && capex != null ? operatingCashFlow - capex : null);
  const dividendsPaid = abs(cashFlow?.dividendsPaid);
  const sbc = cashFlow?.stockBasedCompensation ?? null;
  const depreciation = abs(cashFlow?.depreciationAndAmortization) ?? abs(income.depreciationAndAmortization);

  const marketCap = price != null && shares != null ? price * shares : null;
  const enterpriseValue = marketCap != null ? marketCap + (totalDebt ?? 0) - (cash ?? 0) : null;
  const netDebt = totalDebt != null ? totalDebt - (cash ?? 0) : null;

  const investedCapital = positive((balance as any)?.investedCapital) ?? (equity != null && totalDebt != null ? equity + totalDebt : null);
  const nopat = ebit != null ? ebit * (1 - taxRate) : null;

  const avgReceivables = avg(balance?.netReceivables, prevBalance?.netReceivables);
  const avgInventory = avg(balance?.inventory, prevBalance?.inventory);
  const avgPayables = avg(balance?.accountPayables, prevBalance?.accountPayables);
  const avgAssets = avg(totalAssets, prevBalance?.totalAssets);
  const avgEquity = avg(equity, prevBalance?.totalStockholdersEquity);

  const dso = avgReceivables != null && revenue ? (avgReceivables / revenue) * days : null;
  const dio = avgInventory && cogs ? (avgInventory / cogs) * days : null;
  const dpo = avgPayables != null && cogs ? (avgPayables / cogs) * days : null;
  const operatingCycle = dso != null ? dso + (dio ?? 0) : null;
  const cashConversionCycle = operatingCycle != null ? operatingCycle - (dpo ?? 0) : null;

  const eps = safeDiv(netIncome, shares);
  const bookValuePerShare = safeDiv(equity, shares);
  const grahamNumber = eps != null && eps > 0 && bookValuePerShare != null && bookValuePerShare > 0
    ? Math.sqrt(22.5 * eps * bookValuePerShare)
    : null;

  const quickAssets = balance
    ? (balance.cashAndShortTermInvestments || (balance.cashAndCashEquivalents ?? 0) + (balance.shortTermInvestments ?? 0)) + (balance.netReceivables ?? 0)
    : null;

  const workingCapital = currentAssets != null && currentLiabilities != null ? currentAssets - currentLiabilities : null;
  const tangibleAssetValue = totalAssets != null && totalLiabilities != null ? totalAssets - goodwillAndIntangibles - totalLiabilities : null;
  const netCurrentAssetValue = currentAssets != null && totalLiabilities != null ? currentAssets - totalLiabilities : null;
  const grahamNetNet = balance && totalLiabilities != null && shares
    ? ((balance.cashAndShortTermInvestments ?? 0) + 0.75 * (balance.netReceivables ?? 0) + 0.5 * (balance.inventory ?? 0) - totalLiabilities) / shares
    : null;

  return {
    revenue, netIncome, ebit, ebitda, operatingCashFlow, freeCashFlow, capex, dividendsPaid, sbc, depreciation,
    marketCap, enterpriseValue, netDebt, investedCapital, nopat, taxRate,
    totalAssets, equity, totalDebt, cash, currentAssets, currentLiabilities, totalLiabilities,
    avgReceivables, avgInventory, avgPayables, avgAssets, avgEquity,
    dso, dio, dpo, operatingCycle, cashConversionCycle,
    eps, bookValuePerShare, grahamNumber, quickAssets, workingCapital, tangibleAssetValue, netCurrentAssetValue, grahamNetNet,
    goodwillAndIntangibles, incomeBeforeTax, cogs,
  };
}

type Period = ReturnType<typeof computePeriod>;

function valuation(p: Period, shares: Num) {
  return {
    peRatio: p.marketCap != null && p.netIncome ? safeDiv(p.marketCap, p.netIncome) : null,
    priceToSalesRatio: safeDiv(p.marketCap, p.revenue),
    pocfratio: safeDiv(p.marketCap, p.operatingCashFlow),
    pfcfRatio: safeDiv(p.marketCap, p.freeCashFlow),
    pbRatio: safeDiv(p.marketCap, p.equity),
    ptbRatio: safeDiv(p.marketCap, p.equity != null ? p.equity - p.goodwillAndIntangibles : null),
    evToSales: safeDiv(p.enterpriseValue, p.revenue),
    enterpriseValueOverEBITDA: safeDiv(p.enterpriseValue, p.ebitda),
    evToOperatingCashFlow: safeDiv(p.enterpriseValue, p.operatingCashFlow),
    evToFreeCashFlow: safeDiv(p.enterpriseValue, p.freeCashFlow),
    earningsYield: safeDiv(p.netIncome, p.marketCap),
    freeCashFlowYield: safeDiv(p.freeCashFlow, p.marketCap),
    dividendYield: p.dividendsPaid != null && p.marketCap ? p.dividendsPaid / p.marketCap : null,
    revenuePerShare: safeDiv(p.revenue, shares),
  };
}

// ==================== 年度序列 ====================

export interface DerivedAnnual {
  keyMetrics: KeyMetrics[];
  financialRatios: FinancialRatios[];
  financialGrowth: FinancialGrowth[];
  enterpriseValues: EnterpriseValue[];
}

export function deriveAnnualMetrics(
  incomeStatements: IncomeStatement[],
  balanceSheets: BalanceSheet[],
  cashFlowStatements: CashFlowStatement[],
  history: PricePoint[],
  longHistory: LongHistoryPoint[] = []
): DerivedAnnual {
  const keyMetrics: KeyMetrics[] = [];
  const financialRatios: FinancialRatios[] = [];
  const financialGrowth: FinancialGrowth[] = [];
  const enterpriseValues: EnterpriseValue[] = [];

  const periods = incomeStatements.map((income, i) => {
    const balance = matchByDate(balanceSheets, income.date, i);
    const prevIncome = incomeStatements[i + 1];
    const prevBalance = prevIncome ? matchByDate(balanceSheets, prevIncome.date, i + 1) : undefined;
    const cashFlow = matchByDate(cashFlowStatements, income.date, i);
    const shares = sharesOf(income, balance);
    const price = priceOnOrBefore(history, income.date);
    return { income, balance, cashFlow, shares, price, p: computePeriod({ income, balance, prevBalance, cashFlow, price, shares, days: 365 }) };
  });

  periods.forEach(({ income, balance, cashFlow, shares, price, p }, i) => {
    const v = valuation(p, shares);
    const base = {
      date: income.date,
      symbol: income.symbol,
      calendarYear: income.calendarYear,
      fiscalYear: income.fiscalYear,
      period: income.period,
    };
    const roe = safeDiv(p.netIncome, p.avgEquity);
    const roic = safeDiv(p.nopat, p.investedCapital);
    const debtToEquity = safeDiv(p.totalDebt, p.equity);
    const interestCoverage = income.interestExpense ? safeDiv(p.ebit, Math.abs(income.interestExpense)) : null;
    const payoutRatio = p.dividendsPaid != null && p.netIncome && p.netIncome > 0 ? p.dividendsPaid / p.netIncome : null;

    keyMetrics.push({
      ...base,
      revenuePerShare: v.revenuePerShare,
      netIncomePerShare: p.eps,
      operatingCashFlowPerShare: safeDiv(p.operatingCashFlow, shares),
      freeCashFlowPerShare: safeDiv(p.freeCashFlow, shares),
      cashPerShare: safeDiv(balance?.cashAndShortTermInvestments ?? p.cash, shares),
      bookValuePerShare: p.bookValuePerShare,
      tangibleBookValuePerShare: safeDiv(p.equity != null ? p.equity - p.goodwillAndIntangibles : null, shares),
      shareholdersEquityPerShare: p.bookValuePerShare,
      interestDebtPerShare: safeDiv(p.totalDebt, shares),
      marketCap: p.marketCap,
      enterpriseValue: p.enterpriseValue,
      peRatio: v.peRatio,
      priceToSalesRatio: v.priceToSalesRatio,
      pocfratio: v.pocfratio,
      pfcfRatio: v.pfcfRatio,
      pbRatio: v.pbRatio,
      ptbRatio: v.ptbRatio,
      evToSales: v.evToSales,
      enterpriseValueOverEBITDA: v.enterpriseValueOverEBITDA,
      evToOperatingCashFlow: v.evToOperatingCashFlow,
      evToFreeCashFlow: v.evToFreeCashFlow,
      earningsYield: v.earningsYield,
      freeCashFlowYield: v.freeCashFlowYield,
      debtToEquity,
      debtToAssets: safeDiv(p.totalDebt, p.totalAssets),
      netDebtToEBITDA: safeDiv(p.netDebt, p.ebitda),
      currentRatio: safeDiv(p.currentAssets, p.currentLiabilities),
      interestCoverage,
      incomeQuality: safeDiv(p.operatingCashFlow, p.netIncome),
      dividendYield: v.dividendYield,
      payoutRatio,
      salesGeneralAndAdministrativeToRevenue: safeDiv(income.sellingGeneralAndAdministrativeExpenses, p.revenue),
      researchAndDdevelopementToRevenue: safeDiv(income.researchAndDevelopmentExpenses, p.revenue),
      researchAndDevelopementToRevenue: safeDiv(income.researchAndDevelopmentExpenses, p.revenue),
      intangiblesToTotalAssets: safeDiv(p.goodwillAndIntangibles, p.totalAssets),
      capexToOperatingCashFlow: safeDiv(p.capex, p.operatingCashFlow),
      capexToRevenue: safeDiv(p.capex, p.revenue),
      capexToDepreciation: safeDiv(p.capex, p.depreciation),
      stockBasedCompensationToRevenue: safeDiv(p.sbc, p.revenue),
      grahamNumber: p.grahamNumber,
      roic,
      returnOnTangibleAssets: safeDiv(p.netIncome, p.totalAssets != null ? p.totalAssets - p.goodwillAndIntangibles : null),
      grahamNetNet: p.grahamNetNet,
      workingCapital: p.workingCapital,
      tangibleAssetValue: p.tangibleAssetValue,
      netCurrentAssetValue: p.netCurrentAssetValue,
      investedCapital: p.investedCapital,
      averageReceivables: p.avgReceivables,
      averagePayables: p.avgPayables,
      averageInventory: p.avgInventory,
      daysSalesOutstanding: p.dso,
      daysPayablesOutstanding: p.dpo,
      daysOfInventoryOnHand: p.dio,
      receivablesTurnover: safeDiv(p.revenue, p.avgReceivables),
      payablesTurnover: safeDiv(p.cogs, p.avgPayables),
      inventoryTurnover: safeDiv(p.cogs, p.avgInventory),
      roe,
      capexPerShare: safeDiv(p.capex, shares),
      stockPrice: price,
    } as unknown as KeyMetrics);

    const peRatio = v.peRatio;
    const prev = periods[i + 1];
    const netIncomeGrowth = prev ? growth(p.netIncome, prev.p.netIncome) : null;
    const pbRatio = v.pbRatio;
    financialRatios.push({
      ...base,
      grossProfitMargin: safeDiv(income.grossProfit, p.revenue),
      operatingProfitMargin: safeDiv(income.operatingIncome, p.revenue),
      pretaxProfitMargin: safeDiv(p.incomeBeforeTax, p.revenue),
      netProfitMargin: safeDiv(p.netIncome, p.revenue),
      effectiveTaxRate: safeDiv(income.incomeTaxExpense, p.incomeBeforeTax),
      returnOnAssets: safeDiv(p.netIncome, p.avgAssets),
      returnOnEquity: roe,
      returnOnCapitalEmployed: safeDiv(p.ebit, p.totalAssets != null && p.currentLiabilities != null ? p.totalAssets - p.currentLiabilities : null),
      netIncomePerEBT: safeDiv(p.netIncome, p.incomeBeforeTax),
      ebtPerEbit: safeDiv(p.incomeBeforeTax, p.ebit),
      ebitPerRevenue: safeDiv(p.ebit, p.revenue),
      currentRatio: safeDiv(p.currentAssets, p.currentLiabilities),
      quickRatio: safeDiv(p.quickAssets, p.currentLiabilities),
      cashRatio: safeDiv(p.cash, p.currentLiabilities),
      daysOfSalesOutstanding: p.dso,
      daysOfInventoryOutstanding: p.dio,
      operatingCycle: p.operatingCycle,
      daysOfPayablesOutstanding: p.dpo,
      cashConversionCycle: p.cashConversionCycle,
      debtRatio: safeDiv(p.totalLiabilities, p.totalAssets),
      debtEquityRatio: debtToEquity,
      debtToEquityRatio: debtToEquity,
      longTermDebtToCapitalization: safeDiv(balance?.longTermDebt, balance && p.equity != null ? (balance.longTermDebt ?? 0) + p.equity : null),
      totalDebtToCapitalization: safeDiv(p.totalDebt, p.totalDebt != null && p.equity != null ? p.totalDebt + p.equity : null),
      interestCoverage,
      cashFlowToDebtRatio: safeDiv(p.operatingCashFlow, p.totalDebt),
      companyEquityMultiplier: safeDiv(p.totalAssets, p.equity),
      assetTurnover: safeDiv(p.revenue, p.avgAssets),
      fixedAssetTurnover: safeDiv(p.revenue, balance?.propertyPlantEquipmentNet),
      inventoryTurnover: safeDiv(p.cogs, p.avgInventory),
      receivablesTurnover: safeDiv(p.revenue, p.avgReceivables),
      payablesTurnover: safeDiv(p.cogs, p.avgPayables),
      priceBookValueRatio: pbRatio,
      priceToBookRatio: pbRatio,
      priceToSalesRatio: v.priceToSalesRatio,
      priceEarningsRatio: peRatio,
      priceToEarningsRatio: peRatio,
      priceToFreeCashFlowsRatio: v.pfcfRatio,
      priceToOperatingCashFlowsRatio: v.pocfratio,
      priceCashFlowRatio: v.pocfratio,
      priceEarningsToGrowthRatio: peRatio != null && netIncomeGrowth ? safeDiv(peRatio, netIncomeGrowth * 100) : null,
      priceSalesRatio: v.priceToSalesRatio,
      dividendYield: v.dividendYield,
      payoutRatio,
      enterpriseValueMultiple: v.enterpriseValueOverEBITDA,
      priceFairValue: null,
    } as unknown as FinancialRatios);

    if (p.marketCap != null && price != null && shares != null) {
      enterpriseValues.push({
        symbol: income.symbol,
        date: income.date,
        stockPrice: price,
        numberOfShares: shares,
        marketCapitalization: p.marketCap,
        minusCashAndCashEquivalents: p.cash ?? 0,
        addTotalDebt: p.totalDebt ?? 0,
        enterpriseValue: p.enterpriseValue ?? p.marketCap,
      });
    }

    const prevPeriod = periods[i + 1];
    const threeBack = periods[i + 3];
    const perShare = (value: Num, s: Num) => safeDiv(value, s);
    const dps = perShare(p.dividendsPaid, shares);
    const prevDps = prevPeriod ? perShare(prevPeriod.p.dividendsPaid, prevPeriod.shares) : null;

    const longGrowth = i === 0 ? longRunGrowth(longHistory, income.date) : {};
    const threeYear = threeBack
      ? {
          threeYRevenueGrowthPerShare: cagr(perShare(p.revenue, shares), perShare(threeBack.p.revenue, threeBack.shares), 3),
          threeYNetIncomeGrowthPerShare: cagr(perShare(p.netIncome, shares), perShare(threeBack.p.netIncome, threeBack.shares), 3),
          threeYOperatingCFGrowthPerShare: cagr(perShare(p.operatingCashFlow, shares), perShare(threeBack.p.operatingCashFlow, threeBack.shares), 3),
          threeYShareholdersEquityGrowthPerShare: cagr(perShare(p.equity, shares), perShare(threeBack.p.equity, threeBack.shares), 3),
          threeYDividendperShareGrowthPerShare: cagr(dps, perShare(threeBack.p.dividendsPaid, threeBack.shares), 3),
        }
      : {};

    financialGrowth.push({
      ...base,
      revenueGrowth: prevPeriod ? growth(p.revenue, prevPeriod.p.revenue) : null,
      grossProfitGrowth: prevPeriod ? growth(income.grossProfit, prevPeriod.income.grossProfit) : null,
      ebitgrowth: prevPeriod ? growth(p.ebit, prevPeriod.p.ebit) : null,
      operatingIncomeGrowth: prevPeriod ? growth(income.operatingIncome, prevPeriod.income.operatingIncome) : null,
      netIncomeGrowth,
      epsgrowth: prevPeriod ? growth(income.eps, prevPeriod.income.eps) : null,
      epsdilutedGrowth: prevPeriod ? growth(income.epsdiluted, prevPeriod.income.epsdiluted) : null,
      weightedAverageSharesGrowth: prevPeriod ? growth(income.weightedAverageShsOut, prevPeriod.income.weightedAverageShsOut) : null,
      weightedAverageSharesDilutedGrowth: prevPeriod ? growth(income.weightedAverageShsOutDil, prevPeriod.income.weightedAverageShsOutDil) : null,
      dividendsperShareGrowth: growth(dps, prevDps),
      operatingCashFlowGrowth: prevPeriod ? growth(p.operatingCashFlow, prevPeriod.p.operatingCashFlow) : null,
      freeCashFlowGrowth: prevPeriod ? growth(p.freeCashFlow, prevPeriod.p.freeCashFlow) : null,
      receivablesGrowth: prevPeriod ? growth(balance?.netReceivables, prevPeriod.balance?.netReceivables) : null,
      inventoryGrowth: prevPeriod ? growth(balance?.inventory, prevPeriod.balance?.inventory) : null,
      assetGrowth: prevPeriod ? growth(p.totalAssets, prevPeriod.p.totalAssets) : null,
      bookValueperShareGrowth: prevPeriod ? growth(p.bookValuePerShare, prevPeriod.p.bookValuePerShare) : null,
      debtGrowth: prevPeriod ? growth(p.totalDebt, prevPeriod.p.totalDebt) : null,
      rdexpenseGrowth: prevPeriod ? growth(income.researchAndDevelopmentExpenses, prevPeriod.income.researchAndDevelopmentExpenses) : null,
      sgaexpensesGrowth: prevPeriod ? growth(income.sellingGeneralAndAdministrativeExpenses, prevPeriod.income.sellingGeneralAndAdministrativeExpenses) : null,
      fiveYRevenueGrowthPerShare: null,
      tenYRevenueGrowthPerShare: null,
      fiveYNetIncomeGrowthPerShare: null,
      tenYNetIncomeGrowthPerShare: null,
      fiveYOperatingCFGrowthPerShare: null,
      tenYOperatingCFGrowthPerShare: null,
      fiveYShareholdersEquityGrowthPerShare: null,
      tenYShareholdersEquityGrowthPerShare: null,
      fiveYDividendperShareGrowthPerShare: null,
      tenYDividendperShareGrowthPerShare: null,
      threeYRevenueGrowthPerShare: null,
      threeYNetIncomeGrowthPerShare: null,
      threeYOperatingCFGrowthPerShare: null,
      threeYShareholdersEquityGrowthPerShare: null,
      threeYDividendperShareGrowthPerShare: null,
      ...threeYear,
      ...longGrowth,
    } as unknown as FinancialGrowth);
  });

  return { keyMetrics, financialRatios, financialGrowth, enterpriseValues };
}

/** 用 SEC 长周期年度数据补 3/5/10 年每股 CAGR（仅最新一期）。 */
function longRunGrowth(longHistory: LongHistoryPoint[], latestDate: string): Partial<FinancialGrowth> {
  if (longHistory.length < 4) return {};
  // 只取不晚于最新报告期的数据，旧→新
  const series = longHistory.filter((p) => p.fiscalYearEnd <= latestDate);
  if (series.length < 4) return {};
  const last = series[series.length - 1];

  const perShare = (point: LongHistoryPoint, field: keyof LongHistoryPoint) => {
    const value = point[field];
    return typeof value === 'number' && point.dilutedShares ? value / point.dilutedShares : null;
  };
  const span = (years: number, field: keyof LongHistoryPoint): Num => {
    const start = series[series.length - 1 - years];
    if (!start) return null;
    return cagr(perShare(last, field), perShare(start, field), years);
  };

  const result: Record<string, Num> = {};
  const assign = (key: string, value: Num) => {
    if (value !== null) result[key] = value;
  };
  assign('threeYRevenueGrowthPerShare', span(3, 'revenue'));
  assign('fiveYRevenueGrowthPerShare', span(5, 'revenue'));
  assign('tenYRevenueGrowthPerShare', span(10, 'revenue'));
  assign('threeYNetIncomeGrowthPerShare', span(3, 'netIncome'));
  assign('fiveYNetIncomeGrowthPerShare', span(5, 'netIncome'));
  assign('tenYNetIncomeGrowthPerShare', span(10, 'netIncome'));
  assign('threeYOperatingCFGrowthPerShare', span(3, 'operatingCashFlow'));
  assign('fiveYOperatingCFGrowthPerShare', span(5, 'operatingCashFlow'));
  assign('tenYOperatingCFGrowthPerShare', span(10, 'operatingCashFlow'));
  assign('threeYShareholdersEquityGrowthPerShare', span(3, 'equity'));
  assign('fiveYShareholdersEquityGrowthPerShare', span(5, 'equity'));
  assign('tenYShareholdersEquityGrowthPerShare', span(10, 'equity'));
  return result as Partial<FinancialGrowth>;
}

// ==================== TTM ====================

export interface TTMInputs {
  income: IncomeStatement | null;
  cashFlow: CashFlowStatement | null;
  balance: BalanceSheet | null;
  prevBalance?: BalanceSheet | null;
  price: Num;
  shares: Num;
  marketCap: Num;
}

/** 返回 FMP key-metrics-ttm 与 ratios-ttm 的合并字段（同一对象同时放入两个数组）。 */
export function deriveTTM({ income, cashFlow, balance, prevBalance, price, shares, marketCap }: TTMInputs): Record<string, any> | null {
  if (!income || !balance) return null;
  const effectiveShares = shares ?? sharesOf(income, balance);
  const p = computePeriod({
    income,
    balance,
    prevBalance: prevBalance ?? undefined,
    cashFlow: cashFlow ?? undefined,
    price,
    shares: effectiveShares,
    days: 365,
  });
  // 当前市值优先使用行情给出的值（含所有股本类别）
  const cap = marketCap ?? p.marketCap;
  const ev = cap != null ? cap + (p.totalDebt ?? 0) - (p.cash ?? 0) : null;
  const pe = cap != null && p.netIncome ? safeDiv(cap, p.netIncome) : null;
  const roe = safeDiv(p.netIncome, p.avgEquity);
  const roic = safeDiv(p.nopat, p.investedCapital);

  return {
    symbol: income.symbol,
    marketCap: cap,
    enterpriseValueTTM: ev,
    evToSalesTTM: safeDiv(ev, p.revenue),
    evToEBITDATTM: safeDiv(ev, p.ebitda),
    enterpriseValueMultipleTTM: safeDiv(ev, p.ebitda),
    evToOperatingCashFlowTTM: safeDiv(ev, p.operatingCashFlow),
    evToFreeCashFlowTTM: safeDiv(ev, p.freeCashFlow),
    peRatioTTM: pe,
    priceToEarningsRatioTTM: pe,
    priceToSalesRatioTTM: safeDiv(cap, p.revenue),
    pbRatioTTM: safeDiv(cap, p.equity),
    priceToBookRatioTTM: safeDiv(cap, p.equity),
    priceToFreeCashFlowsRatioTTM: safeDiv(cap, p.freeCashFlow),
    earningsYieldTTM: safeDiv(p.netIncome, cap),
    freeCashFlowYieldTTM: safeDiv(p.freeCashFlow, cap),
    dividendYieldTTM: p.dividendsPaid != null && cap ? p.dividendsPaid / cap : null,
    payoutRatioTTM: p.dividendsPaid != null && p.netIncome && p.netIncome > 0 ? p.dividendsPaid / p.netIncome : null,
    grossProfitMarginTTM: safeDiv(income.grossProfit, p.revenue),
    operatingProfitMarginTTM: safeDiv(income.operatingIncome, p.revenue),
    netProfitMarginTTM: safeDiv(p.netIncome, p.revenue),
    returnOnAssetsTTM: safeDiv(p.netIncome, p.avgAssets),
    returnOnEquityTTM: roe,
    roeTTM: roe,
    returnOnInvestedCapitalTTM: roic,
    roicTTM: roic,
    currentRatioTTM: safeDiv(p.currentAssets, p.currentLiabilities),
    quickRatioTTM: safeDiv(p.quickAssets, p.currentLiabilities),
    debtToEquityTTM: safeDiv(p.totalDebt, p.equity),
    netDebtToEBITDATTM: safeDiv(p.netDebt, p.ebitda),
    interestCoverageTTM: income.interestExpense ? safeDiv(p.ebit, Math.abs(income.interestExpense)) : null,
    incomeQualityTTM: safeDiv(p.operatingCashFlow, p.netIncome),
    interestBurdenTTM: safeDiv(p.incomeBeforeTax, p.ebit),
    taxBurdenTTM: safeDiv(p.netIncome, p.incomeBeforeTax),
    capexToOperatingCashFlowTTM: safeDiv(p.capex, p.operatingCashFlow),
    capexToRevenueTTM: safeDiv(p.capex, p.revenue),
    researchAndDevelopementToRevenueTTM: safeDiv(income.researchAndDevelopmentExpenses, p.revenue),
    stockBasedCompensationToRevenueTTM: safeDiv(p.sbc, p.revenue),
    daysOfSalesOutstandingTTM: p.dso,
    daysOfInventoryOutstandingTTM: p.dio,
    daysOfPayablesOutstandingTTM: p.dpo,
    operatingCycleTTM: p.operatingCycle,
    cashConversionCycleTTM: p.cashConversionCycle,
    assetTurnoverTTM: safeDiv(p.revenue, p.avgAssets),
    inventoryTurnoverTTM: safeDiv(p.cogs, p.avgInventory),
    receivablesTurnoverTTM: safeDiv(p.revenue, p.avgReceivables),
    grahamNumberTTM: p.grahamNumber,
    workingCapitalTTM: p.workingCapital,
    tangibleAssetValueTTM: p.tangibleAssetValue,
    netCurrentAssetValueTTM: p.netCurrentAssetValue,
    revenuePerShareTTM: safeDiv(p.revenue, effectiveShares),
    netIncomePerShareTTM: p.eps,
    freeCashFlowPerShareTTM: safeDiv(p.freeCashFlow, effectiveShares),
    bookValuePerShareTTM: p.bookValuePerShare,
  };
}

/** 季度报表最近 4 期求和得到 TTM 利润表 / 现金流（Yahoo trailing 缺失时的兜底）。 */
export function sumLastFourQuarters<T extends { date: string }>(rows: T[]): T | null {
  if (rows.length < 4) return null;
  const quarters = rows.slice(0, 4);
  const result: Record<string, any> = { ...quarters[0] };
  for (const key of Object.keys(quarters[0])) {
    const values = quarters.map((q) => (q as any)[key]);
    if (values.every((v) => typeof v === 'number')) {
      result[key] = values.reduce((sum, v) => sum + v, 0);
    }
  }
  // 比率与每股字段不能相加，交给下游重新计算
  for (const key of ['grossProfitRatio', 'ebitdaratio', 'operatingIncomeRatio', 'incomeBeforeTaxRatio', 'netIncomeRatio', 'weightedAverageShsOut', 'weightedAverageShsOutDil']) {
    if (key in result) result[key] = (quarters[0] as any)[key];
  }
  result.period = 'TTM';
  return result as T;
}

// ==================== 财务健康评分 ====================

export function deriveFinancialScores(
  symbol: string,
  incomeStatements: IncomeStatement[],
  balanceSheets: BalanceSheet[],
  cashFlowStatements: CashFlowStatement[],
  marketCap: Num
): FinancialScores | null {
  const income = incomeStatements[0];
  const balance = income ? matchByDate(balanceSheets, income.date, 0) : undefined;
  if (!income || !balance || !balance.totalAssets) return null;

  const totalAssets = balance.totalAssets;
  const workingCapital = (balance.totalCurrentAssets ?? 0) - (balance.totalCurrentLiabilities ?? 0);
  const ebit = (income as any).ebit ?? income.operatingIncome ?? 0;
  const totalLiabilities = balance.totalLiabilities ?? 0;
  const cap = marketCap ?? 0;

  const altmanZScore =
    1.2 * (workingCapital / totalAssets) +
    1.4 * ((balance.retainedEarnings ?? 0) / totalAssets) +
    3.3 * (ebit / totalAssets) +
    (totalLiabilities > 0 ? 0.6 * (cap / totalLiabilities) : 0) +
    1.0 * ((income.revenue ?? 0) / totalAssets);

  // Piotroski F-Score：9 项二元检验
  const prevIncome = incomeStatements[1];
  const prevBalance = prevIncome ? matchByDate(balanceSheets, prevIncome.date, 1) : undefined;
  const cashFlow = matchByDate(cashFlowStatements, income.date, 0);
  const ocf = cashFlow?.operatingCashFlow ?? 0;
  const roa = income.netIncome / totalAssets;

  let score = 0;
  if (income.netIncome > 0) score += 1;
  if (ocf > 0) score += 1;
  if (ocf > income.netIncome) score += 1;
  if (prevIncome && prevBalance?.totalAssets) {
    const prevRoa = prevIncome.netIncome / prevBalance.totalAssets;
    if (roa > prevRoa) score += 1;

    const leverage = (balance.longTermDebt ?? 0) / totalAssets;
    const prevLeverage = (prevBalance.longTermDebt ?? 0) / prevBalance.totalAssets;
    if (leverage <= prevLeverage) score += 1;

    const currentRatio = safeDiv(balance.totalCurrentAssets, balance.totalCurrentLiabilities);
    const prevCurrentRatio = safeDiv(prevBalance.totalCurrentAssets, prevBalance.totalCurrentLiabilities);
    if (currentRatio != null && prevCurrentRatio != null && currentRatio > prevCurrentRatio) score += 1;

    const shares = sharesOf(income, balance);
    const prevShares = sharesOf(prevIncome, prevBalance);
    if (shares != null && prevShares != null && shares <= prevShares) score += 1;

    const margin = safeDiv(income.grossProfit, income.revenue);
    const prevMargin = safeDiv(prevIncome.grossProfit, prevIncome.revenue);
    if (margin != null && prevMargin != null && margin > prevMargin) score += 1;

    const turnover = safeDiv(income.revenue, totalAssets);
    const prevTurnover = safeDiv(prevIncome.revenue, prevBalance.totalAssets);
    if (turnover != null && prevTurnover != null && turnover > prevTurnover) score += 1;
  }

  return {
    symbol,
    altmanZScore: Number.isFinite(altmanZScore) ? altmanZScore : 0,
    piotroskiScore: score,
    workingCapital,
    totalAssets,
    retainedEarnings: balance.retainedEarnings ?? 0,
    ebit,
    marketCap: cap,
    totalLiabilities,
    revenue: income.revenue ?? 0,
  };
}
