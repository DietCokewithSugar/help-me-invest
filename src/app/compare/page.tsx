'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import { useCompare, type CompareCompany } from '@/contexts/CompareContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SearchIcon, XIcon } from '@/components/Icons';

interface SuggestionItem {
  symbol: string;
  market: string;
  name: string;
  nameCn: string;
  confidence?: number;
}

interface DetailedData {
  profile?: any;
  keyMetrics?: any[];
  financialRatios?: any[];
  incomeStatements?: any[];
  balanceSheets?: any[];
  cashFlowStatements?: any[];
}

type MetricBestDirection = 'higher' | 'lower' | 'neutral';

interface MetricConfig {
  key: string;
  label: string;
  getValue: (data: DetailedData) => number | string | null | undefined;
  format: (v: any) => string;
  best: MetricBestDirection;
}

function formatMarketCap(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'N/A';
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
}

function formatPercent(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'N/A';
  return `${(v * 100).toFixed(2)}%`;
}

function formatNumber(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'N/A';
  return v.toLocaleString();
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'N/A';
  return `$${v.toFixed(2)}`;
}

function formatRatio(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'N/A';
  return v.toFixed(2);
}

function formatString(v: any): string {
  if (v == null || v === '') return 'N/A';
  return String(v);
}

function findBestIndex(
  values: (number | null | undefined)[],
  direction: MetricBestDirection
): number | null {
  if (direction === 'neutral') return null;

  let bestIdx: number | null = null;
  let bestVal: number | null = null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null || isNaN(v)) continue;
    if (direction === 'lower' && v <= 0) continue;
    if (bestVal === null) {
      bestVal = v;
      bestIdx = i;
    } else if (direction === 'higher' && v > bestVal) {
      bestVal = v;
      bestIdx = i;
    } else if (direction === 'lower' && v < bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }

  return bestIdx;
}

export default function ComparePage() {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const { companies, addCompany, removeCompany, clearAll, isFull } = useCompare();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showContactModal, setShowContactModal] = useState(false);
  const [detailedData, setDetailedData] = useState<Record<string, DetailedData>>({});
  const [loadingData, setLoadingData] = useState<Record<string, boolean>>({});
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const fetchDetailedData = useCallback(async (symbol: string, market: string) => {
    if (detailedData[symbol] || loadingData[symbol]) return;
    setLoadingData(prev => ({ ...prev, [symbol]: true }));
    try {
      const response = await fetch('/api/fmp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, market, period: 'annual' }),
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDetailedData(prev => ({ ...prev, [symbol]: data }));
    } catch (err) {
      console.error(`Failed to fetch data for ${symbol}:`, err);
    } finally {
      setLoadingData(prev => ({ ...prev, [symbol]: false }));
    }
  }, [detailedData, loadingData]);

  useEffect(() => {
    companies.forEach(c => {
      if (!detailedData[c.symbol] && !loadingData[c.symbol]) {
        fetchDetailedData(c.symbol, c.market);
      }
    });
  }, [companies]);

  useEffect(() => {
    if (activeSlot !== null && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeSlot]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/symbol-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim(), language: locale }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: SuggestionItem) => {
    const newCompany: CompareCompany = {
      symbol: suggestion.symbol,
      companyName: locale === 'zh' && suggestion.nameCn ? suggestion.nameCn : suggestion.name,
      market: suggestion.market,
    };

    addCompany(newCompany);
    setActiveSlot(null);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleSlotClick = (index: number) => {
    if (companies[index]) return;
    setActiveSlot(activeSlot === index ? null : index);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleRemove = (symbol: string) => {
    removeCompany(symbol);
    setDetailedData(prev => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  };

  const buildMetricSections = (): { title: string; metrics: MetricConfig[] }[] => {
    const m = t.compare.metrics;
    return [
      {
        title: t.compare.sections.basicInfo,
        metrics: [
          { key: 'marketCap', label: m.marketCap, getValue: d => d.profile?.mktCap, format: formatMarketCap, best: 'higher' },
          { key: 'sector', label: m.sector, getValue: d => d.profile?.sector, format: formatString, best: 'neutral' },
          { key: 'industry', label: m.industry, getValue: d => d.profile?.industry, format: formatString, best: 'neutral' },
          { key: 'employees', label: m.employees, getValue: d => d.profile?.fullTimeEmployees, format: formatNumber, best: 'neutral' },
          { key: 'ceo', label: m.ceo, getValue: d => d.profile?.ceo, format: formatString, best: 'neutral' },
          { key: 'country', label: m.country, getValue: d => d.profile?.country, format: formatString, best: 'neutral' },
          { key: 'exchange', label: m.exchange, getValue: d => d.profile?.exchangeShortName, format: formatString, best: 'neutral' },
          { key: 'ipo', label: m.ipo, getValue: d => d.profile?.ipoDate, format: formatString, best: 'neutral' },
          { key: 'beta', label: m.beta, getValue: d => d.profile?.beta, format: formatRatio, best: 'neutral' },
        ],
      },
      {
        title: t.compare.sections.valuation,
        metrics: [
          { key: 'pe', label: m.pe, getValue: d => d.financialRatios?.[0]?.priceEarningsRatio, format: formatRatio, best: 'lower' },
          { key: 'pb', label: m.pb, getValue: d => d.financialRatios?.[0]?.priceToBookRatio, format: formatRatio, best: 'lower' },
          { key: 'ps', label: m.ps, getValue: d => d.financialRatios?.[0]?.priceToSalesRatio, format: formatRatio, best: 'lower' },
          { key: 'evEbitda', label: m.evEbitda, getValue: d => d.keyMetrics?.[0]?.enterpriseValueOverEBITDA, format: formatRatio, best: 'lower' },
          { key: 'dividendYield', label: m.dividendYield, getValue: d => d.financialRatios?.[0]?.dividendYield, format: formatPercent, best: 'higher' },
        ],
      },
      {
        title: t.compare.sections.profitability,
        metrics: [
          { key: 'roe', label: m.roe, getValue: d => d.financialRatios?.[0]?.returnOnEquity, format: formatPercent, best: 'higher' },
          { key: 'roa', label: m.roa, getValue: d => d.financialRatios?.[0]?.returnOnAssets, format: formatPercent, best: 'higher' },
          { key: 'grossMargin', label: m.grossMargin, getValue: d => d.financialRatios?.[0]?.grossProfitMargin, format: formatPercent, best: 'higher' },
          { key: 'operatingMargin', label: m.operatingMargin, getValue: d => d.financialRatios?.[0]?.operatingProfitMargin, format: formatPercent, best: 'higher' },
          { key: 'netMargin', label: m.netMargin, getValue: d => d.financialRatios?.[0]?.netProfitMargin, format: formatPercent, best: 'higher' },
        ],
      },
      {
        title: t.compare.sections.growth,
        metrics: [
          { key: 'revenueGrowth', label: m.revenueGrowth, getValue: d => {
            const stmts = d.incomeStatements;
            if (!stmts || stmts.length < 2) return null;
            const curr = stmts[0]?.revenue;
            const prev = stmts[1]?.revenue;
            if (!curr || !prev || prev === 0) return null;
            return (curr - prev) / Math.abs(prev);
          }, format: formatPercent, best: 'higher' },
          { key: 'netIncomeGrowth', label: m.netIncomeGrowth, getValue: d => {
            const stmts = d.incomeStatements;
            if (!stmts || stmts.length < 2) return null;
            const curr = stmts[0]?.netIncome;
            const prev = stmts[1]?.netIncome;
            if (!curr || !prev || prev === 0) return null;
            return (curr - prev) / Math.abs(prev);
          }, format: formatPercent, best: 'higher' },
        ],
      },
      {
        title: t.compare.sections.financial,
        metrics: [
          { key: 'debtToEquity', label: m.debtToEquity, getValue: d => d.financialRatios?.[0]?.debtEquityRatio, format: formatRatio, best: 'lower' },
          { key: 'currentRatio', label: m.currentRatio, getValue: d => d.financialRatios?.[0]?.currentRatio, format: formatRatio, best: 'higher' },
          { key: 'revenue', label: m.revenue, getValue: d => d.incomeStatements?.[0]?.revenue, format: formatMarketCap, best: 'higher' },
          { key: 'netIncome', label: m.netIncome, getValue: d => d.incomeStatements?.[0]?.netIncome, format: formatMarketCap, best: 'higher' },
          { key: 'freeCashFlow', label: m.freeCashFlow, getValue: d => d.cashFlowStatements?.[0]?.freeCashFlow, format: formatMarketCap, best: 'higher' },
        ],
      },
    ];
  };

  const slots = [0, 1, 2];
  const metricSections = buildMetricSections();

  return (
    <div className="min-h-screen bg-main-bg transition-colors duration-200">
      <div className="fixed inset-0 bg-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onReset={() => router.push('/')}
        showContactModal={() => setShowContactModal(true)}
      />

      <div className="pt-32 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
                {t.compare.title}
              </h2>
              <p className="text-text-secondary">
                {t.compare.subtitle}
              </p>
            </div>
            {companies.length > 0 && (
              <button
                onClick={() => {
                  clearAll();
                  setDetailedData({});
                }}
                className="text-sm text-text-muted hover:text-red-400 transition-colors font-mono"
              >
                {t.compare.clearAll}
              </button>
            )}
          </div>

          {/* Company Slots */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {slots.map((idx) => {
              const company = companies[idx];
              const data = company ? detailedData[company.symbol] : null;
              const isLoading = company ? loadingData[company.symbol] : false;
              const isActive = activeSlot === idx;
              const profile = data?.profile;

              if (company) {
                return (
                  <motion.div
                    key={`slot-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-5 rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 relative"
                  >
                    <button
                      onClick={() => handleRemove(company.symbol)}
                      className="absolute top-3 right-3 p-1 rounded-sm bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-text-muted transition-colors"
                      title={t.compare.remove}
                    >
                      <XIcon size={14} />
                    </button>

                    <div className="flex items-center gap-3 mb-3">
                      {profile?.image ? (
                        <img
                          src={profile.image}
                          alt={company.companyName}
                          className="w-10 h-10 rounded-sm object-contain bg-white/5 p-1"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-text-muted font-mono text-xs">
                          {company.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-text-primary truncate text-sm">
                          {profile?.companyName || company.companyName}
                        </div>
                        <div className="text-xs font-mono text-accent">
                          {company.symbol}
                        </div>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="text-xs text-text-muted font-mono animate-pulse">
                        {t.compare.loadingData}
                      </div>
                    ) : profile ? (
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono font-bold text-text-primary text-lg">
                          {formatCurrency(profile.price)}
                        </span>
                        <span className={`font-mono text-sm ${
                          (profile.changes ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}>
                          {profile.changes != null ? `${profile.changes >= 0 ? '+' : ''}${profile.changes.toFixed(2)}%` : ''}
                        </span>
                      </div>
                    ) : null}
                  </motion.div>
                );
              }

              return (
                <div key={`slot-${idx}`} className="relative">
                  <button
                    onClick={() => handleSlotClick(idx)}
                    className={`w-full p-5 rounded-sm border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 min-h-[120px] ${
                      isActive
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-white/10 hover:border-white/20 bg-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-accent/20 text-accent' : 'bg-white/5 text-text-muted'
                    }`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <span className="text-xs text-text-muted">
                      {t.compare.emptySlot}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-2 z-20"
                      >
                        <div className="glass-card rounded-sm border border-white/10 shadow-xl overflow-hidden">
                          <div className="flex items-center gap-2 p-3 border-b border-white/5">
                            <SearchIcon size={14} className="text-text-muted flex-shrink-0" />
                            <input
                              ref={searchInputRef}
                              type="text"
                              value={searchQuery}
                              onChange={(e) => handleSearchChange(e.target.value)}
                              placeholder={t.compare.searchPlaceholder}
                              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setActiveSlot(null);
                                  setSearchQuery('');
                                  setSuggestions([]);
                                }
                              }}
                            />
                            {searchLoading && (
                              <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>

                          {suggestions.length > 0 && (
                            <div className="max-h-48 overflow-y-auto">
                              {suggestions.map((s) => (
                                <button
                                  key={`${s.symbol}-${s.market}`}
                                  onClick={() => handleSelectSuggestion(s)}
                                  className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-mono text-sm text-accent">{s.symbol}</span>
                                    <span className="text-xs text-text-secondary ml-2">
                                      {locale === 'zh' && s.nameCn ? s.nameCn : s.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded-sm bg-white/5">
                                    {s.market}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchQuery.length >= 2 && suggestions.length === 0 && !searchLoading && (
                            <div className="p-3 text-xs text-text-muted text-center">
                              {t.common.noResults}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          {companies.length >= 2 ? (
            <div className="space-y-6">
              {metricSections.map((section) => (
                <div key={section.title} className="glass-card rounded-sm border border-white/10 dark:border-white/10 light:border-black/5 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {section.metrics.map((metric) => {
                      const values = companies.map(c => {
                        const d = detailedData[c.symbol];
                        if (!d) return null;
                        return metric.getValue(d);
                      });

                      const numericValues = values.map(v =>
                        typeof v === 'number' ? v : null
                      );
                      const bestIdx = findBestIndex(numericValues, metric.best);

                      return (
                        <div
                          key={metric.key}
                          className="grid items-center hover:bg-white/[0.02] transition-colors"
                          style={{
                            gridTemplateColumns: `minmax(140px, 1fr) repeat(${companies.length}, minmax(0, 1fr))`,
                          }}
                        >
                          <div className="px-5 py-3 text-xs text-text-secondary">
                            {metric.label}
                          </div>
                          {companies.map((c, i) => {
                            const d = detailedData[c.symbol];
                            const isLoading = loadingData[c.symbol];
                            const isBest = bestIdx === i;

                            if (isLoading || !d) {
                              return (
                                <div key={c.symbol} className="px-5 py-3 text-xs font-mono text-text-muted">
                                  {isLoading ? '...' : 'N/A'}
                                </div>
                              );
                            }

                            const raw = metric.getValue(d);
                            const formatted = metric.format(raw);

                            return (
                              <div
                                key={c.symbol}
                                className={`px-5 py-3 text-xs font-mono ${
                                  isBest ? 'text-glacier-500 font-bold' : 'text-text-primary'
                                }`}
                              >
                                {formatted}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 rounded-sm border border-white/10 text-center">
              <div className="text-text-muted font-mono text-sm">
                {t.compare.noCompanies}
              </div>
            </div>
          )}
        </div>
      </div>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title={t.home.contact.title}
        scanQr={t.home.contact.scanQr}
        lookForward={t.home.contact.lookForward}
        wechatLabel={t.home.faq.wechat}
        emailLabel={t.home.faq.email}
      />
    </div>
  );
}
