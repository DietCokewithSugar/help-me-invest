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

  // 公司概况 - 新格式使用 symbol 参数
  async getProfile(symbol: string) {
    return this.fetch<any[]>(`/profile`, { symbol });
  }

  // 利润表
  async getIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/income-statement`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // 竞争对手 - 可能需要付费订阅，失败时返回空数组
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
      console.log('Peers API error (可能需要付费订阅):', e?.message || e);
      return [];
    }
  }

  // 股票新闻 - 可能需要付费订阅，失败时返回空数组
  async getNews(symbol: string, limit = 10) {
    try {
      const result = await this.fetch<any[]>(`/news/stock`, { 
        symbols: symbol, 
        limit: String(limit),
        page: '0'
      });
      return result || [];
    } catch (e: any) {
      console.log('News API error (可能需要付费订阅):', e?.message || e);
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

  // 收入分部数据
  async getRevenueSegmentation(symbol: string) {
    return this.fetch<any>(`/revenue-product-segmentation`, { 
      symbol, 
      structure: 'flat' 
    });
  }

  // 行业表现
  async getSectorPerformance() {
    return this.fetch<any[]>(`/sector-performance`);
  }

  // 搜索公司
  async searchCompany(query: string) {
    return this.fetch<any[]>(`/search`, { query, limit: '10' });
  }

  // 关键指标
  async getKeyMetrics(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/key-metrics`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }

  // 财务比率
  async getFinancialRatios(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 5) {
    return this.fetch<any[]>(`/ratios`, { 
      symbol, 
      period, 
      limit: String(limit) 
    });
  }
}
