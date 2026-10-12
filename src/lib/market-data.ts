/**
 * 报告数据编排：Yahoo Finance 为主，FMP（免费版）与 SEC EDGAR 为补充。
 *
 * - Yahoo：行情、公司概况、三大报表（年度约 4 期 / 季度约 5 期 / TTM）、分红拆股、
 *   财报 EPS、机构与基金持仓、内部人交易、分析师评级、新闻、相似公司。全部市场可用。
 * - FMP：仅在配置了 FMP_API_KEY 且为美股时，额外取 5 年年报（免费版可用）与 DCF；
 *   超额或计划不支持时自动熔断（见 fmp.ts），不影响报告生成。
 * - SEC EDGAR：美股 10 年以上年度数据，用于 5 年 / 10 年 CAGR。
 *
 * 估值 / 比率 / 增长 / 健康评分统一由 financial-metrics.ts 从报表推导，
 * 因此无论报表来自哪个源，指标口径一致。
 */

import type { CashFlowStatement, IncomeStatement, BalanceSheet, ReportData } from '@/types';
import {
  MarketType,
  detectMarketFromSymbol,
  formatSymbolForMarket,
  getMarketConfig,
} from '@/lib/markets';
import { buildSankeyData } from '@/lib/sankey-utils';
import { FMPClient } from '@/lib/fmp';
import { getLongHistory } from '@/lib/sec-edgar';
import {
  deriveAnnualMetrics,
  deriveFinancialScores,
  deriveTTM,
  sumLastFourQuarters,
  type LongHistoryPoint,
  type PricePoint,
} from '@/lib/financial-metrics';
import * as yahoo from '@/lib/yahoo/client';
import {
  BALANCE_KEYS,
  CASH_FLOW_KEYS,
  INCOME_KEYS,
  TRAILING_KEYS,
  buildAnalystConsensus,
  buildBalanceSheets,
  buildCashFlowStatements,
  buildDividends,
  buildEarnings,
  buildIncomeStatements,
  buildInsiderTrading,
  buildInstitutionalHolders,
  buildKeyStatistics,
  buildMutualFundHolders,
  buildNews,
  buildPriceHistory,
  buildProfile,
  buildQuote,
  buildSplits,
  buildTrailing,
  fiscalYearEndMonth,
  num,
} from '@/lib/yahoo/normalize';

export interface FetchOptions {
  symbol: string;
  market?: MarketType;
  period?: 'annual' | 'quarter';
}

/** Yahoo 的美股多类别股票用连字符（BRK-B），用户常输入 BRK.B */
export function toYahooSymbol(symbol: string, market: MarketType): string {
  const upper = symbol.toUpperCase().trim();
  return market === 'US' ? upper.replace(/\./g, '-') : upper;
}

async function settle<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error: any) {
    console.warn(`[market-data] ${label} failed:`, error?.message || error);
    return fallback;
  }
}

const STATEMENT_KEYS = [...INCOME_KEYS, ...BALANCE_KEYS, ...CASH_FLOW_KEYS];

/** FMP stable 字段名与站内类型的少量差异 */
function normalizeFmpIncome(rows: any[]): IncomeStatement[] {
  return rows.map((row) => ({
    ...row,
    calendarYear: row.calendarYear ?? row.fiscalYear ?? String(row.date ?? '').slice(0, 4),
    fiscalYear: row.fiscalYear ?? row.calendarYear,
    epsdiluted: row.epsdiluted ?? row.epsDiluted,
    epsDiluted: row.epsDiluted ?? row.epsdiluted,
  }));
}

function normalizeFmpRows<T>(rows: any[]): T[] {
  return rows.map((row) => ({
    ...row,
    calendarYear: row.calendarYear ?? row.fiscalYear ?? String(row.date ?? '').slice(0, 4),
    fiscalYear: row.fiscalYear ?? row.calendarYear,
  }));
}

async function fetchFmpAnnual(symbol: string) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;
  const fmp = new FMPClient(apiKey);
  const [income, balance, cashFlow, dcf] = await Promise.all([
    settle('FMP income', fmp.getIncomeStatement(symbol, 'annual', 5), [] as any[]),
    settle('FMP balance', fmp.getBalanceSheet(symbol, 'annual', 5), [] as any[]),
    settle('FMP cash flow', fmp.getCashFlowStatement(symbol, 'annual', 5), [] as any[]),
    settle('FMP DCF', fmp.getDCF(symbol), [] as any[]),
  ]);
  return {
    income: Array.isArray(income) ? normalizeFmpIncome(income) : [],
    balance: Array.isArray(balance) ? normalizeFmpRows<BalanceSheet>(balance) : [],
    cashFlow: Array.isArray(cashFlow) ? normalizeFmpRows<CashFlowStatement>(cashFlow) : [],
    dcf: Array.isArray(dcf) && dcf.length > 0 ? dcf[0] : null,
  };
}

export async function fetchReportData(options: FetchOptions): Promise<ReportData> {
  const market = options.market || detectMarketFromSymbol(options.symbol);
  const formatted = formatSymbolForMarket(options.symbol, market).toUpperCase();
  const symbol = toYahooSymbol(formatted, market);
  const config = getMarketConfig(market);
  const isUS = market === 'US';

  const [chart, summary, annualSeries, quarterlySeries, trailingSeries, newsResult, peers, fmpAnnual, longHistory] =
    await Promise.all([
      settle('chart', yahoo.getChart(symbol, '5y', '1d'), null),
      settle('quoteSummary', yahoo.getQuoteSummary(symbol), null),
      settle('timeseries annual', yahoo.getFundamentalsTimeseries(symbol, 'annual', STATEMENT_KEYS), {}),
      settle('timeseries quarterly', yahoo.getFundamentalsTimeseries(symbol, 'quarterly', STATEMENT_KEYS), {}),
      settle('timeseries trailing', yahoo.getFundamentalsTimeseries(symbol, 'trailing', TRAILING_KEYS), {}),
      settle('news', yahoo.search(symbol, { quotesCount: 0, newsCount: 15 }), { quotes: [], news: [] }),
      settle('peers', yahoo.getRecommendedSymbols(symbol), [] as string[]),
      isUS ? settle('FMP', fetchFmpAnnual(symbol), null) : Promise.resolve(null),
      isUS ? getLongHistory(symbol) : Promise.resolve([] as LongHistoryPoint[]),
    ]);

  if (!summary && !chart) {
    if (!isUS) {
      throw new Error(`未找到该公司信息。${config.nameCn}市场请使用格式：${config.symbolExample}`);
    }
    throw new Error('未找到该公司信息，请检查股票代码是否正确');
  }

  const chartMeta = chart?.meta ?? null;
  const fyEndMonth = fiscalYearEndMonth(summary);

  const profile = buildProfile(symbol, summary, chartMeta);
  (profile as any).market = market;
  (profile as any).marketName = config.nameCn;
  const quote = buildQuote(symbol, summary, chartMeta);

  // ---------- 报表 ----------
  const yahooAnnualIncome = buildIncomeStatements(annualSeries, { symbol, frequency: 'annual', fyEndMonth });
  const yahooAnnualBalance = buildBalanceSheets(annualSeries, { symbol, frequency: 'annual', fyEndMonth });
  const yahooAnnualCash = buildCashFlowStatements(annualSeries, { symbol, frequency: 'annual', fyEndMonth });
  const incomeQuarter = buildIncomeStatements(quarterlySeries, { symbol, frequency: 'quarterly', fyEndMonth });
  const balanceQuarter = buildBalanceSheets(quarterlySeries, { symbol, frequency: 'quarterly', fyEndMonth });
  const cashQuarter = buildCashFlowStatements(quarterlySeries, { symbol, frequency: 'quarterly', fyEndMonth });

  // FMP 免费版有 5 期年报；可用且不少于 Yahoo 时优先采用
  const useFmpAnnual = !!fmpAnnual && fmpAnnual.income.length >= yahooAnnualIncome.length && fmpAnnual.income.length > 0;
  const incomeStatements = useFmpAnnual ? fmpAnnual!.income : yahooAnnualIncome;
  const balanceSheets = useFmpAnnual && fmpAnnual!.balance.length > 0 ? fmpAnnual!.balance : yahooAnnualBalance;
  const cashFlowStatements = useFmpAnnual && fmpAnnual!.cashFlow.length > 0 ? fmpAnnual!.cashFlow : yahooAnnualCash;

  // ---------- 价格 / 事件 ----------
  const priceHistory = buildPriceHistory(chart);
  const pricePoints: PricePoint[] = priceHistory.map((bar) => ({ date: bar.date, close: bar.close }));

  // ---------- 推导指标 ----------
  const derived = deriveAnnualMetrics(incomeStatements, balanceSheets, cashFlowStatements, pricePoints, longHistory);

  const trailing = buildTrailing(trailingSeries, symbol);
  const ttmIncome = trailing.income ?? sumLastFourQuarters(incomeQuarter);
  const ttmCash = trailing.cashFlow ?? sumLastFourQuarters(cashQuarter);
  const latestBalance = balanceQuarter[0] ?? balanceSheets[0] ?? null;
  const yearAgoBalance = balanceQuarter[4] ?? balanceSheets[1] ?? null;
  const currentPrice = quote?.price ?? profile.price ?? null;
  const sharesOutstanding = num(summary?.defaultKeyStatistics?.sharesOutstanding);
  const marketCap = profile.marketCap || (currentPrice != null && sharesOutstanding != null ? currentPrice * sharesOutstanding : null);

  const ttm = deriveTTM({
    income: ttmIncome,
    cashFlow: ttmCash,
    balance: latestBalance,
    prevBalance: yearAgoBalance,
    price: currentPrice,
    shares: sharesOutstanding,
    marketCap,
  });

  const financialScores = deriveFinancialScores(symbol, incomeStatements, balanceSheets, cashFlowStatements, marketCap);

  const dcfValuation = fmpAnnual?.dcf
    ? { symbol, date: fmpAnnual.dcf.date, dcf: fmpAnnual.dcf.dcf, price: fmpAnnual.dcf['Stock Price'] ?? fmpAnnual.dcf.stockPrice ?? currentPrice }
    : null;

  const sources = ['Yahoo Finance'];
  if (useFmpAnnual || dcfValuation) sources.push('Financial Modeling Prep');
  if (longHistory.length > 0) sources.push('SEC EDGAR');

  return {
    profile,
    quote,
    incomeStatements,
    balanceSheets,
    cashFlowStatements,
    incomeStatementsQuarter: incomeQuarter,
    balanceSheetsQuarter: balanceQuarter,
    cashFlowStatementsQuarter: cashQuarter,
    keyMetrics: derived.keyMetrics,
    keyMetricsTTM: ttm ? [ttm] : [],
    financialRatios: derived.financialRatios,
    financialRatiosTTM: ttm ? [ttm] : [],
    financialGrowth: derived.financialGrowth,
    dcfValuation,
    enterpriseValues: derived.enterpriseValues,
    financialScores,
    earningsCalendar: buildEarnings(symbol, summary, incomeQuarter),
    dividendHistory: buildDividends(symbol, chart),
    stockSplits: buildSplits(symbol, chart),
    institutionalHolders: buildInstitutionalHolders(summary),
    insiderTrading: buildInsiderTrading(symbol, summary),
    mutualFundHolders: buildMutualFundHolders(summary),
    etfHolders: [],
    historicalPrices: priceHistory,
    peers: peers.filter((p) => p !== symbol).slice(0, 8),
    news: buildNews(symbol, newsResult.news),
    earningsTranscripts: [],
    sankeyData: buildSankeyData(incomeStatements[0]),
    analystConsensus: buildAnalystConsensus(summary),
    keyStats: buildKeyStatistics(summary),
    dataSources: sources,
    market,
    period: options.period || 'annual',
  };
}

// ==================== 轻量行情（追踪页 / 行业页） ====================

export interface QuoteWithHistory {
  symbol: string;
  quote: Record<string, any> | null;
  /** 新→旧 */
  history: Array<{ date: string; close: number }>;
}

/** 一次 chart 请求同时拿到最新价与近一个月日线（无需 crumb）。 */
export async function fetchQuoteWithHistory(symbol: string, range: yahoo.ChartRange = '1mo'): Promise<QuoteWithHistory> {
  const market = detectMarketFromSymbol(symbol);
  const yahooSymbol = toYahooSymbol(symbol, market);
  const chart = await yahoo.getChart(yahooSymbol, range, '1d');
  const history = buildPriceHistory(chart).map((bar) => ({ date: bar.date, close: bar.close }));
  const meta = chart?.meta ?? {};
  const price = num(meta.regularMarketPrice) ?? history[0]?.close ?? null;
  // chartPreviousClose 是区间起点之前的收盘价；日涨跌要用倒数第二根 K 线
  const previousClose = history[1]?.close ?? num(meta.previousClose) ?? null;
  const change = price != null && previousClose != null ? price - previousClose : null;
  const changePercentage = change != null && previousClose ? (change / previousClose) * 100 : null;

  return {
    symbol,
    quote: price == null
      ? null
      : {
          symbol,
          name: meta.longName || meta.shortName || symbol,
          price,
          change,
          changePercentage,
          changesPercentage: changePercentage,
          currency: meta.currency,
          exchange: meta.fullExchangeName || meta.exchangeName,
          yearHigh: num(meta.fiftyTwoWeekHigh),
          yearLow: num(meta.fiftyTwoWeekLow),
          volume: num(meta.regularMarketVolume),
        },
    history,
  };
}
