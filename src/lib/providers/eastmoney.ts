/**
 * 东方财富（Eastmoney）行情与 F10 数据（免费、无需 key）。
 *
 * 覆盖：A 股 / 港股 / 美股的实时行情与日 K；A 股与港股的公司资料和三大报表。
 * 端点与参数参考 akshare（https://github.com/akfamily/akshare）中的实现：
 * - push2.eastmoney.com/api/qt/stock/get           个股行情快照（secid = 市场.代码）
 * - push2his.eastmoney.com/api/qt/stock/kline/get  日 K
 * - emweb.securities.eastmoney.com/PC_HSF10/...    A 股公司概况与三大报表
 * - datacenter.eastmoney.com/securities/api/data/v1/get  港股 / 美股 F10 数据集
 * - searchapi.eastmoney.com/api/suggest/get        代码 / 名称联想
 */

import type { MarketType } from '@/lib/markets';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const DEFAULT_TIMEOUT_MS = 12_000;

export class EastmoneyError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'EastmoneyError';
    this.status = status;
  }
}

async function request(url: string, params: Record<string, string>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}?${new URLSearchParams(params).toString()}`, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json,text/plain,*/*',
        Referer: 'https://quote.eastmoney.com/',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new EastmoneyError(`Eastmoney ${response.status} ${new URL(url).pathname}`, response.status);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T = any>(url: string, params: Record<string, string>, timeoutMs?: number): Promise<T> {
  const response = await request(url, params, timeoutMs);
  const text = await response.text();
  // 部分端点即便 Accept JSON 也可能返回 JSONP（jQuery123(...)）
  const json = text.trim().startsWith('{') || text.trim().startsWith('[')
    ? text
    : text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
  return JSON.parse(json) as T;
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

// ==================== 行情 ====================

const QUOTE_FIELDS = [
  'f43', 'f44', 'f45', 'f46', 'f47', 'f48', 'f57', 'f58', 'f60', 'f84', 'f85', 'f116', 'f117',
  'f162', 'f163', 'f164', 'f167', 'f168', 'f169', 'f170', 'f127', 'f128', 'f174', 'f175', 'f189',
].join(',');

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

function toIsoDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return '';
}

export async function getQuote(secid: string): Promise<EastmoneyQuote | null> {
  const json = await getJson<any>('https://push2.eastmoney.com/api/qt/stock/get', {
    secid,
    fields: QUOTE_FIELDS,
    fltt: '2',
    invt: '2',
  });
  const d = json?.data;
  const price = emNum(d?.f43);
  if (!d || price === null || price <= 0) return null;
  return {
    secid,
    code: String(d.f57 ?? ''),
    name: String(d.f58 ?? ''),
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
    listingDate: toIsoDate(d.f189),
  };
}

/** 依次尝试候选 secid（美股交易所未知），返回第一个有报价的 */
export async function resolveQuote(symbol: string, market: MarketType): Promise<EastmoneyQuote | null> {
  const candidates = secidCandidates(symbol, market);
  if (candidates.length === 0) return null;
  const results = await Promise.allSettled(candidates.map((secid) => getQuote(secid)));
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) return result.value;
  }
  const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  if (failure) throw failure.reason;
  return null;
}

export interface EastmoneyBar {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/** 日 K（前复权），返回新→旧 */
export async function getDailyKline(secid: string, years = 5): Promise<EastmoneyBar[]> {
  const begin = new Date();
  begin.setFullYear(begin.getFullYear() - years);
  const json = await getJson<any>('https://push2his.eastmoney.com/api/qt/stock/kline/get', {
    secid,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57',
    klt: '101',
    fqt: '1',
    beg: begin.toISOString().slice(0, 10).replace(/-/g, ''),
    end: '20500101',
  }, 15_000);
  const lines: string[] = Array.isArray(json?.data?.klines) ? json.data.klines : [];
  const bars: EastmoneyBar[] = [];
  for (const line of lines) {
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
  const rows: any[] = json?.QuotationCodeTable?.Data ?? [];
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

/** 公司类型：4 一般企业 / 3 银行 / 2 保险 / 1 券商，不同类型的报表字段不同 */
async function getCompanyType(code: string): Promise<string> {
  const response = await request(`${HSF10}/NewFinanceAnalysis/Index`, { type: 'web', code: code.toLowerCase() });
  const html = await response.text();
  const match = html.match(/id="hidctype"\s+value="(\d+)"/) || html.match(/value="(\d+)"\s+id="hidctype"/);
  return match?.[1] ?? '4';
}

type StatementKind = 'zcfzb' | 'lrb' | 'xjllb';

/**
 * 三大报表原始记录（新→旧）。
 * frequency=annual：年报；frequency=quarter：利润表 / 现金流量表为单季，资产负债表为各报告期末。
 */
async function getStatementRecords(
  code: string,
  companyType: string,
  kind: StatementKind,
  frequency: 'annual' | 'quarter',
  limit: number
): Promise<Record<string, any>[]> {
  const reportDateType = frequency === 'annual' ? '1' : '0';
  const dateJson = await getJson<any>(`${HSF10}/NewFinanceAnalysis/${kind}DateAjaxNew`, {
    companyType,
    reportDateType,
    code,
  });
  const dates: string[] = (dateJson?.data ?? [])
    .map((row: any) => String(row?.REPORT_DATE ?? '').slice(0, 10))
    .filter(Boolean)
    .slice(0, limit);
  if (dates.length === 0) return [];

  const reportType = frequency === 'quarter' && kind !== 'zcfzb' ? '2' : '1';
  const chunks: string[][] = [];
  for (let i = 0; i < dates.length; i += 5) chunks.push(dates.slice(i, i + 5));
  const pages = await Promise.all(
    chunks.map((chunk) =>
      getJson<any>(`${HSF10}/NewFinanceAnalysis/${kind}AjaxNew`, {
        companyType,
        reportDateType,
        reportType,
        dates: chunk.join(','),
        code,
      })
    )
  );
  return pages
    .flatMap((page) => (Array.isArray(page?.data) ? page.data : []))
    .sort((a, b) => String(b?.REPORT_DATE ?? '').localeCompare(String(a?.REPORT_DATE ?? '')));
}

export interface CnStatementBundle {
  companyType: string;
  incomeAnnual: Record<string, any>[];
  balanceAnnual: Record<string, any>[];
  cashAnnual: Record<string, any>[];
  incomeQuarter: Record<string, any>[];
  balanceQuarter: Record<string, any>[];
  cashQuarter: Record<string, any>[];
}

export async function getCnStatements(symbol: string): Promise<CnStatementBundle> {
  const code = hsf10Code(symbol);
  const companyType = await getCompanyType(code);
  const [incomeAnnual, balanceAnnual, cashAnnual, incomeQuarter, balanceQuarter, cashQuarter] = await Promise.all([
    getStatementRecords(code, companyType, 'lrb', 'annual', 5),
    getStatementRecords(code, companyType, 'zcfzb', 'annual', 5),
    getStatementRecords(code, companyType, 'xjllb', 'annual', 5),
    getStatementRecords(code, companyType, 'lrb', 'quarter', 8),
    getStatementRecords(code, companyType, 'zcfzb', 'quarter', 8),
    getStatementRecords(code, companyType, 'xjllb', 'quarter', 8),
  ]);
  return { companyType, incomeAnnual, balanceAnnual, cashAnnual, incomeQuarter, balanceQuarter, cashQuarter };
}

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

export async function getCnCompanySurvey(symbol: string): Promise<CnCompanySurvey | null> {
  const json = await getJson<any>(`${HSF10}/CompanySurvey/PageAjax`, { code: hsf10Code(symbol) });
  const info = Array.isArray(json?.jbzl) ? json.jbzl[0] : json?.jbzl;
  const issue = Array.isArray(json?.fxxg) ? json.fxxg[0] : json?.fxxg;
  if (!info) return null;
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
    listingDate: toIsoDate(issue?.LISTING_DATE),
  };
}

// ==================== 港股 / 美股 F10（datacenter） ====================

const DATACENTER = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';

/** 参数与 akshare 保持一致；值为 undefined 的键不发送 */
async function datacenter(params: Record<string, string | undefined>): Promise<any[]> {
  const query: Record<string, string> = { quoteColumns: '', client: 'PC' };
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query[key] = value;
  }
  const json = await getJson<any>(DATACENTER, query);
  if (json && json.success === false && json.code !== 9201) {
    throw new EastmoneyError(`Eastmoney datacenter ${params.reportName}: ${String(json.message ?? json.code).slice(0, 120)}`);
  }
  return Array.isArray(json?.result?.data) ? json.result.data : [];
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
      date: String(item?.REPORT_DATE ?? '').slice(0, 10),
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
    }),
    datacenter({
      reportName: 'RPT_HKF10_INFO_SECURITYINFO',
      columns: 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,SECURITY_TYPE,LISTING_DATE,ISIN_CODE,BOARD,TRADE_UNIT,TRADE_MARKET,PAR_VALUE,ISSUE_PRICE,ISSUE_NUM,YEAR_SETTLE_DAY',
      filter,
      pageNumber: '1',
      pageSize: '200',
      sortTypes: '',
      sortColumns: '',
      source: 'F10',
    }).catch(() => []),
  ]);
  const o = org[0];
  const s = sec[0];
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
    listingDate: toIsoDate(s?.LISTING_DATE),
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
    listingDate: toIsoDate(o.FOUND_DATE),
    fiscalYearEnd: '',
    secucode: String(o.SECUCODE ?? ''),
  };
}
