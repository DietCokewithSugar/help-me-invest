import type { MarketType } from '@/lib/markets';

// 主页股票联想专用的 DeepSeek 客户端。
// 主报告链路已全面迁移到 Gemini，但主页输入框的联想是一个高频、低复杂度的请求，
// DeepSeek 在这个 case 上的响应速度更快，所以单独保留。
//
// 与 GeminiClient.suggestSymbol 保持完全一致的 prompt + 返回结构，方便随时切回 Gemini。

const MARKET_NAMES: Record<MarketType, string> = {
  US: '美股',
  CN: 'A股（中国大陆）',
  HK: '港股（香港）',
  JP: '日股（日本）',
  KR: '韩股（韩国）',
  AU: '澳股（澳大利亚）',
};

export interface SymbolSuggestResult {
  query: string;
  suggestions: Array<{
    symbol: string;
    market: MarketType;
    name?: string;
    nameCn?: string;
    confidence?: number;
  }>;
}

function buildPrompt(query: string, marketHint: MarketType | undefined, language: string): string {
  const marketName = marketHint ? (MARKET_NAMES[marketHint] || '美股') : '未指定';
  const isEn = language === 'en';
  const nameInstruction = isEn
    ? '6. Fill the name field with the English company name. Fill nameCn with the Chinese name if known.'
    : '6. 如果知道中文名，请填充 nameCn；否则可以留空。';
  const nameFieldDesc = isEn
    ? '"name": "Company name in English (optional)"'
    : '"name": "公司名称（可选）"';
  const nameCnFieldDesc = isEn
    ? '"nameCn": "Company name in Chinese (optional)"'
    : '"nameCn": "公司中文名（可选）"';

  return `你是股票搜索联想引擎。用户输入可能是股票代码、公司中文/英文名、拼音缩写或简称。请根据输入联想到正确格式的股票代码，并输出 JSON。

要求：
1. 只返回 JSON，不要包含任何 Markdown 或解释性文字。
2. 市场只能是 US / CN / HK / JP / KR / AU。
3. 返回的 symbol 必须是可用于 FMP 的格式：
   - US: 例如 AAPL, TSLA, BRK.B
   - CN: 6 位数字 + .SS 或 .SZ
   - HK: 4-5 位数字 + .HK（不足位补零）
   - JP: 4 位数字 + .T
   - KR: 6 位数字 + .KS（KOSPI 主板）或 .KQ（KOSDAQ 创业板），例如 005930.KS (三星电子)、035720.KS (Kakao)
   - AU: 2-6 位字母/数字 + .AX，例如 CBA.AX (澳洲联邦银行)、BHP.AX (必和必拓)
4. 优先返回最相关的 1-5 个候选，confidence 为 0-1 之间的小数。
5. 如果无法确定，suggestions 为空数组。
${nameInstruction}

用户输入：${query}
市场提示：${marketName}

请严格输出以下 JSON 结构（注意 suggestions 数组通常包含 3-5 个对象，而不是 1 个）：
{
  "query": "${query}",
  "suggestions": [
    {
      "symbol": "XXXX",
      "market": "US",
      ${nameFieldDesc},
      ${nameCnFieldDesc},
      "confidence": 0.75
    }
  ]
}`;
}

export async function suggestSymbolWithDeepSeek(
  apiKey: string,
  query: string,
  marketHint?: MarketType,
  language: string = 'zh',
): Promise<SymbolSuggestResult> {
  const trimmedQuery = query.trim();
  const prompt = buildPrompt(trimmedQuery, marketHint, language);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content || '';

    if (!text || text.trim().length === 0) {
      throw new Error('AI 返回空响应');
    }

    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    if (!cleaned.startsWith('{')) {
      throw new Error('AI 响应格式不正确');
    }

    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error('DeepSeek suggestSymbol error:', error?.message || error);
    return { query: trimmedQuery, suggestions: [] };
  }
}
