'use client';

import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Report from '@/components/Report';
import type { ReportData, MarketType } from '@/types';
import { MARKET_CONFIGS, detectMarketFromSymbol, formatSymbolForMarket, getMarketConfig } from '@/lib/markets';
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
  InsightIcon,
  CrossValidateIcon,
  MinimalistIcon,
  LogoIcon,
} from '@/components/Icons';

// 懒加载 3D 地球组件
const ParticleGlobe = lazy(() => import('@/components/ParticleGlobe'));
const AIShowcase = lazy(() => import('@/components/AIShowcase'));
const Testimonials = lazy(() => import('@/components/Testimonials'));

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

const LOADING_STEPS = [
  { text: '正在获取企业基本信息', icon: FileTextIcon, color: 'from-glacier-500 to-glacier-600' },
  { text: '正在分析财务数据', icon: BarChart3Icon, color: 'from-gemini-purple to-gemini-pink' },
  { text: 'AI 正在深度分析', icon: BrainIcon, color: 'from-gemini-blue to-gemini-purple' },
  { text: '正在搜索最新动态', icon: Globe2Icon, color: 'from-glacier-400 to-gemini-blue' },
  { text: '正在生成研究报告', icon: TrendingUpIcon, color: 'from-gemini-green to-glacier-500' },
];

// 热门股票展示列表
const FEATURED_STOCKS = [
  { symbol: 'AAPL', name: '苹果' },
  { symbol: 'NVDA', name: '英伟达' },
  { symbol: 'TSLA', name: '特斯拉' },
  { symbol: 'MSFT', name: '微软' },
  { symbol: 'GOOGL', name: '谷歌' },
  { symbol: '600519.SS', name: '贵州茅台' },
  { symbol: '000858.SZ', name: '五粮液' },
  { symbol: '0700.HK', name: '腾讯控股' },
  { symbol: '9988.HK', name: '阿里巴巴' },
  { symbol: '7203.T', name: '丰田汽车' },
];

// 核心优势数据
const CORE_ADVANTAGES = [
  {
    id: 'ai-logic',
    number: '壹',
    title: '穿透表象的 AI 逻辑',
    description: 'AI 不止总结数据，而是理解财报背后的商业动机，洞察企业真正的经营本质。',
    icon: InsightIcon,
    gradient: 'from-glacier-500 to-gemini-blue',
  },
  {
    id: 'multi-source',
    number: '贰',
    title: '多维数据印证',
    description: '整合 FMP 财务数据与 Google Search 实时新闻，实现基本面与消息面的交叉验证。',
    icon: CrossValidateIcon,
    gradient: 'from-gemini-purple to-aurora-3',
  },
  {
    id: 'minimalist',
    number: '叁',
    title: '极致克制的研报',
    description: '告别繁琐的传统报告，用可视化（如桑基图）还原经营本质，只留下真正重要的信息。',
    icon: MinimalistIcon,
    gradient: 'from-gemini-blue to-glacier-500',
  },
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

// 圆形进度加载器
function CircularLoader({ step, totalSteps }: { step: number; totalSteps: number }) {
  const progress = ((step + 1) / totalSteps) * 100;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const Icon = LOADING_STEPS[step].icon;
  
  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="50%" stopColor="#4285f4" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${LOADING_STEPS[step].color} flex items-center justify-center`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('US');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestContainerRef = useRef<HTMLDivElement>(null);
  
  const currentMarketConfig = getMarketConfig(selectedMarket);

  // 股票翻牌动画
  useEffect(() => {
    if (symbol || reportData) return;
    const interval = setInterval(() => {
      setCurrentStockIndex((prev) => (prev + 1) % FEATURED_STOCKS.length);
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

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
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
          body: JSON.stringify({ query, market: marketHint }),
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
  }, [symbol]);

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

  const handleAnalyze = async () => {
    const trimmedSymbol = symbol.trim().toUpperCase();
    if (!trimmedSymbol) {
      setError('请输入股票代码');
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
        const snippet = text.trim().slice(0, 200);
        throw new Error(snippet || '服务返回了非 JSON 响应');
      }
    };

    try {
      const response = await fetch('/api/fmp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: formattedSymbol,
          market: marketForAnalyze 
        }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        const errorMsg = data?.error || '分析失败，请稍后重试';
        if (errorMsg.includes('找不到') || errorMsg.includes('not found') || errorMsg.includes('无效')) {
          recordSearchToDb(formattedSymbol, undefined, true);
        }
        throw new Error(errorMsg);
      }

      recordSearchToDb(formattedSymbol, data?.profile?.companyName);
      setReportData(data);
      setLoading(false);

      setAiLoading(true);
      try {
        const aiResponse = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: formattedSymbol,
            profile: data.profile,
            incomeStatements: data.incomeStatements,
            peers: data.peers,
            earningsTranscripts: data.earningsTranscripts || [],
            market: marketForAnalyze,
          }),
        });

        const aiData = await parseJsonResponse(aiResponse);

        if (!aiResponse.ok) {
          throw new Error(aiData?.error || 'AI 分析失败，请稍后重试');
        }

        setReportData((prev) =>
          prev
            ? {
                ...prev,
                aiAnalysis: aiData.aiAnalysis,
                searchResults: aiData.searchResults,
                earningsCallSummary: aiData.earningsCallSummary,
              }
            : prev
        );

        const companyName = data.profile?.companyName;
        const transcript = data.earningsTranscripts?.[0];
        const transcriptText =
          transcript?.content || transcript?.transcript || transcript?.text || '';

        if (companyName) {
          (async () => {
            try {
              const searchResponse = await fetch('/api/ai/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  symbol: formattedSymbol,
                  companyName,
                  market: marketForAnalyze,
                }),
              });
              const searchData = await parseJsonResponse(searchResponse);
              if (searchResponse.ok && searchData) {
                const searchResultsText = searchData.searchResults || '';
                const supplementary = searchData.supplementary || {};
                setReportData((prev) => {
                  if (!prev || !prev.aiAnalysis) return prev;
                  const nextAnalysis = { ...prev.aiAnalysis };
                  if (searchResultsText) {
                    nextAnalysis.recentDevelopments = searchResultsText;
                  } else if (supplementary.recentNews) {
                    nextAnalysis.recentDevelopments = supplementary.recentNews;
                  }
                  if (supplementary.competitors && nextAnalysis.competitors === '暂无竞争对手数据') {
                    nextAnalysis.competitors = supplementary.competitors;
                  }

                  let nextEarningsSummary = prev.earningsCallSummary;
                  if (!transcriptText && supplementary.analystViews && !nextEarningsSummary) {
                    nextEarningsSummary = `## 分析师观点\n\n${supplementary.analystViews}`;
                  }

                  return {
                    ...prev,
                    aiAnalysis: nextAnalysis,
                    searchResults: searchResultsText || prev.searchResults,
                    earningsCallSummary: nextEarningsSummary,
                  };
                });
              }
            } catch (e) {
              console.log('AI search update failed:', e);
            }
          })();
        }

        if (transcriptText && companyName) {
          (async () => {
            try {
              const summaryResponse = await fetch('/api/ai/earnings-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transcriptText,
                  companyName,
                  symbol: formattedSymbol,
                }),
              });
              const summaryData = await parseJsonResponse(summaryResponse);
              if (summaryResponse.ok && summaryData?.earningsCallSummary) {
                setReportData((prev) =>
                  prev
                    ? {
                        ...prev,
                        earningsCallSummary: summaryData.earningsCallSummary,
                      }
                    : prev
                );
              }
            } catch (e) {
              console.log('Earnings summary update failed:', e);
            }
          })();
        }
      } catch (err: any) {
        setAiError(err.message || 'AI 分析失败，请稍后重试');
      } finally {
        setAiLoading(false);
      }
    } catch (err: any) {
      setError(err.message || '网络错误，请检查连接后重试');
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
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 glass-card backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={resetToHome}
              >
                <div className="relative">
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-glacier-500 to-gemini-blue flex items-center justify-center shadow-lg shadow-glacier-500/20 group-hover:shadow-glacier-500/40 transition-shadow">
                    <LogoIcon size={24} className="text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-glacier-500 to-gemini-blue opacity-40 blur-xl group-hover:opacity-60 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-base md:text-lg font-semibold text-white group-hover:text-glacier-400 transition-colors">智投研究</h1>
                  <p className="text-xs text-mist-500 hidden sm:block">AI Investment Research</p>
                </div>
              </div>
              
              {/* 状态指示 */}
              <div className="flex items-center gap-3 md:gap-4">
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <div className="w-2 h-2 bg-glacier-500 rounded-full animate-pulse" />
                  <span className="text-sm text-mist-400">Gemini AI</span>
                </div>
                <div className="flex items-center gap-2 text-mist-500 text-sm">
                  <FileTextIcon size={16} />
                  <span className="hidden sm:inline">Powered by FMP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 首页内容 */}
      {!reportData && (
        <>
          {/* Hero Section */}
          <section className="pt-28 md:pt-32 pb-16 md:pb-24 px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              {/* 核心视觉区 */}
              <motion.div 
                className="text-center mb-12 md:mb-20"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* 主标题 - 愿景式文案 */}
                <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light text-white mb-6 md:mb-8 leading-tight tracking-tight">
                  看透财务，
                  <br className="md:hidden" />
                  <span className="gradient-text font-normal">见证商业逻辑</span>
                </h2>
                
                {/* 副标题 */}
                <p className="text-base md:text-xl text-mist-400 max-w-2xl mx-auto leading-relaxed px-4">
                  将海量数据转化为你的投资决断
                  <br className="hidden md:block" />
                  <span className="text-mist-500">跨越市场疆界，AI 为你实时解码</span>
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
                  <span>AI 自动识别市场 · 当前：{currentMarketConfig.nameCn}</span>
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
                          setSymbol(isComposing ? nextValue : nextValue.toUpperCase());
                          setError('');
                          setShowSuggestions(true);
                        }}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={(e) => {
                          setIsComposing(false);
                          setSymbol(e.currentTarget.value.toUpperCase());
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
                            {FEATURED_STOCKS.map((stock, index) => (
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
                          <span>开始分析</span>
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
                        <div className="px-5 py-2.5 text-xs text-mist-500 flex items-center justify-between">
                          <span>AI 联想</span>
                          {suggestLoading && <span className="text-mist-600">查询中...</span>}
                        </div>
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
                                  {item.nameCn || item.name}
                                </span>
                              )}
                            </button>
                          ))}
                          {suggestions.length === 0 && !suggestLoading && (
                            <div className="px-5 py-2.5 text-sm text-mist-600">暂未找到匹配结果</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 错误提示 */}
                {error && (
                  <motion.div 
                    className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center gap-3"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    <span className="text-red-400/80 text-sm">{error}</span>
                  </motion.div>
                )}

                {/* 热门股票区域 - 统一冷色调 */}
                <div className="space-y-4">
                  {/* 本周热搜 */}
                  {trendingStocks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <FlameIcon size={14} className="text-mist-500" />
                        <span className="text-sm text-mist-500">本周热搜</span>
                        <div className="flex items-center gap-1 ml-auto text-xs text-mist-600">
                          <ClockIcon size={11} />
                          <span className="hidden sm:inline">实时更新</span>
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
                    <span className="text-mist-600">{currentMarketConfig.nameCn}热门：</span>
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

              {/* 加载状态 */}
              {loading && (
                <motion.div 
                  className="mt-12 md:mt-16 flex justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="glass-card p-8 md:p-10 flex flex-col items-center gap-6 md:gap-8 pulse-glow">
                    <CircularLoader step={loadingStep} totalSteps={LOADING_STEPS.length} />
                    
                    <div className="text-center">
                      <p className="text-lg md:text-xl font-medium text-white mb-2">
                        {LOADING_STEPS[loadingStep].text}
                      </p>
                      <p className="text-sm text-mist-500">
                        预计需要 15-30 秒，请稍候...
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {LOADING_STEPS.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${
                            index === loadingStep 
                              ? 'bg-glacier-500 scale-125 shadow-lg shadow-glacier-500/50' 
                              : index < loadingStep 
                                ? 'bg-glacier-500/50' 
                                : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
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
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">为什么选择智投研究</h3>
                  <p className="text-mist-500 text-sm md:text-base">不只是工具，更是你的投研智囊</p>
                </motion.div>
                
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                  {CORE_ADVANTAGES.map((advantage, index) => (
                    <motion.div
                      key={advantage.id}
                      className="feature-card group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      {/* 中文数字 */}
                      <div className="cn-number mb-4">{advantage.number}</div>
                      
                      {/* 图标 */}
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${advantage.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <advantage.icon size={24} className="text-white" />
                      </div>
                      
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
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">AI 正在解读</h3>
                  <p className="text-mist-500 text-sm md:text-base">实时展示研报生成过程</p>
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
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                  {/* 左侧文案 */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                  >
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-6">
                      全球视野，
                      <br />
                      <span className="gradient-text">本土洞察</span>
                    </h3>
                    <p className="text-mist-400 leading-relaxed mb-8 text-[15px] md:text-base">
                      无论是硅谷的创新脉搏，还是沪深的产业律动，
                      <br className="hidden md:block" />
                      AI 为你跨越市场疆界，实时解码全球投资机会。
                    </p>
                    
                    {/* 市场列表 */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: '美股', code: 'NYSE / NASDAQ', color: '#4285f4' },
                        { name: 'A股', code: 'SSE / SZSE', color: '#ea4335' },
                        { name: '港股', code: 'HKEX', color: '#fbbc04' },
                        { name: '日股', code: 'TSE', color: '#34a853' },
                      ].map((market) => (
                        <div key={market.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: market.color }} />
                          <div>
                            <div className="text-white font-medium text-sm">{market.name}</div>
                            <div className="text-mist-600 text-xs">{market.code}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* 右侧 3D 地球 */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <Suspense fallback={
                      <div className="globe-container flex items-center justify-center">
                        <GeminiLoader />
                      </div>
                    }>
                      <ParticleGlobe />
                    </Suspense>
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
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">用户如是说</h3>
                  <p className="text-mist-500 text-sm md:text-base">来自不同背景投资者的真实反馈</p>
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
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">常见问题</h3>
                </motion.div>
                
                <div className="space-y-4">
                  {/* 如何使用 */}
                  <motion.div 
                    className="glass-card overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === 0 ? null : 0)}
                      className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-glacier-500 to-gemini-blue flex items-center justify-center flex-shrink-0">
                          <HelpCircleIcon size={20} className="text-white" />
                        </div>
                        <span className="text-base md:text-lg font-medium text-white text-left">如何使用？</span>
                      </div>
                      <ChevronDownIcon 
                        size={20}
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
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 space-y-3 border-t border-white/5">
                            <p className="text-mist-400 leading-relaxed text-sm md:text-base">
                              在搜索框输入股票代码（如 <span className="text-glacier-400 font-mono">AAPL</span>、<span className="text-glacier-400 font-mono">600519</span>、<span className="text-glacier-400 font-mono">0700.HK</span>）或公司名称，点击"开始分析"即可。
                            </p>
                            <p className="text-mist-400 leading-relaxed text-sm md:text-base">
                              生成报告通常需要 <span className="text-glacier-400 font-semibold">15-30 秒</span>，系统会自动识别市场并调用 AI 进行深度分析。
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* 是否收费 */}
                  <motion.div 
                    className="glass-card overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                      className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gemini-purple to-aurora-3 flex items-center justify-center flex-shrink-0">
                          <DollarSignIcon size={20} className="text-white" />
                        </div>
                        <span className="text-base md:text-lg font-medium text-white text-left">是否收费？</span>
                      </div>
                      <ChevronDownIcon 
                        size={20}
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
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 space-y-3 border-t border-white/5">
                            <p className="text-mist-400 leading-relaxed text-sm md:text-base">
                              目前 <span className="text-glacier-400 font-semibold">完全免费</span>，所有 API 调用、AI 分析等费用均由创作者个人承担。
                            </p>
                            <p className="text-mist-400 leading-relaxed text-sm md:text-base">
                              我们的目标是帮助更多人了解股票投资，做出更明智的决策。
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* 联系作者 */}
                  <motion.div 
                    className="glass-card overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                      className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gemini-yellow to-gemini-red flex items-center justify-center flex-shrink-0">
                          <MessageCircleIcon size={20} className="text-white" />
                        </div>
                        <span className="text-base md:text-lg font-medium text-white text-left">联系作者与反馈</span>
                      </div>
                      <ChevronDownIcon 
                        size={20}
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
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 space-y-4 border-t border-white/5">
                            <div className="space-y-2">
                              <p className="text-mist-400 leading-relaxed text-sm md:text-base">
                                欢迎通过以下方式联系我们：
                              </p>
                              <div className="space-y-2 pl-4">
                                <p className="text-mist-400 text-sm md:text-base">
                                  <span className="text-mist-500">微信：</span>
                                  <span className="text-glacier-400 font-mono ml-2">kaizhou_wang</span>
                                </p>
                                <p className="text-mist-400 text-sm md:text-base">
                                  <span className="text-mist-500">邮箱：</span>
                                  <a 
                                    href="mailto:wangkaizhou2024@gmail.com" 
                                    className="text-glacier-400 hover:text-glacier-300 transition-colors ml-2"
                                  >
                                    wangkaizhou2024@gmail.com
                                  </a>
                                </p>
                              </div>
                            </div>

                            {/* 微信群二维码 */}
                            <div className="pt-4">
                              <div className="bg-white/5 rounded-2xl p-4 text-center">
                                <p className="text-mist-400 text-sm mb-3">扫码加入微信群</p>
                                <div className="w-40 h-40 md:w-48 md:h-48 bg-white rounded-xl p-2 mx-auto">
                                  <img 
                                    src="/wechat-qr.jpg" 
                                    alt="微信群二维码" 
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <p className="text-mist-600 text-xs mt-3">二维码 7 天内有效</p>
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
                    还有其他问题？
                    <a href="mailto:wangkaizhou2024@gmail.com" className="text-glacier-400 hover:text-glacier-300 transition-colors ml-1">
                      联系我们
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
                <p className="text-mist-600 text-sm">
                  © {new Date().getFullYear()} 智投研究 · AI Investment Research
                </p>
                <p className="text-mist-700 text-xs mt-2">
                  数据来源：Financial Modeling Prep (FMP) · AI 由 Google Gemini 提供支持
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
            aiLoading={aiLoading}
            aiError={aiError}
            onReset={resetToHome} 
          />
        </div>
      )}
    </main>
  );
}
