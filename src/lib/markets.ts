// 支持的市场类型
export type MarketType = 'US' | 'CN' | 'HK' | 'JP';

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
  // FMP 股票代码后缀（如果需要）
  symbolSuffix?: string;
  // 该市场支持的数据类型
  supportedFeatures: {
    // 基础数据
    profile: boolean;
    quote: boolean;
    peers: boolean;
    // 财务报表
    incomeStatement: boolean;
    balanceSheet: boolean;
    cashFlow: boolean;
    // 关键指标
    keyMetrics: boolean;
    financialRatios: boolean;
    financialGrowth: boolean;
    // 估值
    dcf: boolean;
    enterpriseValue: boolean;
    // 事件
    earningsCalendar: boolean;
    dividendHistory: boolean;
    stockSplits: boolean;
    // 持仓（仅美股）
    institutionalHolders: boolean;
    insiderTrading: boolean;
    mutualFundHolders: boolean;
    etfHolders: boolean;
    // 其他
    news: boolean;
    earningsTranscript: boolean;
    historicalPrices: boolean;
    analystRatings: boolean;
  };
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
    supportedFeatures: {
      profile: true,
      quote: true,
      peers: true,
      incomeStatement: true,
      balanceSheet: true,
      cashFlow: true,
      keyMetrics: true,
      financialRatios: true,
      financialGrowth: true,
      dcf: true,
      enterpriseValue: true,
      earningsCalendar: true,
      dividendHistory: true,
      stockSplits: true,
      institutionalHolders: true,
      insiderTrading: true,
      mutualFundHolders: true,
      etfHolders: true,
      news: true,
      earningsTranscript: true,
      historicalPrices: true,
      analystRatings: true,
    },
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
    supportedFeatures: {
      profile: true,
      quote: true,
      peers: false, // FMP 可能不支持 A 股的同业比较
      incomeStatement: true,
      balanceSheet: true,
      cashFlow: true,
      keyMetrics: true,
      financialRatios: true,
      financialGrowth: true,
      dcf: true,
      enterpriseValue: true,
      earningsCalendar: false,
      dividendHistory: true,
      stockSplits: true,
      institutionalHolders: false,
      insiderTrading: false,
      mutualFundHolders: false,
      etfHolders: false,
      news: false, // FMP 新闻可能不覆盖 A 股
      earningsTranscript: false,
      historicalPrices: true,
      analystRatings: false,
    },
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
    supportedFeatures: {
      profile: true,
      quote: true,
      peers: false,
      incomeStatement: true,
      balanceSheet: true,
      cashFlow: true,
      keyMetrics: true,
      financialRatios: true,
      financialGrowth: true,
      dcf: true,
      enterpriseValue: true,
      earningsCalendar: false,
      dividendHistory: true,
      stockSplits: true,
      institutionalHolders: false,
      insiderTrading: false,
      mutualFundHolders: false,
      etfHolders: false,
      news: false,
      earningsTranscript: false,
      historicalPrices: true,
      analystRatings: false,
    },
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
    supportedFeatures: {
      profile: true,
      quote: true,
      peers: false,
      incomeStatement: true,
      balanceSheet: true,
      cashFlow: true,
      keyMetrics: true,
      financialRatios: true,
      financialGrowth: true,
      dcf: true,
      enterpriseValue: true,
      earningsCalendar: false,
      dividendHistory: true,
      stockSplits: true,
      institutionalHolders: false,
      insiderTrading: false,
      mutualFundHolders: false,
      etfHolders: false,
      news: false,
      earningsTranscript: false,
      historicalPrices: true,
      analystRatings: false,
    },
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
    case 'US':
    default:
      return upperSymbol;
  }
}

// 获取市场配置
export function getMarketConfig(market: MarketType): MarketConfig {
  return MARKET_CONFIGS[market];
}

// 检查某个功能在特定市场是否可用
export function isFeatureSupported(
  market: MarketType,
  feature: keyof MarketConfig['supportedFeatures']
): boolean {
  return MARKET_CONFIGS[market].supportedFeatures[feature];
}

// 获取所有市场列表
export function getAllMarkets(): MarketConfig[] {
  return Object.values(MARKET_CONFIGS);
}
