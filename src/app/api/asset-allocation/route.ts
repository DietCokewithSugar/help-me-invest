import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, enforceRateLimit, readJsonWithLimit, truncateText } from '@/lib/api-security';

export const maxDuration = 120;

const GEMINI_MODEL_ID = 'gemini-3.1-flash-lite';
const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_FREE_TEXT_CHARS = 1_000;

async function generateGeminiJSON(apiKey: string, prompt: string): Promise<string> {
  const systemInstruction =
    'You are a structured-data API. Respond with ONE valid JSON object that matches the schema in the user prompt — no prose, no markdown, no code fences, no emojis, no greetings, no first-person language.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 6144,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini asset allocation error:', {
      status: response.status,
      body: errorText.slice(0, 500),
    });
    throw new Error(`Gemini API error (${response.status})`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const content = Array.isArray(parts)
    ? parts.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('')
    : '';
  if (!content || content.trim().length === 0) {
    throw new Error('Gemini returned empty content');
  }
  return content;
}

interface AllocationRequest {
  assetTypes: string[];
  returnLevel: string;
  investAmount: number;
  totalAssets: number;
  currency: string;
  marketOutlook: string;
  investmentHorizon: string;
  existingAssets: string;
  interests: string;
  language: string;
}

const ALLOCATION_PALETTE = ['#88ABDA', '#98B6C2', '#C0D09D', '#CB523E', '#DFD6B8', '#EAE4D1', '#FF8866', '#BADBEE', '#F59E0B', '#06B6D4'];

function stripEmoji(input: string): string {
  // Defense-in-depth: prompt forbids emojis, but if any slip through we drop
  // them. Iterates by code point and skips emoji-likely ranges (surrogate
  // pairs in the supplementary plane + BMP symbol blocks + variation
  // selectors + ZWJ). Avoids the `/u` flag so the regex works under the
  // project's default TS target.
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    // ZWJ + variation selectors (kept only when not next to emoji, but easier to drop)
    if (c === 0x200d || (c >= 0xfe00 && c <= 0xfe0f)) continue;
    // High surrogate → consume with its low surrogate (most emoji live in plane 1)
    if (c >= 0xd800 && c <= 0xdbff) { i++; continue; }
    // BMP symbol blocks commonly used as emoji
    if ((c >= 0x2300 && c <= 0x23ff) || (c >= 0x2600 && c <= 0x27bf) || (c >= 0x2b00 && c <= 0x2bff)) continue;
    out += input[i];
  }
  return out.replace(/\s+/g, ' ').trim();
}

function sanitizeReport(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;
  const visit = (node: any): any => {
    if (typeof node === 'string') return stripEmoji(node);
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === 'object') {
      const out: Record<string, any> = {};
      for (const k of Object.keys(node)) out[k] = visit(node[k]);
      return out;
    }
    return node;
  };
  return visit(raw);
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, { key: 'asset-allocation', limit: 6, windowMs: 10 * 60_000 });

    const body: AllocationRequest = await readJsonWithLimit<AllocationRequest>(request, MAX_REQUEST_BYTES);
    const {
      assetTypes,
      returnLevel,
      investAmount,
      totalAssets,
      currency,
      marketOutlook,
      investmentHorizon,
      existingAssets,
      interests,
      language = 'zh',
    } = body;

    if (!Array.isArray(assetTypes) || assetTypes.length === 0 || assetTypes.length > 10 || !returnLevel || !investAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Number.isFinite(investAmount) || investAmount <= 0 || !Number.isFinite(totalAssets) || totalAssets < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const isZh = language === 'zh';
    const currencyLabel = currency === 'CNY' ? (isZh ? '万元人民币' : '10k CNY') : (isZh ? '万美元' : '10k USD');

    const assetTypeMap: Record<string, string> = {
      usStocks: isZh ? '美股' : 'US Stocks',
      aShares: isZh ? 'A股' : 'A-Shares (China)',
      hkStocks: isZh ? '港股' : 'HK Stocks',
      bonds: isZh ? '债券/国债' : 'Bonds/Treasuries',
      gold: isZh ? '黄金' : 'Gold',
      realEstate: isZh ? '房地产/REITs' : 'Real Estate/REITs',
      crypto: isZh ? '加密货币' : 'Cryptocurrency',
      funds: isZh ? '指数基金/ETF' : 'Index Funds/ETFs',
      cash: isZh ? '现金/货币基金' : 'Cash/Money Market',
      commodities: isZh ? '大宗商品' : 'Commodities',
    };

    const returnLevelMap: Record<string, string> = {
      conservative: isZh ? '稳健保值（年化3-5%）' : 'Capital Preservation (3-5% annual)',
      moderate: isZh ? '稳中求进（年化6-10%）' : 'Steady Growth (6-10% annual)',
      growth: isZh ? '积极增长（年化10-15%）' : 'Active Growth (10-15% annual)',
      aggressive: isZh ? '高收益（年化15%+）' : 'High Returns (15%+ annual)',
    };

    const outlookMap: Record<string, string> = {
      us: isZh ? '看好美国市场' : 'Bullish on US Market',
      china: isZh ? '看好中国市场' : 'Bullish on China Market',
      both: isZh ? '全球化配置' : 'Global Diversification',
      unsure: isZh ? '不确定，由AI判断' : 'Unsure, let AI decide',
    };

    const horizonMap: Record<string, string> = {
      short: isZh ? '1-2年（短期）' : '1-2 years (Short-term)',
      medium: isZh ? '3-5年（中期）' : '3-5 years (Mid-term)',
      long: isZh ? '5-10年（长期）' : '5-10 years (Long-term)',
      veryLong: isZh ? '10年以上（超长期）' : '10+ years (Very Long-term)',
    };

    const selectedAssets = assetTypes.map(a => assetTypeMap[a] || a).join(isZh ? '、' : ', ');
    const returnDesc = returnLevelMap[returnLevel] || returnLevel;
    const outlookDesc = outlookMap[marketOutlook] || marketOutlook;
    const horizonDesc = horizonMap[investmentHorizon] || investmentHorizon;

    const promptParams: PromptParams = {
      selectedAssets,
      returnDesc,
      investAmount,
      totalAssets,
      currencyLabel,
      outlookDesc,
      horizonDesc,
      existingAssets: truncateText(existingAssets, MAX_FREE_TEXT_CHARS),
      interests: truncateText(interests, MAX_FREE_TEXT_CHARS),
      palette: ALLOCATION_PALETTE,
    };
    const prompt = isZh ? buildZhPrompt(promptParams) : buildEnPrompt(promptParams);

    const raw = await generateGeminiJSON(googleApiKey, prompt);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // Fallback: strip a possible code-fence wrapper.
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced) parsed = JSON.parse(fenced[1]);
      else throw new Error('Model did not return parseable JSON');
    }

    const report = sanitizeReport(parsed);

    // Derive chartData for the existing pie + scatter components.
    const chartData = report?.allocation?.length
      ? {
          allocation: report.allocation.map((a: any, i: number) => ({
            name: a.name,
            percentage: Number(a.percentage) || 0,
            amount: Number(a.amount) || 0,
            color: a.color || ALLOCATION_PALETTE[i % ALLOCATION_PALETTE.length],
          })),
          riskReturn: report.riskReturn?.length
            ? report.riskReturn.map((r: any) => ({
                name: r.name,
                risk: Number(r.risk) || 0,
                expectedReturn: Number(r.expectedReturn) || 0,
              }))
            : report.allocation.map((a: any) => ({
                name: a.name,
                risk: Number(a.riskLevel) || 5,
                expectedReturn: Number(a.expectedReturn) || 0,
              })),
        }
      : null;

    return NextResponse.json({ report, chartData });
  } catch (error: any) {
    console.error('Asset allocation error:', error);
    return apiErrorResponse(error, 'Failed to generate recommendation');
  }
}

interface PromptParams {
  selectedAssets: string;
  returnDesc: string;
  investAmount: number;
  totalAssets: number;
  currencyLabel: string;
  outlookDesc: string;
  horizonDesc: string;
  existingAssets: string;
  interests: string;
  palette: string[];
}

const SCHEMA_NOTE_ZH = `严格按以下 JSON Schema 输出。所有字段必填（除可选字段外）。文本字段必须为简体中文，不得含表情符号(emoji)、不得用第一/第二人称、不得有 "好的""作为您的""我们""你的"等口语化措辞，也不要再加任何解释或包装。整段回答只包含一个 JSON 对象。

{
  "strategy": {
    "name": string,                // 策略名称，例如 "核心-卫星策略"
    "summary": string,             // 1-2 句简洁陈述，纯客观描述策略思路，不得含称呼或情绪词
    "targetReturn": string,        // 例如 "10%-15% 年化"
    "horizon": string              // 例如 "10 年以上"
  },
  "allocation": [
    {
      "name": string,              // 资产类别中文名，例如 "美股核心（宽基指数）"
      "category": string,          // 简短分类标签，例如 "宽基指数 / 成长股 / 黄金 / 短债 / 优质蓝筹 / 现金"
      "percentage": number,        // 占比百分比数字（不含 % 符号）
      "amount": number,            // 金额数字（与用户输入相同单位，万元/万美元）
      "ticker": string,            // 推荐主标的代码，例如 "VOO"；如无主标的填 ""
      "productName": string,       // 主标的全称
      "rationale": string,         // 2-3 句结构化解释，说明"为何选这一类资产 + 为何用该标的"
      "riskLevel": number,         // 1-10 风险等级
      "expectedReturn": number,    // 年化预期收益百分比数字
      "risks": [string, string],   // 该资产 2-3 条具体可量化的风险点（含触发条件 + 潜在影响幅度）
      "color": string              // 16 进制色值，从用户提示中给定的调色板按顺序取
    }
  ],
  "riskReturn": [                  // 用于风险-收益散点图，按 allocation 顺序对应
    { "name": string, "risk": number, "expectedReturn": number }
  ],
  "marketContext": [
    {
      "title": string,             // 简短主题，例如 "美联储政策"、"AI 资本开支周期"
      "body": string,              // 1-2 句客观分析，引用具体数据/政策时点
      "impact": "positive" | "neutral" | "negative"  // 对本组合的方向性影响
    }
  ],
  "executionPlan": [
    {
      "phase": string,             // 阶段名，例如 "第一步：开户与资金准备"
      "timeframe": string,         // 时间窗口，例如 "T+0 ~ 2 周"
      "actions": [string, string]  // 该阶段可执行步骤
    }
  ],
  "portfolioRisks": [
    {
      "name": string,              // 组合级风险名称，例如 "高波动风险"
      "level": "low" | "medium" | "high",
      "description": string,       // 客观描述风险及触发场景
      "mitigation": string         // 一句对应缓释/对冲建议
    }
  ]
}`;

const SCHEMA_NOTE_EN = `Output a single JSON object that exactly matches the schema below. Every field is required unless marked optional. Use only plain factual English — no emojis, no greetings, no first/second-person ("you", "we", "as your advisor"), no marketing language, no wrappers. Output JSON only.

{
  "strategy": {
    "name": string,                // e.g. "Core-Satellite"
    "summary": string,             // 1-2 sentences, factual, no addressee
    "targetReturn": string,        // e.g. "10%-15% annualized"
    "horizon": string              // e.g. "10+ years"
  },
  "allocation": [
    {
      "name": string,              // asset bucket label, e.g. "US Core Equity"
      "category": string,          // short tag, e.g. "Broad Index / Growth / Gold / Short Duration / Quality Blue Chip / Cash"
      "percentage": number,        // 0-100, no % sign
      "amount": number,            // same unit as user input
      "ticker": string,            // primary ticker, e.g. "VOO"; "" if none
      "productName": string,
      "rationale": string,         // 2-3 sentences explaining bucket + chosen instrument
      "riskLevel": number,         // 1-10
      "expectedReturn": number,    // annualized return percent, no % sign
      "risks": [string, string],   // 2-3 specific, quantified risks with trigger + magnitude
      "color": string              // hex from palette in order
    }
  ],
  "riskReturn": [
    { "name": string, "risk": number, "expectedReturn": number }
  ],
  "marketContext": [
    {
      "title": string,
      "body": string,              // 1-2 sentences with concrete data/policy reference
      "impact": "positive" | "neutral" | "negative"
    }
  ],
  "executionPlan": [
    {
      "phase": string,             // e.g. "Step 1: Account & Funding"
      "timeframe": string,         // e.g. "T+0 to 2 weeks"
      "actions": [string, string]
    }
  ],
  "portfolioRisks": [
    {
      "name": string,
      "level": "low" | "medium" | "high",
      "description": string,
      "mitigation": string
    }
  ]
}`;

function buildZhPrompt(p: PromptParams): string {
  return `# 任务

为以下用户画像生成一份资产配置方案，输出唯一的 JSON 对象。

## 用户画像

- 感兴趣资产：${p.selectedAssets}
- 收益预期：${p.returnDesc}
- 可投资金额：${p.investAmount} ${p.currencyLabel}
- 总资产：${p.totalAssets} ${p.currencyLabel}
- 市场观点：${p.outlookDesc}
- 投资期限：${p.horizonDesc}
${p.existingAssets ? `- 当前持仓：${p.existingAssets}` : ''}
${p.interests ? `- 关注方向：${p.interests}` : ''}

## 投资原则

1. 优先长期稳健资产；股票端优先宽基指数，少量配置个股（如 BRK.B、行业龙头）。
2. allocation 必须覆盖核心、卫星、防御三层：宽基指数 / 成长主题 / 防御资产（黄金、债券、现金等）。
3. 至少保留 10%-20% 在现金或短债中作为安全边际。
4. 每只标的必须给出 ticker 和 productName；金额按用户的总投资额按比例分配。
5. 每一项 allocation 的 rationale 必须分别回答："为什么选这一类资产 + 为什么用该具体标的"，引用宏观逻辑或财务数据。
6. 每一项 allocation 的 risks 必须给出 2-3 条具体风险（包含触发条件，例如 "若美联储推迟降息至 2027 年，估值压缩可能带来 15%-25% 回撤"），禁止抽象表述如 "市场风险"。
7. portfolioRisks 至少包含：集中度风险、波动风险、汇率/币种风险、流动性风险中任三项。
8. marketContext 必须引用具体的政策事件 / 数据 / 行业景气指标。
9. 全文禁止使用 emoji、表情符号、第一第二人称、口语化措辞。

## 颜色调色板

allocation 数组中的 color 字段，按数组顺序依次从下列颜色取值（不要重复，不要使用其他色值）：
${p.palette.join(', ')}

${SCHEMA_NOTE_ZH}`;
}

function buildEnPrompt(p: PromptParams): string {
  return `# Task

Produce an asset-allocation plan for the user profile below. Output one JSON object only.

## User Profile

- Interested assets: ${p.selectedAssets}
- Return target: ${p.returnDesc}
- Investable amount: ${p.investAmount} ${p.currencyLabel}
- Total assets: ${p.totalAssets} ${p.currencyLabel}
- Market view: ${p.outlookDesc}
- Horizon: ${p.horizonDesc}
${p.existingAssets ? `- Current holdings: ${p.existingAssets}` : ''}
${p.interests ? `- Special interests: ${p.interests}` : ''}

## Allocation Principles

1. Favor long-term stable assets; broad-market index funds over single stocks. Single stocks (e.g. BRK.B, sector leaders) only as a small satellite.
2. allocation must cover three layers: core (broad index), satellite (theme/growth), defensive (gold, bonds, cash).
3. Reserve 10%-20% in cash or short-duration treasuries as safety margin.
4. Every line item must include both ticker and productName; amounts must sum to the user's investable amount, in the user's unit.
5. Each allocation's rationale must address two questions separately: why this asset class, and why this specific instrument — citing macro logic or financial data.
6. Each allocation's risks must list 2-3 concrete, quantified risks (e.g. "If Fed delays cuts past 2027, multiple compression could trigger a 15%-25% drawdown"). Forbid abstract phrasing such as "market risk".
7. portfolioRisks must include at least three of: concentration, volatility, FX/currency, liquidity.
8. marketContext must cite concrete policy events / data points / sector indicators.
9. No emojis, no greetings, no first/second-person, no marketing language anywhere in the output.

## Color Palette

For each allocation item's color field, take colors in order from this palette (no repeats, no other values):
${p.palette.join(', ')}

${SCHEMA_NOTE_EN}`;
}
