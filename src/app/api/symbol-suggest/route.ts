import { NextRequest, NextResponse } from 'next/server';
import { suggestSymbolWithDeepSeek } from '@/lib/deepseek-suggest';
import { search as yahooSearch, type YahooSearchQuote } from '@/lib/yahoo/client';
import { search as eastmoneySearch, type EastmoneySearchHit } from '@/lib/providers/eastmoney';
import { formatSymbolForMarket, type MarketType } from '@/lib/markets';

// 行情数据源在香港区域访问更稳定（见 report-data/route.ts）
export const preferredRegion = 'hkg1';

type Suggestion = { symbol: string; market: MarketType; name: string; nameCn: string; confidence?: number };

const REMOTE_DEADLINE_MS = 4_000;

function withDeadline<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.catch(() => fallback), deadline]).finally(() => clearTimeout(timer));
}

const US_EXCHANGES = new Set(['NMS', 'NGM', 'NCM', 'NAS', 'NYQ', 'NYS', 'ASE', 'PCX', 'BTS', 'NIM']);

// Yahoo 的代码后缀与站内市场后缀一致（.SS/.SZ/.HK/.T/.KS/.KQ/.AX），
// 无后缀时用交易所代码判断是否为美股。
function yahooQuoteToMarket(symbol: string, exchange: string | undefined): MarketType | null {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('.SS') || upper.endsWith('.SZ')) return 'CN';
  if (upper.endsWith('.HK')) return 'HK';
  if (upper.endsWith('.T')) return 'JP';
  if (upper.endsWith('.KS') || upper.endsWith('.KQ')) return 'KR';
  if (upper.endsWith('.AX')) return 'AU';
  if (!upper.includes('.') && exchange && US_EXCHANGES.has(exchange.toUpperCase())) return 'US';
  return null;
}

// In-memory cache: identical queries within a few minutes (e.g. user types
// "APPL" then deletes "L" and re-types) hit memory instead of re-fetching.
// Tiny TTL avoids stale results when the user explicitly retries.
const SUGGEST_CACHE = new Map<string, { ts: number; value: any }>();
const SUGGEST_CACHE_TTL_MS = 60_000;
function cacheGet(key: string) {
  const hit = SUGGEST_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > SUGGEST_CACHE_TTL_MS) {
    SUGGEST_CACHE.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key: string, value: any) {
  if (SUGGEST_CACHE.size > 200) {
    // simple FIFO eviction
    const first = SUGGEST_CACHE.keys().next().value;
    if (first) SUGGEST_CACHE.delete(first);
  }
  SUGGEST_CACHE.set(key, { ts: Date.now(), value });
}

const VALID_MARKETS: MarketType[] = ['US', 'CN', 'HK', 'JP', 'KR', 'AU'];

// 本地常见股票库 - 当 AI API 失败时作为备用
const LOCAL_STOCKS = [
  // 美股
  { symbol: 'AAPL', market: 'US', name: 'Apple Inc.', nameCn: '苹果', keywords: ['苹果', 'apple', 'iphone'] },
  { symbol: 'MSFT', market: 'US', name: 'Microsoft Corporation', nameCn: '微软', keywords: ['微软', 'microsoft', 'windows'] },
  { symbol: 'GOOGL', market: 'US', name: 'Alphabet Inc.', nameCn: '谷歌', keywords: ['谷歌', 'google', 'alphabet'] },
  { symbol: 'GOOG', market: 'US', name: 'Alphabet Inc. Class C', nameCn: '谷歌', keywords: ['谷歌', 'google'] },
  { symbol: 'AMZN', market: 'US', name: 'Amazon.com Inc.', nameCn: '亚马逊', keywords: ['亚马逊', 'amazon'] },
  { symbol: 'NVDA', market: 'US', name: 'NVIDIA Corporation', nameCn: '英伟达', keywords: ['英伟达', 'nvidia', '黄仁勋'] },
  { symbol: 'TSLA', market: 'US', name: 'Tesla Inc.', nameCn: '特斯拉', keywords: ['特斯拉', 'tesla', 'musk', '马斯克'] },
  { symbol: 'META', market: 'US', name: 'Meta Platforms Inc.', nameCn: '脸书/Meta', keywords: ['脸书', 'facebook', 'meta', 'fb'] },
  { symbol: 'BRK.B', market: 'US', name: 'Berkshire Hathaway Inc.', nameCn: '伯克希尔', keywords: ['伯克希尔', 'berkshire', '巴菲特', 'buffett'] },
  { symbol: 'JPM', market: 'US', name: 'JPMorgan Chase & Co.', nameCn: '摩根大通', keywords: ['摩根', 'jpmorgan', 'chase'] },
  { symbol: 'JNJ', market: 'US', name: 'Johnson & Johnson', nameCn: '强生', keywords: ['强生', 'johnson'] },
  { symbol: 'V', market: 'US', name: 'Visa Inc.', nameCn: 'Visa', keywords: ['visa', '维萨'] },
  { symbol: 'WMT', market: 'US', name: 'Walmart Inc.', nameCn: '沃尔玛', keywords: ['沃尔玛', 'walmart'] },
  { symbol: 'AMD', market: 'US', name: 'Advanced Micro Devices', nameCn: 'AMD', keywords: ['amd', '超威'] },
  { symbol: 'INTC', market: 'US', name: 'Intel Corporation', nameCn: '英特尔', keywords: ['英特尔', 'intel'] },
  { symbol: 'NFLX', market: 'US', name: 'Netflix Inc.', nameCn: '奈飞', keywords: ['奈飞', 'netflix'] },
  { symbol: 'DIS', market: 'US', name: 'The Walt Disney Company', nameCn: '迪士尼', keywords: ['迪士尼', 'disney'] },
  { symbol: 'COIN', market: 'US', name: 'Coinbase Global Inc.', nameCn: 'Coinbase', keywords: ['coinbase', '比特币', 'btc'] },
  { symbol: 'NIO', market: 'US', name: 'NIO Inc.', nameCn: '蔚来', keywords: ['蔚来', 'nio'] },
  { symbol: 'XPEV', market: 'US', name: 'XPeng Inc.', nameCn: '小鹏', keywords: ['小鹏', 'xpeng'] },
  { symbol: 'LI', market: 'US', name: 'Li Auto Inc.', nameCn: '理想汽车', keywords: ['理想', 'li auto'] },
  { symbol: 'BABA', market: 'US', name: 'Alibaba Group ADR', nameCn: '阿里巴巴(美)', keywords: ['阿里巴巴', 'alibaba', '马云'] },
  { symbol: 'PDD', market: 'US', name: 'PDD Holdings Inc.', nameCn: '拼多多', keywords: ['拼多多', 'pdd', 'pinduoduo', 'temu'] },
  { symbol: 'JD', market: 'US', name: 'JD.com Inc.', nameCn: '京东', keywords: ['京东', 'jd', '刘强东'] },
  { symbol: 'BIDU', market: 'US', name: 'Baidu Inc.', nameCn: '百度', keywords: ['百度', 'baidu'] },
  // 港股
  { symbol: '0700.HK', market: 'HK', name: 'Tencent Holdings Ltd.', nameCn: '腾讯控股', keywords: ['腾讯', 'tencent', 'qq', '微信', 'wechat'] },
  { symbol: '9988.HK', market: 'HK', name: 'Alibaba Group Holding', nameCn: '阿里巴巴', keywords: ['阿里巴巴', 'alibaba', '马云', '阿里'] },
  { symbol: '1810.HK', market: 'HK', name: 'Xiaomi Corporation', nameCn: '小米集团', keywords: ['小米', 'xiaomi', '雷军'] },
  { symbol: '3690.HK', market: 'HK', name: 'Meituan', nameCn: '美团', keywords: ['美团', 'meituan'] },
  { symbol: '9618.HK', market: 'HK', name: 'JD.com Inc.', nameCn: '京东集团', keywords: ['京东', 'jd'] },
  { symbol: '9888.HK', market: 'HK', name: 'Baidu Inc.', nameCn: '百度集团', keywords: ['百度', 'baidu'] },
  { symbol: '0941.HK', market: 'HK', name: 'China Mobile', nameCn: '中国移动', keywords: ['移动', 'china mobile', '中移动'] },
  { symbol: '2318.HK', market: 'HK', name: 'Ping An Insurance', nameCn: '中国平安', keywords: ['平安', 'ping an', '保险'] },
  { symbol: '0005.HK', market: 'HK', name: 'HSBC Holdings', nameCn: '汇丰控股', keywords: ['汇丰', 'hsbc'] },
  { symbol: '1299.HK', market: 'HK', name: 'AIA Group Ltd.', nameCn: '友邦保险', keywords: ['友邦', 'aia'] },
  { symbol: '2020.HK', market: 'HK', name: 'ANTA Sports', nameCn: '安踏体育', keywords: ['安踏', 'anta'] },
  { symbol: '9999.HK', market: 'HK', name: 'NetEase Inc.', nameCn: '网易', keywords: ['网易', 'netease'] },
  { symbol: '0388.HK', market: 'HK', name: 'Hong Kong Exchanges', nameCn: '香港交易所', keywords: ['港交所', 'hkex'] },
  { symbol: '2382.HK', market: 'HK', name: 'Sunny Optical', nameCn: '舜宇光学', keywords: ['舜宇', 'sunny'] },
  { symbol: '0968.HK', market: 'HK', name: 'Xinyi Solar', nameCn: '信义光能', keywords: ['信义', 'xinyi'] },
  // A股
  { symbol: '600519.SS', market: 'CN', name: 'Kweichow Moutai', nameCn: '贵州茅台', keywords: ['茅台', 'moutai', '贵州茅台'] },
  { symbol: '000858.SZ', market: 'CN', name: 'Wuliangye Yibin', nameCn: '五粮液', keywords: ['五粮液', 'wuliangye'] },
  { symbol: '601318.SS', market: 'CN', name: 'Ping An Insurance', nameCn: '中国平安', keywords: ['平安', 'ping an', '保险'] },
  { symbol: '600036.SS', market: 'CN', name: 'China Merchants Bank', nameCn: '招商银行', keywords: ['招商', 'cmb', '招行'] },
  { symbol: '000001.SZ', market: 'CN', name: 'Ping An Bank', nameCn: '平安银行', keywords: ['平安银行'] },
  { symbol: '600900.SS', market: 'CN', name: 'China Yangtze Power', nameCn: '长江电力', keywords: ['长江电力', '长电'] },
  { symbol: '601857.SS', market: 'CN', name: 'PetroChina', nameCn: '中国石油', keywords: ['中石油', 'petrochina', '中国石油'] },
  { symbol: '601398.SS', market: 'CN', name: 'ICBC', nameCn: '工商银行', keywords: ['工商', 'icbc', '工行', '宇宙行'] },
  { symbol: '601288.SS', market: 'CN', name: 'Agricultural Bank of China', nameCn: '农业银行', keywords: ['农业', 'abc', '农行'] },
  { symbol: '000333.SZ', market: 'CN', name: 'Midea Group', nameCn: '美的集团', keywords: ['美的', 'midea'] },
  { symbol: '000651.SZ', market: 'CN', name: 'Gree Electric', nameCn: '格力电器', keywords: ['格力', 'gree', '董明珠'] },
  { symbol: '300750.SZ', market: 'CN', name: 'CATL', nameCn: '宁德时代', keywords: ['宁德时代', 'catl', '曾毓群'] },
  { symbol: '002594.SZ', market: 'CN', name: 'BYD Company', nameCn: '比亚迪', keywords: ['比亚迪', 'byd', '王传福'] },
  { symbol: '601012.SS', market: 'CN', name: 'LONGi Green Energy', nameCn: '隆基绿能', keywords: ['隆基', 'longi', '隆基股份'] },
  { symbol: '300059.SZ', market: 'CN', name: 'East Money', nameCn: '东方财富', keywords: ['东方财富', 'east money', '东财'] },
  // 日股
  { symbol: '7203.T', market: 'JP', name: 'Toyota Motor Corporation', nameCn: '丰田汽车', keywords: ['丰田', 'toyota'] },
  { symbol: '6758.T', market: 'JP', name: 'Sony Group Corporation', nameCn: '索尼', keywords: ['索尼', 'sony'] },
  { symbol: '6861.T', market: 'JP', name: 'Keyence Corporation', nameCn: '基恩士', keywords: ['基恩士', 'keyence'] },
  { symbol: '9984.T', market: 'JP', name: 'SoftBank Group Corp.', nameCn: '软银集团', keywords: ['软银', 'softbank', '孙正义'] },
  { symbol: '7267.T', market: 'JP', name: 'Honda Motor Co.', nameCn: '本田汽车', keywords: ['本田', 'honda'] },
  { symbol: '8306.T', market: 'JP', name: 'Mitsubishi UFJ Financial', nameCn: '三菱日联', keywords: ['三菱', 'mitsubishi', 'mufj'] },
  { symbol: '9432.T', market: 'JP', name: 'Nippon Telegraph and Telephone', nameCn: 'NTT', keywords: ['ntt', '日本电信'] },
  { symbol: '6902.T', market: 'JP', name: 'Denso Corporation', nameCn: '电装', keywords: ['电装', 'denso'] },
  { symbol: '4063.T', market: 'JP', name: 'Shin-Etsu Chemical', nameCn: '信越化学', keywords: ['信越', 'shin-etsu'] },
  { symbol: '7974.T', market: 'JP', name: 'Nintendo Co., Ltd.', nameCn: '任天堂', keywords: ['任天堂', 'nintendo'] },
  // 韩股
  { symbol: '005930.KS', market: 'KR', name: 'Samsung Electronics', nameCn: '三星电子', keywords: ['三星', 'samsung', '삼성', '삼성전자'] },
  { symbol: '000660.KS', market: 'KR', name: 'SK Hynix', nameCn: 'SK海力士', keywords: ['海力士', 'hynix', 'sk hynix', '하이닉스'] },
  { symbol: '035420.KS', market: 'KR', name: 'NAVER Corporation', nameCn: 'NAVER', keywords: ['naver', '네이버'] },
  { symbol: '035720.KS', market: 'KR', name: 'Kakao Corp', nameCn: 'Kakao', keywords: ['kakao', '카카오', '카카오톡'] },
  { symbol: '005380.KS', market: 'KR', name: 'Hyundai Motor', nameCn: '现代汽车', keywords: ['现代', 'hyundai', '현대', '현대차'] },
  { symbol: '000270.KS', market: 'KR', name: 'Kia Corporation', nameCn: '起亚汽车', keywords: ['起亚', 'kia', '기아'] },
  { symbol: '051910.KS', market: 'KR', name: 'LG Chem', nameCn: 'LG化学', keywords: ['lg化学', 'lg chem', 'lg화학'] },
  { symbol: '006400.KS', market: 'KR', name: 'Samsung SDI', nameCn: '三星SDI', keywords: ['三星sdi', 'samsung sdi', '삼성sdi'] },
  { symbol: '207940.KS', market: 'KR', name: 'Samsung Biologics', nameCn: '三星生物制剂', keywords: ['三星生物', 'samsung biologics', '삼성바이오로직스'] },
  { symbol: '068270.KS', market: 'KR', name: 'Celltrion', nameCn: 'Celltrion', keywords: ['celltrion', '셀트리온'] },
  { symbol: '105560.KS', market: 'KR', name: 'KB Financial Group', nameCn: 'KB金融集团', keywords: ['kb', 'kb financial', 'kb금융'] },
  { symbol: '055550.KS', market: 'KR', name: 'Shinhan Financial Group', nameCn: '新韩金融', keywords: ['新韩', 'shinhan', '신한'] },
  { symbol: '012330.KS', market: 'KR', name: 'Hyundai Mobis', nameCn: '现代摩比斯', keywords: ['mobis', '모비스', 'hyundai mobis'] },
  { symbol: '028260.KS', market: 'KR', name: 'Samsung C&T', nameCn: '三星物产', keywords: ['三星物产', 'samsung c&t', '삼성물산'] },
  { symbol: '066570.KS', market: 'KR', name: 'LG Electronics', nameCn: 'LG电子', keywords: ['lg电子', 'lg electronics', 'lg전자'] },
  // 澳股
  { symbol: 'CBA.AX', market: 'AU', name: 'Commonwealth Bank of Australia', nameCn: '澳洲联邦银行', keywords: ['cba', 'commonwealth bank', '澳洲联邦银行', '联邦银行'] },
  { symbol: 'BHP.AX', market: 'AU', name: 'BHP Group Ltd', nameCn: '必和必拓', keywords: ['bhp', '必和必拓', '矿业'] },
  { symbol: 'CSL.AX', market: 'AU', name: 'CSL Limited', nameCn: 'CSL', keywords: ['csl', '生物制药', '血液制品'] },
  { symbol: 'WBC.AX', market: 'AU', name: 'Westpac Banking Corporation', nameCn: '西太平洋银行', keywords: ['wbc', 'westpac', '西太平洋银行'] },
  { symbol: 'NAB.AX', market: 'AU', name: 'National Australia Bank', nameCn: '澳洲国民银行', keywords: ['nab', 'national australia bank', '澳洲国民银行'] },
  { symbol: 'ANZ.AX', market: 'AU', name: 'ANZ Group Holdings', nameCn: '澳新银行', keywords: ['anz', '澳新银行'] },
  { symbol: 'WES.AX', market: 'AU', name: 'Wesfarmers Limited', nameCn: 'Wesfarmers', keywords: ['wes', 'wesfarmers'] },
  { symbol: 'RIO.AX', market: 'AU', name: 'Rio Tinto Limited', nameCn: '力拓', keywords: ['rio', 'rio tinto', '力拓'] },
];

// 本地搜索函数
const CJK_RE = /[\u3400-\u9fff]/;

/**
 * 本地常见股票库的匹配打分。
 * 只做「整词 / 前缀」匹配：拉丁字母查询不再做任意子串匹配，
 * 否则 "MU" 会命中 musk（特斯拉）、temu（拼多多）、mufj（三菱日联）。
 * 中文查询（≥2 个字）允许子串匹配，例如「茅台」命中「贵州茅台」。
 */
function scoreLocalStock(stock: (typeof LOCAL_STOCKS)[number], q: string): number {
  const symbol = stock.symbol.toLowerCase();
  const bareSymbol = symbol.split('.')[0];
  const nameCn = stock.nameCn.toLowerCase();
  const name = stock.name.toLowerCase();
  const keywords = stock.keywords.map((kw) => kw.toLowerCase());
  const isCjk = CJK_RE.test(q);

  if (symbol === q || bareSymbol === q) return 100;
  if (nameCn === q || name === q || keywords.includes(q)) return 90;
  if (isCjk) {
    if (q.length >= 2 && (nameCn.includes(q) || keywords.some((kw) => kw.includes(q)))) return 70;
    return 0;
  }
  if (q.length >= 2 && symbol.startsWith(q)) return 60;
  if (q.length >= 3) {
    const words = name.split(/[\s.,&()-]+/).filter(Boolean);
    if (words.some((w) => w.startsWith(q)) || keywords.some((kw) => kw.startsWith(q))) return 50;
  }
  return 0;
}

function localSearch(query: string, marketHint?: MarketType) {
  const q = query.toLowerCase().trim();
  return LOCAL_STOCKS
    .filter((stock) => !marketHint || stock.market === marketHint)
    .map((stock) => ({ stock, score: scoreLocalStock(stock, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ stock, score }) => ({
      symbol: stock.symbol,
      market: stock.market as MarketType,
      name: stock.name,
      nameCn: stock.nameCn,
      confidence: score >= 90 ? 0.95 : 0.8,
    }));
}

const MARKET_SYMBOL_REGEX: Record<MarketType, RegExp> = {
  US: /^[A-Z0-9.-]{1,10}$/,
  CN: /^\d{6}\.(SS|SZ|BJ)$/,
  HK: /^\d{4,5}\.HK$/,
  JP: /^\d{4}\.T$/,
  KR: /^\d{6}\.(KS|KQ)$/,
  AU: /^[A-Z0-9]{2,6}\.AX$/,
};

function normalizeSuggestion(item: any) {
  const market = (item?.market || '').toUpperCase() as MarketType;
  if (!VALID_MARKETS.includes(market)) return null;

  let symbol = String(item?.symbol || '').toUpperCase().trim();
  if (!symbol) return null;

  if (market === 'US' && symbol.endsWith('.US')) {
    symbol = symbol.replace(/\.US$/i, '');
  }

  if (!symbol.includes('.')) {
    if (market === 'HK' && /^\d{1,5}$/.test(symbol)) {
      symbol = symbol.padStart(symbol.length <= 4 ? 4 : 5, '0');
    }
    if (market === 'JP' && /^\d{1,4}$/.test(symbol)) {
      symbol = symbol.padStart(4, '0');
    }
    if (market === 'KR' && /^\d{1,6}$/.test(symbol)) {
      symbol = symbol.padStart(6, '0');
    }
    symbol = formatSymbolForMarket(symbol, market);
  }

  if (!MARKET_SYMBOL_REGEX[market].test(symbol)) {
    return null;
  }

  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  const nameCn = typeof item?.nameCn === 'string' ? item.nameCn.trim() : '';
  const confidenceRaw = Number(item?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : undefined;

  return {
    symbol,
    market,
    name,
    nameCn,
    confidence,
  };
}

// Yahoo /v1/finance/search 的 quotes 形如
//   { symbol: "AAPL", shortname: "Apple Inc.", longname: "Apple Inc.", exchange: "NMS", quoteType: "EQUITY" }
function mapYahooResults(items: YahooSearchQuote[], marketHint?: MarketType): Suggestion[] {
  const out: Suggestion[] = [];
  for (const item of items) {
    if (item?.quoteType !== 'EQUITY' && item?.quoteType !== 'ETF') continue;
    const symbol = String(item?.symbol || '').toUpperCase().trim();
    if (!symbol) continue;
    const market = yahooQuoteToMarket(symbol, item.exchange);
    if (!market) continue;
    if (marketHint && market !== marketHint) continue;
    const formatted = formatSymbolForMarket(symbol, market);
    if (!MARKET_SYMBOL_REGEX[market].test(formatted)) continue;
    out.push({
      symbol: formatted,
      market,
      name: String(item.longname || item.shortname || '').trim(),
      nameCn: '',
      confidence: 0.85,
    });
  }
  return out;
}

// 东方财富联想：A 股 / 港股 / 美股，支持中文名、拼音首字母与代码。
// QuoteID 前缀即市场：1 沪 / 0 深·北 / 116 港 / 105·106·107 美。
function eastmoneyToSymbol(hit: EastmoneySearchHit): string | null {
  const code = hit.code.toUpperCase();
  const prefix = hit.quoteId.split('.')[0];
  switch (hit.market) {
    case 'CN':
      if (!/^\d{6}$/.test(code)) return null;
      if (prefix === '1') return `${code}.SS`;
      return /^(4|8|92)/.test(code) ? `${code}.BJ` : `${code}.SZ`;
    case 'HK':
      if (!/^\d{1,5}$/.test(code)) return null;
      return `${code.replace(/^0+/, '').padStart(4, '0')}.HK`;
    case 'US':
      return code.replace(/_/g, '.');
    default:
      return null;
  }
}

function mapEastmoneyResults(hits: EastmoneySearchHit[], marketHint?: MarketType): Suggestion[] {
  const out: Suggestion[] = [];
  for (const hit of hits) {
    if (!hit.market || (marketHint && hit.market !== marketHint)) continue;
    const symbol = eastmoneyToSymbol(hit);
    if (!symbol || !MARKET_SYMBOL_REGEX[hit.market].test(symbol)) continue;
    out.push({ symbol, market: hit.market, name: '', nameCn: hit.name, confidence: 0.9 });
  }
  return out;
}

/** 按顺序去重合并；同一代码在后续来源里有名称时补齐缺失的中 / 英文名 */
function dedupeMerge(...batches: Suggestion[][]): Suggestion[] {
  const byKey = new Map<string, Suggestion>();
  for (const batch of batches) {
    for (const item of batch) {
      const key = `${item.market}-${item.symbol}`;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.name && item.name) existing.name = item.name;
        if (!existing.nameCn && item.nameCn) existing.nameCn = item.nameCn;
        continue;
      }
      if (byKey.size < 5) byKey.set(key, { ...item });
    }
  }
  return Array.from(byKey.values());
}

export async function POST(request: NextRequest) {
  try {
    const { query, market, language } = await request.json();
    const trimmedQuery = String(query || '').trim();
    const marketHint = (market || '') as MarketType;
    const lang = typeof language === 'string' ? language : 'zh';

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return NextResponse.json({ query: trimmedQuery, suggestions: [] });
    }

    // In-memory cache check (same query within 60s)
    const cacheKey = `${trimmedQuery.toLowerCase()}|${marketHint || ''}|${lang}`;
    const cached = cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    // ===== Tier 1: local index (instant) =====
    const localResults = localSearch(trimmedQuery, marketHint || undefined);

    // 只有命中精确代码 / 名称时才直接返回本地结果；
    // 其余情况一律继续远程搜索，本地结果只作为排序靠前的补充。
    if (localResults.length > 0 && (localResults[0].confidence ?? 0) >= 0.95 && localResults.length >= 3) {
      const payload = { query: trimmedQuery, suggestions: localResults.slice(0, 5), source: 'local' };
      cacheSet(cacheKey, payload);
      return NextResponse.json(payload);
    }

    // ===== Tier 2: 东方财富（A / 港 / 美，中文名友好）+ Yahoo（日 / 韩 / 澳），并行且各自限时 =====
    const [eastmoneyHits, yahooQuotes] = await Promise.all([
      withDeadline(eastmoneySearch(trimmedQuery, 10), REMOTE_DEADLINE_MS, [] as EastmoneySearchHit[]),
      withDeadline(
        yahooSearch(trimmedQuery, { quotesCount: 10, newsCount: 0 }).then((r) => r.quotes),
        REMOTE_DEADLINE_MS,
        [] as YahooSearchQuote[]
      ),
    ]);
    const eastmoneyResults = mapEastmoneyResults(eastmoneyHits, marketHint || undefined);
    const yahooResults = mapYahooResults(yahooQuotes, marketHint || undefined);
    const remoteResults = [...eastmoneyResults, ...yahooResults];

    const merged = dedupeMerge(localResults, eastmoneyResults, yahooResults);
    if (remoteResults.length > 0 || merged.length >= 2) {
      const remoteSources = [eastmoneyResults.length > 0 ? 'eastmoney' : '', yahooResults.length > 0 ? 'yahoo' : ''].filter(Boolean);
      const payload = {
        query: trimmedQuery,
        suggestions: merged,
        source: [localResults.length > 0 ? 'local' : '', ...remoteSources].filter(Boolean).join('+') || 'local',
      };
      cacheSet(cacheKey, payload);
      return NextResponse.json(payload);
    }

    // ===== Tier 3: AI fallback (handles e.g. Chinese name → ticker) =====
    // 主页联想走 DeepSeek，与主报告链路共用同一 API key。
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      const payload = { query: trimmedQuery, suggestions: merged, source: merged.length > 0 ? 'local' : 'none' };
      cacheSet(cacheKey, payload);
      return NextResponse.json(payload);
    }

    try {
      const aiResult = await suggestSymbolWithDeepSeek(deepseekApiKey, trimmedQuery, marketHint, lang);
      const rawSuggestions = Array.isArray(aiResult?.suggestions) ? aiResult.suggestions : [];
      const aiSuggestions = rawSuggestions
        .map(normalizeSuggestion)
        .filter(Boolean) as Suggestion[];

      const finalMerged = dedupeMerge(merged, aiSuggestions);
      const payload = {
        query: trimmedQuery,
        suggestions: finalMerged,
        source: aiSuggestions.length > 0 ? 'ai+fallback' : 'fallback',
      };
      cacheSet(cacheKey, payload);
      return NextResponse.json(payload);
    } catch (aiError: any) {
      console.log('AI API failed:', aiError?.message || aiError);
      const payload = {
        query: trimmedQuery,
        suggestions: merged,
        source: merged.length > 0 ? 'local_fallback' : 'none',
      };
      cacheSet(cacheKey, payload);
      return NextResponse.json(payload);
    }

  } catch (error: any) {
    console.error('Symbol suggest error:', error?.message || error);

    return NextResponse.json(
      { error: '联想搜索失败，请稍后重试', suggestions: [] },
      { status: 500 }
    );
  }
}
