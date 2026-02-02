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
 * @param promiseFactory - 返回 Promise 的工厂函数（每次重试都会调用）
 * @param options - 配置选项
 * @param fallback - 所有重试失败后的回退值
 */
export async function withRetryAndTimeout<T>(
  promiseFactory: () => Promise<T>,
  options: RetryOptions,
  fallback: T
): Promise<T> {
  const { maxRetries = 3, retryDelayMs = 1000, timeoutMs, label } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await withTimeout(promiseFactory(), timeoutMs, label);
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[${label}] 第 ${attempt}/${maxRetries} 次尝试失败:`,
        error?.message || error
      );

      if (attempt < maxRetries) {
        // 指数退避延迟
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`[${label}] 等待 ${delay}ms 后重试...`);
        await sleep(delay);
      }
    }
  }

  console.error(`[${label}] 所有 ${maxRetries} 次重试均失败，使用回退值`);
  return fallback;
}

/**
 * 带超时的 Promise 包装器（会抛出错误而不是返回回退值）
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`[${label}] 请求超时 (${timeoutMs}ms)`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
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
