'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { MarketType } from '@/types';
import { detectMarketFromSymbol, formatSymbolForMarket } from '@/lib/markets';
import { TrendingUpIcon, ArrowRightIcon, ClockIcon, FlameIcon, XIcon } from '@/components/Icons';

/**
 * Hero search island.
 *
 * Critical constraint: this component intentionally does NOT import any i18n
 * dictionary. All visible labels and initial values are passed in by the
 * surrounding Server Component so that crawlers (which don't execute JS) still
 * see meaningful content in the SSR'd HTML.
 *
 * Client-only behavior:
 *  - placeholder rotation
 *  - autocomplete suggestion fetch (with debounce)
 *  - search history persistence in localStorage
 *  - click handlers that router.push to /{locale}/companies/{symbol}
 */

export interface FeaturedStockChip {
  symbol: string;
  label: string;
  href: string;
}

export interface PlaceholderRotationItem {
  symbol: string;
  label: string;
}

export type ReportTypeOption = 'beginner' | 'standard' | 'pro';

interface ReportTypeChoice {
  value: ReportTypeOption;
  label: string;
  desc: string;
}

interface TrendingChip {
  symbol: string;
  companyName: string | null;
}

export interface SearchIslandLabels {
  aiMarketDetectPrefix: string;
  currentMarketName: string;
  startAnalysis: string;
  suggestionsHeading: string;
  noMatch: string;
  enterSymbol: string;
  searchHistory: string;
  clearAll: string;
  delete: string;
  trendingThisWeek: string;
  realtimeUpdate: string;
}

interface HomeSearchIslandProps {
  locale: 'zh' | 'en';
  initialPlaceholder: PlaceholderRotationItem;
  rotation: PlaceholderRotationItem[];
  featuredStocks: FeaturedStockChip[];
  reportTypeOptions: ReportTypeChoice[];
  labels: SearchIslandLabels;
}

interface SymbolSuggestion {
  symbol: string;
  market: MarketType;
  name?: string;
  nameCn?: string;
  confidence?: number;
}

interface SearchHistoryItem {
  symbol: string;
  name?: string;
  timestamp: number;
}

const SEARCH_HISTORY_KEY = 'search-history';
const MAX_SEARCH_HISTORY = 8;

function normalizeSymbol(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0xff01 && code <= 0xff5e) {
      result += String.fromCharCode(code - 0xfee0);
    } else if (code === 0x3000 || code === 0x20) {
      // skip width-variant spaces
    } else {
      result += input[i];
    }
  }
  return result.toUpperCase();
}

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

function saveSearchHistory(items: SearchHistoryItem[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_SEARCH_HISTORY)));
  } catch {
    // ignore
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

export default function HomeSearchIsland({
  locale,
  initialPlaceholder,
  rotation,
  featuredStocks,
  reportTypeOptions,
  labels,
}: HomeSearchIslandProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestContainerRef = useRef<HTMLFormElement>(null);

  const [symbol, setSymbol] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [reportType, setReportType] = useState<ReportTypeOption>('standard');
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingChip[]>([]);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    if (symbol || rotation.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % rotation.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [symbol, rotation.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestContainerRef.current && !suggestContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trending tickers are fetched client-side on mount; the initial SSR'd chips
  // come from `featuredStocks` so crawlers always see something.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/trending?period=week&limit=8');
        const data = await response.json();
        if (!cancelled && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setTrendingStocks(
            data.data.map((row: any) => ({
              symbol: String(row.symbol),
              companyName: row.company_name ?? null,
            }))
          );
        }
      } catch {
        // best-effort; we already render featured chips as a static fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autocomplete suggestions
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
        if (!controller.signal.aborted) setSuggestLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [symbol, locale]);

  const goToReport = (rawSymbol: string) => {
    const normalized = normalizeSymbol(rawSymbol);
    if (!normalized) {
      inputRef.current?.focus();
      return;
    }

    let formatted = normalized;
    if (!normalized.includes('.') && /^\d{6}$/.test(normalized)) {
      formatted = formatSymbolForMarket(normalized, 'CN');
    } else if (normalized.includes('.')) {
      const market = detectMarketFromSymbol(normalized);
      formatted = formatSymbolForMarket(normalized, market);
    }

    const query = reportType !== 'standard' ? `?type=${reportType}` : '';
    router.push(`/${locale}/companies/${encodeURIComponent(formatted)}${query}`);
  };

  const handleSubmit = () => {
    const trimmed = normalizeSymbol(symbol);
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    if (!trimmed.includes('.') && suggestions.length > 0) {
      const best = suggestions[0];
      router.push(`/${locale}/companies/${encodeURIComponent(best.symbol)}`);
      return;
    }
    goToReport(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggestion = (item: SymbolSuggestion) => {
    setShowSuggestions(false);
    router.push(`/${locale}/companies/${encodeURIComponent(item.symbol)}`);
  };

  return (
    <motion.div
      className="max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4 text-sm text-mist-500 px-1">
        <svg className="h-3.5 w-3.5 text-glacier-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>
          {labels.aiMarketDetectPrefix}
          {labels.currentMarketName}
        </span>
      </div>

      <div className="flex items-center justify-start gap-2 mb-3">
        {reportTypeOptions.map((type) => (
          <button
            key={type.value}
            onClick={() => setReportType(type.value)}
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

      <form
        ref={suggestContainerRef}
        role="search"
        className="relative mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        aria-label={labels.enterSymbol}
      >
        <label htmlFor="hero-symbol-input" className="sr-only">
          {labels.enterSymbol}
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              id="hero-symbol-input"
              name="symbol"
              type="search"
              role="combobox"
              inputMode="search"
              enterKeyHint="search"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              value={symbol}
              onChange={(e) => {
                const next = e.target.value;
                setSymbol(isComposing ? next : normalizeSymbol(next));
                setShowSuggestions(true);
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setSymbol(normalizeSymbol(e.currentTarget.value));
              }}
              onKeyDown={handleKeyDown}
              placeholder=""
              aria-label={labels.enterSymbol}
              aria-autocomplete="list"
              aria-controls="hero-symbol-suggestions"
              aria-expanded={showSuggestions && symbol.trim().length >= 2}
              className="gemini-input w-full px-5 py-4 text-base md:text-lg font-mono"
            />
            {/* The very first item is rendered as a real DOM child so the
                SSR'd HTML always contains a visible placeholder example. */}
            {!symbol && (
              <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden h-6">
                <div
                  className="transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateY(-${currentPlaceholderIndex * 24}px)` }}
                >
                  {/* Render initial placeholder first so SSR HTML matches. */}
                  {rotation.map((item, index) => (
                    <div
                      key={`${item.symbol}-${index}`}
                      className="h-6 flex items-center whitespace-nowrap text-mist-600 text-base md:text-lg"
                    >
                      <span className="font-mono shrink-0">{item.symbol}</span>
                      <span className="mx-2 text-mist-700 shrink-0">·</span>
                      <span className="text-mist-600 truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {showSuggestions && symbol.trim().length >= 2 && (
                <motion.div
                  id="hero-symbol-suggestions"
                  role="listbox"
                  aria-label={labels.suggestionsHeading}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-md border border-white/10 bg-surface/95 shadow-xl backdrop-blur-md"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="border-b border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wide text-mist-500">
                    {labels.suggestionsHeading}
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
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => handleSelectSuggestion(item)}
                        className="group flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 last:border-b-0"
                      >
                        <span className="font-mono text-sm text-mist-200 group-hover:text-white">{item.symbol}</span>
                        <span className="rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-mist-500">
                          {item.market}
                        </span>
                        {(item.nameCn || item.name) && (
                          <span className="truncate text-sm text-mist-400 group-hover:text-mist-300">
                            {locale === 'en' ? item.name || item.nameCn : item.nameCn || item.name}
                          </span>
                        )}
                      </button>
                    ))}
                    {suggestions.length === 0 && !suggestLoading && (
                      <div className="px-4 py-3 text-sm text-mist-500">{labels.noMatch}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            className="gemini-btn gemini-btn-primary flex items-center justify-center gap-2 md:gap-3 min-w-[140px] md:min-w-[160px] py-4 text-base md:text-lg"
          >
            <TrendingUpIcon size={20} />
            <span>{labels.startAnalysis}</span>
            <ArrowRightIcon size={16} className="opacity-70 hidden sm:block" />
          </button>
        </div>
      </form>

      {searchHistory.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3 px-1">
            <ClockIcon size={14} className="text-mist-500" />
            <span className="text-sm text-mist-500">{labels.searchHistory}</span>
            <button
              onClick={() => {
                clearSearchHistory();
                setSearchHistory([]);
              }}
              className="ml-auto text-xs text-mist-600 hover:text-mist-400 transition-colors"
            >
              {labels.clearAll}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {searchHistory.slice(0, 6).map((item) => (
              <div
                key={item.symbol}
                className="group relative flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
              >
                <button onClick={() => goToReport(item.symbol)} className="flex items-center gap-2">
                  <span className="font-mono text-sm text-mist-300 group-hover:text-white transition-colors">
                    {item.symbol}
                  </span>
                  {item.name && <span className="text-xs text-mist-600 hidden sm:inline">{item.name}</span>}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromSearchHistory(item.symbol);
                    setSearchHistory(getSearchHistory());
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-md text-mist-700 hover:text-mist-300 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
                  title={labels.delete}
                >
                  <XIcon size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Trending: SSR-rendered fallback shows featuredStocks so the crawler
            always sees a chip set. Once the trending API resolves we swap in
            the dynamic list. */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <FlameIcon size={14} className="text-mist-500" />
            <span className="text-sm text-mist-500">{labels.trendingThisWeek}</span>
            <div className="flex items-center gap-1 ml-auto text-xs text-mist-600">
              <ClockIcon size={11} />
              <span className="hidden sm:inline">{labels.realtimeUpdate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(trendingStocks.length > 0
              ? trendingStocks.slice(0, 6).map((stock, idx) => ({
                  symbol: stock.symbol,
                  label: stock.companyName || stock.symbol,
                  href: `/${locale}/companies/${encodeURIComponent(stock.symbol)}`,
                  rank: idx + 1,
                }))
              : featuredStocks.slice(0, 6).map((stock, idx) => ({ ...stock, rank: idx + 1 }))
            ).map((stock) => (
              <a
                key={stock.symbol}
                href={stock.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(stock.href);
                }}
                className="group relative px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-mist-600">#{stock.rank}</span>
                  <span className="font-mono text-sm text-mist-300 group-hover:text-white transition-colors">
                    {stock.symbol}
                  </span>
                </div>
                {stock.label && stock.label !== stock.symbol && (
                  <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-[#1a1a24] border border-white/[0.06] text-xs text-mist-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    {stock.label}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
