'use client';

import { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { MarketType } from '@/types';
import { MARKET_CONFIGS, detectMarketFromSymbol, formatSymbolForMarket, getMarketConfig } from '@/lib/markets';
import { getSupabaseClient, isSupabaseClientConfigured } from '@/lib/supabase-client';
import {
  TrendingUpIcon,
  Globe2Icon,
  ArrowRightIcon,
  FlameIcon,
  ClockIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  DollarSignIcon,
  MessageCircleIcon,
  XIcon,
} from '@/components/Icons';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import { useLanguage } from '@/contexts/LanguageContext';

const AIShowcase = lazy(() => import('@/components/AIShowcase'));
const Testimonials = lazy(() => import('@/components/Testimonials'));
const FlipCounter = lazy(() => import('@/components/FlipCounter'));

interface TrendingStock {
  symbol: string;
  company_name: string | null;
  total_searches: number;
  last_searched: string;
}

interface SymbolSuggestion {
  symbol: string;
  market: MarketType;
  name?: string;
  nameCn?: string;
  confidence?: number;
}

// Convert full-width chars to half-width and strip spaces (handles CJK IME input).
function normalizeSymbol(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0xff01 && code <= 0xff5e) {
      result += String.fromCharCode(code - 0xfee0);
    } else if (code === 0x3000 || code === 0x20) {
      // skip
    } else {
      result += input[i];
    }
  }
  return result.toUpperCase();
}

// 热门股票展示列表（每个市场至少有一个代表）
const FEATURED_STOCK_SYMBOLS = [
  'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL',
  '600519.SS', '000858.SZ', '0700.HK', '9988.HK', '7203.T',
  '005930.KS', '035720.KS', 'CBA.AX', 'BHP.AX',
];

function GeminiLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-glacier-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-blue animate-bounce" style={{ animationDelay: '100ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-purple animate-bounce" style={{ animationDelay: '200ms' }} />
      <div className="w-3 h-3 rounded-full bg-aurora-3 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

interface SearchHistoryItem {
  symbol: string;
  name?: string;
  timestamp: number;
}

const SEARCH_HISTORY_KEY = 'search-history';
const MAX_SEARCH_HISTORY = 8;

function getSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history: SearchHistoryItem[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_SEARCH_HISTORY)));
  } catch {
    // localStorage unavailable; ignore.
  }
}

function removeFromSearchHistory(symbol: string) {
  const history = getSearchHistory();
  saveSearchHistory(history.filter((item) => item.symbol !== symbol));
}

function clearSearchHistory() {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // ignore
  }
}

function HomeContent() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [symbol, setSymbol] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('US');
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [reportType, setReportType] = useState<'beginner' | 'standard' | 'pro'>('standard');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestContainerRef = useRef<HTMLDivElement>(null);

  const featuredStocks = FEATURED_STOCK_SYMBOLS.map((sym) => ({
    symbol: sym,
    name: (t.home.featuredStocks as Record<string, string>)[sym] || sym,
  }));

  const coreAdvantages = [
    { id: 'ai-logic', number: t.home.features.one, title: t.home.features.feature1Title, description: t.home.features.feature1Desc },
    { id: 'multi-source', number: t.home.features.two, title: t.home.features.feature2Title, description: t.home.features.feature2Desc },
    { id: 'minimalist', number: t.home.features.three, title: t.home.features.feature3Title, description: t.home.features.feature3Desc },
  ];

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  const currentMarketConfig = getMarketConfig(selectedMarket);

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

  useEffect(() => {
    if (symbol) return;
    const interval = setInterval(() => {
      setCurrentStockIndex((prev) => (prev + 1) % FEATURED_STOCK_SYMBOLS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestContainerRef.current && !suggestContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/trending?period=week&limit=8');
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setTrendingStocks(data.data);
        }
      } catch {
        console.log('获取热门榜单失败，使用默认列表');
      }
    };
    fetchTrending();
  }, []);

  const fetchReportCount = useCallback(async () => {
    try {
      const response = await fetch('/api/report-count');
      const data = await response.json();
      if (data.success && typeof data.count === 'number') {
        setReportCount(data.count);
      }
    } catch (err) {
      console.log('获取研报总数失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchReportCount();

    if (!isSupabaseClientConfigured) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel('report-count-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'search_records', filter: 'is_valid=eq.true' },
        () => setReportCount((prev) => (prev !== null ? prev + 1 : 1))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'search_records' },
        (payload) => {
          const oldValid = payload.old?.is_valid;
          const newValid = payload.new?.is_valid;
          if (oldValid === true && newValid === false) {
            setReportCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
          } else if (oldValid === false && newValid === true) {
            setReportCount((prev) => (prev !== null ? prev + 1 : 1));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'search_records' },
        (payload) => {
          if (payload.old?.is_valid === true) {
            setReportCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReportCount]);

  // Symbol suggestion / autocomplete
  useEffect(() => {
    const query = symbol.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestLoading(false);
      return;
    }

    const marketHint = query.includes('.') ? detectMarketFromSymbol(query) : undefined;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const response = await fetch('/api/symbol-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, market: marketHint, language: locale }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!controller.signal.aborted) {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setShowSuggestions(true);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSuggestLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [symbol, locale]);

  const goToReport = (rawSymbol: string, marketHint?: MarketType) => {
    const normalized = normalizeSymbol(rawSymbol);
    if (!normalized) {
      inputRef.current?.focus();
      return;
    }

    let market = marketHint || selectedMarket;
    let formatted = normalized;
    if (!normalized.includes('.') && /^\d{6}$/.test(normalized)) {
      market = 'CN';
      formatted = formatSymbolForMarket(normalized, 'CN');
    } else if (normalized.includes('.')) {
      market = detectMarketFromSymbol(normalized);
      formatted = formatSymbolForMarket(normalized, market);
    } else if (normalized.includes('.') === false && /^\d{4,5}$/.test(normalized)) {
      market = marketHint || selectedMarket;
      formatted = formatSymbolForMarket(normalized, market);
    }

    const query = reportType !== 'standard' ? `?type=${reportType}` : '';
    router.push(`/companies/${encodeURIComponent(formatted)}${query}`);
  };

  const handleSelectSuggestion = (item: SymbolSuggestion) => {
    setSelectedMarket(item.market);
    setSymbol(item.symbol);
    setShowSuggestions(false);
    goToReport(item.symbol, item.market);
  };

  const handleSubmit = () => {
    const trimmedSymbol = normalizeSymbol(symbol);
    if (!trimmedSymbol) {
      inputRef.current?.focus();
      return;
    }
    // If suggestion list is open and has a top hit without an explicit market, prefer it.
    if (!trimmedSymbol.includes('.') && suggestions.length > 0) {
      const best = suggestions[0];
      goToReport(best.symbol, best.market);
      return;
    }
    goToReport(trimmedSymbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main className="min-h-screen">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        showContactModal={() => setShowContactModal(true)}
      />

      <section className="pt-28 md:pt-32 pb-16 md:pb-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mt-12 md:mt-14 mb-12 md:mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light text-white mb-6 md:mb-8 leading-tight tracking-tight">
              {t.home.hero.title}
              <br className="md:hidden" />
              <span className="gradient-text font-normal">{t.home.hero.titleHighlight}</span>
            </h2>
            <p className="text-base md:text-xl text-mist-400 max-w-2xl mx-auto leading-relaxed px-4">
              {t.home.hero.subtitle1}
              <br className="hidden md:block" />
              <span className="text-mist-500">{t.home.hero.subtitle2}</span>
            </p>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4 text-sm text-mist-500 px-1">
              <Globe2Icon size={14} className="text-glacier-500/70" />
              <span>
                {t.home.search.aiMarketDetect}
                {currentMarketConfig.nameCn}
              </span>
            </div>

            <div className="flex items-center justify-start gap-2 mb-3">
              {[
                { value: 'beginner', label: t.home.reportTypeSelector.beginner, desc: t.home.reportTypeSelector.beginnerDesc },
                { value: 'standard', label: t.home.reportTypeSelector.standard, desc: t.home.reportTypeSelector.standardDesc },
                { value: 'pro', label: t.home.reportTypeSelector.pro, desc: t.home.reportTypeSelector.proDesc },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value as 'beginner' | 'standard' | 'pro')}
                  className={`px-3 py-1.5 rounded-sm text-xs transition-all border ${
                    reportType === type.value
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-white/5 border-transparent text-text-muted hover:text-text-secondary hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{type.desc}</div>
                </button>
              ))}
            </div>

            <div ref={suggestContainerRef} className="relative mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={symbol}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setSymbol(isComposing ? nextValue : normalizeSymbol(nextValue));
                      setShowSuggestions(true);
                    }}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(e) => {
                      setIsComposing(false);
                      setSymbol(normalizeSymbol(e.currentTarget.value));
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder=""
                    className="gemini-input w-full px-5 py-4 text-base md:text-lg font-mono"
                  />
                  {!symbol && (
                    <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden h-6">
                      <div
                        className="transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateY(-${currentStockIndex * 24}px)` }}
                      >
                        {featuredStocks.map((stock, index) => (
                          <div
                            key={index}
                            className="h-6 flex items-center whitespace-nowrap text-mist-600 text-base md:text-lg"
                          >
                            <span className="font-mono shrink-0">{stock.symbol}</span>
                            <span className="mx-2 text-mist-700 shrink-0">·</span>
                            <span className="text-mist-600 truncate">{stock.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {showSuggestions && symbol.trim().length >= 2 && (
                      <motion.div
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-md border border-white/10 bg-surface/95 shadow-xl backdrop-blur-md"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="border-b border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wide text-mist-500">
                          {t.home.search.suggestions}
                        </div>
                        {suggestLoading && (
                          <div className="px-4 py-3">
                            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                              <div className="h-full w-1/3 rounded-full bg-glacier-500 animate-bounce-horizontal" />
                            </div>
                          </div>
                        )}
                        <div className="max-h-64 overflow-y-auto">
                          {suggestions.map((item) => (
                            <button
                              key={`${item.market}-${item.symbol}`}
                              onClick={() => handleSelectSuggestion(item)}
                              className="group flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 last:border-b-0"
                            >
                              <span className="font-mono text-sm text-mist-200 group-hover:text-white">{item.symbol}</span>
                              <span className="rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-mist-500">
                                {MARKET_CONFIGS[item.market]?.nameCn || item.market}
                              </span>
                              {(item.nameCn || item.name) && (
                                <span className="truncate text-sm text-mist-400 group-hover:text-mist-300">
                                  {locale === 'en' ? (item.name || item.nameCn) : (item.nameCn || item.name)}
                                </span>
                              )}
                            </button>
                          ))}
                          {suggestions.length === 0 && !suggestLoading && (
                            <div className="px-4 py-3 text-sm text-mist-500">{t.home.search.noMatch}</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleSubmit}
                  className="gemini-btn gemini-btn-primary flex items-center justify-center gap-2 md:gap-3 min-w-[140px] md:min-w-[160px] py-4 text-base md:text-lg"
                >
                  <TrendingUpIcon size={20} />
                  <span>{t.home.search.startAnalysis}</span>
                  <ArrowRightIcon size={16} className="opacity-70 hidden sm:block" />
                </button>
              </div>
            </div>

            {searchHistory.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <ClockIcon size={14} className="text-mist-500" />
                  <span className="text-sm text-mist-500">{t.home.search.searchHistory}</span>
                  <button
                    onClick={() => {
                      clearSearchHistory();
                      setSearchHistory([]);
                    }}
                    className="ml-auto text-xs text-mist-600 hover:text-mist-400 transition-colors"
                  >
                    {t.home.search.clearAll}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {searchHistory.slice(0, 6).map((item) => (
                    <div
                      key={item.symbol}
                      className="group relative flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                    >
                      <button
                        onClick={() => goToReport(item.symbol)}
                        className="flex items-center gap-2"
                      >
                        <span className="font-mono text-sm text-mist-300 group-hover:text-white transition-colors">{item.symbol}</span>
                        {item.name && <span className="text-xs text-mist-600 hidden sm:inline">{item.name}</span>}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromSearchHistory(item.symbol);
                          setSearchHistory(getSearchHistory());
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-md text-mist-700 hover:text-mist-300 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
                        title={t.common.delete}
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {trendingStocks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FlameIcon size={14} className="text-mist-500" />
                    <span className="text-sm text-mist-500">{t.home.search.trendingThisWeek}</span>
                    <div className="flex items-center gap-1 ml-auto text-xs text-mist-600">
                      <ClockIcon size={11} />
                      <span className="hidden sm:inline">{t.home.search.realtimeUpdate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {trendingStocks.slice(0, 6).map((stock, index) => (
                      <button
                        key={stock.symbol}
                        onClick={() => goToReport(stock.symbol)}
                        className="group relative px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-mist-600">#{index + 1}</span>
                          <span className="font-mono text-sm text-mist-300 group-hover:text-white transition-colors">
                            {stock.symbol}
                          </span>
                        </div>
                        {stock.company_name && (
                          <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-[#1a1a24] border border-white/[0.06] text-xs text-mist-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                            {stock.company_name}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap text-sm px-1">
                <span className="text-mist-600">{t.home.search.marketHot(currentMarketConfig.nameCn)}</span>
                {currentMarketConfig.featuredStocks.slice(0, 5).map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => goToReport(stock.symbol, currentMarketConfig.id)}
                    className="stock-chip"
                  >
                    <span className="font-mono">{stock.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 核心优势区 */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.features.title}</h3>
            <p className="text-mist-500 text-sm md:text-base">{t.home.features.subtitle}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {coreAdvantages.map((advantage, index) => (
              <motion.div
                key={advantage.id}
                className="feature-card group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="cn-number mb-6">{advantage.number}</div>
                <h4 className="text-xl font-medium text-white mb-3">{advantage.title}</h4>
                <p className="text-mist-400 leading-relaxed text-[15px]">{advantage.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI 能力展示 */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.aiShowcase.title}</h3>
            <p className="text-mist-500 text-sm md:text-base">{t.home.aiShowcase.displayTitle}</p>
          </motion.div>
          <Suspense
            fallback={
              <div className="glass-card p-12 flex items-center justify-center">
                <GeminiLoader />
              </div>
            }
          >
            <AIShowcase />
          </Suspense>
        </div>
      </section>

      {/* 市场覆盖 */}
      <section className="py-16 md:py-24 px-4 md:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-6">{t.home.globalVision.title}</h3>
              <p className="text-mist-400 leading-relaxed mb-10 text-[15px] md:text-base max-w-2xl mx-auto">
                {t.home.globalVision.subtitle}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
                {[
                  { name: t.markets.us, code: 'NYSE / NASDAQ', color: '#4285f4' },
                  { name: t.markets.cn, code: 'SSE / SZSE', color: '#ea4335' },
                  { name: t.markets.hk, code: 'HKEX', color: '#fbbc04' },
                  { name: t.markets.jp, code: 'TSE', color: '#34a853' },
                  { name: t.markets.kr, code: 'KRX', color: '#a855f7' },
                  { name: t.markets.au, code: 'ASX', color: '#00acc1' },
                ].map((market) => (
                  <div
                    key={market.name}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-colors"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: market.color }} />
                    <div>
                      <div className="text-white font-medium text-sm">{market.name}</div>
                      <div className="text-mist-600 text-xs">{market.code}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.testimonials.title}</h3>
            <p className="text-mist-500 text-sm md:text-base">{t.home.testimonials.subtitle}</p>
          </motion.div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <GeminiLoader />
              </div>
            }
          >
            <Testimonials />
          </Suspense>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.faq.title}</h3>
          </motion.div>

          <div className="space-y-4">
            {/* 如何使用 */}
            <motion.div
              className="bg-white/5 border border-white/10 rounded-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === 0 ? null : 0)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-sm bg-glacier-500/10 border border-glacier-500/20 flex items-center justify-center flex-shrink-0 text-glacier-500">
                    <HelpCircleIcon size={16} />
                  </div>
                  <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">
                    {t.home.faq.q1}
                  </span>
                </div>
                <ChevronDownIcon
                  size={16}
                  className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${
                    expandedFaq === 0 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {expandedFaq === 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/5">
                      <p className="text-mist-400 leading-relaxed text-sm">{t.home.faq.a1_1}</p>
                      <p className="text-mist-400 leading-relaxed text-sm">{t.home.faq.a1_2}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* 收费 */}
            <motion.div
              className="bg-white/5 border border-white/10 rounded-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-sm bg-gemini-purple/10 border border-gemini-purple/20 flex items-center justify-center flex-shrink-0 text-gemini-purple">
                    <DollarSignIcon size={16} />
                  </div>
                  <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">
                    {t.home.faq.q2}
                  </span>
                </div>
                <ChevronDownIcon
                  size={16}
                  className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${
                    expandedFaq === 1 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {expandedFaq === 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/5">
                      <p className="text-mist-400 leading-relaxed text-sm">{t.home.faq.a2_1}</p>
                      <p className="text-mist-400 leading-relaxed text-sm">{t.home.faq.a2_2}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* 联系作者 */}
            <motion.div
              className="bg-white/5 border border-white/10 rounded-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-sm bg-gemini-yellow/10 border border-gemini-yellow/20 flex items-center justify-center flex-shrink-0 text-gemini-yellow">
                    <MessageCircleIcon size={16} />
                  </div>
                  <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">
                    {t.home.faq.q3}
                  </span>
                </div>
                <ChevronDownIcon
                  size={16}
                  className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${
                    expandedFaq === 2 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {expandedFaq === 2 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/5">
                      <div className="space-y-2">
                        <p className="text-mist-400 leading-relaxed text-sm">{t.home.faq.a3_1}</p>
                        <div className="space-y-2 pl-4">
                          <p className="text-mist-400 text-sm">
                            <span className="text-mist-500">{t.home.faq.wechat}</span>
                            <span className="text-white font-mono ml-2">wkzSteven</span>
                          </p>
                          <p className="text-mist-400 text-sm">
                            <span className="text-mist-500">{t.home.faq.email}</span>
                            <a
                              href="mailto:wangkaizhou2016@gmail.com"
                              className="text-glacier-400 hover:text-glacier-300 transition-colors ml-2"
                            >
                              wangkaizhou2016@gmail.com
                            </a>
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="bg-white/5 rounded-md p-4 text-center border border-white/5">
                          <p className="text-mist-400 text-sm mb-3">{t.home.faq.scanQr}</p>
                          <div className="w-32 h-32 bg-white rounded-sm p-1 mx-auto">
                            <img src="/wechat-qr.jpg" alt="WeChat QR" className="w-full h-full object-contain" />
                          </div>
                          <p className="text-mist-600 text-xs mt-3">{t.home.faq.qrExpiry}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-mist-600 text-sm">
              {t.home.faq.q4}
              <a href="mailto:wangkaizhou2016@gmail.com" className="text-glacier-400 hover:text-glacier-300 transition-colors ml-1">
                {t.common.contactUs}
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 md:py-12 px-4 md:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-mist-500 text-sm mb-1">
            <span>{t.home.footer.reportCount}</span>
            <Suspense fallback={<span className="font-mono">—</span>}>
              <FlipCounter value={reportCount} className="text-glacier-400 text-base relative" />
            </Suspense>
            <span>{t.home.footer.reportUnit}</span>
          </div>
          <p className="text-mist-600 text-sm">{t.home.footer.copyright(new Date().getFullYear())}</p>
          <p className="text-mist-700 text-xs mt-2">{t.home.footer.dataSource}</p>
        </div>
      </footer>

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

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
          <GeminiLoader />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
