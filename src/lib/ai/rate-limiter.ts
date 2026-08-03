/**
 * DeepSeek API 速率限制器 - 防止 429 Too Many Requests 错误
 *
 * 注意：状态保存在模块作用域内，因此约束范围是「单个进程」。
 * Vercel 上每个 lambda 实例各有一份，不构成全局上限；
 * 自建服务器上是单进程长驻，才真正全局生效。参数见 deepseek-config.ts。
 */

import { DEEPSEEK_MAX_CONCURRENT, DEEPSEEK_MIN_DELAY_MS } from './deepseek-config';

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  label: string;
}

export class DeepSeekRateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private readonly maxConcurrent: number;
  private readonly minDelayMs: number;
  private lastRequestTime = 0;
  private isProcessing = false;

  constructor(maxConcurrent = 2, minDelayMs = 1500) {
    this.maxConcurrent = maxConcurrent;
    this.minDelayMs = minDelayMs;
  }

  /**
   * 将请求添加到队列，并返回结果 Promise
   */
  async enqueue<T>(execute: () => Promise<T>, label = 'request'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ execute, resolve, reject, label });
      this.processQueue();
    });
  }

  /**
   * 处理队列中的请求
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) continue;

      // 计算需要等待的时间
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const waitTime = Math.max(0, this.minDelayMs - timeSinceLastRequest);

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }

      this.activeRequests++;
      this.lastRequestTime = Date.now();

      // 异步执行请求，不阻塞队列处理
      this.executeRequest(request);
    }

    this.isProcessing = false;
  }

  /**
   * 执行单个请求
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error: any) {
      // 如果是 429 错误，添加额外等待后重试
      // 依赖 error.message 中带有状态码，DeepSeekApiError 保证了这一点
      if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
        console.warn(`[RateLimiter] 429 错误，等待 2 秒后重试: ${request.label}`);
        await this.sleep(2000);
        try {
          const result = await request.execute();
          request.resolve(result);
        } catch (retryError) {
          request.reject(retryError);
        }
      } else {
        request.reject(error);
      }
    } finally {
      this.activeRequests--;
      // 继续处理队列中的下一个请求
      this.processQueue();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 全局速率限制器实例 - 所有 DeepSeekClient 共享
export const globalRateLimiter = new DeepSeekRateLimiter(
  DEEPSEEK_MAX_CONCURRENT,
  DEEPSEEK_MIN_DELAY_MS
);
