/**
 * DeepSeek 运行时配置 - 集中解析环境变量
 *
 * 全站唯一的 AI 提供方。接口文档：https://api-docs.deepseek.com/
 * 默认模型 deepseek-flash；旧名 deepseek-chat / deepseek-reasoner 不再使用。
 */

/**
 * 思考强度。把 DeepSeek 的两个字段（thinking.type + reasoning_effort）
 * 收敛成一个值：disabled 时只下发 thinking.type=disabled，其余值同时下发
 * thinking.type=enabled 与对应的 reasoning_effort，非法组合因此无法被表达。
 */
export type ThinkingPolicy = 'disabled' | 'low' | 'high' | 'max';

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

export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash';

/**
 * 专业版报告所用模型。默认与普通档相同，需要时再通过环境变量切到
 * deepseek-v4-pro——换模型是成本/质量决策，不在代码里默认开启。
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
export const DEEPSEEK_REASONING_EFFORT: Exclude<ThinkingPolicy, 'disabled'> =
  effortRaw === 'max' || effortRaw === 'low' ? effortRaw : 'high';

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
