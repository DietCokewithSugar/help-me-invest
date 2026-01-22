import { FMPClient } from '@/lib/fmp';
import type { ReportData } from '@/types';
import {
  MarketType,
  detectMarketFromSymbol,
  formatSymbolForMarket,
  getMarketConfig,
  isFeatureSupported
} from '@/lib/markets';

export interface FetchOptions {
  symbol: string;
  market?: MarketType;
  period?: 'annual' | 'quarter';
}

export async function fetchFmpReportData(
  fmp: FMPClient,
  symbolOrOptions: string | FetchOptions
): Promise<ReportData> {
  // 支持旧的调用方式（仅传入 symbol 字符串）和新的调用方式（传入 options 对象）
  const options: FetchOptions = typeof symbolOrOptions === 'string'
    ? { symbol: symbolOrOptions, period: 'annual' }
    : { period: 'annual', ...symbolOrOptions };

  const period = options.period || 'annual';

  // 检测或使用指定的市场
  const detectedMarket = detectMarketFromSymbol(options.symbol);
  const market = options.market || detectedMarket;

  // 格式化股票代码
  const formattedSymbol = formatSymbolForMarket(options.symbol, market);
  const upperSymbol = formattedSymbol.toUpperCase();

  const config = getMarketConfig(market);
  const features = config.supportedFeatures;

  // 根据市场支持的功能，决定调用哪些 API
  // 所有市场都支持的基础数据
  const basePromises = [
    fmp.getProfile(upperSymbol),
    features.quote ? fmp.getQuote(upperSymbol).catch(() => []) : Promise.resolve([]),
    features.peers ? fmp.getPeers(upperSymbol) : Promise.resolve([]),
    features.news ? fmp.getNews(upperSymbol, 15) : Promise.resolve([]),
  ];

  // 财务报表数据 (年度)
  const financialPromises = [
    features.incomeStatement ? fmp.getIncomeStatement(upperSymbol, 'annual', 5) : Promise.resolve([]),
    features.balanceSheet ? fmp.getBalanceSheet(upperSymbol, 'annual', 5) : Promise.resolve([]),
    features.cashFlow ? fmp.getCashFlowStatement(upperSymbol, 'annual', 5) : Promise.resolve([]),
  ];

  // 财务报表数据 (季度)
  const financialQuarterPromises = [
    features.incomeStatement ? fmp.getIncomeStatement(upperSymbol, 'quarter', 5) : Promise.resolve([]),
    features.balanceSheet ? fmp.getBalanceSheet(upperSymbol, 'quarter', 5) : Promise.resolve([]),
    features.cashFlow ? fmp.getCashFlowStatement(upperSymbol, 'quarter', 5) : Promise.resolve([]),
  ];

  // 关键指标
  const metricsPromises = [
    features.keyMetrics ? fmp.getKeyMetrics(upperSymbol, period, 5) : Promise.resolve([]),
    features.financialRatios ? fmp.getFinancialRatios(upperSymbol, period, 5) : Promise.resolve([]),
    features.financialRatios ? fmp.getFinancialRatiosTTM(upperSymbol).catch(() => []) : Promise.resolve([]),
    features.financialGrowth ? fmp.getFinancialGrowth(upperSymbol, period, 5) : Promise.resolve([]),
  ];

  // 估值数据
  const valuationPromises = [
    features.dcf ? fmp.getDCF(upperSymbol).catch(() => []) : Promise.resolve([]),
    features.enterpriseValue ? fmp.getEnterpriseValue(upperSymbol, period, 5).catch(() => []) : Promise.resolve([]),
  ];

  // 事件日历
  const eventPromises = [
    features.earningsCalendar ? fmp.getHistoricalEarnings(upperSymbol, 10).catch(() => []) : Promise.resolve([]),
    features.dividendHistory ? fmp.getHistoricalDividends(upperSymbol).catch(() => []) : Promise.resolve([]),
    features.stockSplits ? fmp.getStockSplits(upperSymbol).catch(() => []) : Promise.resolve([]),
  ];

  // 机构持仓（仅美股）
  const holdingsPromises = [
    features.institutionalHolders ? fmp.getInstitutionalHolders(upperSymbol).catch(() => []) : Promise.resolve([]),
    features.insiderTrading ? fmp.getInsiderTrading(upperSymbol, 30).catch(() => []) : Promise.resolve([]),
    features.mutualFundHolders ? fmp.getMutualFundHolders(upperSymbol).catch(() => []) : Promise.resolve([]),
    features.etfHolders ? fmp.getEtfHolders(upperSymbol).catch(() => []) : Promise.resolve([]),
  ];

  // 历史价格
  const pricePromises = [
    features.historicalPrices ? fmp.getHistoricalPrice(upperSymbol).catch(() => []) : Promise.resolve([]),
  ];

  const [
    profileData,
    quoteData,
    peersData,
    newsData,
    incomeData,
    balanceSheetData,
    cashFlowData,
    incomeQuarterData,
    balanceSheetQuarterData,
    cashFlowQuarterData,
    keyMetricsData,
    financialRatiosData,
    financialRatiosTTMData,
    financialGrowthData,
    dcfData,
    enterpriseValueData,
    earningsCalendarData,
    dividendHistoryData,
    stockSplitsData,
    institutionalHoldersData,
    insiderTradingData,
    mutualFundHoldersData,
    etfHoldersData,
    historicalPriceData,
  ] = await Promise.all([
    ...basePromises,
    ...financialPromises,
    ...financialQuarterPromises,
    ...metricsPromises,
    ...valuationPromises,
    ...eventPromises,
    ...holdingsPromises,
    ...pricePromises,
  ]);

  if (!profileData || profileData.length === 0) {
    // 对于非美股，给出更详细的错误提示
    if (market !== 'US') {
      throw new Error(`未找到该公司信息。${config.nameCn}市场请使用格式：${config.symbolExample}`);
    }
    throw new Error('未找到该公司信息，请检查股票代码是否正确');
  }

  const profile = profileData[0];
  // 添加市场信息到 profile
  (profile as any).market = market;
  (profile as any).marketName = config.nameCn;

  const peers = peersData || [];
  const quote = Array.isArray(quoteData) && quoteData.length > 0 ? quoteData[0] : null;

  // 财报电话会议（仅美股支持）
  let earningsTranscripts: any[] = [];
  if (features.earningsTranscript) {
    try {
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      const targetQuarter = currentQuarter - 1 || 4;
      const targetYear = targetQuarter === 4 ? currentYear - 1 : currentYear;
      earningsTranscripts = await fmp.getEarningsTranscript(
        upperSymbol,
        targetYear,
        targetQuarter
      );
    } catch (e) {
      earningsTranscripts = [];
    }
  }

  const historicalResponse = historicalPriceData as any;
  const historicalPrices = Array.isArray(historicalResponse)
    ? historicalResponse
    : historicalResponse?.historical || [];

  return {
    profile,
    quote,
    // 三大财务报表
    incomeStatements: incomeData || [],
    balanceSheets: balanceSheetData || [],
    cashFlowStatements: cashFlowData || [],
    // 季度报表数据
    incomeStatementsQuarter: incomeQuarterData || [],
    balanceSheetsQuarter: balanceSheetQuarterData || [],
    cashFlowStatementsQuarter: cashFlowQuarterData || [],
    // 关键指标
    keyMetrics: keyMetricsData || [],
    financialRatios: financialRatiosData || [],
    financialRatiosTTM: financialRatiosTTMData || [],
    financialGrowth: financialGrowthData || [],
    // 估值
    dcfValuation: dcfData && dcfData.length > 0 ? dcfData[0] : null,
    enterpriseValues: enterpriseValueData || [],
    // 事件日历
    earningsCalendar: earningsCalendarData || [],
    dividendHistory: dividendHistoryData || [],
    stockSplits: stockSplitsData || [],
    // 机构与内幕
    institutionalHolders: institutionalHoldersData || [],
    insiderTrading: insiderTradingData || [],
    mutualFundHolders: mutualFundHoldersData || [],
    etfHolders: etfHoldersData || [],
    // 行情与技术指标
    historicalPrices,
    // 其他
    peers,
    news: newsData || [],
    earningsTranscripts: earningsTranscripts || [],
    sankeyData: buildSankeyData(incomeData?.[0]),
    // 添加市场信息
    market,
    // 添加周期信息
    period,
  };
}

function buildSankeyData(income: any) {
  if (!income) return { nodes: [], links: [] };

  const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);
  const revenueRaw = safeNumber(income.revenue);
  const otherRevenueRaw = safeNumber(
    income.otherRevenue ?? income.otherIncome ?? income.otherOperatingIncome
  );
  const costRaw = safeNumber(income.costOfRevenue);
  const revenue = Math.max(0, revenueRaw);
  const otherRevenue = Math.max(0, Math.min(otherRevenueRaw, revenue));
  const mainRevenue = Math.max(0, revenue - otherRevenue);
  const costOfRevenue = Math.max(0, Math.min(costRaw, revenue));
  const grossProfit = Math.max(0, revenue - costOfRevenue);
  const rdRaw = Math.max(0, safeNumber(income.researchAndDevelopmentExpenses));
  const sgaRaw = Math.max(0, safeNumber(income.sellingGeneralAndAdministrativeExpenses));
  let rdExpenses = rdRaw;
  let sgaExpenses = sgaRaw;

  const totalOperatingCosts = rdExpenses + sgaExpenses;
  if (totalOperatingCosts > grossProfit && totalOperatingCosts > 0) {
    const scale = grossProfit / totalOperatingCosts;
    rdExpenses *= scale;
    sgaExpenses *= scale;
  }

  const operatingIncome = Math.max(0, grossProfit - rdExpenses - sgaExpenses);
  let netIncome = Math.max(0, safeNumber(income.netIncome));
  if (netIncome > operatingIncome) {
    netIncome = operatingIncome;
  }
  const taxAndOther = Math.max(0, operatingIncome - netIncome);

  const nodes = [
    { name: '主营业务收入' },
    ...(otherRevenue > 0 ? [{ name: '其他收入' }] : []),
    { name: '总营收' },
    { name: '营业成本' },
    { name: '毛利润' },
    { name: '研发费用' },
    { name: '销售及管理费用' },
    { name: '营业利润' },
    { name: '税费及其他' },
    { name: '净利润' },
  ];

  const links = [
    { source: '主营业务收入', target: '总营收', value: mainRevenue },
    ...(otherRevenue > 0 ? [{ source: '其他收入', target: '总营收', value: otherRevenue }] : []),
    { source: '总营收', target: '营业成本', value: costOfRevenue },
    { source: '总营收', target: '毛利润', value: grossProfit },
    { source: '毛利润', target: '研发费用', value: rdExpenses },
    { source: '毛利润', target: '销售及管理费用', value: sgaExpenses },
    { source: '毛利润', target: '营业利润', value: operatingIncome },
    { source: '营业利润', target: '税费及其他', value: taxAndOther },
    { source: '营业利润', target: '净利润', value: netIncome },
  ].filter((link) => link.value > 0);

  return { nodes, links };
}
