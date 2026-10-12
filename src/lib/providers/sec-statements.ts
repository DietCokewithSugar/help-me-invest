/**
 * SEC EDGAR companyfacts（XBRL）→ 站内统一的（FMP 风格）三大报表。
 *
 * - 年度：10-K / 20-F / 40-F 中跨度约一年的期间值；资产负债表取对应期末时点值。
 * - 季度：10-Q 直接披露的三个月期间值；现金流量表等只披露年初至今累计值的科目，
 *   用同一起始日的相邻累计值相减得到单季（Q4 = 全年 − 前三季累计）。
 *   加权股数不可相减，只取直接披露值。
 * - 公司会因会计准则变化换用不同标签，每个字段按候选标签顺序取第一个有值的。
 *
 * 只解析 us-gaap；采用 IFRS 申报的外国公司（如 TSM）返回空，由上层回退到其他数据源。
 */

import type { BalanceSheet, CashFlowStatement, IncomeStatement } from '@/types';
import type { LongHistoryPoint } from '@/lib/financial-metrics';

const DAY_MS = 86_400_000;
const ACCEPTED_FORMS = /^(10-K|10-Q|20-F|40-F)/;

interface FactEntry {
  start?: string;
  end: string;
  val: number;
  form?: string;
  filed?: string;
}

interface Duration {
  start: string;
  end: string;
  val: number;
  filed: string;
  days: number;
}

type Gaap = Record<string, { units?: Record<string, FactEntry[]> }>;

function daysBetween(start: string, end: string): number {
  return (Date.parse(end) - Date.parse(start)) / DAY_MS;
}

function entriesOf(gaap: Gaap, tag: string, unit: string): FactEntry[] {
  const entries = gaap?.[tag]?.units?.[unit];
  return Array.isArray(entries) ? entries.filter((e) => typeof e?.val === 'number' && e.end && ACCEPTED_FORMS.test(e.form ?? '')) : [];
}

/** 同一 (start, end) 只保留最新申报的值（后续申报可能重述） */
function durations(entries: FactEntry[]): Duration[] {
  const byKey = new Map<string, Duration>();
  for (const e of entries) {
    if (!e.start) continue;
    const key = `${e.start}|${e.end}`;
    const existing = byKey.get(key);
    if (!existing || (e.filed ?? '') > existing.filed) {
      byKey.set(key, { start: e.start, end: e.end, val: e.val, filed: e.filed ?? '', days: daysBetween(e.start, e.end) });
    }
  }
  return Array.from(byKey.values());
}

const isAnnual = (d: Duration) => d.days >= 350 && d.days <= 380;
const isQuarter = (d: Duration) => d.days >= 80 && d.days <= 100;

interface TagValues {
  annual: Map<string, number>;
  quarter: Map<string, number>;
  /** 仅直接披露的三个月值（用于不可相减的科目，如加权股数） */
  quarterDirect: Map<string, number>;
  instant: Map<string, number>;
}

function indexTag(entries: FactEntry[]): TagValues {
  const annual = new Map<string, number>();
  const quarter = new Map<string, number>();
  const quarterDirect = new Map<string, number>();
  const instant = new Map<string, number>();
  const instantFiled = new Map<string, string>();

  const durs = durations(entries);
  for (const d of durs) {
    if (isAnnual(d)) annual.set(d.end, d.val);
    if (isQuarter(d)) {
      quarter.set(d.end, d.val);
      quarterDirect.set(d.end, d.val);
    }
  }

  // 累计值相减：按起始日分组，相邻两个累计期相差约一个季度
  const groups = new Map<string, Duration[]>();
  for (const d of durs) {
    if (d.days < 80 || d.days > 380) continue;
    const list = groups.get(d.start) ?? [];
    list.push(d);
    groups.set(d.start, list);
  }
  groups.forEach((list) => {
    list.sort((a, b) => a.end.localeCompare(b.end));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const cur = list[i];
      const gap = cur.days - prev.days;
      if (gap >= 80 && gap <= 100 && !quarter.has(cur.end)) {
        quarter.set(cur.end, cur.val - prev.val);
      }
    }
  });

  for (const e of entries) {
    if (e.start) continue;
    const filed = e.filed ?? '';
    if (!instant.has(e.end) || filed > (instantFiled.get(e.end) ?? '')) {
      instant.set(e.end, e.val);
      instantFiled.set(e.end, filed);
    }
  }

  return { annual, quarter, quarterDirect, instant };
}

/** 报表币种：营收 / 净利润标签里条目最多的货币单位（中概股常为 CNY） */
export function detectCurrency(gaap: Gaap): string {
  const counts = new Map<string, number>();
  for (const tag of ['NetIncomeLoss', 'Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'Assets']) {
    const units = gaap?.[tag]?.units ?? {};
    for (const [unit, entries] of Object.entries(units)) {
      if (/^[A-Z]{3}$/.test(unit) && Array.isArray(entries)) {
        counts.set(unit, (counts.get(unit) ?? 0) + entries.length);
      }
    }
  }
  let best = 'USD';
  let bestCount = -1;
  counts.forEach((count, unit) => {
    if (count > bestCount) {
      best = unit;
      bestCount = count;
    }
  });
  return best;
}

type Kind = 'annual' | 'quarter' | 'quarterDirect' | 'instant';

class FactReader {
  private cache = new Map<string, TagValues>();

  constructor(private gaap: Gaap, readonly currency: string) {}

  private tag(tag: string, unit: string): TagValues {
    const key = `${tag}|${unit}`;
    let values = this.cache.get(key);
    if (!values) {
      values = indexTag(entriesOf(this.gaap, tag, unit));
      this.cache.set(key, values);
    }
    return values;
  }

  /** 候选标签按顺序取第一个在该期末有值的 */
  value(tags: string[], end: string, kind: Kind, unit = this.currency): number | null {
    for (const tag of tags) {
      const v = this.tag(tag, unit)[kind].get(end);
      if (v !== undefined) return v;
    }
    return null;
  }

  /** 候选标签合并后的全部期末日 */
  ends(tags: string[], kind: Kind, unit = this.currency): string[] {
    const set = new Set<string>();
    for (const tag of tags) this.tag(tag, unit)[kind].forEach((_, end) => set.add(end));
    return Array.from(set);
  }

  /** 年度期间的起始日（用于给季度定位所属财年） */
  annualPeriods(tags: string[]): Array<{ start: string; end: string }> {
    const byEnd = new Map<string, string>();
    for (const tag of tags) {
      for (const d of durations(entriesOf(this.gaap, tag, this.currency))) {
        if (isAnnual(d) && !byEnd.has(d.end)) byEnd.set(d.end, d.start);
      }
    }
    return Array.from(byEnd.entries())
      .map(([end, start]) => ({ start, end }))
      .sort((a, b) => b.end.localeCompare(a.end));
  }
}

// ==================== 标签表 ====================

const T = {
  revenue: [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'SalesRevenueNet',
    'SalesRevenueGoodsNet',
    'RevenuesNetOfInterestExpense',
  ],
  costOfRevenue: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold', 'CostOfServices'],
  grossProfit: ['GrossProfit'],
  rnd: ['ResearchAndDevelopmentExpense', 'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost'],
  sga: ['SellingGeneralAndAdministrativeExpense'],
  ga: ['GeneralAndAdministrativeExpense'],
  sm: ['SellingAndMarketingExpense', 'MarketingAndAdvertisingExpense'],
  operatingExpenses: ['OperatingExpenses'],
  costsAndExpenses: ['CostsAndExpenses'],
  operatingIncome: ['OperatingIncomeLoss'],
  interestExpense: ['InterestExpense', 'InterestExpenseNonoperating', 'InterestExpenseDebt'],
  interestIncome: ['InvestmentIncomeInterest', 'InterestIncomeOther'],
  pretax: [
    'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
    'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments',
  ],
  tax: ['IncomeTaxExpenseBenefit'],
  netIncome: ['NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic', 'ProfitLoss'],
  eps: ['EarningsPerShareBasic', 'EarningsPerShareBasicAndDiluted'],
  epsDiluted: ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted'],
  shares: ['WeightedAverageNumberOfSharesOutstandingBasic'],
  sharesDiluted: ['WeightedAverageNumberOfDilutedSharesOutstanding'],
  dna: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'Depreciation'],

  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash'],
  sti: ['ShortTermInvestments', 'MarketableSecuritiesCurrent', 'AvailableForSaleSecuritiesDebtSecuritiesCurrent'],
  receivables: ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent'],
  inventory: ['InventoryNet'],
  currentAssets: ['AssetsCurrent'],
  ppe: ['PropertyPlantAndEquipmentNet'],
  goodwill: ['Goodwill'],
  intangibles: ['IntangibleAssetsNetExcludingGoodwill', 'FiniteLivedIntangibleAssetsNet'],
  lti: ['LongTermInvestments', 'MarketableSecuritiesNoncurrent', 'AvailableForSaleSecuritiesDebtSecuritiesNoncurrent'],
  assets: ['Assets'],
  payables: ['AccountsPayableCurrent'],
  debtCurrent: ['DebtCurrent', 'LongTermDebtCurrent'],
  commercialPaper: ['CommercialPaper', 'ShortTermBorrowings'],
  debtNoncurrent: ['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations'],
  leaseNoncurrent: ['OperatingLeaseLiabilityNoncurrent'],
  deferredRevenue: ['ContractWithCustomerLiabilityCurrent', 'DeferredRevenueCurrent'],
  currentLiabilities: ['LiabilitiesCurrent'],
  liabilities: ['Liabilities'],
  liabilitiesAndEquity: ['LiabilitiesAndStockholdersEquity'],
  equity: ['StockholdersEquity'],
  totalEquity: ['StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'StockholdersEquity'],
  minority: ['MinorityInterest'],
  retained: ['RetainedEarningsAccumulatedDeficit'],
  aoci: ['AccumulatedOtherComprehensiveIncomeLossNetOfTax'],
  commonStock: ['CommonStockValue', 'CommonStocksIncludingAdditionalPaidInCapital'],

  ocf: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'],
  investing: ['NetCashProvidedByUsedInInvestingActivities', 'NetCashProvidedByUsedInInvestingActivitiesContinuingOperations'],
  financing: ['NetCashProvidedByUsedInFinancingActivities', 'NetCashProvidedByUsedInFinancingActivitiesContinuingOperations'],
  dividends: ['PaymentsOfDividends', 'PaymentsOfDividendsCommonStock'],
  buybacks: ['PaymentsForRepurchaseOfCommonStock'],
  sbc: ['ShareBasedCompensation', 'AllocatedShareBasedCompensationExpense'],
  acquisitions: ['PaymentsToAcquireBusinessesNetOfCashAcquired'],
  purchasesOfInvestments: ['PaymentsToAcquireInvestments', 'PaymentsToAcquireAvailableForSaleSecuritiesDebt'],
  salesOfInvestments: ['ProceedsFromSaleMaturityAndCollectionsOfInvestments', 'ProceedsFromMaturitiesPrepaymentsAndCallsOfAvailableForSaleSecurities'],
  debtRepayment: ['RepaymentsOfLongTermDebt', 'RepaymentsOfDebt'],
  stockIssued: ['ProceedsFromIssuanceOfCommonStock'],
  netChangeInCash: [
    'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect',
    'CashAndCashEquivalentsPeriodIncreaseDecrease',
  ],
  fxEffect: ['EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'EffectOfExchangeRateOnCashAndCashEquivalents'],
  cashEnd: ['CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'CashAndCashEquivalentsAtCarryingValue'],
};

// ==================== 期间与标签 ====================

interface Period {
  end: string;
  fiscalYear: string;
  period: string;
}

function fiscalLabelForQuarter(end: string, annuals: Array<{ start: string; end: string }>): Period {
  const containing = annuals.find((a) => a.start < end && end <= a.end);
  if (containing) {
    const quarter = Math.min(4, Math.max(1, Math.round(daysBetween(containing.start, end) / 91.3)));
    return { end, fiscalYear: containing.end.slice(0, 4), period: `Q${quarter}` };
  }
  // 当前财年尚未出年报：以上一个财年末推算
  const previous = annuals.find((a) => a.end < end);
  if (previous) {
    const quarter = Math.min(4, Math.max(1, Math.round(daysBetween(previous.end, end) / 91.3)));
    const fy = String(Number(previous.end.slice(0, 4)) + 1);
    return { end, fiscalYear: fy, period: `Q${quarter}` };
  }
  const month = Number(end.slice(5, 7));
  return { end, fiscalYear: end.slice(0, 4), period: `Q${Math.ceil(month / 3)}` };
}

const n = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const div = (a: number, b: number) => (b ? a / b : 0);

// ==================== 构建 ====================

export interface SecStatements {
  currency: string;
  incomeAnnual: IncomeStatement[];
  balanceAnnual: BalanceSheet[];
  cashAnnual: CashFlowStatement[];
  incomeQuarter: IncomeStatement[];
  balanceQuarter: BalanceSheet[];
  cashQuarter: CashFlowStatement[];
  longHistory: LongHistoryPoint[];
  /** dei:EntityCommonStockSharesOutstanding 最新值 */
  sharesOutstanding: number | null;
}

export function buildSecStatements(companyFacts: any, symbol: string, annualLimit = 6, quarterLimit = 8): SecStatements | null {
  const gaap: Gaap | undefined = companyFacts?.facts?.['us-gaap'];
  if (!gaap) return null;
  const currency = detectCurrency(gaap);
  const r = new FactReader(gaap, currency);
  const perShare = `${currency}/shares`;

  const annuals = r.annualPeriods([...T.netIncome, ...T.revenue]);
  if (annuals.length === 0) return null;

  const annualPeriods: Period[] = annuals.slice(0, annualLimit).map((a) => ({ end: a.end, fiscalYear: a.end.slice(0, 4), period: 'FY' }));
  const quarterEnds = r
    .ends(T.netIncome, 'quarter')
    .sort((a, b) => b.localeCompare(a))
    .slice(0, quarterLimit);
  const quarterPeriods = quarterEnds.map((end) => fiscalLabelForQuarter(end, annuals));

  // 公司从不披露营业成本（银行、部分服务业）时毛利 = 营收；否则缺失期按 0（未知）处理，避免显示 100% 毛利率
  const reportsCost = r.ends([...T.costOfRevenue, ...T.grossProfit], 'annual').length > 0;
  /** 季度所属（或之前最近）的财年年末，用于借用年度股数 */
  const annualEndFor = (end: string) =>
    (annuals.find((a) => a.start < end && end <= a.end) ?? annuals.find((a) => a.end < end))?.end;
  const negative = (value: number) => 0 - Math.abs(value);

  const base = (p: Period) => ({
    date: p.end,
    symbol,
    reportedCurrency: currency,
    calendarYear: p.end.slice(0, 4),
    fiscalYear: p.fiscalYear,
    period: p.period,
  });

  const income = (p: Period, kind: 'annual' | 'quarter'): IncomeStatement => {
    const v = (tags: string[], unit?: string) => r.value(tags, p.end, kind, unit);
    const revenue = n(v(T.revenue));
    const costRaw = v(T.costOfRevenue);
    const grossProfit = v(T.grossProfit) ?? (costRaw !== null ? revenue - costRaw : reportsCost ? 0 : revenue);
    const cost = costRaw ?? (reportsCost ? 0 : revenue - grossProfit);
    const operatingIncome = n(v(T.operatingIncome));
    const rnd = n(v(T.rnd));
    const ga = n(v(T.ga));
    const sm = n(v(T.sm));
    const sga = v(T.sga) ?? ga + sm;
    const operatingExpenses = v(T.operatingExpenses) ?? grossProfit - operatingIncome;
    const pretax = n(v(T.pretax));
    const tax = n(v(T.tax));
    const netIncome = n(v(T.netIncome));
    const dna = n(v(T.dna));
    const interestExpense = Math.abs(n(v(T.interestExpense)));
    const sharesKind = kind === 'annual' ? 'annual' : 'quarterDirect';
    const annualEnd = kind === 'quarter' ? annualEndFor(p.end) : undefined;
    const shares =
      r.value(T.shares, p.end, sharesKind, 'shares') ??
      (annualEnd ? r.value(T.shares, annualEnd, 'annual', 'shares') : null);
    const sharesDiluted =
      r.value(T.sharesDiluted, p.end, sharesKind, 'shares') ??
      (annualEnd ? r.value(T.sharesDiluted, annualEnd, 'annual', 'shares') : null) ??
      shares;
    // 季度 EPS 只取直接披露值；Q4 等推导期用净利润 / 股数
    const epsKind = kind === 'annual' ? 'annual' : 'quarterDirect';
    const eps = r.value(T.eps, p.end, epsKind, perShare) ?? (shares ? netIncome / shares : 0);
    const epsDiluted = r.value(T.epsDiluted, p.end, epsKind, perShare) ?? (sharesDiluted ? netIncome / sharesDiluted : eps);
    const ebitda = operatingIncome + dna;

    return {
      ...base(p),
      revenue,
      costOfRevenue: cost,
      grossProfit,
      grossProfitRatio: div(grossProfit, revenue),
      researchAndDevelopmentExpenses: rnd,
      generalAndAdministrativeExpenses: ga,
      sellingAndMarketingExpenses: sm,
      sellingGeneralAndAdministrativeExpenses: sga,
      otherExpenses: 0,
      operatingExpenses,
      costAndExpenses: v(T.costsAndExpenses) ?? cost + operatingExpenses,
      interestIncome: n(v(T.interestIncome)),
      interestExpense,
      depreciationAndAmortization: dna,
      ebitda,
      ebitdaratio: div(ebitda, revenue),
      operatingIncome,
      operatingIncomeRatio: div(operatingIncome, revenue),
      totalOtherIncomeExpensesNet: pretax - operatingIncome,
      incomeBeforeTax: pretax,
      incomeBeforeTaxRatio: div(pretax, revenue),
      incomeTaxExpense: tax,
      netIncome,
      netIncomeRatio: div(netIncome, revenue),
      eps,
      epsdiluted: epsDiluted,
      epsDiluted,
      weightedAverageShsOut: n(shares),
      weightedAverageShsOutDil: n(sharesDiluted),
    } as IncomeStatement;
  };

  const balance = (p: Period): BalanceSheet => {
    const v = (tags: string[]) => r.value(tags, p.end, 'instant');
    const cash = n(v(T.cash));
    const sti = n(v(T.sti));
    const totalAssets = n(v(T.assets));
    const currentAssets = n(v(T.currentAssets));
    const equity = n(v(T.equity));
    const totalEquity = n(v(T.totalEquity));
    const liabilitiesAndEquity = v(T.liabilitiesAndEquity) ?? totalAssets;
    const totalLiabilities = v(T.liabilities) ?? liabilitiesAndEquity - totalEquity;
    const currentLiabilities = n(v(T.currentLiabilities));
    const shortTermDebt = v(['DebtCurrent']) ?? n(v(['LongTermDebtCurrent'])) + n(v(T.commercialPaper));
    const longTermDebt = n(v(T.debtNoncurrent));
    const lease = n(v(T.leaseNoncurrent));
    const goodwill = n(v(T.goodwill));
    const intangibles = n(v(T.intangibles));
    const lti = n(v(T.lti));
    const totalDebt = shortTermDebt + longTermDebt;
    return {
      ...base(p),
      cashAndCashEquivalents: cash,
      shortTermInvestments: sti,
      cashAndShortTermInvestments: cash + sti,
      netReceivables: n(v(T.receivables)),
      inventory: n(v(T.inventory)),
      otherCurrentAssets: 0,
      totalCurrentAssets: currentAssets,
      propertyPlantEquipmentNet: n(v(T.ppe)),
      goodwill,
      intangibleAssets: intangibles,
      goodwillAndIntangibleAssets: goodwill + intangibles,
      longTermInvestments: lti,
      taxAssets: 0,
      otherNonCurrentAssets: 0,
      totalNonCurrentAssets: currentAssets ? totalAssets - currentAssets : 0,
      otherAssets: 0,
      totalAssets,
      accountPayables: n(v(T.payables)),
      shortTermDebt,
      taxPayables: 0,
      deferredRevenue: n(v(T.deferredRevenue)),
      otherCurrentLiabilities: 0,
      totalCurrentLiabilities: currentLiabilities,
      longTermDebt,
      deferredRevenueNonCurrent: 0,
      deferredTaxLiabilitiesNonCurrent: 0,
      otherNonCurrentLiabilities: 0,
      totalNonCurrentLiabilities: currentLiabilities ? totalLiabilities - currentLiabilities : 0,
      otherLiabilities: 0,
      capitalLeaseObligations: lease,
      totalLiabilities,
      preferredStock: 0,
      commonStock: n(v(T.commonStock)),
      retainedEarnings: n(v(T.retained)),
      accumulatedOtherComprehensiveIncomeLoss: n(v(T.aoci)),
      othertotalStockholdersEquity: 0,
      totalStockholdersEquity: equity,
      totalEquity: totalEquity || equity,
      totalLiabilitiesAndStockholdersEquity: liabilitiesAndEquity,
      minorityInterest: n(v(T.minority)),
      totalLiabilitiesAndTotalEquity: liabilitiesAndEquity,
      totalInvestments: sti + lti,
      totalDebt,
      netDebt: totalDebt - cash,
    };
  };

  const cashFlow = (p: Period, kind: 'annual' | 'quarter'): CashFlowStatement => {
    const v = (tags: string[]) => r.value(tags, p.end, kind);
    const ocf = n(v(T.ocf));
    const capex = negative(n(v(T.capex)));
    return {
      ...base(p),
      netIncome: n(v(T.netIncome)),
      depreciationAndAmortization: n(v(T.dna)),
      deferredIncomeTax: 0,
      stockBasedCompensation: n(v(T.sbc)),
      changeInWorkingCapital: 0,
      accountsReceivables: 0,
      inventory: 0,
      accountsPayables: 0,
      otherWorkingCapital: 0,
      otherNonCashItems: 0,
      netCashProvidedByOperatingActivities: ocf,
      investmentsInPropertyPlantAndEquipment: capex,
      acquisitionsNet: negative(n(v(T.acquisitions))),
      purchasesOfInvestments: negative(n(v(T.purchasesOfInvestments))),
      salesMaturitiesOfInvestments: n(v(T.salesOfInvestments)),
      otherInvestingActivites: 0,
      netCashUsedForInvestingActivites: n(v(T.investing)),
      debtRepayment: negative(n(v(T.debtRepayment))),
      commonStockIssued: n(v(T.stockIssued)),
      commonStockRepurchased: negative(n(v(T.buybacks))),
      dividendsPaid: negative(n(v(T.dividends))),
      otherFinancingActivites: 0,
      netCashUsedProvidedByFinancingActivities: n(v(T.financing)),
      effectOfForexChangesOnCash: n(v(T.fxEffect)),
      netChangeInCash: n(v(T.netChangeInCash)),
      cashAtEndOfPeriod: n(r.value(T.cashEnd, p.end, 'instant')),
      cashAtBeginningOfPeriod: 0,
      operatingCashFlow: ocf,
      capitalExpenditure: capex,
      freeCashFlow: ocf + capex,
    };
  };

  const incomeAnnual = annualPeriods.map((p) => income(p, 'annual'));
  const balanceAnnual = annualPeriods.map((p) => balance(p)).filter((b) => b.totalAssets);
  const cashAnnual = annualPeriods.map((p) => cashFlow(p, 'annual')).filter((c) => c.operatingCashFlow);
  const incomeQuarter = quarterPeriods.map((p) => income(p, 'quarter'));
  const balanceQuarter = quarterPeriods.map((p) => balance(p)).filter((b) => b.totalAssets);
  const cashQuarter = quarterPeriods.map((p) => cashFlow(p, 'quarter')).filter((c) => c.operatingCashFlow);

  // 长周期（旧→新），用于 5 / 10 年 CAGR
  const longHistory: LongHistoryPoint[] = [];
  for (const a of [...annuals].reverse()) {
    const dilutedShares = r.value(T.sharesDiluted, a.end, 'annual', 'shares');
    const revenue = r.value(T.revenue, a.end, 'annual');
    if (dilutedShares === null || revenue === null) continue;
    const last = longHistory[longHistory.length - 1];
    if (last && daysBetween(last.fiscalYearEnd, a.end) < 300) continue;
    longHistory.push({
      fiscalYearEnd: a.end,
      revenue,
      netIncome: r.value(T.netIncome, a.end, 'annual') ?? undefined,
      dilutedShares,
      operatingCashFlow: r.value(T.ocf, a.end, 'annual') ?? undefined,
      equity: r.value(T.equity, a.end, 'instant') ?? undefined,
    });
  }

  const dei = companyFacts?.facts?.dei ?? {};
  const shareEntries: FactEntry[] = dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? [];
  const latestShares = shareEntries
    .filter((e) => typeof e?.val === 'number')
    .sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''))[0]?.val ?? null;

  return {
    currency,
    incomeAnnual,
    balanceAnnual,
    cashAnnual,
    incomeQuarter,
    balanceQuarter,
    cashQuarter,
    longHistory,
    sharesOutstanding: latestShares,
  };
}
