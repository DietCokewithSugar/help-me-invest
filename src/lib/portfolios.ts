export interface TrackedCompany {
    symbol: string;
    name: string;
    market: 'US' | 'CN' | 'HK' | 'JP';
}

export interface Portfolio {
    id: string;
    name: string;
    description: string;
    author: string;
    stocks: TrackedCompany[];
}

export const PORTFOLIOS: Portfolio[] = [
    {
        id: 'warren-buffett',
        name: '巴菲特持仓',
        description: '伯克希尔·哈撒韦公司 (Berkshire Hathaway) 的主要持仓，以价值投资著称。',
        author: 'Warren Buffett',
        stocks: [
            { symbol: 'AAPL', name: '苹果', market: 'US' },
            { symbol: 'BAC', name: '美国银行', market: 'US' },
            { symbol: 'AXP', name: '美国运通', market: 'US' },
            { symbol: 'KO', name: '可口可乐', market: 'US' },
            { symbol: 'CVX', name: '雪佛龙', market: 'US' },
        ],
    },
    {
        id: 'nancy-pelosi',
        name: '佩洛西家族持仓',
        description: '美国国会议员佩洛西家族的投资动态，因其精准的科技股入场时机而备受关注。',
        author: 'Nancy Pelosi',
        stocks: [
            { symbol: 'NVDA', name: '英伟达', market: 'US' },
            { symbol: 'AAPL', name: '苹果', market: 'US' },
            { symbol: 'MSFT', name: '微软', market: 'US' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US' },
            { symbol: 'PANW', name: '帕洛阿尔托网络', market: 'US' },
        ],
    },
    {
        id: 'seeking-alpha-top-10',
        name: 'Seeking Alpha 2024 推荐',
        description: 'Seeking Alpha 每年推荐的十大最具增长潜力的股票。',
        author: 'Seeking Alpha',
        stocks: [
            { symbol: 'AMZN', name: '亚马逊', market: 'US' },
            { symbol: 'GOOGL', name: '谷歌', market: 'US' },
            { symbol: 'META', name: 'Meta', market: 'US' },
            { symbol: 'TSLA', name: '特斯拉', market: 'US' },
            { symbol: 'AMD', name: '超威半导体', market: 'US' },
        ],
    },
    {
        id: 'china-core-assets',
        name: '中国核心资产',
        description: '中国 A 股及港股市场的蓝筹核心资产。',
        author: '智投研究',
        stocks: [
            { symbol: '600519.SS', name: '贵州茅台', market: 'CN' },
            { symbol: '0700.HK', name: '腾讯控股', market: 'HK' },
            { symbol: '9988.HK', name: '阿里巴巴', market: 'HK' },
            { symbol: '000858.SZ', name: '五粮液', market: 'CN' },
            { symbol: '300750.SZ', name: '宁德时代', market: 'CN' },
        ],
    },
];
