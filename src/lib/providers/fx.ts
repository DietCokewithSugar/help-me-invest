/**
 * 汇率：用于把交易币种的股价换算成财报币种（例如腾讯以港元交易、以人民币报告；
 * 阿里巴巴 ADR 以美元交易、以人民币报告），否则 P/E、P/B 等历史估值会差一个汇率倍数。
 *
 * 数据源：Frankfurter（欧洲央行每日参考汇率，免费、无需 key）。
 * 失败时仅对联系汇率制下的港元 / 美元使用固定值，其余返回 null（调用方不做换算）。
 */

const TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { rate: number; expiresAt: number }>();

// 港元联系汇率：7.75–7.85 HKD/USD
const PEGGED: Record<string, number> = {
  'USD:HKD': 7.8,
  'HKD:USD': 1 / 7.8,
};

async function fetchRate(url: string, to: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    const rate = Number(data?.rates?.[to]);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 1 单位 from 可兑换多少 to；同币种返回 1，无法获取返回 null */
export async function getFxRate(from: string, to: string): Promise<number | null> {
  const a = from.toUpperCase() === 'RMB' ? 'CNY' : from.toUpperCase();
  const b = to.toUpperCase() === 'RMB' ? 'CNY' : to.toUpperCase();
  if (!a || !b || a === b) return 1;
  const key = `${a}:${b}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rate;

  const rate =
    (await fetchRate(`https://api.frankfurter.dev/v1/latest?base=${a}&symbols=${b}`, b)) ??
    (await fetchRate(`https://api.frankfurter.app/latest?from=${a}&to=${b}`, b)) ??
    PEGGED[key] ??
    null;
  if (rate !== null) cache.set(key, { rate, expiresAt: Date.now() + TTL_MS });
  return rate;
}
