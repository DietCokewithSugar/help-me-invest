import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MarketType } from '@/lib/markets';

// 市场名称映射
const MARKET_NAMES: Record<MarketType, string> = {
  US: '美股',
  CN: 'A股（中国大陆）',
  HK: '港股（香港）',
  JP: '日股（日本）',
};

// 模型分级策略
// - lite: 简单任务，速度优先（股票联想、财报摘要）
// - standard: 复杂推理任务（公司深度分析）
// - search: 需要 Google Search Grounding 的任务（联网新闻）
type ModelTier = 'lite' | 'standard' | 'search';

const MODEL_CONFIG: Record<ModelTier, { model: string; description: string }> = {
  lite: {
    model: 'gemini-2.5-flash-lite',
    description: '轻量快速模型，适合简单任务',
  },
  standard: {
    model: 'gemini-2.5-flash-lite',
    description: '标准模型，适合复杂推理',
  },
  search: {
    model: 'gemini-2.5-flash',
    description: '搜索模型，支持 Google Search Grounding',
  },
};

export class GeminiClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // 根据任务类型获取对应的模型实例
  private getModel(
    tier: ModelTier,
    config?: {
      temperature?: number;
      topP?: number;
      maxOutputTokens?: number;
      tools?: any[];
    }
  ) {
    const modelName = MODEL_CONFIG[tier].model;
    return this.genAI.getGenerativeModel({
      model: modelName,
      ...(config?.tools ? { tools: config.tools } : {}),
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        topP: config?.topP ?? 0.95,
        maxOutputTokens: config?.maxOutputTokens ?? 8192,
      },
    });
  }

  async suggestSymbol(
    query: string,
    marketHint?: MarketType
  ): Promise<{
    query: string;
    suggestions: Array<{
      symbol: string;
      market: MarketType;
      name?: string;
      nameCn?: string;
      confidence?: number;
    }>;
  }> {
    const trimmedQuery = query.trim();
    const marketName = marketHint ? (MARKET_NAMES[marketHint] || '美股') : '未指定';
    const prompt = `你是股票搜索联想引擎。用户输入可能是股票代码、公司中文/英文名、拼音缩写或简称。请根据输入联想到正确格式的股票代码，并输出 JSON。

要求：
1. 只返回 JSON，不要包含任何 Markdown 或解释性文字。
2. 市场只能是 US / CN / HK / JP。
3. 返回的 symbol 必须是可用于 FMP 的格式：
   - US: 例如 AAPL, TSLA, BRK.B
   - CN: 6 位数字 + .SS 或 .SZ
   - HK: 4-5 位数字 + .HK（不足位补零）
   - JP: 4 位数字 + .T
4. 优先返回最相关的 1-5 个候选，confidence 为 0-1 之间的小数。
5. 如果无法确定，suggestions 为空数组。
6. 如果知道中文名，请填充 nameCn；否则可以留空。

用户输入：${trimmedQuery}
市场提示：${marketName}

请严格输出以下 JSON 结构：
{
  "query": "${trimmedQuery}",
  "suggestions": [
    {
      "symbol": "XXXX",
      "market": "US",
      "name": "公司名称（可选）",
      "nameCn": "公司中文名（可选）",
      "confidence": 0.75
    }
  ]
}`;

    try {
      // 使用 lite 模型：股票联想是简单任务，速度优先
      const model = this.getModel('lite', {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1024,
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
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
      console.error('Gemini suggestSymbol error:', error?.message || error);
      return { query: trimmedQuery, suggestions: [] };
    }
  }

  async analyzeCompany(
    companyData: any,
    incomeData: any[],
    peers: string[],
    transcriptData?: any,
    market: MarketType = 'US'
  ): Promise<string> {
    const marketName = MARKET_NAMES[market] || '美股';
    const isNonUS = market !== 'US';
    
    // 对于非美股，添加额外的分析指引
    const marketContext = isNonUS ? `
## 市场背景
该公司在 ${marketName} 市场上市。请结合你对该市场的专业知识进行分析：
- 考虑该市场特有的监管环境和政策因素
- 分析该地区的宏观经济环境对公司的影响
- 考虑当地市场的投资者结构和交易特点
- 如果数据有限，请基于你的专业知识和对该公司/行业的了解进行补充分析
` : '';

    const prompt = `
你是一位资深的金融分析师和投资研究专家，精通全球各主要资本市场。请根据以下数据，生成一份专业的投资调研报告。

## 公司基本信息
${JSON.stringify(companyData, null, 2)}

## 财务数据（近5年利润表）
${JSON.stringify(incomeData, null, 2)}

## 同业竞争者
${peers.length > 0 ? peers.join(', ') : '（数据暂无，请基于行业知识分析主要竞争对手）'}
${marketContext}
${transcriptData ? `## 最近财报电话会议摘要\n${JSON.stringify(transcriptData, null, 2)}` : ''}

请按照以下JSON格式返回分析结果（请使用中文）：

{
  "companyOverview": "企业整体说明，包括主营业务、商业模式、发展历程等（300-500字）",
  "industryAnalysis": "企业所处行业的详细分析，包括行业规模、增长趋势、技术演进等（300-400字）",
  "industryPainPoints": "【必填】行业当前面临的最大痛点与发展障碍，包括但不限于：技术挑战、监管压力、供应链问题、人才短缺、成本压力、竞争加剧等（200-300字，必须提供具体分析）",
  "competitors": "行业其他主要竞争对手分析，包括各自的市场地位和特点（200-300字）",
  "competitiveAdvantage": "相较于其他竞争对手，该企业的独特优势（200-300字）",
  "moat": "企业核心竞争力及护城河分析，包括技术壁垒、品牌效应、网络效应等（300-400字）",
  "recentDevelopments": "基于财报会议和公开信息，总结企业最近的重要发展动态（200-300字）",
  "investmentConclusion": "投资建议总结，包括机遇和风险提示（200-300字）"
}

重要提示：
1. 请确保返回有效的JSON格式，不要包含任何markdown代码块标记
2. 所有字段都必须提供有意义的内容，不能留空
3. 特别注意industryPainPoints字段必须详细分析行业痛点，这对投资决策非常重要
4. 即使某些数据缺失，也请基于你对该公司和行业的专业知识进行合理分析
`;

    try {
      // 使用 standard 模型：公司深度分析需要复杂推理能力
      const model = this.getModel('standard', {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 12000,
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // 检查是否返回了有效的 JSON 格式响应
      if (!text || text.trim().length === 0) {
        console.error('Gemini returned empty response');
        throw new Error('AI 返回空响应');
      }
      
      return text;
    } catch (error: any) {
      console.error('Gemini analyzeCompany error:', error?.message || error);
      // 如果是网络错误，抛出更友好的错误信息
      if (error?.message?.includes('fetch failed') || 
          error?.message?.includes('ECONNRESET') ||
          error?.message?.includes('network')) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw error;
    }
  }

  async searchAndAnalyze(
    companyName: string, 
    symbol: string, 
    market: MarketType = 'US'
  ): Promise<string> {
    void market;
    // 使用 search 模型：需要 Google Search Grounding 能力
    const modelWithSearch = this.getModel('search', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
      tools: [{ googleSearch: {} }] as any,
    });

    const prompt = `请使用英文信息源搜索并总结 ${companyName} (${symbol}) 的最新新闻和发展动态，按照以下结构来进行回复：
1. 最近的重大公告和事件
2. 产品发布或战略变化
3. 行业动态和竞争格局变化
4. 分析师观点和市场情绪

请优先检索对应市场的本地权威站点，并把时间范围限定为“近90天”：
关键词要求：同时使用“公司中文名/英文名 + 股票代码 + 交易所/市场名”，并加入“公告/业绩/财报/指引/监管/重组/并购/订单/合作/回购/股东/减持/增持/处罚/诉讼/立案”等关键词组合检索。
请严格以“今天日期”为基准计算近90天范围；如无近90天内信息，recentNews 需明确说明“未找到近90天内的有效信息”。请确保返回有效的 JSON 格式，可以包含 markdown 代码块标记。使用中文回答。`;

    try {
      const result = await modelWithSearch.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Google Search grounding error:', error?.message || error);
      // 网络错误时返回空字符串，让主流程继续
      if (error?.message?.includes('fetch failed') || 
          error?.message?.includes('ECONNRESET') ||
          error?.message?.includes('network')) {
        console.log('Network error in searchAndAnalyze, returning empty result');
      }
      return '';
    }
  }

  // 专门用于非美股市场的深度分析（使用 Google Search 补充数据）
  async searchCompanyDetails(
    companyName: string,
    symbol: string,
    market: MarketType
  ): Promise<{
    competitors: string;
    recentNews: string;
    analystViews: string;
  }> {
    // 使用 search 模型：需要 Google Search Grounding 能力
    const modelWithSearch = this.getModel('search', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096,
      tools: [{ googleSearch: {} }] as any,
    });

    const marketName = MARKET_NAMES[market] || '美股';

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const prompt = `请搜索 ${companyName} (${symbol}，${marketName}市场) 的详细信息，时间范围限定为近90天，并以 JSON 格式返回。今天日期为 ${todayStr}。

{
  "competitors": "该公司的主要竞争对手及其特点分析（200-300字）",
  "recentNews": "近90天的重要新闻和事件总结（200-300字）",
  "analystViews": "券商和分析师的观点汇总，包括评级和目标价（如有）（100-200字）"
}

请优先检索对应市场的本地权威站点，并把时间范围限定为“近90天”：
关键词要求：同时使用“公司中文名/英文名 + 股票代码 + 交易所/市场名”，并加入“公告/业绩/财报/指引/监管/重组/并购/订单/合作/回购/股东/减持/增持/处罚/诉讼/立案”等关键词组合检索。
请严格以“今天日期”为基准计算近90天范围；如无近90天内信息，recentNews 需明确说明“未找到近90天内的有效信息”。请确保返回有效的 JSON 格式，可以包含 markdown 代码块标记。使用中文回答。`;

    try {
      const result = await modelWithSearch.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      // 检查是否返回了错误消息
      if (rawText.toLowerCase().startsWith('an error') || 
          rawText.toLowerCase().startsWith('error')) {
        console.error('Search returned error message:', rawText.substring(0, 100));
        throw new Error('Search returned error');
      }
      
      const text = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // 确保看起来像 JSON
      if (!text.startsWith('{')) {
        console.error('Search response does not look like JSON:', text.substring(0, 100));
        throw new Error('Invalid JSON format');
      }
      
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Search company details error:', error?.message || error);
      return {
        competitors: '',
        recentNews: '',
        analystViews: '',
      };
    }
  }

  async summarizeEarningsCall(
    transcriptText: string,
    companyName: string,
    symbol: string
  ): Promise<string> {
    const prompt = `
你是一位资深卖方分析师。请根据以下英文电话会议全文，生成中文“财报电话会议精要”。
必须严格围绕用户关心的四个区域输出，并给出清晰的要点与判断：

1. 必读区域：问答环节 (Q&A Session)
这是整份文件中含金量最高的地方。分析师代表了市场的疑虑，而管理层的回答代表了应对能力。
- 抓出分析师的关键提问与管理层的回答。
- 重复出现的尖锐问题：如果两三个分析师都在问同一个问题（例如：“你们的利润率为什么下滑？”或“AI什么时候能变现？”），即使管理层试图回避，这本身就说明这是市场目前最担心的核心矛盾。
- 非正面回答 (Non-answers)：注意观察管理层是否在绕圈子。例如分析师问“明年的增长目标是多少？”，管理层回答“我们对长期充满信心”，这就是典型的信号——短期可能不仅不如意，甚至可能很糟糕。
- 语气变化：文字版虽然听不到声音，但如果回答变得简短、生硬，或者频繁出现“正如我刚才所说...”的防御性措辞，通常意味着压力较大。

2. 核心数据区：业绩指引 (Guidance/Outlook)
这部分通常位于CFO发言的末尾，或者CEO总结陈词时。
- 预期的修正：这是股价波动的直接催化剂。重点看他们是上调 (Raise)、下调 (Lower) 还是重申 (Reiterate) 了全年目标？
- 措辞的确定性：注意修饰词。是“保守估计 (Conservative)”还是“强劲可见度 (Strong visibility)”？如果管理层说“宏观环境不确定性增加”，通常是在为未来业绩不达标打预防针。

3. 关键指标解释区：CFO 的财务陈述
CFO的发言虽然枯燥，但往往包含了解释数据的“钥匙”。重点搜索以下关键词：
- Margins (利润率)：搜索 "Gross Margin" (毛利率) 和 "Operating Margin" (营业利润率)。如果利润率下降，必须找到解释：是因为产品降价了（坏事），还是因为投入了研发（可能是好事）？
- One-time items (一次性项目)：有时候利润大增是因为卖了一栋楼，有时候大跌是因为付了一笔罚款。CFO会在这里把这些“噪音”剔除，告诉你真实的经营状况 (Non-GAAP数据)。
- Capital Allocation (资本配置)：关注他们赚的钱打算怎么花？是回购股票 (Buyback)（利好股价）、分红 (Dividend)，还是资本开支 (CapEx)（比如买显卡、建厂）？如果是巨额资本开支，市场通常会审视这笔钱花得值不值。

4. 业务亮点区：CEO 的开场白 (Prepared Remarks)
这部分大多是公关稿，全是好话，但有一点值得看：战略优先级的变化。
- 提炼战略优先级变化与业务亮点（避免套话）。

输出要求：
- 中文输出，结构化呈现，每个部分用清晰标题。
- 每部分 3-6 条要点，简洁、可读。
- 如果原文未披露某项，明确写“未披露/未提及”。
- 只输出内容，不要包含任何代码块标记。

公司：${companyName} (${symbol})
电话会议原文：
${transcriptText}
`;

    try {
      // 使用 lite 模型：财报摘要是结构化提取任务，lite 模型足够
      // 注意：如果原文过长超出 lite 上下文限制，会自动降级处理
      const model = this.getModel('lite', {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 4096,
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Summarize earnings call error:', error?.message || error);
      if (error?.message?.includes('fetch failed') || 
          error?.message?.includes('ECONNRESET') ||
          error?.message?.includes('network')) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw error;
    }
  }
}
