'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import {
    TrendingUpIcon,
    BarChart3Icon,
    ArrowRightIcon,
    Globe2Icon,
    SearchIcon,
    ClockIcon,
    LogoIcon,
    XIcon,
    SunIcon,
    MoonIcon,
    MessageCircleIcon
} from '@/components/Icons';
import {
    ChevronLeft as ChevronLeftIcon,
    LayoutGrid as LayoutGridIcon,
    List as ListIcon,
    ArrowUp as ArrowUpIcon,
    ArrowDown as ArrowDownIcon,
    ExternalLink as ExternalLinkIcon
} from 'lucide-react';
import { PORTFOLIOS, Portfolio, TrackedCompany } from '@/lib/portfolios';

// 迷你 K 线图组件 (Sparkline)
function StockSparkline({ data, color }: { data: any[], color: string }) {
    if (!data || data.length === 0) return <div className="h-12 w-24 bg-white/5 animate-pulse rounded" />;

    const prices = data.map(d => d.close).reverse();
    const dates = data.map(d => d.date).reverse();

    const option = {
        grid: { left: 0, right: 0, top: 4, bottom: 4 },
        xAxis: { type: 'category', data: dates, show: false },
        yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
        series: [
            {
                data: prices,
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { color, width: 2 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: color + '44' },
                            { offset: 1, color: color + '00' }
                        ]
                    }
                }
            }
        ]
    };

    return <ReactECharts option={option} style={{ height: '48px', width: '100px' }} />;
}

export default function TrackingPage() {
    const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio>(PORTFOLIOS[0]);
    const [stockData, setStockData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

    return (
        <main className="min-h-screen selection:bg-glacier-500/30 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                            <ChevronLeftIcon size={20} className="text-mist-400 group-hover:text-glacier-500" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-glacier-500 to-gemini-blue flex items-center justify-center">
                                <TrendingUpIcon size={18} className="text-white" />
                            </div>
                            <h1 className="text-lg font-medium tracking-tight theme-text-heading">组合追踪</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
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

                        <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

                        {/* 主题切换 */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all cursor-pointer"
                            title={theme === 'dark' ? '切换到亮色模式' : '切换到深色模式'}
                        >
                            {theme === 'dark' ? (
                                <SunIcon size={18} className="text-mist-300" />
                            ) : (
                                <MoonIcon size={18} className="text-mist-300" />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar - Portfolio Selection */}
                    <aside className="w-full lg:w-72 shrink-0">
                        <div className="sticky top-24 space-y-6">
                            <div>
                                <h2 className="text-xs font-semibold text-mist-500 uppercase tracking-wider mb-4 px-2">投资组合</h2>
                                <div className="space-y-1">
                                    {PORTFOLIOS.map((portfolio) => (
                                        <button
                                            key={portfolio.id}
                                            onClick={() => setSelectedPortfolio(portfolio)}
                                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex flex-col gap-1 ${selectedPortfolio.id === portfolio.id
                                                ? 'bg-glacier-500/10 border border-glacier-500/20 text-glacier-400'
                                                : 'hover:bg-white/5 border border-transparent text-mist-400 hover:text-mist-200'
                                                }`}
                                        >
                                            <span className="font-medium text-sm">{portfolio.name}</span>
                                            <span className="text-xs opacity-60 truncate">{portfolio.author}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-gradient-to-br from-arctic-800 to-arctic-950 border border-white/5 shadow-lg">
                                <h3 className="text-sm font-medium mb-2 flex items-center gap-2 theme-text-heading">
                                    <LogoIcon size={16} />
                                    <span>关于追踪</span>
                                </h3>
                                <p className="text-xs text-mist-500 leading-relaxed">
                                    通过实时追踪大咖持仓，结合智投 AI 深度分析，助您发现潜藏的投资机会。跨越市场疆界，AI 为您实时解码。
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content - Stock List */}
                    <div className="flex-1 space-y-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-light tracking-tight theme-text-heading">{selectedPortfolio.name}</h2>
                            <p className="text-mist-500 text-sm max-w-2xl">{selectedPortfolio.description}</p>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-32 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
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
                                    className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}
                                >
                                    {selectedPortfolio.stocks.map((stock) => {
                                        const data = stockData[stock.symbol];
                                        const price = data?.quote?.price || 0;
                                        const change = data?.quote?.changesPercentage || 0;
                                        const isPositive = change >= 0;
                                        const brandColor = isPositive ? '#10b981' : '#ef4444';

                                        if (viewMode === 'grid') {
                                            return (
                                                <Link
                                                    href={`/?symbol=${stock.symbol}`}
                                                    key={stock.symbol}
                                                    className="group relative flex flex-col p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-glacier-500/50 hover:bg-white/[0.07] transition-all overflow-hidden"
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-mono text-sm font-semibold tracking-widest theme-text-heading">{stock.symbol}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-mist-500 border border-white/10">{stock.market}</span>
                                                            </div>
                                                            <h3 className="text-lg font-medium text-mist-200 group-hover:text-glacier-500 transition-colors">{stock.name}</h3>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end">
                                                            <span className="text-xl font-mono font-medium theme-text-heading">${price.toFixed(2)}</span>
                                                            <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {isPositive ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
                                                                <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-end justify-between mt-auto">
                                                        <div className="w-full max-w-[120px]">
                                                            <StockSparkline data={data?.history || []} color={brandColor} />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-glacier-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span>查看 AI 报告</span>
                                                            <ExternalLinkIcon size={12} />
                                                        </div>
                                                    </div>

                                                    {/* Decorative blur */}
                                                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity bg-${isPositive ? 'emerald' : 'rose'}-500/20`} />
                                                </Link>
                                            );
                                        } else {
                                            return (
                                                <Link
                                                    href={`/?symbol=${stock.symbol}`}
                                                    key={stock.symbol}
                                                    className="group flex items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-glacier-500/50 hover:bg-white/[0.07] transition-all"
                                                >
                                                    <div className="w-32 flex flex-col">
                                                        <span className="font-mono text-xs text-mist-500 flex items-center gap-1">
                                                            {stock.symbol}
                                                            <span className="scale-75 origin-left text-[9px] px-1 rounded bg-white/5">{stock.market}</span>
                                                        </span>
                                                        <span className="text-sm font-medium theme-text-heading truncate">{stock.name}</span>
                                                    </div>

                                                    <div className="flex-1 px-4 flex justify-center">
                                                        <div className="w-24">
                                                            <StockSparkline data={data?.history || []} color={brandColor} />
                                                        </div>
                                                    </div>

                                                    <div className="w-32 text-right flex flex-col">
                                                        <span className="text-sm font-mono font-medium theme-text-heading">${price.toFixed(2)}</span>
                                                        <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {isPositive ? '+' : ''}{change.toFixed(2)}%
                                                        </span>
                                                    </div>

                                                    <div className="ml-4 p-2 rounded-lg bg-white/5 text-mist-500 group-hover:text-glacier-500 group-hover:bg-glacier-500/10 transition-all">
                                                        <ArrowRightIcon size={16} />
                                                    </div>
                                                </Link>
                                            );
                                        }
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
