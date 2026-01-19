import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // 使用 gemini-3-flash-preview 模型
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  async analyzeCompany(
    companyData: any,
    incomeData: any[],
    peers: string[],
    transcriptData?: any
  ): Promise<string> {
    const prompt = `
你是一位资深的金融分析师和投资研究专家。请根据以下数据，生成一份专业的投资调研报告。

## 公司基本信息
${JSON.stringify(companyData, null, 2)}

## 财务数据（近5年利润表）
${JSON.stringify(incomeData, null, 2)}

## 同业竞争者
${peers.join(', ')}

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
`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async searchAndAnalyze(companyName: string, symbol: string): Promise<string> {
    // 使用 Gemini 2.5 with Google Search grounding
    const modelWithSearch = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ 
        googleSearch: {} 
      }] as any,
    });

    const prompt = `请搜索并总结 ${companyName} (${symbol}) 的最新新闻和发展动态，包括：
1. 最近的重大公告和事件
2. 产品发布或战略变化
3. 行业动态和竞争格局变化
4. 分析师观点和市场情绪

请用中文回答，提供最近2-3个月的关键信息摘要。`;

    try {
      const result = await modelWithSearch.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Google Search grounding error:', error);
      return '';
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
- 抓出分析师的关键提问与管理层的回答。
- 标出“重复出现的尖锐问题”（如果2-3位分析师问同一问题，要明确指出这是市场核心担忧）。
- 识别“非正面回答”（问题被回避、答非所问）。
- 观察“语气变化/防御性措辞”（例如“正如我刚才所说...”）。

2. 核心数据区：业绩指引 (Guidance/Outlook)
- 是否上调、下调或重申全年目标。
- 注意措辞确定性（如“保守估计”“强劲可见度”“宏观不确定性”等）。

3. 关键指标解释区：CFO 的财务陈述
- 重点解释利润率变化（Gross/Operating Margin）。
- 指出一次性项目 (One-time items) 的影响，区分 Non-GAAP 真实经营状况。
- 资本配置 (Capital Allocation)：回购/分红/CapEx 的取向与信号。

4. 业务亮点区：CEO 的开场白 (Prepared Remarks)
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

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}
