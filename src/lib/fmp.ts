// FMP API 新端点格式
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

export class FMPClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${FMP_BASE_URL}${endpoint}`);
    url.searchParams.set('apikey', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    console.log('FMP API Request:', url.toString().replace(this.apiKey, '***'));

    const response = await fetch(url.toString(), {
      headers: {
        'apikey': this.apiKey,
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('FMP API Error:', response.status, errorText);
      throw new Error(`FMP API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  // ==================== 公司基础信息 ====================
  
  // 公司概况
  async getProfile(symbol: string) {
    return this.fetch<any[]>(`/profile`, { symbol });
  }

  // 搜索公司
  async searchCompany(query: string) {
    return this.fetch<any[]>(`/search`, { query, limit: '10' });
  }

  // 竞争对手
  async getPeers(symbol: string) {
    try {
      const result = await this.fetch<any>(`/stock-peers`, { symbol });
      if (Array.isArray(result) && result.length > 0 && result[0].peersList) {
        return result[0].peersList as string[];
      }
      if (result && result.peersList) {
        return result.peersList as string[];
      }
      return [];
    } catch (e: any) {
      console.log('Peers API error:', e?.message || e);
      return [];
    }
  }

  // ==================== 三大财务报表 ====================
  
  // 利润表 Income Statement
  async getIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/income-statement`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // 资产负债表 Balance Sheet
  async getBalanceSheet(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/balance-sheet-statement`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // 现金流量表 Cash Flow Statement
  async getCashFlowStatement(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/cash-flow-statement`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // ==================== 关键财务指标 ====================
  
  // 关键指标 (市值、PE、PB、EV/EBITDA 等)
  async getKeyMetrics(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/key-metrics`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // 财务比率 (ROE、ROA、流动比率、速动比率等)
  async getFinancialRatios(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/ratios`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // TTM 财务比率 (过去12个月)
  async getFinancialRatiosTTM(symbol: string) {
    return this.fetch<any[]>(`/ratios-ttm`, { symbol });
  }

  // 财务增长指标
  async getFinancialGrowth(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/financial-growth`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // ==================== 估值与分析 ====================
  
  // DCF 估值 (Discounted Cash Flow)
  async getDCF(symbol: string) {
    return this.fetch<any[]>(`/discounted-cash-flow`, { symbol });
  }

  // 历史 DCF 估值
  async getHistoricalDCF(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/historical-discounted-cash-flow-statement`, { 
      symbol,
      period,
      limit: String(limit)
    });
  }

  // 企业价值 (Enterprise Value)
  async getEnterpriseValue(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/enterprise-values`, { 
      symbol,
      period,
      limit: String(limit)
    });
  }

  // 收入分部数据
  async getRevenueSegmentation(symbol: string) {
    return this.fetch<any>(`/revenue-product-segmentation`, { 
      symbol, 
      structure: 'flat' 
    });
  }

  // 地区收入分部
  async getRevenueGeographic(symbol: string) {
    return this.fetch<any>(`/revenue-geographic-segmentation`, { 
      symbol,
      structure: 'flat'
    });
  }

  // ==================== 市场事件与日历 ====================
  
  // 财报日历 (Earnings Calendar)
  async getEarningsCalendar(symbol: string) {
    return this.fetch<any[]>(`/earning-calendar`, { symbol });
  }

  // 历史财报日历
  async getHistoricalEarnings(symbol: string, limit = 10) {
    return this.fetch<any[]>(`/historical/earning-calendar`, { 
      symbol,
      limit: String(limit)
    });
  }

  // 分红日历 (Dividend Calendar)
  async getDividendCalendar(symbol: string) {
    return this.fetch<any[]>(`/stock-dividend-calendar`, { symbol });
  }

  // 历史分红数据
  async getHistoricalDividends(symbol: string) {
    return this.fetch<any[]>(`/historical-price-eod/dividend`, { symbol });
  }

  // 拆股历史 (Stock Splits)
  async getStockSplits(symbol: string) {
    return this.fetch<any[]>(`/historical-price-eod/stock-split`, { symbol });
  }

  // ==================== 机构持仓与内幕交易 ====================
  
  // 机构持仓 (13F Reports)
  async getInstitutionalHolders(symbol: string) {
    return this.fetch<any[]>(`/institutional-holder`, { symbol });
  }

  // 共同基金持仓
  async getMutualFundHolders(symbol: string) {
    return this.fetch<any[]>(`/mutual-fund-holder`, { symbol });
  }

  // ETF 持仓
  async getEtfHolders(symbol: string) {
    return this.fetch<any[]>(`/etf-holder`, { symbol });
  }

  // 内幕交易
  async getInsiderTrading(symbol: string, limit = 50) {
    return this.fetch<any[]>(`/insider-trading`, { 
      symbol,
      limit: String(limit)
    });
  }

  // 内幕持仓汇总
  async getInsiderRoster(symbol: string) {
    return this.fetch<any[]>(`/insider-roaster`, { symbol });
  }

  // ==================== 新闻与电话会议 ====================
  
  // 股票新闻
  async getNews(symbol: string, limit = 10) {
    try {
      const result = await this.fetch<any[]>(`/news/stock`, { 
        symbols: symbol, 
        limit: String(limit),
        page: '0'
      });
      return result || [];
    } catch (e: any) {
      console.log('News API error:', e?.message || e);
      return [];
    }
  }

  // 财报电话会议记录
  async getEarningsTranscript(symbol: string, year: number, quarter: number) {
    return this.fetch<any[]>(`/earning-call-transcript`, { 
      symbol,
      year: String(year), 
      quarter: String(quarter) 
    });
  }

  // ==================== 行业与板块 ====================
  
  // 行业表现
  async getSectorPerformance() {
    return this.fetch<any[]>(`/sector-performance`);
  }

  // 行业 PE 比率
  async getSectorPE() {
    try {
      return this.fetch<any[]>(`/sector-pe`);
    } catch (e) {
      return [];
    }
  }

  // 行业历史表现
  async getHistoricalSectorPerformance(limit = 30) {
    try {
      return this.fetch<any[]>(`/historical-sectors-performance`, {
        limit: String(limit)
      });
    } catch (e) {
      return [];
    }
  }

  // ==================== 股价相关 ====================
  
  // 实时股价
  async getQuote(symbol: string) {
    return this.fetch<any[]>(`/quote`, { symbol });
  }

  // 历史股价
  async getHistoricalPrice(symbol: string, from?: string, to?: string) {
    const params: Record<string, string> = { symbol };
    if (from) params.from = from;
    if (to) params.to = to;
    return this.fetch<any[]>(`/historical-price-eod/full`, params);
  }

  // 分钟级别行情
  async getIntradayChart(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '1hour' = '1min') {
    return this.fetch<any[]>(`/historical-chart/${interval}`, { symbol });
  }

  // 技术指标
  async getTechnicalIndicators(symbol: string, period: '1day' | '1hour' = '1day') {
    return this.fetch<any>(`/technical-indicators`, { symbol, period });
  }

  // ==================== 评级与目标价 ====================
  
  // 分析师评级
  async getAnalystRatings(symbol: string) {
    try {
      return this.fetch<any[]>(`/grade`, { symbol });
    } catch (e) {
      return [];
    }
  }

  // 分析师评级汇总
  async getAnalystRatingsConsensus(symbol: string) {
    try {
      return this.fetch<any[]>(`/rating`, { symbol });
    } catch (e) {
      return [];
    }
  }

  // 目标价格
  async getPriceTarget(symbol: string) {
    try {
      return this.fetch<any[]>(`/price-target`, { symbol });
    } catch (e) {
      return [];
    }
  }

  // 目标价格汇总
  async getPriceTargetConsensus(symbol: string) {
    try {
      return this.fetch<any[]>(`/price-target-consensus`, { symbol });
    } catch (e) {
      return [];
    }
  }
}
