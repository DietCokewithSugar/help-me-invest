/**
 * DeepSeek Chat Completions 传输层 - 全站唯一知道「怎么跟 DeepSeek 说话」的地方。
 *
 * 背景：deepseek-v4-flash 默认开启思考模式（reasoning_effort 默认 high），
 * 思维链走 reasoning_content，与 content 同级，且**推理与回答共享 max_tokens 预算**。
 * 因此这里始终显式下发 thinking 字段，绝不依赖服务端默认值。
 *
 * 已知约束：思考模式下的多轮对话必须把 reasoning_content 回传，否则接口返回 400
 * （"The reasoning_content in the thinking mode must be passed back to the API"）。
 * 本项目目前全部是单轮调用，assertSingleTurn 会在开发环境提前告警。
 */

import {
  DEEPSEEK_DEBUG,
  chatCompletionsUrl,
  resolveThinking,
  type ThinkingPolicy,
} from './deepseek-config';

export type { ThinkingPolicy };

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  reasoning_content?: string;
}

export interface ChatRequestOptions {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  topP: number;
  maxTokens: number;
  thinking: ThinkingPolicy;
  stream: boolean;
  /** true 时下发 response_format: { type: 'json_object' } */
  jsonObject?: boolean;
}

export class DeepSeekApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    // 保留原有中文文案，且状态码必须留在 message 里：
    // 限流器通过匹配 message 中的 '429' 来决定是否重试。
    super(`DeepSeek API 请求失败 (${status})`);
    this.name = 'DeepSeekApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * 思考模式下多轮对话必须回传 reasoning_content，否则 400。
 * 目前所有调用都是单轮，这里只在开发环境提前告警，避免以后加多轮时踩坑。
 */
function assertSingleTurn(messages: ChatMessage[], thinking: ThinkingPolicy): void {
  if (thinking === 'disabled' || process.env.NODE_ENV === 'production') return;

  const offending = messages.some(
    (message) => message.role === 'assistant' && !message.reasoning_content
  );
  if (offending) {
    console.warn(
      '[DeepSeek] 思考模式下的多轮对话必须回传 assistant 消息的 reasoning_content，否则接口会返回 400。'
    );
  }
}

export function buildChatPayload(options: ChatRequestOptions): Record<string, any> {
  const thinking = resolveThinking(options.thinking);
  assertSingleTurn(options.messages, thinking);

  const payload: Record<string, any> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature,
    top_p: options.topP,
    max_tokens: options.maxTokens,
    stream: options.stream,
    // 始终显式下发：不写这个字段就等于默认开启思考模式，
    // 这正是本次要修的问题的根因。
    thinking: { type: thinking === 'disabled' ? 'disabled' : 'enabled' },
  };

  if (thinking !== 'disabled') {
    payload.reasoning_effort = thinking;
  }

  if (options.jsonObject) {
    payload.response_format = { type: 'json_object' };
  }

  // 不下发 tools / tool_choice：V4 会拒绝 tool_choice: "required" 及指定函数的写法，
  // 本项目也不需要工具调用（顺带保证联网检索处于关闭状态）。
  return payload;
}

export async function requestChatCompletion(
  apiKey: string,
  options: ChatRequestOptions,
  signal?: AbortSignal
): Promise<Response> {
  const response = await fetch(chatCompletionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildChatPayload(options)),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek API 请求失败:', {
      status: response.status,
      body: errorText.slice(0, 500),
    });
    throw new DeepSeekApiError(response.status, errorText.slice(0, 500));
  }

  return response;
}

export interface ExtractedMessage {
  content: string;
  reasoningContent: string;
  finishReason: string;
}

export function extractMessage(data: any): ExtractedMessage {
  const choice = data?.choices?.[0];
  return {
    content: choice?.message?.content || '',
    reasoningContent: choice?.message?.reasoning_content || '',
    finishReason: choice?.finish_reason || '',
  };
}

/**
 * 取正文。正文为空时返回空串（沿用各调用点原有的兜底逻辑），
 * 只有「推理吃光了 token 预算」这种可诊断的情况才抛错——否则这类故障
 * 表现为功能静默失效，很难定位。
 */
export function extractContentOrEmpty(data: any, label: string): string {
  const { content, reasoningContent, finishReason } = extractMessage(data);

  if (DEEPSEEK_DEBUG && reasoningContent.length > 0) {
    console.log(
      `[DeepSeek][${label}] reasoning_content ${reasoningContent.length} 字符`,
      extractUsage(data)
    );
  }

  if (content.trim().length === 0 && reasoningContent.length > 0 && finishReason === 'length') {
    throw new Error(
      `[${label}] max_tokens 被推理过程耗尽，未产出正文。请关闭思考模式或调高 max_tokens。`
    );
  }

  return content;
}

export function extractUsage(data: any): Record<string, any> | undefined {
  return data?.usage;
}

export type DeepSeekStreamChunk = {
  kind: 'content' | 'reasoning';
  text: string;
};

/**
 * 解析 SSE 流。逐帧同时读取 delta.content 与 delta.reasoning_content，
 * 并打上标记交给上层决定如何处理（当前上层只消费 content）。
 */
export function parseChatStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<DeepSeekStreamChunk, void, unknown> {
  async function* iterator() {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const consumeLine = async function* (
      line: string
    ): AsyncGenerator<DeepSeekStreamChunk, void, unknown> {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) return;

      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') return;

      try {
        const payload = JSON.parse(data);
        const delta = payload?.choices?.[0]?.delta;

        // 一帧内两者可能同时出现，正文优先
        const content = delta?.content || '';
        if (content.length > 0) {
          yield { kind: 'content', text: content };
        }

        const reasoning = delta?.reasoning_content || '';
        if (reasoning.length > 0) {
          yield { kind: 'reasoning', text: reasoning };
        }
      } catch (error: any) {
        console.warn('DeepSeek stream parse warning:', error?.message || error);
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let lineBreakIndex = buffer.indexOf('\n');

        while (lineBreakIndex !== -1) {
          const line = buffer.slice(0, lineBreakIndex);
          buffer = buffer.slice(lineBreakIndex + 1);
          lineBreakIndex = buffer.indexOf('\n');
          yield* consumeLine(line);
        }
      }

      const finalLine = buffer.trim();
      if (finalLine) {
        yield* consumeLine(finalLine);
      }
    } finally {
      reader.releaseLock();
    }
  }

  return iterator();
}
