/**
 * 腾讯证券（gtimg）日 K 备用数据源（免费、无需 key）。
 *
 * 仅在东方财富不可用（例如海外机房拿到空数据）时作为 A 股 / 港股的价格与历史兜底。
 * 端点与参数参考 akshare（https://github.com/akfamily/akshare）：
 * - proxy.finance.qq.com/ifzqgtimg/appstock/app/newfqkline/get  A 股日 K（stock_feature/stock_hist_tx.py）
 * - web.ifzq.gtimg.cn/appstock/app/hkfqkline/get                港股日 K（stock/stock_zh_ah_tx.py, stock/cons.py）
 * 两者均返回 `kline_dayqfq2024={...}` 形式的正文，行数据位于 data.<code>.qfqday（部分代码为 day）。
 *
 * 不含实时行情：qt.gtimg.cn 的字段布局、编码和“代码不存在”时的返回在 akshare 中都没有依据，
 * 因此报价由最新两根日 K 推导（quoteFromBars），可能滞后一个交易日；名称、PE、PB、市值不提供。
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const CN_KLINE_URL = 'https://proxy.finance.qq.com/ifzqgtimg/appstock/app/newfqkline/get';
const HK_KLINE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get';

const TIMEOUT_MS = 10_000;
/** 每个窗口请求的最大 K 线数（akshare 固定用 640）；两个自然年约 490 个交易日 */
const WINDOW_BARS = 640;
const MAX_YEARS = 30;
const DAY_MS = 86_400_000;

export class TencentError extends Error {
  readonly status: number;
  readonly detail?: string;
  constructor(message: string, status = 0, detail?: string) {
    super(message);
    this.name = 'TencentError';
    this.status = status;
    this.detail = detail;
  }
}

export interface TencentBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** 成交量（股） */
  volume: number | null;
  /** 成交额（元）；港股为 null */
  amount: number | null;
}

// ==================== 代码映射 ====================

/** 无后缀 A 股代码的前缀表（stock_hist_tx.py:31-36；920 为北交所新代码段，与 markets.ts 一致） */
const SH_PREFIXES = ['600', '601', '603', '605', '688', '900'];
const SZ_PREFIXES = ['000', '001', '002', '003', '200', '300', '301'];
const BJ_PREFIXES = ['430', '440', '830', '831', '832', '833', '839', '920'];

/**
 * 站内代码 → 腾讯代码：600519.SS / 600519.SH → sh600519，000001.SZ → sz000001，xxxxxx.BJ → bjxxxxxx，
 * 0700.HK → hk00700（港股补足 5 位）。无法识别时返回 null。
 */
export function tencentCode(symbol: string, market: 'CN' | 'HK'): string | null {
  const upper = symbol.trim().toUpperCase();
  if (market === 'CN') {
    const prefixed = /^(SH|SZ|BJ)(\d{6})$/.exec(upper);
    if (prefixed) return `${prefixed[1].toLowerCase()}${prefixed[2]}`;
    const m = /^(\d{6})(?:\.(SS|SH|SZ|BJ))?$/.exec(upper);
    if (!m) return null;
    const [, code, suffix] = m;
    if (suffix === 'SS' || suffix === 'SH') return `sh${code}`;
    if (suffix === 'SZ') return `sz${code}`;
    if (suffix === 'BJ') return `bj${code}`;
    const head = code.slice(0, 3);
    if (SH_PREFIXES.includes(head)) return `sh${code}`;
    if (SZ_PREFIXES.includes(head)) return `sz${code}`;
    if (BJ_PREFIXES.includes(head)) return `bj${code}`;
    return null;
  }
  const m = /^(?:HK)?(\d{1,5})(?:\.HK)?$/.exec(upper);
  if (!m) return null;
  const digits = m[1].replace(/^0+/, '');
  return digits ? `hk${digits.padStart(5, '0')}` : null;
}

// ==================== 日 K ====================

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** 上海时间（UTC+8，无夏令时）的今天，偏移 days 天，返回 YYYY-MM-DD */
function shanghaiDate(offsetDays = 0): string {
  return new Date(Date.now() + 8 * 3_600_000 - offsetDays * DAY_MS).toISOString().slice(0, 10);
}

async function fetchWindow(url: string, code: string, startYear: number): Promise<unknown[]> {
  const start = `${startYear}-01-01`;
  const end = `${startYear + 1}-12-31`;
  const params = new URLSearchParams({
    _var: `kline_dayqfq${startYear}`,
    param: `${code},day,${start},${end},${WINDOW_BARS},qfq`,
    r: String(Math.random()),
  });
  const path = new URL(url).pathname;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let text: string;
  try {
    let response: Response;
    try {
      response = await fetch(`${url}?${params.toString()}`, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        signal: controller.signal,
        cache: 'no-store',
      });
    } catch (err) {
      const timedOut = controller.signal.aborted;
      const message = err instanceof Error ? err.message : String(err);
      throw new TencentError(timedOut ? `Tencent timeout ${path}` : `Tencent fetch failed ${path}`, 0, message);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new TencentError(`Tencent ${response.status} ${path}`, response.status, body.slice(0, 200));
    }
    try {
      text = await response.text();
    } catch (err) {
      const timedOut = controller.signal.aborted;
      const message = err instanceof Error ? err.message : String(err);
      throw new TencentError(timedOut ? `Tencent timeout ${path}` : `Tencent read failed ${path}`, response.status, message);
    }
  } finally {
    clearTimeout(timer);
  }

  // 正文形如 `kline_dayqfq2024={...}`；只接受“可选的变量赋值 + JSON 对象”，HTML 等一律视为异常
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  const prefixOk = i >= 0 && /^\s*(?:var\s+)?(?:[A-Za-z_$][\w$]*\s*=\s*)?$/.test(text.slice(0, i));
  const suffixOk = j > i && /^\s*;?\s*$/.test(text.slice(j + 1));
  if (!prefixOk || !suffixOk) {
    throw new TencentError(`Tencent non-JSON ${path}`, 200, text.slice(0, 200));
  }
  let json: any;
  try {
    json = JSON.parse(text.slice(i, j + 1));
  } catch {
    throw new TencentError(`Tencent unparseable JSON ${path}`, 200, text.slice(0, 200));
  }
  // 节点缺失（上市前的年份、未知代码）按“无数据”处理，不抛错（stock_zh_ah_tx.py:218-224）
  const node = json?.data?.[code];
  if (!node || typeof node !== 'object') return [];
  for (const key of ['qfqday', 'day', 'hfqday']) {
    const rows = node[key];
    if (Array.isArray(rows) && rows.length > 0) return rows;
  }
  return [];
}

interface RawBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  /** 万元（A 股第 8 列） */
  amountWan: number | null;
}

/** 行格式：[0] 日期 [1] 开 [2] 收 [3] 高 [4] 低 [5] 量 [6] 未知 [7] 换手率% [8] 成交额（万元） */
function parseRow(row: unknown, withAmount: boolean): RawBar | null {
  if (!Array.isArray(row)) return null;
  const date = typeof row[0] === 'string' ? row[0] : '';
  const close = num(row[2]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || close === null) return null;
  return {
    date,
    open: num(row[1]) ?? close,
    high: num(row[3]) ?? close,
    low: num(row[4]) ?? close,
    close,
    volume: num(row[5]),
    amountWan: withAmount && row.length > 8 ? num(row[8]) : null,
  };
}

/**
 * A 股成交量单位判定（akshare 的前缀规则会误伤普通 sz000xxx，不采用）：
 * 取最新 ≤20 根有效 K 线，k = median(成交额元 / (量 × 收盘价))。
 * k ∈ [30, 300] → 原始单位为手（×100）；k ∈ [0.3, 3] → 已是股（×1）；否则科创板 ×1，其余 ×100。
 */
function cnVolumeFactor(code: string, newestFirst: RawBar[]): number {
  const ratios: number[] = [];
  for (const bar of newestFirst) {
    if (ratios.length >= 20) break;
    const { volume, amountWan, close } = bar;
    if (volume !== null && volume > 0 && amountWan !== null && amountWan > 0 && close > 0) {
      ratios.push((amountWan * 10_000) / (volume * close));
    }
  }
  if (ratios.length > 0) {
    ratios.sort((a, b) => a - b);
    const mid = Math.floor(ratios.length / 2);
    const k = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
    if (k >= 30 && k <= 300) return 100;
    if (k >= 0.3 && k <= 3) return 1;
  }
  return code.startsWith('sh688') ? 1 : 100;
}

/**
 * 日 K（前复权），返回新→旧、按日期去重、只保留最近 `years` 年。
 * 以两个自然年为一个窗口（≤640 根）并行请求；节点缺失返回 []，HTTP 错误 / 超时 / 正文无法解析抛 TencentError。
 * A 股成交量统一为股、成交额为元；港股成交量本身是股，成交额为 null。
 */
export async function getTencentDailyBars(symbol: string, market: 'CN' | 'HK', years = 5): Promise<TencentBar[]> {
  const code = tencentCode(symbol, market);
  if (!code || !Number.isFinite(years) || years <= 0) return [];
  const span = Math.min(years, MAX_YEARS);
  const today = shanghaiDate();
  const cutoff = shanghaiDate(Math.ceil(span * 365));
  const currentYear = Number(today.slice(0, 4));
  const cutoffYear = Number(cutoff.slice(0, 4));

  // 窗口 [Y-1, Y]、[Y-3, Y-2]…，直到覆盖截止日期所在年份
  const startYears: number[] = [];
  for (let start = currentYear - 1; ; start -= 2) {
    startYears.push(start);
    if (start <= cutoffYear) break;
  }

  const url = market === 'CN' ? CN_KLINE_URL : HK_KLINE_URL;
  const windows = await Promise.all(startYears.map((start) => fetchWindow(url, code, start)));

  const byDate = new Map<string, RawBar>();
  for (const rows of windows) {
    for (const row of rows) {
      const bar = parseRow(row, market === 'CN');
      if (bar && bar.date >= cutoff && !byDate.has(bar.date)) byDate.set(bar.date, bar);
    }
  }
  const raw = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (raw.length === 0) return [];

  const factor = market === 'CN' ? cnVolumeFactor(code, raw) : 1;
  return raw.map((bar) => ({
    date: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume === null ? null : bar.volume * factor,
    amount: bar.amountWan === null ? null : bar.amountWan * 10_000,
  }));
}

// ==================== 推导报价 ====================

export interface TencentQuote {
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  /** 股 */
  volume: number | null;
  /** 元；港股为 null */
  amount: number | null;
  /** 最新 K 线日期（YYYY-MM-DD）；盘中可能仍是上一交易日 */
  asOf: string;
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/** 由最新两根日 K 推导报价（前复权不改变最新价）；没有可用 K 线时返回 null */
export function quoteFromBars(bars: TencentBar[]): TencentQuote | null {
  const sorted = bars
    .filter((b) => b && Number.isFinite(b.close) && b.close > 0)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const last = sorted[0];
  if (!last) return null;
  const prev = sorted[1];
  const previousClose = prev ? prev.close : null;
  const change = previousClose !== null ? round(last.close - previousClose, 6) : null;
  const changePercent = previousClose !== null ? round(((last.close - previousClose) / previousClose) * 100, 4) : null;
  const finite = (v: number | null) => (v !== null && Number.isFinite(v) ? v : null);
  return {
    price: last.close,
    previousClose,
    change,
    changePercent,
    open: finite(last.open),
    high: finite(last.high),
    low: finite(last.low),
    volume: finite(last.volume),
    amount: finite(last.amount),
    asOf: last.date,
  };
}
