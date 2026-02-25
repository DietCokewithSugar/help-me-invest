'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import type { CompanyDiagnostic, CompanyFilterRequest } from '@/types';

interface CompanyFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCompany: (symbol: string) => void;
}

// Dimension option keys mapped to translation value keys
const DIMENSION_OPTION_KEYS = {
    strategicPositioning: [
        { value: '开拓者', labelKey: 'pioneer' as const, descKey: 'pioneer_desc' as const },
        { value: '稳固者', labelKey: 'stabilizer' as const, descKey: 'stabilizer_desc' as const },
        { value: '分红者', labelKey: 'dividend' as const, descKey: 'dividend_desc' as const },
    ],
    marketCapSize: [
        { value: '实力股', labelKey: 'largeCap' as const, descKey: 'largeCap_desc' as const },
        { value: '潜力股', labelKey: 'midCap' as const, descKey: 'midCap_desc' as const },
        { value: '弹簧股', labelKey: 'smallCap' as const, descKey: 'smallCap_desc' as const },
    ],
    cyclicalNature: [
        { value: '防御型', labelKey: 'defensive' as const, descKey: 'defensive_desc' as const },
        { value: '周期型', labelKey: 'cyclical' as const, descKey: 'cyclical_desc' as const },
        { value: '探险型', labelKey: 'adventurous' as const, descKey: 'adventurous_desc' as const },
    ],
    cashFlowStatus: [
        { value: '健康型', labelKey: 'healthy' as const, descKey: 'healthy_desc' as const },
        { value: '贫血型', labelKey: 'anemic' as const, descKey: 'anemic_desc' as const },
    ],
    debtStructure: [
        { value: '轻装型', labelKey: 'light' as const, descKey: 'light_desc' as const },
        { value: '平衡型', labelKey: 'balanced' as const, descKey: 'balanced_desc' as const },
        { value: '背债型', labelKey: 'heavy' as const, descKey: 'heavy_desc' as const },
    ],
    externalSensitivity: [
        { value: '政策型', labelKey: 'policy' as const, descKey: 'policy_desc' as const },
        { value: '汇率型', labelKey: 'forex' as const, descKey: 'forex_desc' as const },
        { value: '内功型', labelKey: 'internal' as const, descKey: 'internal_desc' as const },
    ],
    profitModel: [
        { value: '薄利多销型', labelKey: 'thinMargin' as const, descKey: 'thinMargin_desc' as const },
        { value: '高利少销型', labelKey: 'highMargin' as const, descKey: 'highMargin_desc' as const },
        { value: '坐地收租型', labelKey: 'rentSeeking' as const, descKey: 'rentSeeking_desc' as const },
        { value: '烧钱圈地型', labelKey: 'cashBurn' as const, descKey: 'cashBurn_desc' as const },
    ],
};

export default function CompanyFilterModal({
    isOpen,
    onClose,
    onSelectCompany,
}: CompanyFilterModalProps) {
    const { t } = useLanguage();
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
    const fetchCompanies = useCallback(async (currentFilters: CompanyFilterRequest, query: string) => {
        setLoading(true);
        try {
            const requestBody = {
                ...currentFilters,
                searchQuery: query.trim() || undefined,
            };
            const response = await fetch('/api/companies/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            const data = await response.json();
            if (data.success) {
                setCompanies(data.data);
                setTotal(data.total);

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
    }, []);

    // 搜索防抖
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        searchTimerRef.current = setTimeout(() => {
            setFilters((prev) => ({ ...prev, page: 1 }));
            fetchCompanies({ ...filters, page: 1 }, value);
        }, 300);
    };

    // 初始加载
    useEffect(() => {
        if (isOpen) {
            fetchCompanies(filters, searchQuery);
        }
    }, [isOpen]);

    // 应用筛选
    const applyFilters = () => {
        const newFilters = { ...filters, page: 1 };
        setFilters(newFilters);
        fetchCompanies(newFilters, searchQuery);
    };

    // 重置筛选
    const resetFilters = () => {
        const newFilters = { page: 1, limit: 50 };
        setFilters(newFilters);
        setSearchQuery('');
        fetchCompanies(newFilters, '');
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
                                <h2 className="text-xl font-semibold text-white">{t.companyFilterModal.title}</h2>
                                <p className="text-sm text-mist-500">{t.companyFilterModal.subtitle}</p>
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
                                {t.companyFilterModal.filterTitle}
                            </h3>

                            {/* 7 Dimensions */}
                            {Object.entries(DIMENSION_OPTION_KEYS).map(([key, options]) => (
                                <div key={key} className="mb-4">
                                    <label className="text-xs text-mist-500 mb-2 block">
                                        {t.companies.dimensions[key as keyof typeof t.companies.dimensions]}
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
                                                    {t.companies.dimensionValues[option.labelKey]}
                                                    {(filters[key as keyof CompanyFilterRequest] as string[])?.includes(option.value) && (
                                                        <div className="w-2 h-2 rounded-full bg-glacier-500" />
                                                    )}
                                                </div>
                                                <div className="text-xs opacity-70 mt-0.5 line-clamp-1">{t.companies.dimensionValues[option.descKey]}</div>
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
                                    {t.companyFilterModal.reset}
                                </button>
                                <button
                                    onClick={applyFilters}
                                    disabled={loading}
                                    className="flex-3 px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {loading ? t.companyFilterModal.processing : t.companyFilterModal.apply}
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
                                        {t.companyFilterModal.backToList}
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
                                                <div className="text-xs text-mist-500 mb-1">{t.common.marketCap}</div>
                                                <div className="text-lg font-semibold text-white">{formatMarketCap(selectedCompany.market_cap)}</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <div className="text-xs text-mist-500 mb-1">{t.companyFilterModal.currentPrice}</div>
                                                <div className="text-lg font-semibold text-white">${selectedCompany.price?.toFixed(2) || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* 7 Dimensions */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-mist-300 mb-3">{t.companyFilterModal.sevenDimDiagnosis}</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { label: t.companies.dimensions.strategicPositioning, value: selectedCompany.strategic_positioning },
                                                    { label: t.companies.dimensions.marketCapSize, value: selectedCompany.market_cap_size },
                                                    { label: t.companies.dimensions.cyclicalNature, value: selectedCompany.cyclical_nature },
                                                    { label: t.companies.dimensions.cashFlowStatus, value: selectedCompany.cash_flow_status },
                                                    { label: t.companies.dimensions.debtStructure, value: selectedCompany.debt_structure },
                                                    { label: t.companies.dimensions.externalSensitivity, value: selectedCompany.external_sensitivity },
                                                    { label: t.companies.dimensions.profitModel, value: selectedCompany.profit_model },
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
                                            {t.companyFilterModal.generateReport}
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
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                placeholder={t.companyFilterModal.searchPlaceholder}
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-mist-600 focus:outline-none focus:border-glacier-500/50"
                                            />
                                        </div>
                                        <div className="mt-2 text-sm text-mist-500">
                                            {t.companyFilterModal.foundCompanies(total)}
                                        </div>
                                    </div>

                                    {/* Company List */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-mist-500">{t.companyFilterModal.loadingText}</div>
                                            </div>
                                        ) : companies.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-center">
                                                    <div className="text-mist-500 mb-2">{t.companyFilterModal.noCompaniesFound}</div>
                                                    <button
                                                        onClick={resetFilters}
                                                        className="text-sm text-glacier-500 hover:text-glacier-400"
                                                    >
                                                        {t.companyFilterModal.resetFilters}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {companies.map((company) => (
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
                                    {!loading && companies.length > 0 && (
                                        <div className="p-6 border-t border-white/10 flex items-center justify-between">
                                            <button
                                                onClick={() => {
                                                    const newFilters = { ...filters, page: (filters.page || 1) - 1 };
                                                    setFilters(newFilters);
                                                    fetchCompanies(newFilters, searchQuery);
                                                }}
                                                disabled={(filters.page || 1) <= 1}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-mist-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t.common.prev}
                                            </button>
                                            <div className="text-sm text-mist-500">
                                                {t.companyFilterModal.page(filters.page || 1)}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newFilters = { ...filters, page: (filters.page || 1) + 1 };
                                                    setFilters(newFilters);
                                                    fetchCompanies(newFilters, searchQuery);
                                                }}
                                                disabled={(filters.page || 1) * (filters.limit || 50) >= total}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-mist-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t.common.next}
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
