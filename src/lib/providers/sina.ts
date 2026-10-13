/**
 * 新浪财经（Sina）A 股备用数据源：三大报表与实时行情（免费、无需 key）。
 *
 * 仅在东方财富不可用（例如海外机房拿到空数据）时使用。端点参考 akshare（https://github.com/akfamily/akshare）：
 * - quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022
 *     source = lrb 利润表 / fzb 资产负债表 / llb 现金流量表 / gjzb 关键指标（stock_fundamental/stock_finance_sina.py:37-110）。
 *     报告期在 result.data.report_date[].date_value，科目在 result.data.report_list[日期].data[].{item_title,item_value}，
 *     金额单位为元；同名科目取第一次出现的值（akshare 同样 keep="first"）。
 * - hq.sinajs.cn/?list=sh600519  实时行情。需要 Referer，正文为 GBK（futures_hq_sina.py:117-126, 260）。
 *
 * akshare 只给出了「货币资金」和 gjzb 几项指标的科目名样例，其余科目按企业会计准则的标准名称用正则匹配，
 * 映射为东方财富 F10 字段名后复用 eastmoney-normalize.ts 的 cnIncome / cnBalance / cnCashFlow；
 * 真实科目名可用 getSinaRawTitles 导出核对（/api/health/providers?raw=1）。
 * hq.sinajs.cn 的 A 股字段顺序在 akshare 中同样没有依据，因此严格校验字段数和日期字段，不符即视为无数据。
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const REPORT_URL = 'https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022';
const HQ_URL = 'https://hq.sinajs.cn/';
const HQ_REFERER = 'https://finance.sina.com.cn/';

const TIMEOUT_MS = 10_000;
/** 每张报表只解析最近的若干个报告期：6 年的季报足够覆盖 5 个年报和 8 个单季（含差分所需的上一期） */
const MAX_PERIODS = 24;
const ANNUAL_LIMIT = 5;
const QUARTER_LIMIT = 8;

export class SinaError extends Error {
  readonly status: number;
  readonly detail?: string;
  constructor(message: string, status = 0, detail?: string) {
    super(message);
    this.name = 'SinaError';
    this.status = status;
    this.detail = detail;
  }
}

function snippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** GET 并读完正文；超时（含读正文）、网络错误、非 2xx 统一抛 SinaError */
async function fetchBody(url: string, headers: Record<string, string>, label: string): Promise<{ status: number; body: ArrayBuffer }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, ...headers },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new SinaError(`Sina ${label} HTTP ${response.status}`, response.status, snippet(text) || undefined);
    }
    return { status: response.status, body: await response.arrayBuffer() };
  } catch (err) {
    if (err instanceof SinaError) throw err;
    if (controller.signal.aborted) throw new SinaError(`Sina ${label} timeout`, 0, `${TIMEOUT_MS}ms`);
    throw new SinaError(`Sina ${label} request failed`, 0, err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

/** 新浪行情正文为 GBK；Node 运行时自带完整 ICU，支持 gb18030（GBK 的超集） */
function decodeGb(body: ArrayBuffer): string {
  for (const label of ['gb18030', 'gbk']) {
    try {
      return new TextDecoder(label).decode(body);
    } catch {
      // 当前运行时不支持该编码，换下一个
    }
  }
  return new TextDecoder().decode(body);
}

/** 数值：接受数字或数字字符串；''、'--'、null、NaN 视为缺失 */
function sinaNum(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.replace(/,/g, '').trim();
  if (text === '' || /^-+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

// ==================== 代码映射 ====================

/**
 * 站内代码 → 新浪代码：600519.SS / 600519.SH → sh600519，000001.SZ → sz000001，430017.BJ → bj430017。
 * 无后缀的 6 位代码：92 → 北交所；6 / 9 → 上交所；4 / 8 → 北交所；其余 → 深交所。无法识别时返回 null。
 */
export function sinaCode(symbol: string): string | null {
  const upper = symbol.trim().toUpperCase();
  const prefixed = /^(SH|SZ|BJ)(\d{6})$/.exec(upper);
  if (prefixed) return `${prefixed[1].toLowerCase()}${prefixed[2]}`;
  const m = /^(\d{6})(?:\.(SS|SH|SZ|BJ))?$/.exec(upper);
  if (!m) return null;
  const [, code, suffix] = m;
  if (suffix === 'SS' || suffix === 'SH') return `sh${code}`;
  if (suffix === 'SZ') return `sz${code}`;
  if (suffix === 'BJ') return `bj${code}`;
  if (code.startsWith('92')) return `bj${code}`;
  if (/^[69]/.test(code)) return `sh${code}`;
  if (/^[48]/.test(code)) return `bj${code}`;
  return `sz${code}`;
}

// ==================== 财务报表 ====================

type ReportSource = 'lrb' | 'fzb' | 'llb' | 'gjzb';

interface RawItem {
  title: string;
  value: number | null;
}

interface RawPeriod {
  /** YYYY-MM-DD */
  date: string;
  currency: string | null;
  items: RawItem[];
}

/** 东方财富 F10 形态的记录：REPORT_DATE 'YYYY-MM-DD 00:00:00' + 东财字段名 */
export type EmRecord = Record<string, any>;

export interface SinaStatements {
  /** 年报（12-31），新在前，最多 5 期 */
  incomeAnnual: EmRecord[];
  balanceAnnual: EmRecord[];
  cashAnnual: EmRecord[];
  /** 单季，新在前，最多 8 期；利润表 / 现金流量表已由累计值差分为单季 */
  incomeQuarter: EmRecord[];
  balanceQuarter: EmRecord[];
  cashQuarter: EmRecord[];
  /** 报告币种（rCurrency），缺失时为 CNY */
  currency: string;
  /** 最新一期的原始科目名，便于核对映射 */
  titles: { lrb: string[]; fzb: string[]; llb: string[] };
}

/**
 * 科目名 → 东方财富字段名。每行 [正则, 字段] 或 [正则, 字段, 锚点]：
 * - 按表内顺序匹配，同一字段第一条有值的规则生效；
 * - 同名科目（重复行、现金流量表补充资料）取第一次出现且有值的那一行；
 * - 带锚点的规则只在锚点科目之后查找（财务费用下的利息收入，区别于财务公司的利息收入）。
 * 科目名先经 normalizeTitle 处理：去空白、全角括号 / 冒号转半角、去掉「一、」「（一）」「其中：」「加：」「减：」等前缀。
 * 除 货币资金 外均为会计准则标准科目名，未在新浪样例中核实。
 */
type TitleRule = [pattern: RegExp, key: string, anchor?: RegExp];

const INCOME_TITLES: TitleRule[] = [
  [/^营业总收入$/, 'TOTAL_OPERATE_INCOME'],
  [/^营业收入$/, 'OPERATE_INCOME'],
  [/^营业总成本$/, 'TOTAL_OPERATE_COST'],
  [/^营业支出$/, 'TOTAL_OPERATE_COST'], // 银行 / 保险
  [/^营业成本$/, 'OPERATE_COST'],
  [/^销售费用$/, 'SALE_EXPENSE'],
  [/^管理费用$/, 'MANAGE_EXPENSE'],
  [/^业务及管理费(用)?$/, 'MANAGE_EXPENSE'], // 银行
  [/^研发费用$/, 'RESEARCH_EXPENSE'],
  [/^财务费用$/, 'FINANCE_EXPENSE'],
  [/^利息费用$/, 'FE_INTEREST_EXPENSE', /^财务费用$/],
  [/^利息收入$/, 'FE_INTEREST_INCOME', /^财务费用$/],
  [/^营业利润$/, 'OPERATE_PROFIT'],
  [/^利润总额$/, 'TOTAL_PROFIT'],
  [/^所得税(费用)?$/, 'INCOME_TAX'],
  [/^净利润$/, 'NETPROFIT'],
  [/^归属于(母公司|本行|本公司)(所有者|股东|普通股股东)?的净利润$/, 'PARENT_NETPROFIT'],
  [/^归母净利润$/, 'PARENT_NETPROFIT'],
  [/^基本每股收益/, 'BASIC_EPS'],
  [/^稀释每股收益/, 'DILUTED_EPS'],
];

const BALANCE_TITLES: TitleRule[] = [
  [/^货币资金$/, 'MONETARYFUNDS'], // 有样例（akshare docs stock.md:11556）
  [/^现金及存放中央银行款项$/, 'CASH_DEPOSIT_PBC'], // 银行
  [/^交易性金融资产$/, 'TRADE_FINASSET'],
  [/^应收票据及应收账款$/, 'NOTE_ACCOUNTS_RECE'],
  [/^应收账款$/, 'ACCOUNTS_RECE'],
  [/^存货$/, 'INVENTORY'],
  [/^其他流动资产$/, 'OTHER_CURRENT_ASSET'],
  [/^流动资产合计$/, 'TOTAL_CURRENT_ASSETS'],
  [/^长期股权投资$/, 'LONG_EQUITY_INVEST'],
  [/^固定资产$/, 'FIXED_ASSET'],
  [/^固定资产(净额|及清理合计|合计)$/, 'FIXED_ASSET'],
  [/^无形资产$/, 'INTANGIBLE_ASSET'],
  [/^商誉$/, 'GOODWILL'],
  [/^递延所得税资产$/, 'DEFER_TAX_ASSET'],
  [/^其他非流动资产$/, 'OTHER_NONCURRENT_ASSET'],
  [/^非流动资产合计$/, 'TOTAL_NONCURRENT_ASSETS'],
  [/^资产(总计|合计)$/, 'TOTAL_ASSETS'],
  [/^短期借款$/, 'SHORT_LOAN'],
  [/^应付票据及应付账款$/, 'NOTE_ACCOUNTS_PAYABLE'],
  [/^应付账款$/, 'ACCOUNTS_PAYABLE'],
  [/^预收(款项|账款)$/, 'ADVANCE_RECEIVABLES'],
  [/^合同负债$/, 'CONTRACT_LIAB'],
  [/^应交税费$/, 'TAX_PAYABLE'],
  [/^一年内到期的非流动负债$/, 'NONCURRENT_LIAB_1YEAR'],
  [/^流动负债合计$/, 'TOTAL_CURRENT_LIAB'],
  [/^长期借款$/, 'LONG_LOAN'],
  [/^应付债券$/, 'BOND_PAYABLE'],
  [/^租赁负债$/, 'LEASE_LIAB'],
  [/^递延所得税负债$/, 'DEFER_TAX_LIAB'],
  [/^非流动负债合计$/, 'TOTAL_NONCURRENT_LIAB'],
  [/^负债(合计|总计)$/, 'TOTAL_LIABILITIES'],
  [/^实收资本\(或股本\)$/, 'SHARE_CAPITAL'],
  [/^(实收资本|股本)$/, 'SHARE_CAPITAL'],
  [/^其他综合收益$/, 'OTHER_COMPRE_INCOME'],
  [/^未分配利润$/, 'UNASSIGN_RPOFIT'],
  [/^归属于(母公司|本行|本公司)(所有者|股东|普通股股东)?的?权益(合计)?$/, 'TOTAL_PARENT_EQUITY'],
  [/^少数股东权益$/, 'MINORITY_EQUITY'],
  [/^(所有者权益\(或股东权益\)|所有者权益|股东权益)合计$/, 'TOTAL_EQUITY'],
];

const CASH_TITLES: TitleRule[] = [
  [/^经营活动产生的现金流量净额$/, 'NETCASH_OPERATE'],
  [/^收回投资(所)?收到的现金$/, 'WITHDRAW_INVEST'],
  [/^购建固定资产、无形资产和其他长期资产(所)?支付的现金$/, 'CONSTRUCT_LONG_ASSET'],
  [/^投资(所)?支付的现金$/, 'INVEST_PAY_CASH'],
  [/^投资活动产生的现金流量净额$/, 'NETCASH_INVEST'],
  [/^吸收投资(所)?收到的现金$/, 'ACCEPT_INVEST_CASH'],
  [/^偿还债务(所)?支付的现金$/, 'PAY_DEBT_CASH'],
  [/^分配股利、利润或偿付利息(所)?支付的现金$/, 'ASSIGN_DIVIDEND_PORFIT'],
  [/^筹资活动产生的现金流量净额$/, 'NETCASH_FINANCE'],
  [/^汇率变动对现金(及现金等价物)?的影响(额)?$/, 'RATE_CHANGE_EFFECT'],
  [/^现金及现金等价物净增加额$/, 'CCE_ADD'],
  [/^期初现金及现金等价物余额$/, 'BEGIN_CCE'],
  [/^期末现金及现金等价物余额$/, 'END_CCE'],
  // 补充资料
  [/^净利润$/, 'NETPROFIT'],
  [/^固定资产折旧/, 'FA_IR_DEPR'],
  [/^无形资产摊销$/, 'IA_AMORTIZE'],
  [/^长期待摊费用摊销$/, 'LPE_AMORTIZE'],
];

/** gjzb（关键指标）中有样例的科目（akshare docs stock.md:12549-12553），仅在利润表缺营收时补充 */
const GJZB_TITLES: TitleRule[] = [
  [/^营业总收入$/, 'TOTAL_OPERATE_INCOME'],
  [/^营业成本$/, 'OPERATE_COST'],
  [/^净利润$/, 'NETPROFIT'],
  [/^归母净利润$/, 'PARENT_NETPROFIT'],
];

const LEADING_MARKS = [/^[一二三四五六七八九十]+、/, /^\([一二三四五六七八九十]+\)/, /^\d+[、.]/, /^(其中|加|减):/];

function normalizeTitle(title: string): string {
  let text = title
    .replace(/\s+/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ':')
    .replace(/帐/g, '账');
  for (let round = 0; round < 3; round++) {
    const before = text;
    LEADING_MARKS.forEach((re) => {
      text = text.replace(re, '');
    });
    if (text === before) break;
  }
  return text.replace(/\(元\)$/, '');
}

function mapItems(items: RawItem[], rules: TitleRule[]): Record<string, number> {
  const titles = items.map((item) => normalizeTitle(item.title));
  const out: Record<string, number> = {};
  rules.forEach((rule) => {
    const [pattern, key, anchor] = rule;
    if (key in out) return;
    let start = 0;
    if (anchor) {
      const at = titles.findIndex((t) => anchor.test(t));
      if (at < 0) return;
      start = at + 1;
    }
    for (let i = start; i < items.length; i++) {
      const value = items[i].value;
      if (value !== null && pattern.test(titles[i])) {
        out[key] = value;
        return;
      }
    }
  });
  return out;
}

function toDate(value: unknown): string | null {
  const text = String(value ?? '').trim();
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(text) ?? /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** result.data → 报告期列表（新在前）。data 为空、无报告期或 report_list 为空时返回 [] */
function parseReport(data: any): RawPeriod[] {
  if (!data || typeof data !== 'object') return [];
  const list = data.report_list && typeof data.report_list === 'object' && !Array.isArray(data.report_list) ? data.report_list : {};
  // gjzb 在 akshare 中按 report_list 的键遍历（stock_finance_sina.py:113）
  const keys: string[] =
    Array.isArray(data.report_date) && data.report_date.length > 0
      ? data.report_date.map((d: any) => String(d?.date_value ?? '')).filter(Boolean)
      : Object.keys(list);
  const seen: Record<string, true> = {};
  const periods: RawPeriod[] = [];
  keys.forEach((key) => {
    const date = toDate(key);
    const report = list[key];
    if (!date || seen[date] || !report || !Array.isArray(report.data)) return;
    seen[date] = true;
    const currency = typeof report.rCurrency === 'string' ? report.rCurrency.trim() : '';
    periods.push({
      date,
      currency: /^[A-Z]{3}$/.test(currency) ? currency : null,
      items: report.data
        .map((item: any) => ({ title: String(item?.item_title ?? '').trim(), value: sinaNum(item?.item_value) }))
        .filter((item: RawItem) => item.title !== ''),
    });
  });
  return periods.sort((a, b) => b.date.localeCompare(a.date));
}

async function fetchReport(paperCode: string, source: ReportSource): Promise<RawPeriod[]> {
  const params = new URLSearchParams({ paperCode, source, type: '0', page: '1', num: '1000' });
  const { status, body } = await fetchBody(`${REPORT_URL}?${params.toString()}`, { Accept: 'application/json,text/plain,*/*' }, source);
  // TextDecoder 默认会去掉 UTF-8 BOM
  const text = new TextDecoder('utf-8').decode(body);
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SinaError(`Sina ${source} non-JSON body`, status, snippet(text));
  }
  const result = json && typeof json === 'object' ? json.result : null;
  if (!result || typeof result !== 'object') throw new SinaError(`Sina ${source} unexpected body`, status, snippet(text));
  // 信封 result.status.code 在 akshare 中没有样例，出现非 0 时按上游错误处理
  const code = result.status?.code;
  if (code !== undefined && code !== null && Number(code) !== 0) {
    const msg = result.status?.msg ? ` ${result.status.msg}` : '';
    throw new SinaError(`Sina ${source} status ${code}${msg}`, status, snippet(text));
  }
  return parseReport(result.data);
}

function fetchStatements(code: string): Promise<[RawPeriod[], RawPeriod[], RawPeriod[]]> {
  return Promise.all([fetchReport(code, 'lrb'), fetchReport(code, 'fzb'), fetchReport(code, 'llb')]);
}

function toRecords(periods: RawPeriod[], rules: TitleRule[]): EmRecord[] {
  return periods.slice(0, MAX_PERIODS).map((p) => ({ REPORT_DATE: `${p.date} 00:00:00`, ...mapItems(p.items, rules) }));
}

const dateKey = (r: EmRecord): string => String(r.REPORT_DATE).slice(0, 10);
const byDateDesc = (a: EmRecord, b: EmRecord) => dateKey(b).localeCompare(dateKey(a));
const isAnnual = (r: EmRecord) => dateKey(r).endsWith('-12-31');

const QUARTER_ENDS = ['03-31', '06-30', '09-30', '12-31'];
/** 累计值的上一期（同一年内） */
const PRIOR_PERIOD: Record<string, string> = { '06-30': '03-31', '09-30': '06-30', '12-31': '09-30' };
const isQuarterEnd = (r: EmRecord) => QUARTER_ENDS.indexOf(dateKey(r).slice(5)) >= 0;

function revenueOf(r: EmRecord): number | null {
  const value = typeof r.TOTAL_OPERATE_INCOME === 'number' ? r.TOTAL_OPERATE_INCOME : r.OPERATE_INCOME;
  return typeof value === 'number' ? value : null;
}

/** 把 extra 中缺失的字段补进 base 的同期记录（base 优先），没有同期记录时新增 */
function mergeRecords(base: EmRecord[], extra: EmRecord[]): EmRecord[] {
  const byDate: Record<string, EmRecord> = {};
  const merged = base.map((r) => (byDate[dateKey(r)] = { ...r }));
  extra.forEach((r) => {
    const target = byDate[dateKey(r)];
    if (!target) {
      merged.push((byDate[dateKey(r)] = { ...r }));
      return;
    }
    Object.keys(r).forEach((key) => {
      if (!(key in target)) target[key] = r[key];
    });
  });
  return merged.sort(byDateDesc);
}

function indexByDate(records: EmRecord[]): Record<string, EmRecord> {
  const out: Record<string, EmRecord> = {};
  records.forEach((r) => {
    out[dateKey(r)] = r;
  });
  return out;
}

/**
 * 利润表是否为年内累计值（A 股定期报告的惯例，akshare 中没有直接样例）。
 * 累计口径下同一年内营收只增不减；三分之一以上的相邻期营收下降时判定为单季口径，不再差分。
 * 季节性强的公司（某季营收很小）在累计口径下仍不会下降，因此不会被误判。
 */
function looksCumulative(income: EmRecord[]): boolean {
  const byDate = indexByDate(income);
  let pairs = 0;
  let drops = 0;
  income.forEach((r) => {
    const date = dateKey(r);
    const priorMmdd = PRIOR_PERIOD[date.slice(5)];
    const prior = priorMmdd ? byDate[`${date.slice(0, 4)}-${priorMmdd}`] : undefined;
    const a = prior ? revenueOf(prior) : null;
    const b = revenueOf(r);
    if (a === null || b === null || a <= 0) return;
    pairs += 1;
    if (b < a * 0.98) drops += 1;
  });
  return drops * 3 < pairs || pairs === 0;
}

const round = (value: number, digits: number) => {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
};

const EPS_KEYS = ['BASIC_EPS', 'DILUTED_EPS'];
const CCE_KEYS = ['BEGIN_CCE', 'END_CCE'];

/** 本期累计 − 上期累计；任一期缺失的字段不输出 */
function diffFlows(cur: EmRecord, prior: EmRecord, skip: string[]): EmRecord {
  const out: EmRecord = { REPORT_DATE: cur.REPORT_DATE };
  Object.keys(cur).forEach((key) => {
    if (key === 'REPORT_DATE' || skip.indexOf(key) >= 0) return;
    if (typeof cur[key] === 'number' && typeof prior[key] === 'number') out[key] = round(cur[key] - prior[key], 2);
  });
  return out;
}

/**
 * 累计值 → 单季：Q1 原样，Q2 = H1 − Q1，Q3 = 9M − H1，Q4 = FY − 9M；同年上一期缺失则跳过该季。
 * 每股收益不做差分：单季 EPS = 单季归母净利润 / 同期股本（A 股面值 1 元，股本即股数），股本未知时不输出。
 * 现金流量表的期末现金取本期值，期初现金取上一期的期末现金。
 */
function singleQuarters(
  records: EmRecord[],
  kind: 'income' | 'cash',
  cumulative: boolean,
  shares: Record<string, number>
): EmRecord[] {
  const byDate = indexByDate(records);
  const out: EmRecord[] = [];
  records.filter(isQuarterEnd).forEach((cur) => {
    if (out.length >= QUARTER_LIMIT) return;
    const date = dateKey(cur);
    const mmdd = date.slice(5);
    if (!cumulative || mmdd === '03-31') {
      out.push(cur);
      return;
    }
    const prior = byDate[`${date.slice(0, 4)}-${PRIOR_PERIOD[mmdd]}`];
    if (!prior) return;
    if (kind === 'cash') {
      const single = diffFlows(cur, prior, CCE_KEYS);
      if (typeof cur.END_CCE === 'number') single.END_CCE = cur.END_CCE;
      if (typeof prior.END_CCE === 'number') single.BEGIN_CCE = prior.END_CCE;
      out.push(single);
      return;
    }
    const single = diffFlows(cur, prior, EPS_KEYS);
    const shareCount = shares[date];
    if (typeof single.PARENT_NETPROFIT === 'number' && shareCount > 0) {
      single.BASIC_EPS = round(single.PARENT_NETPROFIT / shareCount, 4);
    }
    out.push(single);
  });
  return out;
}

function titlesOf(periods: RawPeriod[]): string[] {
  return periods[0] ? periods[0].items.map((item) => item.title) : [];
}

/**
 * A 股三大报表（新浪 getFinanceReport2022），输出东方财富字段名的记录，供 cnIncome / cnBalance / cnCashFlow 使用。
 * 利润表在所有年报中都匹配不到营收时，再取 gjzb（关键指标）补充营收 / 营业成本 / 净利润 / 归母净利润。
 * 三张表都没有报告期时返回 null；HTTP 错误、超时、非 JSON、status.code ≠ 0 抛 SinaError。
 */
export async function getSinaStatements(symbol: string): Promise<SinaStatements | null> {
  const code = sinaCode(symbol);
  if (!code) return null;
  const [lrb, fzb, llb] = await fetchStatements(code);

  let income = toRecords(lrb, INCOME_TITLES);
  let gjzb: RawPeriod[] = [];
  if (!income.filter(isAnnual).slice(0, ANNUAL_LIMIT).some((r) => revenueOf(r) !== null)) {
    // gjzb 只是补充：失败时按没有数据处理，不影响三大报表
    gjzb = await fetchReport(code, 'gjzb').catch((): RawPeriod[] => []);
    if (gjzb.length > 0) income = mergeRecords(income, toRecords(gjzb, GJZB_TITLES));
  }
  if (lrb.length === 0 && fzb.length === 0 && llb.length === 0 && gjzb.length === 0) return null;

  const balance = toRecords(fzb, BALANCE_TITLES);
  const cash = toRecords(llb, CASH_TITLES);
  const shares: Record<string, number> = {};
  balance.forEach((r) => {
    if (typeof r.SHARE_CAPITAL === 'number') shares[dateKey(r)] = r.SHARE_CAPITAL;
  });
  const cumulative = looksCumulative(income);
  const currency = [lrb[0], fzb[0], llb[0]].map((p) => p?.currency).find((c): c is string => !!c) ?? 'CNY';

  return {
    incomeAnnual: income.filter(isAnnual).slice(0, ANNUAL_LIMIT),
    balanceAnnual: balance.filter(isAnnual).slice(0, ANNUAL_LIMIT),
    cashAnnual: cash.filter(isAnnual).slice(0, ANNUAL_LIMIT),
    incomeQuarter: singleQuarters(income, 'income', cumulative, shares),
    balanceQuarter: balance.filter(isQuarterEnd).slice(0, QUARTER_LIMIT),
    cashQuarter: singleQuarters(cash, 'cash', cumulative, shares),
    currency,
    titles: { lrb: titlesOf(lrb), fzb: titlesOf(fzb), llb: titlesOf(llb) },
  };
}

/** 诊断：三张表最新一期的原始科目名，以及利润表（为空时依次取资产负债表、现金流量表）的报告期列表 */
export async function getSinaRawTitles(
  symbol: string
): Promise<{ lrb: string[]; fzb: string[]; llb: string[]; periods: string[] }> {
  const code = sinaCode(symbol);
  if (!code) return { lrb: [], fzb: [], llb: [], periods: [] };
  const [lrb, fzb, llb] = await fetchStatements(code);
  const periodSource = lrb.length > 0 ? lrb : fzb.length > 0 ? fzb : llb;
  return { lrb: titlesOf(lrb), fzb: titlesOf(fzb), llb: titlesOf(llb), periods: periodSource.map((p) => p.date) };
}

// ==================== 行情 ====================

export interface SinaQuote {
  name: string;
  price: number;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  /** 成交量（股） */
  volume: number | null;
  /** 成交额（元） */
  amount: number | null;
  /** 行情日期 YYYY-MM-DD */
  date: string;
}

const positive = (value: number | null) => (value !== null && value > 0 ? value : null);

/**
 * A 股字段（公开资料，akshare 中无依据）：0 名称，1 今开，2 昨收，3 现价，4 最高，5 最低，6 买一价，7 卖一价，
 * 8 成交量（股），9 成交额（元），10-29 五档买卖盘，30 日期，31 时间，32 状态。
 * 字段数不足 32、日期格式不符或价格无效时视为无数据。现价为 0（停牌 / 未开盘）时取昨收。
 */
function parseHqFields(payload: string): SinaQuote | null {
  if (payload.trim() === '') return null;
  const fields = payload.split(',');
  if (fields.length < 32) return null;
  const date = fields[30].trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const last = sinaNum(fields[3]);
  const previousClose = positive(sinaNum(fields[2]));
  const price = last !== null && last > 0 ? last : previousClose;
  if (price === null) return null;
  const volume = sinaNum(fields[8]);
  const amount = sinaNum(fields[9]);
  return {
    name: fields[0].trim(),
    price,
    previousClose,
    open: positive(sinaNum(fields[1])),
    high: positive(sinaNum(fields[4])),
    low: positive(sinaNum(fields[5])),
    volume: volume !== null && volume >= 0 ? volume : null,
    amount: amount !== null && amount >= 0 ? amount : null,
    date,
  };
}

/**
 * A 股实时行情（hq.sinajs.cn）。代码不存在时新浪返回空字符串 → null；
 * HTTP 错误或正文中没有该代码的 hq_str_（例如缺 Referer 时的 sys_auth="FAILED"）抛 SinaError。
 */
export async function getSinaQuote(symbol: string): Promise<SinaQuote | null> {
  const code = sinaCode(symbol);
  if (!code) return null;
  const { status, body } = await fetchBody(`${HQ_URL}?list=${code}`, { Referer: HQ_REFERER, Accept: '*/*' }, 'hq');
  const text = decodeGb(body);
  const pattern = /var hq_str_(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match[1] === code) return parseHqFields(match[2]);
  }
  throw new SinaError(`Sina hq: no hq_str_${code} in body`, status, snippet(text));
}
