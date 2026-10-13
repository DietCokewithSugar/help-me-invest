/**
 * 东方财富（Eastmoney）行情与 F10 数据（免费、无需 key）。
 *
 * 覆盖：A 股 / 港股 / 美股的实时行情与日 K；A 股与港股的公司资料和三大报表。
 * 端点与参数参考 akshare（https://github.com/akfamily/akshare）中的实现：
 * - push2.eastmoney.com/api/qt/stock/get           个股行情快照（secid = 市场.代码），空响应时改走 push2delay 重试一次
 * - push2his.eastmoney.com/api/qt/stock/kline/get  日 K
 * - emweb.securities.eastmoney.com/PC_HSF10/...    A 股公司概况与三大报表
 * - datacenter.eastmoney.com/securities/api/data/get     A 股主要财务指标（MAINFINADATA）
 * - datacenter.eastmoney.com/securities/api/data/v1/get  港股 / 美股 F10 数据集
 * - searchapi.eastmoney.com/api/suggest/get        代码 / 名称联想
 *
 * 东财对部分出口 IP 会返回 HTTP 200 但没有数据（data:null / 缺少数据键）。
 * 这种情况抛 EastmoneyEmptyError（带响应摘要），调用方据此区分「数据源返回空」与「公司不存在」。
 */

import type { MarketType } from '@/lib/markets';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const DEFAULT_TIMEOUT_MS = 12_000;

export class EastmoneyError extends Error {
  readonly status: number;
  /** 诊断信息：host、rc、响应体摘要等 */
  readonly detail?: string;
  constructor(message: string, status = 0, detail?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'EastmoneyError';
    this.status = status;
    this.detail = detail;
  }
}

/** HTTP 200 + JSON，但没有可用数据（data:null、缺少数据键、无价格等） */
export class EastmoneyEmptyError extends EastmoneyError {
  readonly empty = true;
  declare readonly detail: string;
  constructor(message: string, detail: string) {
    super(message, 0, detail);
    this.name = 'EastmoneyEmptyError';
  }
}

export function isEastmoneyEmptyError(error: unknown): error is EastmoneyEmptyError {
  return error instanceof EastmoneyEmptyError || (!!error && (error as any).empty === true && (error as any).name === 'EastmoneyEmptyError');
}

// ==================== HTTP ====================

const QUOTE_REFERER = 'https://quote.eastmoney.com/';

/** 只给行情域名带 Referer；emweb / datacenter / searchapi 与 akshare 一样不带 */
function refererFor(url: URL): string | null {
  return /(^|\.)(push2[a-z]*|quote)\.eastmoney\.com$/i.test(url.hostname) ? QUOTE_REFERER : null;
}

function snippet(text: string, max = 200): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

async function request(url: string, params: Record<string, string>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const target = new URL(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' };
    const referer = refererFor(target);
    if (referer) headers.Referer = referer;
    const response = await fetch(`${url}?${new URLSearchParams(params).toString()}`, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new EastmoneyError(
        `Eastmoney ${response.status} ${target.pathname}`,
        response.status,
        `${target.host}${target.pathname} HTTP ${response.status} body=${snippet(body)}`
      );
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

interface JsonResponse<T = any> {
  json: T;
  text: string;
  /** host + path，用于诊断 */
  where: string;
}

const JSONP = /^\s*[\w$.]+\(\s*[\[{]/;

async function fetchJson<T = any>(url: string, params: Record<string, string>, timeoutMs?: number): Promise<JsonResponse<T>> {
  const response = await request(url, params, timeoutMs);
  const text = await response.text();
  const target = new URL(url);
  const where = `${target.host}${target.pathname}`;
  const trimmed = text.trim();
  let payload: string;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    payload = trimmed;
  } else if (JSONP.test(trimmed)) {
    // 部分端点即便 Accept JSON 也可能返回 JSONP（jQuery123(...)）
    payload = trimmed.slice(trimmed.indexOf('(') + 1, trimmed.lastIndexOf(')'));
  } else {
    // 拦截页 / 跳转页等：不能当作「有效但为空」的 JSON
    throw new EastmoneyError(`non-JSON response from ${where}`, response.status, snippet(text));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new EastmoneyError(`invalid JSON from ${where}`, response.status, snippet(text));
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new EastmoneyError(`non-object JSON from ${where}`, response.status, snippet(text));
  }
  return { json: parsed as T, text, where };
}

async function getJson<T = any>(url: string, params: Record<string, string>, timeoutMs?: number): Promise<T> {
  return (await fetchJson<T>(url, params, timeoutMs)).json;
}

/** '<host><path> rc=<rc> dataNull=<bool> keys=<前 8 个顶层键> body=<前 200 字符>' */
function describeResponse(res: JsonResponse, dataNull: boolean): string {
  const json: any = res.json;
  const keys = Array.isArray(json) ? `[array:${json.length}]` : Object.keys(json ?? {}).slice(0, 8).join(',');
  const rc = json && !Array.isArray(json) && 'rc' in json ? String(json.rc) : '-';
  return `${res.where} rc=${rc} dataNull=${dataNull} keys=${keys} body=${snippet(res.text)}`;
}

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** 简易并发限制器：同一时刻最多 max 个任务在途 */
type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

function createLimiter(max: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= max) return;
    const start = queue.shift();
    if (!start) return;
    active += 1;
    start();
  };
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
}

/** 数值字段：东财用 "-" 或空串表示缺失 */
export function emNum(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && value !== '-') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** 日期字段 → YYYY-MM-DD：兼容 '2024-12-31 00:00:00'、'2024/12/31'、'20241231'；无法识别返回 '' */
export function emDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/) || raw.match(/^(\d{4})(\d{2})(\d{2})(?!\d)/);
  if (!match) return '';
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${match[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ==================== 代码映射 ====================

export interface EastmoneySecurity {
  secid: string;
  code: string;
  market: MarketType;
}

/** 站内代码 → 东财 secid。美股需要交易所前缀（105 NASDAQ / 106 NYSE / 107 AMEX），返回候选列表。 */
export function secidCandidates(symbol: string, market: MarketType): string[] {
  const upper = symbol.toUpperCase();
  const code = upper.split('.')[0];
  switch (market) {
    case 'CN':
      if (upper.endsWith('.SS')) return [`1.${code}`];
      if (upper.endsWith('.SZ') || upper.endsWith('.BJ')) return [`0.${code}`];
      return [code.startsWith('6') || code.startsWith('9') ? `1.${code}` : `0.${code}`];
    case 'HK':
      return [`116.${code.padStart(5, '0')}`];
    case 'US': {
      // 东财美股代码用下划线表示类别股（BRK_B）
      const usCode = upper.replace(/[.-]/g, '_');
      return [`105.${usCode}`, `106.${usCode}`, `107.${usCode}`];
    }
    default:
      return [];
  }
}

/** A 股 F10 使用 SH600519 / SZ000001 形式 */
function hsf10Code(symbol: string): string {
  const upper = symbol.toUpperCase();
  const code = upper.split('.')[0];
  if (upper.endsWith('.SS')) return `SH${code}`;
  if (upper.endsWith('.BJ')) return `BJ${code}`;
  if (upper.endsWith('.SZ')) return `SZ${code}`;
  return code.startsWith('6') ? `SH${code}` : `SZ${code}`;
}

/** datacenter 使用 600519.SH / 000001.SZ / 830799.BJ（.SS → .SH） */
function cnSecucode(symbol: string): string {
  const code = hsf10Code(symbol);
  return `${code.slice(2)}.${code.slice(0, 2)}`;
}

// ==================== 行情 ====================

const QUOTE_FIELDS = [
  'f43', 'f44', 'f45', 'f46', 'f47', 'f48', 'f57', 'f58', 'f60', 'f84', 'f85', 'f116', 'f117',
  'f162', 'f163', 'f164', 'f167', 'f168', 'f169', 'f170', 'f127', 'f128', 'f174', 'f175', 'f189',
].join(',');

const QUOTE_PATH = '/api/qt/stock/get';
const QUOTE_HOST = 'https://push2.eastmoney.com';
/** 延时行情镜像：主站返回 data:null 时重试一次 */
const QUOTE_DELAY_HOST = 'https://push2delay.eastmoney.com';

export interface EastmoneyQuote {
  secid: string;
  code: string;
  name: string;
  price: number;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  amount: number | null;
  marketCap: number | null;
  floatMarketCap: number | null;
  totalShares: number | null;
  floatShares: number | null;
  peTTM: number | null;
  peDynamic: number | null;
  pb: number | null;
  turnoverRate: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  industry: string;
  listingDate: string;
}

const hasQuoteData = (json: any) => isObject(json?.data);

const textField = (value: unknown) => {
  const s = String(value ?? '').trim();
  return s === '-' ? '' : s;
};

/** 代码比较：忽略大小写、分隔符与前导 0（港股 00700 / 美股 BRK_B） */
const sameCode = (a: string, b: string) => {
  const norm = (s: string) => s.toUpperCase().replace(/[._\-\s]/g, '').replace(/^0+(?=.)/, '');
  return norm(a) === norm(b);
};

const positive = (value: number | null) => (value !== null && value > 0 ? value : null);

/**
 * 单个 secid 的行情快照。
 * - data 为空：改走 push2delay 重试一次，仍为空则抛 EastmoneyEmptyError；
 * - 有 data 但 f57 / f58 都为空：代码不存在，返回 null；
 * - f57 与 secid 不符、或现价与昨收都缺失：抛 EastmoneyEmptyError。
 */
export async function getQuote(secid: string): Promise<EastmoneyQuote | null> {
  const params = { secid, fields: QUOTE_FIELDS, fltt: '2', invt: '2' };
  let res = await fetchJson<any>(`${QUOTE_HOST}${QUOTE_PATH}`, params, 8_000);
  if (!hasQuoteData(res.json)) {
    const first = describeResponse(res, true);
    try {
      res = await fetchJson<any>(`${QUOTE_DELAY_HOST}${QUOTE_PATH}`, params, 4_000);
    } catch (error: any) {
      throw new EastmoneyEmptyError(
        `empty quote ${secid} (push2 data=null; push2delay failed)`,
        `${first} | push2delay: ${String(error?.message || error).slice(0, 160)}`
      );
    }
    if (!hasQuoteData(res.json)) {
      throw new EastmoneyEmptyError(`empty quote ${secid} (push2 + push2delay data=null)`, `${first} | ${describeResponse(res, true)}`);
    }
  }

  const d = res.json.data;
  const code = textField(d.f57);
  const name = textField(d.f58);
  if (!code && !name) return null;
  const expected = secid.slice(secid.indexOf('.') + 1);
  if (!code || !sameCode(code, expected)) {
    throw new EastmoneyEmptyError(`quote code mismatch for ${secid}: got "${code}"`, describeResponse(res, false));
  }
  // 停牌 / 开盘前 f43 为 "-"，用昨收兜底
  const price = positive(emNum(d.f43)) ?? positive(emNum(d.f60));
  if (price === null) throw new EastmoneyEmptyError(`no price for ${secid}`, describeResponse(res, false));

  return {
    secid,
    code,
    name,
    price,
    change: emNum(d.f169),
    changePercent: emNum(d.f170),
    open: emNum(d.f46),
    high: emNum(d.f44),
    low: emNum(d.f45),
    previousClose: emNum(d.f60),
    volume: emNum(d.f47),
    amount: emNum(d.f48),
    marketCap: emNum(d.f116),
    floatMarketCap: emNum(d.f117),
    totalShares: emNum(d.f84),
    floatShares: emNum(d.f85),
    peTTM: emNum(d.f164),
    peDynamic: emNum(d.f162),
    pb: emNum(d.f167),
    turnoverRate: emNum(d.f168),
    yearHigh: emNum(d.f174),
    yearLow: emNum(d.f175),
    industry: typeof d.f127 === 'string' && d.f127 !== '-' ? d.f127 : '',
    listingDate: emDate(d.f189),
  };
}

/**
 * 站内代码 → 行情。
 * A 股 / 港股只有一个确定的 secid，错误（含 EastmoneyEmptyError）直接抛出；
 * 美股并发尝试 3 个交易所，最先返回的有效报价胜出；全部为空或不存在返回 null，否则抛第一个非空类错误。
 */
export async function resolveQuote(symbol: string, market: MarketType): Promise<EastmoneyQuote | null> {
  const candidates = secidCandidates(symbol, market);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return getQuote(candidates[0]);

  return new Promise<EastmoneyQuote | null>((resolve, reject) => {
    const failures: Array<{ failed: boolean; error?: unknown }> = candidates.map(() => ({ failed: false }));
    let pending = candidates.length;
    let settled = false;
    candidates.forEach((secid, index) => {
      getQuote(secid)
        .then(
          (quote) => {
            if (quote && !settled) {
              settled = true;
              resolve(quote);
            }
          },
          (error) => {
            failures[index] = { failed: true, error };
          }
        )
        .then(() => {
          pending -= 1;
          if (pending > 0 || settled) return;
          settled = true;
          const hard = failures.find((f) => f.failed && !isEastmoneyEmptyError(f.error));
          if (hard) reject(hard.error);
          else resolve(null);
        });
    });
  });
}

export interface EastmoneyBar {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/** akshare stock_hist_em.py 中 A 股日 K 使用的 ut */
const KLINE_UT = '7eea3edcaed734bea9cbfc24409ed989';

/**
 * 日 K（前复权），返回新→旧。成交量为原始单位（A 股为「手」）。
 * data 为空抛 EastmoneyEmptyError；data.klines 为空数组返回 []。
 */
export async function getDailyKline(secid: string, years = 5): Promise<EastmoneyBar[]> {
  const begin = new Date();
  begin.setFullYear(begin.getFullYear() - years);
  const res = await fetchJson<any>('https://push2his.eastmoney.com/api/qt/stock/kline/get', {
    secid,
    ut: KLINE_UT,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    klt: '101',
    fqt: '1',
    beg: begin.toISOString().slice(0, 10).replace(/-/g, ''),
    end: '20500101',
  }, 15_000);
  const data = res.json?.data;
  if (!isObject(data)) throw new EastmoneyEmptyError(`empty kline ${secid}`, describeResponse(res, true));
  const lines: unknown[] = Array.isArray(data.klines) ? data.klines : [];
  const bars: EastmoneyBar[] = [];
  for (const line of lines) {
    if (typeof line !== 'string') continue;
    const [date, open, close, high, low, volume] = line.split(',');
    const c = Number(close);
    if (!date || !Number.isFinite(c)) continue;
    bars.push({ date, open: Number(open), close: c, high: Number(high), low: Number(low), volume: Number(volume) });
  }
  return bars.reverse();
}

// ==================== 搜索联想 ====================

export interface EastmoneySearchHit {
  code: string;
  name: string;
  quoteId: string;
  /** 沪A / 深A / 京A / 港股 / 美股 / 指数 / 基金 … */
  securityType: string;
  /** AStock / HK / UsStock / Index / Fund … */
  classify: string;
  market: MarketType | null;
}

const NON_EQUITY = /指数|基金|债|期货|期权|板块|外汇|理财|Index|Fund|Bond|Future|Option|Block|Forex/i;

const SEARCH_TOKEN = 'D43BF722C8E33BDC906FB84D85E326E8';

function marketFromQuoteId(quoteId: string): MarketType | null {
  const prefix = quoteId.split('.')[0];
  if (prefix === '1' || prefix === '0') {
    // 0. 同时承载深市与北交所；A 股以外（如基金）由 classify 过滤
    return 'CN';
  }
  if (prefix === '116') return 'HK';
  // 105 NASDAQ / 106 NYSE / 107 AMEX；153 等 OTC 品种取不到行情与财报，不作为候选
  if (prefix === '105' || prefix === '106' || prefix === '107') return 'US';
  return null;
}

export async function search(query: string, count = 10): Promise<EastmoneySearchHit[]> {
  const json = await getJson<any>('https://searchapi.eastmoney.com/api/suggest/get', {
    input: query,
    type: '14',
    token: SEARCH_TOKEN,
    count: String(count),
  }, 8_000);
  const rows: any[] = Array.isArray(json?.QuotationCodeTable?.Data) ? json.QuotationCodeTable.Data : [];
  return rows
    .map((row) => {
      const quoteId = String(row?.QuoteID ?? '');
      const classify = String(row?.Classify ?? '');
      const securityType = String(row?.SecurityTypeName ?? '');
      const isEquity = !NON_EQUITY.test(classify) && !NON_EQUITY.test(securityType);
      return {
        code: String(row?.Code ?? ''),
        name: String(row?.Name ?? ''),
        quoteId,
        securityType,
        classify,
        market: isEquity ? marketFromQuoteId(quoteId) : null,
      };
    })
    .filter((row) => row.code && row.quoteId);
}

// ==================== A 股 F10 ====================

const HSF10 = 'https://emweb.securities.eastmoney.com/PC_HSF10';
const EMWEB_TIMEOUT_MS = 8_000;

type StatementKind = 'zcfzb' | 'lrb' | 'xjllb';

interface DateList {
  /** 已规范为 YYYY-MM-DD，新→旧，去重 */
  dates: string[];
  /** DateAjaxNew 是否带有非空 data 数组 */
  ok: boolean;
  res: JsonResponse;
}

function parseDateList(res: JsonResponse): DateList {
  const rows: unknown[] = Array.isArray(res.json?.data) ? res.json.data : [];
  const dates = Array.from(new Set(rows.map((row: any) => emDate(row?.REPORT_DATE)).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  return { dates, ok: rows.length > 0, res };
}

function fetchDateList(code: string, companyType: string, kind: StatementKind, reportDateType: string, limit: Limiter): Promise<DateList> {
  return limit(() =>
    fetchJson<any>(`${HSF10}/NewFinanceAnalysis/${kind}DateAjaxNew`, { companyType, reportDateType, code }, EMWEB_TIMEOUT_MS)
  ).then(parseDateList);
}

/** 公司类型：4 一般企业 / 3 银行 / 2 保险 / 1 券商，不同类型的报表字段不同。按代码缓存（不会变）。 */
const companyTypeCache = new Map<string, string>();

interface CompanyTypeResolution {
  companyType: string;
  how: 'detected' | 'probed' | 'cached';
  /** 探测时拿到的年报利润表日期列表，可直接复用 */
  lrbAnnual: DateList | null;
}

/** 从 F10 首页 HTML 读取 hidctype（属性顺序 / 引号不限）；取不到返回 null */
async function detectCompanyType(code: string, limit: Limiter): Promise<string | null> {
  try {
    const html = await limit(async () => {
      const response = await request(`${HSF10}/NewFinanceAnalysis/Index`, { type: 'web', code: code.toLowerCase() }, 6_000);
      return response.text();
    });
    const tag = html.match(/<input[^>]*\bid=["']hidctype["'][^>]*>/i)?.[0];
    return tag?.match(/\bvalue=["']?(\d)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * 确定 companyType：HTML 识别值只作首选，再用 lrbDateAjaxNew（年报）依次验证
 * [识别值, 4, 3, 2, 1]，取第一个返回非空日期列表的类型（akshare 对银行退回 '3'）。
 */
async function resolveCompanyType(code: string, limit: Limiter): Promise<CompanyTypeResolution> {
  const cached = companyTypeCache.get(code);
  if (cached) return { companyType: cached, how: 'cached', lrbAnnual: null };

  const detected = await detectCompanyType(code, limit);
  const candidates = Array.from(new Set([detected, '4', '3', '2', '1'].filter((c): c is string => !!c)));
  let last: DateList | null = null;
  for (const candidate of candidates) {
    const list = await fetchDateList(code, candidate, 'lrb', '1', limit);
    if (list.ok) {
      companyTypeCache.set(code, candidate);
      return { companyType: candidate, how: candidate === detected ? 'detected' : 'probed', lrbAnnual: list };
    }
    last = list;
  }
  throw new EastmoneyEmptyError(
    `no report dates for ${code} (companyType ${candidates.join('/')})`,
    last ? describeResponse(last.res, !Array.isArray(last.res.json?.data)) : `${code} no DateAjaxNew response`
  );
}

interface StatementResult {
  records: Record<string, any>[];
  note?: string;
}

/**
 * 三大报表原始记录（新→旧）。参数组合与 akshare stock_three_report_em.py 一致：
 * - 年报：日期列表 reportDateType=1；数据 reportDateType=1、reportType=1；
 * - 单季（利润表 / 现金流量表）：日期列表 reportDateType=2；数据 reportDateType=0、reportType=2；
 * - 资产负债表按报告期：日期列表 0；数据 0 / 1。
 * 某一页没有 data 数组时跳过该页（不致命）。
 */
async function getStatementRecords(
  code: string,
  companyType: string,
  kind: StatementKind,
  frequency: 'annual' | 'quarter',
  maxDates: number,
  limit: Limiter,
  prefetched?: DateList | null
): Promise<StatementResult> {
  const annual = frequency === 'annual';
  const listType = annual ? '1' : kind === 'zcfzb' ? '0' : '2';
  const reportDateType = annual ? '1' : '0';
  const reportType = !annual && kind !== 'zcfzb' ? '2' : '1';
  const label = `${kind}/${frequency}`;

  const list = prefetched ?? (await fetchDateList(code, companyType, kind, listType, limit));
  const dates = list.dates.slice(0, maxDates);
  if (dates.length === 0) {
    return { records: [], note: `${label}: no dates (${describeResponse(list.res, !Array.isArray(list.res.json?.data)).slice(0, 160)})` };
  }

  const chunks: string[][] = [];
  for (let i = 0; i < dates.length; i += 5) chunks.push(dates.slice(i, i + 5));
  const pages = await Promise.all(
    chunks.map((chunk) =>
      limit(() =>
        fetchJson<any>(`${HSF10}/NewFinanceAnalysis/${kind}AjaxNew`, {
          companyType,
          reportDateType,
          reportType,
          dates: chunk.join(','),
          code,
        }, EMWEB_TIMEOUT_MS)
      )
    )
  );
  const skipped = pages.filter((page) => !Array.isArray(page.json?.data));
  const records = pages
    .flatMap((page) => (Array.isArray(page.json?.data) ? (page.json.data as unknown[]) : []))
    .filter(isObject)
    .sort((a, b) => emDate(b.REPORT_DATE).localeCompare(emDate(a.REPORT_DATE)));
  const note = skipped.length > 0 ? `${label}: ${skipped.length}/${pages.length} pages without data (${describeResponse(skipped[0], true).slice(0, 160)})` : undefined;
  return { records, note };
}

export interface CnStatementBundle {
  companyType: string;
  incomeAnnual: Record<string, any>[];
  balanceAnnual: Record<string, any>[];
  cashAnnual: Record<string, any>[];
  incomeQuarter: Record<string, any>[];
  balanceQuarter: Record<string, any>[];
  cashQuarter: Record<string, any>[];
  /** 诊断：'ctype=4(detected) annual=5/5/5 quarter=8/8/8'，后附各报表的异常说明 */
  diag: string;
}

/**
 * A 股三大报表（东财 F10）。emweb 请求同时最多 2 个在途：先年报，再（可选）单季。
 * 年报利润表为空时抛 EastmoneyEmptyError，调用方不会拿到「全部为空」的结果。
 * 资产负债表 / 现金流量表 / 单季数据出错只记入 diag，不影响年报利润表。
 */
export async function getCnStatements(
  symbol: string,
  options: { quarterly?: boolean } = { quarterly: true }
): Promise<CnStatementBundle> {
  const code = hsf10Code(symbol);
  const limit = createLimiter(2);
  const { companyType, how, lrbAnnual } = await resolveCompanyType(code, limit);
  const notes: string[] = [];

  const settle = async (label: string, task: Promise<StatementResult>): Promise<Record<string, any>[]> => {
    try {
      const result = await task;
      if (result.note) notes.push(result.note);
      return result.records;
    } catch (error: any) {
      notes.push(`${label}: ${String(error?.message || error).slice(0, 120)}`);
      return [];
    }
  };

  // 年报利润表的错误直接抛出；其余报表出错只记录
  const [incomeAnnualResult, balanceAnnual, cashAnnual] = await Promise.all([
    getStatementRecords(code, companyType, 'lrb', 'annual', 5, limit, lrbAnnual),
    settle('zcfzb/annual', getStatementRecords(code, companyType, 'zcfzb', 'annual', 5, limit)),
    settle('xjllb/annual', getStatementRecords(code, companyType, 'xjllb', 'annual', 5, limit)),
  ]);
  if (incomeAnnualResult.note) notes.unshift(incomeAnnualResult.note);
  const incomeAnnual = incomeAnnualResult.records;
  const ctypeLabel = `ctype=${companyType}(${how})`;

  if (incomeAnnual.length === 0) {
    throw new EastmoneyEmptyError(
      `no annual income rows for ${code}`,
      `${ctypeLabel} annual=0/${balanceAnnual.length}/${cashAnnual.length}${notes.length ? ` ${notes.join('; ')}` : ''}`
    );
  }

  let incomeQuarter: Record<string, any>[] = [];
  let balanceQuarter: Record<string, any>[] = [];
  let cashQuarter: Record<string, any>[] = [];
  const quarterly = options.quarterly !== false;
  if (quarterly) {
    [incomeQuarter, balanceQuarter, cashQuarter] = await Promise.all([
      settle('lrb/quarter', getStatementRecords(code, companyType, 'lrb', 'quarter', 8, limit)),
      settle('zcfzb/quarter', getStatementRecords(code, companyType, 'zcfzb', 'quarter', 8, limit)),
      settle('xjllb/quarter', getStatementRecords(code, companyType, 'xjllb', 'quarter', 8, limit)),
    ]);
  }

  const counts = (a: unknown[], b: unknown[], c: unknown[]) => `${a.length}/${b.length}/${c.length}`;
  const diag = [
    ctypeLabel,
    `annual=${counts(incomeAnnual, balanceAnnual, cashAnnual)}`,
    `quarter=${quarterly ? counts(incomeQuarter, balanceQuarter, cashQuarter) : 'off'}`,
    ...(notes.length > 0 ? [`notes: ${notes.join('; ')}`] : []),
  ].join(' ');

  return { companyType, incomeAnnual, balanceAnnual, cashAnnual, incomeQuarter, balanceQuarter, cashQuarter, diag };
}

// ==================== A 股主要指标（datacenter） ====================

const DATACENTER_GET = 'https://datacenter.eastmoney.com/securities/api/data/get';

/**
 * A 股主要财务指标（按报告期，全部公司类型通用），新→旧。
 * 参数同 akshare stock_financial_analysis_indicator_em；字段如 TOTALOPERATEREVE / MLR / PARENTNETPROFIT / EPSJB / EPSXS。
 * code 9201（查询结果为空）返回 []；其他无 result 的响应抛 EastmoneyEmptyError。
 */
export async function getMainFinaData(symbol: string): Promise<Record<string, any>[]> {
  const res = await fetchJson<any>(DATACENTER_GET, {
    type: 'RPT_F10_FINANCE_MAINFINADATA',
    sty: 'APP_F10_MAINFINADATA',
    quoteColumns: '',
    filter: `(SECUCODE="${cnSecucode(symbol)}")`,
    p: '1',
    ps: '200',
    sr: '-1',
    st: 'REPORT_DATE',
    source: 'HSF10',
    client: 'PC',
  }, 10_000);
  const json = res.json;
  if (Number(json?.code) === 9201) return [];
  const rows = json?.result?.data;
  if (!Array.isArray(rows)) {
    throw new EastmoneyEmptyError(
      `empty MAINFINADATA for ${cnSecucode(symbol)}${json?.message ? ` (${String(json.message).slice(0, 60)})` : ''}`,
      describeResponse(res, json?.result == null)
    );
  }
  return (rows as unknown[])
    .filter(isObject)
    .sort((a, b) => emDate(b.REPORT_DATE).localeCompare(emDate(a.REPORT_DATE)));
}

// ==================== A 股公司概况 ====================

export interface CnCompanySurvey {
  name: string;
  nameEn: string;
  industry: string;
  description: string;
  chairman: string;
  president: string;
  website: string;
  address: string;
  employees: number | null;
  listingDate: string;
}

/** 响应缺少 jbzl 键时抛 EastmoneyEmptyError；jbzl 存在但为空返回 null */
export async function getCnCompanySurvey(symbol: string): Promise<CnCompanySurvey | null> {
  const res = await fetchJson<any>(`${HSF10}/CompanySurvey/PageAjax`, { code: hsf10Code(symbol) }, 10_000);
  const json = res.json;
  if (!isObject(json) || !('jbzl' in json)) {
    throw new EastmoneyEmptyError(`empty company survey for ${symbol}`, describeResponse(res, true));
  }
  const info = Array.isArray(json.jbzl) ? json.jbzl[0] : json.jbzl;
  const issue = Array.isArray(json.fxxg) ? json.fxxg[0] : json.fxxg;
  if (!isObject(info)) return null;
  return {
    name: String(info.ORG_NAME ?? ''),
    nameEn: String(info.ORG_NAME_EN ?? ''),
    industry: String(info.EM2016 ?? info.INDUSTRYCSRC1 ?? ''),
    description: String(info.ORG_PROFILE ?? info.BUSINESS_SCOPE ?? '').trim(),
    chairman: String(info.CHAIRMAN ?? ''),
    president: String(info.PRESIDENT ?? ''),
    website: String(info.ORG_WEB ?? ''),
    address: String(info.REG_ADDRESS ?? info.ADDRESS ?? ''),
    employees: emNum(info.TOTAL_NUM ?? info.EMP_NUM),
    listingDate: emDate(issue?.LISTING_DATE),
  };
}

// ==================== 港股 / 美股 F10（datacenter） ====================

const DATACENTER = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';

/**
 * 参数与 akshare 保持一致；值为 undefined 的键不发送。
 * code 9201 表示查询结果为空（返回 []）。strict=true 时响应缺少 result.data 抛 EastmoneyEmptyError，否则返回 []。
 */
async function datacenter(params: Record<string, string | undefined>, strict = false): Promise<any[]> {
  const query: Record<string, string> = { quoteColumns: '', client: 'PC' };
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query[key] = value;
  }
  const res = await fetchJson<any>(DATACENTER, query);
  const json = res.json;
  if (Number(json?.code) === 9201) return [];
  if (json && json.success === false) {
    throw new EastmoneyError(
      `Eastmoney datacenter ${params.reportName}: ${String(json.message ?? json.code).slice(0, 120)}`,
      0,
      describeResponse(res, json?.result == null)
    );
  }
  if (Array.isArray(json?.result?.data)) return json.result.data;
  if (strict) throw new EastmoneyEmptyError(`empty datacenter ${params.reportName}`, describeResponse(res, json?.result == null));
  return [];
}

export interface LongFormRow {
  REPORT_DATE: string;
  DATE_TYPE_CODE?: string;
  STD_ITEM_CODE?: string;
  STD_ITEM_NAME: string;
  AMOUNT: number | string | null;
  FISCAL_YEAR?: string;
}

export interface HkReportPeriod {
  date: string;
  /** 年报 / 中报 / 一季报 / 三季报 */
  type: string;
  currency: string;
}

export interface HkStatementBundle {
  periods: HkReportPeriod[];
  income: LongFormRow[];
  balance: LongFormRow[];
  cashflow: LongFormRow[];
}

const hkSecucode = (symbol: string) => `${symbol.split('.')[0].padStart(5, '0')}.HK`;

/** 港股财报期列表（含币种：不少港股以人民币或美元报告） */
async function getHkReportPeriods(secucode: string): Promise<HkReportPeriod[]> {
  const rows = await datacenter({
    reportName: 'RPT_CUSTOM_HKSK_APPFN_CASHFLOW_SUMMARY',
    columns: 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,START_DATE,REPORT_DATE,FISCAL_YEAR,CURRENCY,ACCOUNT_STANDARD,REPORT_TYPE',
    filter: `(SECUCODE="${secucode}")`,
    source: 'F10',
  });
  const list: any[] = Array.isArray(rows[0]?.REPORT_LIST) ? rows[0].REPORT_LIST : [];
  return list
    .map((item) => ({
      date: emDate(item?.REPORT_DATE),
      type: String(item?.REPORT_TYPE ?? ''),
      currency: String(item?.CURRENCY ?? ''),
    }))
    .filter((p) => p.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

const HK_STATEMENT_COLUMNS = 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,ORG_CODE,REPORT_DATE,DATE_TYPE_CODE,FISCAL_YEAR,STD_ITEM_CODE,STD_ITEM_NAME,AMOUNT';

async function getHkStatementRows(reportName: string, filter: string): Promise<LongFormRow[]> {
  return datacenter({
    reportName,
    columns: reportName === 'RPT_HKF10_FN_BALANCE_PC' ? `${HK_STATEMENT_COLUMNS},STD_REPORT_DATE` : `${HK_STATEMENT_COLUMNS},START_DATE`,
    filter,
    pageNumber: '1',
    pageSize: '2000',
    sortTypes: '-1,1',
    sortColumns: 'REPORT_DATE,STD_ITEM_CODE',
    source: 'F10',
  });
}

/** 港股三大报表（长表：每行一个科目），最近 6 个年报期 */
export async function getHkStatements(symbol: string, annualLimit = 6): Promise<HkStatementBundle> {
  const secucode = hkSecucode(symbol);
  const periods = await getHkReportPeriods(secucode).catch((error) => {
    console.warn(`[Eastmoney] HK report list failed for ${secucode}:`, error?.message || error);
    return [] as HkReportPeriod[];
  });
  const annualDates = periods.filter((p) => p.type.includes('年报')).slice(0, annualLimit).map((p) => p.date);
  // 拿不到期列表时不加日期过滤，由归一化层按 DATE_TYPE_CODE=001 取年报
  const filter = annualDates.length > 0
    ? `(SECUCODE="${secucode}")(REPORT_DATE in ('${annualDates.join("','")}'))`
    : `(SECUCODE="${secucode}")`;
  const [income, balance, cashflow] = await Promise.all([
    getHkStatementRows('RPT_HKF10_FN_INCOME_PC', filter),
    getHkStatementRows('RPT_HKF10_FN_BALANCE_PC', filter),
    getHkStatementRows('RPT_HKF10_FN_CASHFLOW_PC', filter),
  ]);
  return { periods, income, balance, cashflow };
}

export interface F10CompanyProfile {
  name: string;
  nameEn: string;
  industry: string;
  description: string;
  chairman: string;
  website: string;
  address: string;
  employees: number | null;
  listingDate: string;
  fiscalYearEnd: string;
  /** 美股：东财 SECUCODE（TSLA.O / BABA.N），后缀可判断交易所 */
  secucode: string;
}

/** 公司资料响应缺少 result.data 时抛 EastmoneyEmptyError（证券资料有数据时除外）；查询结果为空返回 null */
export async function getHkProfile(symbol: string): Promise<F10CompanyProfile | null> {
  const secucode = hkSecucode(symbol);
  const filter = `(SECUCODE="${secucode}")`;
  const [org, sec] = await Promise.all([
    datacenter({
      reportName: 'RPT_HKF10_INFO_ORGPROFILE',
      columns: 'SECUCODE,SECURITY_CODE,ORG_NAME,ORG_EN_ABBR,BELONG_INDUSTRY,FOUND_DATE,CHAIRMAN,SECRETARY,ACCOUNT_FIRM,REG_ADDRESS,ADDRESS,YEAR_SETTLE_DAY,EMP_NUM,ORG_TEL,ORG_FAX,ORG_EMAIL,ORG_WEB,ORG_PROFILE,REG_PLACE',
      filter,
      pageNumber: '1',
      pageSize: '200',
      sortTypes: '',
      sortColumns: '',
      source: 'F10',
    }, true).then(
      (rows) => ({ rows, error: null as unknown }),
      (error: unknown) => ({ rows: [] as any[], error })
    ),
    datacenter({
      reportName: 'RPT_HKF10_INFO_SECURITYINFO',
      columns: 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,SECURITY_TYPE,LISTING_DATE,ISIN_CODE,BOARD,TRADE_UNIT,TRADE_MARKET,PAR_VALUE,ISSUE_PRICE,ISSUE_NUM,YEAR_SETTLE_DAY',
      filter,
      pageNumber: '1',
      pageSize: '200',
      sortTypes: '',
      sortColumns: '',
      source: 'F10',
    }).catch(() => [] as any[]),
  ]);
  const o = org.rows[0];
  const s = sec[0];
  // 机构资料为空响应、但证券资料有数据时仍可给出基础资料；其他错误照常抛出
  if (org.error && !(isEastmoneyEmptyError(org.error) && s)) throw org.error;
  if (!o && !s) return null;
  return {
    name: String(o?.ORG_NAME ?? s?.SECURITY_NAME_ABBR ?? ''),
    nameEn: String(o?.ORG_EN_ABBR ?? ''),
    industry: String(o?.BELONG_INDUSTRY ?? ''),
    description: String(o?.ORG_PROFILE ?? '').trim(),
    chairman: String(o?.CHAIRMAN ?? ''),
    website: String(o?.ORG_WEB ?? ''),
    address: String(o?.ADDRESS ?? o?.REG_ADDRESS ?? ''),
    employees: emNum(o?.EMP_NUM),
    listingDate: emDate(s?.LISTING_DATE),
    fiscalYearEnd: String(o?.YEAR_SETTLE_DAY ?? s?.YEAR_SETTLE_DAY ?? ''),
    secucode,
  };
}

/** 美股公司资料（中文简介）：FMP 不可用时的补充 */
export async function getUsProfile(symbol: string): Promise<F10CompanyProfile | null> {
  const code = symbol.toUpperCase().replace(/[.-]/g, '_');
  const rows = await datacenter({
    reportName: 'RPT_USF10_INFO_ORGPROFILE',
    columns: 'SECUCODE,SECURITY_CODE,ORG_CODE,SECURITY_INNER_CODE,ORG_NAME,ORG_EN_ABBR,BELONG_INDUSTRY,FOUND_DATE,CHAIRMAN,REG_PLACE,ADDRESS,EMP_NUM,ORG_TEL,ORG_FAX,ORG_EMAIL,ORG_WEB,ORG_PROFILE',
    filter: `(SECURITY_CODE="${code}")`,
    pageNumber: '1',
    pageSize: '200',
    sortTypes: '',
    sortColumns: '',
    source: 'SECURITIES',
  });
  const o = rows[0];
  if (!o) return null;
  return {
    name: String(o.ORG_NAME ?? ''),
    nameEn: String(o.ORG_EN_ABBR ?? ''),
    industry: String(o.BELONG_INDUSTRY ?? ''),
    description: String(o.ORG_PROFILE ?? '').trim(),
    chairman: String(o.CHAIRMAN ?? ''),
    website: String(o.ORG_WEB ?? ''),
    address: String(o.ADDRESS ?? ''),
    employees: emNum(o.EMP_NUM),
    listingDate: emDate(o.FOUND_DATE),
    fiscalYearEnd: '',
    secucode: String(o.SECUCODE ?? ''),
  };
}
