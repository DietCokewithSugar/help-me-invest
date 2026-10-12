'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  confirmKicker: string;
  confirmTitle: string;
  confirmHint: string;
  confirmYourInput: string;
  confirmNoMatch: string;
  confirmCancel: string;
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

// A query can be navigated to directly (no confirmation) only when it is
// unambiguously a stock code: it carries a market suffix (e.g. 600519.SS,
// 0700.HK) or is a bare 6-digit A-share code. Everything else — company names,
// partial input, bare letter tickers — must be confirmed against an AI
// suggestion so we never pass raw text to the report API.
function isExplicitStockCode(normalized: string): boolean {
  return normalized.includes('.') || /^\d{6}$/.test(normalized);
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
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingChip[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmQuery, setConfirmQuery] = useState('');
  const [confirmCandidates, setConfirmCandidates] = useState<SymbolSuggestion[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchSuggestionsNow = useCallback(
    async (query: string, signal?: AbortSignal): Promise<SymbolSuggestion[]> => {
      const marketHint = query.includes('.') ? detectMarketFromSymbol(query) : undefined;
      const response = await fetch('/api/symbol-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, market: marketHint, language: locale }),
        signal,
      });
      const data = await response.json();
      return Array.isArray(data.suggestions) ? data.suggestions : [];
    },
    [locale]
  );

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

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

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const results = await fetchSuggestionsNow(query, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
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
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [symbol, fetchSuggestionsNow]);

  // Close the confirmation dialog on Escape.
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmOpen(false);
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmOpen]);

  const navigateToSymbol = (sym: string) => {
    setShowSuggestions(false);
    setConfirmOpen(false);
    const query = reportType !== 'standard' ? `?type=${reportType}` : '';
    router.push(`/${locale}/companies/${encodeURIComponent(sym)}${query}`);
  };

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

    navigateToSymbol(formatted);
  };

  // Open the confirmation dialog for a query that is not an explicit stock
  // code. We seed it with whatever suggestions are already loaded so it shows
  // instantly, then refresh to be safe (the debounce may not have fired yet
  // when a fast typist hits Enter).
  const openConfirm = async (query: string) => {
    setShowSuggestions(false);
    setConfirmQuery(query);
    setConfirmCandidates(suggestions);
    setConfirmOpen(true);
    setConfirmLoading(true);
    try {
      const results = await fetchSuggestionsNow(query);
      setConfirmCandidates(results);
    } catch {
      // keep the seeded candidates on failure
    } finally {
      setConfirmLoading(false);
    }
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (confirmOpen) return;
    const trimmed = normalizeSymbol(symbol);
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    if (isExplicitStockCode(trimmed)) {
      goToReport(trimmed);
      return;
    }
    const exact = suggestions.find((item) => normalizeSymbol(item.symbol) === trimmed);
    if (exact) {
      navigateToSymbol(exact.symbol);
      return;
    }
    void openConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggestion = (item: SymbolSuggestion) => {
    navigateToSymbol(item.symbol);
  };

  // 静态示例占位：给出三个不同市场的代码格式，不再轮播
  const placeholder = [initialPlaceholder, ...rotation]
    .filter((item, index, list) => list.findIndex((other) => other.symbol === item.symbol) === index)
    .filter((item) => ['AAPL', '0700.HK', '600519.SS'].includes(item.symbol))
    .map((item) => `${item.symbol} ${item.label}`)
    .join(' · ');

  const trendingRows = trendingStocks.length > 0
    ? trendingStocks.slice(0, 8).map((stock) => ({
        symbol: stock.symbol,
        label: stock.companyName || '',
        href: `/${locale}/companies/${encodeURIComponent(stock.symbol)}`,
      }))
    : featuredStocks.slice(0, 8).map((stock) => ({ symbol: stock.symbol, label: stock.label, href: stock.href }));

  const renderSuggestionRow = (item: SymbolSuggestion) => (
    <button
      key={`${item.market}-${item.symbol}`}
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => handleSelectSuggestion(item)}
      className="grid w-full grid-cols-[96px_44px_1fr] items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-hover"
    >
      <span className="font-mono text-[13px] font-semibold text-fg">{item.symbol}</span>
      <span className="text-[11px] font-medium text-text-3">{item.market}</span>
      <span className="truncate text-[13px] text-text-2">
        {locale === 'en' ? item.name || item.nameCn : item.nameCn || item.name}
      </span>
    </button>
  );

  return (
    <div>
      <div role="radiogroup" aria-label={labels.startAnalysis} className="mb-3 grid grid-cols-3 border border-line rounded-md overflow-hidden bg-panel">
        {reportTypeOptions.map((type, index) => {
          const active = reportType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setReportType(type.value)}
              className={`px-3 py-2 text-left transition-colors ${index > 0 ? 'border-l border-line' : ''} ${
                active ? 'bg-accent/10 shadow-[inset_0_-2px_0_rgb(var(--c-accent))]' : 'hover:bg-hover'
              }`}
            >
              <div className={`text-[13px] font-semibold ${active ? 'text-accent' : 'text-text-1'}`}>{type.label}</div>
              <div className="mt-0.5 text-[11px] leading-4 text-text-3 line-clamp-1">{type.desc}</div>
            </button>
          );
        })}
      </div>

      <form
        ref={suggestContainerRef}
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        aria-label={labels.enterSymbol}
      >
        <label htmlFor="hero-symbol-input" className="sr-only">
          {labels.enterSymbol}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
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
              placeholder={placeholder || labels.enterSymbol}
              aria-label={labels.enterSymbol}
              aria-autocomplete="list"
              aria-controls="hero-symbol-suggestions"
              aria-expanded={showSuggestions && symbol.trim().length >= 2}
              className="input-field !h-11 w-full !text-[15px] font-mono"
            />

            {showSuggestions && !confirmOpen && symbol.trim().length >= 2 && (
              <div
                id="hero-symbol-suggestions"
                role="listbox"
                aria-label={labels.suggestionsHeading}
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-md border border-line bg-panel shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-line bg-raised px-3 py-1.5">
                  <span className="label-caps">{labels.suggestionsHeading}</span>
                  {suggestLoading && (
                    <span className="h-3 w-3 rounded-full border-2 border-text-4 border-t-accent animate-spin" aria-hidden="true" />
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {suggestions.map(renderSuggestionRow)}
                  {suggestions.length === 0 && !suggestLoading && (
                    <div className="px-3 py-2.5 text-[13px] text-text-3">{labels.noMatch}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary !h-11 !px-6 !text-[14px] sm:min-w-[148px]">
            <TrendingUpIcon size={16} />
            <span>{labels.startAnalysis}</span>
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-text-3">
          <ArrowRightIcon size={12} />
          <span>
            {labels.aiMarketDetectPrefix}
            {labels.currentMarketName}
          </span>
        </p>
      </form>

      <div className={`mt-8 grid gap-6 ${searchHistory.length > 0 ? 'md:grid-cols-2' : ''}`}>
        {searchHistory.length > 0 && (
          <section className="panel">
            <div className="panel-header !min-h-[40px] !py-2">
              <span className="flex items-center gap-2 panel-title !text-[13px]">
                <ClockIcon size={14} className="text-text-3" />
                {labels.searchHistory}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearSearchHistory();
                  setSearchHistory([]);
                }}
                className="text-[12px] text-accent hover:underline"
              >
                {labels.clearAll}
              </button>
            </div>
            <ul>
              {searchHistory.slice(0, 6).map((item) => (
                <li key={item.symbol} className="group flex items-center border-b border-line last:border-b-0 hover:bg-hover">
                  <button
                    type="button"
                    onClick={() => goToReport(item.symbol)}
                    className="grid flex-1 grid-cols-[96px_1fr] items-center gap-3 px-4 py-2 text-left"
                  >
                    <span className="font-mono text-[13px] font-semibold text-fg">{item.symbol}</span>
                    <span className="truncate text-[13px] text-text-2">{item.name || ''}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromSearchHistory(item.symbol);
                      setSearchHistory(getSearchHistory());
                    }}
                    className="mr-2 flex h-7 w-7 items-center justify-center rounded-sm text-text-3 hover:bg-raised hover:text-fg"
                    title={labels.delete}
                    aria-label={`${labels.delete} ${item.symbol}`}
                  >
                    <XIcon size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* SSR 时先渲染 featuredStocks，保证爬虫可见；热门接口返回后替换为实时榜单 */}
        <section className="panel">
          <div className="panel-header !min-h-[40px] !py-2">
            <span className="flex items-center gap-2 panel-title !text-[13px]">
              <FlameIcon size={14} className="text-text-3" />
              {labels.trendingThisWeek}
            </span>
            <span className="text-[12px] text-text-3">{labels.realtimeUpdate}</span>
          </div>
          <ol className={searchHistory.length > 0 ? '' : 'sm:grid sm:grid-cols-2'}>
            {trendingRows.map((stock, index) => (
              <li key={stock.symbol} className="border-b border-line last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                <a
                  href={stock.href}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(stock.href);
                  }}
                  className="grid grid-cols-[24px_96px_1fr] items-center gap-3 px-4 py-2 hover:bg-hover"
                >
                  <span className="font-mono text-[12px] text-text-3 text-right">{index + 1}</span>
                  <span className="font-mono text-[13px] font-semibold text-fg">{stock.symbol}</span>
                  <span className="truncate text-[13px] text-text-2">{stock.label !== stock.symbol ? stock.label : ''}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label={labels.confirmTitle}
        >
          <div className="absolute inset-0 bg-black/50" onClick={closeConfirm} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-md border border-line bg-panel shadow-xl animate-fade-in">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <div className="label-caps">{labels.confirmKicker}</div>
                <h3 className="mt-1 text-[16px]">{labels.confirmTitle}</h3>
              </div>
              <button
                type="button"
                onClick={closeConfirm}
                aria-label={labels.confirmCancel}
                className="btn-ghost !h-8 !w-8 !p-0"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-[13px] text-text-2">{labels.confirmHint}</p>
              <div className="mt-3 flex items-baseline gap-2 text-[13px]">
                <span className="text-text-3">{labels.confirmYourInput}</span>
                <span className="truncate font-mono font-semibold text-fg">{confirmQuery}</span>
              </div>

              {confirmLoading && confirmCandidates.length === 0 && (
                <div className="mt-4 flex items-center gap-2 text-[13px] text-text-3">
                  <span className="h-3 w-3 rounded-full border-2 border-text-4 border-t-accent animate-spin" aria-hidden="true" />
                </div>
              )}

              {confirmCandidates.length > 0 && (
                <div className="mt-4 max-h-64 overflow-y-auto rounded-md border border-line">
                  {confirmCandidates.map(renderSuggestionRow)}
                </div>
              )}

              {!confirmLoading && confirmCandidates.length === 0 && (
                <p className="mt-4 text-[13px] text-text-3">{labels.confirmNoMatch}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line bg-raised px-5 py-3">
              <button type="button" onClick={closeConfirm} className="btn-secondary">
                {labels.confirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
