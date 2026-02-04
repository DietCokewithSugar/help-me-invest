'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XIcon,
    FilterIcon,
    SearchIcon,
    ChevronDownIcon,
    TrendingUpIcon,
    BuildingIcon,
    DollarSignIcon,
    ActivityIcon,
} from '@/components/Icons';
import type { CompanyDiagnostic, CompanyFilterRequest } from '@/types';

interface CompanyFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCompany: (symbol: string) => void;
}

// 7个维度的选项
const DIMENSION_OPTIONS = {
    strategicPositioning: [
        { value: '开拓者', label: '开拓者', desc: '增长优先，全力扩张' },
        { value: '稳固者', label: '稳固者', desc: '守成为主，追求稳健' },
        { value: '分红者', label: '分红者', desc: '回报股东，高分红' },
    ],
    marketCapSize: [
        { value: '实力股', label: '实力股（大盘/蓝筹）', desc: '行业领导者' },
        { value: '潜力股', label: '潜力股（中盘/成长）', desc: '中坚力量' },
        { value: '弹簧股', label: '弹簧股（小盘/微盘）', desc: '高弹性' },
    ],
    cyclicalNature: [
        { value: '防御型', label: '防御型', desc: '需求稳定' },
        { value: '周期型', label: '周期型', desc: '随经济波动' },
        { value: '探险型', label: '探险型', desc: '依赖创新' },
    ],
    cashFlowStatus: [
        { value: '健康型', label: '健康型', desc: '现金流充沛' },
        { value: '贫血型', label: '贫血型', desc: '需要外部输血' },
    ],
    debtStructure: [
        { value: '轻装型', label: '轻装型', desc: '负债率低' },
        { value: '平衡型', label: '平衡型', desc: '合理杠杆' },
        { value: '背债型', label: '背债型', desc: '负债率高' },
    ],
    externalSensitivity: [
        { value: '政策型', label: '政策型', desc: '受政策影响大' },
        { value: '汇率型', label: '汇率型', desc: '受汇率影响大' },
        { value: '内功型', label: '内功型', desc: '内部驱动为主' },
    ],
    profitModel: [
        { value: '薄利多销型', label: '薄利多销型', desc: '低毛利高周转' },
        { value: '高利少销型', label: '高利少销型', desc: '高毛利高净利' },
        { value: '坐地收租型', label: '坐地收租型', desc: '垄断地位稳定收益' },
        { value: '烧钱圈地型', label: '烧钱圈地型', desc: '补贴换市场' },
    ],
};

export default function CompanyFilterModal({
    isOpen,
    onClose,
    onSelectCompany,
}: CompanyFilterModalProps) {
    const [filters, setFilters] = useState<CompanyFilterRequest>({
        page: 1,
        limit: 50,
    });
    const [companies, setCompanies] = useState<CompanyDiagnostic[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<CompanyDiagnostic | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sectors, setSectors] = useState<string[]>([]);
    const [industries, setIndustries] = useState<string[]>([]);

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

                // 提取唯一的 sector 和 industry
                const uniqueSectors = Array.from(new Set(data.data.map((c: CompanyDiagnostic) => c.sector).filter(Boolean)));
                const uniqueIndustries = Array.from(new Set(data.data.map((c: CompanyDiagnostic) => c.industry).filter(Boolean)));
                setSectors(uniqueSectors as string[]);
                setIndustries(uniqueIndustries as string[]);
            }
        } catch (error) {
            console.error('获取公司列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 初始加载
    useEffect(() => {
        if (isOpen) {
            fetchCompanies();
        }
    }, [isOpen]);

    // 应用筛选
    const applyFilters = () => {
        setFilters({ ...filters, page: 1 });
        fetchCompanies();
    };

    // 重置筛选
    const resetFilters = () => {
        setFilters({ page: 1, limit: 50 });
        setSearchQuery('');
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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-obsidian-900/95 to-obsidian-800/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-glacier-500/15 flex items-center justify-center">
                                <FilterIcon className="w-5 h-5 text-glacier-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">公司筛选器</h2>
                                <p className="text-sm text-mist-500">从 10,000+ 美股中发现投资机会</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <XIcon size={20} className="text-mist-300" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Left Panel - Filters */}
                        <div className="w-full md:w-80 p-6 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
                            <h3 className="text-sm font-semibold text-mist-300 mb-4 flex items-center gap-2">
                                <FilterIcon size={16} />
                                筛选条件
                            </h3>

                            {/* 7 Dimensions */}
                            {Object.entries(DIMENSION_OPTIONS).map(([key, options]) => (
                                <div key={key} className="mb-4">
                                    <label className="text-xs text-mist-500 mb-2 block">
                                        {key === 'strategicPositioning' && '企业战略定位'}
                                        {key === 'marketCapSize' && '目前市场体量'}
                                        {key === 'cyclicalNature' && '周期特性'}
                                        {key === 'cashFlowStatus' && '当前资金状况'}
                                        {key === 'debtStructure' && '当前债务结构'}
                                        {key === 'externalSensitivity' && '外部敏感点'}
                                        {key === 'profitModel' && '盈利模式'}
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {options.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => toggleFilter(key as keyof CompanyFilterRequest, option.value)}
                                                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all shadow-sm ${(filters[key as keyof CompanyFilterRequest] as string[])?.includes(option.value)
                                                    ? 'bg-glacier-500/20 border border-glacier-500/50 text-glacier-400 ring-1 ring-glacier-500/20'
                                                    : 'bg-white/5 border border-white/10 text-mist-400 hover:bg-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="font-semibold flex items-center justify-between">
                                                    {option.label}
                                                    {(filters[key as keyof CompanyFilterRequest] as string[])?.includes(option.value) && (
                                                        <div className="w-2 h-2 rounded-full bg-glacier-500" />
                                                    )}
                                                </div>
                                                <div className="text-xs opacity-70 mt-0.5 line-clamp-1">{option.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={resetFilters}
                                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-mist-300 rounded-xl font-medium transition-colors border border-white/10"
                                >
                                    重置
                                </button>
                                <button
                                    onClick={applyFilters}
                                    disabled={loading}
                                    className="flex-3 px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {loading ? '处理中...' : '应用'}
                                </button>
                            </div>
                        </div>

                        {/* Right Panel - Results */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {selectedCompany ? (
                                // Company Detail View
                                <div className="flex-1 overflow-y-auto p-6">
                                    <button
                                        onClick={() => setSelectedCompany(null)}
                                        className="text-sm text-glacier-500 hover:text-glacier-400 mb-4 flex items-center gap-1"
                                    >
                                        ← 返回列表
                                    </button>

                                    <div className="space-y-6">
                                        {/* Basic Info */}
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">{selectedCompany.company_name}</h3>
                                            <div className="flex items-center gap-3 text-sm text-mist-400">
                                                <span className="font-mono text-glacier-500">{selectedCompany.symbol}</span>
                                                <span>•</span>
                                                <span>{selectedCompany.sector}</span>
                                                <span>•</span>
                                                <span>{selectedCompany.industry}</span>
                                            </div>
                                        </div>

                                        {/* Key Metrics */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <div className="text-xs text-mist-500 mb-1">市值</div>
                                                <div className="text-lg font-semibold text-white">{formatMarketCap(selectedCompany.market_cap)}</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <div className="text-xs text-mist-500 mb-1">当前价格</div>
                                                <div className="text-lg font-semibold text-white">${selectedCompany.price?.toFixed(2) || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* 7 Dimensions */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-mist-300 mb-3">七维股票诊断</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { label: '企业战略定位', value: selectedCompany.strategic_positioning },
                                                    { label: '目前市场体量', value: selectedCompany.market_cap_size },
                                                    { label: '周期特性', value: selectedCompany.cyclical_nature },
                                                    { label: '当前资金状况', value: selectedCompany.cash_flow_status },
                                                    { label: '当前债务结构', value: selectedCompany.debt_structure },
                                                    { label: '外部敏感点', value: selectedCompany.external_sensitivity },
                                                    { label: '盈利模式', value: selectedCompany.profit_model },
                                                ].map((dim, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                                        <span className="text-sm text-mist-400">{dim.label}</span>
                                                        <span className="text-sm font-medium text-glacier-400">{dim.value || 'N/A'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Generate Report Button */}
                                        <button
                                            onClick={() => {
                                                onSelectCompany(selectedCompany.symbol);
                                                onClose();
                                            }}
                                            className="w-full px-6 py-4 bg-gradient-to-r from-glacier-500 to-gemini-blue hover:from-glacier-600 hover:to-gemini-purple text-white rounded-xl font-semibold transition-all shadow-lg shadow-glacier-500/20 hover:shadow-glacier-500/40"
                                        >
                                            生成研究报告
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Company List
                                <>
                                    {/* Search Bar */}
                                    <div className="p-6 border-b border-white/10">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mist-500" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="搜索公司名称或代码..."
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-mist-600 focus:outline-none focus:border-glacier-500/50"
                                            />
                                        </div>
                                        <div className="mt-2 text-sm text-mist-500">
                                            找到 {total} 家公司 {searchQuery && `（显示 ${filteredCompanies.length} 条结果）`}
                                        </div>
                                    </div>

                                    {/* Company List */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-mist-500">加载中...</div>
                                            </div>
                                        ) : filteredCompanies.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-center">
                                                    <div className="text-mist-500 mb-2">未找到符合条件的公司</div>
                                                    <button
                                                        onClick={resetFilters}
                                                        className="text-sm text-glacier-500 hover:text-glacier-400"
                                                    >
                                                        重置筛选条件
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {filteredCompanies.map((company) => (
                                                    <button
                                                        key={company.id}
                                                        onClick={() => setSelectedCompany(company)}
                                                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-glacier-500/50 transition-all text-left"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <div className="font-semibold text-white">{company.company_name}</div>
                                                                <div className="text-sm font-mono text-glacier-500">{company.symbol}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-semibold text-white">{formatMarketCap(company.market_cap)}</div>
                                                                <div className="text-xs text-mist-500">{company.sector}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {company.strategic_positioning && (
                                                                <span className="px-2 py-1 text-xs rounded-md bg-glacier-500/20 text-glacier-400 border border-glacier-500/30">
                                                                    {company.strategic_positioning}
                                                                </span>
                                                            )}
                                                            {company.market_cap_size && (
                                                                <span className="px-2 py-1 text-xs rounded-md bg-gemini-blue/20 text-gemini-blue border border-gemini-blue/30">
                                                                    {company.market_cap_size}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    {!loading && filteredCompanies.length > 0 && (
                                        <div className="p-6 border-t border-white/10 flex items-center justify-between">
                                            <button
                                                onClick={() => {
                                                    setFilters({ ...filters, page: (filters.page || 1) - 1 });
                                                    fetchCompanies();
                                                }}
                                                disabled={(filters.page || 1) <= 1}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-mist-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                上一页
                                            </button>
                                            <div className="text-sm text-mist-500">
                                                第 {filters.page || 1} 页
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setFilters({ ...filters, page: (filters.page || 1) + 1 });
                                                    fetchCompanies();
                                                }}
                                                disabled={(filters.page || 1) * (filters.limit || 50) >= total}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-mist-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                下一页
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
