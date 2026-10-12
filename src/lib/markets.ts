// 支持的市场类型
export type MarketType = 'US' | 'CN' | 'HK' | 'JP' | 'KR' | 'AU';

// 市场配置接口
export interface MarketConfig {
  id: MarketType;
  name: string;
  nameCn: string;
  currency: string;
  currencySymbol: string;
  exchanges: string[];
  // 股票代码格式说明
  symbolFormat: string;
  symbolExample: string;
  // 股票代码后缀（与 Yahoo Finance 一致）
  symbolSuffix?: string;
  // 热门股票
  featuredStocks: { symbol: string; name: string }[];
}

// 各市场配置
export const MARKET_CONFIGS: Record<MarketType, MarketConfig> = {
  US: {
    id: 'US',
    name: 'US Stock',
    nameCn: '美股',
    currency: 'USD',
    currencySymbol: '$',
    exchanges: ['NYSE', 'NASDAQ', 'AMEX'],
    symbolFormat: '直接输入股票代码',
    symbolExample: 'AAPL, TSLA, NVDA',
    featuredStocks: [
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'META', name: 'Meta' },
      { symbol: 'AMD', name: 'AMD' },
    ],
  },
  CN: {
    id: 'CN',
    name: 'A-Share',
    nameCn: 'A股',
    currency: 'CNY',
    currencySymbol: '¥',
    exchanges: ['SSE', 'SZSE'], // 上交所、深交所
    symbolFormat: '股票代码 + 交易所后缀',
    symbolExample: '600519.SS (茅台), 000001.SZ (平安)',
    symbolSuffix: '.SS/.SZ',
    featuredStocks: [
      { symbol: '600519.SS', name: '贵州茅台' },
      { symbol: '000001.SZ', name: '平安银行' },
      { symbol: '000858.SZ', name: '五粮液' },
      { symbol: '600276.SS', name: '恒瑞医药' },
      { symbol: '002594.SZ', name: '比亚迪' },
    ],
  },
  HK: {
    id: 'HK',
    name: 'HK Stock',
    nameCn: '港股',
    currency: 'HKD',
    currencySymbol: 'HK$',
    exchanges: ['HKEX'],
    symbolFormat: '股票代码 + .HK 后缀',
    symbolExample: '0700.HK (腾讯), 9988.HK (阿里)',
    symbolSuffix: '.HK',
    featuredStocks: [
      { symbol: '0700.HK', name: '腾讯控股' },
      { symbol: '9988.HK', name: '阿里巴巴' },
      { symbol: '3690.HK', name: '美团' },
      { symbol: '9999.HK', name: '网易' },
      { symbol: '1810.HK', name: '小米集团' },
      { symbol: '9618.HK', name: '京东集团' },
      { symbol: '2318.HK', name: '中国平安' },
      { symbol: '0005.HK', name: '汇丰控股' },
    ],
  },
  JP: {
    id: 'JP',
    name: 'Japan Stock',
    nameCn: '日股',
    currency: 'JPY',
    currencySymbol: '¥',
    exchanges: ['TSE'], // 东京证券交易所
    symbolFormat: '股票代码 + .T 后缀',
    symbolExample: '7203.T (丰田), 6758.T (索尼)',
    symbolSuffix: '.T',
    featuredStocks: [
      { symbol: '7203.T', name: '丰田汽车' },
      { symbol: '6758.T', name: '索尼' },
      { symbol: '9984.T', name: '软银集团' },
      { symbol: '6861.T', name: '基恩士' },
      { symbol: '8306.T', name: '三菱UFJ' },
      { symbol: '7974.T', name: '任天堂' },
      { symbol: '6501.T', name: '日立制作所' },
      { symbol: '4502.T', name: '武田药品' },
    ],
  },
  KR: {
    id: 'KR',
    name: 'Korea Stock',
    nameCn: '韩股',
    currency: 'KRW',
    currencySymbol: '₩',
    exchanges: ['KRX'], // KOSPI（主板）+ KOSDAQ（创业板）
    symbolFormat: '股票代码 + .KS / .KQ 后缀',
    symbolExample: '005930.KS (三星电子), 035420.KS (NAVER)',
    symbolSuffix: '.KS/.KQ',
    featuredStocks: [
      { symbol: '005930.KS', name: '三星电子' },
      { symbol: '000660.KS', name: 'SK海力士' },
      { symbol: '035420.KS', name: 'NAVER' },
      { symbol: '035720.KS', name: 'Kakao' },
      { symbol: '005380.KS', name: '现代汽车' },
      { symbol: '051910.KS', name: 'LG化学' },
      { symbol: '207940.KS', name: '三星生物制剂' },
      { symbol: '068270.KS', name: 'Celltrion' },
    ],
  },
  AU: {
    id: 'AU',
    name: 'Australia Stock',
    nameCn: '澳股',
    currency: 'AUD',
    currencySymbol: 'A$',
    exchanges: ['ASX'], // 澳大利亚证券交易所
    symbolFormat: '股票代码 + .AX 后缀',
    symbolExample: 'CBA.AX (澳洲联邦银行), BHP.AX (必和必拓)',
    symbolSuffix: '.AX',
    featuredStocks: [
      { symbol: 'CBA.AX', name: '澳洲联邦银行' },
      { symbol: 'BHP.AX', name: '必和必拓' },
      { symbol: 'CSL.AX', name: 'CSL' },
      { symbol: 'WBC.AX', name: '西太平洋银行' },
      { symbol: 'NAB.AX', name: '澳洲国民银行' },
      { symbol: 'ANZ.AX', name: '澳新银行' },
    ],
  },
};

// 根据股票代码检测市场类型
export function detectMarketFromSymbol(symbol: string): MarketType {
  const upperSymbol = symbol.toUpperCase();
  
  if (upperSymbol.endsWith('.SS') || upperSymbol.endsWith('.SZ')) {
    return 'CN';
  }
  if (upperSymbol.endsWith('.HK')) {
    return 'HK';
  }
  if (upperSymbol.endsWith('.T')) {
    return 'JP';
  }
  if (upperSymbol.endsWith('.KS') || upperSymbol.endsWith('.KQ')) {
    return 'KR';
  }
  if (upperSymbol.endsWith('.AX')) {
    return 'AU';
  }
  
  // 默认美股
  return 'US';
}

// 格式化股票代码（添加市场后缀）
export function formatSymbolForMarket(symbol: string, market: MarketType): string {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // 如果已经有后缀，直接返回
  if (upperSymbol.includes('.')) {
    return upperSymbol;
  }
  
  // 根据市场添加后缀
  switch (market) {
    case 'CN':
      // A 股需要根据代码判断是上交所还是深交所
      // 6 开头的是上交所，0/3 开头的是深交所
      if (upperSymbol.startsWith('6')) {
        return `${upperSymbol}.SS`;
      } else if (upperSymbol.startsWith('0') || upperSymbol.startsWith('3')) {
        return `${upperSymbol}.SZ`;
      }
      // 默认返回原始代码
      return upperSymbol;
    case 'HK':
      return `${upperSymbol}.HK`;
    case 'JP':
      return `${upperSymbol}.T`;
    case 'KR':
      // 韩股大多在 KOSPI 主板（.KS），KOSDAQ（.KQ）需用户显式带后缀
      // 这里默认补 .KS，保留 6 位数字标准格式
      return `${upperSymbol}.KS`;
    case 'AU':
      return `${upperSymbol}.AX`;
    case 'US':
    default:
      return upperSymbol;
  }
}

// 获取市场配置
export function getMarketConfig(market: MarketType): MarketConfig {
  return MARKET_CONFIGS[market];
}


// 获取所有市场列表
export function getAllMarkets(): MarketConfig[] {
  return Object.values(MARKET_CONFIGS);
}
