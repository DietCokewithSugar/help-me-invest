/**
 * API 工具函数 - 带重试和超时机制
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs: number;
  label: string;
}

/**
 * 带重试和超时的 Promise 包装器
 * @param promiseFactory - 接收 AbortSignal 并返回 Promise 的工厂函数（每次重试都会调用）
 * @param options - 配置选项
 * @param fallback - 所有重试失败后的回退值
 *
 * 超时会真正 abort 掉底层请求。此前的实现只是让外层 Promise 先 reject，
 * 被放弃的请求仍在后台跑完，期间一直占着 DeepSeek 限流器的并发名额，
 * 于是一次逻辑调用最多能占满 maxConcurrent=2 的全部名额并拖垮其他调用。
 */
export async function withRetryAndTimeout<T>(
  promiseFactory: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions,
  fallback: T
): Promise<T> {
  const { maxRetries = 3, retryDelayMs = 1000, timeoutMs, label } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`[${label}] 请求超时 (${timeoutMs}ms)`));
    }, timeoutMs);

    try {
      return await promiseFactory(controller.signal);
    } catch (error: any) {
      lastError = controller.signal.aborted
        ? new Error(`[${label}] 请求超时 (${timeoutMs}ms)`)
        : error;
      console.warn(
        `[${label}] 第 ${attempt}/${maxRetries} 次尝试失败:`,
        lastError?.message || lastError
      );

      if (attempt < maxRetries) {
        // 指数退避延迟
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`[${label}] 等待 ${delay}ms 后重试...`);
        await sleep(delay);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.error(`[${label}] 所有 ${maxRetries} 次重试均失败，使用回退值`);
  return fallback;
}

/**
 * 简单的 sleep 函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 兼容旧代码的 withTimeout（带回退值，不抛错）
 * 用于不需要重试的场景
 */
export async function withTimeoutFallback<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  return new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`AI timeout: ${label}`);
      resolve(fallback);
    }, ms);

    promise
      .then((result) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        if (timeoutId) clearTimeout(timeoutId);
        console.error(`AI error: ${label}`, error?.message || error);
        resolve(fallback);
      });
  });
}
