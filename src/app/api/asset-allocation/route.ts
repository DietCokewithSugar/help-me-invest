import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;

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

export async function POST(request: NextRequest) {
  try {
    const body: AllocationRequest = await request.json();
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

    if (!assetTypes || assetTypes.length === 0 || !returnLevel || !investAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(googleApiKey);

    const isZh = language === 'zh';
    const currencyLabel = currency === 'CNY' ? (isZh ? '万元人民币' : '0,000 CNY') : (isZh ? '万美元' : '0,000 USD');

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

    const selectedAssets = assetTypes.map(a => assetTypeMap[a] || a).join('、');
    const returnDesc = returnLevelMap[returnLevel] || returnLevel;
    const outlookDesc = outlookMap[marketOutlook] || marketOutlook;
    const horizonDesc = horizonMap[investmentHorizon] || investmentHorizon;

    const prompt = isZh ? buildZhPrompt({
      selectedAssets,
      returnDesc,
      investAmount,
      totalAssets,
      currencyLabel,
      outlookDesc,
      horizonDesc,
      existingAssets,
      interests,
    }) : buildEnPrompt({
      selectedAssets,
      returnDesc,
      investAmount,
      totalAssets,
      currencyLabel,
      outlookDesc,
      horizonDesc,
      existingAssets,
      interests,
    });

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 16384,
      },
      tools: [{ googleSearch: {} }] as any,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let chartData = null;
    const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        chartData = JSON.parse(jsonMatch[1]);
      } catch {
        // JSON parse failed, skip chart data
      }
    }

    const cleanedText = text.replace(/```json\s*\n[\s\S]*?\n```/, '').trim();

    return NextResponse.json({ recommendation: cleanedText, chartData });
  } catch (error: any) {
    console.error('Asset allocation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendation' },
      { status: 500 }
    );
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
}

function buildZhPrompt(p: PromptParams): string {
  return `你是一位资深的投资顾问和资产配置专家。请根据以下用户信息，结合当前实时市场新闻和经济环境，给出一份详细且个性化的资产配置建议方案。

## 用户信息

- **感兴趣的资产类别**：${p.selectedAssets}
- **收益预期**：${p.returnDesc}
- **可投资金额**：${p.investAmount} ${p.currencyLabel}
- **总资产**：${p.totalAssets} ${p.currencyLabel}
- **市场观点**：${p.outlookDesc}
- **投资期限**：${p.horizonDesc}
${p.existingAssets ? `- **目前持有的资产**：${p.existingAssets}` : ''}
${p.interests ? `- **特别关注的方向**：${p.interests}` : ''}

## 重要原则

1. **稳健为主**：始终优先推荐长期稳健的资产。对于股票类资产，优先推荐宽基指数（如标普500 ETF、沪深300 ETF）而非个股。
2. **风险警示**：如果用户选择了激进的收益预期，要明确提醒风险，并建议将大部分资金配置在稳健资产上。
3. **分散配置**：确保推荐的组合足够分散，不要把鸡蛋放在一个篮子里。
4. **具体可执行**：给出具体的产品名称或代码（如 VOO、SPY、518880 等），而不只是笼统的建议。
5. **结合时事**：请搜索并参考当前的经济新闻、美联储利率政策、中国经济数据等，让建议紧贴市场实际。
6. **安全边际**：建议用户保留至少 10-20% 的现金或高流动性资产作为应急准备金。
7. **如果用户想要更高收益**：可以推荐一小部分仓位配置伯克希尔·哈撒韦(BRK.B)、优质蓝筹股或优质成长股，但要控制比例。

## 输出格式（Markdown）

### 📊 资产配置总览

用表格展示推荐的配置比例，包含：
| 资产类别 | 配置比例 | 金额（${p.currencyLabel}） | 推荐产品/标的 | 理由 |

### 💡 核心配置说明

对每个主要配置做 2-3 句话的说明，为什么推荐这个配置。

### 📈 当前市场环境分析

结合最新的新闻和数据，分析当前市场环境对这份配置方案的影响。

### ⚠️ 风险提示

具体针对这份方案的风险点，以及应对建议。

### 🎯 执行建议

分步骤告诉用户如何开始执行这份配置方案（开户、定投时间、调仓频率等）。

### 📦 结构化数据（必须提供）

在 Markdown 内容的最末尾，请输出一个 JSON 代码块（用 \`\`\`json 和 \`\`\` 包裹），包含以下结构：
\`\`\`json
{
  "allocation": [
    { "name": "资产类别名称", "percentage": 数字, "amount": 数字, "color": "#hex色值" }
  ],
  "riskReturn": [
    { "name": "资产类别名称", "risk": 1到10的数字, "expectedReturn": 年化收益率百分比数字 }
  ]
}
\`\`\`
- allocation 是资产配置比例数组，percentage 为百分比数字（不带%），amount 为金额数字，color 为不同的十六进制颜色。请用这些颜色：#88ABDA, #98B6C2, #C0D09D, #CB523E, #DFD6B8, #EAE4D1, #8B5CF6, #F59E0B, #EC4899, #06B6D4。
- riskReturn 是各资产类别的风险收益散点图数据，risk 为 1-10 的风险等级，expectedReturn 为预期年化收益百分比数字。

请使用中文回答，Markdown 格式。关键数据用 **加粗** 标注。`;
}

function buildEnPrompt(p: PromptParams): string {
  return `You are a senior investment advisor and asset allocation expert. Based on the following user profile and current real-time market news and economic conditions, provide a detailed, personalized asset allocation recommendation.

## User Profile

- **Interested Asset Classes**: ${p.selectedAssets}
- **Return Expectation**: ${p.returnDesc}
- **Available Investment Amount**: ${p.investAmount} ${p.currencyLabel}
- **Total Assets**: ${p.totalAssets} ${p.currencyLabel}
- **Market Outlook**: ${p.outlookDesc}
- **Investment Horizon**: ${p.horizonDesc}
${p.existingAssets ? `- **Current Holdings**: ${p.existingAssets}` : ''}
${p.interests ? `- **Special Interests**: ${p.interests}` : ''}

## Key Principles

1. **Stability First**: Always prioritize long-term stable assets. For equities, prefer broad index funds (e.g., S&P 500 ETFs, total market ETFs) over individual stocks.
2. **Risk Warning**: If the user has aggressive return expectations, clearly warn about risks and suggest allocating most capital to stable assets.
3. **Diversification**: Ensure the portfolio is well-diversified across asset classes, geographies, and sectors.
4. **Actionable**: Provide specific product names or tickers (e.g., VOO, SPY, BRK.B), not just generic advice.
5. **Market-Aware**: Search and reference current economic news, Fed rate policy, global macro trends to make recommendations timely and relevant.
6. **Safety Margin**: Suggest keeping at least 10-20% in cash or highly liquid assets as an emergency fund.
7. **For Higher Returns**: Recommend a small allocation to Berkshire Hathaway (BRK.B), quality blue chips, or growth stocks, but keep the proportion controlled.

## Output Format (Markdown)

### 📊 Asset Allocation Overview

Table showing recommended allocation:
| Asset Class | Allocation % | Amount (${p.currencyLabel}) | Recommended Products | Rationale |

### 💡 Core Allocation Explanation

2-3 sentences for each major allocation explaining the reasoning.

### 📈 Current Market Environment

Analysis of current market conditions and how they affect this plan, referencing recent news and data.

### ⚠️ Risk Warnings

Specific risks for this plan and mitigation strategies.

### 🎯 Execution Guide

Step-by-step instructions for implementing this plan (account setup, DCA schedule, rebalancing frequency, etc.).

### 📦 Structured Data (Required)

At the very end of the Markdown content, output a JSON code block (wrapped in \`\`\`json and \`\`\`), with the following structure:
\`\`\`json
{
  "allocation": [
    { "name": "Asset Class Name", "percentage": number, "amount": number, "color": "#hexcolor" }
  ],
  "riskReturn": [
    { "name": "Asset Class Name", "risk": 1to10number, "expectedReturn": annualReturnPercentNumber }
  ]
}
\`\`\`
- allocation is an array of asset allocation ratios. percentage is a number without %, amount is the dollar/yuan amount, color is a distinct hex color. Please use these colors: #88ABDA, #98B6C2, #C0D09D, #CB523E, #DFD6B8, #EAE4D1, #8B5CF6, #F59E0B, #EC4899, #06B6D4.
- riskReturn is scatter plot data for each asset class. risk is 1-10 risk level, expectedReturn is expected annual return percent number.

Please respond in English, Markdown format. Bold **key data points**.`;
}
