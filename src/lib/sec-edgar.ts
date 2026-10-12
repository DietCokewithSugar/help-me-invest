/**
 * SEC EDGAR（官方、免费、无需 key，仅覆盖向 SEC 申报的公司）。
 *
 * - companyfacts：XBRL 财务数据 → 三大报表（年度 + 季度）与 10 年以上长周期序列，
 *   解析见 providers/sec-statements.ts。
 * - submissions：公司名称、行业（SIC）、交易所、财年结束月、地址等基础资料。
 *
 * SEC 要求声明 User-Agent（https://www.sec.gov/os/accessing-edgar-data），
 * 通过 SEC_USER_AGENT 配置，形如 "Company Name admin@example.com"。
 * 访问频率上限 10 次/秒；每份报告最多 3 次请求，且解析结果有进程内缓存。
 */

import type { LongHistoryPoint } from '@/lib/financial-metrics';
import { buildSecStatements, type SecStatements } from '@/lib/providers/sec-statements';

const SEC_USER_AGENT = process.env.SEC_USER_AGENT?.trim() || 'HelpMeInvest admin@help-me-invest.com';

const TICKER_MAP_TTL_MS = 24 * 60 * 60 * 1000;
const FACTS_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_LIMIT = 50;

let tickerMap: { map: Map<string, number>; expiresAt: number } | null = null;
let tickerMapPromise: Promise<Map<string, number>> | null = null;
const statementsCache = new Map<number, { value: SecStatements | null; expiresAt: number }>();
const submissionsCache = new Map<number, { value: SecSubmissions | null; expiresAt: number }>();

export class SecError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'SecError';
    this.status = status;
  }
}

async function secFetch(url: string, timeoutMs = 15_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new SecError(`SEC EDGAR ${response.status} ${new URL(url).pathname}`, response.status);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function remember<V>(cache: Map<number, { value: V; expiresAt: number }>, key: number, value: V, ttl: number) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

async function loadTickerMap(): Promise<Map<string, number>> {
  if (tickerMap && tickerMap.expiresAt > Date.now()) return tickerMap.map;
  if (!tickerMapPromise) {
    tickerMapPromise = secFetch('https://www.sec.gov/files/company_tickers.json')
      .then((data) => {
        const map = new Map<string, number>();
        for (const entry of Object.values<any>(data ?? {})) {
          if (typeof entry?.ticker === 'string' && typeof entry?.cik_str === 'number') {
            map.set(entry.ticker.toUpperCase(), entry.cik_str);
          }
        }
        tickerMap = { map, expiresAt: Date.now() + TICKER_MAP_TTL_MS };
        return map;
      })
      .finally(() => {
        tickerMapPromise = null;
      });
  }
  return tickerMapPromise;
}

/** 美股代码 → CIK；SEC 的类别股写作 BRK-B */
export async function resolveCik(symbol: string): Promise<number | null> {
  const map = await loadTickerMap();
  const upper = symbol.toUpperCase();
  return map.get(upper) ?? map.get(upper.replace(/\./g, '-')) ?? map.get(upper.replace(/-/g, '.')) ?? null;
}

const padCik = (cik: number) => String(cik).padStart(10, '0');

/** 三大报表 + 长周期序列。代码不在 SEC 名录时返回 null；网络 / HTTP 错误向上抛出。 */
export async function getSecStatements(symbol: string): Promise<SecStatements | null> {
  const cik = await resolveCik(symbol);
  if (!cik) return null;
  const cached = statementsCache.get(cik);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const data = await secFetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik(cik)}.json`, 20_000);
  const value = buildSecStatements(data, symbol.toUpperCase());
  remember(statementsCache, cik, value, FACTS_TTL_MS);
  return value;
}

export interface SecSubmissions {
  cik: number;
  name: string;
  sicDescription: string;
  exchange: string;
  fiscalYearEnd: string;
  website: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  formerNames: string[];
}

export async function getSecSubmissions(symbol: string): Promise<SecSubmissions | null> {
  const cik = await resolveCik(symbol);
  if (!cik) return null;
  const cached = submissionsCache.get(cik);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const data = await secFetch(`https://data.sec.gov/submissions/CIK${padCik(cik)}.json`);
  const business = data?.addresses?.business ?? {};
  const value: SecSubmissions = {
    cik,
    name: String(data?.name ?? ''),
    sicDescription: String(data?.sicDescription ?? ''),
    exchange: Array.isArray(data?.exchanges) ? String(data.exchanges[0] ?? '') : '',
    fiscalYearEnd: String(data?.fiscalYearEnd ?? ''),
    website: String(data?.website ?? ''),
    phone: String(data?.phone ?? ''),
    city: String(business.city ?? ''),
    state: String(business.stateOrCountryDescription ?? business.stateOrCountry ?? ''),
    address: [business.street1, business.street2].filter(Boolean).join(', '),
    formerNames: Array.isArray(data?.formerNames) ? data.formerNames.map((f: any) => String(f?.name ?? '')).filter(Boolean) : [],
  };
  remember(submissionsCache, cik, value, TICKER_MAP_TTL_MS);
  return value;
}

/** 长周期年度序列（旧→新）；补充数据，失败时返回空数组。 */
export async function getLongHistory(symbol: string): Promise<LongHistoryPoint[]> {
  try {
    return (await getSecStatements(symbol))?.longHistory ?? [];
  } catch (error: any) {
    console.warn(`[SEC] long history unavailable for ${symbol}:`, error?.message || error);
    return [];
  }
}
