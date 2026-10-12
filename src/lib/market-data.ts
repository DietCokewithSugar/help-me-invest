/**
 * 报告数据编排：按市场路由到可在服务器（Vercel / AWS 出口）稳定访问的数据源。
 *
 * | 市场 | 行情 / 日 K                     | 公司资料                         | 财报                                  |
 * | ---- | ------------------------------- | -------------------------------- | ------------------------------------- |
 * | A 股 | 东方财富                         | 东方财富 F10                      | 东方财富 F10（年报 + 单季）            |
 * | 港股 | 东方财富                         | 东方财富 F10                      | 东方财富 F10（年报）                   |
 * | 美股 | 东方财富 → FMP 免费版 → Yahoo     | FMP 免费版 → 东方财富 F10 + SEC   | SEC EDGAR → FMP 免费版 → Yahoo         |
 * | 其他 | Yahoo                            | Yahoo                            | Yahoo                                 |
 *
 * Yahoo Finance 会屏蔽 / 限流云服务器出口，因此只作为补充（分析师评级、持仓、新闻、分红拆股），
 * 失败不影响报告；连续失败时 yahoo/client.ts 会自动熔断。
 *
 * 估值 / 比率 / 增长 / 健康评分统一由 financial-metrics.ts 从报表推导，口径与数据源无关。
 * 股价与财报币种不同（腾讯港元交易、人民币报告）时，推导估值前先按汇率换算。
 *
 * 每个数据源调用都记录在 trace 中；全部失败时抛出 MarketDataError，附带逐个数据源的失败原因。
 */

import type { BalanceSheet, CashFlowStatement, CompanyProfile, IncomeStatement, ReportData } from '@/types';
import {
  MarketType,
  detectMarketFromSymbol,
  formatSymbolForMarket,
  getMarketConfig,
} from '@/lib/markets';
import { buildSankeyData } from '@/lib/sankey-utils';
import { FMPClient } from '@/lib/fmp';
import { getSecStatements, getSecSubmissions } from '@/lib/sec-edgar';
import {
  deriveAnnualMetrics,
  deriveFinancialScores,
  deriveTTM,
  priceOnOrBefore,
  sumLastFourQuarters,
  type LongHistoryPoint,
  type PricePoint,
} from '@/lib/financial-metrics';
import * as yahoo from '@/lib/yahoo/client';
import * as em from '@/lib/providers/eastmoney';
import { cnBalance, cnCashFlow, cnIncome, hkStatements } from '@/lib/providers/eastmoney-normalize';
import { getFxRate } from '@/lib/providers/fx';
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
  type KeyStatistics,
  type PriceBar,
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

/** 站内代码规范化：600519.SH → 600519.SS，港股去掉多余前导零（00700.HK → 0700.HK） */
export function normalizeSymbol(symbol: string, market: MarketType): string {
  let upper = formatSymbolForMarket(symbol, market).toUpperCase();
  if (market === 'CN') upper = upper.replace(/\.SH$/, '.SS');
  if (market === 'HK') {
    const code = upper.split('.')[0].replace(/^0+/, '');
    upper = `${code.padStart(4, '0')}.HK`;
  }
  return upper;
}

// ==================== 调用追踪 ====================

export type ProviderName = 'Eastmoney' | 'SEC EDGAR' | 'FMP' | 'Yahoo Finance' | 'Frankfurter';

export interface ProviderAttempt {
  provider: ProviderName;
  step: string;
  ok: boolean;
  empty?: boolean;
  ms: number;
  error?: string;
}

function describeError(error: any): string {
  const message = String(error?.message || error || '');
  if (error?.name === 'AbortError' || /aborted|timeout/i.test(message)) return 'timeout';
  if (typeof error?.status === 'number' && error.status > 0) return `HTTP ${error.status}`;
  if (error?.cause?.code) return String(error.cause.code);
  return message.slice(0, 160) || 'unknown error';
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

export class Trace {
  readonly attempts: ProviderAttempt[] = [];

  async run<T>(provider: ProviderName, step: string, task: () => Promise<T>, fallback: T, deadlineMs?: number): Promise<T> {
    const started = Date.now();
    try {
      const value = deadlineMs ? await withDeadline(task(), deadlineMs) : await task();
      const empty = value == null || (Array.isArray(value) && value.length === 0);
      this.attempts.push({ provider, step, ok: true, empty, ms: Date.now() - started });
      return value ?? fallback;
    } catch (error: any) {
      const reason = describeError(error);
      this.attempts.push({ provider, step, ok: false, ms: Date.now() - started, error: reason });
      console.warn(`[market-data] ${provider} ${step} failed: ${reason}`);
      return fallback;
    }
  }

  /** 失败摘要：每个数据源取第一个失败原因 */
  failureSummary(): string {
    const byProvider = new Map<string, string>();
    for (const attempt of this.attempts) {
      if (!attempt.ok && !byProvider.has(attempt.provider)) byProvider.set(attempt.provider, attempt.error ?? 'failed');
    }
    return Array.from(byProvider.entries()).map(([provider, reason]) => `${provider}: ${reason}`).join('; ');
  }

  get anyFailed(): boolean {
    return this.attempts.some((a) => !a.ok);
  }
}

export class MarketDataError extends Error {
  readonly status: number;
  readonly attempts: ProviderAttempt[];
  readonly notFound: boolean;

  constructor(message: string, trace: Trace, notFound: boolean) {
    super(message);
    this.name = 'MarketDataError';
    this.notFound = notFound;
    this.status = notFound ? 404 : 502;
    this.attempts = trace.attempts;
  }
}

// ==================== 共用结构 ====================

interface Fundamentals {
  incomeAnnual: IncomeStatement[];
  balanceAnnual: BalanceSheet[];
  cashAnnual: CashFlowStatement[];
  incomeQuarter: IncomeStatement[];
  balanceQuarter: BalanceSheet[];
  cashQuarter: CashFlowStatement[];
  reportedCurrency: string | null;
  longHistory: LongHistoryPoint[];
}

const emptyFundamentals = (): Fundamentals => ({
  incomeAnnual: [],
  balanceAnnual: [],
  cashAnnual: [],
  incomeQuarter: [],
  balanceQuarter: [],
  cashQuarter: [],
  reportedCurrency: null,
  longHistory: [],
});

interface YahooExtras {
  summary: Record<string, any> | null;
  chart: yahoo.ChartResult | null;
  news: yahoo.YahooNewsItem[];
  peers: string[];
}

interface Assembly {
  symbol: string;
  market: MarketType;
  period: 'annual' | 'quarter';
  profile: CompanyProfile & Record<string, any>;
  quote: Record<string, any> | null;
  fundamentals: Fundamentals;
  /** 新→旧 */
  priceHistory: PriceBar[];
  /** 交易币种 */
  tradingCurrency: string;
  marketCap: number | null;
  sharesOutstanding: number | null;
  fallbackStats: Partial<KeyStatistics>;
  dcf: { date: string; dcf: number; price: number | null } | null;
  extras: YahooExtras;
  sources: string[];
  /** 数据源直接提供的 TTM（Yahoo trailing），优先于最近四季相加 */
  ttm?: { income: IncomeStatement | null; cashFlow: CashFlowStatement | null };
}

const DAY_MS = 86_400_000;
const YAHOO_DEADLINE_MS = 8_000;

/** 最近四个季度确实首尾相隔约三个季度时才相加，避免中间缺季度时算出错误的 TTM */
function lastFourQuarters<T extends { date: string }>(rows: T[]): T | null {
  if (rows.length < 4) return null;
  const span = (Date.parse(rows[0].date) - Date.parse(rows[3].date)) / DAY_MS;
  if (span < 250 || span > 300) return null;
  return sumLastFourQuarters(rows);
}

function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

/** 行情源没有给出的统计项，用日 K 计算 */
function statsFromBars(bars: PriceBar[]): Partial<KeyStatistics> {
  if (bars.length === 0) return {};
  const closes = bars.map((b) => b.close);
  const lastYear = bars.filter((b) => Date.parse(b.date) >= Date.parse(bars[0].date) - 365 * DAY_MS);
  const yearAgo = priceOnOrBefore(
    bars.map((b) => ({ date: b.date, close: b.close })),
    new Date(Date.parse(bars[0].date) - 365 * DAY_MS).toISOString().slice(0, 10)
  );
  return {
    fiftyDayAverage: average(closes.slice(0, 50)),
    twoHundredDayAverage: average(closes.slice(0, 200)),
    averageVolume: average(bars.slice(0, 63).map((b) => b.volume)),
    fiftyTwoWeekHigh: lastYear.length ? Math.max(...lastYear.map((b) => b.high ?? b.close)) : null,
    fiftyTwoWeekLow: lastYear.length ? Math.min(...lastYear.map((b) => b.low ?? b.close)) : null,
    fiftyTwoWeekChange: yearAgo ? closes[0] / yearAgo - 1 : null,
  };
}

function emptyKeyStats(): KeyStatistics {
  return {
    beta: null, trailingPE: null, forwardPE: null, pegRatio: null, priceToBook: null, priceToSales: null,
    enterpriseToEbitda: null, enterpriseToRevenue: null, dividendYield: null, payoutRatio: null,
    sharesOutstanding: null, floatShares: null, heldPercentInsiders: null, heldPercentInstitutions: null,
    shortPercentOfFloat: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, fiftyTwoWeekChange: null,
    fiftyDayAverage: null, twoHundredDayAverage: null, averageVolume: null, forwardEps: null, trailingEps: null,
    earningsGrowth: null, revenueGrowth: null, nextEarningsDate: null,
  };
}

/** Yahoo 有值时优先，其余用本地推导值补齐 */
function mergeKeyStats(primary: KeyStatistics | null, ...fallbacks: Array<Partial<KeyStatistics>>): KeyStatistics | null {
  const merged: Record<string, any> = { ...emptyKeyStats(), ...(primary ?? {}) };
  for (const fallback of fallbacks) {
    for (const [key, value] of Object.entries(fallback)) {
      if ((merged[key] === null || merged[key] === undefined) && value !== null && value !== undefined && !Number.isNaN(value)) {
        merged[key] = value;
      }
    }
  }
  const hasAny = Object.values(merged).some((v) => v !== null && v !== undefined);
  return hasAny ? (merged as KeyStatistics) : null;
}

function earningsFromQuarters(symbol: string, quarters: IncomeStatement[]) {
  return quarters.map((q) => ({
    symbol,
    date: q.date,
    time: '',
    epsEstimated: null as unknown as number,
    epsActual: (q.epsdiluted || q.eps || null) as unknown as number,
    revenueEstimated: null as unknown as number,
    revenueActual: (q.revenue || null) as unknown as number,
    fiscalDateEnding: q.date,
    updatedFromDate: '',
  }));
}

function assemble(a: Assembly, fx: number): ReportData {
  const f = a.fundamentals;

  // 估值推导统一用财报币种
  const pricePoints: PricePoint[] = a.priceHistory.map((bar) => ({ date: bar.date, close: bar.close * fx }));
  const derived = deriveAnnualMetrics(f.incomeAnnual, f.balanceAnnual, f.cashAnnual, pricePoints, f.longHistory);

  const quarterTTM = a.ttm?.income ?? lastFourQuarters(f.incomeQuarter);
  const ttmIncome = quarterTTM ?? f.incomeAnnual[0] ?? null;
  const ttmCash = a.ttm?.cashFlow ?? lastFourQuarters(f.cashQuarter) ?? f.cashAnnual[0] ?? null;
  const latestBalance = f.balanceQuarter[0] ?? f.balanceAnnual[0] ?? null;
  const yearAgoBalance = (quarterTTM ? f.balanceQuarter[4] : null) ?? f.balanceAnnual[1] ?? null;
  const price = num(a.quote?.price) ?? num(a.profile.price);
  const marketCapReported = a.marketCap != null ? a.marketCap * fx : null;

  const ttm = deriveTTM({
    income: ttmIncome,
    cashFlow: ttmCash,
    balance: latestBalance,
    prevBalance: yearAgoBalance,
    price: price != null ? price * fx : null,
    shares: a.sharesOutstanding,
    marketCap: marketCapReported,
  });

  const financialScores = deriveFinancialScores(a.symbol, f.incomeAnnual, f.balanceAnnual, f.cashAnnual, marketCapReported);

  const summary = a.extras.summary;
  const chart = a.extras.chart;
  const ttmEps = ttm?.netIncomePerShareTTM != null ? ttm.netIncomePerShareTTM / (fx || 1) : null;
  const keyStats = mergeKeyStats(
    summary ? buildKeyStatistics(summary) : null,
    a.fallbackStats,
    {
      sharesOutstanding: a.sharesOutstanding,
      trailingPE: ttm?.peRatioTTM ?? null,
      priceToBook: ttm?.pbRatioTTM ?? null,
      enterpriseToEbitda: ttm?.evToEBITDATTM ?? null,
      enterpriseToRevenue: ttm?.evToSalesTTM ?? null,
      priceToSales: ttm?.priceToSalesRatioTTM ?? null,
      dividendYield: ttm?.dividendYieldTTM != null ? Math.abs(ttm.dividendYieldTTM) : null,
      payoutRatio: ttm?.payoutRatioTTM != null ? Math.abs(ttm.payoutRatioTTM) : null,
      trailingEps: ttmEps,
    },
    statsFromBars(a.priceHistory)
  );

  const reportedCurrency = f.reportedCurrency || a.tradingCurrency;
  const profile = {
    ...a.profile,
    market: a.market,
    marketName: getMarketConfig(a.market).nameCn,
    currency: a.profile.currency || a.tradingCurrency,
    reportedCurrency,
  };

  return {
    profile,
    quote: a.quote,
    incomeStatements: f.incomeAnnual,
    balanceSheets: f.balanceAnnual,
    cashFlowStatements: f.cashAnnual,
    incomeStatementsQuarter: f.incomeQuarter,
    balanceSheetsQuarter: f.balanceQuarter,
    cashFlowStatementsQuarter: f.cashQuarter,
    keyMetrics: derived.keyMetrics,
    keyMetricsTTM: ttm ? [ttm] : [],
    financialRatios: derived.financialRatios,
    financialRatiosTTM: ttm ? [ttm] : [],
    financialGrowth: derived.financialGrowth,
    dcfValuation: a.dcf ? { symbol: a.symbol, ...a.dcf } : null,
    enterpriseValues: derived.enterpriseValues,
    financialScores,
    earningsCalendar: summary ? buildEarnings(a.symbol, summary, f.incomeQuarter) : earningsFromQuarters(a.symbol, f.incomeQuarter),
    dividendHistory: buildDividends(a.symbol, chart),
    stockSplits: buildSplits(a.symbol, chart),
    institutionalHolders: buildInstitutionalHolders(summary),
    insiderTrading: buildInsiderTrading(a.symbol, summary),
    mutualFundHolders: buildMutualFundHolders(summary),
    etfHolders: [],
    historicalPrices: a.priceHistory,
    peers: a.extras.peers.filter((p) => p !== a.symbol).slice(0, 8),
    news: buildNews(a.symbol, a.extras.news),
    earningsTranscripts: [],
    sankeyData: buildSankeyData(f.incomeAnnual[0]),
    analystConsensus: buildAnalystConsensus(summary),
    keyStats,
    dataSources: a.sources,
    market: a.market,
    period: a.period,
  } as ReportData;
}

async function fetchYahooExtras(trace: Trace, yahooSymbol: string): Promise<YahooExtras> {
  const [summary, chart, news, peers] = await Promise.all([
    trace.run('Yahoo Finance', 'quoteSummary', () => yahoo.getQuoteSummary(yahooSymbol), null, YAHOO_DEADLINE_MS),
    trace.run('Yahoo Finance', 'chart', () => yahoo.getChart(yahooSymbol, '5y', '1d'), null, YAHOO_DEADLINE_MS),
    trace.run('Yahoo Finance', 'news', () => yahoo.search(yahooSymbol, { quotesCount: 0, newsCount: 15 }).then((r) => r.news), [] as yahoo.YahooNewsItem[], YAHOO_DEADLINE_MS),
    trace.run('Yahoo Finance', 'peers', () => yahoo.getRecommendedSymbols(yahooSymbol), [] as string[], YAHOO_DEADLINE_MS),
  ]);
  return { summary, chart, news, peers };
}

function yahooHasData(extras: YahooExtras): boolean {
  return !!(extras.summary || extras.chart || extras.news.length || extras.peers.length);
}

// ==================== 东方财富行情（A 股 / 港股 / 美股共用） ====================

interface EastmoneyMarket {
  quote: em.EastmoneyQuote | null;
  bars: PriceBar[];
}

async function fetchEastmoneyMarket(trace: Trace, symbol: string, market: MarketType): Promise<EastmoneyMarket> {
  const quote = await trace.run('Eastmoney', 'quote', () => em.resolveQuote(symbol, market), null);
  if (!quote) return { quote: null, bars: [] };
  const kline = await trace.run('Eastmoney', 'kline', () => em.getDailyKline(quote.secid, 5), [] as em.EastmoneyBar[]);
  // A 股成交量单位是「手」（100 股）
  const volumeScale = market === 'CN' ? 100 : 1;
  const bars: PriceBar[] = kline.map((bar) => ({
    date: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    adjClose: bar.close,
    volume: Number.isFinite(bar.volume) ? bar.volume * volumeScale : null,
  }));
  return { quote, bars };
}

function quoteFromEastmoney(symbol: string, q: em.EastmoneyQuote, market: MarketType, currency: string, exchange: string): Record<string, any> {
  const volumeScale = market === 'CN' ? 100 : 1;
  return {
    symbol,
    name: q.name || symbol,
    price: q.price,
    change: q.change,
    changePercentage: q.changePercent,
    changesPercentage: q.changePercent,
    volume: q.volume != null ? q.volume * volumeScale : null,
    dayLow: q.low,
    dayHigh: q.high,
    yearLow: q.yearLow,
    yearHigh: q.yearHigh,
    open: q.open,
    previousClose: q.previousClose,
    marketCap: q.marketCap,
    pe: q.peTTM,
    sharesOutstanding: q.totalShares,
    exchange,
    currency,
  };
}

function quoteStats(q: em.EastmoneyQuote | null): Partial<KeyStatistics> {
  if (!q) return {};
  return {
    trailingPE: q.peTTM && q.peTTM > 0 ? q.peTTM : null,
    priceToBook: q.pb && q.pb > 0 ? q.pb : null,
    sharesOutstanding: q.totalShares,
    floatShares: q.floatShares,
    fiftyTwoWeekHigh: q.yearHigh,
    fiftyTwoWeekLow: q.yearLow,
  };
}

function profileBase(symbol: string, price: number, change: number, changePercentage: number, marketCap: number, currency: string) {
  return {
    symbol,
    price,
    change,
    changes: change,
    changePercentage,
    changesPercentage: changePercentage.toFixed(2),
    marketCap,
    mktCap: marketCap,
    currency,
    image: `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
    isActivelyTrading: true,
  };
}

// ==================== A 股 ====================

const CN_EXCHANGES: Record<string, { short: string; full: string }> = {
  SS: { short: 'SSE', full: '上海证券交易所' },
  SZ: { short: 'SZSE', full: '深圳证券交易所' },
  BJ: { short: 'BSE', full: '北京证券交易所' },
};

async function buildChina(symbol: string, period: 'annual' | 'quarter', trace: Trace): Promise<Assembly | null> {
  const [marketData, survey, statements, extras] = await Promise.all([
    fetchEastmoneyMarket(trace, symbol, 'CN'),
    trace.run('Eastmoney', 'company survey', () => em.getCnCompanySurvey(symbol), null),
    trace.run('Eastmoney', 'statements', () => em.getCnStatements(symbol), null),
    fetchYahooExtras(trace, symbol),
  ]);
  const { quote, bars } = marketData;

  const ctxA = { symbol, currency: 'CNY', frequency: 'annual' as const };
  const ctxQ = { symbol, currency: 'CNY', frequency: 'quarterly' as const };
  const fundamentals: Fundamentals = statements
    ? {
        incomeAnnual: cnIncome(statements.incomeAnnual, ctxA, statements.cashAnnual),
        balanceAnnual: cnBalance(statements.balanceAnnual, ctxA),
        cashAnnual: cnCashFlow(statements.cashAnnual, ctxA),
        incomeQuarter: cnIncome(statements.incomeQuarter, ctxQ, statements.cashQuarter),
        balanceQuarter: cnBalance(statements.balanceQuarter, ctxQ),
        cashQuarter: cnCashFlow(statements.cashQuarter, ctxQ),
        reportedCurrency: 'CNY',
        longHistory: [],
      }
    : emptyFundamentals();

  if (!quote && fundamentals.incomeAnnual.length === 0) return null;

  const exchange = CN_EXCHANGES[symbol.split('.')[1] ?? 'SZ'] ?? CN_EXCHANGES.SZ;
  const price = quote?.price ?? bars[0]?.close ?? 0;
  const profile = {
    ...profileBase(symbol, price, quote?.change ?? 0, quote?.changePercent ?? 0, quote?.marketCap ?? 0, 'CNY'),
    companyName: quote?.name || survey?.name || symbol,
    companyNameFull: survey?.name || '',
    companyNameEn: survey?.nameEn || '',
    industry: survey?.industry || quote?.industry || '',
    sector: quote?.industry || survey?.industry || '',
    description: survey?.description || '',
    ceo: survey?.president || survey?.chairman || '',
    website: survey?.website || '',
    country: 'CN',
    address: survey?.address || '',
    fullTimeEmployees: survey?.employees != null ? String(survey.employees) : '',
    ipoDate: survey?.listingDate || quote?.listingDate || '',
    exchange: exchange.short,
    exchangeShortName: exchange.short,
    exchangeFullName: exchange.full,
    reportedCurrency: 'CNY',
    volume: quote?.volume != null ? quote.volume * 100 : null,
    range: quote?.yearLow != null && quote?.yearHigh != null ? `${quote.yearLow}-${quote.yearHigh}` : '',
    dataSource: 'eastmoney',
  } as CompanyProfile & Record<string, any>;

  const sources = ['东方财富 Eastmoney'];
  if (yahooHasData(extras)) sources.push('Yahoo Finance');

  return {
    symbol,
    market: 'CN',
    period,
    profile,
    quote: quote ? quoteFromEastmoney(symbol, quote, 'CN', 'CNY', exchange.full) : null,
    fundamentals,
    priceHistory: bars.length > 0 ? bars : buildPriceHistory(extras.chart),
    tradingCurrency: 'CNY',
    marketCap: quote?.marketCap ?? null,
    sharesOutstanding: quote?.totalShares ?? null,
    fallbackStats: quoteStats(quote),
    dcf: null,
    extras,
    sources,
  };
}

// ==================== 港股 ====================

async function buildHongKong(symbol: string, period: 'annual' | 'quarter', trace: Trace): Promise<Assembly | null> {
  const [marketData, hkProfile, bundle, extras] = await Promise.all([
    fetchEastmoneyMarket(trace, symbol, 'HK'),
    trace.run('Eastmoney', 'HK profile', () => em.getHkProfile(symbol), null),
    trace.run('Eastmoney', 'HK statements', () => em.getHkStatements(symbol), null),
    fetchYahooExtras(trace, symbol),
  ]);
  const { quote, bars } = marketData;

  let fundamentals = emptyFundamentals();
  if (bundle) {
    const hk = hkStatements(bundle, { symbol, fallbackCurrency: 'HKD' });
    fundamentals = {
      ...fundamentals,
      incomeAnnual: hk.income,
      balanceAnnual: hk.balance,
      cashAnnual: hk.cashFlow,
      reportedCurrency: hk.currency,
    };
  }

  if (!quote && fundamentals.incomeAnnual.length === 0) return null;

  const price = quote?.price ?? bars[0]?.close ?? 0;
  const profile = {
    ...profileBase(symbol, price, quote?.change ?? 0, quote?.changePercent ?? 0, quote?.marketCap ?? 0, 'HKD'),
    companyName: quote?.name || hkProfile?.name || symbol,
    companyNameFull: hkProfile?.name || '',
    companyNameEn: hkProfile?.nameEn || '',
    industry: hkProfile?.industry || quote?.industry || '',
    sector: hkProfile?.industry || quote?.industry || '',
    description: hkProfile?.description || '',
    ceo: hkProfile?.chairman || '',
    website: hkProfile?.website || '',
    country: 'HK',
    address: hkProfile?.address || '',
    fullTimeEmployees: hkProfile?.employees != null ? String(hkProfile.employees) : '',
    ipoDate: hkProfile?.listingDate || quote?.listingDate || '',
    exchange: 'HKEX',
    exchangeShortName: 'HKEX',
    exchangeFullName: '香港交易所',
    reportedCurrency: fundamentals.reportedCurrency || 'HKD',
    volume: quote?.volume ?? null,
    range: quote?.yearLow != null && quote?.yearHigh != null ? `${quote.yearLow}-${quote.yearHigh}` : '',
    dataSource: 'eastmoney',
  } as CompanyProfile & Record<string, any>;

  const sources = ['东方财富 Eastmoney'];
  if (yahooHasData(extras)) sources.push('Yahoo Finance');

  return {
    symbol,
    market: 'HK',
    period,
    profile,
    quote: quote ? quoteFromEastmoney(symbol, quote, 'HK', 'HKD', '香港交易所') : null,
    fundamentals,
    priceHistory: bars.length > 0 ? bars : buildPriceHistory(extras.chart),
    tradingCurrency: 'HKD',
    marketCap: quote?.marketCap ?? null,
    sharesOutstanding: quote?.totalShares ?? null,
    fallbackStats: quoteStats(quote),
    dcf: null,
    extras,
    sources,
  };
}

// ==================== 美股 ====================

function normalizeFmpRows<T>(rows: any[]): T[] {
  return rows.map((row) => ({
    ...row,
    calendarYear: row.calendarYear ?? row.fiscalYear ?? String(row.date ?? '').slice(0, 4),
    fiscalYear: row.fiscalYear ?? row.calendarYear,
    epsdiluted: row.epsdiluted ?? row.epsDiluted,
    epsDiluted: row.epsDiluted ?? row.epsdiluted,
  }));
}

function fmpBars(rows: any[]): PriceBar[] {
  const bars: PriceBar[] = [];
  for (const row of rows) {
    const close = num(row?.price ?? row?.close);
    if (close === null || !row?.date) continue;
    bars.push({ date: String(row.date).slice(0, 10), open: num(row.open), high: num(row.high), low: num(row.low), close, adjClose: close, volume: num(row.volume) });
  }
  return bars.sort((a, b) => b.date.localeCompare(a.date));
}

async function buildUnitedStates(symbol: string, period: 'annual' | 'quarter', trace: Trace): Promise<Assembly | null> {
  const apiKey = process.env.FMP_API_KEY;
  const fmp = apiKey ? new FMPClient(apiKey) : null;
  // FMP 与 Yahoo 的类别股都写作 BRK-B
  const yahooSymbol = toYahooSymbol(symbol, 'US');
  const fmpSymbol = yahooSymbol;

  const [sec, submissions, fmpProfile, marketData, fmpDcf, extras] = await Promise.all([
    trace.run('SEC EDGAR', 'companyfacts', () => getSecStatements(symbol), null),
    trace.run('SEC EDGAR', 'submissions', () => getSecSubmissions(symbol), null),
    fmp ? trace.run('FMP', 'profile', () => fmp.getProfile(fmpSymbol).then((rows) => (Array.isArray(rows) ? rows[0] ?? null : null)), null) : Promise.resolve(null),
    fetchEastmoneyMarket(trace, symbol, 'US'),
    fmp ? trace.run('FMP', 'dcf', () => fmp.getDCF(fmpSymbol).then((rows) => (Array.isArray(rows) ? rows[0] ?? null : null)), null) : Promise.resolve(null),
    fetchYahooExtras(trace, yahooSymbol),
  ]);
  const { quote } = marketData;
  let bars = marketData.bars;
  const sources: string[] = [];

  // ---------- 财报：SEC → FMP → Yahoo ----------
  let fundamentals = emptyFundamentals();
  if (sec && sec.incomeAnnual.length > 0) {
    fundamentals = {
      incomeAnnual: sec.incomeAnnual,
      balanceAnnual: sec.balanceAnnual,
      cashAnnual: sec.cashAnnual,
      incomeQuarter: sec.incomeQuarter,
      balanceQuarter: sec.balanceQuarter,
      cashQuarter: sec.cashQuarter,
      reportedCurrency: sec.currency,
      longHistory: sec.longHistory,
    };
    sources.push('SEC EDGAR');
  } else if (fmp) {
    const [income, balance, cash] = await Promise.all([
      trace.run('FMP', 'income statement', () => fmp.getIncomeStatement(fmpSymbol, 'annual', 5), [] as any[]),
      trace.run('FMP', 'balance sheet', () => fmp.getBalanceSheet(fmpSymbol, 'annual', 5), [] as any[]),
      trace.run('FMP', 'cash flow', () => fmp.getCashFlowStatement(fmpSymbol, 'annual', 5), [] as any[]),
    ]);
    if (Array.isArray(income) && income.length > 0) {
      fundamentals = {
        ...fundamentals,
        incomeAnnual: normalizeFmpRows<IncomeStatement>(income),
        balanceAnnual: normalizeFmpRows<BalanceSheet>(Array.isArray(balance) ? balance : []),
        cashAnnual: normalizeFmpRows<CashFlowStatement>(Array.isArray(cash) ? cash : []),
        reportedCurrency: income[0]?.reportedCurrency ?? null,
      };
      sources.push('Financial Modeling Prep');
    }
  }
  if (fundamentals.incomeAnnual.length === 0 && extras.summary) {
    fundamentals = await yahooFundamentals(trace, yahooSymbol, extras.summary);
    if (fundamentals.incomeAnnual.length > 0) sources.push('Yahoo Finance');
  }

  // ---------- 行情：东方财富 → FMP → Yahoo ----------
  let fmpQuote: Record<string, any> | null = null;
  if (!quote && fmp && !fmpProfile) {
    fmpQuote = await trace.run('FMP', 'quote', () => fmp.getQuote(fmpSymbol).then((rows) => (Array.isArray(rows) ? rows[0] ?? null : null)), null);
  }
  if (bars.length === 0 && fmp) {
    const from = new Date(Date.now() - 5 * 365 * DAY_MS).toISOString().slice(0, 10);
    bars = fmpBars(await trace.run('FMP', 'historical prices', () => fmp.getHistoricalPrices(fmpSymbol, from), [] as any[]));
  }
  if (bars.length === 0) bars = buildPriceHistory(extras.chart);

  const yahooQuote = extras.summary || extras.chart ? buildQuote(symbol, extras.summary, extras.chart?.meta ?? null) : null;
  const fmpPrice = num(fmpProfile?.price) ?? num(fmpQuote?.price);
  const price = quote?.price ?? fmpPrice ?? num(yahooQuote?.price) ?? bars[0]?.close ?? null;

  if (price === null && fundamentals.incomeAnnual.length === 0 && !fmpProfile && !submissions) return null;

  // ---------- 公司资料：FMP → 东方财富 F10（中文）+ SEC ----------
  const emProfile = fmpProfile?.description
    ? null
    : await trace.run('Eastmoney', 'US profile', () => em.getUsProfile(symbol), null);
  const yahooProfile = extras.summary ? buildProfile(symbol, extras.summary, extras.chart?.meta ?? null) : null;

  const marketCap =
    quote?.marketCap ?? num(fmpProfile?.marketCap ?? fmpProfile?.mktCap) ?? num(fmpQuote?.marketCap) ?? (yahooProfile?.marketCap || null) ??
    (price != null && sec?.sharesOutstanding ? price * sec.sharesOutstanding : null);
  const sharesOutstanding =
    quote?.totalShares ?? sec?.sharesOutstanding ?? (marketCap && price ? marketCap / price : null);
  const change = quote?.change ?? num(fmpProfile?.change) ?? num(fmpQuote?.change) ?? num(yahooQuote?.change) ?? 0;
  const changePct = quote?.changePercent ?? num(fmpProfile?.changePercentage) ?? num(fmpQuote?.changePercentage) ?? num(yahooQuote?.changePercentage) ?? 0;
  const exchangeShort = String(fmpProfile?.exchange ?? submissions?.exchange ?? yahooProfile?.exchange ?? '');

  const profile = {
    ...profileBase(symbol, price ?? 0, change, changePct, marketCap ?? 0, 'USD'),
    companyName: fmpProfile?.companyName || yahooProfile?.companyName || submissions?.name || quote?.name || symbol,
    industry: fmpProfile?.industry || yahooProfile?.industry || emProfile?.industry || submissions?.sicDescription || '',
    sector: fmpProfile?.sector || yahooProfile?.sector || '',
    description: fmpProfile?.description || yahooProfile?.description || emProfile?.description || '',
    ceo: fmpProfile?.ceo || yahooProfile?.ceo || emProfile?.chairman || '',
    website: fmpProfile?.website || yahooProfile?.website || emProfile?.website || submissions?.website || '',
    country: fmpProfile?.country || yahooProfile?.country || 'US',
    city: fmpProfile?.city || submissions?.city || '',
    address: fmpProfile?.address || submissions?.address || emProfile?.address || '',
    phone: fmpProfile?.phone || submissions?.phone || '',
    fullTimeEmployees: String(fmpProfile?.fullTimeEmployees ?? yahooProfile?.fullTimeEmployees ?? emProfile?.employees ?? ''),
    image: fmpProfile?.image || `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
    ipoDate: fmpProfile?.ipoDate || yahooProfile?.ipoDate || '',
    exchange: exchangeShort,
    exchangeShortName: exchangeShort,
    exchangeFullName: String(fmpProfile?.exchangeFullName ?? yahooProfile?.exchangeFullName ?? exchangeShort),
    beta: num(fmpProfile?.beta) ?? yahooProfile?.beta ?? null,
    volume: quote?.volume ?? num(fmpProfile?.volume) ?? null,
    averageVolume: num(fmpProfile?.averageVolume),
    lastDividend: num(fmpProfile?.lastDividend),
    range: String(fmpProfile?.range ?? (quote?.yearLow != null && quote?.yearHigh != null ? `${quote.yearLow}-${quote.yearHigh}` : '')),
    isEtf: !!fmpProfile?.isEtf,
    isFund: !!fmpProfile?.isFund,
    dataSource: fmpProfile ? 'fmp' : 'sec',
  } as CompanyProfile & Record<string, any>;

  let usQuote: Record<string, any> | null = null;
  if (quote) {
    usQuote = quoteFromEastmoney(symbol, quote, 'US', 'USD', profile.exchangeFullName);
    sources.push('东方财富 Eastmoney');
  } else if (fmpProfile || fmpQuote) {
    const src = fmpQuote ?? fmpProfile;
    usQuote = {
      symbol,
      name: profile.companyName,
      price,
      change,
      changePercentage: changePct,
      changesPercentage: changePct,
      volume: num(src?.volume),
      dayLow: num(fmpQuote?.dayLow),
      dayHigh: num(fmpQuote?.dayHigh),
      yearLow: num(fmpQuote?.yearLow),
      yearHigh: num(fmpQuote?.yearHigh),
      open: num(fmpQuote?.open),
      previousClose: num(fmpQuote?.previousClose) ?? (price != null ? price - change : null),
      marketCap,
      exchange: profile.exchangeFullName,
      currency: 'USD',
    };
  } else {
    usQuote = yahooQuote;
  }
  if (fmpProfile || fmpQuote || fmpDcf) {
    if (!sources.includes('Financial Modeling Prep')) sources.push('Financial Modeling Prep');
  }
  if (yahooHasData(extras) && !sources.includes('Yahoo Finance')) sources.push('Yahoo Finance');

  const dcfValue = num(fmpDcf?.dcf);
  return {
    symbol,
    market: 'US',
    period,
    profile,
    quote: usQuote,
    fundamentals,
    priceHistory: bars,
    tradingCurrency: 'USD',
    marketCap,
    sharesOutstanding,
    fallbackStats: { ...quoteStats(quote), beta: num(fmpProfile?.beta) },
    dcf: dcfValue !== null
      ? { date: String(fmpDcf?.date ?? ''), dcf: dcfValue, price: num(fmpDcf?.['Stock Price'] ?? fmpDcf?.stockPrice) ?? price }
      : null,
    extras,
    sources,
  };
}

// ==================== 其他市场（日 / 韩 / 澳）：Yahoo ====================

const STATEMENT_KEYS = [...INCOME_KEYS, ...BALANCE_KEYS, ...CASH_FLOW_KEYS];

async function yahooFundamentals(trace: Trace, yahooSymbol: string, summary: Record<string, any> | null): Promise<Fundamentals> {
  const [annualSeries, quarterlySeries] = await Promise.all([
    trace.run('Yahoo Finance', 'timeseries annual', () => yahoo.getFundamentalsTimeseries(yahooSymbol, 'annual', STATEMENT_KEYS), {} as Record<string, any>, 15_000),
    trace.run('Yahoo Finance', 'timeseries quarterly', () => yahoo.getFundamentalsTimeseries(yahooSymbol, 'quarterly', STATEMENT_KEYS), {} as Record<string, any>, 15_000),
  ]);
  const fyEndMonth = fiscalYearEndMonth(summary);
  const ctxA = { symbol: yahooSymbol, frequency: 'annual' as const, fyEndMonth };
  const ctxQ = { symbol: yahooSymbol, frequency: 'quarterly' as const, fyEndMonth };
  const incomeAnnual = buildIncomeStatements(annualSeries, ctxA);
  return {
    incomeAnnual,
    balanceAnnual: buildBalanceSheets(annualSeries, ctxA),
    cashAnnual: buildCashFlowStatements(annualSeries, ctxA),
    incomeQuarter: buildIncomeStatements(quarterlySeries, ctxQ),
    balanceQuarter: buildBalanceSheets(quarterlySeries, ctxQ),
    cashQuarter: buildCashFlowStatements(quarterlySeries, ctxQ),
    reportedCurrency: incomeAnnual[0]?.reportedCurrency || summary?.financialData?.financialCurrency || null,
    longHistory: [],
  };
}

async function buildYahooOnly(symbol: string, market: MarketType, period: 'annual' | 'quarter', trace: Trace): Promise<Assembly | null> {
  const extras = await fetchYahooExtras(trace, symbol);
  if (!extras.summary && !extras.chart) return null;
  const [fundamentals, trailingSeries] = await Promise.all([
    yahooFundamentals(trace, symbol, extras.summary),
    trace.run('Yahoo Finance', 'timeseries trailing', () => yahoo.getFundamentalsTimeseries(symbol, 'trailing', TRAILING_KEYS), {} as Record<string, any>, 15_000),
  ]);
  const trailing = buildTrailing(trailingSeries, symbol);
  const profile = buildProfile(symbol, extras.summary, extras.chart?.meta ?? null);
  const quote = buildQuote(symbol, extras.summary, extras.chart?.meta ?? null);
  const config = getMarketConfig(market);
  return {
    symbol,
    market,
    period,
    profile,
    quote,
    fundamentals,
    priceHistory: buildPriceHistory(extras.chart),
    tradingCurrency: profile.currency || config.currency,
    marketCap: profile.marketCap || null,
    sharesOutstanding: num(extras.summary?.defaultKeyStatistics?.sharesOutstanding),
    fallbackStats: {},
    dcf: null,
    extras,
    sources: ['Yahoo Finance'],
    ttm: { income: trailing.income ?? null, cashFlow: trailing.cashFlow ?? null },
  };
}

// ==================== 入口 ====================

const REPORT_CACHE_TTL_MS = 10 * 60 * 1000;
const REPORT_CACHE_LIMIT = 30;
const reportCache = new Map<string, { data: ReportData; expiresAt: number }>();
const inflight = new Map<string, Promise<ReportData>>();

export async function fetchReportData(options: FetchOptions): Promise<ReportData> {
  const market = options.market || detectMarketFromSymbol(options.symbol);
  const symbol = normalizeSymbol(options.symbol, market);
  const period = options.period || 'annual';
  const key = `${market}:${symbol}:${period}`;

  const cached = reportCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const { data } = await fetchReportDataTraced({ symbol, market, period });
    if (reportCache.size >= REPORT_CACHE_LIMIT) {
      const oldest = reportCache.keys().next().value;
      if (oldest !== undefined) reportCache.delete(oldest);
    }
    reportCache.set(key, { data, expiresAt: Date.now() + REPORT_CACHE_TTL_MS });
    return data;
  })().finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}

/** 不走缓存、同时返回调用追踪（诊断接口使用） */
export async function fetchReportDataTraced(options: FetchOptions): Promise<{ data: ReportData; trace: Trace }> {
  const market = options.market || detectMarketFromSymbol(options.symbol);
  const symbol = normalizeSymbol(options.symbol, market);
  const period = options.period || 'annual';
  const trace = new Trace();

  let assembly: Assembly | null;
  switch (market) {
    case 'CN':
      assembly = await buildChina(symbol, period, trace);
      break;
    case 'HK':
      assembly = await buildHongKong(symbol, period, trace);
      break;
    case 'US':
      assembly = await buildUnitedStates(symbol, period, trace);
      break;
    default:
      assembly = await buildYahooOnly(toYahooSymbol(symbol, market), market, period, trace);
  }

  if (!assembly) {
    const config = getMarketConfig(market);
    // 有数据源报错 → 上游故障（可重试）；全部正常返回但为空 → 代码不存在
    const upstreamFailed = trace.attempts.some((a) => !a.ok && a.provider !== 'Yahoo Finance') ||
      (market !== 'US' && market !== 'CN' && market !== 'HK' && trace.anyFailed);
    if (upstreamFailed) {
      throw new MarketDataError(`行情数据源暂时无法访问（${trace.failureSummary()}），请稍后重试`, trace, false);
    }
    const hint = market === 'US' ? '请检查股票代码是否正确' : `${config.nameCn}市场请使用格式：${config.symbolExample}`;
    throw new MarketDataError(`未找到该公司信息（${symbol}）。${hint}`, trace, true);
  }

  const reportedCurrency = assembly.fundamentals.reportedCurrency || assembly.tradingCurrency;
  const fx = reportedCurrency === assembly.tradingCurrency
    ? 1
    : await trace.run('Frankfurter', `fx ${assembly.tradingCurrency}/${reportedCurrency}`, () => getFxRate(assembly!.tradingCurrency, reportedCurrency), null);

  return { data: assemble(assembly, fx ?? 1), trace };
}

// ==================== 轻量行情（追踪页 / 行业页） ====================

export interface QuoteWithHistory {
  symbol: string;
  quote: Record<string, any> | null;
  /** 新→旧 */
  history: Array<{ date: string; close: number }>;
}

const RANGE_DAYS: Partial<Record<yahoo.ChartRange, number>> = { '5d': 7, '1mo': 31, '3mo': 92, '6mo': 183, '1y': 366, '2y': 731, '5y': 1827 };

/** 东方财富（A 股 / 港股 / 美股）优先，失败或其他市场走 Yahoo chart。 */
export async function fetchQuoteWithHistory(symbol: string, range: yahoo.ChartRange = '1mo'): Promise<QuoteWithHistory> {
  const market = detectMarketFromSymbol(symbol);
  const days = RANGE_DAYS[range] ?? 31;

  if (market === 'CN' || market === 'HK' || market === 'US') {
    try {
      const normalized = normalizeSymbol(symbol, market);
      const q = await em.resolveQuote(normalized, market);
      if (q) {
        const bars = await em.getDailyKline(q.secid, Math.max(1, Math.ceil(days / 365))).catch(() => [] as em.EastmoneyBar[]);
        const cutoff = Date.now() - days * DAY_MS;
        const history = bars.filter((b) => Date.parse(b.date) >= cutoff).map((b) => ({ date: b.date, close: b.close }));
        return {
          symbol,
          quote: {
            symbol,
            name: q.name || symbol,
            price: q.price,
            change: q.change,
            changePercentage: q.changePercent,
            changesPercentage: q.changePercent,
            currency: getMarketConfig(market).currency,
            exchange: market === 'CN' ? 'SSE/SZSE' : market === 'HK' ? 'HKEX' : 'US',
            yearHigh: q.yearHigh,
            yearLow: q.yearLow,
            marketCap: q.marketCap,
            volume: q.volume != null ? q.volume * (market === 'CN' ? 100 : 1) : null,
          },
          history,
        };
      }
    } catch (error: any) {
      console.warn(`[market-data] Eastmoney quote failed for ${symbol}: ${describeError(error)}`);
    }
  }

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
