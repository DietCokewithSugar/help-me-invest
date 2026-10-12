/**
 * Yahoo Finance 客户端（非官方公开接口，无需 API key）
 *
 * 端点与参数对齐 yfinance（https://github.com/ranaroussi/yfinance）的实现：
 * - /v8/finance/chart            行情 + 分红 + 拆股，不需要 crumb
 * - /ws/fundamentals-timeseries  三大报表（年度 / 季度 / TTM），不需要 crumb
 * - /v10/finance/quoteSummary    公司概况、估值统计、持仓、分析师等，需要 cookie + crumb
 * - /v1/finance/search           代码搜索与新闻，不需要 crumb
 * - /v6/finance/recommendationsbysymbol  相似公司
 *
 * cookie + crumb 在模块作用域缓存（每进程一份），401 时作废重取一次。
 */

const QUERY1 = 'https://query1.finance.yahoo.com';
const QUERY2 = 'https://query2.finance.yahoo.com';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const DEFAULT_TIMEOUT_MS = 15_000;
const SESSION_TTL_MS = 30 * 60 * 1000;

export class YahooFinanceError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'YahooFinanceError';
    this.status = status;
  }
}

interface YahooSession {
  cookie: string;
  crumb: string | null;
  expiresAt: number;
}

let session: YahooSession | null = null;
let sessionPromise: Promise<YahooSession> | null = null;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

function readSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? raw.split(/,(?=\s*[A-Za-z0-9_-]+=)/) : [];
}

async function createSession(): Promise<YahooSession> {
  let cookie = '';
  try {
    // fc.yahoo.com 返回 404，但会下发 A3 cookie；这是 yfinance 的 basic 策略。
    const response = await fetchWithTimeout('https://fc.yahoo.com', {
      headers: BASE_HEADERS,
      redirect: 'manual',
    });
    cookie = readSetCookies(response)
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
  } catch (error: any) {
    console.warn('[Yahoo] cookie fetch failed:', error?.message || error);
  }

  let crumb: string | null = null;
  if (cookie) {
    try {
      const response = await fetchWithTimeout(`${QUERY1}/v1/test/getcrumb`, {
        headers: { ...BASE_HEADERS, Cookie: cookie },
      });
      const text = (await response.text()).trim();
      if (response.ok && text && !text.includes('<') && !text.includes('Too Many Requests')) {
        crumb = text;
      } else {
        console.warn(`[Yahoo] crumb unavailable (${response.status})`);
      }
    } catch (error: any) {
      console.warn('[Yahoo] crumb fetch failed:', error?.message || error);
    }
  }

  return { cookie, crumb, expiresAt: Date.now() + SESSION_TTL_MS };
}

async function getSession(forceRefresh = false): Promise<YahooSession> {
  if (!forceRefresh && session && session.expiresAt > Date.now()) {
    return session;
  }
  if (!sessionPromise) {
    sessionPromise = createSession()
      .then((created) => {
        session = created;
        return created;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }
  return sessionPromise;
}

async function requestJson<T>(
  url: string,
  params: Record<string, string>,
  options: { needsCrumb?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  const attempt = async (forceRefresh: boolean): Promise<Response> => {
    const current = options.needsCrumb ? await getSession(forceRefresh) : session;
    const search = new URLSearchParams(params);
    if (options.needsCrumb && current?.crumb) {
      search.set('crumb', current.crumb);
    }
    const headers: Record<string, string> = { ...BASE_HEADERS };
    if (current?.cookie) headers.Cookie = current.cookie;
    return fetchWithTimeout(`${url}?${search.toString()}`, { headers }, options.timeoutMs);
  };

  let response = await attempt(false);
  if (options.needsCrumb && (response.status === 401 || response.status === 403)) {
    response = await attempt(true);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new YahooFinanceError(`Yahoo Finance ${response.status}: ${body.slice(0, 200)}`, response.status);
  }
  return response.json() as Promise<T>;
}

// ==================== 公开接口 ====================

export interface ChartResult {
  meta: Record<string, any>;
  timestamp?: number[];
  events?: {
    dividends?: Record<string, { amount: number; date: number }>;
    splits?: Record<string, { date: number; numerator: number; denominator: number; splitRatio?: string }>;
  };
  indicators: {
    quote: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }>;
    adjclose?: Array<{ adjclose?: (number | null)[] }>;
  };
}

export type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max';
export type ChartInterval = '1m' | '5m' | '15m' | '30m' | '60m' | '1d' | '1wk' | '1mo';

export async function getChart(symbol: string, range: ChartRange = '5y', interval: ChartInterval = '1d'): Promise<ChartResult | null> {
  const data = await requestJson<any>(`${QUERY2}/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    range,
    interval,
    events: 'div,splits',
    includeAdjustedClose: 'true',
  });
  return data?.chart?.result?.[0] ?? null;
}

export const QUOTE_SUMMARY_MODULES = [
  'assetProfile',
  'price',
  'summaryDetail',
  'defaultKeyStatistics',
  'financialData',
  'calendarEvents',
  'earningsHistory',
  'earningsTrend',
  'recommendationTrend',
  'upgradeDowngradeHistory',
  'institutionOwnership',
  'fundOwnership',
  'majorHoldersBreakdown',
  'insiderTransactions',
  'netSharePurchaseActivity',
] as const;

export type QuoteSummaryModule = (typeof QUOTE_SUMMARY_MODULES)[number];

export async function getQuoteSummary(
  symbol: string,
  modules: readonly QuoteSummaryModule[] = QUOTE_SUMMARY_MODULES
): Promise<Record<string, any> | null> {
  const data = await requestJson<any>(
    `${QUERY2}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
    {
      modules: modules.join(','),
      corsDomain: 'finance.yahoo.com',
      formatted: 'false',
      lang: 'en-US',
      region: 'US',
    },
    { needsCrumb: true }
  );
  return data?.quoteSummary?.result?.[0] ?? null;
}

/**
 * 批量行情（v7/finance/quote）。注意这里 regularMarketChangePercent 已是百分数（1.23 = 1.23%），
 * 与 quoteSummary.price 模块里的小数不同。
 */
export async function getQuotes(symbols: string[]): Promise<Record<string, any>[]> {
  const unique = Array.from(new Set(symbols.filter(Boolean)));
  const out: Record<string, any>[] = [];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const data = await requestJson<any>(
      `${QUERY1}/v7/finance/quote`,
      { symbols: chunk.join(','), formatted: 'false', lang: 'en-US', region: 'US' },
      { needsCrumb: true }
    );
    const rows: any[] = data?.quoteResponse?.result ?? [];
    out.push(...rows);
  }
  return out;
}

/**
 * 板块概览（与 yfinance 的 Sector 一致）：overview.marketWeight / marketCap、topCompanies 等。
 * key 形如 technology、financial-services。
 */
export async function getSector(key: string): Promise<Record<string, any> | null> {
  const data = await requestJson<any>(
    `${QUERY1}/v1/finance/sectors/${encodeURIComponent(key)}`,
    { formatted: 'true', withReturns: 'true', lang: 'en-US', region: 'US' },
    { needsCrumb: true }
  );
  return data?.data ?? null;
}

export type TimeseriesFrequency = 'annual' | 'quarterly' | 'trailing';

export interface TimeseriesPoint {
  asOfDate: string;
  periodType?: string;
  currencyCode?: string;
  value: number;
}

/**
 * 返回 { key（不含频率前缀）: 按日期升序的数据点 }。
 * Yahoo 对年度最多返回约 4 年、季度约 5 个季度，与起始日期无关。
 */
export async function getFundamentalsTimeseries(
  symbol: string,
  frequency: TimeseriesFrequency,
  keys: readonly string[]
): Promise<Record<string, TimeseriesPoint[]>> {
  const period1 = Math.floor(Date.UTC(2016, 11, 31) / 1000);
  const period2 = Math.ceil(Date.now() / 1000) + 86_400;
  const data = await requestJson<any>(
    `${QUERY2}/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}`,
    {
      symbol,
      type: keys.map((key) => `${frequency}${key}`).join(','),
      period1: String(period1),
      period2: String(period2),
    },
    { timeoutMs: 20_000 }
  );

  const out: Record<string, TimeseriesPoint[]> = {};
  const results: any[] = data?.timeseries?.result ?? [];
  for (const item of results) {
    const type: string | undefined = item?.meta?.type?.[0];
    if (!type) continue;
    const series: any[] = Array.isArray(item[type]) ? item[type] : [];
    const points: TimeseriesPoint[] = [];
    for (const entry of series) {
      const raw = entry?.reportedValue?.raw;
      if (!entry?.asOfDate || typeof raw !== 'number' || !Number.isFinite(raw)) continue;
      points.push({
        asOfDate: entry.asOfDate,
        periodType: entry.periodType,
        currencyCode: entry.currencyCode,
        value: raw,
      });
    }
    if (points.length > 0) {
      points.sort((a, b) => a.asOfDate.localeCompare(b.asOfDate));
      out[type.slice(frequency.length)] = points;
    }
  }
  return out;
}

export interface YahooSearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  exchDisp?: string;
  quoteType?: string;
  typeDisp?: string;
  sector?: string;
  industry?: string;
}

export interface YahooNewsItem {
  uuid?: string;
  title: string;
  publisher?: string;
  link: string;
  providerPublishTime?: number;
  thumbnail?: { resolutions?: Array<{ url: string; width: number; height: number }> };
  relatedTickers?: string[];
}

export async function search(
  query: string,
  options: { quotesCount?: number; newsCount?: number } = {}
): Promise<{ quotes: YahooSearchQuote[]; news: YahooNewsItem[] }> {
  const data = await requestJson<any>(`${QUERY2}/v1/finance/search`, {
    q: query,
    quotesCount: String(options.quotesCount ?? 8),
    newsCount: String(options.newsCount ?? 0),
    enableFuzzyQuery: 'false',
    lang: 'en-US',
    region: 'US',
  });
  return {
    quotes: Array.isArray(data?.quotes) ? data.quotes : [],
    news: Array.isArray(data?.news) ? data.news : [],
  };
}

export async function getRecommendedSymbols(symbol: string): Promise<string[]> {
  const data = await requestJson<any>(
    `${QUERY2}/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`,
    {}
  );
  const list: any[] = data?.finance?.result?.[0]?.recommendedSymbols ?? [];
  return list.map((item) => item?.symbol).filter((s): s is string => typeof s === 'string');
}
