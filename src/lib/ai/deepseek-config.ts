/**
 * DeepSeek 运行时配置 - 集中解析环境变量
 *
 * 旧模型名 deepseek-chat / deepseek-reasoner 已于 2026-07-24 下线，
 * 现仅 deepseek-v4-flash / deepseek-v4-pro 可用。
 */

/**
 * 思考强度。把 DeepSeek 的两个字段（thinking.type + reasoning_effort）
 * 收敛成一个值：reasoning_effort 在 thinking.type 为 disabled 时会被忽略，
 * 且接口只接受 high / max，合并后非法组合无法被表达。
 */
export type ThinkingPolicy = 'disabled' | 'high' | 'max';

const rawBaseUrl = process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com';

export const DEEPSEEK_BASE_URL = rawBaseUrl;

/**
 * 拼出 chat completions 端点。
 * 容忍几种常见写法：结尾带斜杠、结尾是 /v1（官方 OpenAI 兼容地址）、
 * 以及已经写全了 /chat/completions 的情况——否则换部署环境时会静默 404。
 */
export function chatCompletionsUrl(): string {
  const base = rawBaseUrl.replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash';

/**
 * pro 档使用的模型。默认与普通档相同，需要时再通过环境变量切到
 * deepseek-v4-pro——换模型是成本/质量决策，不随本次接口迁移一起生效。
 */
export const DEEPSEEK_MODEL_PRO = process.env.DEEPSEEK_MODEL_PRO?.trim() || DEEPSEEK_MODEL;

/**
 * 全局思考开关，便于在部署平台上不改代码地整体开关思考模式。
 * auto = 按各调用点自身策略；off = 全部关闭；on = 全部开启。
 */
const thinkingOverrideRaw = process.env.DEEPSEEK_THINKING_OVERRIDE?.trim().toLowerCase();
export const DEEPSEEK_THINKING_OVERRIDE: 'auto' | 'off' | 'on' =
  thinkingOverrideRaw === 'off' || thinkingOverrideRaw === 'on' ? thinkingOverrideRaw : 'auto';

const effortRaw = process.env.DEEPSEEK_REASONING_EFFORT?.trim().toLowerCase();
export const DEEPSEEK_REASONING_EFFORT: 'high' | 'max' = effortRaw === 'max' ? 'max' : 'high';

/**
 * 应用全局开关后得到最终策略。
 */
export function resolveThinking(policy: ThinkingPolicy): ThinkingPolicy {
  if (DEEPSEEK_THINKING_OVERRIDE === 'off') return 'disabled';
  if (DEEPSEEK_THINKING_OVERRIDE === 'on') return DEEPSEEK_REASONING_EFFORT;
  return policy;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * 限流器参数。注意该限流器是「每进程」的：
 * 在 Vercel 上只约束单个 lambda 实例，起不到全局作用；
 * 自建服务器（Render 等）上是单个长驻进程，会成为真正的全局上限，
 * 届时 2 可能偏紧——所以做成可配置的。
 */
export const DEEPSEEK_MAX_CONCURRENT = positiveInt(process.env.DEEPSEEK_MAX_CONCURRENT, 2);
export const DEEPSEEK_MIN_DELAY_MS = positiveInt(process.env.DEEPSEEK_MIN_DELAY_MS, 500);

export const DEEPSEEK_DEBUG = process.env.DEEPSEEK_DEBUG === '1' || process.env.DEEPSEEK_DEBUG === 'true';
