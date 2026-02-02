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
// - pro: 专业版深度分析，使用 Gemini 3 Pro 带思考能力
type ModelTier = 'lite' | 'standard' | 'search' | 'pro';

const MODEL_CONFIG: Record<ModelTier, { model: string; description: string }> = {
  lite: {
    model: 'gemini-2.5-flash',
    description: '轻量快速模型，适合简单任务',
  },
  standard: {
    model: 'gemini-2.5-flash',
    description: '标准模型，适合复杂推理',
  },
  search: {
    model: 'gemini-3-flash-preview',
    description: '搜索模型，支持 Google Search Grounding',
  },
  pro: {
    model: 'gemini-3-pro-preview',
    description: '专业模型，支持深度思考和 Google Search Grounding',
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
      thinkingConfig?: {
        thinkingLevel?: 'low' | 'medium' | 'high';
        includeThoughts?: boolean;
      };
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
        ...(config?.thinkingConfig ? { thinkingConfig: config.thinkingConfig } : {}),
      } as any,
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
5. **格式要求**：每个字段的内容都应使用 Markdown 格式：
   - 使用 **加粗** 来标注关键数据、重要结论、核心观点和关键指标（如营收增长率、市场份额、核心优势等）
   - 使用列表（- 或 1. 2. 3.）来组织要点，使内容更清晰易读
   - 关键的财务数据和百分比必须加粗，例如：**营收同比增长 25%**、**市场份额达到 35%**
   - 每个段落中至少有 2-3 处加粗的重点内容，让读者能快速抓住核心信息
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
- **格式要求**：使用 Markdown 格式：
  - 使用 **加粗** 来标注关键数据、重要结论、核心观点（如具体的财务指标、增长率、管理层的关键表态等）
  - 使用列表来组织要点
  - 关键的财务数据和百分比必须加粗，例如：**营收同比增长 25%**、**毛利率下降 3 个百分点**
  - 每个要点中应有关键词加粗，方便读者快速抓住重点

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

  // ============================================================================
  // 新的流式生成方法 (Granular Streaming Methods)
  // ============================================================================

  // 通用的流式生成辅助方法
  async *generateStream(prompt: string, tier: ModelTier = 'standard'): AsyncGenerator<string, void, unknown> {
    const model = this.getModel(tier, {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192
    });

    try {
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error: any) {
      console.error('Stream generation error:', error?.message || error);
      throw error;
    }
  }

  // 1. 企业概况
  async streamCompanyOverview(companyData: any, market: MarketType): Promise<AsyncGenerator<string, void, unknown>> {
    const prompt = `
你是一位专业的金融分析师。请根据以下公司信息，撰写一份简洁的“企业概况”。

数据：
${JSON.stringify(companyData, null, 2)}

要求：
- 介绍主营业务、商业模式和简要发展历程。
- 字数控制在 300-500 字。
- 使用中文。
- 格式：Markdown，关键信息（如核心产品、市场地位）加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 2. 行业分析
  async streamIndustryAnalysis(companyData: any, market: MarketType): Promise<AsyncGenerator<string, void, unknown>> {
    const prompt = `
请分析 ${companyData.companyName} (${companyData.symbol}) 所处的行业。

要求：
- 分析行业规模、增长趋势、技术演进方向。
- 字数控制在 300-400 字。
- 使用中文。
- 格式：Markdown，关键数据和趋势加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 3. 行业痛点与障碍
  async streamIndustryPainPoints(companyData: any, market: MarketType): Promise<AsyncGenerator<string, void, unknown>> {
    const prompt = `
请深入分析 ${companyData.companyName} 所处行业当前面临的最大痛点与发展障碍。

要求：
- 涵盖技术挑战、监管压力、供应链问题、人才短缺、成本压力、竞争加剧等方面。
- 必须提供具体分析，而非泛泛而谈。
- 字数 200-300 字。
- 使用中文。
- 格式：Markdown，关键痛点加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 4. 竞争格局
  async streamCompetitors(companyData: any, peers: string[], market: MarketType): Promise<AsyncGenerator<string, void, unknown>> {
    const prompt = `
请分析 ${companyData.companyName} 的竞争格局。

已知竞争对手：${peers.join(', ')}

要求：
- 分析主要竞争对手的市场地位和特点。
- 字数 200-300 字。
- 使用中文。
- 格式：Markdown，对手名称和关键特点加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 5. 竞争优势
  async streamCompetitiveAdvantage(companyData: any, market: MarketType): Promise<AsyncGenerator<string, void, unknown>> {
    const prompt = `
请分析 ${companyData.companyName} 相较于竞争对手的独特优势。

要求：
- 聚焦于不可复制的优势。
- 字数 200-300 字。
- 使用中文。
- 格式：Markdown，核心优势点加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 6. 核心护城河
  async streamMoat(companyData: any, market: MarketType): Promise<AsyncGenerator<string, void, unknown>> {
    const prompt = `
请深入剖析 ${companyData.companyName} 的核心护城河。

要求：
- 分析技术壁垒、品牌效应、网络效应、转换成本等。
- 字数 300-400 字。
- 使用中文。
- 格式：Markdown，关键护城河加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 7. 最新发展动态 (需要联网搜索能力)
  async streamRecentDevelopments(companyName: string, symbol: string, market: MarketType): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    // 使用 search 模型
    const model = this.getModel('search', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096,
      tools: [{ googleSearch: {} }] as any,
    });

    const prompt = `请搜索 ${companyName} (${symbol}，${marketName}市场) 的详细信息，时间范围限定为近90天。
     请总结企业最近的重要发展动态（200-300字）。
     重点关注：公告、业绩、财报、指引、监管、重组、并购、订单、合作。
     如果没有近期的重大消息，请说明。
     使用中文，Markdown 格式，关键动态加粗。`;

    const result = await model.generateContentStream(prompt);
    // Note: AsyncGenerator doesn't automatically imply * functionality in standard implementation unless tailored, 
    // but here we just return the iterable.
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    }
    return streamIterator();
  }

  // 8. 投资分析总结 (需要前面所有模块的汇总，不给出购买建议)
  async streamInvestmentConclusion(
    companyData: any,
    context: string,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const prompt = `
你是一位专业的投资研究分析师。请根据以下关于 ${companyData.companyName} (${companyData.symbol}) 的研究报告内容，撰写一份“投资建议总结”。

已有报告内容：
${context}

要求：
- **不要给出任何买入、卖出或持有的投资建议**
- **不要推荐是否购买该股票**
- 只客观分析该公司的**核心优势**和**主要弊端/风险**
- 帮助投资者全面了解这家公司，让他们自行做出判断
- 字数 200-300 字
- 使用中文
- 格式：Markdown，核心优势和主要风险点加粗

输出结构：
**核心优势**：
- ...

**主要弊端/风险**：
- ...
`;
    return this.generateStream(prompt, 'standard');
  }

  // 9. 财报电话会议总结 (流式)
  async streamEarningsCallSummary(
    transcriptText: string,
    companyName: string,
    symbol: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
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
- **格式要求**：使用 Markdown 格式：
  - 使用 **加粗** 来标注关键数据、重要结论、核心观点（如具体的财务指标、增长率、管理层的关键表态等）
  - 使用列表来组织要点
  - 关键的财务数据和百分比必须加粗，例如：**营收同比增长 25%**、**毛利率下降 3 个百分点**
  - 每个要点中应有关键词加粗，方便读者快速抓住重点

公司：${companyName} (${symbol})
电话会议原文：
${transcriptText}
`;

    // 使用 lite 模型：财报摘要是结构化提取任务，lite 模型足够
    return this.generateStream(prompt, 'lite');
  }

  // ============================================================================
  // 专业版报告分析 - 拆分为 7 个独立的并发请求
  // 使用 Gemini 3 Pro Preview + Thinking + Google Search
  // ============================================================================

  // 专业版通用的模型配置
  private getProModel() {
    return this.genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      tools: [{ googleSearch: {} }] as any,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingLevel: 'high',
        },
      } as any,
    });
  }

  // 10.1 专业版 - 生意模式分析
  async streamProBusinessModel(
    companyData: any,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    const model = this.getProModel();
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `分析 ${companyData.companyName} (${companyData.symbol}) 的生意模式。

公司基本信息：
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}
- 行业：${companyData.industry || 'N/A'}
- 板块：${companyData.sector || 'N/A'}

今天日期：${today}

**输出要求**：
- 使用中文，Markdown 格式，关键信息加粗
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- 如有必要，可使用 Markdown 表格呈现数据对比（如业务板块收入占比）

## 生意模式分析

### 1. 主营业务与核心产品
- 公司的主营业务是什么？核心产品/服务有哪些？
- 各业务板块的收入占比如何？（可用表格呈现）
- 核心产品的市场定位和竞争力

### 2. 市场与客户
- 目标市场是什么？（B2B/B2C/政府/混合）
- 主要客户群体是谁？客户集中度如何？
- 地理区域分布：主要收入来自哪些国家/地区？

### 3. 所属行业的发展脉络
- 该行业的发展历史和演变过程
- 行业现状：市场规模、竞争格局、主要玩家
- 行业前景：未来3-5年的发展趋势和增长驱动力

字数控制在 400-600 字。`;

    const result = await model.generateContentStream(prompt);
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.2 专业版 - 运营模式分析
  async streamProOperatingModel(
    companyData: any,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    const model = this.getProModel();
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `分析 ${companyData.companyName} (${companyData.symbol}) 的运营模式和赚钱逻辑。

公司基本信息：
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}
- 行业：${companyData.industry || 'N/A'}

今天日期：${today}

**输出要求**：
- 使用中文，Markdown 格式，关键信息加粗
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- 如有必要，可使用 Markdown 表格呈现数据

## 运营模式分析

### 1. 盈利模式
- 公司主要靠什么赚钱？核心盈利来源是什么？
- 是一次性销售、订阅收费、佣金抽成、广告收入还是其他模式？
- 盈利模式的可持续性和可预测性如何？

### 2. 经营节奏与规律
- 公司的业务是否有周期性或季节性？
- 产品/服务的更新迭代频率如何？（如苹果每年发新手机）
- 是否存在稳定的复购或续约模式？

### 3. 为什么能赚钱？
- 公司的核心竞争优势是什么？为什么客户选择它而不是竞争对手？
- 是靠低成本、差异化、技术壁垒、品牌溢价还是网络效应？
- 这种优势是否可持续？有无被颠覆的风险？

字数控制在 400-600 字。`;

    const result = await model.generateContentStream(prompt);
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.3 专业版 - 行业前景评估
  async streamProIndustryOutlook(
    companyData: any,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    const model = this.getProModel();
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `分析 ${companyData.companyName} (${companyData.symbol}) 所处行业的前景。

公司基本信息：
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}
- 行业：${companyData.industry || 'N/A'}
- 板块：${companyData.sector || 'N/A'}

今天日期：${today}

**输出要求**：
- 使用中文，Markdown 格式，关键信息加粗
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- 如有必要，可使用 Markdown 表格呈现行业数据对比

## 行业前景评估

### 1. 行业增长性判断
- 该行业是否属于高增长的"好行业"？
- 分析行业的市场规模和增长率（搜索最新行业数据）
- 评估行业的发展阶段（导入期/成长期/成熟期/衰退期）
- 判断行业未来3-5年的增长潜力

### 2. 政策与宏观环境
- 相关产业政策是否利好该行业？
- 宏观经济环境对该行业的影响
- 技术变革对行业的影响

**行业结论**：[高增长行业 / 稳定成熟行业 / 衰退行业]

字数控制在 300-500 字。`;

    const result = await model.generateContentStream(prompt);
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.4 专业版 - 竞争地位与护城河
  async streamProMoatAnalysis(
    companyData: any,
    profitabilityData: any,
    capitalReturnData: any,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    const model = this.getProModel();
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `分析 ${companyData.companyName} (${companyData.symbol}) 的竞争地位和护城河。

公司基本信息：
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}
- 行业：${companyData.industry || 'N/A'}

关键财务指标：
- 毛利率：${profitabilityData?.grossProfitMargin || 'N/A'}
- 净利率：${profitabilityData?.netProfitMargin || 'N/A'}
- ROE：${profitabilityData?.roe || 'N/A'}
- ROIC：${profitabilityData?.roic || 'N/A'}
- 研发占比：${capitalReturnData?.rdToRevenue || 'N/A'}
- 收益质量：${profitabilityData?.incomeQuality || 'N/A'}

今天日期：${today}

**输出要求**：
- 使用中文，Markdown 格式，关键信息加粗
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- 可使用 Markdown 表格对比该公司与竞争对手的关键指标

## 竞争地位与护城河

### 1. 市场地位分析
- 该公司在行业中的市场份额和地位排名
- 是否拥有垄断或寡头地位？
- 与主要竞争对手的规模、盈利能力对比（建议用表格呈现）

### 2. 护城河深度评估
结合财务数据分析：
- **品牌护城河**：毛利率是否显著高于同行？
- **规模效应**：营收规模和利润率趋势如何？
- **研发壁垒**：研发占比是否形成技术护城河？
- **网络效应**：是否存在用户增长带来的价值增益？
- **转换成本**：客户更换供应商的成本高吗？

**护城河评级**：[宽广 / 中等 / 狭窄 / 无]

字数控制在 300-500 字。`;

    const result = await model.generateContentStream(prompt);
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.5 专业版 - 财务健康与经营质量
  async streamProFinancialHealth(
    companyData: any,
    annualFinancials: any[],
    quarterlyFinancials: any[],
    profitabilityData: any,
    debtData: any,
    healthScores: any,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    const model = this.getProModel();

    const prompt = `分析 ${companyData.companyName} (${companyData.symbol}) 的财务健康状况。

公司基本信息：
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}

近5年年度财务数据：
${JSON.stringify(annualFinancials, null, 2)}

近5个季度财务数据：
${JSON.stringify(quarterlyFinancials, null, 2)}

盈利能力指标：
- 毛利率：${profitabilityData?.grossProfitMargin || 'N/A'}
- 净利率：${profitabilityData?.netProfitMargin || 'N/A'}
- ROE：${profitabilityData?.roe || 'N/A'}
- ROIC：${profitabilityData?.roic || 'N/A'}
- 收益质量：${profitabilityData?.incomeQuality || 'N/A'}

负债情况：
- 营运资金：${debtData?.workingCapital || 'N/A'}
- 总负债：${debtData?.totalLiabilities || 'N/A'}
- 债务股权比：${debtData?.debtToEquity || 'N/A'}
- 流动比率：${debtData?.currentRatio || 'N/A'}

财务健康评分：
- Altman Z-Score：${healthScores?.altmanZScore || 'N/A'}
- Piotroski F-Score：${healthScores?.piotroskiScore || 'N/A'}

**输出要求**：
- 使用中文，Markdown 格式，关键信息加粗
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- **建议使用表格**呈现关键财务指标趋势（年度/季度对比）

## 财务健康与经营质量

### 1. 盈利能力趋势
- 对比年度和季度数据，毛利率和净利率是改善还是恶化？
- 盈利能力的稳定性如何？
- （建议用表格展示近5年/季度关键指标变化）

### 2. 资产负债表健康度
- Altman Z-Score 和 Piotroski F-Score 说明什么？
- 债务水平是否合理？偿债能力如何？

### 3. 现金流质量
- 自由现金流是否健康？收益质量如何？
- 经营现金流能否覆盖资本支出？

### 4. 资本配置效率
- ROIC 是否超过资本成本（通常 8-10%）？
- 资本使用效率如何？

**财务健康评级**：[优秀 / 良好 / 一般 / 较差]

字数控制在 400-600 字。`;

    const result = await model.generateContentStream(prompt);
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.6 专业版 - 估值与买入时机
  async streamProValuation(
    companyData: any,
    valuationData: any,
    growthData: any,
    quarterlyFinancials: any[],
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    const model = this.getProModel();
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `分析 ${companyData.companyName} (${companyData.symbol}) 的估值水平和买入时机。

公司基本信息：
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}
- 当前股价：${companyData.price || 'N/A'}
- 市值：${companyData.marketCap || companyData.mktCap || 'N/A'}

估值指标：
- PE 比率：${valuationData?.peRatio || 'N/A'}
- PB 比率：${valuationData?.pbRatio || 'N/A'}
- PS 比率：${valuationData?.psRatio || 'N/A'}
- EV/EBITDA：${valuationData?.evToEbitda || 'N/A'}
- 格雷厄姆数字：${valuationData?.grahamNumber || 'N/A'}
- 盈利收益率：${valuationData?.earningsYield || 'N/A'}
- 自由现金流收益率：${valuationData?.freeCashFlowYield || 'N/A'}

增长数据：
- 营收增长率：${growthData?.revenueGrowth || 'N/A'}
- 净利润增长率：${growthData?.netIncomeGrowth || 'N/A'}
- 3年营收复合增长率：${growthData?.threeYRevenueGrowth || 'N/A'}
- 5年营收复合增长率：${growthData?.fiveYRevenueGrowth || 'N/A'}

近5个季度趋势：
${JSON.stringify(quarterlyFinancials, null, 2)}

今天日期：${today}

**输出要求**：
- 使用中文，Markdown 格式，关键信息加粗
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- **建议使用表格**对比该公司与行业平均估值

## 估值与买入时机

### 1. 估值判断
- PE、PB、EV/EBITDA 与行业平均和历史水平对比（搜索行业平均估值，建议用表格呈现）
- 格雷厄姆数字 vs 当前股价，是否被低估？
- 盈利收益率是否有吸引力？（与无风险利率对比）

### 2. 买入时机判断
- 结合季度数据趋势，业绩是在改善还是恶化？
- 近期是否有可能影响股价的催化剂或风险事件？（搜索最新新闻）
- 当前是否是好的买入时机？

**估值结论**：
- 估值水平：[便宜 / 合理 / 偏贵 / 昂贵]
- 股价 vs 内在价值：[低估 / 合理 / 高估]

字数控制在 400-600 字。`;

    const result = await model.generateContentStream(prompt);
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.7 专业版 - 综合投资建议（需要前6个章节的内容）
  async streamProInvestmentConclusion(
    companyData: any,
    prevContext: string,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 6144,
        thinkingConfig: {
          thinkingLevel: 'high',
        },
      } as any,
    });

    const prompt = `根据以下关于 ${companyData.companyName} (${companyData.symbol}) 的完整研究报告，撰写综合投资建议。

公司基本信息：
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}
- 当前股价：${companyData.price || 'N/A'}

已有分析内容：
${prevContext}

**输出要求**：
- 使用中文，Markdown 格式，关键信息加粗
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- 可使用表格汇总投资评级

## 综合投资建议

### 核心投资逻辑
用 2-3 句话总结为什么应该或不应该投资这家公司。

### 主要机会点
详细列出 3-5 个投资这家公司的主要机会和理由：
1. ...
2. ...
3. ...

### 主要风险点
详细列出 3-5 个投资这家公司需要注意的主要风险：
1. ...
2. ...
3. ...

### 投资评级汇总
（建议用表格呈现）
- **行业评级**：[高增长行业 / 稳定成熟行业 / 衰退行业]
- **护城河评级**：[宽广 / 中等 / 狭窄 / 无]
- **财务健康评级**：[优秀 / 良好 / 一般 / 较差]
- **估值水平**：[便宜 / 合理 / 偏贵 / 昂贵]

### 买入建议
[强烈推荐买入 / 可以买入 / 持有观望 / 建议回避]

### 建议操作策略
详细的操作建议，如：
- 仓位控制建议
- 分批建仓策略
- 止损止盈点位
- 需要关注的时间节点或事件

字数控制在 500-800 字。`;

    const result = await model.generateContentStream(prompt);
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 保留旧方法的兼容性（可选，后续可删除）
  async streamProAnalysis(
    companyData: any,
    incomeStatements: any[],
    incomeStatementsQuarter: any[],
    balanceSheets: any[],
    balanceSheetsQuarter: any[],
    cashFlowStatements: any[],
    cashFlowStatementsQuarter: any[],
    keyMetrics: any[],
    keyMetricsTTM: any[],
    financialRatios: any[],
    financialRatiosTTM: any[],
    financialGrowth: any[],
    financialScores: any,
    market: MarketType
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const marketName = MARKET_NAMES[market] || '美股';
    
    // 准备最新财务数据
    const latestIncome = incomeStatements?.[0] || {};
    const latestBalance = balanceSheets?.[0] || {};
    const latestCashFlow = cashFlowStatements?.[0] || {};
    const latestMetrics = keyMetrics?.[0] || {};
    const latestMetricsTTM = keyMetricsTTM?.[0] || {};
    const latestRatios = financialRatios?.[0] || {};
    const latestRatiosTTM = financialRatiosTTM?.[0] || {};
    const latestGrowth = financialGrowth?.[0] || {};
    
    // ============ 近5年年度财务数据 ============
    const annualFinancials = incomeStatements?.slice(0, 5).map((stmt: any, idx: number) => {
      const balance = balanceSheets?.[idx] || {};
      const cashFlow = cashFlowStatements?.[idx] || {};
      const metrics = keyMetrics?.[idx] || {};
      const ratios = financialRatios?.[idx] || {};
      return {
        period: stmt.calendarYear || stmt.date?.split('-')[0] || `Y${idx + 1}`,
        revenue: stmt.revenue,
        netIncome: stmt.netIncome,
        grossProfit: stmt.grossProfit,
        operatingIncome: stmt.operatingIncome,
        ebitda: stmt.ebitda,
        grossProfitMargin: ratios.grossProfitMargin || stmt.grossProfitRatio,
        netProfitMargin: ratios.netProfitMargin || stmt.netIncomeRatio,
        totalAssets: balance.totalAssets,
        totalLiabilities: balance.totalLiabilities,
        totalEquity: balance.totalStockholdersEquity,
        freeCashFlow: cashFlow.freeCashFlow,
        roe: ratios.returnOnEquity || metrics.roe,
      };
    }) || [];

    // ============ 近5个季度财务数据 ============
    const quarterlyFinancials = incomeStatementsQuarter?.slice(0, 5).map((stmt: any, idx: number) => {
      const balance = balanceSheetsQuarter?.[idx] || {};
      const ratios = financialRatiosTTM?.[0] || {};
      return {
        period: stmt.date || `Q${idx + 1}`,
        revenue: stmt.revenue,
        netIncome: stmt.netIncome,
        grossProfit: stmt.grossProfit,
        operatingIncome: stmt.operatingIncome,
        grossProfitMargin: stmt.grossProfitRatio,
        netProfitMargin: stmt.netIncomeRatio,
        totalAssets: balance.totalAssets,
        totalLiabilities: balance.totalLiabilities,
      };
    }) || [];

    // ============ 资产与资本 ============
    const assetCapitalData = {
      totalAssets: latestBalance.totalAssets,
      marketCap: companyData.marketCap || companyData.mktCap || latestMetrics.marketCap,
      revenue: latestIncome.revenue,
      enterpriseValue: latestMetrics.enterpriseValue || latestMetricsTTM?.enterpriseValue,
    };

    // ============ 盈利能力 ============
    const profitabilityData = {
      retainedEarnings: latestBalance.retainedEarnings,
      ebit: latestIncome.operatingIncome || financialScores?.ebit,
      grossProfitMargin: latestRatios.grossProfitMargin || latestRatiosTTM?.grossProfitMargin,
      netProfitMargin: latestRatios.netProfitMargin || latestRatiosTTM?.netProfitMargin,
      incomeQuality: latestMetrics.incomeQuality || latestMetricsTTM?.incomeQuality,
      roe: latestRatios.returnOnEquity || latestMetrics.roe,
      roa: latestRatios.returnOnAssets,
      roic: latestMetrics.roic || latestMetricsTTM?.roic,
    };

    // ============ 负债 ============
    const debtData = {
      workingCapital: latestMetrics.workingCapital || financialScores?.workingCapital,
      totalLiabilities: latestBalance.totalLiabilities || financialScores?.totalLiabilities,
      totalDebt: latestBalance.totalDebt,
      netDebt: latestBalance.netDebt,
      debtToEquity: latestRatios.debtEquityRatio || latestMetrics.debtToEquity,
      debtToAssets: latestMetrics.debtToAssets,
      currentRatio: latestRatios.currentRatio || latestMetrics.currentRatio,
      quickRatio: latestRatios.quickRatio,
    };

    // ============ 估值指标 ============
    const valuationData = {
      peRatio: latestMetrics.peRatio || latestRatios.priceEarningsRatio || latestMetricsTTM?.peRatio,
      pbRatio: latestMetrics.pbRatio || latestRatios.priceToBookRatio || latestMetricsTTM?.pbRatio,
      psRatio: latestMetrics.priceToSalesRatio || latestRatios.priceToSalesRatio,
      evToEbitda: latestMetrics.enterpriseValueOverEBITDA || latestMetricsTTM?.enterpriseValueOverEBITDA,
      grahamNumber: latestMetrics.grahamNumber || latestMetricsTTM?.grahamNumber,
      enterpriseValue: latestMetrics.enterpriseValue || latestMetricsTTM?.enterpriseValue,
      earningsYield: latestMetrics.earningsYield || latestMetricsTTM?.earningsYield,
      freeCashFlowYield: latestMetrics.freeCashFlowYield || latestMetricsTTM?.freeCashFlowYield,
    };

    // ============ 效率与周期 ============
    const efficiencyData = {
      cashConversionCycle: latestRatios.cashConversionCycle,
      daysOfInventoryOutstanding: latestRatios.daysOfInventoryOutstanding || latestMetrics.daysOfInventoryOnHand,
      daysOfPayablesOutstanding: latestRatios.daysOfPayablesOutstanding || latestMetrics.daysPayablesOutstanding,
      daysOfSalesOutstanding: latestRatios.daysOfSalesOutstanding || latestMetrics.daysSalesOutstanding,
      assetTurnover: latestRatios.assetTurnover,
      inventoryTurnover: latestMetrics.inventoryTurnover,
      receivablesTurnover: latestMetrics.receivablesTurnover,
    };

    // ============ 资本与回报 ============
    const capitalReturnData = {
      // 资本结构
      rdToRevenue: latestMetrics.researchAndDdevelopementToRevenue || latestMetricsTTM?.researchAndDdevelopementToRevenue,
      capexToRevenue: latestMetrics.capexToRevenue || latestMetricsTTM?.capexToRevenue,
      stockBasedCompensationToRevenue: latestMetrics.stockBasedCompensationToRevenue || latestMetricsTTM?.stockBasedCompensationToRevenue,
      // 股东回报
      dividendYield: latestMetrics.dividendYield || latestRatios.dividendYield || latestMetricsTTM?.dividendYield,
      payoutRatio: latestMetrics.payoutRatio || latestMetricsTTM?.payoutRatio,
    };

    // ============ 财务健康评分 ============
    const healthScores = {
      altmanZScore: financialScores?.altmanZScore,
      piotroskiScore: financialScores?.piotroskiScore,
    };

    // ============ 增长数据 ============
    const growthData = {
      revenueGrowth: latestGrowth.revenueGrowth,
      netIncomeGrowth: latestGrowth.netIncomeGrowth,
      epsGrowth: latestGrowth.epsgrowth,
      freeCashFlowGrowth: latestGrowth.freeCashFlowGrowth,
      threeYRevenueGrowth: latestGrowth.threeYRevenueGrowthPerShare,
      fiveYRevenueGrowth: latestGrowth.fiveYRevenueGrowthPerShare,
    };

    // 使用 Gemini 3 Pro Preview 模型，启用思考和联网搜索
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      tools: [{ googleSearch: {} }] as any,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 12288,
        thinkingConfig: {
          thinkingLevel: 'high',  // 启用高级思考
        },
      } as any,
    });

    const today = new Date().toISOString().slice(0, 10);
    
    const prompt = `你是一位顶级投资分析师，拥有 CFA 资格，精通价值投资、基本面分析和行业研究。请根据以下详尽的财务数据和最新市场信息，为投资者撰写一份专业深度的投资分析报告。

**重要提示**：请深入思考每一个数据点的含义，结合行业背景进行分析，不要简单罗列数据。

## 公司基本信息
- 公司名称：${companyData.companyName}
- 股票代码：${companyData.symbol}
- 市场：${marketName}
- 行业：${companyData.industry || 'N/A'}
- 板块：${companyData.sector || 'N/A'}
- 当前股价：${companyData.price || 'N/A'}
- 市值：${assetCapitalData.marketCap || 'N/A'}

## 一、近5年年度财务数据
${JSON.stringify(annualFinancials, null, 2)}

## 二、近5个季度财务数据（观察近期趋势）
${JSON.stringify(quarterlyFinancials, null, 2)}

## 三、资产与资本
- 总资产：${assetCapitalData.totalAssets || 'N/A'}
- 市值：${assetCapitalData.marketCap || 'N/A'}
- 营收：${assetCapitalData.revenue || 'N/A'}
- 企业价值 (EV)：${assetCapitalData.enterpriseValue || 'N/A'}

## 四、盈利能力
- 留存收益：${profitabilityData.retainedEarnings || 'N/A'}
- EBIT（息税前利润）：${profitabilityData.ebit || 'N/A'}
- 毛利率：${profitabilityData.grossProfitMargin || 'N/A'}
- 净利率：${profitabilityData.netProfitMargin || 'N/A'}
- 收益质量：${profitabilityData.incomeQuality || 'N/A'}
- ROE（净资产收益率）：${profitabilityData.roe || 'N/A'}
- ROA（总资产收益率）：${profitabilityData.roa || 'N/A'}
- ROIC（投入资本回报率）：${profitabilityData.roic || 'N/A'}

## 五、负债情况
- 营运资金：${debtData.workingCapital || 'N/A'}
- 总负债：${debtData.totalLiabilities || 'N/A'}
- 总债务：${debtData.totalDebt || 'N/A'}
- 净债务：${debtData.netDebt || 'N/A'}
- 债务股权比：${debtData.debtToEquity || 'N/A'}
- 债务资产比：${debtData.debtToAssets || 'N/A'}
- 流动比率：${debtData.currentRatio || 'N/A'}
- 速动比率：${debtData.quickRatio || 'N/A'}

## 六、估值指标
- PE 比率：${valuationData.peRatio || 'N/A'}
- PB 比率：${valuationData.pbRatio || 'N/A'}
- PS 比率：${valuationData.psRatio || 'N/A'}
- EV/EBITDA：${valuationData.evToEbitda || 'N/A'}
- 格雷厄姆数字：${valuationData.grahamNumber || 'N/A'}
- 企业价值 (EV)：${valuationData.enterpriseValue || 'N/A'}
- 盈利收益率：${valuationData.earningsYield || 'N/A'}
- 自由现金流收益率：${valuationData.freeCashFlowYield || 'N/A'}

## 七、效率与周期
- 现金循环周期：${efficiencyData.cashConversionCycle || 'N/A'} 天
- 库存周转天数：${efficiencyData.daysOfInventoryOutstanding || 'N/A'} 天
- 应付账款天数：${efficiencyData.daysOfPayablesOutstanding || 'N/A'} 天
- 应收账款天数：${efficiencyData.daysOfSalesOutstanding || 'N/A'} 天
- 总资产周转率：${efficiencyData.assetTurnover || 'N/A'}
- 库存周转率：${efficiencyData.inventoryTurnover || 'N/A'}

## 八、资本与回报
**资本结构**：
- 研发占比：${capitalReturnData.rdToRevenue || 'N/A'}
- 资本开支占比：${capitalReturnData.capexToRevenue || 'N/A'}
- 股权激励占比：${capitalReturnData.stockBasedCompensationToRevenue || 'N/A'}

**股东回报**：
- 股息率：${capitalReturnData.dividendYield || 'N/A'}
- 派息率：${capitalReturnData.payoutRatio || 'N/A'}

## 九、财务健康评分
- Altman Z-Score（破产风险）：${healthScores.altmanZScore || 'N/A'}
- Piotroski F-Score（财务改善）：${healthScores.piotroskiScore || 'N/A'}

## 十、增长指标
- 营收增长率：${growthData.revenueGrowth || 'N/A'}
- 净利润增长率：${growthData.netIncomeGrowth || 'N/A'}
- EPS 增长率：${growthData.epsGrowth || 'N/A'}
- 自由现金流增长率：${growthData.freeCashFlowGrowth || 'N/A'}
- 3年营收复合增长率：${growthData.threeYRevenueGrowth || 'N/A'}
- 5年营收复合增长率：${growthData.fiveYRevenueGrowth || 'N/A'}

---

## 分析要求

请基于以上详尽的财务数据，并通过联网搜索获取该公司和行业的最新信息，按照以下结构撰写深度分析报告。今天日期为 ${today}。

### 输出结构（必须严格遵循）：

## 一、生意模式分析（Business Model）

请通过联网搜索，深入了解该公司的生意本质：

1. **主营业务与核心产品**：
   - 公司的主营业务是什么？核心产品/服务有哪些？
   - 各业务板块的收入占比如何？（搜索最新财报或业务构成）
   - 核心产品的市场定位和竞争力

2. **市场与客户**：
   - 目标市场是什么？（B2B/B2C/政府/混合）
   - 主要客户群体是谁？客户集中度如何？
   - 地理区域分布：主要收入来自哪些国家/地区？

3. **所属行业的发展脉络**：
   - 该行业的发展历史和演变过程
   - 行业现状：市场规模、竞争格局、主要玩家
   - 行业前景：未来3-5年的发展趋势和增长驱动力

## 二、运营模式分析（Operating Model）

深入分析公司的赚钱逻辑：

1. **盈利模式**：
   - 公司主要靠什么赚钱？核心盈利来源是什么？
   - 是一次性销售、订阅收费、佣金抽成、广告收入还是其他模式？
   - 盈利模式的可持续性和可预测性如何？

2. **经营节奏与规律**：
   - 公司的业务是否有周期性或季节性？（如苹果每年发布新手机）
   - 产品/服务的更新迭代频率如何？
   - 是否存在稳定的复购或续约模式？

3. **为什么能赚钱？**：
   - 公司的核心竞争优势是什么？为什么客户选择它而不是竞争对手？
   - 是靠低成本、差异化、技术壁垒、品牌溢价还是网络效应？
   - 这种优势是否可持续？有无被颠覆的风险？

## 三、行业前景评估

1. **行业增长性判断**：该公司所处的 ${companyData.industry || companyData.sector} 行业是否属于高增长的"好行业"？
   - 分析行业的市场规模和增长率（搜索最新行业数据）
   - 评估行业的发展阶段（导入期/成长期/成熟期/衰退期）
   - 判断行业未来3-5年的增长潜力

2. **政策与宏观环境**：
   - 相关产业政策是否利好该行业？
   - 宏观经济环境对该行业的影响

**行业结论**：[高增长行业 / 稳定成熟行业  / 衰退行业 ]

## 四、竞争地位与护城河

1. **市场地位分析**：
   - 根据财务数据和搜索信息，判断该公司在行业中的市场份额和地位排名
   - 是否拥有垄断或寡头地位？
   - 与主要竞争对手的规模、盈利能力对比

2. **护城河深度评估**（结合财务数据分析）：
   - **品牌护城河**：毛利率 ${profitabilityData.grossProfitMargin} 是否显著高于同行？
   - **规模效应**：营收 ${assetCapitalData.revenue} 和利润率趋势如何？
   - **研发壁垒**：研发占比 ${capitalReturnData.rdToRevenue} 是否形成技术护城河？
   - **客户粘性**：收益质量 ${profitabilityData.incomeQuality} 和现金流稳定性如何？

**护城河评级**：[宽广  / 中等 / 狭窄  / 无]

## 五、财务健康与经营质量分析

请结合以上数据深入分析：
1. **盈利能力趋势**：对比年度和季度数据，毛利率和净利率是改善还是恶化？
2. **资产负债表健康度**：Altman Z-Score ${healthScores.altmanZScore}，Piotroski F-Score ${healthScores.piotroskiScore} 说明什么？
3. **现金流质量**：自由现金流是否健康？收益质量如何？
4. **资本配置效率**：ROIC ${profitabilityData.roic} 是否超过资本成本？

**财务健康评级**：[优秀 / 良好 / 一般 / 较差]

## 六、估值与买入时机分析

1. **估值判断**（结合多个估值指标）：
   - PE ${valuationData.peRatio}、PB ${valuationData.pbRatio}、EV/EBITDA ${valuationData.evToEbitda} 与行业和历史对比
   - 格雷厄姆数字 ${valuationData.grahamNumber} vs 当前股价 ${companyData.price}
   - 盈利收益率 ${valuationData.earningsYield} 是否有吸引力？

2. **买入时机判断**：
   - 结合季度数据趋势，业绩是在改善还是恶化？
   - 近期是否有可能影响股价的催化剂或风险事件？（搜索最新新闻）

**估值结论**：
- 估值水平：[便宜  / 合理  / 偏贵  / 昂贵 ]
- 股价 vs 内在价值：[低估 / 合理 / 高估]

## 七、综合投资建议

**核心投资逻辑**：（1-2句话总结）

**机会点**：
- ...

**风险点**：
- ...

**买入建议**：[强烈推荐买入 / 可以买入  / 持有观望  / 建议回避 ]

**建议操作策略**：（如分批建仓、等待回调等）

---

**格式要求**：
- 使用中文回答
- 使用 Markdown 格式，重要结论和关键数据请**加粗**
- 每个部分的结论要明确、直接，给出清晰的评级
- 引用搜索到的信息时标注来源
- 全文约 1200-1800 字，深入分析而非简单罗列`;

    const result = await model.generateContentStream(prompt);
    
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    }
    return streamIterator();
  }

  // 11. 智能划词解释
  async explainText(text: string): Promise<string> {
    const prompt = `
你是一个专业的金融助手，擅长用最通俗易懂的语言解释复杂的金融概念。
用户选中了一段文本（可能是专业术语、公司名、或者一段话），请给出一个简单直接的解释。

要求：
1. **通俗易懂**：假设用户是金融小白，不要堆砌专业术语。如果必须用，请顺便解释。
2. **简洁**：控制在 100-150 字以内。
3. **中文回答**。
4. **格式**：Markdown 格式，关键概念加粗。

用户选中的文本：
"${text}"

解释：
`;

    try {
      // 使用 lite 模型：解释词汇是简单任务，速度优先
      const model = this.getModel('lite', {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 1024,
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Explain text error:', error?.message || error);
      // 如果是网络错误，抛出更友好的错误信息
      if (error?.message?.includes('fetch failed') ||
        error?.message?.includes('ECONNRESET') ||
        error?.message?.includes('network')) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw error;
    }
  }
}
