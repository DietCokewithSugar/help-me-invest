'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import {
    TrendingUpIcon,
    ArrowRightIcon,
    LogoIcon,
    SunIcon,
    MoonIcon,
    FilterIcon,
} from '@/components/Icons';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import {
    ChevronLeft as ChevronLeftIcon,
    LayoutGrid as LayoutGridIcon,
    List as ListIcon,
    ArrowUp as ArrowUpIcon,
    ArrowDown as ArrowDownIcon,
    ExternalLink as ExternalLinkIcon,
    ChevronDown as ChevronDownIcon,
    ChevronRight as ChevronRightIcon,
    Calendar as CalendarIcon,
    PieChart as PieChartIcon,
    Users as UsersIcon,
    AlertTriangle as AlertTriangleIcon,
    Coins as CoinsIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReportModal from '@/components/ReportModal';
import CompanyOverviewModal from '@/components/CompanyOverviewModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { withLocale } from '@/lib/locale-path';
import type { CompanyDiagnostic } from '@/types';
import {
    PORTFOLIOS,
    PORTFOLIO_CATEGORIES,
    POSITION_SIZE_CONFIG,
    Portfolio,
    PortfolioCategory,
    PositionSize,
    getPositionSize,
    TrackedCompany,
    renderStars,
    getSharedHolders
} from '@/lib/portfolios';

// 按分类分组投资组合
const groupedPortfolios = (Object.keys(PORTFOLIO_CATEGORIES) as PortfolioCategory[]).map(category => ({
    category,
    ...PORTFOLIO_CATEGORIES[category],
    portfolios: PORTFOLIOS.filter(p => p.category === category)
})).filter(group => group.portfolios.length > 0);

// 格式化数字（百万）
function formatMillions(value: number | undefined): string {
    if (!value) return '-';
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}B`;
    }
    return `$${value.toFixed(0)}M`;
}

// 格式化持股数量
function formatShares(shares: number | undefined): string {
    if (!shares) return '-';
    if (shares >= 1000000000) {
        return `${(shares / 1000000000).toFixed(2)}B`;
    }
    if (shares >= 1000000) {
        return `${(shares / 1000000).toFixed(1)}M`;
    }
    if (shares >= 1000) {
        return `${(shares / 1000).toFixed(0)}K`;
    }
    return shares.toLocaleString();
}

// 按仓位大小分组股票
function groupStocksBySize(stocks: TrackedCompany[]): Record<PositionSize, TrackedCompany[]> {
    const groups: Record<PositionSize, TrackedCompany[]> = {
        large: [],
        medium: [],
        small: []
    };

    stocks.forEach(stock => {
        const size = getPositionSize(stock.portfolioPercent);
        groups[size].push(stock);
    });

    // 每组内按占比排序
    Object.keys(groups).forEach(key => {
        groups[key as PositionSize].sort((a, b) =>
            (b.portfolioPercent || 0) - (a.portfolioPercent || 0)
        );
    });

    return groups;
}

// 迷你趋势图组件 (Sparkline) - 显示最近一个月趋势
function StockSparkline({ data, showLabel = true }: { data: any[], showLabel?: boolean }) {
    // 如果没有数据，显示占位符
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center">
                <div className="h-10 w-24 bg-white/5 rounded flex items-center justify-center text-mist-600 text-[8px]">暂无趋势</div>
                {showLabel && <span className="text-[8px] text-mist-600 mt-0.5">1M</span>}
            </div>
        );
    }

    // 提取价格数据，过滤掉无效值
    const prices = data.map(d => d?.close).filter(p => p !== undefined && p !== null).reverse();

    // 如果价格数据不足，显示占位符
    if (prices.length < 2) {
        return (
            <div className="flex flex-col items-center">
                <div className="h-10 w-24 bg-white/5 rounded flex items-center justify-center text-mist-600 text-[8px]">数据不足</div>
                {showLabel && <span className="text-[8px] text-mist-600 mt-0.5">1M</span>}
            </div>
        );
    }

    // 计算一个月内的趋势：对比首尾价格
    const firstPrice = prices[0] || 0;
    const lastPrice = prices[prices.length - 1] || 0;
    const changePercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    const isUpward = changePercent > 0;

    // 中国股市惯例：涨为红色，跌为绿色
    const trendColor = isUpward ? '#ef4444' : '#10b981';

    const option = {
        grid: { left: 0, right: 0, top: 2, bottom: 2 },
        xAxis: { type: 'category', show: false },
        yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
        series: [
            {
                data: prices,
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { color: trendColor, width: 1.5 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: trendColor + '44' },
                            { offset: 1, color: trendColor + '00' }
                        ]
                    }
                }
            }
        ]
    };

    return (
        <div className="flex flex-col items-center">
            <ReactECharts option={option} style={{ height: '50px', width: '120px' }} />
            {showLabel && <span className="text-[8px] text-mist-600 mt-0.5">1M</span>}
        </div>
    );
}

// 计算一个月涨跌幅
function calcMonthlyChange(historyData: any[]): number {
    if (!historyData || historyData.length < 2) return 0;
    const prices = historyData.map(d => d?.close).filter(p => p !== undefined && p !== null).reverse();
    if (prices.length < 2) return 0;
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    return firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
}

// 仓位分组组件
function PositionGroup({
    size,
    stocks,
    stockData,
    viewMode,
    defaultExpanded = true,
    isRecommendation = false,
    portfolioId = '',
    onSelectCompany
}: {
    size: PositionSize;
    stocks: TrackedCompany[];
    stockData: Record<string, any>;
    viewMode: 'grid' | 'list';
    defaultExpanded?: boolean;
    isRecommendation?: boolean;
    portfolioId?: string;
    onSelectCompany: (company: TrackedCompany) => void;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const config = POSITION_SIZE_CONFIG[size];

    if (stocks.length === 0) return null;

    // 推荐评级对应的显示名称
    const recommendationLabels: Record<PositionSize, string> = {
        large: '强烈推荐',
        medium: '推荐',
        small: '一般推荐'
    };

    const displayName = isRecommendation ? recommendationLabels[size] : config.name;

    return (
        <div className="space-y-3">
            {/* 分组标题 */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 py-2 text-left group"
            >
                {!isRecommendation && (
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: config.color }}
                    />
                )}
                <span className="text-sm font-medium theme-text-heading">{displayName}</span>
                <span className="text-xs text-mist-500">({stocks.length} 只)</span>
                <div className="flex-1" />
                {expanded ? (
                    <ChevronDownIcon size={16} className="text-mist-500 group-hover:text-glacier-500 transition-colors" />
                ) : (
                    <ChevronRightIcon size={16} className="text-mist-500 group-hover:text-glacier-500 transition-colors" />
                )}
            </button>

            {/* 股票列表 */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-2"}
                    >
                        {stocks.map((stock) => {
                            const data = stockData[stock.symbol];
                            const price = data?.quote?.price || 0;
                            const change = data?.quote?.changesPercentage || 0;
                            const isPositive = change >= 0;
                            const brandColor = isPositive ? '#10b981' : '#ef4444';

                            if (viewMode === 'grid') {
                                return (
                                    <div
                                        onClick={() => onSelectCompany(stock)}
                                        key={stock.symbol}
                                        className="group relative flex items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-glacier-500/50 hover:bg-white/[0.07] transition-all overflow-hidden cursor-pointer gap-4"
                                    >
                                        {/* Column 1: Name & Basic Info */}
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-mist-500 border border-white/10">{stock.market}</span>
                                                <h3 className="text-sm font-medium text-mist-200 group-hover:text-glacier-500 transition-colors truncate">{stock.name}</h3>
                                            </div>

                                            <div className="flex items-center gap-2 text-[10px]">
                                                {isRecommendation && stock.rating ? (
                                                    <span className="text-amber-400 font-mono">{renderStars(stock.rating)}</span>
                                                ) : (
                                                    <>
                                                        {stock.portfolioPercent && (
                                                            <span className="font-mono font-medium" style={{ color: config.color }}>{stock.portfolioPercent.toFixed(1)}%</span>
                                                        )}
                                                        {!isRecommendation && portfolioId && (() => {
                                                            const sharedHolders = getSharedHolders(stock.symbol, portfolioId);
                                                            if (sharedHolders.length === 0) return null;
                                                            return (
                                                                <div className="flex items-center gap-0.5 text-glacier-400/80">
                                                                    <UsersIcon size={8} />
                                                                    <span>+{sharedHolders.length}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Column 2: Sparkline (K-line) */}
                                        <div className="w-24 shrink-0 flex justify-center">
                                            <StockSparkline data={data?.history || []} showLabel={false} />
                                        </div>

                                        {/* Column 3: Price & Change */}
                                        <div className="w-24 shrink-0 text-right flex flex-col justify-center">
                                            <span className="text-sm font-mono font-medium theme-text-heading">${price.toFixed(2)}</span>
                                            {(() => {
                                                const monthChange = calcMonthlyChange(data?.history || []);
                                                const isMonthPositive = monthChange >= 0;
                                                return (
                                                    <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${isMonthPositive ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {isMonthPositive ? <ArrowUpIcon size={8} /> : <ArrowDownIcon size={8} />}
                                                        <span>{isMonthPositive ? '+' : ''}{monthChange.toFixed(2)}%</span>
                                                        <span className="text-mist-600 text-[8px] font-medium">1M</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            }
                            else {

                                return (
                                    <div
                                        onClick={() => onSelectCompany(stock)}
                                        key={stock.symbol}
                                        className="group flex items-center p-3 rounded-lg bg-white/5 border border-white/10 hover:border-glacier-500/50 hover:bg-white/[0.07] transition-all cursor-pointer"
                                    >
                                        <div className="w-32 flex flex-col">
                                            <span className="font-mono text-xs text-mist-500 flex items-center gap-1">
                                                <span className="scale-75 origin-left text-[9px] px-1 rounded bg-white/5">{stock.market}</span>
                                            </span>
                                            <span className="text-sm font-medium theme-text-heading truncate">{stock.name}</span>
                                        </div>

                                        {/* 持仓占比 / 推荐评级 */}
                                        <div className="w-24 text-center">
                                            {isRecommendation && stock.rating ? (
                                                <span className="text-amber-400 text-xs font-mono">{renderStars(stock.rating)}</span>
                                            ) : stock.portfolioPercent ? (
                                                <span className="font-mono text-xs font-medium" style={{ color: config.color }}>{stock.portfolioPercent.toFixed(1)}%</span>
                                            ) : null}
                                        </div>

                                        {/* 共同持仓者指示 */}
                                        <div className="w-16 text-center">
                                            {!isRecommendation && portfolioId && (() => {
                                                const sharedHolders = getSharedHolders(stock.symbol, portfolioId);
                                                if (sharedHolders.length === 0) return null;
                                                return (
                                                    <span
                                                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-glacier-500/20 text-glacier-400 flex items-center justify-center gap-0.5"
                                                        title={sharedHolders.map(h => h.authorCn).join(', ')}
                                                    >
                                                        +{sharedHolders.length} <UsersIcon size={8} />
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex-1 px-3 flex justify-center">
                                            <div className="w-20">
                                                <StockSparkline data={data?.history || []} />
                                            </div>
                                        </div>

                                        <div className="w-28 text-right flex flex-col">
                                            <span className="text-sm font-mono font-medium theme-text-heading">${price.toFixed(2)}</span>
                                            {(() => {
                                                const monthChange = calcMonthlyChange(data?.history || []);
                                                const isMonthPositive = monthChange >= 0;
                                                return (
                                                    <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${isMonthPositive ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {isMonthPositive ? '+' : ''}{monthChange.toFixed(2)}%
                                                        <span className="text-mist-600">月</span>
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="ml-3 p-1.5 rounded-lg bg-white/5 text-mist-500 group-hover:text-glacier-500 group-hover:bg-glacier-500/10 transition-all">
                                            <ArrowRightIcon size={14} />
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function TrackingPage() {
    const { locale, t } = useLanguage();
    const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio>(PORTFOLIOS[0]);
    const [stockData, setStockData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [selectedCompany, setSelectedCompany] = useState<TrackedCompany | null>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [diagnosticCompany, setDiagnosticCompany] = useState<CompanyDiagnostic | null>(null);
    const [showOverviewModal, setShowOverviewModal] = useState(false);
    const router = useRouter();

    const handleSelectCompany = async (company: TrackedCompany) => {
        try {
            const response = await fetch(`/api/companies/${encodeURIComponent(company.symbol)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setDiagnosticCompany(data.data);
                    setShowOverviewModal(true);
                    return;
                }
            }
            router.push(`${withLocale(locale, '/companies')}/${encodeURIComponent(company.symbol)}`);
        } catch {
            router.push(`${withLocale(locale, '/companies')}/${encodeURIComponent(company.symbol)}`);
        }
    };

    // 初始化主题
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        const initialTheme = savedTheme || 'dark';
        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    // 切换主题
    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    useEffect(() => {
        const fetchStockData = async () => {
            setLoading(true);
            try {
                const symbols = selectedPortfolio.stocks.map(s => s.symbol);
                const response = await fetch('/api/tracking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols }),
                });
                const result = await response.json();
                if (result.success) {
                    const dataMap: Record<string, any> = {};
                    result.data.forEach((item: any) => {
                        dataMap[item.symbol] = item;
                    });
                    setStockData(dataMap);
                }
            } catch (error) {
                console.error('Failed to fetch tracking data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStockData();
    }, [selectedPortfolio]);

    // 按仓位大小分组股票
    const groupedStocks = groupStocksBySize(selectedPortfolio.stocks);

    return (
        <main className="min-h-screen selection:bg-glacier-500/30 transition-colors duration-300">
            {/* Header - 与首页保持一致 */}
            <Header
                theme={theme}
                toggleTheme={toggleTheme}
                showContactModal={() => setShowContactModal(true)}
            />

            {/* 二级工具栏 - 视图切换 */}
            <div className="pt-28 pb-2 mx-4">
                <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
                    <h1 className="text-2xl font-light tracking-tight theme-text-heading">组合追踪</h1>
                    <div className="hidden sm:flex p-1 bg-white/5 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-glacier-500 text-white shadow-sm' : 'text-mist-500 hover:text-mist-300'}`}
                        >
                            <LayoutGridIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-glacier-500 text-white shadow-sm' : 'text-mist-500 hover:text-mist-300'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar - Portfolio Selection (按分类分组) */}
                    <aside className="w-full lg:w-72 shrink-0">
                        <div className="sticky top-24 space-y-6">
                            {groupedPortfolios.map((group) => (
                                <div key={group.category}>
                                    <h2 className="text-xs font-semibold text-mist-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                        <span>{group.icon}</span>
                                        <span>{group.name}</span>
                                    </h2>
                                    <div className="space-y-1">
                                        {group.portfolios.map((portfolio) => (
                                            <button
                                                key={portfolio.id}
                                                onClick={() => setSelectedPortfolio(portfolio)}
                                                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex flex-col gap-1 ${selectedPortfolio.id === portfolio.id
                                                    ? 'bg-glacier-500/10 border border-glacier-500/20 text-glacier-400'
                                                    : 'hover:bg-white/5 border border-transparent text-mist-400 hover:text-mist-200'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{portfolio.nameCn}</span>
                                                    {portfolio.aum && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-glacier-500/20 text-glacier-400">
                                                            {portfolio.aum}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs opacity-60 truncate">{portfolio.authorCn}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content - Stock List (按仓位分组) */}
                    <div className="flex-1 space-y-6">
                        <div className="flex flex-col gap-3">
                            <div>
                                <h2 className="text-3xl font-light tracking-tight theme-text-heading mb-1">{selectedPortfolio.nameCn}</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-mist-400">{selectedPortfolio.authorCn}</span>
                                    {selectedPortfolio.aum && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-glacier-500/10 text-glacier-400 border border-glacier-500/20 flex items-center gap-1">
                                            <CoinsIcon size={10} /> {selectedPortfolio.aum}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <p className="text-mist-500 text-sm max-w-3xl leading-relaxed">{selectedPortfolio.description}</p>

                            {/* 近期核心策略 & 最新动向 */}
                            {(selectedPortfolio.recentStrategy || selectedPortfolio.recentMoves) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                                    {selectedPortfolio.recentStrategy && (
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                            <span className="text-xs font-medium text-mist-300 block mb-2">近期核心策略</span>
                                            <p className="text-xs text-mist-400 leading-relaxed">{selectedPortfolio.recentStrategy}</p>
                                        </div>
                                    )}
                                    {selectedPortfolio.recentMoves && (
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                            <span className="text-xs font-medium text-mist-300 block mb-2">最新动向</span>
                                            <p className="text-xs text-mist-400 leading-relaxed">{selectedPortfolio.recentMoves}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-mist-600">
                                {selectedPortfolio.stocks[0]?.lastUpdated && (
                                    <span className="flex items-center gap-1.5"><CalendarIcon size={12} /> 持仓数据更新于 {selectedPortfolio.stocks[0].lastUpdated}</span>
                                )}
                                <span className="flex items-center gap-1.5"><PieChartIcon size={12} /> 共 {selectedPortfolio.stocks.length} 只股票</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="space-y-3">
                                        <div className="h-6 w-32 bg-white/5 animate-pulse rounded" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[1, 2].map(j => (
                                                <div key={j} className="h-32 bg-white/5 animate-pulse rounded-xl border border-white/5" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedPortfolio.id + viewMode}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {selectedPortfolio.category === 'recommendation' ? (
                                        // 投资建议类：按评级分组显示
                                        <>
                                            <PositionGroup
                                                size="large"
                                                stocks={selectedPortfolio.stocks.filter((s: TrackedCompany) => s.rating === 5)}
                                                stockData={stockData}
                                                viewMode={viewMode}
                                                defaultExpanded={true}
                                                isRecommendation={true}
                                                onSelectCompany={handleSelectCompany}
                                            />
                                            <PositionGroup
                                                size="medium"
                                                stocks={selectedPortfolio.stocks.filter((s: TrackedCompany) => s.rating === 4)}
                                                stockData={stockData}
                                                viewMode={viewMode}
                                                defaultExpanded={true}
                                                isRecommendation={true}
                                                onSelectCompany={handleSelectCompany}
                                            />
                                            <PositionGroup
                                                size="small"
                                                stocks={selectedPortfolio.stocks.filter((s: TrackedCompany) => s.rating && s.rating <= 3)}
                                                stockData={stockData}
                                                viewMode={viewMode}
                                                defaultExpanded={true}
                                                isRecommendation={true}
                                                onSelectCompany={handleSelectCompany}
                                            />
                                        </>
                                    ) : (
                                        // 其他类别：按仓位大小分组显示
                                        <>
                                            {/* 大仓位 */}
                                            <PositionGroup
                                                size="large"
                                                stocks={groupedStocks.large}
                                                stockData={stockData}
                                                viewMode={viewMode}
                                                defaultExpanded={true}
                                                portfolioId={selectedPortfolio.id}
                                                onSelectCompany={handleSelectCompany}
                                            />
                                            {/* 中仓位 */}
                                            <PositionGroup
                                                size="medium"
                                                stocks={groupedStocks.medium}
                                                stockData={stockData}
                                                viewMode={viewMode}
                                                defaultExpanded={true}
                                                portfolioId={selectedPortfolio.id}
                                                onSelectCompany={handleSelectCompany}
                                            />
                                            {/* 小仓位 */}
                                            <PositionGroup
                                                size="small"
                                                stocks={groupedStocks.small}
                                                stockData={stockData}
                                                viewMode={viewMode}
                                                defaultExpanded={false}
                                                portfolioId={selectedPortfolio.id}
                                                onSelectCompany={handleSelectCompany}
                                            />
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {selectedCompany && (
                <div className="report-modal-wrapper">
                    <ReportModal
                        isOpen={reportModalOpen}
                        onClose={() => setReportModalOpen(false)}
                        symbol={selectedCompany.symbol}
                        market={selectedCompany.market}
                        companyName={selectedCompany.name}
                    />
                </div>
            )}

            {/* Company Overview Modal */}
            <CompanyOverviewModal
                company={diagnosticCompany}
                isOpen={showOverviewModal}
                onClose={() => { setShowOverviewModal(false); setDiagnosticCompany(null); }}
                currentFilters={{}}
                onCompanyChange={(newCompany) => setDiagnosticCompany(newCompany)}
            />

            <ContactModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                title={t.home.contact.title}
                scanQr={t.home.contact.scanQr}
                lookForward={t.home.contact.lookForward}
                wechatLabel={t.home.faq.wechat}
                emailLabel={t.home.faq.email}
            />
        </main>
    );
}
