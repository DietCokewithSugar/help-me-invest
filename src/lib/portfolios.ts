// 投资组合分类
export type PortfolioCategory = 'legendary' | 'politician' | 'hedge_fund' | 'recommendation';

export const PORTFOLIO_CATEGORIES: Record<PortfolioCategory, { name: string; icon: string }> = {
    legendary: { name: '传奇投资人', icon: '🏆' },
    politician: { name: '政客持仓', icon: '🏛️' },
    hedge_fund: { name: '对冲基金', icon: '📈' },
    recommendation: { name: '投资建议', icon: '📋' },
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

// 生成星级显示
export function renderStars(rating: number): string {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
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
        nameCn: '巴菲特持仓',
        description: '伯克希尔·哈撒韦公司主要持仓，以价值投资著称。数据来源：13F 文件。',
        author: 'Warren Buffett',
        authorCn: '沃伦·巴菲特',
        aum: '$9000亿',
        category: 'legendary',
        stocks: [
            { symbol: 'AAPL', name: '苹果', market: 'US', shares: 300000000, portfolioPercent: 28.1, marketValue: 69200, lastUpdated: '2025-12-31' },
            { symbol: 'BAC', name: '美国银行', market: 'US', shares: 680000000, portfolioPercent: 11.8, marketValue: 29100, lastUpdated: '2025-12-31' },
            { symbol: 'AXP', name: '美国运通', market: 'US', shares: 151610700, portfolioPercent: 8.9, marketValue: 21800, lastUpdated: '2025-12-31' },
            { symbol: 'KO', name: '可口可乐', market: 'US', shares: 400000000, portfolioPercent: 7.1, marketValue: 17500, lastUpdated: '2025-12-31' },
            { symbol: 'CVX', name: '雪佛龙', market: 'US', shares: 118610534, portfolioPercent: 6.3, marketValue: 15500, lastUpdated: '2025-12-31' },
            { symbol: 'OXY', name: '西方石油', market: 'US', shares: 264200000, portfolioPercent: 5.2, marketValue: 12800, lastUpdated: '2025-12-31' },
            { symbol: 'KHC', name: '卡夫亨氏', market: 'US', shares: 325634818, portfolioPercent: 4.0, marketValue: 9800, lastUpdated: '2025-12-31' },
            { symbol: 'MCO', name: '穆迪', market: 'US', shares: 24669778, portfolioPercent: 3.6, marketValue: 8900, lastUpdated: '2025-12-31' },
            { symbol: 'CB', name: '安达保险', market: 'US', shares: 27033784, portfolioPercent: 2.8, marketValue: 6900, lastUpdated: '2025-12-31' },
            { symbol: 'DVA', name: 'DaVita', market: 'US', shares: 36095570, portfolioPercent: 2.1, marketValue: 5100, lastUpdated: '2025-12-31' },
            { symbol: 'KR', name: '克罗格', market: 'US', shares: 50000000, portfolioPercent: 1.2, marketValue: 2900, lastUpdated: '2025-12-31' },
            { symbol: 'VRSN', name: 'Verisign', market: 'US', shares: 12815613, portfolioPercent: 1.0, marketValue: 2500, lastUpdated: '2025-12-31' },
            { symbol: 'PARA', name: '派拉蒙', market: 'US', shares: 93730000, portfolioPercent: 0.8, marketValue: 2000, lastUpdated: '2025-12-31' },
            { symbol: 'ALLY', name: 'Ally Financial', market: 'US', shares: 29000000, portfolioPercent: 0.5, marketValue: 1200, lastUpdated: '2025-12-31' },
            { symbol: 'C', name: '花旗集团', market: 'US', shares: 14000000, portfolioPercent: 0.4, marketValue: 980, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'george-soros',
        name: 'Soros Fund',
        nameCn: '索罗斯基金',
        description: '索罗斯基金管理公司主要持仓，以宏观对冲策略闻名，曾做空英镑一战成名。',
        author: 'George Soros',
        authorCn: '乔治·索罗斯',
        aum: '$250亿',
        category: 'legendary',
        stocks: [
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 1200000, portfolioPercent: 8.5, marketValue: 205, lastUpdated: '2025-12-31' },
            { symbol: 'AMZN', name: '亚马逊', market: 'US', shares: 800000, portfolioPercent: 7.2, marketValue: 148, lastUpdated: '2025-12-31' },
            { symbol: 'NVDA', name: '英伟达', market: 'US', shares: 500000, portfolioPercent: 6.8, marketValue: 680, lastUpdated: '2025-12-31' },
            { symbol: 'META', name: 'Meta', market: 'US', shares: 400000, portfolioPercent: 5.5, marketValue: 240, lastUpdated: '2025-12-31' },
            { symbol: 'BABA', name: '阿里巴巴', market: 'US', shares: 1500000, portfolioPercent: 4.2, marketValue: 128, lastUpdated: '2025-12-31' },
            { symbol: 'TSM', name: '台积电', market: 'US', shares: 600000, portfolioPercent: 3.8, marketValue: 102, lastUpdated: '2025-12-31' },
            { symbol: 'UBER', name: 'Uber', market: 'US', shares: 2000000, portfolioPercent: 3.2, marketValue: 140, lastUpdated: '2025-12-31' },
            { symbol: 'CRM', name: 'Salesforce', market: 'US', shares: 300000, portfolioPercent: 2.5, marketValue: 90, lastUpdated: '2025-12-31' },
            { symbol: 'PYPL', name: 'PayPal', market: 'US', shares: 500000, portfolioPercent: 1.8, marketValue: 35, lastUpdated: '2025-12-31' },
            { symbol: 'SQ', name: 'Block', market: 'US', shares: 400000, portfolioPercent: 1.5, marketValue: 30, lastUpdated: '2025-12-31' },
            { symbol: 'SNOW', name: 'Snowflake', market: 'US', shares: 200000, portfolioPercent: 1.2, marketValue: 32, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'ray-dalio',
        name: 'Bridgewater',
        nameCn: '桥水基金',
        description: '桥水基金主要持仓，全球最大对冲基金之一，以全天候策略著称。',
        author: 'Ray Dalio',
        authorCn: '瑞·达里奥',
        aum: '$1500亿',
        category: 'legendary',
        stocks: [
            { symbol: 'SPY', name: '标普500 ETF', market: 'US', shares: 8500000, portfolioPercent: 12.3, marketValue: 4250, lastUpdated: '2025-12-31' },
            { symbol: 'VWO', name: '新兴市场 ETF', market: 'US', shares: 15000000, portfolioPercent: 8.7, marketValue: 615, lastUpdated: '2025-12-31' },
            { symbol: 'IEMG', name: '新兴市场核心 ETF', market: 'US', shares: 12000000, portfolioPercent: 7.2, marketValue: 660, lastUpdated: '2025-12-31' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 2100000, portfolioPercent: 6.5, marketValue: 358, lastUpdated: '2025-12-31' },
            { symbol: 'PG', name: '宝洁', market: 'US', shares: 3500000, portfolioPercent: 4.2, marketValue: 580, lastUpdated: '2025-12-31' },
            { symbol: 'JNJ', name: '强生', market: 'US', shares: 2800000, portfolioPercent: 3.8, marketValue: 435, lastUpdated: '2025-12-31' },
            { symbol: 'WMT', name: '沃尔玛', market: 'US', shares: 2200000, portfolioPercent: 3.1, marketValue: 380, lastUpdated: '2025-12-31' },
            { symbol: 'COST', name: 'Costco', market: 'US', shares: 800000, portfolioPercent: 2.5, marketValue: 580, lastUpdated: '2025-12-31' },
            { symbol: 'NVDA', name: '英伟达', market: 'US', shares: 300000, portfolioPercent: 2.2, marketValue: 402, lastUpdated: '2025-12-31' },
            { symbol: 'GLD', name: '黄金 ETF', market: 'US', shares: 1500000, portfolioPercent: 1.8, marketValue: 280, lastUpdated: '2025-12-31' },
            { symbol: 'MCD', name: '麦当劳', market: 'US', shares: 500000, portfolioPercent: 1.5, marketValue: 150, lastUpdated: '2025-12-31' },
            { symbol: 'KO', name: '可口可乐', market: 'US', shares: 1200000, portfolioPercent: 1.2, marketValue: 75, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'peter-lynch',
        name: 'Peter Lynch Style',
        nameCn: '彼得·林奇风格',
        description: '传奇基金经理彼得·林奇推崇的投资风格，曾创造29年年化29%的神话。',
        author: 'Peter Lynch',
        authorCn: '彼得·林奇',
        aum: '已退休',
        category: 'legendary',
        stocks: [
            { symbol: 'COST', name: 'Costco', market: 'US', portfolioPercent: 12.0, lastUpdated: '2026-01-15' },
            { symbol: 'HD', name: '家得宝', market: 'US', portfolioPercent: 10.0, lastUpdated: '2026-01-15' },
            { symbol: 'SBUX', name: '星巴克', market: 'US', portfolioPercent: 8.0, lastUpdated: '2026-01-15' },
            { symbol: 'NKE', name: '耐克', market: 'US', portfolioPercent: 7.0, lastUpdated: '2026-01-15' },
            { symbol: 'DIS', name: '迪士尼', market: 'US', portfolioPercent: 6.0, lastUpdated: '2026-01-15' },
            { symbol: 'TJX', name: 'TJX Companies', market: 'US', portfolioPercent: 4.5, lastUpdated: '2026-01-15' },
            { symbol: 'LULU', name: 'Lululemon', market: 'US', portfolioPercent: 4.0, lastUpdated: '2026-01-15' },
            { symbol: 'CMG', name: 'Chipotle', market: 'US', portfolioPercent: 3.5, lastUpdated: '2026-01-15' },
            { symbol: 'DECK', name: 'Deckers', market: 'US', portfolioPercent: 3.0, lastUpdated: '2026-01-15' },
            { symbol: 'ULTA', name: 'Ulta Beauty', market: 'US', portfolioPercent: 1.8, lastUpdated: '2026-01-15' },
            { symbol: 'ORLY', name: "O'Reilly Auto", market: 'US', portfolioPercent: 1.5, lastUpdated: '2026-01-15' },
            { symbol: 'DPZ', name: "Domino's Pizza", market: 'US', portfolioPercent: 1.2, lastUpdated: '2026-01-15' },
        ],
    },
    {
        id: 'charlie-munger',
        name: 'Munger Holdings',
        nameCn: '芒格持仓',
        description: '查理·芒格是巴菲特的黄金搭档，伯克希尔副董事长，以深度价值分析著称。',
        author: 'Charlie Munger',
        authorCn: '查理·芒格',
        aum: '$20亿',
        category: 'legendary',
        stocks: [
            { symbol: 'BABA', name: '阿里巴巴', market: 'US', shares: 302060, portfolioPercent: 19.8, marketValue: 25, lastUpdated: '2025-12-31' },
            { symbol: 'BAC', name: '美国银行', market: 'US', shares: 8297460, portfolioPercent: 15.2, marketValue: 290, lastUpdated: '2025-12-31' },
            { symbol: 'WFC', name: '富国银行', market: 'US', shares: 1000000, portfolioPercent: 12.5, marketValue: 50, lastUpdated: '2025-12-31' },
            { symbol: 'COST', name: 'Costco', market: 'US', shares: 245513, portfolioPercent: 8.9, marketValue: 180, lastUpdated: '2025-12-31' },
            { symbol: 'AAPL', name: '苹果', market: 'US', shares: 500000, portfolioPercent: 6.8, marketValue: 115, lastUpdated: '2025-12-31' },
            { symbol: 'USB', name: '美国合众银行', market: 'US', shares: 4000000, portfolioPercent: 4.5, marketValue: 160, lastUpdated: '2025-12-31' },
            { symbol: 'BRK.B', name: '伯克希尔B', market: 'US', shares: 200000, portfolioPercent: 3.2, marketValue: 80, lastUpdated: '2025-12-31' },
            { symbol: 'ATVI', name: '动视暴雪', market: 'US', shares: 800000, portfolioPercent: 2.1, marketValue: 60, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'bill-ackman',
        name: 'Pershing Square',
        nameCn: '阿克曼持仓',
        description: 'Pershing Square 创始人，激进派投资者代表，以高调做空和大手笔投资闻名。',
        author: 'Bill Ackman',
        authorCn: '比尔·阿克曼',
        aum: '$120亿',
        category: 'legendary',
        stocks: [
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 7800000, portfolioPercent: 22.5, marketValue: 1170, lastUpdated: '2025-12-31' },
            { symbol: 'HLT', name: '希尔顿', market: 'US', shares: 9750000, portfolioPercent: 18.2, marketValue: 1950, lastUpdated: '2025-12-31' },
            { symbol: 'CMG', name: 'Chipotle', market: 'US', shares: 2100000, portfolioPercent: 15.8, marketValue: 4000, lastUpdated: '2025-12-31' },
            { symbol: 'QSR', name: '餐饮品牌国际', market: 'US', shares: 23800000, portfolioPercent: 12.3, marketValue: 1680, lastUpdated: '2025-12-31' },
            { symbol: 'HHH', name: 'Howard Hughes', market: 'US', shares: 26000000, portfolioPercent: 8.5, marketValue: 2080, lastUpdated: '2025-12-31' },
            { symbol: 'NFLX', name: '奈飞', market: 'US', shares: 700000, portfolioPercent: 4.2, marketValue: 560, lastUpdated: '2025-12-31' },
            { symbol: 'UBER', name: 'Uber', market: 'US', shares: 3500000, portfolioPercent: 2.8, marketValue: 210, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'carl-icahn',
        name: 'Icahn Enterprises',
        nameCn: '伊坎持仓',
        description: '华尔街最著名的激进投资者，企业狙击手，以推动公司变革获利为主。',
        author: 'Carl Icahn',
        authorCn: '卡尔·伊坎',
        aum: '$180亿',
        category: 'legendary',
        stocks: [
            { symbol: 'IEP', name: 'Icahn Enterprises', market: 'US', shares: 350000000, portfolioPercent: 45.0, marketValue: 5250, lastUpdated: '2025-12-31' },
            { symbol: 'CVE', name: 'Cenovus Energy', market: 'US', shares: 120000000, portfolioPercent: 18.5, marketValue: 2160, lastUpdated: '2025-12-31' },
            { symbol: 'CVI', name: 'CVR Energy', market: 'US', shares: 71000000, portfolioPercent: 12.2, marketValue: 1988, lastUpdated: '2025-12-31' },
            { symbol: 'SWX', name: 'Southwest Gas', market: 'US', shares: 5500000, portfolioPercent: 5.8, marketValue: 385, lastUpdated: '2025-12-31' },
            { symbol: 'XRX', name: '施乐', market: 'US', shares: 8000000, portfolioPercent: 3.2, marketValue: 120, lastUpdated: '2025-12-31' },
            { symbol: 'OXY', name: '西方石油', market: 'US', shares: 2000000, portfolioPercent: 2.5, marketValue: 112, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'seth-klarman',
        name: 'Baupost Group',
        nameCn: '克拉曼持仓',
        description: 'Baupost Group 创始人，被誉为"在世最伟大价值投资者"，以极度谨慎著称。',
        author: 'Seth Klarman',
        authorCn: '塞斯·克拉曼',
        aum: '$270亿',
        category: 'legendary',
        stocks: [
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 2850000, portfolioPercent: 9.8, marketValue: 485, lastUpdated: '2025-12-31' },
            { symbol: 'META', name: 'Meta', market: 'US', shares: 1200000, portfolioPercent: 8.5, marketValue: 672, lastUpdated: '2025-12-31' },
            { symbol: 'INTC', name: '英特尔', market: 'US', shares: 25000000, portfolioPercent: 7.2, marketValue: 475, lastUpdated: '2025-12-31' },
            { symbol: 'LNG', name: 'Cheniere Energy', market: 'US', shares: 3200000, portfolioPercent: 6.5, marketValue: 576, lastUpdated: '2025-12-31' },
            { symbol: 'QRVO', name: 'Qorvo', market: 'US', shares: 3800000, portfolioPercent: 4.8, marketValue: 380, lastUpdated: '2025-12-31' },
            { symbol: 'LBTYA', name: 'Liberty Global', market: 'US', shares: 12000000, portfolioPercent: 3.9, marketValue: 240, lastUpdated: '2025-12-31' },
            { symbol: 'EBAY', name: 'eBay', market: 'US', shares: 4500000, portfolioPercent: 2.8, marketValue: 270, lastUpdated: '2025-12-31' },
            { symbol: 'WBD', name: 'Warner Bros', market: 'US', shares: 18000000, portfolioPercent: 1.5, marketValue: 162, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'david-tepper',
        name: 'Appaloosa',
        nameCn: '泰珀持仓',
        description: 'Appaloosa Management 创始人，以在市场恐慌时大胆抄底著称，年均回报率超25%。',
        author: 'David Tepper',
        authorCn: '大卫·泰珀',
        aum: '$200亿',
        category: 'legendary',
        stocks: [
            { symbol: 'NVDA', name: '英伟达', market: 'US', shares: 3100000, portfolioPercent: 14.5, marketValue: 4030, lastUpdated: '2025-12-31' },
            { symbol: 'META', name: 'Meta', market: 'US', shares: 1800000, portfolioPercent: 11.2, marketValue: 1008, lastUpdated: '2025-12-31' },
            { symbol: 'MSFT', name: '微软', market: 'US', shares: 1200000, portfolioPercent: 8.8, marketValue: 504, lastUpdated: '2025-12-31' },
            { symbol: 'AMZN', name: '亚马逊', market: 'US', shares: 2500000, portfolioPercent: 7.5, marketValue: 463, lastUpdated: '2025-12-31' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 1800000, portfolioPercent: 5.8, marketValue: 306, lastUpdated: '2025-12-31' },
            { symbol: 'BABA', name: '阿里巴巴', market: 'US', shares: 3500000, portfolioPercent: 4.2, marketValue: 297, lastUpdated: '2025-12-31' },
            { symbol: 'AMD', name: 'AMD', market: 'US', shares: 2200000, portfolioPercent: 3.5, marketValue: 330, lastUpdated: '2025-12-31' },
            { symbol: 'UBER', name: 'Uber', market: 'US', shares: 3000000, portfolioPercent: 2.8, marketValue: 180, lastUpdated: '2025-12-31' },
            { symbol: 'PDD', name: '拼多多', market: 'US', shares: 800000, portfolioPercent: 1.8, marketValue: 104, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'stanley-druckenmiller',
        name: 'Duquesne Family Office',
        nameCn: '德鲁肯米勒',
        description: '曾与索罗斯共同做空英镑，被誉为"最伟大的对冲基金经理"之一。',
        author: 'Stanley Druckenmiller',
        authorCn: '斯坦利·德鲁肯米勒',
        aum: '$30亿',
        category: 'legendary',
        stocks: [
            { symbol: 'NVDA', name: '英伟达', market: 'US', shares: 540000, portfolioPercent: 10.5, marketValue: 702, lastUpdated: '2025-12-31' },
            { symbol: 'MSFT', name: '微软', market: 'US', shares: 1100000, portfolioPercent: 9.2, marketValue: 462, lastUpdated: '2025-12-31' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 800000, portfolioPercent: 7.8, marketValue: 136, lastUpdated: '2025-12-31' },
            { symbol: 'AAPL', name: '苹果', market: 'US', shares: 950000, portfolioPercent: 6.5, marketValue: 219, lastUpdated: '2025-12-31' },
            { symbol: 'AMZN', name: '亚马逊', market: 'US', shares: 600000, portfolioPercent: 5.8, marketValue: 111, lastUpdated: '2025-12-31' },
            { symbol: 'META', name: 'Meta', market: 'US', shares: 400000, portfolioPercent: 4.2, marketValue: 224, lastUpdated: '2025-12-31' },
            { symbol: 'TSM', name: '台积电', market: 'US', shares: 350000, portfolioPercent: 3.5, marketValue: 60, lastUpdated: '2025-12-31' },
            { symbol: 'TSLA', name: '特斯拉', market: 'US', shares: 200000, portfolioPercent: 2.8, marketValue: 50, lastUpdated: '2025-12-31' },
            { symbol: 'BABA', name: '阿里巴巴', market: 'US', shares: 500000, portfolioPercent: 1.8, marketValue: 43, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'nancy-pelosi',
        name: 'Pelosi Family',
        nameCn: '佩洛西家族',
        description: '美国众议院前议长佩洛西家族投资动态，因精准的科技股入场时机备受市场关注。',
        author: 'Nancy Pelosi',
        authorCn: '南希·佩洛西',
        aum: '$1.14亿',
        category: 'politician',
        stocks: [
            { symbol: 'NVDA', name: '英伟达', market: 'US', shares: 20000, portfolioPercent: 22.5, marketValue: 2400, lastUpdated: '2025-12-31' },
            { symbol: 'AAPL', name: '苹果', market: 'US', shares: 50000, portfolioPercent: 18.2, marketValue: 11500, lastUpdated: '2025-12-31' },
            { symbol: 'MSFT', name: '微软', market: 'US', shares: 25000, portfolioPercent: 15.8, marketValue: 10500, lastUpdated: '2025-12-31' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 30000, portfolioPercent: 12.3, marketValue: 5100, lastUpdated: '2025-12-31' },
            { symbol: 'PANW', name: '帕洛阿尔托网络', market: 'US', shares: 10000, portfolioPercent: 8.5, marketValue: 3200, lastUpdated: '2025-12-31' },
            { symbol: 'CRM', name: 'Salesforce', market: 'US', shares: 15000, portfolioPercent: 4.2, marketValue: 4050, lastUpdated: '2025-12-31' },
            { symbol: 'TSLA', name: '特斯拉', market: 'US', shares: 5000, portfolioPercent: 3.5, marketValue: 1250, lastUpdated: '2025-12-31' },
            { symbol: 'AMZN', name: '亚马逊', market: 'US', shares: 3000, portfolioPercent: 2.8, marketValue: 555, lastUpdated: '2025-12-31' },
            { symbol: 'RBLX', name: 'Roblox', market: 'US', shares: 10000, portfolioPercent: 1.5, marketValue: 500, lastUpdated: '2025-12-31' },
            { symbol: 'DIS', name: '迪士尼', market: 'US', shares: 5000, portfolioPercent: 1.2, marketValue: 460, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'mark-green',
        name: 'Mark Green',
        nameCn: '马克·格林',
        description: '美国众议员马克·格林投资披露，重仓国防和科技领域。',
        author: 'Mark Green',
        authorCn: '马克·格林',
        aum: '$500万+',
        category: 'politician',
        stocks: [
            { symbol: 'LMT', name: '洛克希德·马丁', market: 'US', portfolioPercent: 18.0, lastUpdated: '2025-12-31' },
            { symbol: 'RTX', name: '雷神技术', market: 'US', portfolioPercent: 15.0, lastUpdated: '2025-12-31' },
            { symbol: 'NOC', name: '诺斯罗普·格鲁曼', market: 'US', portfolioPercent: 12.0, lastUpdated: '2025-12-31' },
            { symbol: 'GD', name: '通用动力', market: 'US', portfolioPercent: 10.0, lastUpdated: '2025-12-31' },
            { symbol: 'BA', name: '波音', market: 'US', portfolioPercent: 8.0, lastUpdated: '2025-12-31' },
            { symbol: 'LHX', name: 'L3Harris', market: 'US', portfolioPercent: 4.5, lastUpdated: '2025-12-31' },
            { symbol: 'HII', name: '亨廷顿英格尔斯', market: 'US', portfolioPercent: 3.5, lastUpdated: '2025-12-31' },
            { symbol: 'LDOS', name: 'Leidos', market: 'US', portfolioPercent: 2.8, lastUpdated: '2025-12-31' },
            { symbol: 'PLTR', name: 'Palantir', market: 'US', portfolioPercent: 1.8, lastUpdated: '2025-12-31' },
            { symbol: 'IONQ', name: 'IonQ', market: 'US', portfolioPercent: 1.0, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'trump-family',
        name: 'Trump Organization',
        nameCn: '特朗普家族',
        description: '美国第45/47任总统唐纳德·特朗普家族，以房地产起家，投资风格偏向传统行业和媒体。',
        author: 'Donald Trump',
        authorCn: '唐纳德·特朗普',
        aum: '$60亿+',
        category: 'politician',
        stocks: [
            { symbol: 'DJT', name: 'Trump Media', market: 'US', shares: 114750000, portfolioPercent: 58.0, marketValue: 4000, lastUpdated: '2025-12-31' },
            { symbol: 'DWAC', name: 'Digital World', market: 'US', shares: 10000000, portfolioPercent: 12.0, lastUpdated: '2025-12-31' },
            { symbol: 'XOM', name: '埃克森美孚', market: 'US', portfolioPercent: 5.5, lastUpdated: '2025-12-31' },
            { symbol: 'CVX', name: '雪佛龙', market: 'US', portfolioPercent: 4.2, lastUpdated: '2025-12-31' },
            { symbol: 'GS', name: '高盛', market: 'US', portfolioPercent: 3.8, lastUpdated: '2025-12-31' },
            { symbol: 'JPM', name: '摩根大通', market: 'US', portfolioPercent: 3.5, lastUpdated: '2025-12-31' },
            { symbol: 'AAPL', name: '苹果', market: 'US', portfolioPercent: 2.8, lastUpdated: '2025-12-31' },
            { symbol: 'BRK.B', name: '伯克希尔B', market: 'US', portfolioPercent: 2.2, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'dan-crenshaw',
        name: 'Dan Crenshaw',
        nameCn: '丹·克伦肖',
        description: '美国众议员、前海豹突击队员，根据STOCK法案公开披露的交易记录。',
        author: 'Dan Crenshaw',
        authorCn: '丹·克伦肖',
        aum: '$100万+',
        category: 'politician',
        stocks: [
            { symbol: 'MSFT', name: '微软', market: 'US', portfolioPercent: 18.5, lastUpdated: '2025-12-31' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US', portfolioPercent: 15.2, lastUpdated: '2025-12-31' },
            { symbol: 'META', name: 'Meta', market: 'US', portfolioPercent: 12.8, lastUpdated: '2025-12-31' },
            { symbol: 'AAPL', name: '苹果', market: 'US', portfolioPercent: 10.5, lastUpdated: '2025-12-31' },
            { symbol: 'AMZN', name: '亚马逊', market: 'US', portfolioPercent: 8.2, lastUpdated: '2025-12-31' },
            { symbol: 'LMT', name: '洛克希德·马丁', market: 'US', portfolioPercent: 6.5, lastUpdated: '2025-12-31' },
            { symbol: 'RTX', name: '雷神技术', market: 'US', portfolioPercent: 5.0, lastUpdated: '2025-12-31' },
            { symbol: 'NVDA', name: '英伟达', market: 'US', portfolioPercent: 4.2, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'ark-invest',
        name: 'ARK Invest',
        nameCn: 'ARK 木头姐',
        description: 'ARK Invest 旗舰 ETF (ARKK) 持仓，专注于颠覆性创新。每日更新持仓。',
        author: 'Cathie Wood',
        authorCn: '凯西·伍德 (木头姐)',
        aum: '$140亿',
        category: 'hedge_fund',
        stocks: [
            { symbol: 'TSLA', name: '特斯拉', market: 'US', shares: 3500000, portfolioPercent: 11.2, marketValue: 875, lastUpdated: '2026-01-22' },
            { symbol: 'COIN', name: 'Coinbase', market: 'US', shares: 4200000, portfolioPercent: 8.5, marketValue: 1050, lastUpdated: '2026-01-22' },
            { symbol: 'ROKU', name: 'Roku', market: 'US', shares: 5800000, portfolioPercent: 7.8, marketValue: 450, lastUpdated: '2026-01-22' },
            { symbol: 'SQ', name: 'Block', market: 'US', shares: 6100000, portfolioPercent: 6.9, marketValue: 490, lastUpdated: '2026-01-22' },
            { symbol: 'PATH', name: 'UiPath', market: 'US', shares: 12000000, portfolioPercent: 5.2, marketValue: 168, lastUpdated: '2026-01-22' },
            { symbol: 'CRSP', name: 'CRISPR', market: 'US', shares: 3200000, portfolioPercent: 4.8, marketValue: 224, lastUpdated: '2026-01-22' },
            { symbol: 'EXAS', name: 'Exact Sciences', market: 'US', shares: 2500000, portfolioPercent: 3.9, marketValue: 175, lastUpdated: '2026-01-22' },
            { symbol: 'SHOP', name: 'Shopify', market: 'US', shares: 1800000, portfolioPercent: 3.5, marketValue: 180, lastUpdated: '2026-01-22' },
            { symbol: 'DKNG', name: 'DraftKings', market: 'US', shares: 4000000, portfolioPercent: 2.8, marketValue: 140, lastUpdated: '2026-01-22' },
            { symbol: 'U', name: 'Unity Software', market: 'US', shares: 3500000, portfolioPercent: 2.2, marketValue: 105, lastUpdated: '2026-01-22' },
            { symbol: 'TWLO', name: 'Twilio', market: 'US', shares: 1200000, portfolioPercent: 1.8, marketValue: 84, lastUpdated: '2026-01-22' },
            { symbol: 'ZM', name: 'Zoom', market: 'US', shares: 1500000, portfolioPercent: 1.5, marketValue: 105, lastUpdated: '2026-01-22' },
            { symbol: 'BEAM', name: 'Beam Therapeutics', market: 'US', shares: 2000000, portfolioPercent: 1.2, marketValue: 60, lastUpdated: '2026-01-22' },
        ],
    },
    {
        id: 'citadel',
        name: 'Citadel',
        nameCn: 'Citadel 城堡',
        description: 'Citadel 是全球最大对冲基金之一，采用多策略投资方法。',
        author: 'Ken Griffin',
        authorCn: '肯·格里芬',
        aum: '$620亿',
        category: 'hedge_fund',
        stocks: [
            { symbol: 'NVDA', name: '英伟达', market: 'US', shares: 8500000, portfolioPercent: 5.2, marketValue: 10200, lastUpdated: '2025-12-31' },
            { symbol: 'META', name: 'Meta', market: 'US', shares: 4200000, portfolioPercent: 4.1, marketValue: 2520, lastUpdated: '2025-12-31' },
            { symbol: 'MSFT', name: '微软', market: 'US', shares: 3100000, portfolioPercent: 3.8, marketValue: 1302, lastUpdated: '2025-12-31' },
            { symbol: 'AMZN', name: '亚马逊', market: 'US', shares: 2800000, portfolioPercent: 3.5, marketValue: 518, lastUpdated: '2025-12-31' },
            { symbol: 'AAPL', name: '苹果', market: 'US', shares: 5100000, portfolioPercent: 3.2, marketValue: 1173, lastUpdated: '2025-12-31' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US', shares: 2000000, portfolioPercent: 2.8, marketValue: 340, lastUpdated: '2025-12-31' },
            { symbol: 'TSLA', name: '特斯拉', market: 'US', shares: 1500000, portfolioPercent: 2.2, marketValue: 375, lastUpdated: '2025-12-31' },
            { symbol: 'AMD', name: 'AMD', market: 'US', shares: 2500000, portfolioPercent: 1.8, marketValue: 375, lastUpdated: '2025-12-31' },
            { symbol: 'JPM', name: '摩根大通', market: 'US', shares: 1200000, portfolioPercent: 1.5, marketValue: 240, lastUpdated: '2025-12-31' },
            { symbol: 'V', name: 'Visa', market: 'US', shares: 800000, portfolioPercent: 1.2, marketValue: 216, lastUpdated: '2025-12-31' },
            { symbol: 'MA', name: '万事达', market: 'US', shares: 500000, portfolioPercent: 0.9, marketValue: 235, lastUpdated: '2025-12-31' },
        ],
    },
    {
        id: 'seeking-alpha-top-10',
        name: 'Seeking Alpha 2026',
        nameCn: 'Seeking Alpha 2026',
        description: 'Seeking Alpha 分析师社区推荐的 2026 年高增长潜力股票精选。',
        author: 'Seeking Alpha',
        authorCn: 'Seeking Alpha',
        aum: '投资建议',
        category: 'recommendation',
        stocks: [
            { symbol: 'NVDA', name: '英伟达', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'AMZN', name: '亚马逊', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'META', name: 'Meta', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'TSLA', name: '特斯拉', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'AMD', name: 'AMD', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'PLTR', name: 'Palantir', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'CRM', name: 'Salesforce', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'NOW', name: 'ServiceNow', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: 'SNOW', name: 'Snowflake', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: 'DDOG', name: 'Datadog', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: 'NET', name: 'Cloudflare', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
        ],
    },
    {
        id: 'motley-fool',
        name: 'Motley Fool Picks',
        nameCn: 'Motley Fool 推荐',
        description: 'The Motley Fool 股票顾问服务长期推荐的核心持仓。',
        author: 'Motley Fool',
        authorCn: 'Motley Fool',
        aum: '投资建议',
        category: 'recommendation',
        stocks: [
            { symbol: 'SHOP', name: 'Shopify', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'TTD', name: 'The Trade Desk', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'DDOG', name: 'Datadog', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'AXON', name: 'Axon Enterprise', market: 'US', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: 'NET', name: 'Cloudflare', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'MELI', name: 'MercadoLibre', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'CRWD', name: 'CrowdStrike', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'ZS', name: 'Zscaler', market: 'US', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: 'OKTA', name: 'Okta', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: 'MDB', name: 'MongoDB', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: 'HUBS', name: 'HubSpot', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: 'BILL', name: 'Bill.com', market: 'US', rating: 3, lastUpdated: '2026-01-20' },
        ],
    },
    {
        id: 'china-core-assets',
        name: 'China Core Assets',
        nameCn: '中国核心资产',
        description: '中国 A 股及港股市场的蓝筹核心资产，代表中国经济的核心竞争力。',
        author: 'Research Team',
        authorCn: '智投研究',
        aum: '投资建议',
        category: 'recommendation',
        stocks: [
            { symbol: '600519.SS', name: '贵州茅台', market: 'CN', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: '0700.HK', name: '腾讯控股', market: 'HK', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: '300750.SZ', name: '宁德时代', market: 'CN', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: '9988.HK', name: '阿里巴巴', market: 'HK', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: '000858.SZ', name: '五粮液', market: 'CN', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: '601318.SS', name: '中国平安', market: 'CN', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: '600036.SS', name: '招商银行', market: 'CN', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: '3690.HK', name: '美团', market: 'HK', rating: 4, lastUpdated: '2026-01-20' },
            { symbol: '000333.SZ', name: '美的集团', market: 'CN', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: '002594.SZ', name: '比亚迪', market: 'CN', rating: 5, lastUpdated: '2026-01-20' },
            { symbol: '600900.SS', name: '长江电力', market: 'CN', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: '601899.SS', name: '紫金矿业', market: 'CN', rating: 3, lastUpdated: '2026-01-20' },
            { symbol: '688981.SS', name: '中芯国际', market: 'CN', rating: 4, lastUpdated: '2026-01-20' },
        ],
    },
];
