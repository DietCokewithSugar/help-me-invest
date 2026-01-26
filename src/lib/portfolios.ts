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
    market: 'US' | 'CN' | 'HK' | 'JP';
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
}

export const PORTFOLIOS: Portfolio[] = [
    {
        id: 'warren-buffett',
        name: 'Buffett Holdings',
        nameCn: '巴菲特最新持仓 (Berkshire Hathaway)',
        description: '伯克希尔·哈撒韦 (Berkshire Hathaway) 季度 13F 报告披露的美股持仓。该组合以长期价值投资著称，偏好具有护城河的消费、金融和能源类龙头企业。最新季度主要动向包括建仓/增持 Alphabet (谷歌) 和达美乐披萨，同时继续减持苹果和美国银行。',
        author: 'Warren Buffett',
        authorCn: '沃伦·巴菲特 (Warren Buffett)',
        aum: '$2673亿美元 (权益资产)',
        category: 'legendary',
        stocks: [
            { symbol: 'AAPL', name: '苹果 (Apple)', market: 'US', portfolioPercent: 22.7, lastUpdated: '2025-09-30' },
            { symbol: 'AXP', name: '美国运通 (American Express)', market: 'US', portfolioPercent: 18.8, lastUpdated: '2025-09-30' },
            { symbol: 'BAC', name: '美国银行 (Bank of America)', market: 'US', portfolioPercent: 11.0, lastUpdated: '2025-09-30' },
            { symbol: 'KO', name: '可口可乐 (Coca-Cola)', market: 'US', portfolioPercent: 9.9, lastUpdated: '2025-09-30' },
            { symbol: 'CVX', name: '雪佛论 (Chevron)', market: 'US', portfolioPercent: 7.1, lastUpdated: '2025-09-30' },
            { symbol: 'OXY', name: '西方石油 (Occidental Petroleum)', market: 'US', portfolioPercent: 4.7, lastUpdated: '2025-09-30' },
            { symbol: 'MCO', name: '穆迪 (Moody\'s)', market: 'US', portfolioPercent: 4.4, lastUpdated: '2025-09-30' },
            { symbol: 'CB', name: '安达保险 (Chubb Ltd)', market: 'US', portfolioPercent: 3.3, lastUpdated: '2025-09-30' },
            { symbol: 'KHC', name: '卡夫亨氏 (Kraft Heinz)', market: 'US', portfolioPercent: 3.2, lastUpdated: '2025-09-30' },
            { symbol: 'GOOGL', name: 'Alphabet (谷歌-A)', market: 'US', portfolioPercent: 1.6, lastUpdated: '2025-09-30' },
            { symbol: 'DVA', name: '达维塔保健 (DaVita)', market: 'US', portfolioPercent: 1.6, lastUpdated: '2025-09-30' },
            { symbol: 'KR', name: '克罗格 (Kroger)', market: 'US', portfolioPercent: 1.3, lastUpdated: '2025-09-30' },
            { symbol: 'SIRI', name: 'Sirius XM Holdings', market: 'US', portfolioPercent: 1.1, lastUpdated: '2025-09-30' },
            { symbol: 'V', name: '威士 (Visa)', market: 'US', portfolioPercent: 1.1, lastUpdated: '2025-09-30' },
            { symbol: 'VRSN', name: '威瑞信 (VeriSign)', market: 'US', portfolioPercent: 0.9, lastUpdated: '2025-09-30' },
            { symbol: 'MA', name: '万事达 (Mastercard)', market: 'US', portfolioPercent: 0.9, lastUpdated: '2025-09-30' },
            { symbol: 'AMZN', name: '亚马逊 (Amazon)', market: 'US', portfolioPercent: 0.8, lastUpdated: '2025-09-30' },
            { symbol: 'STZ', name: '星座品牌 (Constellation Brands)', market: 'US', portfolioPercent: 0.7, lastUpdated: '2025-09-30' },
            { symbol: 'UNH', name: '联合健康 (UnitedHealth)', market: 'US', portfolioPercent: 0.6, lastUpdated: '2025-09-30' },
            { symbol: 'DPZ', name: '达美乐披萨 (Domino\'s Pizza)', market: 'US', portfolioPercent: 0.5, lastUpdated: '2025-09-30' },
            { symbol: 'POOL', name: '普尔公司 (Pool Corp)', market: 'US', portfolioPercent: 0.4, lastUpdated: '2025-09-30' },
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
];


