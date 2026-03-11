'use client';

import { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Report from '@/components/Report';
import CompanyFilterModal from '@/components/CompanyFilterModal';
import type { ReportData, MarketType } from '@/types';
import { MARKET_CONFIGS, detectMarketFromSymbol, formatSymbolForMarket, getMarketConfig } from '@/lib/markets';
import { getSupabaseClient, isSupabaseClientConfigured } from '@/lib/supabase-client';
import {
  TrendingUpIcon,
  FileTextIcon,
  BarChart3Icon,
  BrainIcon,
  Globe2Icon,
  ArrowRightIcon,
  FlameIcon,
  ClockIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  DollarSignIcon,
  MessageCircleIcon,
  LogoIcon,
  XIcon,
  SunIcon,
  MoonIcon,
  WeChatIcon,
  FilterIcon,
  SearchIcon,
} from '@/components/Icons';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import { useLanguage } from '@/contexts/LanguageContext';

// 懒加载组件

const AIShowcase = lazy(() => import('@/components/AIShowcase'));
const Testimonials = lazy(() => import('@/components/Testimonials'));
const FlipCounter = lazy(() => import('@/components/FlipCounter'));

// 热门股票类型
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

// 将全角字符转换为半角，并去除所有空格（处理中文输入法输入的情况）
function normalizeSymbol(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    // 全角字母和数字转换为半角 (0xFF01-0xFF5E -> 0x0021-0x007E)
    if (code >= 0xFF01 && code <= 0xFF5E) {
      result += String.fromCharCode(code - 0xFEE0);
    }
    // 全角空格转换为半角空格
    else if (code === 0x3000) {
      // 跳过空格，不添加
    }
    // 普通半角空格也跳过
    else if (code === 0x20) {
      // 跳过空格
    }
    // 其他字符保留
    else {
      result += input[i];
    }
  }
  return result.toUpperCase();
}

const LOADING_STEPS_META = [
  { icon: FileTextIcon, color: 'from-glacier-500 to-glacier-600' },
  { icon: BarChart3Icon, color: 'from-gemini-purple to-gemini-pink' },
  { icon: BrainIcon, color: 'from-gemini-blue to-gemini-purple' },
  { icon: Globe2Icon, color: 'from-glacier-400 to-gemini-blue' },
  { icon: TrendingUpIcon, color: 'from-gemini-green to-glacier-500' },
];

// 热门股票展示列表
const FEATURED_STOCK_SYMBOLS = [
  'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL',
  '600519.SS', '000858.SZ', '0700.HK', '9988.HK', '7203.T',
];


// 加载动画组件
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

// 极简线性进度加载器
function LinearLoader({ step, totalSteps, stepTexts, estimateText }: { step: number; totalSteps: number; stepTexts: string[]; estimateText: string }) {
  const progress = ((step + 1) / totalSteps) * 100;
  const Icon = LOADING_STEPS_META[step].icon;

  return (
    <div className="w-full max-w-sm">
      {/* 图标与文字 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-glacier-500/15 flex items-center justify-center">
          <Icon className="w-4 h-4 text-glacier-500" />
        </div>
        <span className="text-sm text-mist-300">{stepTexts[step]}</span>
      </div>

      {/* 线性进度条 */}
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-glacier-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 进度文字 */}
      <div className="flex items-center justify-between mt-3 text-xs text-mist-600">
        <span>{step + 1} / {totalSteps}</span>
        <span>{estimateText}</span>
      </div>
    </div>
  );
}

// 搜索历史类型
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
    // localStorage 不可用时静默失败
  }
}

function addToSearchHistory(symbol: string, name?: string) {
  const history = getSearchHistory();
  // 去重：如果已存在相同 symbol，先移除旧的
  const filtered = history.filter(item => item.symbol !== symbol);
  // 添加到最前面
  filtered.unshift({ symbol, name, timestamp: Date.now() });
  saveSearchHistory(filtered);
}

function removeFromSearchHistory(symbol: string) {
  const history = getSearchHistory();
  saveSearchHistory(history.filter(item => item.symbol !== symbol));
}

function clearSearchHistory() {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // 静默失败
  }
}

function HomeContent() {
  const { locale, t } = useLanguage();
  const [symbol, setSymbol] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('US');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [fmpLoading, setFmpLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetryable, setIsRetryable] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [reportType, setReportType] = useState<'beginner' | 'standard' | 'pro'>('standard');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const featuredStocks = FEATURED_STOCK_SYMBOLS.map((sym) => ({
    symbol: sym,
    name: (t.home.featuredStocks as Record<string, string>)[sym] || sym,
  }));

  const loadingStepTexts = [
    t.home.loading.step1,
    t.home.loading.step2,
    t.home.loading.step3,
    t.home.loading.step4,
    t.home.loading.step5,
  ];

  const coreAdvantages = [
    {
      id: 'ai-logic',
      number: t.home.features.one,
      title: t.home.features.feature1Title,
      description: t.home.features.feature1Desc,
    },
    {
      id: 'multi-source',
      number: t.home.features.two,
      title: t.home.features.feature2Title,
      description: t.home.features.feature2Desc,
    },
    {
      id: 'minimalist',
      number: t.home.features.three,
      title: t.home.features.feature3Title,
      description: t.home.features.feature3Desc,
    },
  ];

  // 初始化搜索历史
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  const currentMarketConfig = getMarketConfig(selectedMarket);

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

  // 股票翻牌动画
  useEffect(() => {
    if (symbol || reportData) return;
    const interval = setInterval(() => {
      setCurrentStockIndex((prev) => (prev + 1) % FEATURED_STOCK_SYMBOLS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [symbol, reportData]);

  // 点击外部关闭建议下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestContainerRef.current && !suggestContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取热门搜索榜单
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/trending?period=week&limit=8');
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setTrendingStocks(data.data);
        }
      } catch (error) {
        console.log('获取热门榜单失败，使用默认列表');
      } finally {
        setTrendingLoading(false);
      }
    };
    fetchTrending();
  }, []);

  // 处理 URL 中的 symbol 参数
  useEffect(() => {
    const symbolFromUrl = searchParams.get('symbol');
    if (symbolFromUrl && !reportData && !loading) {
      setSymbol(symbolFromUrl.toUpperCase());
      // 这里的 handleAnalyze 调用需要确保在 symbol 状态更新后
      // 但由于 useState 是异步的，我们直接传入 symbolFromUrl 
    }
  }, [searchParams, reportData, loading]);

  // 当 symbol 因为 URL 改变时，触发分析
  useEffect(() => {
    const symbolFromUrl = searchParams.get('symbol');
    if (symbolFromUrl && symbol === symbolFromUrl.toUpperCase() && !reportData && !loading) {
      handleAnalyze();
    }
  }, [symbol, searchParams, reportData, loading]);

  // 语言切换时自动重新加载/生成报告
  const prevLocaleRef = useRef(locale);
  useEffect(() => {
    if (prevLocaleRef.current !== locale && reportData && !loading) {
      prevLocaleRef.current = locale;
      const currentSymbol = reportData.profile?.symbol;
      const currentMarket = reportData.market || selectedMarket;
      if (currentSymbol) {
        handleAnalyze();
      }
    } else {
      prevLocaleRef.current = locale;
    }
  }, [locale]);

  // 获取研报总数的函数
  const fetchReportCount = useCallback(async () => {
    try {
      const response = await fetch('/api/report-count');
      const data = await response.json();
      if (data.success && typeof data.count === 'number') {
        setReportCount(data.count);
      }
    } catch (error) {
      console.log('获取研报总数失败:', error);
    }
  }, []);

  // 获取研报总数 + Realtime 订阅
  useEffect(() => {
    // 初始获取
    fetchReportCount();

    // 设置 Supabase Realtime 订阅
    if (!isSupabaseClientConfigured) {
      console.log('Supabase 客户端未配置，跳过 Realtime 订阅');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // 订阅 search_records 表的变化
    const channel = supabase
      .channel('report-count-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'search_records',
          filter: 'is_valid=eq.true',
        },
        (payload) => {
          console.log('收到新研报记录:', payload);
          // 乐观更新：直接增加计数
          setReportCount((prev) => (prev !== null ? prev + 1 : 1));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'search_records',
        },
        (payload) => {
          // 当记录从有效变为无效时，减少计数
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
        {
          event: 'DELETE',
          schema: 'public',
          table: 'search_records',
        },
        (payload) => {
          // 删除有效记录时减少计数
          if (payload.old?.is_valid === true) {
            setReportCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime 订阅状态:', status);
      });

    // 清理订阅
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReportCount]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS_META.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // 联想搜索
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
      } catch (e) {
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

  const handleSelectSuggestion = (item: SymbolSuggestion) => {
    setSelectedMarket(item.market);
    setSymbol(item.symbol);
    setError('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // 记录搜索到数据库
  const recordSearchToDb = async (sym: string, companyName?: string, isInvalid?: boolean) => {
    try {
      await fetch('/api/search-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: sym,
          companyName,
          action: isInvalid ? 'invalidate' : 'record',
        }),
      });
    } catch (e) {
      console.log('记录搜索失败:', e);
    }
  };

  // 检查缓存
  const checkCache = async (symbol: string, market: MarketType, reportType: string = 'standard') => {
    try {
      const response = await fetch(`/api/cache?symbol=${encodeURIComponent(symbol)}&market=${market}&language=${locale}&type=${reportType}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('检查缓存失败:', error);
      return null;
    }
  };

  // 分批执行任务的辅助函数，避免瞬间并发过高导致 429 错误
  const executeBatched = async <T,>(
    tasks: (() => Promise<T>)[],
    batchSize = 2,
    delayMs = 300
  ): Promise<T[]> => {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(task => task()));
      results.push(...batchResults);
      // 如果还有更多批次，添加延迟
      if (i + batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return results;
  };

  // Streaming helper
  const streamSection = async (section: string, payload: any, symbol?: string) => {
    try {
      const response = await fetch('/api/ai/stream-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, symbol, language: locale, ...payload }),
      });

      if (!response.body) return '';

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });
        text += chunkValue;

        setReportData((prev) => {
          if (!prev) return prev;

          if (section === 'earningsCallSummary') {
            return { ...prev, earningsCallSummary: text };
          }

          // For Beginner AI Analysis fields
          const beginnerSections = [
            'beginnerVerdict', 'beginnerCompanyIntro', 'beginnerRiskReward', 'beginnerActionPlan'
          ];
          if (beginnerSections.includes(section)) {
            return {
              ...prev,
              beginnerAiAnalysis: {
                ...(prev.beginnerAiAnalysis || {} as any),
                [section]: text,
              } as any,
            };
          }

          // For Pro AI Analysis fields (7个独立模块)
          const proSections = [
            'proBusinessModel', 'proOperatingModel', 'proIndustryOutlook',
            'proMoatAnalysis', 'proFinancialHealth', 'proValuation', 'proInvestmentConclusion'
          ];
          if (proSections.includes(section)) {
            return {
              ...prev,
              proAiAnalysis: {
                ...(prev.proAiAnalysis || {} as any),
                [section]: text,
              } as any,
            };
          }

          // For AI Analysis fields
          return {
            ...prev,
            aiAnalysis: {
              ...(prev.aiAnalysis || {} as any),
              [section]: text,
            } as any,
          };
        });
      }
      return text;
    } catch (error) {
      console.error(`Stream error for ${section}:`, error);
      return '';
    }
  };


  const generateReportForVersion = async (
    version: 'beginner' | 'standard' | 'professional',
    existingReportData: ReportData
  ) => {
    const companyData = existingReportData.profile;
    const formattedSymbol = companyData.symbol;
    const market = existingReportData.market || selectedMarket;
    const peers = existingReportData.peers || [];

    const cacheType = version === 'professional' ? 'professional' : version;
    try {
      const cacheResponse = await fetch(
        `/api/cache?symbol=${encodeURIComponent(formattedSymbol)}&market=${market}&language=${locale}&type=${cacheType}`
      );
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        if (cacheData.hasAiContent && cacheData.data?.aiAnalysis) {
          if (version === 'beginner') {
            setReportData(prev => prev ? { ...prev, beginnerAiAnalysis: cacheData.data.aiAnalysis } : prev);
          } else if (version === 'standard') {
            setReportData(prev => prev ? {
              ...prev,
              aiAnalysis: cacheData.data.aiAnalysis,
              earningsCallSummary: cacheData.data.earningsCallSummary || prev.earningsCallSummary || '',
            } : prev);
          } else {
            setReportData(prev => prev ? { ...prev, proAiAnalysis: cacheData.data.aiAnalysis } : prev);
          }
          return;
        }
      }
    } catch (e) {
      console.error('Cache check failed:', e);
    }

    if (version === 'beginner') {
      setReportData(prev => prev ? {
        ...prev,
        beginnerAiAnalysis: {
          beginnerVerdict: '',
          beginnerCompanyIntro: '',
          beginnerRiskReward: '',
          beginnerActionPlan: '',
        },
      } : prev);

      const tasks: Promise<string>[] = [];
      tasks.push(streamSection('beginnerVerdict', { data: { ...companyData, incomeStatements: existingReportData.incomeStatements }, market }, formattedSymbol));
      tasks.push(streamSection('beginnerCompanyIntro', { data: companyData, market }, formattedSymbol));
      tasks.push(streamSection('beginnerRiskReward', { data: companyData, market }, formattedSymbol));
      const results = await Promise.all(tasks);
      const context = `Verdict: ${results[0]}\nCompany Intro: ${results[1]}\nRisk/Reward: ${results[2]}`;
      await streamSection('beginnerActionPlan', { data: companyData, prevContext: context, market }, formattedSymbol);

    } else if (version === 'standard') {
      setReportData(prev => prev ? {
        ...prev,
        aiAnalysis: {
          companyOverview: '', industryAnalysis: '', industryPainPoints: '',
          competitors: '', competitiveAdvantage: '', moat: '',
          recentDevelopments: '', investmentConclusion: '',
        },
      } : prev);

      const tasks: Promise<string>[] = [];
      tasks.push(streamSection('companyOverview', { data: companyData, market }, formattedSymbol));
      tasks.push(streamSection('industryAnalysis', { data: companyData, market }, formattedSymbol));
      tasks.push(streamSection('industryPainPoints', { data: companyData, market }, formattedSymbol));
      tasks.push(streamSection('competitors', { data: { ...companyData, peers }, market }, formattedSymbol));
      tasks.push(streamSection('competitiveAdvantage', { data: companyData, market }, formattedSymbol));
      tasks.push(streamSection('moat', { data: companyData, market }, formattedSymbol));
      tasks.push(streamSection('recentDevelopments', { data: { companyName: companyData.companyName, symbol: formattedSymbol }, market }, formattedSymbol));

      const transcript = existingReportData.earningsTranscripts?.[0];
      let earningsPromise: Promise<string> | null = null;
      if (transcript && companyData.companyName) {
        const transcriptText = transcript.content || transcript.transcript || transcript.text || '';
        if (transcriptText) {
          earningsPromise = streamSection('earningsCallSummary', {
            data: { transcript: transcriptText, companyName: companyData.companyName, symbol: formattedSymbol },
            market,
          }, formattedSymbol);
        }
      }

      const results = await Promise.all(tasks);
      const earningsResult = earningsPromise ? await earningsPromise : '';

      const context = `Company Overview: ${results[0]}\nIndustry Analysis: ${results[1]}\nIndustry Pain Points: ${results[2]}\nCompetitors: ${results[3]}\nCompetitive Advantage: ${results[4]}\nMoat: ${results[5]}\nRecent Developments: ${results[6]}\nEarnings Call Summary: ${earningsResult}`;
      await streamSection('investmentConclusion', { data: companyData, prevContext: context, market }, formattedSymbol);

    } else if (version === 'professional') {
      setReportData(prev => prev ? {
        ...prev,
        proAiAnalysis: {
          proBusinessModel: '', proOperatingModel: '', proIndustryOutlook: '',
          proMoatAnalysis: '', proFinancialHealth: '', proValuation: '', proInvestmentConclusion: '',
        },
      } : prev);

      const latestMetrics = existingReportData.keyMetrics?.[0] || {};
      const latestMetricsTTM = existingReportData.keyMetricsTTM?.[0] || {};
      const latestBalance = existingReportData.balanceSheets?.[0] || {};
      const latestRatios = existingReportData.financialRatios?.[0] || {};
      const latestRatiosTTM = existingReportData.financialRatiosTTM?.[0] || {};
      const latestGrowth = existingReportData.financialGrowth?.[0] || {};

      const annualFinancials = existingReportData.incomeStatements?.slice(0, 5).map((stmt: any, idx: number) => {
        const balance = existingReportData.balanceSheets?.[idx] || {};
        const cashFlow = existingReportData.cashFlowStatements?.[idx] || {};
        const metrics = existingReportData.keyMetrics?.[idx] || {};
        const ratios = existingReportData.financialRatios?.[idx] || {};
        return {
          period: stmt.calendarYear || stmt.date?.split('-')[0] || `Y${idx + 1}`,
          revenue: stmt.revenue, netIncome: stmt.netIncome, grossProfit: stmt.grossProfit,
          operatingIncome: stmt.operatingIncome, ebitda: stmt.ebitda,
          grossProfitMargin: ratios.grossProfitMargin || stmt.grossProfitRatio,
          netProfitMargin: ratios.netProfitMargin || stmt.netIncomeRatio,
          totalAssets: balance.totalAssets, totalLiabilities: balance.totalLiabilities,
          freeCashFlow: cashFlow.freeCashFlow, roe: ratios.returnOnEquity || metrics.roe,
        };
      }) || [];

      const quarterlyFinancials = existingReportData.incomeStatementsQuarter?.slice(0, 5).map((stmt: any, idx: number) => {
        const balance: any = existingReportData.balanceSheetsQuarter?.[idx] || {};
        return {
          period: stmt.date || `Q${idx + 1}`, revenue: stmt.revenue, netIncome: stmt.netIncome,
          grossProfitMargin: stmt.grossProfitRatio, netProfitMargin: stmt.netIncomeRatio,
          totalAssets: balance.totalAssets, totalLiabilities: balance.totalLiabilities,
        };
      }) || [];

      const profitabilityData = {
        grossProfitMargin: latestRatios.grossProfitMargin || latestRatiosTTM?.grossProfitMargin,
        netProfitMargin: latestRatios.netProfitMargin || latestRatiosTTM?.netProfitMargin,
        roe: latestRatios.returnOnEquity || latestMetrics.roe,
        roic: latestMetrics.roic || latestMetricsTTM?.roic,
        incomeQuality: latestMetrics.incomeQuality || latestMetricsTTM?.incomeQuality,
      };
      const capitalReturnData = { rdToRevenue: latestMetrics.researchAndDdevelopementToRevenue || latestMetricsTTM?.researchAndDdevelopementToRevenue };
      const debtData = {
        workingCapital: latestMetrics.workingCapital || existingReportData.financialScores?.workingCapital,
        totalLiabilities: latestBalance.totalLiabilities || existingReportData.financialScores?.totalLiabilities,
        debtToEquity: latestRatios.debtEquityRatio || latestMetrics.debtToEquity,
        currentRatio: latestRatios.currentRatio || latestMetrics.currentRatio,
      };
      const healthScores = { altmanZScore: existingReportData.financialScores?.altmanZScore, piotroskiScore: existingReportData.financialScores?.piotroskiScore };
      const valuationData = {
        peRatio: latestMetrics.peRatio || latestRatios.priceEarningsRatio || latestMetricsTTM?.peRatio,
        pbRatio: latestMetrics.pbRatio || latestRatios.priceToBookRatio || latestMetricsTTM?.pbRatio,
        psRatio: latestMetrics.priceToSalesRatio || latestRatios.priceToSalesRatio,
        evToEbitda: latestMetrics.enterpriseValueOverEBITDA || latestMetricsTTM?.enterpriseValueOverEBITDA,
        grahamNumber: latestMetrics.grahamNumber || latestMetricsTTM?.grahamNumber,
        earningsYield: latestMetrics.earningsYield || latestMetricsTTM?.earningsYield,
        freeCashFlowYield: latestMetrics.freeCashFlowYield || latestMetricsTTM?.freeCashFlowYield,
      };
      const growthData = {
        revenueGrowth: latestGrowth.revenueGrowth, netIncomeGrowth: latestGrowth.netIncomeGrowth,
        threeYRevenueGrowth: latestGrowth.threeYRevenueGrowthPerShare, fiveYRevenueGrowth: latestGrowth.fiveYRevenueGrowthPerShare,
      };

      const proTasks: Promise<string>[] = [];
      proTasks.push(streamSection('proBusinessModel', { data: companyData, market }, formattedSymbol));
      proTasks.push(streamSection('proOperatingModel', { data: companyData, market }, formattedSymbol));
      proTasks.push(streamSection('proIndustryOutlook', { data: companyData, market }, formattedSymbol));
      proTasks.push(streamSection('proMoatAnalysis', { data: { ...companyData, profitabilityData, capitalReturnData }, market }, formattedSymbol));
      proTasks.push(streamSection('proFinancialHealth', { data: { ...companyData, annualFinancials, quarterlyFinancials, profitabilityData, debtData, healthScores }, market }, formattedSymbol));
      proTasks.push(streamSection('proValuation', { data: { ...companyData, valuationData, growthData, quarterlyFinancials }, market }, formattedSymbol));

      const proResults = await Promise.all(proTasks);
      const proContext = proResults.map((r, i) => `Section ${i + 1}: ${r}`).join('\n');
      await streamSection('proInvestmentConclusion', { data: companyData, market, prevContext: proContext }, formattedSymbol);
    }
  };

  const handleAnalyze = async () => {
    // 使用 normalizeSymbol 处理全角字符和空格（中文输入法可能输入的情况）
    const trimmedSymbol = normalizeSymbol(symbol);
    if (!trimmedSymbol) {
      setError(t.home.search.enterSymbol);
      inputRef.current?.focus();
      return;
    }

    let marketForAnalyze = selectedMarket;
    let formattedSymbol = trimmedSymbol;
    if (!trimmedSymbol.includes('.') && suggestions.length > 0) {
      const bestSuggestion = suggestions[0];
      marketForAnalyze = bestSuggestion.market;
      formattedSymbol = bestSuggestion.symbol;
    } else if (!trimmedSymbol.includes('.') && /^\d{6}$/.test(trimmedSymbol)) {
      marketForAnalyze = 'CN';
      formattedSymbol = formatSymbolForMarket(trimmedSymbol, 'CN');
    } else if (!trimmedSymbol.includes('.') && /^\d{4,5}$/.test(trimmedSymbol)) {
      marketForAnalyze = selectedMarket;
      formattedSymbol = formatSymbolForMarket(trimmedSymbol, marketForAnalyze);
    } else {
      marketForAnalyze = detectMarketFromSymbol(trimmedSymbol);
      formattedSymbol = formatSymbolForMarket(trimmedSymbol, marketForAnalyze);
    }
    setSelectedMarket(marketForAnalyze);

    setLoading(true);
    setAiLoading(false);
    setAiError('');
    setError('');
    setReportData(null);
    setLoadingStep(0);

    const parseJsonResponse = async (response: Response) => {
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (error) {
        // FMP or other APIs might return non-JSON on error
        throw new Error(t.home.errors.nonJsonResponse);
      }
    };

    // Fetch with timeout helper (90s timeout to account for server-side retries)
    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 90000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(t.home.errors.timeout);
        }
        throw error;
      }
    };

    try {
      // 0. 检查缓存
      const cachedData = await checkCache(formattedSymbol, marketForAnalyze, reportType === 'pro' ? 'professional' : reportType);
      const useCachedAI = cachedData?.cached && cachedData?.hasAiContent;

      // 1. Fetch Basic FMP Data (with 90s timeout)
      const response = await fetchWithTimeout('/api/fmp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formattedSymbol,
          market: marketForAnalyze,
          period: 'annual',
          language: locale,
        }),
      }, 90000);
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        const errorMsg = data?.error || t.home.errors.analysisFailed;
        const retryable = data?.retryable ?? true;
        setIsRetryable(retryable);
        if (errorMsg.includes('找不到') || errorMsg.includes('not found') || errorMsg.includes('无效')) {
          recordSearchToDb(formattedSymbol, undefined, true);
          setIsRetryable(false); // Invalid symbol is not retryable
        }
        throw new Error(errorMsg);
      }
      // Reset retry count on success
      setRetryCount(0);
      setIsRetryable(false);

      recordSearchToDb(formattedSymbol, data?.profile?.companyName);

      // 记录到本地搜索历史
      addToSearchHistory(formattedSymbol, data?.profile?.companyName);
      setSearchHistory(getSearchHistory());

      // 如果有缓存的 AI 分析，直接使用缓存数据
      if (useCachedAI && cachedData?.data?.aiAnalysis) {
        console.log('使用缓存的报告数据');
        const cachedReportType = cachedData.reportType || 'standard';
        const cachedUpdate: Record<string, any> = {
          ...data,
          earningsCallSummary: cachedData.data.earningsCallSummary || '',
          reportGeneratedAt: cachedData.updatedAt,
        };

        if (cachedReportType === 'beginner') {
          cachedUpdate.beginnerAiAnalysis = cachedData.data.aiAnalysis;
        } else if (cachedReportType === 'professional') {
          cachedUpdate.proAiAnalysis = cachedData.data.aiAnalysis;
        } else {
          cachedUpdate.aiAnalysis = cachedData.data.aiAnalysis;
        }

        setReportData(cachedUpdate as ReportData);
        setLoading(false);
        return;
      }

      // 2. Set initial report data with FMP info and generate only the selected tier
      const initialData: ReportData = {
        ...data,
        earningsCallSummary: '',
      };
      setReportData(initialData);
      setLoading(false);

      const versionToGenerate = reportType === 'pro' ? 'professional' : (reportType as 'beginner' | 'standard' | 'professional');
      await generateReportForVersion(versionToGenerate, initialData);

      // 更新报告生成时间
      setReportData(prev => prev ? { ...prev, reportGeneratedAt: new Date().toISOString() } : prev);

    } catch (err: any) {
      console.error(err);
      setRetryCount(prev => prev + 1);
      const baseError = err.message || t.home.errors.networkError;
      const vpnHint = retryCount >= 2 ? '\n\n' + t.home.errors.vpnHint : '';
      setError(baseError + vpnHint);
      setIsRetryable(true);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleAnalyze();
    }
  };

  const resetToHome = () => {
    setReportData(null);
    setSymbol('');
    setAiLoading(false);
    setAiError('');
    setError('');
    // 清除 URL 中的 symbol 参数，防止返回时重新触发分析
    if (searchParams.get('symbol')) {
      router.replace('/', { scroll: false });
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onReset={resetToHome}
        showContactModal={() => setShowContactModal(true)}
      />

      {/* 首页内容 */}
      {!reportData && (
        <>
          {/* Hero Section */}
          <section className="pt-28 md:pt-32 pb-16 md:pb-24 px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              {/* 核心视觉区 */}
              <motion.div
                className="text-center mt-12 md:mt-14 mb-12 md:mb-20"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* 主标题 - 愿景式文案 */}
                <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light text-white mb-6 md:mb-8 leading-tight tracking-tight">
                  {t.home.hero.title}
                  <br className="md:hidden" />
                  <span className="gradient-text font-normal">{t.home.hero.titleHighlight}</span>
                </h2>

                {/* 副标题 */}
                <p className="text-base md:text-xl text-mist-400 max-w-2xl mx-auto leading-relaxed px-4">
                  {t.home.hero.subtitle1}
                  <br className="hidden md:block" />
                  <span className="text-mist-500">{t.home.hero.subtitle2}</span>
                </p>
              </motion.div>

              {/* 搜索区域 - 极简克制风格 */}
              <motion.div
                className="max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* 市场识别提示 - 独立于卡片外 */}
                <div className="flex items-center gap-2 mb-4 text-sm text-mist-500 px-1">
                  <Globe2Icon size={14} className="text-glacier-500/70" />
                  <span>{t.home.search.aiMarketDetect}{currentMarketConfig.nameCn}</span>
                </div>

                {/* Report Type Selector */}
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

                {/* 搜索框容器 */}
                <div ref={suggestContainerRef} className="relative mb-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={symbol}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          // 输入法组合中时保留原始值，否则进行规范化（全角转半角、去空格、转大写）
                          setSymbol(isComposing ? nextValue : normalizeSymbol(nextValue));
                          setError('');
                          setShowSuggestions(true);
                        }}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={(e) => {
                          setIsComposing(false);
                          // 组合结束后进行规范化处理
                          setSymbol(normalizeSymbol(e.currentTarget.value));
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder=""
                        disabled={loading}
                        className="gemini-input w-full px-5 py-4 text-base md:text-lg font-mono disabled:opacity-50"
                      />
                      {/* 动态 placeholder */}
                      {!symbol && (
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden h-6">
                          <div
                            className="transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateY(-${currentStockIndex * 24}px)` }}
                          >
                            {featuredStocks.map((stock, index) => (
                              <div
                                key={index}
                                className="h-6 flex items-center text-mist-600 text-base md:text-lg"
                              >
                                <span className="font-mono">{stock.symbol}</span>
                                <span className="mx-2 text-mist-700">·</span>
                                <span className="text-mist-600">{stock.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="gemini-btn gemini-btn-primary flex items-center justify-center gap-2 md:gap-3 min-w-[140px] md:min-w-[160px] py-4 text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? (
                        <GeminiLoader />
                      ) : (
                        <>
                          <TrendingUpIcon size={20} />
                          <span>{t.home.search.startAnalysis}</span>
                          <ArrowRightIcon size={16} className="opacity-70 hidden sm:block" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* 联想搜索下拉 - 与输入框整合为一体 */}
                  <AnimatePresence>
                    {showSuggestions && (suggestLoading || suggestions.length > 0) && (
                      <motion.div
                        className="absolute left-0 right-0 sm:right-auto sm:w-[calc(100%-172px)] top-full mt-1 z-30 rounded-xl bg-[#12121a] border border-white/[0.06] shadow-xl shadow-black/40"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {/* 加载条 - 仅在加载时显示 */}
                        {suggestLoading && (
                          <div className="px-5 py-2 flex items-center justify-center">
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full w-1/3 bg-gradient-to-r from-glacier-400 via-glacier-500 to-glacier-400 rounded-full animate-bounce-horizontal" />
                            </div>
                          </div>
                        )}
                        <div className="max-h-56 overflow-auto">
                          {suggestions.map((item) => (
                            <button
                              key={`${item.market}-${item.symbol}`}
                              onClick={() => handleSelectSuggestion(item)}
                              className="w-full px-5 py-2.5 text-left hover:bg-white/[0.03] transition-colors flex items-center gap-3"
                            >
                              <span className="font-mono text-sm text-white">{item.symbol}</span>
                              <span className="text-xs text-mist-600 px-1.5 py-0.5 rounded bg-white/[0.04]">
                                {MARKET_CONFIGS[item.market]?.nameCn || item.market}
                              </span>
                              {(item.nameCn || item.name) && (
                                <span className="text-sm text-mist-400 truncate">
                                  {locale === 'en' ? (item.name || item.nameCn) : (item.nameCn || item.name)}
                                </span>
                              )}
                            </button>
                          ))}
                          {suggestions.length === 0 && !suggestLoading && (
                            <div className="px-5 py-2.5 text-sm text-mist-600">{t.home.search.noMatch}</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 错误提示 */}
                {error && (
                  <motion.div
                    className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 shrink-0" />
                      <div className="flex-1">
                        <span className="text-red-400/80 text-sm whitespace-pre-line">{error}</span>
                        {isRetryable && (
                          <button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-glacier-500/20 text-glacier-400 hover:bg-glacier-500/30 transition-colors disabled:opacity-50"
                          >
                            {retryCount > 0 ? t.home.errors.retryWithCount(retryCount) : t.common.retry}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 搜索历史 */}
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
                            onClick={() => setSymbol(item.symbol)}
                            disabled={loading}
                            className="flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="font-mono text-sm text-mist-300 group-hover:text-white transition-colors">
                              {item.symbol}
                            </span>
                            {item.name && (
                              <span className="text-xs text-mist-600 hidden sm:inline">
                                {item.name}
                              </span>
                            )}
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

                {/* 热门股票区域 - 统一冷色调 */}
                <div className="space-y-4">
                  {/* 本周热搜 */}
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
                            onClick={() => setSymbol(stock.symbol)}
                            disabled={loading}
                            className="group relative px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-mist-600">#{index + 1}</span>
                              <span className="font-mono text-sm text-mist-300 group-hover:text-white transition-colors">
                                {stock.symbol}
                              </span>
                            </div>
                            {stock.company_name && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-[#1a1a24] border border-white/[0.06] text-xs text-mist-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                {stock.company_name}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 市场推荐股票 */}
                  <div className="flex items-center gap-2 flex-wrap text-sm px-1">
                    <span className="text-mist-600">{t.home.search.marketHot(currentMarketConfig.nameCn)}</span>
                    {currentMarketConfig.featuredStocks.slice(0, 5).map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => setSymbol(stock.symbol)}
                        disabled={loading}
                        className="stock-chip disabled:opacity-50"
                      >
                        <span className="font-mono">{stock.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* 加载状态 - 极简线性进度 */}
              {loading && (
                <motion.div
                  className="mt-12 md:mt-16 flex justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="glass-card p-6 md:p-8 w-full max-w-md">
                    <LinearLoader step={loadingStep} totalSteps={LOADING_STEPS_META.length} stepTexts={loadingStepTexts} estimateText={t.home.loading.estimate} />
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          {/* 核心优势区 */}
          {!loading && (
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
                      {/* 中文数字 */}
                      <div className="cn-number mb-6">{advantage.number}</div>

                      {/* 标题 */}
                      <h4 className="text-xl font-medium text-white mb-3">{advantage.title}</h4>

                      {/* 描述 */}
                      <p className="text-mist-400 leading-relaxed text-[15px]">{advantage.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* AI 能力展示 */}
          {!loading && (
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

                <Suspense fallback={
                  <div className="glass-card p-12 flex items-center justify-center">
                    <GeminiLoader />
                  </div>
                }>
                  <AIShowcase />
                </Suspense>
              </div>
            </section>
          )}

          {/* 市场覆盖 - 3D 地球 */}
          {!loading && (
            <section className="py-16 md:py-24 px-4 md:px-6 overflow-hidden">
              <div className="max-w-6xl mx-auto">
                <div className="max-w-4xl mx-auto text-center">
                  {/* 文案 & 市场列表 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                  >
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-6">
                      {t.home.globalVision.title}
                    </h3>
                    <p className="text-mist-400 leading-relaxed mb-10 text-[15px] md:text-base max-w-2xl mx-auto">
                      {t.home.globalVision.subtitle}
                    </p>

                    {/* 市场列表 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                      {[
                        { name: t.markets.us, code: 'NYSE / NASDAQ', color: '#4285f4' },
                        { name: t.markets.cn, code: 'SSE / SZSE', color: '#ea4335' },
                        { name: t.markets.hk, code: 'HKEX', color: '#fbbc04' },
                        { name: t.markets.jp, code: 'TSE', color: '#34a853' },
                      ].map((market) => (
                        <div key={market.name} className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-colors">
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
          )}

          {/* 用户评价 */}
          {!loading && (
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

                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <GeminiLoader />
                  </div>
                }>
                  <Testimonials />
                </Suspense>
              </div>
            </section>
          )}

          {/* FAQ 部分 */}
          {!loading && (
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
                        <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">{t.home.faq.q1}</span>
                      </div>
                      <ChevronDownIcon
                        size={16}
                        className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${expandedFaq === 0 ? 'rotate-180' : ''
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
                            <p className="text-mist-400 leading-relaxed text-sm">
                              {t.home.faq.a1_1}
                            </p>
                            <p className="text-mist-400 leading-relaxed text-sm">
                              {t.home.faq.a1_2}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* 是否收费 */}
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
                        <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">{t.home.faq.q2}</span>
                      </div>
                      <ChevronDownIcon
                        size={16}
                        className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${expandedFaq === 1 ? 'rotate-180' : ''
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
                            <p className="text-mist-400 leading-relaxed text-sm">
                              {t.home.faq.a2_1}
                            </p>
                            <p className="text-mist-400 leading-relaxed text-sm">
                              {t.home.faq.a2_2}
                            </p>
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
                        <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">{t.home.faq.q3}</span>
                      </div>
                      <ChevronDownIcon
                        size={16}
                        className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${expandedFaq === 2 ? 'rotate-180' : ''
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
                              <p className="text-mist-400 leading-relaxed text-sm">
                                {t.home.faq.a3_1}
                              </p>
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

                            {/* 微信群二维码 */}
                            <div className="pt-2">
                              <div className="bg-white/5 rounded-md p-4 text-center border border-white/5">
                                <p className="text-mist-400 text-sm mb-3">{t.home.faq.scanQr}</p>
                                <div className="w-32 h-32 bg-white rounded-sm p-1 mx-auto">
                                  <img
                                    src="/wechat-qr.jpg"
                                    alt="WeChat QR"
                                    className="w-full h-full object-contain"
                                  />
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

                {/* 底部提示 */}
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
          )}

          {/* Footer */}
          {!loading && (
            <footer className="py-8 md:py-12 px-4 md:px-6 border-t border-white/5">
              <div className="max-w-6xl mx-auto text-center">
                <div className="flex items-center justify-center gap-2 text-mist-500 text-sm mb-1">
                  <span>{t.home.footer.reportCount}</span>
                  <Suspense fallback={<span className="font-mono">—</span>}>
                    <FlipCounter value={reportCount} className="text-glacier-400 text-base relative" />
                  </Suspense>
                  <span>{t.home.footer.reportUnit}</span>
                </div>
                <p className="text-mist-600 text-sm">
                  {t.home.footer.copyright(new Date().getFullYear())}
                </p>
                <p className="text-mist-700 text-xs mt-2">
                  {t.home.footer.dataSource}
                </p>
              </div>
            </footer>
          )}
        </>
      )}

      {/* Report Section */}
      {reportData && (
        <div className="pt-24">
          <Report
            data={reportData}
            initialReportVersion={reportType === 'pro' ? 'professional' : reportType === 'beginner' ? 'beginner' : 'standard'}
            aiLoading={aiLoading}
            aiError={aiError}
            onReset={resetToHome}
            theme={theme}
            onVersionChange={async (newVersion) => {
              if (!reportData) return;
              setReportType(newVersion === 'professional' ? 'pro' : newVersion);
              await generateReportForVersion(newVersion, reportData);
            }}
            onRegenerate={async () => {
              if (!reportData) return;
              const symbolToRegenerate = reportData.profile.symbol;
              const marketToRegenerate = reportData.market || 'US';

              try {
                await fetch(`/api/cache?symbol=${encodeURIComponent(symbolToRegenerate)}&market=${marketToRegenerate}&language=${locale}&type=${reportType === 'pro' ? 'professional' : reportType}`, {
                  method: 'DELETE',
                });
              } catch (e) {
                console.error('删除缓存失败:', e);
              }

              // 设置 symbol 并触发重新分析
              setSymbol(symbolToRegenerate);
              setSelectedMarket(marketToRegenerate as MarketType);

              // 清空当前报告数据，触发重新生成
              setReportData(null);

              // 延迟调用 handleAnalyze 确保状态更新
              setTimeout(() => {
                handleAnalyze();
              }, 100);
            }}
          />
        </div>
      )}

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title={t.home.contact.title}
        scanQr={t.home.contact.scanQr}
        lookForward={t.home.contact.lookForward}
        wechatLabel={t.home.faq.wechat}
        emailLabel={t.home.faq.email}
      />

      {/* Company Filter Modal */}
      <CompanyFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSelectCompany={(selectedSymbol) => {
          setSymbol(selectedSymbol);
          setShowFilterModal(false);
          // Trigger analysis after a short delay to ensure state is updated
          setTimeout(() => handleAnalyze(), 100);
        }}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
        <GeminiLoader />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
