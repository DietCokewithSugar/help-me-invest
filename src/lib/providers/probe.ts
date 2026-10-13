/**
 * 数据源连通性探针（供 GET /api/health/providers?raw=1 使用）。
 *
 * 绕过各 provider 的解析与降级逻辑，直接请求行情 / 财报端点，记录 HTTP 状态、耗时、
 * 字节数和响应开头，并给出一行结构摘要（rc、data 是否为空、条数、字段名等）。
 * 用一次调用区分：出口被整体屏蔽（美股对照也为空）、仅 A 股被过滤、其它数据源是否可达。
 *
 * - 每个探针独立超时（默认 8s），全部并行；任何情况下都不抛错。
 * - 不带任何密钥；SEC 只要求声明 User-Agent。
 * - 东财行情域名与 eastmoney.ts 一样带 quote.eastmoney.com Referer，其余端点与 akshare 一致不带。
 */

export interface ProbeResult {
  url: string;
  /** HTTP 状态；连接失败 / 超时前未拿到响应时为 null */
  status: number | null;
  /** 含读取响应体的总耗时 */
  ms: number;
  /** HTTP 2xx 且读取响应体未出错 */
  ok: boolean;
  /** 实际读取的响应体字节数 */
  bytes: number;
  /** 解码后响应体的前 300 个字符（空白折叠、去掉控制字符） */
  snippet: string;
  /** content-type、跳转、截断、解码器回退等附加信息 */
  note?: string;
  error?: string;
}

export interface ProbeInit {
  headers?: Record<string, string>;
  timeoutMs?: number;
  decode?: 'utf8' | 'gb18030';
}

export type HostProbe = ProbeResult & { summary?: string };

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
const SEC_USER_AGENT = process.env.SEC_USER_AGENT?.trim() || 'HelpMeInvest admin@help-me-invest.com';

const DEFAULT_TIMEOUT_MS = 8_000;
const SNIPPET_CHARS = 300;
const SUMMARY_CHARS = 1_000;
/** 防止异常大的响应占满内存；SEC company_tickers.json 约 1MB */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

// ==================== 通用探针 ====================

/** 空白折叠为单个空格，再去掉其余控制字符（C0 / DEL / C1） */
function cleanSnippet(text: string, max = SNIPPET_CHARS): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  let out = '';
  for (let i = 0; i < collapsed.length && out.length < max; i++) {
    const code = collapsed.charCodeAt(i);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0xfeff) continue;
    out += collapsed[i];
  }
  return out;
}

function describeFetchError(error: any, timedOut: boolean, timeoutMs: number, phase: 'connect' | 'body'): string {
  if (timedOut) return `timeout after ${timeoutMs}ms${phase === 'body' ? ' (while reading body)' : ''}`;
  const name = String(error?.name || 'Error');
  const message = String(error?.message || error || 'unknown error');
  // undici 把底层原因放在 cause（ENOTFOUND / ECONNRESET / UND_ERR_CONNECT_TIMEOUT 等）
  const cause = error?.cause;
  const causeText = cause ? String(cause.code || cause.message || cause) : '';
  return `${name}: ${message}${causeText && causeText !== message ? ` (${causeText})` : ''}`.slice(0, 300);
}

async function readBody(response: Response, maxBytes: number): Promise<{ data: Uint8Array; truncated: boolean }> {
  if (!response.body) return { data: new Uint8Array(0), truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.byteLength === 0) continue;
    if (size + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - size));
      size = maxBytes;
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
    size += value.byteLength;
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { data, truncated };
}

function decodeBody(data: Uint8Array, decode: ProbeInit['decode']): { text: string; note?: string } {
  if (decode === 'gb18030') {
    try {
      return { text: new TextDecoder('gb18030').decode(data) };
    } catch {
      // 运行时缺少完整 ICU 时没有 GBK 解码器
      return { text: new TextDecoder('utf-8').decode(data), note: 'gb18030 decoder unavailable, decoded as utf-8' };
    }
  }
  return { text: new TextDecoder('utf-8').decode(data) };
}

async function probeWithBody(url: string, init: ProbeInit = {}): Promise<{ result: ProbeResult; text: string }> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  let status: number | null = null;
  let phase: 'connect' | 'body' = 'connect';
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*', ...init.headers },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });
    status = response.status;
    phase = 'body';
    const notes: string[] = [];
    const contentType = response.headers.get('content-type');
    if (contentType) notes.push(`type=${contentType}`);
    if (response.redirected && response.url && response.url !== url) notes.push(`redirected to ${response.url}`);
    const body = await readBody(response, MAX_BODY_BYTES);
    if (body.truncated) notes.push(`body truncated at ${MAX_BODY_BYTES} bytes`);
    const decoded = decodeBody(body.data, init.decode);
    if (decoded.note) notes.push(decoded.note);
    return {
      result: {
        url,
        status,
        ms: Date.now() - started,
        ok: response.ok,
        bytes: body.data.byteLength,
        snippet: cleanSnippet(decoded.text),
        ...(notes.length > 0 ? { note: notes.join('; ') } : {}),
      },
      text: decoded.text,
    };
  } catch (error: any) {
    return {
      result: {
        url,
        status,
        ms: Date.now() - started,
        ok: false,
        bytes: 0,
        snippet: '',
        error: describeFetchError(error, timedOut, timeoutMs, phase),
      },
      text: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** 请求一个 URL 并记录状态 / 耗时 / 字节数 / 响应开头。从不抛错。 */
export async function probeUrl(url: string, init?: ProbeInit): Promise<ProbeResult> {
  return (await probeWithBody(url, init)).result;
}

// ==================== 响应摘要 ====================

/** 解析 JSON；兼容 JSONP（cb({...})）与 `var x={...};` 包装。失败返回 undefined。 */
function parseLoose(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    // 继续尝试去掉包装
  }
  const start = trimmed.search(/[{[]/);
  const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function keysOf(value: unknown, max = 12): string {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (!isObject(value)) return value === null ? 'null' : typeof value;
  const keys = Object.keys(value);
  return keys.length > 0 ? keys.slice(0, max).join(',') : '(none)';
}

/** 非 JSON 时给出 HTML 标题，便于识别拦截页 */
function notJson(text: string): string {
  const title = text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  return `not JSON${title ? ` title=${cleanSnippet(title, 80)}` : ''}`;
}

type Summarize = (text: string, json: any) => string;

/** push2 / push2delay stock/get */
const summarizeQuote: Summarize = (text, json) => {
  if (!isObject(json)) return notJson(text);
  const head = `rc=${json.rc ?? '-'}`;
  const d = json.data;
  if (!isObject(d)) return `${head} data=${d === undefined ? 'missing' : JSON.stringify(d)} keys=${keysOf(json)}`;
  return `${head} f57=${d.f57 ?? '-'} f58=${d.f58 ?? '-'} f43=${d.f43 ?? '-'}`;
};

/** push2his kline/get */
const summarizeKline: Summarize = (text, json) => {
  if (!isObject(json)) return notJson(text);
  const head = `rc=${json.rc ?? '-'}`;
  const d = json.data;
  if (!isObject(d)) return `${head} data=${d === undefined ? 'missing' : JSON.stringify(d)} keys=${keysOf(json)}`;
  const klines: unknown[] = Array.isArray(d.klines) ? d.klines : [];
  return `${head} name=${d.name ?? '-'} klines=${klines.length}${klines.length ? ` last=${String(klines[klines.length - 1])}` : ''}`;
};

/** F10 NewFinanceAnalysis/Index（HTML）：公司类型藏在 <input id="hidctype" value="4"> */
const summarizeF10Index: Summarize = (text) => {
  const tag = text.match(/<input[^>]*\bid=["']?hidctype["']?[^>]*>/i)?.[0];
  const value = tag?.match(/\bvalue=["']?(\d)/)?.[1];
  const title = text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  return [
    `htmlLen=${text.length}`,
    `hidctype=${tag ? value ?? '(no value)' : 'not found'}`,
    ...(title ? [`title=${cleanSnippet(title, 80)}`] : []),
  ].join(' ');
};

/** F10 lrbDateAjaxNew：{"data":[{"REPORT_DATE":"2024-12-31 00:00:00",...}]} */
const summarizeF10Dates: Summarize = (text, json) => {
  if (json === undefined) return notJson(text);
  const rows = isObject(json) && Array.isArray(json.data) ? json.data : null;
  if (!rows) return `no data array keys=${keysOf(json)}`;
  const first = isObject(rows[0]) ? rows[0].REPORT_DATE : undefined;
  return `rows=${rows.length}${first ? ` first=${first}` : ''}`;
};

/** datacenter securities/api/data/get：{result:{data:[...],count}, success, code, message} */
const summarizeDatacenter: Summarize = (text, json) => {
  if (!isObject(json)) return notJson(text);
  const rows = isObject(json.result) && Array.isArray(json.result.data) ? json.result.data : null;
  if (!rows) return `result=null code=${json.code ?? '-'} success=${json.success ?? '-'} message=${json.message ?? '-'}`;
  const first = rows[0];
  return `count=${rows.length} total=${json.result.count ?? '-'} keys=${isObject(first) ? Object.keys(first).slice(0, 20).join(',') : '-'}`;
};

/** searchapi suggest/get：{QuotationCodeTable:{Data:[{Code,Name,QuoteID,...}]}} */
const summarizeSearch: Summarize = (text, json) => {
  if (!isObject(json)) return notJson(text);
  const table = json.QuotationCodeTable;
  const rows = isObject(table) && Array.isArray(table.Data) ? table.Data : null;
  if (!rows) return `no QuotationCodeTable.Data keys=${keysOf(json)}${isObject(table) ? ` table=${keysOf(table)}` : ''}`;
  const first = isObject(rows[0]) ? rows[0] : null;
  return `hits=${rows.length}${first ? ` first=${first.QuoteID ?? '-'} ${first.Name ?? ''}` : ''}`;
};

/** Tencent newfqkline / hkfqkline：kline_dayqfq={"code":0,"data":{"sh600519":{"qfqday":[[...]]}}} */
function summarizeTencent(key: string): Summarize {
  return (text, json) => {
    if (!isObject(json)) return notJson(text);
    const node = isObject(json.data) ? json.data[key] : undefined;
    const rows = isObject(node) ? node.qfqday ?? node.day ?? node.hfqday : undefined;
    if (!Array.isArray(rows)) {
      return `code=${json.code ?? '-'} msg=${json.msg ?? '-'} no rows (data=${keysOf(json.data)}${isObject(node) ? ` node=${keysOf(node)}` : ''})`;
    }
    const fmt = (row: unknown) => JSON.stringify(row);
    return `rows=${rows.length}${rows.length ? ` first=${fmt(rows[0])}` : ''}${rows.length > 1 ? ` last=${fmt(rows[rows.length - 1])}` : ''}`;
  };
}

/** Sina getFinanceReport2022：result.data.report_date[].date_value + report_list[date].data[].item_title */
const summarizeSinaReport: Summarize = (text, json) => {
  if (!isObject(json)) return notJson(text);
  const result = json.result;
  const data = isObject(result) ? result.data : undefined;
  const dates = isObject(data) && Array.isArray(data.report_date) ? data.report_date : null;
  if (!dates) {
    return `no report_date status=${isObject(result) ? JSON.stringify(result.status ?? null) : '-'} data=${keysOf(data)}`;
  }
  const firstDate = isObject(dates[0]) ? String(dates[0].date_value ?? '') : '';
  const list = isObject(data.report_list) ? data.report_list : {};
  const items = isObject(list[firstDate]) && Array.isArray(list[firstDate].data) ? list[firstDate].data : [];
  const titles = items
    .slice(0, 40)
    .map((item: unknown) => (isObject(item) ? String(item.item_title ?? '') : ''))
    .filter(Boolean);
  return `periods=${dates.length} first=${firstDate || '-'} items=${items.length} titles=${titles.join('|')}`;
};

/** hq.sinajs.cn：var hq_str_sh600519="贵州茅台,1690.000,...";（GBK） */
const summarizeSinaHq: Summarize = (text) => {
  const payload = text.match(/hq_str_[\w.]+="([^"]*)"/)?.[1];
  if (payload === undefined) return `no hq_str payload${/<html/i.test(text) ? ` (${notJson(text)})` : ''}`;
  if (payload === '') return 'fields=0 (empty payload)';
  const fields = payload.split(',');
  return `fields=${fields.length} name=${fields[0]}`;
};

/** Frankfurter：{"amount":1,"base":"HKD","date":"...","rates":{"CNY":0.91}} */
const summarizeFx: Summarize = (text, json) => {
  if (!isObject(json)) return notJson(text);
  return `date=${json.date ?? '-'} rates=${JSON.stringify(json.rates ?? null)}`;
};

// ==================== 按代码构造探针 ====================

interface ProbeTarget {
  market: 'CN' | 'HK' | 'US' | 'OTHER';
  /** 600519 / 00700 / AAPL */
  code: string;
  /** 东财 secid：1.600519 / 0.000001 / 116.00700 / 105.AAPL */
  secid: string | null;
  /** 腾讯 / 新浪 / F10 Index 用的小写前缀代码：sh600519 / hk00700 */
  prefixed: string | null;
  /** F10 Ajax 用的大写前缀代码：SH600519 */
  hsf10: string | null;
  /** datacenter SECUCODE：600519.SH */
  secucode: string | null;
}

function resolveTarget(symbol: string): ProbeTarget {
  const upper = symbol.trim().toUpperCase();
  const suffixed = upper.match(/^(\d{6})(?:\.(SS|SH|SZ|BJ))?$/);
  const prefixedCn = upper.match(/^(SH|SZ|BJ)(\d{6})$/);
  if (suffixed || prefixedCn) {
    const code = suffixed ? suffixed[1] : prefixedCn![2];
    const tag = suffixed ? suffixed[2] : prefixedCn![1];
    let exchange: 'sh' | 'sz' | 'bj';
    if (tag === 'SS' || tag === 'SH') exchange = 'sh';
    else if (tag === 'SZ') exchange = 'sz';
    else if (tag === 'BJ') exchange = 'bj';
    // 无后缀：92 / 4 / 8 开头为北交所，6 / 9 开头为上交所，其余深交所
    else if (code.startsWith('92') || code.startsWith('4') || code.startsWith('8')) exchange = 'bj';
    else if (code.startsWith('6') || code.startsWith('9')) exchange = 'sh';
    else exchange = 'sz';
    const upperExchange = exchange.toUpperCase();
    return {
      market: 'CN',
      code,
      secid: `${exchange === 'sh' ? '1' : '0'}.${code}`,
      prefixed: `${exchange}${code}`,
      hsf10: `${upperExchange}${code}`,
      secucode: `${code}.${upperExchange}`,
    };
  }
  const hk = upper.match(/^(\d{1,5})\.HK$/);
  if (hk) {
    const code = hk[1].padStart(5, '0');
    return { market: 'HK', code, secid: `116.${code}`, prefixed: `hk${code}`, hsf10: null, secucode: null };
  }
  if (/^[A-Z][A-Z0-9]{0,9}(?:[.-][A-Z])?$/.test(upper)) {
    // 东财美股：105 NASDAQ（106 NYSE / 107 AMEX 时 data 为空属正常），类别股用下划线
    return { market: 'US', code: upper, secid: `105.${upper.replace(/[.-]/g, '_')}`, prefixed: null, hsf10: null, secucode: null };
  }
  return { market: 'OTHER', code: upper, secid: null, prefixed: null, hsf10: null, secucode: null };
}

interface ProbeSpec {
  key: string;
  url: string;
  init?: ProbeInit;
  summarize?: Summarize;
  /** 只报告状态与字节数（不返回响应开头） */
  statusOnly?: boolean;
}

function withQuery(base: string, params: Record<string, string>): string {
  return `${base}?${new URLSearchParams(params).toString()}`;
}

const EM_QUOTE_FIELDS = 'f43,f57,f58';
const EM_QUOTE_HEADERS = { Referer: 'https://quote.eastmoney.com/', Accept: 'application/json,text/plain,*/*' };
const EM_JSON_HEADERS = { Accept: 'application/json,text/plain,*/*' };
const EM_KLINE_UT = '7eea3edcaed734bea9cbfc24409ed989';
const EM_SEARCH_TOKEN = 'D43BF722C8E33BDC906FB84D85E326E8';
const HSF10 = 'https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis';

function emQuoteUrl(host: string, secid: string): string {
  return withQuery(`${host}/api/qt/stock/get`, { secid, fields: EM_QUOTE_FIELDS, fltt: '2', invt: '2' });
}

function buildSpecs(target: ProbeTarget): ProbeSpec[] {
  const specs: ProbeSpec[] = [];
  const { secid, prefixed, hsf10, secucode } = target;

  if (secid) {
    specs.push({ key: 'em_quote', url: emQuoteUrl('https://push2.eastmoney.com', secid), init: { headers: EM_QUOTE_HEADERS }, summarize: summarizeQuote });
  }
  specs.push(
    { key: 'em_quote_control', url: emQuoteUrl('https://push2.eastmoney.com', '1.600000'), init: { headers: EM_QUOTE_HEADERS }, summarize: summarizeQuote },
    { key: 'em_quote_us_control', url: emQuoteUrl('https://push2.eastmoney.com', '105.AAPL'), init: { headers: EM_QUOTE_HEADERS }, summarize: summarizeQuote }
  );
  if (secid) {
    specs.push(
      { key: 'em_quote_delay', url: emQuoteUrl('https://push2delay.eastmoney.com', secid), init: { headers: EM_QUOTE_HEADERS }, summarize: summarizeQuote },
      {
        key: 'em_kline',
        url: withQuery('https://push2his.eastmoney.com/api/qt/stock/kline/get', {
          secid,
          ut: EM_KLINE_UT,
          fields1: 'f1,f2,f3,f4,f5,f6',
          fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
          klt: '101',
          fqt: '1',
          lmt: '5',
          end: '20500101',
        }),
        init: { headers: EM_QUOTE_HEADERS },
        summarize: summarizeKline,
      }
    );
  }

  if (target.market === 'CN' && prefixed && hsf10 && secucode) {
    specs.push(
      {
        key: 'em_f10_index',
        url: withQuery(`${HSF10}/Index`, { type: 'web', code: prefixed }),
        init: { headers: { Accept: 'text/html,application/xhtml+xml,*/*' } },
        summarize: summarizeF10Index,
      },
      {
        key: 'em_f10_dates',
        url: withQuery(`${HSF10}/lrbDateAjaxNew`, { companyType: '4', reportDateType: '1', code: hsf10 }),
        init: { headers: EM_JSON_HEADERS },
        summarize: summarizeF10Dates,
      },
      {
        key: 'em_datacenter',
        url: withQuery('https://datacenter.eastmoney.com/securities/api/data/get', {
          type: 'RPT_F10_FINANCE_MAINFINADATA',
          sty: 'APP_F10_MAINFINADATA',
          quoteColumns: '',
          filter: `(SECUCODE="${secucode}")`,
          p: '1',
          ps: '5',
          sr: '-1',
          st: 'REPORT_DATE',
          source: 'HSF10',
          client: 'PC',
        }),
        init: { headers: EM_JSON_HEADERS },
        summarize: summarizeDatacenter,
      }
    );
  }

  if (target.market !== 'OTHER') {
    specs.push({
      key: 'em_search',
      url: withQuery('https://searchapi.eastmoney.com/api/suggest/get', {
        input: target.code,
        type: '14',
        token: EM_SEARCH_TOKEN,
        count: '5',
      }),
      init: { headers: EM_JSON_HEADERS },
      summarize: summarizeSearch,
    });
  }

  if (target.market === 'CN' && prefixed) {
    specs.push({
      key: 'tencent_kline',
      url: withQuery('https://proxy.finance.qq.com/ifzqgtimg/appstock/app/newfqkline/get', {
        _var: 'kline_dayqfq',
        param: `${prefixed},day,,,5,qfq`,
      }),
      summarize: summarizeTencent(prefixed),
    });
  } else if (target.market === 'HK' && prefixed) {
    specs.push({
      key: 'tencent_kline',
      url: withQuery('https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get', {
        _var: 'kline_dayqfq',
        param: `${prefixed},day,,,5,qfq`,
      }),
      summarize: summarizeTencent(prefixed),
    });
  }

  if (target.market === 'CN' && prefixed) {
    specs.push(
      {
        key: 'sina_report',
        url: withQuery('https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022', {
          paperCode: prefixed,
          source: 'lrb',
          type: '0',
          page: '1',
          num: '10',
        }),
        summarize: summarizeSinaReport,
      },
      {
        key: 'sina_hq',
        url: `https://hq.sinajs.cn/list=${prefixed}`,
        init: { headers: { Referer: 'https://finance.sina.com.cn/' }, decode: 'gb18030' },
        summarize: summarizeSinaHq,
      }
    );
  }

  specs.push(
    { key: 'frankfurter', url: 'https://api.frankfurter.dev/v1/latest?base=HKD&symbols=CNY', summarize: summarizeFx },
    {
      key: 'sec',
      url: 'https://www.sec.gov/files/company_tickers.json',
      init: { headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' } },
      statusOnly: true,
    }
  );
  return specs;
}

async function runSpec(spec: ProbeSpec): Promise<HostProbe> {
  const { result, text } = await probeWithBody(spec.url, { timeoutMs: DEFAULT_TIMEOUT_MS, ...spec.init });
  if (spec.statusOnly) return { ...result, snippet: '' };
  if (!spec.summarize || result.error || result.bytes === 0) return result;
  let summary: string;
  try {
    summary = spec.summarize(text, parseLoose(text));
  } catch (error: any) {
    summary = `summary failed: ${String(error?.message || error)}`;
  }
  return { ...result, summary: summary.slice(0, SUMMARY_CHARS) };
}

/**
 * 并行探测行情 / 财报相关域名（每个 8s 超时），键名固定、顺序固定。
 * A 股（600519.SS / 000001.SZ / 430017.BJ）跑全部探针；港股（0700.HK）与美股（AAPL）
 * 只跑适用的探针（东财行情 / 日 K / 搜索、腾讯港股日 K）；其它市场只跑对照与公共探针。
 * 对照组固定：1.600000（A 股）与 105.AAPL（美股）、Frankfurter、SEC。
 */
export async function probeMarketHosts(symbol: string): Promise<Record<string, HostProbe>> {
  const specs = buildSpecs(resolveTarget(symbol));
  const results = await Promise.all(
    specs.map((spec) =>
      runSpec(spec).catch(
        (error: any): HostProbe => ({
          url: spec.url,
          status: null,
          ms: 0,
          ok: false,
          bytes: 0,
          snippet: '',
          error: `probe crashed: ${String(error?.message || error)}`,
        })
      )
    )
  );
  const out: Record<string, HostProbe> = {};
  specs.forEach((spec, index) => {
    out[spec.key] = results[index];
  });
  return out;
}
