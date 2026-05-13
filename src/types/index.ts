export interface CompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  description: string;
  ceo: string;
  website: string;
  country: string;
  fullTimeEmployees: string;
  image: string;
  ipoDate: string;
  marketCap: number;
  price: number;
  change: number;
  changePercentage: number;
  exchange: string;
  exchangeFullName: string;
  mktCap?: number;
  changes?: number;
  changesPercentage?: string;
  exchangeShortName?: string;
}

// ==================== 三大财务报表 ====================

export interface IncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  calendarYear: string;
  fiscalYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export interface BalanceSheet {
  date: string;
  symbol: string;
  reportedCurrency: string;
  calendarYear: string;
  fiscalYear: string;
  period: string;
  // 资产
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  netReceivables: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  goodwillAndIntangibleAssets: number;
  longTermInvestments: number;
  taxAssets: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  otherAssets: number;
  totalAssets: number;
  // 负债
  accountPayables: number;
  shortTermDebt: number;
  taxPayables: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  deferredRevenueNonCurrent: number;
  deferredTaxLiabilitiesNonCurrent: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  otherLiabilities: number;
  capitalLeaseObligations: number;
  totalLiabilities: number;
  // 股东权益
  preferredStock: number;
  commonStock: number;
  retainedEarnings: number;
  accumulatedOtherComprehensiveIncomeLoss: number;
  othertotalStockholdersEquity: number;
  totalStockholdersEquity: number;
  totalEquity: number;
  totalLiabilitiesAndStockholdersEquity: number;
  minorityInterest: number;
  totalLiabilitiesAndTotalEquity: number;
  totalInvestments: number;
  totalDebt: number;
  netDebt: number;
}

export interface CashFlowStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  calendarYear: string;
  fiscalYear: string;
  period: string;
  // 经营活动现金流
  netIncome: number;
  depreciationAndAmortization: number;
  deferredIncomeTax: number;
  stockBasedCompensation: number;
  changeInWorkingCapital: number;
  accountsReceivables: number;
  inventory: number;
  accountsPayables: number;
  otherWorkingCapital: number;
  otherNonCashItems: number;
  netCashProvidedByOperatingActivities: number;
  // 投资活动现金流
  investmentsInPropertyPlantAndEquipment: number;
  acquisitionsNet: number;
  purchasesOfInvestments: number;
  salesMaturitiesOfInvestments: number;
  otherInvestingActivites: number;
  netCashUsedForInvestingActivites: number;
  // 融资活动现金流
  debtRepayment: number;
  commonStockIssued: number;
  commonStockRepurchased: number;
  dividendsPaid: number;
  otherFinancingActivites: number;
  netCashUsedProvidedByFinancingActivities: number;
  // 汇总
  effectOfForexChangesOnCash: number;
  netChangeInCash: number;
  cashAtEndOfPeriod: number;
  cashAtBeginningOfPeriod: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
}

// ==================== 关键财务指标 ====================

export interface KeyMetrics {
  date: string;
  symbol: string;
  calendarYear: string;
  fiscalYear: string;
  period: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  bookValuePerShare: number;
  tangibleBookValuePerShare: number;
  shareholdersEquityPerShare: number;
  interestDebtPerShare: number;
  marketCap: number;
  enterpriseValue: number;
  peRatio: number;
  priceToSalesRatio: number;
  pocfratio: number;
  pfcfRatio: number;
  pbRatio: number;
  ptbRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  evToOperatingCashFlow: number;
  evToFreeCashFlow: number;
  earningsYield: number;
  freeCashFlowYield: number;
  debtToEquity: number;
  debtToAssets: number;
  netDebtToEBITDA: number;
  currentRatio: number;
  interestCoverage: number;
  incomeQuality: number;
  dividendYield: number;
  payoutRatio: number;
  salesGeneralAndAdministrativeToRevenue: number;
  researchAndDdevelopementToRevenue: number;
  intangiblesToTotalAssets: number;
  capexToOperatingCashFlow: number;
  capexToRevenue: number;
  capexToDepreciation: number;
  stockBasedCompensationToRevenue: number;
  grahamNumber: number;
  roic: number;
  returnOnTangibleAssets: number;
  grahamNetNet: number;
  workingCapital: number;
  tangibleAssetValue: number;
  netCurrentAssetValue: number;
  investedCapital: number;
  averageReceivables: number;
  averagePayables: number;
  averageInventory: number;
  daysSalesOutstanding: number;
  daysPayablesOutstanding: number;
  daysOfInventoryOnHand: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  roe: number;
  capexPerShare: number;
}

export interface FinancialRatios {
  date: string;
  symbol: string;
  calendarYear: string;
  fiscalYear: string;
  period: string;
  // 盈利能力
  grossProfitMargin: number;
  operatingProfitMargin: number;
  pretaxProfitMargin: number;
  netProfitMargin: number;
  effectiveTaxRate: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  netIncomePerEBT: number;
  ebtPerEbit: number;
  ebitPerRevenue: number;
  // 流动性
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysOfSalesOutstanding: number;
  daysOfInventoryOutstanding: number;
  operatingCycle: number;
  daysOfPayablesOutstanding: number;
  cashConversionCycle: number;
  // 杠杆比率
  debtRatio: number;
  debtEquityRatio: number;
  longTermDebtToCapitalization: number;
  totalDebtToCapitalization: number;
  interestCoverage: number;
  cashFlowToDebtRatio: number;
  companyEquityMultiplier: number;
  // 估值
  priceBookValueRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsRatio: number;
  priceToFreeCashFlowsRatio: number;
  priceToOperatingCashFlowsRatio: number;
  priceCashFlowRatio: number;
  priceEarningsToGrowthRatio: number;
  priceSalesRatio: number;
  dividendYield: number;
  enterpriseValueMultiple: number;
  priceFairValue: number;
}

export interface FinancialGrowth {
  date: string;
  symbol: string;
  calendarYear: string;
  fiscalYear: string;
  period: string;
  revenueGrowth: number;
  grossProfitGrowth: number;
  ebitgrowth: number;
  operatingIncomeGrowth: number;
  netIncomeGrowth: number;
  epsgrowth: number;
  epsdilutedGrowth: number;
  weightedAverageSharesGrowth: number;
  weightedAverageSharesDilutedGrowth: number;
  dividendsperShareGrowth: number;
  operatingCashFlowGrowth: number;
  freeCashFlowGrowth: number;
  tenYRevenueGrowthPerShare: number;
  fiveYRevenueGrowthPerShare: number;
  threeYRevenueGrowthPerShare: number;
  tenYOperatingCFGrowthPerShare: number;
  fiveYOperatingCFGrowthPerShare: number;
  threeYOperatingCFGrowthPerShare: number;
  tenYNetIncomeGrowthPerShare: number;
  fiveYNetIncomeGrowthPerShare: number;
  threeYNetIncomeGrowthPerShare: number;
  tenYShareholdersEquityGrowthPerShare: number;
  fiveYShareholdersEquityGrowthPerShare: number;
  threeYShareholdersEquityGrowthPerShare: number;
  tenYDividendperShareGrowthPerShare: number;
  fiveYDividendperShareGrowthPerShare: number;
  threeYDividendperShareGrowthPerShare: number;
  receivablesGrowth: number;
  inventoryGrowth: number;
  assetGrowth: number;
  bookValueperShareGrowth: number;
  debtGrowth: number;
  rdexpenseGrowth: number;
  sgaexpensesGrowth: number;
}

// ==================== 财务健康评分 ====================

export interface FinancialScores {
  symbol: string;
  // 两大核心评分
  altmanZScore: number;      // 奥特曼 Z-Score (破产预测模型)
  piotroskiScore: number;    // 皮奥特罗斯基 F-Score (财务改善模型)
  // 计算因子
  workingCapital: number;    // 营运资金
  totalAssets: number;       // 总资产
  retainedEarnings: number;  // 留存收益
  ebit: number;              // 息税前利润
  marketCap: number;         // 市值
  totalLiabilities: number;  // 总负债
  revenue: number;           // 营收
}

// ==================== 估值与分析 ====================

export interface DCFValuation {
  symbol: string;
  date: string;
  dcf: number;
  price: number;
}

export interface EnterpriseValue {
  symbol: string;
  date: string;
  stockPrice: number;
  numberOfShares: number;
  marketCapitalization: number;
  minusCashAndCashEquivalents: number;
  addTotalDebt: number;
  enterpriseValue: number;
}

// ==================== 市场事件与日历 ====================

export interface EarningsCalendar {
  symbol: string;
  date: string;
  time: string;
  epsEstimated: number;
  epsActual: number;
  revenueEstimated: number;
  revenueActual: number;
  fiscalDateEnding: string;
  updatedFromDate: string;
}

export interface DividendCalendar {
  symbol: string;
  date: string;
  label: string;
  adjDividend: number;
  dividend: number;
  recordDate: string;
  paymentDate: string;
  declarationDate: string;
}

export interface StockSplit {
  symbol: string;
  date: string;
  label: string;
  numerator: number;
  denominator: number;
}

// ==================== 机构持仓与内幕交易 ====================

export interface InstitutionalHolder {
  holder: string;
  shares: number;
  dateReported: string;
  change: number;
  changePercentage: number;
  value: number;
}

export interface InsiderTrading {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingCik: string;
  transactionType: string;
  securitiesOwned: number;
  companyCik: string;
  reportingName: string;
  typeOfOwner: string;
  acquistionOrDisposition: string;
  formType: string;
  securitiesTransacted: number;
  price: number;
  securityName: string;
  link: string;
}

export interface InsiderRoster {
  owner: string;
  transactionDate: string;
  typeOfOwner: string;
  position: string;
  securitiesOwned: number;
  securitiesTransacted: number;
}

// ==================== 新闻与分析师评级 ====================

export interface StockNews {
  symbol: string;
  publishedDate: string;
  title: string;
  text: string;
  url: string;
  site: string;
  image?: string;
}

export interface AnalystRating {
  symbol: string;
  date: string;
  analystRatingsbuy: number;
  analystRatingsHold: number;
  analystRatingsSell: number;
  analystRatingsStrongSell: number;
  analystRatingsStrongBuy: number;
}

export interface PriceTarget {
  symbol: string;
  publishedDate: string;
  newsURL: string;
  newsTitle: string;
  analystName: string;
  priceTarget: number;
  adjPriceTarget: number;
  priceWhenPosted: number;
  newsPublisher: string;
  analystCompany: string;
}

// ==================== AI 分析结构 ====================

export interface AIAnalysis {
  companyOverview: string;
  industryAnalysis: string;
  industryPainPoints: string;
  competitors: string;
  competitiveAdvantage: string;
  moat: string;
  recentDevelopments: string;
  investmentConclusion: string;
}

// 专业版 AI 分析结构（拆分为7个独立模块）
export interface ProAIAnalysis {
  proBusinessModel: string;        // 生意模式分析
  proOperatingModel: string;       // 运营模式分析
  proIndustryOutlook: string;      // 行业前景评估
  proMoatAnalysis: string;         // 竞争地位与护城河
  proFinancialHealth: string;      // 财务健康与经营质量
  proValuation: string;            // 估值与买入时机
  proInvestmentConclusion: string; // 综合投资建议
}

// 小白版 AI 分析结构
export interface BeginnerAIAnalysis {
  beginnerVerdict: string;          // 投资结论（先说结论）
  beginnerCompanyIntro: string;     // 通俗公司介绍
  beginnerRiskReward: string;       // 好处与风险
  beginnerActionPlan: string;       // 行动建议
}

export interface SankeyData {
  nodes: { name: string }[];
  links: { source: string; target: string; value: number }[];
}

// ==================== 完整报告数据结构 ====================

// 市场类型
export type MarketType = 'US' | 'CN' | 'HK' | 'JP' | 'KR';

export interface ReportData {
  profile: CompanyProfile;
  quote?: any;
  // 三大财务报表
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
  // 关键指标
  keyMetrics: KeyMetrics[];
  keyMetricsTTM: any[];
  financialRatios: FinancialRatios[];
  financialRatiosTTM: any[];
  financialGrowth: FinancialGrowth[];
  // 财务健康评分
  financialScores?: FinancialScores | null;
  // 估值
  dcfValuation: DCFValuation | null;
  enterpriseValues: EnterpriseValue[];
  // 事件日历
  earningsCalendar: EarningsCalendar[];
  dividendHistory: DividendCalendar[];
  stockSplits: StockSplit[];
  // 机构持仓与内幕交易
  institutionalHolders: InstitutionalHolder[];
  insiderTrading: InsiderTrading[];
  mutualFundHolders: any[];
  etfHolders: any[];
  // 行情与技术指标
  historicalPrices: any[];
  // 其他
  peers: string[];
  news: StockNews[];
  earningsTranscripts?: any[];
  aiAnalysis?: AIAnalysis;
  proAiAnalysis?: ProAIAnalysis;  // 专业版 AI 分析
  beginnerAiAnalysis?: BeginnerAIAnalysis;
  earningsCallSummary?: string;
  searchResults?: string;
  sankeyData: SankeyData;
  // 市场信息
  market?: MarketType;
  // 原始报表周期控制
  period?: 'annual' | 'quarter';

  // 季度报表数据字段
  incomeStatementsQuarter?: IncomeStatement[];
  balanceSheetsQuarter?: BalanceSheet[];
  cashFlowStatementsQuarter?: CashFlowStatement[];

  // 报告生成时间
  reportGeneratedAt?: string;
}

// ==================== 公司诊断数据 ====================

export interface CompanyDiagnostic {
  id: number;
  symbol: string;
  company_name: string | null;

  // FMP Data
  market_cap: number | null;
  sector: string | null;
  industry: string | null;
  beta: number | null;
  price: number | null;
  last_annual_dividend: number | null;
  volume: number | null;
  exchange: string | null;
  exchange_short_name: string | null;
  country: string | null;
  is_etf: boolean | null;
  is_fund: boolean | null;
  is_actively_trading: boolean | null;

  // 7 Diagnostic Dimensions
  strategic_positioning: string | null;
  market_cap_size: string | null;
  cyclical_nature: string | null;
  cash_flow_status: string | null;
  debt_structure: string | null;
  external_sensitivity: string | null;
  profit_model: string | null;

  // AI Analysis Meta
  ai_reasoning: string | null;
  sources: string[] | null;
  processed_at: string | null;
}

export interface CompanyFilterRequest {
  strategicPositioning?: string[];
  marketCapSize?: string[];
  cyclicalNature?: string[];
  cashFlowStatus?: string[];
  debtStructure?: string[];
  externalSensitivity?: string[];
  profitModel?: string[];
  sectors?: string[];
  industries?: string[];
  marketCapMin?: number;
  marketCapMax?: number;
  searchQuery?: string;
  page?: number;
  limit?: number;
}
