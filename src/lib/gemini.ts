import type { MarketType } from '@/lib/markets';
import { globalRateLimiter } from '@/lib/ai/rate-limiter';
import {
  DEEPSEEK_MODEL,
  DEEPSEEK_MODEL_PRO,
  type ThinkingPolicy,
} from '@/lib/ai/deepseek-config';
import {
  extractContentOrEmpty,
  parseChatStream,
  requestChatCompletion,
  type ChatMessage,
} from '@/lib/ai/deepseek-request';

// 市场名称映射
const MARKET_NAMES: Record<MarketType, string> = {
  US: '美股',
  CN: 'A股（中国大陆）',
  HK: '港股（香港）',
  JP: '日股（日本）',
  KR: '韩股（韩国）',
  AU: '澳股（澳大利亚）',
};

interface ModelConfigInput {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  /** 省略即按 tier 默认值（见 DEFAULT_THINKING_BY_TIER） */
  thinking?: ThinkingPolicy;
}

interface ModelRuntimeConfig {
  model: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  thinking: ThinkingPolicy;
}

interface GenerateContentResult {
  response: Promise<{
    text: () => string;
  }>;
}

interface StreamChunk {
  text: () => string;
}

interface GenerateContentStreamResult {
  stream: AsyncGenerator<StreamChunk, void, unknown>;
}

interface DeepSeekModelAdapter {
  generateContent: (prompt: string) => Promise<GenerateContentResult>;
  generateContentStream: (prompt: string) => Promise<GenerateContentStreamResult>;
}

// 模型分级策略
// - lite: 简单任务，速度优先（股票联想、财报摘要）
// - standard: 复杂推理任务（公司深度分析）
// - search: 补充摘要任务（不启用联网检索）
// - pro: 专业版深度分析
// 分级只影响温度 / token 预算与所用模型；pro 档可通过 DEEPSEEK_MODEL_PRO 单独切换。
type ModelTier = 'lite' | 'standard' | 'search' | 'pro';

const MODEL_CONFIG: Record<ModelTier, { model: string; description: string }> = {
  lite: {
    model: DEEPSEEK_MODEL,
    description: '轻量快速模型，适合简单任务',
  },
  standard: {
    model: DEEPSEEK_MODEL,
    description: '标准模型，适合复杂推理',
  },
  search: {
    model: DEEPSEEK_MODEL,
    description: '补充摘要模型，不启用联网检索',
  },
  pro: {
    model: DEEPSEEK_MODEL_PRO,
    description: '专业模型，深度分析',
  },
};

// 思考模式默认全部关闭，只有判断密集且没有硬超时约束的调用点才显式开启。
// 原因：非流式调用都被 withRetryAndTimeout 包了 10~25s 的预算（见 api-utils.ts），
// 开启思考必然超时；而流式报告段落跑在 maxDuration=300 下，才有开思考的余量。
const DEFAULT_THINKING_BY_TIER: Record<ModelTier, ThinkingPolicy> = {
  lite: 'disabled',
  standard: 'disabled',
  search: 'disabled',
  pro: 'disabled',
};

export class DeepSeekClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getLanguageInstruction(language: string = 'zh'): {
    outputLang: string;
    langName: string;
    useMarkdown: string;
  } {
    if (language === 'en') {
      return {
        outputLang: 'Use English',
        langName: 'English',
        useMarkdown: 'Use English, Markdown format, bold key information',
      };
    }
    return {
      outputLang: '使用中文',
      langName: '中文',
      useMarkdown: '使用中文，Markdown 格式，关键信息加粗',
    };
  }

  private resolveModelConfig(tier: ModelTier, config?: ModelConfigInput): ModelRuntimeConfig {
    return {
      model: MODEL_CONFIG[tier].model,
      temperature: config?.temperature ?? 0.7,
      topP: config?.topP ?? 0.95,
      maxOutputTokens: config?.maxOutputTokens ?? 8192,
      thinking: config?.thinking ?? DEFAULT_THINKING_BY_TIER[tier],
    };
  }

  private async callDeepSeek(
    prompt: string,
    config: ModelRuntimeConfig,
    stream: boolean
  ): Promise<Response> {
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    return requestChatCompletion(this.apiKey, {
      model: config.model,
      messages,
      temperature: config.temperature,
      topP: config.topP,
      maxTokens: config.maxOutputTokens,
      thinking: config.thinking,
      stream,
    });
  }

  private async generateContentWithDeepSeek(
    prompt: string,
    config: ModelRuntimeConfig,
    label: string
  ): Promise<GenerateContentResult> {
    const response = await this.callDeepSeek(prompt, config, false);
    const data = await response.json();
    // 正文为空时沿用旧行为（返回空串交给各方法自行兜底），
    // 只有「推理吃光 token 预算」这种可诊断的情况才抛错。
    const text = extractContentOrEmpty(data, label);

    return {
      response: Promise.resolve({
        text: () => text,
      }),
    };
  }

  private async generateContentStreamWithDeepSeek(
    prompt: string,
    config: ModelRuntimeConfig
  ): Promise<GenerateContentStreamResult> {
    const response = await this.callDeepSeek(prompt, config, true);
    if (!response.body) {
      throw new Error('DeepSeek stream body is empty');
    }

    // 只把正文交给上层；思维链（reasoning_content）在这里丢弃。
    // 报告段落的响应体是纯 markdown 且会被原样写入 Supabase 缓存，
    // 混入思维链会污染缓存并被之后每一次命中缓存的读者看到。
    const source = parseChatStream(response.body as ReadableStream<Uint8Array>);
    async function* contentOnly(): AsyncGenerator<StreamChunk, void, unknown> {
      for await (const chunk of source) {
        if (chunk.kind === 'content') {
          yield { text: () => chunk.text };
        }
      }
    }

    return { stream: contentOnly() };
  }

  // 根据任务类型获取对应的模型实例
  private getModel(tier: ModelTier, config?: ModelConfigInput): DeepSeekModelAdapter {
    const resolvedConfig = this.resolveModelConfig(tier, config);
    return {
      generateContent: (prompt: string) => this.generateContentWithDeepSeek(prompt, resolvedConfig, tier),
      generateContentStream: (prompt: string) => this.generateContentStreamWithDeepSeek(prompt, resolvedConfig),
    };
  }

  async suggestSymbol(
    query: string,
    marketHint?: MarketType,
    language: string = 'zh'
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
    const nameInstruction = language === 'en'
      ? '6. Fill the name field with the English company name. Fill nameCn with the Chinese name if known.'
      : '6. 如果知道中文名，请填充 nameCn；否则可以留空。';
    const nameFieldDesc = language === 'en'
      ? '"name": "Company name in English (optional)"'
      : '"name": "公司名称（可选）"';
    const nameCnFieldDesc = language === 'en'
      ? '"nameCn": "Company name in Chinese (optional)"'
      : '"nameCn": "公司中文名（可选）"';
    const prompt = `你是股票搜索联想引擎。用户输入可能是股票代码、公司中文/英文名、拼音缩写或简称。请根据输入联想到正确格式的股票代码，并输出 JSON。

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

用户输入：${trimmedQuery}
市场提示：${marketName}

请严格输出以下 JSON 结构（注意 suggestions 数组通常包含 3-5 个对象，而不是 1 个）：
{
  "query": "${trimmedQuery}",
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

    try {
      // 使用 lite 模型：股票联想是简单任务，速度优先
      const model = this.getModel('lite', {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1024,
      });
      // 使用速率限制器
      const result = await globalRateLimiter.enqueue(
        () => model.generateContent(prompt),
        'suggestSymbol'
      );
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
      console.error('DeepSeek suggestSymbol error:', error?.message || error);
      return { query: trimmedQuery, suggestions: [] };
    }
  }

  async analyzeCompany(
    companyData: any,
    incomeData: any[],
    peers: string[],
    transcriptData?: any,
    market: MarketType = 'US',
    language?: string
  ): Promise<string> {
    const lang = this.getLanguageInstruction(language);
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

请按照以下JSON格式返回分析结果（${lang.outputLang}）：

{
  "companyOverview": "企业整体说明，包括主营业务、商业模式、发展历程等（300-500字）",
  "industryAnalysis": "企业所处行业的详细分析，包括行业规模、增长趋势、技术演进等（300-400字）",
  "industryPainPoints": "【必填】行业当前面临的最大痛点与发展障碍，包括但不限于：技术挑战、监管压力、供应链问题、人才短缺、成本压力、竞争加剧等（200-300字，必须提供具体分析）",
  "competitors": "行业其他主要竞争对手分析，包括各自的市场地位和特点（200-300字）",
  "competitiveAdvantage": "相较于其他竞争对手，该企业的独特优势（200-300字）",
  "moat": "企业核心竞争力及护城河分析，包括技术壁垒、品牌效应、网络效应等（300-400字）",
  "recentDevelopments": "基于财报会议和公开信息，总结企业最近的重要发展动态（200-300字）",
  "investmentConclusion": "投资建议总结，必须严格分为以下五个 Markdown 二级小节并按顺序输出（共 600-900 字）：\\n\\n**核心投资逻辑**：用 2-3 句话说清楚为什么应该或不应该投资。\\n\\n**关键催化剂（未来 2-4 季度）**：用列表给出 3-5 个可能影响股价的事件或时间节点（例：新品发布、季度财报、政策落地、并购、产能投放），每条注明触发条件与潜在影响方向。\\n\\n**主要风险因素**：用列表给出 3-5 条结构化风险（行业 / 监管 / 客户集中 / 汇率 / 技术替代 / 流动性 / 估值过高），每条简述触发情景与可能影响。\\n\\n**同业对比简表**：必须使用 Markdown 表格，列出该公司与 3 家以上主要同业的 P/E、毛利率、ROE、营收增长率 4 项指标，最后一行加入「行业中位数」或「行业均值」作为参考。\\n\\n**操作建议**：明确给出「强烈推荐 / 可以买入 / 持有观望 / 建议回避」一个标签，并附 1-2 句仓位与节奏建议。"
}

重要提示：
1. 请确保返回有效的JSON格式，不要包含任何markdown代码块标记
2. 所有字段都必须提供有意义的内容，不能留空
3. 特别注意industryPainPoints字段必须详细分析行业痛点，这对投资决策非常重要
4. **investmentConclusion 字段必须严格包含上述 5 个二级标题小节，缺一不可，尤其同业对比表必须以 Markdown 表格语法输出，不可只用文字描述**
5. 即使某些数据缺失，也请基于你对该公司和行业的专业知识进行合理分析
6. **格式要求**：每个字段的内容都应使用 Markdown 格式：
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
      // 使用速率限制器
      const result = await globalRateLimiter.enqueue(
        () => model.generateContent(prompt),
        'analyzeCompany'
      );
      const response = await result.response;
      const text = response.text();

      // 检查是否返回了有效的 JSON 格式响应
      if (!text || text.trim().length === 0) {
        console.error('DeepSeek returned empty response');
        throw new Error('AI 返回空响应');
      }

      return text;
    } catch (error: any) {
      console.error('DeepSeek analyzeCompany error:', error?.message || error);
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
    market: MarketType = 'US',
    language?: string
  ): Promise<string> {
    const lang = this.getLanguageInstruction(language);
    void market;
    // Online search is disabled; this uses only the base model.
    const modelWithSearch = this.getModel('search', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096,
    });

    const prompt = `请不要联网搜索。仅基于模型已有知识和调用方提供的公司名称，总结 ${companyName} (${symbol}) 的公开背景与可能的近期关注方向，按照以下结构回复：
1. 最近的重大公告和事件
2. 产品发布或战略变化
3. 行业动态和竞争格局变化
4. 分析师观点和市场情绪

不要声称已经检索网页、新闻或实时数据；如涉及时效性信息，必须明确说明可能不是实时结果。请确保返回有效的 JSON 格式，可以包含 markdown 代码块标记。${lang.outputLang}。`;

    try {
      // 使用速率限制器
      const result = await globalRateLimiter.enqueue(
        () => modelWithSearch.generateContent(prompt),
        'searchAndAnalyze'
      );
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('DeepSeek supplemental summary error:', error?.message || error);
      // 网络错误时返回空字符串，让主流程继续
      if (error?.message?.includes('fetch failed') ||
        error?.message?.includes('ECONNRESET') ||
        error?.message?.includes('network')) {
        console.log('Network error in searchAndAnalyze, returning empty result');
      }
      return '';
    }
  }

  // 专门用于非美股市场的补充分析（不使用 online search）
  async searchCompanyDetails(
    companyName: string,
    symbol: string,
    market: MarketType,
    language?: string
  ): Promise<{
    competitors: string;
    recentNews: string;
    analystViews: string;
  }> {
    const lang = this.getLanguageInstruction(language);
    // Online search is disabled; this uses only the base model.
    const modelWithSearch = this.getModel('search', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096,
    });

    const marketName = MARKET_NAMES[market] || '美股';

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const prompt = `请不要联网搜索。仅基于模型已有知识，概述 ${companyName} (${symbol}，${marketName}市场) 的公开背景、竞争环境和可能的关注点，并以 JSON 格式返回。今天日期为 ${todayStr}。

{
  "competitors": "该公司的主要竞争对手及其特点分析（200-300字）",
  "recentNews": "非实时的近期关注方向概述（200-300字，必须说明未联网检索）",
  "analystViews": "券商和分析师的观点汇总，包括评级和目标价（如有）（100-200字）"
}

不要声称已经检索网页、新闻或实时数据；如涉及时效性信息，必须明确说明可能不是实时结果。请确保返回有效的 JSON 格式，可以包含 markdown 代码块标记。${lang.outputLang}。`;

    try {
      // 使用速率限制器
      const result = await globalRateLimiter.enqueue(
        () => modelWithSearch.generateContent(prompt),
        'searchCompanyDetails'
      );
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
    symbol: string,
    language?: string
  ): Promise<string> {
    const lang = this.getLanguageInstruction(language);
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
- ${lang.outputLang}，结构化呈现，每个部分用清晰标题。
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
      // 使用速率限制器
      const result = await globalRateLimiter.enqueue(
        () => model.generateContent(prompt),
        'summarizeEarningsCall'
      );
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

  // 通用的流式生成辅助方法（带速率限制）
  async *generateStream(
    prompt: string,
    tier: ModelTier = 'standard',
    options?: { thinking?: ThinkingPolicy; maxOutputTokens?: number }
  ): AsyncGenerator<string, void, unknown> {
    const model = this.getModel(tier, {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: options?.maxOutputTokens ?? 8192,
      thinking: options?.thinking,
    });

    // 使用速率限制器来获取流
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      `generateStream-${tier}`
    );

    try {
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
  async streamCompanyOverview(companyData: any, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
你是一位专业的金融分析师。请根据以下公司信息，撰写一份简洁的“企业概况”。

数据：
${JSON.stringify(companyData, null, 2)}

要求：
- 介绍主营业务、商业模式和简要发展历程。
- 字数控制在 300-500 字。
- ${lang.outputLang}。
- 格式：Markdown，关键信息（如核心产品、市场地位）加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 2. 行业分析
  async streamIndustryAnalysis(companyData: any, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
请分析 ${companyData.companyName} (${companyData.symbol}) 所处的行业。

要求：
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- 分析行业规模、增长趋势、技术演进方向。
- 字数控制在 300-400 字。
- ${lang.outputLang}。
- 格式：Markdown，关键数据和趋势加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 3. 行业痛点与障碍
  async streamIndustryPainPoints(companyData: any, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
请深入分析 ${companyData.companyName} 所处行业当前面临的最大痛点与发展障碍。

要求：
- 涵盖技术挑战、监管压力、供应链问题、人才短缺、成本压力、竞争加剧等方面。
- 必须提供具体分析，而非泛泛而谈。
- 字数 200-300 字。
- ${lang.outputLang}。
- 格式：Markdown，关键痛点加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 4. 竞争格局
  async streamCompetitors(companyData: any, peers: string[], market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
请分析 ${companyData.companyName} 的竞争格局。

已知竞争对手：${peers.join(', ')}

要求：
- 分析主要竞争对手的市场地位和特点。
- 字数 200-300 字。
- ${lang.outputLang}。
- 格式：Markdown，对手名称和关键特点加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 5. 竞争优势
  async streamCompetitiveAdvantage(companyData: any, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
请分析 ${companyData.companyName} 相较于竞争对手的独特优势。

要求：
- 聚焦于不可复制的优势。
- 字数 200-300 字。
- ${lang.outputLang}。
- 格式：Markdown，核心优势点加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 6. 核心护城河
  async streamMoat(companyData: any, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
请深入剖析 ${companyData.companyName} 的核心护城河。

要求：
- 分析技术壁垒、品牌效应、网络效应、转换成本等。
- 字数 300-400 字。
- ${lang.outputLang}。
- 格式：Markdown，关键护城河加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  // 7. 最新发展动态（online search disabled，基于模型已有知识与已提供数据）
  async streamRecentDevelopments(companyName: string, symbol: string, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const marketName = MARKET_NAMES[market] || '美股';
    // Online search is disabled; this uses only the base model.
    const model = this.getModel('search', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 3072,
    });

    const prompt = `请不要联网搜索。基于模型已有知识与已提供信息，概述 ${companyName} (${symbol}，${marketName}市场) 可能值得关注的发展方向（200-300字）。
     不要声称已检索实时新闻、公告或网页；如缺少实时信息，请明确说明该部分不是实时搜索结果。
     重点关注：业务进展、财务表现、监管环境、行业竞争、资本配置。
     ${lang.outputLang}，Markdown 格式，关键动态加粗。`;

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'recentDevelopments'
    );
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
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const isEnglish = language === 'en';
    const prompt = isEnglish
      ? `
You are a professional investment research analyst. Based on the following research report about ${companyData.companyName} (${companyData.symbol}), write an "Investment Conclusion" summary.

Existing report content:
${context}

**CRITICAL LANGUAGE REQUIREMENT**:
- The entire output MUST be written in **English ONLY**.
- Do NOT use any Chinese characters, Chinese punctuation, or Chinese phrases anywhere.
- All section headings, labels, and analysis must be in English.

Requirements:
- **Do NOT give any buy / sell / hold recommendation**
- **Do NOT recommend whether to purchase this stock**
- Objectively analyze only the company's **core strengths** and **key weaknesses / risks**
- Help investors form a complete picture so they can decide for themselves
- Length: 200-300 words
- Format: Markdown, with core strengths and key risks bolded

Output structure (use these exact English headings):
**Core Strengths**:
- ...

**Key Weaknesses / Risks**:
- ...
`
      : `
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
    // 判断类段落：开启思考模式。预算需同时容纳推理与正文。
    return this.generateStream(prompt, 'standard', { thinking: 'high', maxOutputTokens: 16384 });
  }

  // 9. 财报电话会议总结 (流式)
  async streamEarningsCallSummary(
    transcriptText: string,
    companyName: string,
    symbol: string,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const isEnglish = language === 'en';
    const prompt = isEnglish
      ? `
You are a senior sell-side analyst. Based on the following earnings call transcript, generate a concise "Earnings Call Summary".

**CRITICAL LANGUAGE REQUIREMENT**:
- The entire output MUST be written in **English ONLY**.
- Do NOT use any Chinese characters, Chinese punctuation, or Chinese phrases anywhere in the response.
- All section headings, bullet points, labels, and analytical commentary must be in English.
- If you need to reference common terms, use the English term (e.g. "Gross Margin", "Guidance", "Non-GAAP"), not the Chinese equivalent.

Structure your response strictly around the four areas below, with clear takeaways and judgments for each:

1. Must-Read: Q&A Session
This is the highest-signal part of the transcript. Analyst questions reflect market concerns; management answers reveal their ability to respond.
- Pull out the key analyst questions and management's answers.
- Recurring sharp questions: if two or three analysts ask the same thing (e.g., "Why are margins declining?" or "When will AI monetize?"), even if management deflects, that itself signals the core concern in the market today.
- Non-answers: watch for evasive answers. If the analyst asks "What is your growth target for next year?" and management replies "We're confident in the long term", that's a classic warning sign that near-term results may be weak or worse.
- Tone shifts: although you can't hear voices in a transcript, terse, blunt answers or repeated defensive phrasing like "as I said earlier..." usually indicate pressure on management.

2. Core Data: Guidance / Outlook
This part is typically at the end of the CFO's remarks or in the CEO's closing comments.
- Forecast revisions: this is the direct catalyst for stock moves. Did they Raise, Lower, or Reiterate full-year targets?
- Certainty of language: pay attention to modifiers. "Conservative" vs. "strong visibility"? If management says "increasing macro uncertainty", they are usually preparing the market for a future miss.

3. Key Metrics: CFO's Financial Commentary
The CFO's remarks can be dry but often hold the "key" to interpreting the numbers. Focus on:
- Margins: search for "Gross Margin" and "Operating Margin". If margins compressed, find the cause—price cuts (bad) or higher R&D investment (potentially good)?
- One-time items: sometimes a profit spike is from selling a building, or a hit is from a one-off fine. The CFO removes this "noise" here and shows true operating performance (Non-GAAP).
- Capital Allocation: how do they plan to spend cash? Buybacks (supportive for stock), dividends, or CapEx (e.g., GPU buildouts, new plants)? Heavy CapEx prompts the market to scrutinize the return on those investments.

4. Business Highlights: CEO's Prepared Remarks
Mostly PR-polished, but one thing is worth watching: changes in strategic priorities.
- Extract shifts in strategic priorities and meaningful business highlights (avoid generic platitudes).

Output requirements:
- Structured presentation in **English**, each section with a clear English heading.
- 3-6 bullet points per section, concise and readable.
- If a section is not disclosed in the transcript, explicitly write "Not disclosed / Not mentioned".
- Output content only—do NOT wrap in code block markers.
- **Formatting**: use Markdown:
  - Use **bold** to highlight key data, important conclusions, and core takeaways (e.g., specific financial metrics, growth rates, key management statements).
  - Use bullet lists to organize points.
  - Key financial data and percentages must be bolded, e.g., **revenue grew 25% YoY**, **gross margin compressed by 3 percentage points**.
  - Each bullet should contain at least one bolded keyword so readers can quickly scan the highlights.

Company: ${companyName} (${symbol})
Earnings Call Transcript:
${transcriptText}
`
      : `
你是一位资深卖方分析师。请根据以下英文电话会议全文，生成中文“财报电话会议精要”。

**语言要求**：整份输出必须使用**简体中文**，不要混用英文段落。专有名词或财务术语可在中文标题后用括号附英文原文。

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
- 使用中文，结构化呈现，每个部分用清晰标题。
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

    return this.generateStream(prompt, 'lite');
  }

  // ============================================================================
  // 专业版报告分析 - 拆分为 7 个独立的并发请求
  // ============================================================================

  // 专业版通用的模型配置
  private getProModel() {
    return this.getModel('pro', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096,
    });
  }

  // 10.1 专业版 - 生意模式分析（带速率限制）
  async streamProBusinessModel(
    companyData: any,
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
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
- ${lang.useMarkdown}
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

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proBusinessModel'
    );
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.2 专业版 - 运营模式分析（带速率限制）
  async streamProOperatingModel(
    companyData: any,
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
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
- ${lang.useMarkdown}
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

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proOperatingModel'
    );
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.3 专业版 - 行业前景评估（带速率限制）
  async streamProIndustryOutlook(
    companyData: any,
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
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
- ${lang.useMarkdown}
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

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proIndustryOutlook'
    );
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.4 专业版 - 竞争地位与护城河（带速率限制）
  async streamProMoatAnalysis(
    companyData: any,
    profitabilityData: any,
    capitalReturnData: any,
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
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
- ${lang.useMarkdown}
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

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proMoatAnalysis'
    );
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.5 专业版 - 财务健康与经营质量（带速率限制）
  async streamProFinancialHealth(
    companyData: any,
    annualFinancials: any[],
    quarterlyFinancials: any[],
    profitabilityData: any,
    debtData: any,
    healthScores: any,
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
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
- ${lang.useMarkdown}
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

### 4. 资本配置与股东回报【必填】
基于现金流量表和资产负债表数据，分析公司过去 3-5 年的资本配置：
- **回购**：股本是否净减少？回购的节奏和价格是否合理？
- **分红**：派息率和股息率是多少？分红政策稳定吗？
- **再投资 vs 并购**：CapEx 和 R&D 投入趋势？是否有重大并购？并购回报如何？
- **股权激励稀释**：股权激励占营收比例是否在合理区间？
- **ROIC 是否持续超过资本成本（通常 8-10%）？**

**资本配置评级**：[优秀（创造价值） / 中性 / 较差（销毁价值）]

**财务健康评级**：[优秀 / 良好 / 一般 / 较差]

字数控制在 500-750 字。`;

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proFinancialHealth'
    );
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.6 专业版 - 估值与买入时机（带速率限制）
  async streamProValuation(
    companyData: any,
    valuationData: any,
    growthData: any,
    quarterlyFinancials: any[],
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const marketName = MARKET_NAMES[market] || '美股';
    // 估值判断需要多步推算，开启思考模式（其余 pro 段落沿用 getProModel 的非思考配置）。
    const model = this.getModel('pro', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 16384,
      thinking: 'high',
    });
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
- ${lang.useMarkdown}
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- **建议使用表格**对比该公司与行业平均估值

## 估值与同业对比

### 1. 同业可比公司估值表【必填，必须用 Markdown 表格输出】
列出该公司与 3-5 家同行业可比公司的横向估值对比表。必须包含以下列：
公司名称（含本公司） | P/E (TTM) | EV/EBITDA | P/S | 毛利率 | ROE | 营收 YoY

最后一行附加「行业中位数」或「行业均值」作为基准。
若某项数据无法精确获取，可基于该公司公开披露的最近季度数据合理估算并标注「估算」字样。

### 2. 估值判断
- 该公司相对同业是溢价还是折价？折溢价合理性分析
- 格雷厄姆数字 vs 当前股价，是否被低估？
- 盈利收益率 vs 无风险利率：盈利收益率是否有吸引力？
- 历史估值带：当前估值处于近 5 年的什么分位（高位 / 中位 / 低位）？

### 3. 买入时机判断
- 结合季度数据趋势，业绩是在改善还是恶化？
- 近期是否有可能影响股价的催化剂或风险事件？

**估值结论**：
- 估值水平：[便宜 / 合理 / 偏贵 / 昂贵]
- 股价 vs 内在价值：[低估 / 合理 / 高估]
- 相对同业：[折价 / 持平 / 溢价]

字数控制在 500-750 字（含表格）。`;

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proValuation'
    );
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // 10.7 专业版 - 综合投资建议（需要前6个章节的内容）（带速率限制）
  async streamProInvestmentConclusion(
    companyData: any,
    prevContext: string,
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const marketName = MARKET_NAMES[market] || '美股';
    // 专业版投资结论是全篇判断密度最高的一段，开启思考模式；
    // 预算由 6144 提到 16384，因为推理与正文共享 max_tokens。
    const model = this.getModel('pro', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 16384,
      thinking: 'high',
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
- ${lang.useMarkdown}
- **禁止任何开场白、问候语、自我介绍**，直接输出报告内容
- **禁止使用任何 emoji 表情符号**
- 可使用表格汇总投资评级

## 综合投资建议

### 1. 核心投资逻辑
用 2-3 句话总结为什么应该或不应该投资这家公司。

### 2. 关键催化剂时间表【必填，建议用 Markdown 表格】
列出未来 2-4 个季度可能驱动股价的关键事件，按时间排序：

| 时间窗口 | 事件 | 类型 | 潜在影响（↑/↓） | 触发条件 |
|---|---|---|---|---|
| 例：2026 Q1 | xx季报 | 业绩 | ↑ | xxx 业务超预期 |

至少给出 3-5 行。事件类型包括：财报、新品发布、产能投放、政策落地、并购、回购、宏观节点等。

### 3. 风险因素【必填，必须结构化分类】
按以下 5 类至少各给 1 条，每条用一句话说明触发情景与潜在影响：

- **行业 / 周期风险**：…
- **监管 / 政策风险**：…
- **客户 / 供应链集中**：…
- **汇率 / 宏观敏感**：…
- **估值 / 流动性风险**：…

### 4. 情景分析（Bull / Base / Bear）【必填，必须用 Markdown 表格】

| 情景 | 概率 | 关键假设 | 12 个月隐含目标价区间 | 较当前股价空间 |
|---|---|---|---|---|
| Bull（乐观） | xx% | … | … | +xx% |
| Base（中性） | xx% | … | … | ±xx% |
| Bear（悲观） | xx% | … | … | -xx% |

三档概率之和应为 100%。

### 5. 投资评级汇总
- **行业评级**：[高增长行业 / 稳定成熟行业 / 衰退行业]
- **护城河评级**：[宽广 / 中等 / 狭窄 / 无]
- **财务健康评级**：[优秀 / 良好 / 一般 / 较差]
- **估值水平**：[便宜 / 合理 / 偏贵 / 昂贵]
- **资本配置**：[优秀 / 中性 / 较差]

### 6. 买入建议
[强烈推荐买入 / 可以买入 / 持有观望 / 建议回避]

### 7. 操作策略
- 仓位控制建议
- 分批建仓策略
- 关键观察时间节点

字数控制在 800-1100 字（含表格）。`;

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proInvestmentConclusion'
    );
    async function* streamIterator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    }
    return streamIterator();
  }

  // ============================================================================
  // 小白版报告分析 - 面向投资新手的通俗分析
  // ============================================================================

  async streamBeginnerVerdict(companyData: any, incomeStatements: any[], market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const recentRevenue = incomeStatements?.slice(0, 3).map((s: any) => ({
      year: s.calendarYear || s.date?.substring(0, 4),
      revenue: s.revenue,
      netIncome: s.netIncome,
      revenueGrowth: s.revenueGrowth,
    })) || [];
    
    const prompt = `
你是一位面向投资新手的分析师。请用最通俗直白的语言，针对 ${companyData.companyName} (${companyData.symbol}) 给出投资结论。

公司数据：
- 当前股价：$${companyData.price}
- 市值：$${companyData.marketCap || companyData.mktCap}
- 行业：${companyData.sector} / ${companyData.industry}
- 近几年营收数据：${JSON.stringify(recentRevenue)}

要求：
- **第一句话就给出明确结论**：这只股票现在是否值得买？用 ✅ 或 ⚠️ 或 ❌ 开头。
- 结合营收数据判断：公司最近是在增长还是在走下坡路？当前股价是不是在历史高位？
- 用"说人话"的方式解释，就像给完全不懂股票的朋友讲。
- 禁止任何开场白、问候语。
- 字数 200-300 字。
- ${lang.outputLang}。
- 格式：Markdown，关键结论加粗。
`;
    // 新手版结论同样是判断类段落，开启思考模式。
    return this.generateStream(prompt, 'standard', { thinking: 'high', maxOutputTokens: 16384 });
  }

  async streamBeginnerCompanyIntro(companyData: any, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
用最简单的语言介绍 ${companyData.companyName} (${companyData.symbol}) 这家公司。

要求：
- 想象你在跟一个完全不懂商业的朋友解释。
- 这家公司是做什么的？靠什么赚钱？它的产品你可能用过吗？
- 禁止使用任何专业金融术语（如"P/E"、"ROE"等）。如果必须提到，要用括号解释。
- 字数 150-250 字。
- ${lang.outputLang}。
- 格式：Markdown，关键信息加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  async streamBeginnerRiskReward(companyData: any, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
用最直白的语言分析投资 ${companyData.companyName} (${companyData.symbol}) 的好处和风险。

要求：
- 分为"👍 买它的理由"和"👎 需要担心的事"两部分。
- 每部分列 2-3 个要点，每个要点一句话说清楚。
- 用日常生活的例子或比喻来解释。
- 禁止使用专业金融术语。
- 字数 200-300 字。
- ${lang.outputLang}。
- 格式：Markdown，关键信息加粗。
`;
    return this.generateStream(prompt, 'standard');
  }

  async streamBeginnerActionPlan(companyData: any, prevContext: string, market: MarketType, language?: string): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
基于以下分析内容，给投资新手一份简单的行动建议。

前置分析：
${prevContext}

公司：${companyData.companyName} (${companyData.symbol})
当前股价：$${companyData.price}

要求：
- 明确告诉新手：现在该怎么做？买？等等看？还是别碰？
- 如果建议买，给一个简单的策略（比如"可以先买一点试试"或"等跌到xx再考虑"）。
- 提醒新手最重要的一两个注意事项。
- 最后用一句话总结。
- 禁止使用专业术语。
- 字数 150-250 字。
- ${lang.outputLang}。
- 格式：Markdown，关键建议加粗。
`;
    return this.generateStream(prompt, 'standard');
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
    market: MarketType,
    language?: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lang = this.getLanguageInstruction(language);
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

    // 使用专业模型生成深度分析
    const model = this.getModel('pro', {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 12288,
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

请基于以上详尽的财务数据撰写深度分析报告；不要联网搜索，也不要声称获取了实时网页、新闻或分析师数据。今天日期为 ${today}。

### 输出结构（必须严格遵循）：

## 一、生意模式分析（Business Model）

请基于已提供财务数据与模型已有知识，深入分析该公司的生意本质：

1. **主营业务与核心产品**：
   - 公司的主营业务是什么？核心产品/服务有哪些？
   - 各业务板块的收入占比如何？（基于已提供数据；缺失则说明无法确认）
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
- ${lang.outputLang}
- 使用 Markdown 格式，重要结论和关键数据请**加粗**
- 每个部分的结论要明确、直接，给出清晰的评级
- 引用搜索到的信息时标注来源
- 全文约 1200-1800 字，深入分析而非简单罗列`;

    // 使用速率限制器
    const result = await globalRateLimiter.enqueue(
      () => model.generateContentStream(prompt),
      'proAnalysis'
    );
    
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

  // 12. 用户反馈翻译（仅前端展示用，不写库）
  async translateText(
    text: string,
    targetLang: 'zh' | 'en',
    sourceLang: string = 'auto',
  ): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const targetLabel = targetLang === 'zh' ? 'Simplified Chinese' : 'English';
    const sourceLabel = sourceLang === 'auto'
      ? 'the source language (auto-detect)'
      : sourceLang === 'zh' ? 'Simplified Chinese' : 'English';

    const prompt = `You are a precise translator. Translate the user feedback below from ${sourceLabel} to ${targetLabel}.

Strict requirements:
- Output ONLY the translated text. No quotes, no notes, no original copy.
- Preserve Markdown, code blocks, and line breaks as-is.
- Keep product names, stock symbols, and URLs untouched.
- If the text is already in ${targetLabel}, return it unchanged.

Text to translate:
"""
${trimmed}
"""`;

    try {
      const model = this.getModel('lite', {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 2048,
      });
      const result = await globalRateLimiter.enqueue(
        () => model.generateContent(prompt),
        'translateText',
      );
      const response = await result.response;
      const raw = response.text();
      return (raw || trimmed).trim();
    } catch (error: any) {
      console.error('translateText error:', error?.message || error);
      return trimmed;
    }
  }

  // 11. 智能划词解释
  async explainText(text: string, language?: string): Promise<string> {
    const lang = this.getLanguageInstruction(language);
    const prompt = `
你是一个专业的金融助手，擅长用最通俗易懂的语言解释复杂的金融概念。
用户选中了一段文本（可能是专业术语、公司名、或者一段话），请给出一个简单直接的解释。

要求：
1. **通俗易懂**：假设用户是金融小白，不要堆砌专业术语。如果必须用，请顺便解释。
2. **简洁**：控制在 100-150 字以内。
3. **${lang.outputLang}**。
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
      // 使用速率限制器
      const result = await globalRateLimiter.enqueue(
        () => model.generateContent(prompt),
        'explainText'
      );
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
