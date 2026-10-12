// FMP API 新端点格式
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

// ==================== 请求队列系统 ====================

// 请求队列配置
const QUEUE_CONFIG = {
  maxConcurrent: 5,        // 最大并发请求数
  maxRetries: 1,           // 最大重试次数（FMP 只是补充源，失败要快速让位给其他数据源）
  baseDelay: 1000,         // 基础重试延迟（毫秒）
  maxDelay: 8000,          // 最大重试延迟（毫秒）
  jitterFactor: 0.3,       // 抖动因子（防止雷群效应）
};

// 不同类型端点的超时配置
const TIMEOUT_CONFIG: Record<string, number> = {
  // 关键端点 - 快速超时
  '/discounted-cash-flow': 10000,
  '/profile': 10000,
  '/quote': 8000,
  // 数据密集型端点 - 较长超时
  '/historical-price-eod': 15000,
  '/income-statement': 20000,
  '/balance-sheet-statement': 20000,
  '/cash-flow-statement': 20000,
  // 默认超时
  default: 15000,
};

// 请求队列状态
interface QueueState {
  activeRequests: number;
  queue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    execute: () => Promise<any>;
  }>;
}

// 全局请求队列
const requestQueue: QueueState = {
  activeRequests: 0,
  queue: [],
};

// 处理队列中的下一个请求
function processQueue() {
  if (requestQueue.activeRequests >= QUEUE_CONFIG.maxConcurrent || requestQueue.queue.length === 0) {
    return;
  }

  const next = requestQueue.queue.shift();
  if (!next) return;

  requestQueue.activeRequests++;
  console.log(`FMP Queue: Starting request (active: ${requestQueue.activeRequests}, queued: ${requestQueue.queue.length})`);

  next.execute()
    .then(next.resolve)
    .catch(next.reject)
    .finally(() => {
      requestQueue.activeRequests--;
      console.log(`FMP Queue: Request completed (active: ${requestQueue.activeRequests}, queued: ${requestQueue.queue.length})`);
      processQueue();
    });
}

// 将请求加入队列
function enqueue<T>(execute: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.queue.push({ resolve, reject, execute });
    console.log(`FMP Queue: Request queued (position: ${requestQueue.queue.length})`);
    processQueue();
  });
}

// ==================== 错误检测与重试 ====================

// 扩展的网络错误检测
function isRetryableError(error: any): boolean {
  // AbortError（超时）
  if (error.name === 'AbortError') return true;

  // 网络错误代码
  const networkCodes = [
    'UND_ERR_CONNECT_TIMEOUT',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'EPIPE',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ENETUNREACH',
  ];
  if (error.cause?.code && networkCodes.includes(error.cause.code)) return true;

  // 错误消息模式
  const errorPatterns = [
    'fetch failed',
    'network',
    'socket hang up',
    'connection refused',
    'ECONNRESET',
    'timeout',
  ];
  const errorMessage = (error.message || '').toLowerCase();
  if (errorPatterns.some(p => errorMessage.includes(p.toLowerCase()))) return true;

  // HTTP 状态码（可重试的）
  if (error.status === 429 || error.status === 503 || error.status === 502 || error.status === 504) {
    return true;
  }

  return false;
}

// 计算重试延迟（指数退避 + 抖动）
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = QUEUE_CONFIG.baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, QUEUE_CONFIG.maxDelay);
  const jitter = cappedDelay * QUEUE_CONFIG.jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
}

// 获取端点超时时间
function getTimeoutForEndpoint(endpoint: string): number {
  // 检查精确匹配
  if (TIMEOUT_CONFIG[endpoint]) {
    return TIMEOUT_CONFIG[endpoint];
  }
  // 检查前缀匹配
  for (const [key, value] of Object.entries(TIMEOUT_CONFIG)) {
    if (key !== 'default' && endpoint.startsWith(key)) {
      return value;
    }
  }
  return TIMEOUT_CONFIG.default;
}

// ==================== 熔断：免费版额度保护 ====================
//
// FMP 免费版每天 250 次请求，且部分端点只对付费计划开放（返回 401/402/403）。
// 一旦撞到这些错误就在进程内熔断，避免每份报告都白白重试、拖慢响应并继续消耗额度。

const QUOTA_COOLDOWN_MS = 30 * 60 * 1000;
const ENDPOINT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

let fmpDisabledUntil = 0;
const endpointBlockedUntil = new Map<string, number>();

export class FMPUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FMPUnavailableError';
  }
}

export function isFmpAvailable(endpoint?: string): boolean {
  const now = Date.now();
  if (fmpDisabledUntil > now) return false;
  if (endpoint && (endpointBlockedUntil.get(endpoint) ?? 0) > now) return false;
  return true;
}

function tripBreaker(endpoint: string, status: number) {
  const now = Date.now();
  if (status === 429 || status === 401) {
    fmpDisabledUntil = now + QUOTA_COOLDOWN_MS;
    console.warn(`FMP disabled for ${QUOTA_COOLDOWN_MS / 60000} min after ${status} on ${endpoint}`);
  } else {
    endpointBlockedUntil.set(endpoint, now + ENDPOINT_COOLDOWN_MS);
    console.warn(`FMP endpoint ${endpoint} blocked for this plan (${status})`);
  }
}

// ==================== FMP 客户端 ====================

export class FMPClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    // 将请求加入队列执行
    return enqueue(() => this.executeRequest<T>(endpoint, params));
  }

  private async executeRequest<T>(
    endpoint: string,
    params: Record<string, string>,
    attempt: number = 0
  ): Promise<T> {
    if (!isFmpAvailable(endpoint)) {
      throw new FMPUnavailableError(`FMP ${endpoint} unavailable on current plan / quota`);
    }

    const url = new URL(`${FMP_BASE_URL}${endpoint}`);
    url.searchParams.set('apikey', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const timeout = getTimeoutForEndpoint(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startTime = Date.now();

    console.log(`FMP Request: ${endpoint} (timeout: ${timeout}ms, attempt: ${attempt + 1}/${QUEUE_CONFIG.maxRetries + 1})`);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'apikey': this.apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`FMP API Error: ${response.status} ${errorText} (${elapsed}ms)`);

        // 创建带有状态码的错误对象
        const error = new Error(`FMP API error: ${response.status} - ${errorText}`);
        (error as any).status = response.status;

        // 额度耗尽或计划不支持：熔断后直接失败，不重试
        if ([401, 402, 403, 429].includes(response.status)) {
          tripBreaker(endpoint, response.status);
          throw error;
        }

        // 检查是否可重试
        if (isRetryableError(error) && attempt < QUEUE_CONFIG.maxRetries) {
          const delay = calculateRetryDelay(attempt);
          console.log(`FMP Retry: Attempt ${attempt + 2}/${QUEUE_CONFIG.maxRetries + 1} after ${delay}ms for ${endpoint}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.executeRequest<T>(endpoint, params, attempt + 1);
        }

        throw error;
      }

      console.log(`FMP Request: Completed ${endpoint} in ${elapsed}ms`);
      const payload = await response.json();
      // 旧计划的受限端点会以 200 + {"Error Message": ...} 的形式返回
      if (payload && !Array.isArray(payload) && typeof payload === 'object' && 'Error Message' in payload) {
        tripBreaker(endpoint, 403);
        const error = new Error(`FMP API error: ${String((payload as any)['Error Message']).slice(0, 200)}`);
        (error as any).status = 403;
        throw error;
      }
      return payload;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (error instanceof FMPUnavailableError || [401, 402, 403, 429].includes(error?.status)) {
        throw error;
      }

      // 检查是否可重试
      if (isRetryableError(error) && attempt < QUEUE_CONFIG.maxRetries) {
        const delay = calculateRetryDelay(attempt);
        console.log(`FMP Retry: Attempt ${attempt + 2}/${QUEUE_CONFIG.maxRetries + 1} after ${delay}ms for ${endpoint} (error: ${error.message || error.name})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequest<T>(endpoint, params, attempt + 1);
      }

      console.error(`FMP Request Failed: ${endpoint} after ${elapsed}ms (${error.message || error.name})`);
      throw error;
    }
  }

  // 仅保留免费版可用、且报告实际用到的端点；其余数据见 market-data.ts 的多源编排

  // 公司概况（含最新价、市值、描述、CEO、行业等）
  async getProfile(symbol: string) {
    return this.fetch<any[]>(`/profile`, { symbol });
  }

  // 实时报价
  async getQuote(symbol: string) {
    return this.fetch<any[]>(`/quote`, { symbol });
  }

  // 日线收盘价（light：date / price / volume），新→旧
  async getHistoricalPrices(symbol: string, from: string) {
    return this.fetch<any[]>(`/historical-price-eod/light`, { symbol, from });
  }

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

  // DCF 估值 (Discounted Cash Flow)
  async getDCF(symbol: string) {
    return this.fetch<any[]>(`/discounted-cash-flow`, { symbol });
  }
}
