const FMP_MCP_ENDPOINT = 'https://financialmodelingprep.com/mcp';
const MCP_ACCEPT_HEADER = 'application/json, text/event-stream';

interface JsonRpcError {
  code: number;
  message: string;
}

interface JsonRpcResponse<T> {
  id?: number | string | null;
  result?: T;
  error?: JsonRpcError;
}

interface ToolCallContent {
  type: string;
  text?: string;
}

interface ToolCallResult<T> {
  content?: ToolCallContent[];
  structuredContent?: {
    data?: T;
    [key: string]: unknown;
  };
}

interface InitializeResult {
  protocolVersion: string;
}

export interface CompanyScreenerArgs {
  sector?: string;
  limit?: number;
  isActivelyTrading?: boolean;
  includeAllShareClasses?: boolean;
  exchange?: string;
}

export interface HistoricalSectorPerformanceArgs {
  exchange?: string;
  from?: string;
  to?: string;
}

export class FMPMCPClient {
  private readonly apiKey: string;
  private sessionId: string | null = null;
  private initializePromise: Promise<void> | null = null;
  private requestId = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getSectorPerformanceSnapshot(date: string) {
    return this.callTool<any[]>('sector-performance-snapshot', { date });
  }

  async getSectorPESnapshot(date: string) {
    return this.callTool<any[]>('sector-PE-snapshot', { date });
  }

  async getHistoricalSectorPerformance(sector: string, args: HistoricalSectorPerformanceArgs = {}) {
    const directResult = await this.getHistoricalSectorPerformanceDirect(sector, args);
    if (Array.isArray(directResult) && directResult.length > 0) {
      return directResult;
    }
    return this.callTool<any[]>('historical-sector-performance', { sector, ...args });
  }

  private async getHistoricalSectorPerformanceDirect(
    sector: string,
    args: HistoricalSectorPerformanceArgs = {}
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({ apikey: this.apiKey, sector });
      if (args.from) params.set('from', args.from);
      if (args.to) params.set('to', args.to);
      if (args.exchange) params.set('exchange', args.exchange);

      const url = `https://financialmodelingprep.com/stable/sector-performance/historical?${params}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async searchCompanyScreener(args: CompanyScreenerArgs) {
    return this.callTool<any[]>('search-company-screener', args);
  }

  async getQuote(symbol: string) {
    return this.callTool<any[]>('quote', { symbol });
  }

  async getProfile(symbol: string) {
    return this.callTool<any[]>('profile-symbol', { symbol });
  }

  async getFinancialStatementGrowth(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 1) {
    return this.callTool<any[]>('financial-statement-growth', {
      symbol,
      period,
      limit,
    });
  }

  async searchStockNews(symbols: string[], limit = 10) {
    return this.callTool<any[]>('search-stock-news', {
      symbols,
      limit,
      page: 0,
    });
  }

  /**
   * Lightweight EOD price history straight from the FMP REST API.
   * Returns rows with { symbol, date, price, volume } in descending date order.
   * Uses direct REST instead of MCP because the MCP tool wraps the same data
   * with significant per-call overhead — for sparkline fan-out this matters.
   */
  async getHistoricalPriceLight(symbol: string, from?: string, to?: string): Promise<Array<{ date: string; price: number }>> {
    try {
      const params = new URLSearchParams({ apikey: this.apiKey, symbol });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const url = `https://financialmodelingprep.com/stable/historical-price-eod/light?${params}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      return data
        .map((row: any) => ({
          date: typeof row?.date === 'string' ? row.date : '',
          price: typeof row?.price === 'number' ? row.price : Number(row?.price) || 0,
        }))
        .filter((row) => row.date && row.price > 0);
    } catch {
      return [];
    }
  }

  private async callTool<T>(name: string, args: object = {}): Promise<T> {
    await this.ensureInitialized();
    const payload = {
      jsonrpc: '2.0',
      id: this.nextRequestId(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    const response = await this.postRpc<ToolCallResult<T>>(payload, true);
    if (!response.json.result) {
      return [] as unknown as T;
    }
    return this.extractResultData(response.json.result);
  }

  private extractResultData<T>(result: ToolCallResult<T>): T {
    if (result.structuredContent && Object.prototype.hasOwnProperty.call(result.structuredContent, 'data')) {
      return result.structuredContent.data as T;
    }

    const textPayload = result.content?.find((item) => item.type === 'text' && typeof item.text === 'string')?.text;
    if (textPayload) {
      try {
        return JSON.parse(textPayload) as T;
      } catch {
        return textPayload as unknown as T;
      }
    }

    return [] as unknown as T;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.sessionId) return;
    if (this.initializePromise) {
      await this.initializePromise;
      return;
    }

    this.initializePromise = this.initialize();
    try {
      await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }

  private async initialize(): Promise<void> {
    const payload = {
      jsonrpc: '2.0',
      id: this.nextRequestId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: 'help-me-invest-web',
          version: '1.0.0',
        },
        capabilities: {},
      },
    };

    const response = await this.postRpc<InitializeResult>(payload, false);
    if (!response.json.result) {
      throw new Error('FMP MCP initialize did not return a result payload.');
    }
    const sessionId = response.headers.get('mcp-session-id') || response.headers.get('Mcp-Session-Id');
    if (!sessionId) {
      throw new Error('FMP MCP initialize succeeded but no session id was returned.');
    }
    this.sessionId = sessionId;

    const initializedPayload = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    };
    await this.postNotification(initializedPayload);
  }

  private async postNotification(payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`FMP MCP notification failed (${response.status}): ${message || response.statusText}`);
    }
  }

  private async postRpc<T>(payload: Record<string, unknown>, withSession: boolean): Promise<{
    json: JsonRpcResponse<T>;
    headers: Headers;
  }> {
    const response = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(withSession),
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`FMP MCP request failed (${response.status}): ${raw || response.statusText}`);
    }

    let parsed: JsonRpcResponse<T> = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as JsonRpcResponse<T>;
      } catch {
        throw new Error(`FMP MCP returned invalid JSON: ${raw}`);
      }
    }

    if (parsed.error) {
      throw new Error(`FMP MCP error (${parsed.error.code}): ${parsed.error.message}`);
    }

    return { json: parsed, headers: response.headers };
  }

  private buildHeaders(withSession: boolean): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: MCP_ACCEPT_HEADER,
    };

    if (withSession && this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    return headers;
  }

  private buildUrl(): string {
    return `${FMP_MCP_ENDPOINT}?apikey=${encodeURIComponent(this.apiKey)}`;
  }

  private nextRequestId(): number {
    this.requestId += 1;
    return this.requestId;
  }
}
