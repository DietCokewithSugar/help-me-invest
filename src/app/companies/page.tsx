'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import {
    SearchIcon,
    FilterIcon,
    TrendingUpIcon,
    ChevronDownIcon,
    LogoIcon,
    XIcon,
} from '@/components/Icons';
import type { CompanyDiagnostic, CompanyFilterRequest } from '@/types';

// 7个维度的选项
const DIMENSION_OPTIONS = {
    strategicPositioning: {
        label: '企业战略定位',
        options: [
            { value: '开拓者', label: '开拓者', desc: '增长优先，全力扩张' },
            { value: '稳固者', label: '稳固者', desc: '守成为主，追求稳健' },
            { value: '分红者', label: '分红者', desc: '回报股东，高分红' },
        ],
    },
    marketCapSize: {
        label: '目前市场体量',
        options: [
            { value: '实力股', label: '实力股', desc: '大盘/蓝筹' },
            { value: '潜力股', label: '潜力股', desc: '中盘/成长' },
            { value: '弹簧股', label: '弹簧股', desc: '小盘/微盘' },
        ],
    },
    cyclicalNature: {
        label: '周期特性',
        options: [
            { value: '防御型', label: '防御型', desc: '需求稳定' },
            { value: '周期型', label: '周期型', desc: '随经济波动' },
            { value: '探险型', label: '探险型', desc: '依赖创新' },
        ],
    },
    cashFlowStatus: {
        label: '当前资金状况',
        options: [
            { value: '健康型', label: '健康型', desc: '现金流充沛' },
            { value: '贫血型', label: '贫血型', desc: '需要外部输血' },
        ],
    },
    debtStructure: {
        label: '当前债务结构',
        options: [
            { value: '轻装型', label: '轻装型', desc: '负债率低' },
            { value: '平衡型', label: '平衡型', desc: '合理杠杆' },
            { value: '背债型', label: '背债型', desc: '负债率高' },
        ],
    },
    externalSensitivity: {
        label: '外部敏感点',
        options: [
            { value: '政策型', label: '政策型', desc: '受政策影响大' },
            { value: '汇率型', label: '汇率型', desc: '受汇率影响大' },
            { value: '内功型', label: '内功型', desc: '内部驱动为主' },
        ],
    },
    profitModel: {
        label: '盈利模式',
        options: [
            { value: '薄利多销型', label: '薄利多销型', desc: '低毛利高周转' },
            { value: '高利少销型', label: '高利少销型', desc: '高毛利高净利' },
            { value: '坐地收租型', label: '坐地收租型', desc: '垄断地位稳定收益' },
            { value: '烧钱圈地型', label: '烧钱圈地型', desc: '补贴换市场' },
        ],
    },
};

export default function CompaniesPage() {
    const router = useRouter();
    const [filters, setFilters] = useState<CompanyFilterRequest>({
        page: 1,
        limit: 50,
    });
    const [companies, setCompanies] = useState<CompanyDiagnostic[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterExpanded, setIsFilterExpanded] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [showContactModal, setShowContactModal] = useState(false);

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

    // 获取筛选后的公司列表
    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/companies/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters),
            });
            const data = await response.json();
            if (data.success) {
                setCompanies(data.data);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('获取公司列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 初始加载
    useEffect(() => {
        fetchCompanies();
    }, [filters.page]);

    // 应用筛选
    const applyFilters = () => {
        setFilters({ ...filters, page: 1 });
        fetchCompanies();
    };

    // 重置筛选
    const resetFilters = () => {
        setFilters({ page: 1, limit: 50 });
        setSearchQuery('');
        fetchCompanies();
    };

    // 切换多选项
    const toggleFilter = (key: keyof CompanyFilterRequest, value: string) => {
        const currentValues = (filters[key] as string[]) || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value];
        setFilters({ ...filters, [key]: newValues.length > 0 ? newValues : undefined });
    };

    // 格式化市值
    const formatMarketCap = (marketCap: number | null) => {
        if (!marketCap) return 'N/A';
        if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
        if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
        if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
        return `$${marketCap.toFixed(0)}`;
    };

    // 筛选后的公司（基于搜索）
    const filteredCompanies = companies.filter((company) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            company.symbol.toLowerCase().includes(query) ||
            company.company_name?.toLowerCase().includes(query)
        );
    });

    // 导航到报告页面
    const handleGenerateReport = (symbol: string) => {
        router.push(`/?symbol=${symbol}`);
    };

    return (
        <div className="min-h-screen bg-main-bg transition-colors duration-200">
            {/* Background Pattern */}
            <div className="fixed inset-0 bg-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

            {/* Header */}
            <Header
                theme={theme}
                toggleTheme={toggleTheme}
                onReset={() => router.push('/')}
                showContactModal={() => setShowContactModal(true)}
            />

            {/* Main Content */}
            <div className="pt-32 pb-12 px-4 md:px-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
                                公司发现
                            </h2>
                            <p className="text-text-secondary">
                                从 10,000+ 美股中发现投资机会，使用 AI 诊断维度精准筛选
                            </p>
                        </div>
                        <div className="glass-card p-4 rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-2xl font-mono font-bold text-text-primary leading-none">{total}</div>
                                <div className="text-xs text-text-muted mt-1">符合条件的公司</div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Section - Now Vertical */}
                    <div className="space-y-4">
                        <div className="glass-card rounded-sm border border-white/10 dark:border-white/10 light:border-black/10 overflow-hidden">
                            <button
                                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                    <FilterIcon size={16} />
                                    筛选条件
                                </div>
                                <div className="flex items-center gap-4">
                                    <ChevronDownIcon
                                        size={16}
                                        className={`text-text-muted transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isFilterExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="p-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                                            {Object.entries(DIMENSION_OPTIONS).map(([key, config]) => (
                                                <div key={key} className="space-y-2">
                                                    <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                                        {config.label}
                                                    </h4>
                                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {config.options.map((option) => {
                                                            const isActive = (filters[key as keyof CompanyFilterRequest] as string[])?.includes(option.value);
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    onClick={() => toggleFilter(key as keyof CompanyFilterRequest, option.value)}
                                                                    className={`px-2 py-1.5 rounded-sm text-xs transition-all border text-center ${isActive
                                                                        ? 'bg-accent/15 border-accent text-accent shadow-[0_0_8px_rgba(20,184,166,0.1)]'
                                                                        : 'bg-white/5 border-transparent text-text-muted hover:border-text-muted/30 hover:text-text-secondary hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end items-center gap-4">
                                            <button
                                                onClick={resetFilters}
                                                className="text-sm text-text-muted hover:text-text-primary transition-colors"
                                            >
                                                重置
                                            </button>
                                            <button
                                                onClick={applyFilters}
                                                disabled={loading}
                                                className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-sm font-medium text-sm transition-colors disabled:opacity-50"
                                            >
                                                {loading ? '加载中...' : '应用'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索公司名称或代码..."
                                className="w-full pl-12 pr-4 py-4 glass-card border border-white/10 dark:border-white/10 light:border-black/10 rounded-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-text-muted font-mono animate-pulse">LOADING_DATA...</div>
                            </div>
                        ) : filteredCompanies.length === 0 ? (
                            <div className="glass-card p-12 rounded-sm border border-white/10 text-center">
                                <div className="text-text-muted mb-4 font-mono">NO_RESULTS_FOUND</div>
                                <button
                                    onClick={resetFilters}
                                    className="text-sm text-accent hover:underline"
                                >
                                    重置筛选条件
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredCompanies.map((company) => (
                                        <motion.div
                                            key={company.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="glass-card p-5 rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 hover:border-accent/50 transition-all group cursor-pointer relative overflow-hidden"
                                            onClick={() => handleGenerateReport(company.symbol)}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-text-primary mb-1 group-hover:text-accent transition-colors line-clamp-1">
                                                        {company.company_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded-sm">{company.symbol}</span>
                                                        <span className="text-text-muted">•</span>
                                                        <span className="text-text-secondary truncate max-w-[150px]">{company.sector}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-mono font-bold text-text-primary">
                                                        {formatMarketCap(company.market_cap)}
                                                    </div>
                                                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Market Cap</div>
                                                </div>
                                            </div>

                                            {/* Diagnostic Tags */}
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {company.strategic_positioning && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-white/5 text-text-secondary border border-white/10">
                                                        {company.strategic_positioning}
                                                    </span>
                                                )}
                                                {company.market_cap_size && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-white/5 text-text-secondary border border-white/10">
                                                        {company.market_cap_size}
                                                    </span>
                                                )}
                                                {company.profit_model && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-white/5 text-text-secondary border border-white/10">
                                                        {company.profit_model}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-accent opacity-0 group-hover:opacity-100 transition-opacity border-t border-white/5 pt-3">
                                                <span className="font-bold uppercase tracking-tighter">View Research Report</span>
                                                <TrendingUpIcon size={12} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="glass-card p-4 rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 flex items-center justify-between">
                                    <button
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                        disabled={(filters.page || 1) <= 1}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary rounded-sm font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                                    >
                                        PREV
                                    </button>
                                    <div className="text-xs text-text-muted font-mono">
                                        PAGE {filters.page || 1} / {Math.ceil(total / (filters.limit || 50))}
                                    </div>
                                    <button
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                        disabled={(filters.page || 1) * (filters.limit || 50) >= total}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary rounded-sm font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                                    >
                                        NEXT
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div >

            {/* 联系我们弹窗 */}
            <AnimatePresence>
                {
                    showContactModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowContactModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative bg-gradient-to-br from-arctic-800 to-arctic-900 rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl max-w-sm mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* 关闭按钮 */}
                                <button
                                    onClick={() => setShowContactModal(false)}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <XIcon size={18} className="text-mist-400" />
                                </button>

                                {/* 标题 */}
                                <h3 className="text-xl font-semibold text-white mb-2 text-center">联系我们</h3>
                                <p className="text-sm text-mist-400 mb-6 text-center">扫描二维码添加微信</p>

                                {/* 二维码图片 */}
                                <div className="flex justify-center">
                                    <img
                                        src="/wechat-qr.jpg"
                                        alt="微信二维码"
                                        className="w-64 h-64 object-cover rounded-lg"
                                    />
                                </div>

                                {/* 提示文字 */}
                                <p className="text-xs text-mist-500 mt-4 text-center">
                                    期待与您交流
                                </p>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
