/**
 * 东方财富 F10 报表 → 站内统一的（FMP 风格）报表结构。
 *
 * - A 股（PC_HSF10）：宽表，一行一个报告期，字段为大写英文（TOTAL_OPERATE_INCOME 等）。
 *   银行 / 保险 / 券商的科目与一般企业不同，缺失的字段按 0 处理，不臆造。
 * - 港股（RPT_HKF10_FN_*_PC）：长表，一行一个科目（STD_ITEM_NAME + AMOUNT），
 *   按科目名称关键字归并到各字段。
 */

import type { BalanceSheet, CashFlowStatement, IncomeStatement } from '@/types';
import { emNum, type HkStatementBundle, type LongFormRow } from './eastmoney';

type Rec = Record<string, any>;

function pick(rec: Rec, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = emNum(rec[key]);
    if (value !== null) return value;
  }
  return null;
}

function sum(...values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
}

function ratio(a: number | null, b: number | null): number {
  return a !== null && b ? a / b : 0;
}

function dateOf(value: unknown): string {
  return String(value ?? '').slice(0, 10);
}

function quarterLabel(date: string): { fiscalYear: string; period: string } {
  const month = Number(date.slice(5, 7));
  const quarter = Math.min(4, Math.max(1, Math.ceil(month / 3)));
  return { fiscalYear: date.slice(0, 4), period: `Q${quarter}` };
}

interface Ctx {
  symbol: string;
  currency: string;
  frequency: 'annual' | 'quarterly';
}

function base(date: string, ctx: Ctx) {
  const labels = ctx.frequency === 'annual' ? { fiscalYear: date.slice(0, 4), period: 'FY' } : quarterLabel(date);
  return { date, symbol: ctx.symbol, reportedCurrency: ctx.currency, calendarYear: date.slice(0, 4), ...labels };
}

// ==================== A 股 ====================

export function cnIncome(records: Rec[], ctx: Ctx, cashRecords: Rec[] = []): IncomeStatement[] {
  const cashByDate = new Map(cashRecords.map((r) => [dateOf(r.REPORT_DATE), r]));
  return records
    .map((r) => {
      const date = dateOf(r.REPORT_DATE);
      const revenue = pick(r, 'TOTAL_OPERATE_INCOME', 'OPERATE_INCOME') ?? 0;
      const cost = pick(r, 'OPERATE_COST');
      const grossProfit = cost !== null ? revenue - cost : 0;
      const selling = pick(r, 'SALE_EXPENSE');
      const admin = pick(r, 'MANAGE_EXPENSE');
      const rd = pick(r, 'RESEARCH_EXPENSE', 'ME_RESEARCH_EXPENSE');
      const operatingIncome = pick(r, 'OPERATE_PROFIT') ?? 0;
      const incomeBeforeTax = pick(r, 'TOTAL_PROFIT') ?? 0;
      const netIncome = pick(r, 'PARENT_NETPROFIT', 'NETPROFIT') ?? 0;
      const eps = pick(r, 'BASIC_EPS') ?? 0;
      const epsDiluted = pick(r, 'DILUTED_EPS', 'BASIC_EPS') ?? 0;
      const cash = cashByDate.get(date) ?? {};
      const depreciation = sum(pick(cash, 'FA_IR_DEPR'), pick(cash, 'IA_AMORTIZE'), pick(cash, 'LPE_AMORTIZE')) ?? 0;
      const interestExpense = pick(r, 'FE_INTEREST_EXPENSE') ?? 0;
      const ebit = incomeBeforeTax + interestExpense;
      const shares = eps ? netIncome / eps : 0;
      const totalCost = pick(r, 'TOTAL_OPERATE_COST');
      return {
        ...base(date, ctx),
        revenue,
        costOfRevenue: cost ?? 0,
        grossProfit,
        grossProfitRatio: ratio(grossProfit, revenue),
        researchAndDevelopmentExpenses: rd ?? 0,
        generalAndAdministrativeExpenses: admin ?? 0,
        sellingAndMarketingExpenses: selling ?? 0,
        sellingGeneralAndAdministrativeExpenses: (selling ?? 0) + (admin ?? 0),
        otherExpenses: 0,
        operatingExpenses: totalCost !== null && cost !== null ? totalCost - cost : (selling ?? 0) + (admin ?? 0) + (rd ?? 0),
        costAndExpenses: totalCost ?? 0,
        interestIncome: pick(r, 'FE_INTEREST_INCOME') ?? 0,
        interestExpense,
        depreciationAndAmortization: depreciation,
        ebitda: ebit + depreciation,
        ebitdaratio: ratio(ebit + depreciation, revenue),
        ebit,
        operatingIncome,
        operatingIncomeRatio: ratio(operatingIncome, revenue),
        totalOtherIncomeExpensesNet: incomeBeforeTax - operatingIncome,
        incomeBeforeTax,
        incomeBeforeTaxRatio: ratio(incomeBeforeTax, revenue),
        incomeTaxExpense: pick(r, 'INCOME_TAX') ?? 0,
        netIncome,
        netIncomeRatio: ratio(netIncome, revenue),
        eps,
        epsdiluted: epsDiluted,
        epsDiluted,
        weightedAverageShsOut: shares,
        weightedAverageShsOutDil: shares,
      } as IncomeStatement;
    })
    .filter((s) => s.date && (s.revenue || s.netIncome));
}

export function cnBalance(records: Rec[], ctx: Ctx): BalanceSheet[] {
  return records
    .map((r) => {
      const date = dateOf(r.REPORT_DATE);
      const cash = pick(r, 'MONETARYFUNDS', 'CASH_DEPOSIT_PBC') ?? 0;
      const sti = pick(r, 'TRADE_FINASSET_NOTFVTPL', 'TRADE_FINASSET') ?? 0;
      const totalAssets = pick(r, 'TOTAL_ASSETS') ?? 0;
      const totalLiabilities = pick(r, 'TOTAL_LIABILITIES') ?? 0;
      const equity = pick(r, 'TOTAL_PARENT_EQUITY', 'TOTAL_EQUITY') ?? 0;
      const goodwill = pick(r, 'GOODWILL') ?? 0;
      const intangibles = pick(r, 'INTANGIBLE_ASSET') ?? 0;
      const shortDebt = sum(pick(r, 'SHORT_LOAN'), pick(r, 'NONCURRENT_LIAB_1YEAR')) ?? 0;
      const longDebt = sum(pick(r, 'LONG_LOAN'), pick(r, 'BOND_PAYABLE')) ?? 0;
      const totalDebt = shortDebt + longDebt + (pick(r, 'LEASE_LIAB') ?? 0);
      return {
        ...base(date, ctx),
        cashAndCashEquivalents: cash,
        shortTermInvestments: sti,
        cashAndShortTermInvestments: cash + sti,
        netReceivables: pick(r, 'ACCOUNTS_RECE', 'NOTE_ACCOUNTS_RECE') ?? 0,
        inventory: pick(r, 'INVENTORY') ?? 0,
        otherCurrentAssets: pick(r, 'OTHER_CURRENT_ASSET') ?? 0,
        totalCurrentAssets: pick(r, 'TOTAL_CURRENT_ASSETS') ?? 0,
        propertyPlantEquipmentNet: pick(r, 'FIXED_ASSET') ?? 0,
        goodwill,
        intangibleAssets: intangibles,
        goodwillAndIntangibleAssets: goodwill + intangibles,
        longTermInvestments: pick(r, 'LONG_EQUITY_INVEST') ?? 0,
        taxAssets: pick(r, 'DEFER_TAX_ASSET') ?? 0,
        otherNonCurrentAssets: pick(r, 'OTHER_NONCURRENT_ASSET') ?? 0,
        totalNonCurrentAssets: pick(r, 'TOTAL_NONCURRENT_ASSETS') ?? 0,
        otherAssets: 0,
        totalAssets,
        accountPayables: pick(r, 'ACCOUNTS_PAYABLE', 'NOTE_ACCOUNTS_PAYABLE') ?? 0,
        shortTermDebt: shortDebt,
        taxPayables: pick(r, 'TAX_PAYABLE') ?? 0,
        deferredRevenue: pick(r, 'CONTRACT_LIAB', 'ADVANCE_RECEIVABLES') ?? 0,
        otherCurrentLiabilities: 0,
        totalCurrentLiabilities: pick(r, 'TOTAL_CURRENT_LIAB') ?? 0,
        longTermDebt: longDebt,
        deferredRevenueNonCurrent: 0,
        deferredTaxLiabilitiesNonCurrent: pick(r, 'DEFER_TAX_LIAB') ?? 0,
        otherNonCurrentLiabilities: 0,
        totalNonCurrentLiabilities: pick(r, 'TOTAL_NONCURRENT_LIAB') ?? 0,
        otherLiabilities: 0,
        capitalLeaseObligations: pick(r, 'LEASE_LIAB') ?? 0,
        totalLiabilities,
        preferredStock: 0,
        commonStock: pick(r, 'SHARE_CAPITAL') ?? 0,
        retainedEarnings: pick(r, 'UNASSIGN_RPOFIT', 'UNASSIGN_PROFIT') ?? 0,
        accumulatedOtherComprehensiveIncomeLoss: pick(r, 'OTHER_COMPRE_INCOME') ?? 0,
        othertotalStockholdersEquity: 0,
        totalStockholdersEquity: equity,
        totalEquity: pick(r, 'TOTAL_EQUITY') ?? equity,
        totalLiabilitiesAndStockholdersEquity: totalAssets,
        minorityInterest: pick(r, 'MINORITY_EQUITY') ?? 0,
        totalLiabilitiesAndTotalEquity: totalAssets,
        totalInvestments: sti + (pick(r, 'LONG_EQUITY_INVEST') ?? 0),
        totalDebt,
        netDebt: totalDebt - cash,
        // A 股面值 1 元，股本金额即股数
        sharesOutstanding: pick(r, 'SHARE_CAPITAL') ?? 0,
      } as BalanceSheet;
    })
    .filter((s) => s.date && s.totalAssets);
}

export function cnCashFlow(records: Rec[], ctx: Ctx): CashFlowStatement[] {
  return records
    .map((r) => {
      const date = dateOf(r.REPORT_DATE);
      const ocf = pick(r, 'NETCASH_OPERATE') ?? 0;
      const capex = -(pick(r, 'CONSTRUCT_LONG_ASSET') ?? 0);
      return {
        ...base(date, ctx),
        netIncome: pick(r, 'NETPROFIT') ?? 0,
        depreciationAndAmortization: sum(pick(r, 'FA_IR_DEPR'), pick(r, 'IA_AMORTIZE'), pick(r, 'LPE_AMORTIZE')) ?? 0,
        deferredIncomeTax: 0,
        stockBasedCompensation: 0,
        changeInWorkingCapital: 0,
        accountsReceivables: 0,
        inventory: 0,
        accountsPayables: 0,
        otherWorkingCapital: 0,
        otherNonCashItems: 0,
        netCashProvidedByOperatingActivities: ocf,
        investmentsInPropertyPlantAndEquipment: capex,
        acquisitionsNet: 0,
        purchasesOfInvestments: -(pick(r, 'INVEST_PAY_CASH') ?? 0),
        salesMaturitiesOfInvestments: pick(r, 'WITHDRAW_INVEST') ?? 0,
        otherInvestingActivites: 0,
        netCashUsedForInvestingActivites: pick(r, 'NETCASH_INVEST') ?? 0,
        debtRepayment: -(pick(r, 'PAY_DEBT_CASH') ?? 0),
        commonStockIssued: pick(r, 'ACCEPT_INVEST_CASH') ?? 0,
        commonStockRepurchased: 0,
        dividendsPaid: -(pick(r, 'ASSIGN_DIVIDEND_PORFIT', 'ASSIGN_DIVIDEND_PROFIT') ?? 0),
        otherFinancingActivites: 0,
        netCashUsedProvidedByFinancingActivities: pick(r, 'NETCASH_FINANCE') ?? 0,
        effectOfForexChangesOnCash: pick(r, 'RATE_CHANGE_EFFECT') ?? 0,
        netChangeInCash: pick(r, 'CCE_ADD') ?? 0,
        cashAtEndOfPeriod: pick(r, 'END_CCE') ?? 0,
        cashAtBeginningOfPeriod: pick(r, 'BEGIN_CCE') ?? 0,
        operatingCashFlow: ocf,
        capitalExpenditure: capex,
        freeCashFlow: ocf + capex,
      } as CashFlowStatement;
    })
    .filter((s) => s.date && (s.operatingCashFlow || s.netChangeInCash));
}

// ==================== 港股 ====================

type Matcher = RegExp;

/** 长表按报告期归组：{ 'YYYY-MM-DD': { 科目名: 金额 } } */
function pivotLong(rows: LongFormRow[], annualOnly: boolean): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (annualOnly && row.DATE_TYPE_CODE && row.DATE_TYPE_CODE !== '001') continue;
    const date = dateOf(row.REPORT_DATE);
    const amount = emNum(row.AMOUNT);
    if (!date || amount === null || !row.STD_ITEM_NAME) continue;
    const items = out.get(date) ?? new Map<string, number>();
    if (!items.has(row.STD_ITEM_NAME)) items.set(row.STD_ITEM_NAME, amount);
    out.set(date, items);
  }
  return out;
}

function find(items: Map<string, number>, ...patterns: Matcher[]): number | null {
  for (const pattern of patterns) {
    for (const [name, value] of Array.from(items.entries())) {
      if (pattern.test(name)) return value;
    }
  }
  return null;
}

function sortedDates(map: Map<string, Map<string, number>>, limit: number): string[] {
  return Array.from(map.keys()).sort((a, b) => b.localeCompare(a)).slice(0, limit);
}

/**
 * 港股年报（长表 → 宽表）。港股多为半年报，单季数据不完整，这里只输出年度。
 * 币种取自财报期列表（腾讯等以人民币报告），缺失时用 fallbackCurrency。
 */
export function hkStatements(bundle: HkStatementBundle, ctx: { symbol: string; fallbackCurrency: string }, limit = 6) {
  const annualPeriods = bundle.periods.filter((p) => p.type.includes('年报'));
  const currency = annualPeriods.find((p) => p.currency)?.currency || ctx.fallbackCurrency;
  const fctx: Ctx = { symbol: ctx.symbol, currency, frequency: 'annual' };
  // 有期列表时请求已按年报日期过滤；否则按 DATE_TYPE_CODE（001 = 年报）在本地筛选
  const filterByType = annualPeriods.length === 0;
  const incomeMap = pivotLong(bundle.income, filterByType);
  const balanceMap = pivotLong(bundle.balance, filterByType);
  const cashMap = pivotLong(bundle.cashflow, filterByType);

  const income: IncomeStatement[] = sortedDates(incomeMap, limit).map((date) => {
    const it = incomeMap.get(date)!;
    const revenue = find(it, /^营业额$/, /^营运收入$/, /^经营收入总额$/, /^收入$/, /营业收入/) ?? 0;
    const cost = find(it, /^销售成本$/, /^营运支出$/);
    const grossProfit = find(it, /^毛利$/) ?? (cost !== null ? revenue - Math.abs(cost) : 0);
    const operatingIncome = find(it, /^经营溢利$/, /经营利润/) ?? 0;
    const incomeBeforeTax = find(it, /^除税前溢利$/, /除税前/) ?? 0;
    const netIncome = find(it, /股东应占溢利/, /^除税后溢利$/, /本公司拥有人应占/) ?? 0;
    const eps = find(it, /每股基本盈利/) ?? 0;
    const epsDiluted = find(it, /每股摊薄盈利/) ?? eps;
    const selling = find(it, /销售及分销/);
    const admin = find(it, /行政开支/);
    const interestExpense = Math.abs(find(it, /融资成本/) ?? 0);
    const shares = eps ? netIncome / eps : 0;
    return {
      ...base(date, fctx),
      revenue,
      costOfRevenue: cost !== null ? Math.abs(cost) : 0,
      grossProfit,
      grossProfitRatio: ratio(grossProfit, revenue),
      researchAndDevelopmentExpenses: Math.abs(find(it, /研发/) ?? 0),
      generalAndAdministrativeExpenses: Math.abs(admin ?? 0),
      sellingAndMarketingExpenses: Math.abs(selling ?? 0),
      sellingGeneralAndAdministrativeExpenses: Math.abs(selling ?? 0) + Math.abs(admin ?? 0),
      otherExpenses: 0,
      operatingExpenses: grossProfit - operatingIncome,
      costAndExpenses: revenue - operatingIncome,
      interestIncome: find(it, /利息收入/) ?? 0,
      interestExpense,
      depreciationAndAmortization: Math.abs(find(it, /折旧/) ?? 0),
      ebitda: 0,
      ebitdaratio: 0,
      ebit: incomeBeforeTax + interestExpense,
      operatingIncome,
      operatingIncomeRatio: ratio(operatingIncome, revenue),
      totalOtherIncomeExpensesNet: incomeBeforeTax - operatingIncome,
      incomeBeforeTax,
      incomeBeforeTaxRatio: ratio(incomeBeforeTax, revenue),
      incomeTaxExpense: Math.abs(find(it, /^税项$/, /所得税/) ?? 0),
      netIncome,
      netIncomeRatio: ratio(netIncome, revenue),
      eps,
      epsdiluted: epsDiluted,
      epsDiluted,
      weightedAverageShsOut: shares,
      weightedAverageShsOutDil: shares,
    } as IncomeStatement;
  }).filter((s) => s.revenue || s.netIncome);

  const balance: BalanceSheet[] = sortedDates(balanceMap, limit).map((date) => {
    const it = balanceMap.get(date)!;
    const cash = find(it, /现金及等价物/, /现金及现金等价物/) ?? 0;
    const totalAssets = find(it, /^总资产$/, /资产总计/) ?? 0;
    const totalLiabilities = find(it, /^总负债$/, /负债总计/) ?? 0;
    const equity = find(it, /^股东权益$/, /^股东权益合计$/, /本公司拥有人应占权益/, /^归属于母公司股东权益/) ?? (totalAssets - totalLiabilities);
    const shortDebt = find(it, /短期贷款/, /短期借款/) ?? 0;
    const longDebt = find(it, /长期贷款/, /长期借款/) ?? 0;
    const goodwill = find(it, /^商誉$/) ?? 0;
    const intangibles = find(it, /无形资产/) ?? 0;
    return {
      ...base(date, fctx),
      cashAndCashEquivalents: cash,
      shortTermInvestments: find(it, /短期投资/) ?? 0,
      cashAndShortTermInvestments: cash + (find(it, /短期投资/) ?? 0),
      netReceivables: find(it, /应收帐款/, /应收账款/) ?? 0,
      inventory: find(it, /^存货$/) ?? 0,
      otherCurrentAssets: 0,
      totalCurrentAssets: find(it, /流动资产合计/) ?? 0,
      propertyPlantEquipmentNet: find(it, /物业厂房及设备/) ?? 0,
      goodwill,
      intangibleAssets: intangibles,
      goodwillAndIntangibleAssets: goodwill + intangibles,
      longTermInvestments: find(it, /联营公司权益/, /长期投资/) ?? 0,
      taxAssets: find(it, /递延税项资产/) ?? 0,
      otherNonCurrentAssets: 0,
      totalNonCurrentAssets: find(it, /非流动资产合计/) ?? 0,
      otherAssets: 0,
      totalAssets,
      accountPayables: find(it, /应付帐款/, /应付账款/) ?? 0,
      shortTermDebt: shortDebt,
      taxPayables: find(it, /应付税项/) ?? 0,
      deferredRevenue: find(it, /递延收入/) ?? 0,
      otherCurrentLiabilities: 0,
      totalCurrentLiabilities: find(it, /流动负债合计/) ?? 0,
      longTermDebt: longDebt,
      deferredRevenueNonCurrent: 0,
      deferredTaxLiabilitiesNonCurrent: find(it, /递延税项负债/) ?? 0,
      otherNonCurrentLiabilities: 0,
      totalNonCurrentLiabilities: find(it, /非流动负债合计/) ?? 0,
      otherLiabilities: 0,
      capitalLeaseObligations: 0,
      totalLiabilities,
      preferredStock: 0,
      commonStock: find(it, /^股本$/) ?? 0,
      retainedEarnings: find(it, /保留溢利/) ?? 0,
      accumulatedOtherComprehensiveIncomeLoss: 0,
      othertotalStockholdersEquity: 0,
      totalStockholdersEquity: equity,
      totalEquity: find(it, /^总权益$/) ?? equity,
      totalLiabilitiesAndStockholdersEquity: totalAssets,
      minorityInterest: find(it, /少数股东权益/, /非控制性权益/) ?? 0,
      totalLiabilitiesAndTotalEquity: totalAssets,
      totalInvestments: 0,
      totalDebt: shortDebt + longDebt,
      netDebt: shortDebt + longDebt - cash,
    } as BalanceSheet;
  }).filter((s) => s.totalAssets);

  const cashFlow: CashFlowStatement[] = sortedDates(cashMap, limit).map((date) => {
    const it = cashMap.get(date)!;
    const ocf = find(it, /经营业务现金净额/, /经营活动产生的现金流量净额/) ?? 0;
    const capexRaw = find(it, /购建固定资产/, /购买物业、厂房及设备/, /购置物业、厂房及设备/);
    const capex = capexRaw !== null ? -Math.abs(capexRaw) : 0;
    const dividends = find(it, /已付股息/);
    return {
      ...base(date, fctx),
      netIncome: 0,
      depreciationAndAmortization: Math.abs(find(it, /折旧/) ?? 0),
      deferredIncomeTax: 0,
      stockBasedCompensation: 0,
      changeInWorkingCapital: 0,
      accountsReceivables: 0,
      inventory: 0,
      accountsPayables: 0,
      otherWorkingCapital: 0,
      otherNonCashItems: 0,
      netCashProvidedByOperatingActivities: ocf,
      investmentsInPropertyPlantAndEquipment: capex,
      acquisitionsNet: 0,
      purchasesOfInvestments: 0,
      salesMaturitiesOfInvestments: 0,
      otherInvestingActivites: 0,
      netCashUsedForInvestingActivites: find(it, /投资业务现金净额/) ?? 0,
      debtRepayment: 0,
      commonStockIssued: 0,
      commonStockRepurchased: -(Math.abs(find(it, /回购/) ?? 0)),
      dividendsPaid: dividends !== null ? -Math.abs(dividends) : 0,
      otherFinancingActivites: 0,
      netCashUsedProvidedByFinancingActivities: find(it, /融资业务现金净额/) ?? 0,
      effectOfForexChangesOnCash: find(it, /汇率/) ?? 0,
      netChangeInCash: find(it, /现金及现金等价物净增加/, /现金净额增加/) ?? 0,
      cashAtEndOfPeriod: find(it, /期末现金/) ?? 0,
      cashAtBeginningOfPeriod: find(it, /期初现金/) ?? 0,
      operatingCashFlow: ocf,
      capitalExpenditure: capex,
      freeCashFlow: ocf + capex,
    } as CashFlowStatement;
  }).filter((s) => s.operatingCashFlow);

  return { income, balance, cashFlow, currency };
}
