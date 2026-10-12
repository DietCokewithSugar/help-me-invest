/**
 * SEC EDGAR XBRL 补充数据源（官方、免费、无需 key，仅覆盖向 SEC 申报的公司）。
 *
 * 用途：Yahoo 年报只有约 4 年，这里从 companyfacts 取 10 年以上的年度数据，
 * 用于计算 5 年 / 10 年的每股 CAGR。
 *
 * SEC 要求声明 User-Agent（https://www.sec.gov/os/accessing-edgar-data），
 * 通过 SEC_USER_AGENT 配置，形如 "Company Name admin@example.com"。
 * 访问频率上限 10 次/秒，这里每份报告最多 2 次请求，且两层都有进程内缓存。
 */

import type { LongHistoryPoint } from '@/lib/financial-metrics';

const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT?.trim() || 'HelpMeInvest research (+https://www.help-me-invest.com)';

const TICKER_MAP_TTL_MS = 24 * 60 * 60 * 1000;
const FACTS_TTL_MS = 12 * 60 * 60 * 1000;
const FACTS_CACHE_LIMIT = 50;

let tickerMap: { map: Map<string, number>; expiresAt: number } | null = null;
let tickerMapPromise: Promise<Map<string, number>> | null = null;
const factsCache = new Map<number, { points: LongHistoryPoint[]; expiresAt: number }>();

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
      throw new Error(`SEC EDGAR ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
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

interface FactEntry {
  start?: string;
  end: string;
  val: number;
  form?: string;
  fp?: string;
  filed?: string;
}

const DAY_MS = 86_400_000;

/** 年度期间值（利润表 / 现金流量表）：取 10-K 中跨度约一年的条目，按期末日去重保留最新申报。 */
function annualDurationValues(entries: FactEntry[] | undefined): Map<string, number> {
  const byEnd = new Map<string, FactEntry>();
  for (const entry of entries ?? []) {
    if (!entry?.start || !entry.end || typeof entry.val !== 'number') continue;
    if (!entry.form?.startsWith('10-K')) continue;
    const days = (Date.parse(entry.end) - Date.parse(entry.start)) / DAY_MS;
    if (days < 350 || days > 380) continue;
    const existing = byEnd.get(entry.end);
    if (!existing || (entry.filed ?? '') > (existing.filed ?? '')) byEnd.set(entry.end, entry);
  }
  return new Map(Array.from(byEnd.entries()).map(([end, entry]) => [end, entry.val]));
}

/** 时点值（资产负债表）：10-K 中的期末数。 */
function annualInstantValues(entries: FactEntry[] | undefined): Map<string, number> {
  const byEnd = new Map<string, FactEntry>();
  for (const entry of entries ?? []) {
    if (entry?.start || !entry?.end || typeof entry.val !== 'number') continue;
    if (!entry.form?.startsWith('10-K') || entry.fp !== 'FY') continue;
    const existing = byEnd.get(entry.end);
    if (!existing || (entry.filed ?? '') > (existing.filed ?? '')) byEnd.set(entry.end, entry);
  }
  return new Map(Array.from(byEnd.entries()).map(([end, entry]) => [end, entry.val]));
}

/** 多个候选标签合并（公司会因会计准则变化换标签，例如 2018 年 ASC 606 之后的营收）。 */
function mergeTags(gaap: Record<string, any>, tags: string[], unit: string, kind: 'duration' | 'instant'): Map<string, number> {
  const merged = new Map<string, number>();
  for (const tag of tags) {
    const entries: FactEntry[] | undefined = gaap?.[tag]?.units?.[unit];
    const values = kind === 'duration' ? annualDurationValues(entries) : annualInstantValues(entries);
    values.forEach((value, end) => {
      if (!merged.has(end)) merged.set(end, value);
    });
  }
  return merged;
}

function parseCompanyFacts(data: any): LongHistoryPoint[] {
  const gaap = data?.facts?.['us-gaap'];
  if (!gaap) return [];

  const revenue = mergeTags(gaap, [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'SalesRevenueNet',
  ], 'USD', 'duration');
  const netIncome = mergeTags(gaap, ['NetIncomeLoss', 'ProfitLoss'], 'USD', 'duration');
  const operatingCashFlow = mergeTags(gaap, [
    'NetCashProvidedByUsedInOperatingActivities',
    'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
  ], 'USD', 'duration');
  const dilutedShares = mergeTags(gaap, ['WeightedAverageNumberOfDilutedSharesOutstanding'], 'shares', 'duration');
  const equity = mergeTags(gaap, ['StockholdersEquity'], 'USD', 'instant');

  const points: LongHistoryPoint[] = Array.from(revenue.keys())
    .filter((end) => dilutedShares.has(end))
    .sort()
    .map((end) => ({
      fiscalYearEnd: end,
      revenue: revenue.get(end),
      netIncome: netIncome.get(end),
      dilutedShares: dilutedShares.get(end),
      operatingCashFlow: operatingCashFlow.get(end),
      equity: equity.get(end),
    }));

  // 只保留彼此相隔约一年的期末日，排除会计年度变更产生的重叠期间
  const cleaned: LongHistoryPoint[] = [];
  for (const point of points) {
    const last = cleaned[cleaned.length - 1];
    if (!last || (Date.parse(point.fiscalYearEnd) - Date.parse(last.fiscalYearEnd)) / DAY_MS > 300) {
      cleaned.push(point);
    }
  }
  return cleaned;
}

/** 美股代码 → 旧→新的年度长周期序列；找不到或失败时返回空数组（补充数据，绝不抛错）。 */
export async function getLongHistory(symbol: string): Promise<LongHistoryPoint[]> {
  try {
    const map = await loadTickerMap();
    const cik = map.get(symbol.toUpperCase()) ?? map.get(symbol.toUpperCase().replace('-', '.'));
    if (!cik) return [];

    const cached = factsCache.get(cik);
    if (cached && cached.expiresAt > Date.now()) return cached.points;

    const padded = String(cik).padStart(10, '0');
    const data = await secFetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`, 20_000);
    const points = parseCompanyFacts(data);

    if (factsCache.size >= FACTS_CACHE_LIMIT) {
      const oldestKey = factsCache.keys().next().value;
      if (oldestKey !== undefined) factsCache.delete(oldestKey);
    }
    factsCache.set(cik, { points, expiresAt: Date.now() + FACTS_TTL_MS });
    return points;
  } catch (error: any) {
    console.warn(`[SEC] long history unavailable for ${symbol}:`, error?.message || error);
    return [];
  }
}
