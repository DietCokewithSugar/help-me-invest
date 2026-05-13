// 投资组合分类
export type PortfolioCategory = 'legendary' | 'politician' | 'hedge_fund' | 'recommendation';

export const PORTFOLIO_CATEGORIES: Record<PortfolioCategory, { name: string; icon: string }> = {
    legendary: { name: '传奇投资人', icon: '' },
    politician: { name: '政客持仓', icon: '' },
    hedge_fund: { name: '对冲基金', icon: '' },
    recommendation: { name: '投资建议', icon: '' },
};

// 仓位大小分类
export type PositionSize = 'large' | 'medium' | 'small';

export const POSITION_SIZE_CONFIG: Record<PositionSize, { name: string; minPercent: number; color: string }> = {
    large: { name: '大仓位', minPercent: 5, color: '#14b8a6' },
    medium: { name: '中仓位', minPercent: 2, color: '#3b82f6' },
    small: { name: '小仓位', minPercent: 0, color: '#6b7280' },
};

// 根据组合占比获取仓位大小
export function getPositionSize(portfolioPercent: number | undefined): PositionSize {
    if (!portfolioPercent) return 'small';
    if (portfolioPercent >= 5) return 'large';
    if (portfolioPercent >= 2) return 'medium';
    return 'small';
}

export interface TrackedCompany {
    symbol: string;
    name: string;
    market: 'US' | 'CN' | 'HK' | 'JP' | 'KR';
    shares?: number;
    portfolioPercent?: number;
    marketValue?: number;
    lastUpdated?: string;
    rating?: 1 | 2 | 3 | 4 | 5;  // 推荐评级 (仅用于投资建议类)
}

// 生成评级显示
export function renderStars(rating: number): string {
    return `${rating}/5`;
}

// 获取持有同一股票的其他投资人
export function getSharedHolders(symbol: string, currentPortfolioId: string): { name: string; authorCn: string }[] {
    const holders: { name: string; authorCn: string }[] = [];

    // 延迟引用 PORTFOLIOS 避免循环依赖
    const portfolios = PORTFOLIOS;

    portfolios.forEach(portfolio => {
        if (portfolio.id === currentPortfolioId) return;
        if (portfolio.category === 'recommendation') return; // 排除投资建议

        const hasStock = portfolio.stocks.some(stock => stock.symbol === symbol);
        if (hasStock) {
            holders.push({
                name: portfolio.nameCn,
                authorCn: portfolio.authorCn
            });
        }
    });

    return holders;
}

export interface Portfolio {
    id: string;
    name: string;
    nameCn: string;           // 中文名称
    description: string;
    author: string;
    authorCn: string;         // 投资人中文名
    aum?: string;             // 管理资产规模
    category: PortfolioCategory;
    stocks: TrackedCompany[];
    recentStrategy?: string;  // 近期核心策略
    recentMoves?: string;     // 最新动向
}

export const PORTFOLIOS: Portfolio[] = [
    {
        id: 'warren-buffett',
        name: 'Buffett Holdings',
        nameCn: '巴菲特最新持仓 (Berkshire Hathaway)',
        description: '基于最新持仓数据整理。巴菲特近期继续减持第一大重仓股苹果 (AAPL) 和美国银行 (BAC)，同时加仓安达保险 (CB)、谷歌 (GOOGL) 和达美乐披萨 (DPZ)。组合中还显著包含五大日本商社的持仓。',
        author: 'Warren Buffett',
        authorCn: '沃伦·巴菲特 (Warren Buffett)',
        aum: 'N/A',
        category: 'legendary',
        recentStrategy: '只买"下金蛋的鹅"——① 只买"垄断"老店（护城河）：喜欢"别人很难打倒，你也离不开"的公司，如可口可乐；② 只买"现金奶牛"：不需要巨资研发，还能源源不断生出现金的公司，如美国运通；③ 打折时买，然后拿住不放：等股市暴跌时"捡便宜"，持有几年甚至几十年让复利发挥作用。',
        recentMoves: '套现离场，捂紧钱包——① 大举卖出"旧爱"：卖掉近半苹果和大量美国银行，觉得股价偏高，先"落袋为安"；② 尝试"新口味"：买入达美乐披萨和谷歌，看中护城河和便宜估值；③ 疯狂囤现金：伯克希尔握着几千亿美元现金等待下一场"暴风雨"抄底。',
        stocks: [
            { symbol: 'AAPL', name: '苹果 (Apple)', market: 'US', portfolioPercent: 19.64, lastUpdated: '2026-01-29' },
            { symbol: 'AXP', name: '美国运通 (American Express)', market: 'US', portfolioPercent: 17.64, lastUpdated: '2026-01-29' },
            { symbol: 'BAC', name: '美国银行 (Bank of America)', market: 'US', portfolioPercent: 9.51, lastUpdated: '2026-01-29' },
            { symbol: 'KO', name: '可口可乐 (Coca-Cola)', market: 'US', portfolioPercent: 9.44, lastUpdated: '2026-01-29' },
            { symbol: 'CVX', name: '雪佛龙 (Chevron)', market: 'US', portfolioPercent: 6.67, lastUpdated: '2026-01-29' },
            { symbol: 'MCO', name: '穆迪 (Moody\'s)', market: 'US', portfolioPercent: 4.11, lastUpdated: '2026-01-29' },
            { symbol: 'OXY', name: '西方石油 (Occidental Petroleum)', market: 'US', portfolioPercent: 3.83, lastUpdated: '2026-01-29' },
            { symbol: '8058', name: '三菱商事 (Mitsubishi)', market: 'JP', portfolioPercent: 3.35, lastUpdated: '2026-01-29' },
            { symbol: 'CB', name: '安达保险 (Chubb Ltd)', market: 'US', portfolioPercent: 3.06, lastUpdated: '2026-01-29' },
            { symbol: '8031', name: '三井物产 (Mitsui)', market: 'JP', portfolioPercent: 2.99, lastUpdated: '2026-01-29' },
            { symbol: 'KHC', name: '卡夫亨氏 (Kraft Heinz)', market: 'US', portfolioPercent: 2.47, lastUpdated: '2026-01-29' },
            { symbol: 'GOOGL', name: 'Alphabet (谷歌-A)', market: 'US', portfolioPercent: 1.92, lastUpdated: '2026-01-29' },
            { symbol: '8002', name: '丸红 (Marubeni)', market: 'JP', portfolioPercent: 1.64, lastUpdated: '2026-01-29' },
            { symbol: '8053', name: '住友商事 (Sumitomo)', market: 'JP', portfolioPercent: 1.33, lastUpdated: '2026-01-29' },
            { symbol: 'DVA', name: '德维特 (DaVita)', market: 'US', portfolioPercent: 1.09, lastUpdated: '2026-01-29' },
            { symbol: 'KR', name: '克罗格 (Kroger)', market: 'US', portfolioPercent: 1.00, lastUpdated: '2026-01-29' },
            { symbol: 'V', name: 'Visa', market: 'US', portfolioPercent: 0.87, lastUpdated: '2026-01-29' },
            { symbol: 'SIRI', name: 'Sirius XM Holdings', market: 'US', portfolioPercent: 0.81, lastUpdated: '2026-01-29' },
            { symbol: 'AMZN', name: '亚马逊 (Amazon)', market: 'US', portfolioPercent: 0.78, lastUpdated: '2026-01-29' },
            { symbol: 'VRSN', name: '威瑞信 (VeriSign)', market: 'US', portfolioPercent: 0.73, lastUpdated: '2026-01-29' },
            { symbol: 'STZ', name: '星座品牌 (Constellation Brands)', market: 'US', portfolioPercent: 0.70, lastUpdated: '2026-01-29' },
            { symbol: '01211', name: '比亚迪股份 (BYD)', market: 'HK', portfolioPercent: 0.69, lastUpdated: '2026-01-29' },
            { symbol: 'MA', name: '万事达 (Mastercard)', market: 'US', portfolioPercent: 0.67, lastUpdated: '2026-01-29' },
            { symbol: '8001', name: '伊藤忠商事 (ITOCHU)', market: 'JP', portfolioPercent: 0.56, lastUpdated: '2026-01-29' },
            { symbol: 'COF', name: '第一资本信贷 (Capital One)', market: 'US', portfolioPercent: 0.51, lastUpdated: '2026-01-29' },
            { symbol: 'UNH', name: '联合健康 (UnitedHealth)', market: 'US', portfolioPercent: 0.47, lastUpdated: '2026-01-29' },
            { symbol: 'AON', name: '怡安保险 (Aon)', market: 'US', portfolioPercent: 0.44, lastUpdated: '2026-01-29' },
            { symbol: 'LLYVK', name: 'Liberty Live-C', market: 'US', portfolioPercent: 0.44, lastUpdated: '2026-01-29' },
            { symbol: 'ALLY', name: 'Ally Financial', market: 'US', portfolioPercent: 0.40, lastUpdated: '2026-01-29' },
            { symbol: 'DPZ', name: '达美乐披萨 (Domino\'s Pizza)', market: 'US', portfolioPercent: 0.39, lastUpdated: '2026-01-29' },
            { symbol: 'NUE', name: '纽柯钢铁 (Nucor)', market: 'US', portfolioPercent: 0.35, lastUpdated: '2026-01-29' },
            { symbol: 'POOL', name: 'Pool Corp', market: 'US', portfolioPercent: 0.29, lastUpdated: '2026-01-29' },
            { symbol: 'LEN', name: '莱纳建筑 (Lennar)', market: 'US', portfolioPercent: 0.26, lastUpdated: '2026-01-29' },
            { symbol: 'DEO', name: '帝亚吉欧 (Diageo)', market: 'US', portfolioPercent: 0.19, lastUpdated: '2026-01-29' },
            { symbol: 'IAC', name: 'Insurance Australia', market: 'US', portfolioPercent: 0.16, lastUpdated: '2026-01-29' },
            { symbol: 'LPX', name: 'Louisiana-Pacific', market: 'US', portfolioPercent: 0.16, lastUpdated: '2026-01-29' },
            { symbol: 'HEI', name: '海科航空 (HEICO)', market: 'US', portfolioPercent: 0.14, lastUpdated: '2026-01-29' },
            { symbol: 'FWONK', name: 'Liberty Formula One', market: 'US', portfolioPercent: 0.09, lastUpdated: '2026-01-29' },
            { symbol: 'CHTR', name: '特许通讯 (Charter Communications)', market: 'US', portfolioPercent: 0.06, lastUpdated: '2026-01-29' },
            { symbol: 'LAMR', name: '拉马尔户外广告 (Lamar Advertising)', market: 'US', portfolioPercent: 0.05, lastUpdated: '2026-01-29' },
        ],
    },
    {
        id: 'soros-fund-management',
        name: 'Soros Fund Management',
        nameCn: '索罗斯基金最新持仓',
        description: '索罗斯基金管理公司 (Soros Fund Management) 的 13F 季度报告，披露了其美股多头持仓。该基金以全球宏观对冲策略闻名，投资风格灵活多变，近期大幅增持科技股与消费类资产，同时利用可转债进行布局。',
        author: 'George Soros',
        authorCn: '乔治·索罗斯 (George Soros)',
        aum: '$70.2亿美元 (13F权益资产)',
        category: 'legendary',
        stocks: [
            { symbol: 'AMZN', name: '亚马逊 (Amazon)', market: 'US', portfolioPercent: 6.96, lastUpdated: '2025-09-30' },
            { symbol: 'SW', name: 'Smurfit Westrock', market: 'US', portfolioPercent: 4.70, lastUpdated: '2025-09-30' },
            { symbol: 'SPOT', name: 'Spotify Technology', market: 'US', portfolioPercent: 3.61, lastUpdated: '2025-09-30' },
            { symbol: 'GPN', name: '全球支付 (Global Payments)', market: 'US', portfolioPercent: 3.06, lastUpdated: '2025-09-30' },
            { symbol: 'GOOGL', name: 'Alphabet (谷歌-A)', market: 'US', portfolioPercent: 2.28, lastUpdated: '2025-09-30' },
            { symbol: 'RSP', name: 'Invesco S&P 500 等权 ETF', market: 'US', portfolioPercent: 2.24, lastUpdated: '2025-09-30' },
            { symbol: 'TKO', name: 'TKO Group Holdings', market: 'US', portfolioPercent: 1.78, lastUpdated: '2025-09-30' },
            { symbol: 'FLUT', name: 'Flutter Entertainment', market: 'US', portfolioPercent: 1.77, lastUpdated: '2025-09-30' },
            { symbol: 'CRM', name: '赛富时 (Salesforce)', market: 'US', portfolioPercent: 1.57, lastUpdated: '2025-09-30' },
            { symbol: 'IBKR', name: '盈透证券 (Interactive Brokers)', market: 'US', portfolioPercent: 1.55, lastUpdated: '2025-09-30' },
            { symbol: 'NVDA', name: '英伟达 (NVIDIA)', market: 'US', portfolioPercent: 1.46, lastUpdated: '2025-09-30' },
            { symbol: 'AAPL', name: '苹果 (Apple)', market: 'US', portfolioPercent: 1.27, lastUpdated: '2025-09-30' },
            { symbol: 'ARMK', name: '爱玛客 (Aramark)', market: 'US', portfolioPercent: 1.24, lastUpdated: '2025-09-30' },
            { symbol: 'DIS', name: '迪士尼 (Disney)', market: 'US', portfolioPercent: 1.07, lastUpdated: '2025-09-30' },
            { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'US', portfolioPercent: 0.93, lastUpdated: '2025-09-30' },
        ],
    },
    {
        id: 'nancy-pelosi',
        name: 'Nancy Pelosi Trading',
        nameCn: '南希·佩洛西最新持仓 (Nancy Pelosi Trading)',
        description: '美国国会众议员南希·佩洛西及其丈夫的投资组合。该组合以精准押注科技股期权（LEAPS Call Options）闻名，风格激进。',
        author: 'Nancy Pelosi',
        authorCn: '南希·佩洛西 (Nancy Pelosi)',
        aum: '>$2.7亿美元 (预估净值)',
        category: 'politician',
        recentStrategy: '"落袋为安，但不想离场"（Stock Replacement Strategy）：大举卖出数千万美元科技股正股（如苹果、英伟达），同时买入远期看涨期权。这意味着：① 通过卖正股锁定巨额利润变现；② 用少量权利金继续享受未来上涨收益；③ 降低本金风险，以小博大。',
        recentMoves: '2025年底至2026年初，正从单纯持股转向更多利用深实值看涨期权做多 AI 巨头（如英伟达、谷歌），同时布局 AI 算力所需的电力能源板块（如 Vistra）。新建仓迪士尼期权，清仓 PayPal。整体风格从纯科技股多头转向"利润落袋+期权杠杆"的攻守兼备策略。',
        stocks: [
            { symbol: 'NVDA', name: '英伟达 (NVIDIA)', market: 'US', portfolioPercent: 25.0, lastUpdated: '2026-01-16' },
            { symbol: 'MSFT', name: '微软 (Microsoft)', market: 'US', portfolioPercent: 18.0, lastUpdated: '2025-07-30' },
            { symbol: 'AAPL', name: '苹果 (Apple)', market: 'US', portfolioPercent: 15.0, lastUpdated: '2025-12-30' },
            { symbol: 'GOOGL', name: 'Alphabet (谷歌-A)', market: 'US', portfolioPercent: 10.0, lastUpdated: '2026-01-14' },
            { symbol: 'AMZN', name: '亚马逊 (Amazon)', market: 'US', portfolioPercent: 8.0, lastUpdated: '2025-12-30' },
            { symbol: 'AVGO', name: '博通 (Broadcom)', market: 'US', portfolioPercent: 5.0, lastUpdated: '2025-07-09' },
            { symbol: 'PANW', name: '派拓网络 (Palo Alto Networks)', market: 'US', portfolioPercent: 4.0, lastUpdated: '2025-01-17' },
            { symbol: 'VST', name: '瑞致达 (Vistra Corp)', market: 'US', portfolioPercent: 3.0, lastUpdated: '2025-01-14' },
            { symbol: 'DIS', name: '迪士尼 (Disney)', market: 'US', portfolioPercent: 2.0, lastUpdated: '2025-12-30' },
            { symbol: 'TEM', name: 'Tempus AI', market: 'US', portfolioPercent: 1.0, lastUpdated: '2025-01-14' },
        ],
    },
];


