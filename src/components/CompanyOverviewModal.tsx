'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    XIcon,
    TrendingUpIcon,
    ChevronRightIcon,
} from '@/components/Icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompare } from '@/contexts/CompareContext';
import type { CompanyDiagnostic, CompanyFilterRequest } from '@/types';
import {
    getLocalizedDiagnostic,
    getLocalizedReasoning,
    type DiagnosticDimensionField,
} from '@/i18n/diagnosticTags';

const DIMENSION_KEYS = [
    'strategicPositioning',
    'marketCapSize',
    'cyclicalNature',
    'cashFlowStatus',
    'debtStructure',
    'externalSensitivity',
    'profitModel',
] as const;

const DIMENSION_FIELD_MAP: Record<typeof DIMENSION_KEYS[number], DiagnosticDimensionField> = {
    strategicPositioning: 'strategic_positioning',
    marketCapSize: 'market_cap_size',
    cyclicalNature: 'cyclical_nature',
    cashFlowStatus: 'cash_flow_status',
    debtStructure: 'debt_structure',
    externalSensitivity: 'external_sensitivity',
    profitModel: 'profit_model',
};

// 维度值对应的颜色
const DIMENSION_VALUE_COLORS: Record<string, string> = {
    // 战略定位
    '开拓者': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '稳固者': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    '分红者': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    // 市场体量
    '实力股': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    '潜力股': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    '弹簧股': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    // 周期特性
    '防御型': 'bg-green-500/20 text-green-400 border-green-500/30',
    '周期型': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    '探险型': 'bg-red-500/20 text-red-400 border-red-500/30',
    // 资金状况
    '健康型': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    '贫血型': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    // 债务结构
    '轻装型': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    '平衡型': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    '背债型': 'bg-red-500/20 text-red-400 border-red-500/30',
    // 外部敏感点
    '政策型': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    '汇率型': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    '内功型': 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    // 盈利模式
    '薄利多销型': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    '高利少销型': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    '坐地收租型': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    '烧钱圈地型': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

interface CompanyOverviewModalProps {
    company: CompanyDiagnostic | null;
    isOpen: boolean;
    onClose: () => void;
    currentFilters?: CompanyFilterRequest;
    onCompanyChange?: (company: CompanyDiagnostic) => void;
}

export default function CompanyOverviewModal({
    company,
    isOpen,
    onClose,
    currentFilters,
    onCompanyChange,
}: CompanyOverviewModalProps) {
    const router = useRouter();
    const { t, locale } = useLanguage();
    const { addCompany, isInCompare, isFull } = useCompare();
    const [relatedCompanies, setRelatedCompanies] = useState<CompanyDiagnostic[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);

    // 获取相关公司
    useEffect(() => {
        if (isOpen && company) {
            fetchRelatedCompanies();
        }
    }, [isOpen, company?.symbol]);

    const fetchRelatedCompanies = async () => {
        if (!company) return;

        setLoadingRelated(true);
        try {
            const response = await fetch('/api/companies/related', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: company.symbol,
                    filters: currentFilters,
                    limit: 5,
                }),
            });
            const data = await response.json();
            if (data.success) {
                setRelatedCompanies(data.data);
            }
        } catch (error) {
            console.error('获取相关公司失败:', error);
        } finally {
            setLoadingRelated(false);
        }
    };

    // 格式化市值
    const formatMarketCap = (marketCap: number | null) => {
        if (!marketCap) return 'N/A';
        if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
        if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
        if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
        return `$${marketCap.toFixed(0)}`;
    };

    // 导航到报告页面
    const handleGenerateReport = (symbol: string) => {
        router.push(`/companies/${encodeURIComponent(symbol)}`);
        onClose();
    };

    // 打开相关公司的概述
    const handleRelatedCompanyClick = (relatedCompany: CompanyDiagnostic) => {
        // 通过 callback 触发切换到新公司的概述页面
        if (onCompanyChange) {
            onCompanyChange(relatedCompany);
        }
    };

    // Returns both the localized display label and the legacy Chinese value.
    // The Chinese value drives the DIMENSION_VALUE_COLORS color lookup so that
    // colors stay stable across languages.
    const getDimensionValue = (dimKey: typeof DIMENSION_KEYS[number]) => {
        if (!company) return null;
        const fieldName = DIMENSION_FIELD_MAP[dimKey];
        const colorKey = (company[fieldName as keyof CompanyDiagnostic] as string | null) || null;
        const display = getLocalizedDiagnostic(company, fieldName, locale);
        if (!display && !colorKey) return null;
        return { display: display || colorKey || '', colorKey: colorKey || '' };
    };

    const localizedReasoning = getLocalizedReasoning(company, locale);

    if (!company) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative bg-surface rounded-sm border border-white/10 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 border-b border-white/5">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono text-lg font-bold text-accent bg-accent/10 px-2 py-1 rounded-sm">
                                        {company.symbol}
                                    </span>
                                    <span className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-sm">
                                        {company.exchange_short_name}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-text-primary mb-2">
                                    {company.company_name}
                                </h2>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-text-secondary">{company.sector}</span>
                                    <span className="text-text-muted">•</span>
                                    <span className="text-text-muted">{company.industry}</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-sm bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <XIcon size={18} className="text-text-muted" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* 基本信息 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/5 p-4 rounded-sm border border-white/5">
                                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t.common.marketCap}</div>
                                    <div className="text-lg font-mono font-bold text-text-primary">
                                        {formatMarketCap(company.market_cap)}
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-sm border border-white/5">
                                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t.common.price}</div>
                                    <div className="text-lg font-mono font-bold text-text-primary">
                                        ${company.price?.toFixed(2) || 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-sm border border-white/5">
                                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t.companyOverviewModal.beta}</div>
                                    <div className="text-lg font-mono font-bold text-text-primary">
                                        {company.beta?.toFixed(2) || 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-sm border border-white/5">
                                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t.companyOverviewModal.annualDividend}</div>
                                    <div className="text-lg font-mono font-bold text-text-primary">
                                        ${company.last_annual_dividend?.toFixed(2) || '0.00'}
                                    </div>
                                </div>
                            </div>

                            {/* 7个诊断维度 */}
                            <div>
                                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-accent rounded-full"></span>
                                    {t.companyOverviewModal.aiDiagnosis}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {DIMENSION_KEYS.map((dimKey) => {
                                        const value = getDimensionValue(dimKey);
                                        if (!value) return null;
                                        const colorClass = DIMENSION_VALUE_COLORS[value.colorKey] || 'bg-white/10 text-text-secondary border-white/10';
                                        return (
                                            <div
                                                key={dimKey}
                                                className="flex items-center justify-between p-3 bg-white/[0.02] rounded-sm border border-white/5 hover:bg-white/5 transition-colors"
                                            >
                                                <div>
                                                    <div className="text-xs text-text-secondary mb-0.5">{t.companyOverviewModal.dimLabels[dimKey]}</div>
                                                    <div className="text-[10px] text-text-muted">{t.companyOverviewModal.dimDescs[dimKey]}</div>
                                                </div>
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-sm border ${colorClass}`}>
                                                    {value.display}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AI 分析摘要 */}
                            {localizedReasoning && (
                                <div>
                                    <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-accent rounded-full"></span>
                                        {t.companyOverviewModal.aiSummary}
                                    </h3>
                                    <div className="bg-white/[0.02] p-4 rounded-sm border border-white/5">
                                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                                            {localizedReasoning}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 相关公司推荐 */}
                            <div>
                                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-accent rounded-full"></span>
                                    {t.companyOverviewModal.relatedCompanies}
                                    <span className="text-xs font-normal text-text-muted ml-1">
                                        {t.companyOverviewModal.basedOnFilters}
                                    </span>
                                </h3>
                                {loadingRelated ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="text-text-muted font-mono text-xs animate-pulse">
                                            {t.companyOverviewModal.loading}
                                        </div>
                                    </div>
                                ) : relatedCompanies.length > 0 ? (
                                    <div className="space-y-2">
                                        {relatedCompanies.map((related) => (
                                            <div
                                                key={related.id}
                                                className="flex items-center justify-between p-3 bg-white/[0.02] rounded-sm border border-white/5 hover:bg-white/5 hover:border-accent/30 transition-all cursor-pointer group"
                                                onClick={() => handleRelatedCompanyClick(related)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded-sm">
                                                        {related.symbol}
                                                    </span>
                                                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors line-clamp-1">
                                                        {related.company_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs text-text-muted">
                                                        {formatMarketCap(related.market_cap)}
                                                    </span>
                                                    <ChevronRightIcon size={14} className="text-text-muted group-hover:text-accent transition-colors" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-text-muted text-xs">
                                        {t.companyOverviewModal.noRelated}
                                    </div>
                                )}
                            </div>

                            {/* 数据来源 - 只展示第一个 */}
                            {company.sources && company.sources.length > 0 && (
                                <div className="pt-2 border-t border-white/5">
                                    <span className="text-[10px] text-text-muted">
                                        {t.companyOverviewModal.dataSource(company.sources[0])}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Footer - Compare & Report buttons */}
                        <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        if (company) {
                                            addCompany({
                                                symbol: company.symbol,
                                                companyName: company.company_name || '',
                                                market: 'US',
                                                price: company.price || undefined,
                                                marketCap: company.market_cap || undefined,
                                                sector: company.sector || undefined,
                                                industry: company.industry || undefined,
                                            });
                                        }
                                    }}
                                    disabled={!company || isInCompare(company?.symbol || '') || isFull}
                                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-mist-300 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                >
                                    {company && isInCompare(company.symbol) ? t.compare.alreadyInCompare : t.compare.addToCompare}
                                </button>
                                <button
                                    onClick={() => handleGenerateReport(company.symbol)}
                                    className="flex-1 px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-sm font-semibold transition-all"
                                >
                                    {t.companyOverviewModal.generateReport}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
