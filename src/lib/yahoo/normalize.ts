/**
 * 把 Yahoo Finance 的原始响应映射成站内统一的（FMP 风格）数据结构，
 * 让报表组件、AI 提示词与缓存层无需感知数据来源。
 */

import type {
  BalanceSheet,
  CashFlowStatement,
  CompanyProfile,
  DividendCalendar,
  EarningsCalendar,
  IncomeStatement,
  InsiderTrading,
  InstitutionalHolder,
  StockNews,
  StockSplit,
} from '@/types';
import type { ChartResult, TimeseriesPoint, YahooNewsItem } from './client';

// ==================== 基础工具 ====================

/** quoteSummary 在 formatted=false 时直接给数字，否则是 { raw, fmt }；两种都兼容。 */
export function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value && typeof value === 'object' && 'raw' in (value as any)) {
    const raw = (value as any).raw;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  }
  return null;
}

function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as any).fmt === 'string') return (value as any).fmt;
  return '';
}

export function epochToDate(value: unknown): string {
  const seconds = num(value);
  if (seconds === null || seconds <= 0) return '';
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function ratio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

// ==================== 三大报表 ====================

export const INCOME_KEYS = [
  'TotalRevenue', 'CostOfRevenue', 'GrossProfit', 'OperatingExpense', 'SellingGeneralAndAdministration',
  'ResearchAndDevelopment', 'GeneralAndAdministrativeExpense', 'SellingAndMarketingExpense', 'OperatingIncome',
  'InterestIncome', 'InterestExpense', 'InterestIncomeNonOperating', 'InterestExpenseNonOperating',
  'PretaxIncome', 'TaxProvision', 'NetIncome', 'NetIncomeCommonStockholders', 'BasicEPS', 'DilutedEPS',
  'BasicAverageShares', 'DilutedAverageShares', 'EBITDA', 'EBIT', 'NormalizedEBITDA', 'ReconciledDepreciation',
  'TotalExpenses', 'TaxRateForCalcs',
] as const;

export const BALANCE_KEYS = [
  'CashAndCashEquivalents', 'OtherShortTermInvestments', 'CashCashEquivalentsAndShortTermInvestments',
  'Receivables', 'AccountsReceivable', 'Inventory', 'OtherCurrentAssets', 'CurrentAssets', 'NetPPE', 'Goodwill',
  'OtherIntangibleAssets', 'GoodwillAndOtherIntangibleAssets', 'InvestmentsAndAdvances', 'LongTermEquityInvestment',
  'NonCurrentDeferredTaxesAssets', 'OtherNonCurrentAssets', 'TotalNonCurrentAssets', 'TotalAssets',
  'AccountsPayable', 'Payables', 'CurrentDebt', 'CurrentDebtAndCapitalLeaseObligation', 'TotalTaxPayable',
  'IncomeTaxPayable', 'CurrentDeferredRevenue', 'OtherCurrentLiabilities', 'CurrentLiabilities', 'LongTermDebt',
  'LongTermDebtAndCapitalLeaseObligation', 'NonCurrentDeferredRevenue', 'NonCurrentDeferredTaxesLiabilities',
  'OtherNonCurrentLiabilities', 'TotalNonCurrentLiabilitiesNetMinorityInterest', 'TotalLiabilitiesNetMinorityInterest',
  'CapitalLeaseObligations', 'PreferredStock', 'CommonStock', 'RetainedEarnings',
  'GainsLossesNotAffectingRetainedEarnings', 'StockholdersEquity', 'TotalEquityGrossMinorityInterest',
  'MinorityInterest', 'TotalDebt', 'NetDebt', 'WorkingCapital', 'TangibleBookValue', 'InvestedCapital',
  'OrdinarySharesNumber', 'ShareIssued',
] as const;

export const CASH_FLOW_KEYS = [
  'OperatingCashFlow', 'NetIncomeFromContinuingOperations', 'DepreciationAndAmortization', 'DeferredIncomeTax',
  'DeferredTax', 'StockBasedCompensation', 'ChangeInWorkingCapital', 'ChangeInReceivables',
  'ChangesInAccountReceivables', 'ChangeInInventory', 'ChangeInPayable', 'ChangeInAccountPayable',
  'ChangeInPayablesAndAccruedExpense', 'OtherNonCashItems', 'InvestingCashFlow', 'CapitalExpenditure',
  'NetBusinessPurchaseAndSale', 'PurchaseOfBusiness', 'PurchaseOfInvestment', 'SaleOfInvestment',
  'NetOtherInvestingChanges', 'FinancingCashFlow', 'RepaymentOfDebt', 'LongTermDebtPayments', 'CommonStockIssuance',
  'IssuanceOfCapitalStock', 'RepurchaseOfCapitalStock', 'CommonStockPayments', 'CashDividendsPaid',
  'CommonStockDividendPaid', 'NetOtherFinancingCharges', 'EffectOfExchangeRateChanges', 'ChangesInCash',
  'EndCashPosition', 'BeginningCashPosition', 'FreeCashFlow',
] as const;

/** TTM 只对利润表与现金流量表有意义 */
export const TRAILING_KEYS = [...INCOME_KEYS, ...CASH_FLOW_KEYS] as const;

type Row = Record<string, number | undefined> & { __date: string; __currency?: string };

/** 把按 key 组织的时间序列转置成按报告期组织的行，新→旧。 */
function pivot(series: Record<string, TimeseriesPoint[]>): Row[] {
  const byDate = new Map<string, Row>();
  for (const [key, points] of Object.entries(series)) {
    for (const point of points) {
      const row = byDate.get(point.asOfDate) ?? ({ __date: point.asOfDate } as Row);
      row[key] = point.value;
      if (point.currencyCode && !row.__currency) row.__currency = point.currencyCode;
      byDate.set(point.asOfDate, row);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => b.__date.localeCompare(a.__date));
}

function pick(row: Row, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

/**
 * 财年与季度标签。fyEndMonth 为财年结束月份（1-12），取自 defaultKeyStatistics.lastFiscalYearEnd。
 * 周历财年（52/53 周）的期末日可能落在下月月初，前 7 天视作上月。
 */
export function fiscalLabel(date: string, frequency: 'annual' | 'quarterly', fyEndMonth: number) {
  const d = new Date(`${date}T00:00:00Z`);
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth() + 1;
  if (d.getUTCDate() <= 7) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  if (frequency === 'annual') {
    return { fiscalYear: String(year), period: 'FY' };
  }
  const offset = (month - fyEndMonth + 12) % 12;
  const quarterIndex = Math.round(offset / 3) % 4; // 0 = Q4（财年末所在季度）
  const quarter = quarterIndex === 0 ? 4 : quarterIndex;
  const fiscalYear = month > fyEndMonth ? year + 1 : year;
  return { fiscalYear: String(fiscalYear), period: `Q${quarter}` };
}

interface StatementContext {
  symbol: string;
  frequency: 'annual' | 'quarterly';
  fyEndMonth: number;
}

function baseFields(row: Row, ctx: StatementContext) {
  const { fiscalYear, period } = fiscalLabel(row.__date, ctx.frequency, ctx.fyEndMonth);
  return {
    date: row.__date,
    symbol: ctx.symbol,
    reportedCurrency: row.__currency || '',
    calendarYear: row.__date.slice(0, 4),
    fiscalYear,
    period,
  };
}

export function buildIncomeStatements(series: Record<string, TimeseriesPoint[]>, ctx: StatementContext): IncomeStatement[] {
  return pivot(series)
    .filter((row) => pick(row, 'TotalRevenue', 'NetIncome') !== undefined)
    .map((row) => {
      const revenue = pick(row, 'TotalRevenue') ?? 0;
      const costOfRevenue = pick(row, 'CostOfRevenue') ?? 0;
      const grossProfit = pick(row, 'GrossProfit') ?? (revenue ? revenue - costOfRevenue : 0);
      const operatingIncome = pick(row, 'OperatingIncome') ?? 0;
      const incomeBeforeTax = pick(row, 'PretaxIncome') ?? 0;
      const netIncome = pick(row, 'NetIncome', 'NetIncomeCommonStockholders') ?? 0;
      const ebitda = pick(row, 'EBITDA', 'NormalizedEBITDA') ?? 0;
      const epsDiluted = pick(row, 'DilutedEPS') ?? 0;
      const statement: IncomeStatement & Record<string, any> = {
        ...baseFields(row, ctx),
        revenue,
        costOfRevenue,
        grossProfit,
        grossProfitRatio: ratio(grossProfit, revenue) ?? 0,
        researchAndDevelopmentExpenses: pick(row, 'ResearchAndDevelopment') ?? 0,
        generalAndAdministrativeExpenses: pick(row, 'GeneralAndAdministrativeExpense') ?? 0,
        sellingAndMarketingExpenses: pick(row, 'SellingAndMarketingExpense') ?? 0,
        sellingGeneralAndAdministrativeExpenses: pick(row, 'SellingGeneralAndAdministration') ?? 0,
        otherExpenses: 0,
        operatingExpenses: pick(row, 'OperatingExpense') ?? (grossProfit - operatingIncome),
        costAndExpenses: pick(row, 'TotalExpenses') ?? (revenue - operatingIncome),
        interestIncome: pick(row, 'InterestIncome', 'InterestIncomeNonOperating') ?? 0,
        interestExpense: pick(row, 'InterestExpense', 'InterestExpenseNonOperating') ?? 0,
        depreciationAndAmortization: pick(row, 'ReconciledDepreciation') ?? 0,
        ebitda,
        ebitdaratio: ratio(ebitda, revenue) ?? 0,
        ebit: pick(row, 'EBIT') ?? operatingIncome,
        operatingIncome,
        operatingIncomeRatio: ratio(operatingIncome, revenue) ?? 0,
        totalOtherIncomeExpensesNet: incomeBeforeTax - operatingIncome,
        incomeBeforeTax,
        incomeBeforeTaxRatio: ratio(incomeBeforeTax, revenue) ?? 0,
        incomeTaxExpense: pick(row, 'TaxProvision') ?? 0,
        netIncome,
        netIncomeRatio: ratio(netIncome, revenue) ?? 0,
        eps: pick(row, 'BasicEPS') ?? 0,
        epsdiluted: epsDiluted,
        epsDiluted,
        weightedAverageShsOut: pick(row, 'BasicAverageShares') ?? 0,
        weightedAverageShsOutDil: pick(row, 'DilutedAverageShares', 'BasicAverageShares') ?? 0,
      };
      return statement;
    });
}

export function buildBalanceSheets(series: Record<string, TimeseriesPoint[]>, ctx: StatementContext): BalanceSheet[] {
  return pivot(series)
    .filter((row) => pick(row, 'TotalAssets') !== undefined)
    .map((row) => {
      const cash = pick(row, 'CashAndCashEquivalents') ?? 0;
      const shortTermInvestments = pick(row, 'OtherShortTermInvestments') ?? 0;
      const totalAssets = pick(row, 'TotalAssets') ?? 0;
      const totalDebt = pick(row, 'TotalDebt') ?? 0;
      const equity = pick(row, 'StockholdersEquity') ?? 0;
      const goodwill = pick(row, 'Goodwill') ?? 0;
      const intangibles = pick(row, 'OtherIntangibleAssets') ?? 0;
      const sheet: BalanceSheet & Record<string, any> = {
        ...baseFields(row, ctx),
        cashAndCashEquivalents: cash,
        shortTermInvestments,
        cashAndShortTermInvestments: pick(row, 'CashCashEquivalentsAndShortTermInvestments') ?? cash + shortTermInvestments,
        netReceivables: pick(row, 'Receivables', 'AccountsReceivable') ?? 0,
        inventory: pick(row, 'Inventory') ?? 0,
        otherCurrentAssets: pick(row, 'OtherCurrentAssets') ?? 0,
        totalCurrentAssets: pick(row, 'CurrentAssets') ?? 0,
        propertyPlantEquipmentNet: pick(row, 'NetPPE') ?? 0,
        goodwill,
        intangibleAssets: intangibles,
        goodwillAndIntangibleAssets: pick(row, 'GoodwillAndOtherIntangibleAssets') ?? goodwill + intangibles,
        longTermInvestments: pick(row, 'InvestmentsAndAdvances', 'LongTermEquityInvestment') ?? 0,
        taxAssets: pick(row, 'NonCurrentDeferredTaxesAssets') ?? 0,
        otherNonCurrentAssets: pick(row, 'OtherNonCurrentAssets') ?? 0,
        totalNonCurrentAssets: pick(row, 'TotalNonCurrentAssets') ?? 0,
        otherAssets: 0,
        totalAssets,
        accountPayables: pick(row, 'AccountsPayable', 'Payables') ?? 0,
        shortTermDebt: pick(row, 'CurrentDebt', 'CurrentDebtAndCapitalLeaseObligation') ?? 0,
        taxPayables: pick(row, 'TotalTaxPayable', 'IncomeTaxPayable') ?? 0,
        deferredRevenue: pick(row, 'CurrentDeferredRevenue') ?? 0,
        otherCurrentLiabilities: pick(row, 'OtherCurrentLiabilities') ?? 0,
        totalCurrentLiabilities: pick(row, 'CurrentLiabilities') ?? 0,
        longTermDebt: pick(row, 'LongTermDebt', 'LongTermDebtAndCapitalLeaseObligation') ?? 0,
        deferredRevenueNonCurrent: pick(row, 'NonCurrentDeferredRevenue') ?? 0,
        deferredTaxLiabilitiesNonCurrent: pick(row, 'NonCurrentDeferredTaxesLiabilities') ?? 0,
        otherNonCurrentLiabilities: pick(row, 'OtherNonCurrentLiabilities') ?? 0,
        totalNonCurrentLiabilities: pick(row, 'TotalNonCurrentLiabilitiesNetMinorityInterest') ?? 0,
        otherLiabilities: 0,
        capitalLeaseObligations: pick(row, 'CapitalLeaseObligations') ?? 0,
        totalLiabilities: pick(row, 'TotalLiabilitiesNetMinorityInterest') ?? totalAssets - (pick(row, 'TotalEquityGrossMinorityInterest') ?? equity),
        preferredStock: pick(row, 'PreferredStock') ?? 0,
        commonStock: pick(row, 'CommonStock') ?? 0,
        retainedEarnings: pick(row, 'RetainedEarnings') ?? 0,
        accumulatedOtherComprehensiveIncomeLoss: pick(row, 'GainsLossesNotAffectingRetainedEarnings') ?? 0,
        othertotalStockholdersEquity: 0,
        totalStockholdersEquity: equity,
        totalEquity: pick(row, 'TotalEquityGrossMinorityInterest') ?? equity,
        totalLiabilitiesAndStockholdersEquity: totalAssets,
        minorityInterest: pick(row, 'MinorityInterest') ?? 0,
        totalLiabilitiesAndTotalEquity: totalAssets,
        totalInvestments: (pick(row, 'InvestmentsAndAdvances', 'LongTermEquityInvestment') ?? 0) + shortTermInvestments,
        totalDebt,
        netDebt: pick(row, 'NetDebt') ?? totalDebt - cash,
        sharesOutstanding: pick(row, 'OrdinarySharesNumber', 'ShareIssued') ?? 0,
        investedCapital: pick(row, 'InvestedCapital') ?? 0,
        tangibleBookValue: pick(row, 'TangibleBookValue') ?? 0,
      };
      return sheet;
    });
}

export function buildCashFlowStatements(series: Record<string, TimeseriesPoint[]>, ctx: StatementContext): CashFlowStatement[] {
  return pivot(series)
    .filter((row) => pick(row, 'OperatingCashFlow', 'FreeCashFlow') !== undefined)
    .map((row) => {
      const operatingCashFlow = pick(row, 'OperatingCashFlow') ?? 0;
      const capex = pick(row, 'CapitalExpenditure') ?? 0;
      const statement: CashFlowStatement & Record<string, any> = {
        ...baseFields(row, ctx),
        netIncome: pick(row, 'NetIncomeFromContinuingOperations') ?? 0,
        depreciationAndAmortization: pick(row, 'DepreciationAndAmortization') ?? 0,
        deferredIncomeTax: pick(row, 'DeferredIncomeTax', 'DeferredTax') ?? 0,
        stockBasedCompensation: pick(row, 'StockBasedCompensation') ?? 0,
        changeInWorkingCapital: pick(row, 'ChangeInWorkingCapital') ?? 0,
        accountsReceivables: pick(row, 'ChangesInAccountReceivables', 'ChangeInReceivables') ?? 0,
        inventory: pick(row, 'ChangeInInventory') ?? 0,
        accountsPayables: pick(row, 'ChangeInAccountPayable', 'ChangeInPayable', 'ChangeInPayablesAndAccruedExpense') ?? 0,
        otherWorkingCapital: 0,
        otherNonCashItems: pick(row, 'OtherNonCashItems') ?? 0,
        netCashProvidedByOperatingActivities: operatingCashFlow,
        investmentsInPropertyPlantAndEquipment: capex,
        acquisitionsNet: pick(row, 'NetBusinessPurchaseAndSale', 'PurchaseOfBusiness') ?? 0,
        purchasesOfInvestments: pick(row, 'PurchaseOfInvestment') ?? 0,
        salesMaturitiesOfInvestments: pick(row, 'SaleOfInvestment') ?? 0,
        otherInvestingActivites: pick(row, 'NetOtherInvestingChanges') ?? 0,
        netCashUsedForInvestingActivites: pick(row, 'InvestingCashFlow') ?? 0,
        debtRepayment: pick(row, 'RepaymentOfDebt', 'LongTermDebtPayments') ?? 0,
        commonStockIssued: pick(row, 'CommonStockIssuance', 'IssuanceOfCapitalStock') ?? 0,
        commonStockRepurchased: pick(row, 'RepurchaseOfCapitalStock', 'CommonStockPayments') ?? 0,
        dividendsPaid: pick(row, 'CashDividendsPaid', 'CommonStockDividendPaid') ?? 0,
        otherFinancingActivites: pick(row, 'NetOtherFinancingCharges') ?? 0,
        netCashUsedProvidedByFinancingActivities: pick(row, 'FinancingCashFlow') ?? 0,
        effectOfForexChangesOnCash: pick(row, 'EffectOfExchangeRateChanges') ?? 0,
        netChangeInCash: pick(row, 'ChangesInCash') ?? 0,
        cashAtEndOfPeriod: pick(row, 'EndCashPosition') ?? 0,
        cashAtBeginningOfPeriod: pick(row, 'BeginningCashPosition') ?? 0,
        operatingCashFlow,
        capitalExpenditure: capex,
        freeCashFlow: pick(row, 'FreeCashFlow') ?? operatingCashFlow + capex,
      };
      return statement;
    });
}

/** 从 trailing 序列取最近一期的 TTM 利润表 + 现金流（单行）。 */
export function buildTrailing(series: Record<string, TimeseriesPoint[]>, symbol: string) {
  const ctx: StatementContext = { symbol, frequency: 'annual', fyEndMonth: 12 };
  return {
    income: buildIncomeStatements(series, ctx)[0] ?? null,
    cashFlow: buildCashFlowStatements(series, ctx)[0] ?? null,
  };
}

// ==================== 公司概况 / 行情 ====================

export function fiscalYearEndMonth(summary: Record<string, any> | null): number {
  const lastFye = num(summary?.defaultKeyStatistics?.lastFiscalYearEnd);
  if (lastFye) return new Date(lastFye * 1000).getUTCMonth() + 1;
  return 12;
}

export function buildProfile(
  symbol: string,
  summary: Record<string, any> | null,
  chartMeta: Record<string, any> | null
): CompanyProfile & Record<string, any> {
  const asset = summary?.assetProfile ?? {};
  const price = summary?.price ?? {};
  const detail = summary?.summaryDetail ?? {};
  const stats = summary?.defaultKeyStatistics ?? {};
  const financial = summary?.financialData ?? {};

  const officers: any[] = Array.isArray(asset.companyOfficers) ? asset.companyOfficers : [];
  const ceo = officers.find((o) => /chief executive|\bceo\b/i.test(o?.title || ''))?.name || officers[0]?.name || '';

  const lastPrice = num(price.regularMarketPrice) ?? num(chartMeta?.regularMarketPrice) ?? 0;
  const change = num(price.regularMarketChange) ?? 0;
  const changeFraction = num(price.regularMarketChangePercent);
  const changePercentage = changeFraction !== null ? changeFraction * 100 : 0;
  const marketCap = num(price.marketCap) ?? num(detail.marketCap) ?? 0;
  const yearLow = num(detail.fiftyTwoWeekLow) ?? num(chartMeta?.fiftyTwoWeekLow);
  const yearHigh = num(detail.fiftyTwoWeekHigh) ?? num(chartMeta?.fiftyTwoWeekHigh);

  return {
    symbol,
    companyName: str(price.longName) || str(price.shortName) || str(chartMeta?.longName) || symbol,
    industry: str(asset.industry),
    sector: str(asset.sector),
    description: str(asset.longBusinessSummary),
    ceo,
    website: str(asset.website),
    country: str(asset.country),
    city: str(asset.city),
    address: str(asset.address1),
    phone: str(asset.phone),
    fullTimeEmployees: asset.fullTimeEmployees != null ? String(num(asset.fullTimeEmployees) ?? '') : '',
    image: `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
    ipoDate: epochToDate(chartMeta?.firstTradeDate),
    marketCap,
    mktCap: marketCap,
    price: lastPrice,
    change,
    changes: change,
    changePercentage,
    changesPercentage: changePercentage.toFixed(2),
    exchange: str(price.exchange) || str(chartMeta?.exchangeName),
    exchangeShortName: str(price.exchange) || str(chartMeta?.exchangeName),
    exchangeFullName: str(price.exchangeName) || str(chartMeta?.fullExchangeName),
    currency: str(price.currency) || str(chartMeta?.currency),
    reportedCurrency: str(financial.financialCurrency),
    beta: num(detail.beta) ?? num(stats.beta),
    volume: num(price.regularMarketVolume) ?? num(detail.volume),
    averageVolume: num(detail.averageVolume),
    lastDividend: num(detail.trailingAnnualDividendRate),
    range: yearLow !== null && yearHigh !== null ? `${yearLow}-${yearHigh}` : '',
    isEtf: str(price.quoteType) === 'ETF',
    isFund: str(price.quoteType) === 'MUTUALFUND',
    isActivelyTrading: true,
    dataSource: 'yahoo',
  };
}

export function buildQuote(
  symbol: string,
  summary: Record<string, any> | null,
  chartMeta: Record<string, any> | null
): Record<string, any> | null {
  const price = summary?.price ?? {};
  const detail = summary?.summaryDetail ?? {};
  const stats = summary?.defaultKeyStatistics ?? {};

  const last = num(price.regularMarketPrice) ?? num(chartMeta?.regularMarketPrice);
  if (last === null) return null;
  const previousClose = num(price.regularMarketPreviousClose) ?? num(detail.previousClose) ?? num(chartMeta?.chartPreviousClose);
  const change = num(price.regularMarketChange) ?? (previousClose !== null ? last - previousClose : 0);
  const changeFraction = num(price.regularMarketChangePercent);
  const changePercentage = changeFraction !== null
    ? changeFraction * 100
    : previousClose
      ? (change / previousClose) * 100
      : 0;
  const trailingEps = num(stats.trailingEps);

  return {
    symbol,
    name: str(price.longName) || str(price.shortName) || str(chartMeta?.longName) || symbol,
    price: last,
    change,
    changePercentage,
    changesPercentage: changePercentage,
    volume: num(price.regularMarketVolume) ?? num(chartMeta?.regularMarketVolume),
    avgVolume: num(detail.averageVolume),
    dayLow: num(price.regularMarketDayLow) ?? num(chartMeta?.regularMarketDayLow),
    dayHigh: num(price.regularMarketDayHigh) ?? num(chartMeta?.regularMarketDayHigh),
    yearLow: num(detail.fiftyTwoWeekLow) ?? num(chartMeta?.fiftyTwoWeekLow),
    yearHigh: num(detail.fiftyTwoWeekHigh) ?? num(chartMeta?.fiftyTwoWeekHigh),
    open: num(price.regularMarketOpen) ?? num(detail.open),
    previousClose,
    marketCap: num(price.marketCap) ?? num(detail.marketCap),
    priceAvg50: num(detail.fiftyDayAverage),
    priceAvg200: num(detail.twoHundredDayAverage),
    pe: num(detail.trailingPE),
    eps: trailingEps,
    sharesOutstanding: num(stats.sharesOutstanding),
    exchange: str(price.exchangeName) || str(chartMeta?.fullExchangeName),
    currency: str(price.currency) || str(chartMeta?.currency),
    timestamp: num(price.regularMarketTime) ?? num(chartMeta?.regularMarketTime),
  };
}

// ==================== 行情序列 / 事件 ====================

export interface PriceBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjClose: number | null;
  volume: number | null;
}

/** 返回新→旧，与 FMP historical-price-eod 的顺序一致。 */
export function buildPriceHistory(chart: ChartResult | null): PriceBar[] {
  if (!chart?.timestamp) return [];
  const quote = chart.indicators?.quote?.[0] ?? {};
  const adj = chart.indicators?.adjclose?.[0]?.adjclose ?? [];
  const bars: PriceBar[] = [];
  chart.timestamp.forEach((ts, i) => {
    const close = quote.close?.[i];
    if (typeof close !== 'number' || !Number.isFinite(close)) return;
    bars.push({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close,
      adjClose: adj[i] ?? null,
      volume: quote.volume?.[i] ?? null,
    });
  });
  return bars.reverse();
}

export function buildDividends(symbol: string, chart: ChartResult | null): DividendCalendar[] {
  const events = chart?.events?.dividends ?? {};
  return Object.values(events)
    .filter((d) => typeof d?.amount === 'number')
    .map((d) => {
      const date = epochToDate(d.date);
      return {
        symbol,
        date,
        label: date,
        adjDividend: d.amount,
        dividend: d.amount,
        recordDate: '',
        paymentDate: '',
        declarationDate: '',
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildSplits(symbol: string, chart: ChartResult | null): StockSplit[] {
  const events = chart?.events?.splits ?? {};
  return Object.values(events)
    .filter((s) => typeof s?.numerator === 'number' && typeof s?.denominator === 'number')
    .map((s) => {
      const date = epochToDate(s.date);
      return {
        symbol,
        date,
        label: s.splitRatio || `${s.numerator}:${s.denominator}`,
        numerator: s.numerator,
        denominator: s.denominator,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 历史财报：earningsHistory（最近 4 季的 EPS 实际/预期）+ calendarEvents（下一次财报）。
 * 营收实际值按季度利润表的期末日匹配。新→旧。
 */
export function buildEarnings(
  symbol: string,
  summary: Record<string, any> | null,
  quarterlyIncome: IncomeStatement[]
): EarningsCalendar[] {
  const history: any[] = summary?.earningsHistory?.history ?? [];
  const revenueByDate = new Map(quarterlyIncome.map((s) => [s.date, s.revenue]));

  const rows: EarningsCalendar[] = history
    .map((item) => {
      const date = epochToDate(item?.quarter);
      return {
        symbol,
        date,
        time: '',
        epsEstimated: num(item?.epsEstimate) as number,
        epsActual: num(item?.epsActual) as number,
        revenueEstimated: null as unknown as number,
        revenueActual: (revenueByDate.get(date) ?? null) as unknown as number,
        fiscalDateEnding: date,
        updatedFromDate: '',
      };
    })
    .filter((row) => row.date);

  const upcoming = summary?.calendarEvents?.earnings;
  const nextDate = epochToDate(Array.isArray(upcoming?.earningsDate) ? upcoming.earningsDate[0] : upcoming?.earningsDate);
  if (nextDate && !rows.some((row) => row.date >= nextDate)) {
    rows.push({
      symbol,
      date: nextDate,
      time: '',
      epsEstimated: num(upcoming?.earningsAverage) as number,
      epsActual: null as unknown as number,
      revenueEstimated: num(upcoming?.revenueAverage) as number,
      revenueActual: null as unknown as number,
      fiscalDateEnding: '',
      updatedFromDate: '',
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

// ==================== 持仓 / 内部人 ====================

function buildOwnershipRows(list: any[]): InstitutionalHolder[] {
  return list
    .map((item) => {
      const shares = num(item?.position) ?? 0;
      const pctChange = num(item?.pctChange);
      // pctChange 是相对上期持仓的变动比例：上期 = 本期 / (1 + pctChange)
      const previous = pctChange !== null && pctChange > -1 ? shares / (1 + pctChange) : null;
      return {
        holder: str(item?.organization),
        shares,
        dateReported: epochToDate(item?.reportDate),
        change: previous !== null ? Math.round(shares - previous) : 0,
        changePercentage: pctChange !== null ? pctChange * 100 : 0,
        value: num(item?.value) ?? 0,
        weightPercent: (num(item?.pctHeld) ?? 0) * 100,
      };
    })
    .filter((row) => row.holder)
    .sort((a, b) => b.shares - a.shares);
}

export function buildInstitutionalHolders(summary: Record<string, any> | null): InstitutionalHolder[] {
  return buildOwnershipRows(summary?.institutionOwnership?.ownershipList ?? []);
}

export function buildMutualFundHolders(summary: Record<string, any> | null): any[] {
  return buildOwnershipRows(summary?.fundOwnership?.ownershipList ?? []).map((row) => ({
    ...row,
    marketValue: row.value,
  }));
}

function classifyInsiderTransaction(text: string): { type: string; direction: 'A' | 'D' | '' } {
  const lower = text.toLowerCase();
  if (lower.includes('sale')) return { type: 'S-Sale', direction: 'D' };
  if (lower.includes('purchase') || lower.includes('buy')) return { type: 'P-Purchase', direction: 'A' };
  if (lower.includes('gift')) return { type: 'G-Gift', direction: 'D' };
  if (lower.includes('option') || lower.includes('exercise') || lower.includes('conversion')) return { type: 'M-Exempt', direction: 'A' };
  if (lower.includes('award') || lower.includes('grant')) return { type: 'A-Award', direction: 'A' };
  return { type: '', direction: '' };
}

export function buildInsiderTrading(symbol: string, summary: Record<string, any> | null): InsiderTrading[] {
  const list: any[] = summary?.insiderTransactions?.transactions ?? [];
  return list
    .map((item) => {
      const shares = num(item?.shares) ?? 0;
      const value = num(item?.value);
      const text = str(item?.transactionText) || str(item?.moneyText);
      const { type, direction } = classifyInsiderTransaction(text);
      const date = epochToDate(item?.startDate);
      return {
        symbol,
        filingDate: date,
        transactionDate: date,
        reportingCik: '',
        transactionType: type || text,
        securitiesOwned: 0,
        companyCik: '',
        reportingName: str(item?.filerName),
        typeOfOwner: str(item?.filerRelation),
        acquistionOrDisposition: direction,
        formType: '4',
        securitiesTransacted: shares,
        price: value !== null && shares > 0 ? value / shares : 0,
        securityName: 'Common Stock',
        link: str(item?.filerUrl),
      };
    })
    .filter((row) => row.reportingName && row.transactionDate)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

// ==================== 新闻 / 分析师 ====================

export function buildNews(symbol: string, items: YahooNewsItem[]): StockNews[] {
  return items
    .filter((item) => item?.title && item?.link)
    .map((item) => {
      const resolutions = item.thumbnail?.resolutions ?? [];
      const image = resolutions.slice().sort((a, b) => (a.width || 0) - (b.width || 0)).find((r) => (r.width || 0) >= 140)?.url
        || resolutions[0]?.url;
      return {
        symbol,
        publishedDate: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : '',
        title: item.title,
        text: '',
        url: item.link,
        site: item.publisher || '',
        image,
      };
    })
    .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
}

export interface AnalystConsensus {
  recommendationKey: string | null;
  recommendationMean: number | null;
  numberOfAnalysts: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  currentPrice: number | null;
  trend: Array<{ period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }>;
  recentActions: Array<{ date: string; firm: string; action: string; fromGrade: string; toGrade: string }>;
}

export function buildAnalystConsensus(summary: Record<string, any> | null): AnalystConsensus | null {
  const financial = summary?.financialData;
  const trendList: any[] = summary?.recommendationTrend?.trend ?? [];
  const actions: any[] = summary?.upgradeDowngradeHistory?.history ?? [];
  if (!financial && trendList.length === 0) return null;

  return {
    recommendationKey: str(financial?.recommendationKey) || null,
    recommendationMean: num(financial?.recommendationMean),
    numberOfAnalysts: num(financial?.numberOfAnalystOpinions),
    targetHigh: num(financial?.targetHighPrice),
    targetLow: num(financial?.targetLowPrice),
    targetMean: num(financial?.targetMeanPrice),
    targetMedian: num(financial?.targetMedianPrice),
    currentPrice: num(financial?.currentPrice),
    trend: trendList.map((t) => ({
      period: str(t?.period),
      strongBuy: num(t?.strongBuy) ?? 0,
      buy: num(t?.buy) ?? 0,
      hold: num(t?.hold) ?? 0,
      sell: num(t?.sell) ?? 0,
      strongSell: num(t?.strongSell) ?? 0,
    })),
    recentActions: actions.slice(0, 10).map((a) => ({
      date: epochToDate(a?.epochGradeDate),
      firm: str(a?.firm),
      action: str(a?.action),
      fromGrade: str(a?.fromGrade),
      toGrade: str(a?.toGrade),
    })),
  };
}

export interface KeyStatistics {
  beta: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  enterpriseToEbitda: number | null;
  enterpriseToRevenue: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  sharesOutstanding: number | null;
  floatShares: number | null;
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
  shortPercentOfFloat: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekChange: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  averageVolume: number | null;
  forwardEps: number | null;
  trailingEps: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  nextEarningsDate: string | null;
}

export function buildKeyStatistics(summary: Record<string, any> | null): KeyStatistics | null {
  if (!summary) return null;
  const detail = summary.summaryDetail ?? {};
  const stats = summary.defaultKeyStatistics ?? {};
  const financial = summary.financialData ?? {};
  const upcoming = summary.calendarEvents?.earnings;
  const nextEarnings = epochToDate(Array.isArray(upcoming?.earningsDate) ? upcoming.earningsDate[0] : upcoming?.earningsDate);

  return {
    beta: num(detail.beta) ?? num(stats.beta),
    trailingPE: num(detail.trailingPE),
    forwardPE: num(detail.forwardPE) ?? num(stats.forwardPE),
    pegRatio: num(stats.pegRatio) ?? num(stats.trailingPegRatio),
    priceToBook: num(stats.priceToBook),
    priceToSales: num(detail.priceToSalesTrailing12Months),
    enterpriseToEbitda: num(stats.enterpriseToEbitda),
    enterpriseToRevenue: num(stats.enterpriseToRevenue),
    dividendYield: num(detail.dividendYield) ?? num(detail.trailingAnnualDividendYield),
    payoutRatio: num(detail.payoutRatio),
    sharesOutstanding: num(stats.sharesOutstanding),
    floatShares: num(stats.floatShares),
    heldPercentInsiders: num(stats.heldPercentInsiders),
    heldPercentInstitutions: num(stats.heldPercentInstitutions),
    shortPercentOfFloat: num(stats.shortPercentOfFloat),
    fiftyTwoWeekHigh: num(detail.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(detail.fiftyTwoWeekLow),
    fiftyTwoWeekChange: num(stats['52WeekChange']),
    fiftyDayAverage: num(detail.fiftyDayAverage),
    twoHundredDayAverage: num(detail.twoHundredDayAverage),
    averageVolume: num(detail.averageVolume),
    forwardEps: num(stats.forwardEps),
    trailingEps: num(stats.trailingEps),
    earningsGrowth: num(financial.earningsGrowth),
    revenueGrowth: num(financial.revenueGrowth),
    nextEarningsDate: nextEarnings || null,
  };
}
