import { FMPClient } from '@/lib/fmp';
import type { ReportData } from '@/types';

export async function fetchFmpReportData(fmp: FMPClient, symbol: string): Promise<ReportData> {
  const upperSymbol = symbol.toUpperCase();

  const [
    profileData,
    quoteData,
    peersData,
    newsData,
    incomeData,
    balanceSheetData,
    cashFlowData,
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
    fmp.getProfile(upperSymbol),
    fmp.getQuote(upperSymbol).catch(() => []),
    fmp.getPeers(upperSymbol),
    fmp.getNews(upperSymbol, 15),
    fmp.getIncomeStatement(upperSymbol, 'annual', 5),
    fmp.getBalanceSheet(upperSymbol, 'annual', 5),
    fmp.getCashFlowStatement(upperSymbol, 'annual', 5),
    fmp.getKeyMetrics(upperSymbol, 'annual', 5),
    fmp.getFinancialRatios(upperSymbol, 'annual', 5),
    fmp.getFinancialRatiosTTM(upperSymbol).catch(() => []),
    fmp.getFinancialGrowth(upperSymbol, 'annual', 5),
    fmp.getDCF(upperSymbol).catch(() => []),
    fmp.getEnterpriseValue(upperSymbol, 'annual', 5).catch(() => []),
    fmp.getHistoricalEarnings(upperSymbol, 10).catch(() => []),
    fmp.getHistoricalDividends(upperSymbol).catch(() => []),
    fmp.getStockSplits(upperSymbol).catch(() => []),
    fmp.getInstitutionalHolders(upperSymbol).catch(() => []),
    fmp.getInsiderTrading(upperSymbol, 30).catch(() => []),
    fmp.getMutualFundHolders(upperSymbol).catch(() => []),
    fmp.getEtfHolders(upperSymbol).catch(() => []),
    fmp.getHistoricalPrice(upperSymbol).catch(() => []),
  ]);

  if (!profileData || profileData.length === 0) {
    throw new Error('未找到该公司信息，请检查股票代码是否正确');
  }

  const profile = profileData[0];
  const peers = peersData || [];
  const quote = Array.isArray(quoteData) && quoteData.length > 0 ? quoteData[0] : null;

  let earningsTranscripts: any[] = [];
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

  const historicalPrices = Array.isArray(historicalPriceData)
    ? historicalPriceData
    : historicalPriceData?.historical || [];

  return {
    profile,
    quote,
    // 三大财务报表
    incomeStatements: incomeData || [],
    balanceSheets: balanceSheetData || [],
    cashFlowStatements: cashFlowData || [],
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
  };
}

function buildSankeyData(income: any) {
  if (!income) return { nodes: [], links: [] };

  const revenue = income.revenue || 0;
  const costOfRevenue = income.costOfRevenue || 0;
  const grossProfit = income.grossProfit || 0;
  const rdExpenses = income.researchAndDevelopmentExpenses || 0;
  const sgaExpenses = income.sellingGeneralAndAdministrativeExpenses || 0;
  const operatingIncome = income.operatingIncome || 0;
  const netIncome = income.netIncome || 0;

  const nodes = [
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
    { source: '总营收', target: '营业成本', value: costOfRevenue },
    { source: '总营收', target: '毛利润', value: grossProfit },
    { source: '毛利润', target: '研发费用', value: rdExpenses },
    { source: '毛利润', target: '销售及管理费用', value: sgaExpenses },
    { source: '毛利润', target: '营业利润', value: Math.max(0, operatingIncome) },
    { source: '营业利润', target: '税费及其他', value: Math.max(0, operatingIncome - netIncome) },
    { source: '营业利润', target: '净利润', value: Math.max(0, netIncome) },
  ].filter(link => link.value > 0);

  return { nodes, links };
}
