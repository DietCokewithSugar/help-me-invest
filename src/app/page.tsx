'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, FileText, Zap, BarChart3, Brain, Globe2, Sparkles, ArrowRight, Flame, Clock } from 'lucide-react';
import Report from '@/components/Report';
import type { ReportData } from '@/types';

// 默认热门股票（当数据库没有数据时使用）
const DEFAULT_FEATURED_STOCKS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'AMD', name: 'AMD' },
];

// 热门股票类型
interface TrendingStock {
  symbol: string;
  company_name: string | null;
  total_searches: number;
  last_searched: string;
}

const LOADING_STEPS = [
  { text: '正在获取企业基本信息', icon: FileText, color: 'from-blue-500 to-blue-600' },
  { text: '正在分析财务数据', icon: BarChart3, color: 'from-purple-500 to-purple-600' },
  { text: 'AI 正在深度分析', icon: Brain, color: 'from-pink-500 to-pink-600' },
  { text: '正在搜索最新动态', icon: Globe2, color: 'from-cyan-500 to-cyan-600' },
  { text: '正在生成研究报告', icon: Zap, color: 'from-amber-500 to-amber-600' },
];

// Gemini 风格的四点加载动画
function GeminiLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-gemini-blue animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-red animate-bounce" style={{ animationDelay: '100ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-yellow animate-bounce" style={{ animationDelay: '200ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-green animate-bounce" style={{ animationDelay: '300ms' }} />
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
      {/* 背景圆环 */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        {/* 进度圆环 */}
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
            <stop offset="0%" stopColor="#4285f4" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* 中心图标 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${LOADING_STEPS[step].color} flex items-center justify-center animate-breathe`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // 记录搜索到数据库（异步，不阻塞主流程）
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
      // 静默失败，不影响用户体验
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

    setLoading(true);
    setAiLoading(false);
    setAiError('');
    setError('');
    setReportData(null);
    setLoadingStep(0);

    try {
      const response = await fetch('/api/fmp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: trimmedSymbol }),
      });

      const data = await response.json();

      if (!response.ok) {
        // FMP 返回错误，可能是无效股票代码
        const errorMsg = data.error || '分析失败，请稍后重试';
        // 如果是找不到股票的错误，标记为无效
        if (errorMsg.includes('找不到') || errorMsg.includes('not found') || errorMsg.includes('无效')) {
          recordSearchToDb(trimmedSymbol, undefined, true);
        }
        throw new Error(errorMsg);
      }

      // 搜索成功，记录到数据库（包含公司名称）
      recordSearchToDb(trimmedSymbol, data.profile?.companyName);

      setReportData(data);
      setLoading(false);

      setAiLoading(true);
      try {
        const aiResponse = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: trimmedSymbol,
            profile: data.profile,
            incomeStatements: data.incomeStatements,
            peers: data.peers,
            earningsTranscripts: data.earningsTranscripts || [],
          }),
        });

        const aiData = await aiResponse.json();

        if (!aiResponse.ok) {
          throw new Error(aiData.error || 'AI 分析失败，请稍后重试');
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

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="max-w-7xl mx-auto px-6 py-4 gemini-card backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => {
                  setReportData(null);
                  setSymbol('');
                  setError('');
                }}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center shadow-lg shadow-gemini-blue/20 group-hover:shadow-gemini-blue/40 transition-shadow">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  {/* 光晕 */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gemini-blue to-gemini-purple opacity-40 blur-xl group-hover:opacity-60 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white group-hover:text-gemini-blue transition-colors">智投研究</h1>
                  <p className="text-xs text-mist-500">AI Investment Research</p>
                </div>
              </div>
              
              {/* 状态指示 */}
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <div className="w-2 h-2 bg-gemini-green rounded-full animate-pulse" />
                  <span className="text-sm text-mist-400">Gemini 3 Flash</span>
                </div>
                <div className="flex items-center gap-2 text-mist-500 text-sm">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Powered by FMP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!reportData && (
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            {/* 标语区域 */}
            <div className="text-center mb-16 animate-fade-in-up">
              {/* 徽章 */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gemini-blue/10 to-gemini-purple/10 border border-gemini-blue/20 mb-8">
                <Zap className="w-4 h-4 text-gemini-blue" />
                <span className="text-sm text-gemini-blue font-medium">AI 驱动 · 实时数据 · 专业分析</span>
              </div>
              
              {/* 主标题 */}
              <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                智能投资研究
                <br />
                <span className="gradient-text">一键生成报告</span>
              </h2>
              
              {/* 副标题 */}
              <p className="text-lg md:text-xl text-mist-400 max-w-2xl mx-auto leading-relaxed">
                输入任意美股代码，AI 自动分析企业基本面、行业格局、竞争优势，
                <br className="hidden md:block" />
                生成专业级投资调研报告
              </p>
            </div>

            {/* 搜索区域 */}
            <div className="animate-fade-in-up delay-200">
              <div className="gemini-card gemini-card-glow p-8 md:p-10">
                {/* 搜索框 */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Search className="w-5 h-5 text-mist-500 group-focus-within:text-gemini-blue transition-colors" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={symbol}
                      onChange={(e) => {
                        setSymbol(e.target.value.toUpperCase());
                        setError('');
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="输入股票代码，例如 AAPL、TSLA、NVDA"
                      disabled={loading}
                      className="gemini-input w-full pl-14 pr-5 py-5 text-lg font-mono disabled:opacity-50"
                    />
                    
                    {/* 输入框发光边框 */}
                    <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gemini-blue via-gemini-purple to-gemini-pink opacity-20 blur-xl" />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="gemini-btn gemini-btn-primary flex items-center justify-center gap-3 min-w-[180px] py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <GeminiLoader />
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        开始分析
                        <ArrowRight className="w-4 h-4 opacity-70" />
                      </>
                    )}
                  </button>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-fade-in">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}

                {/* 热门股票榜单 */}
                <div className="space-y-4">
                  {/* 本周热门榜单 */}
                  {trendingStocks.length > 0 && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-400">本周热搜</span>
                        <div className="flex items-center gap-1 ml-auto text-xs text-mist-600">
                          <Clock className="w-3 h-3" />
                          <span>实时更新</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {trendingStocks.map((stock, index) => (
                          <button
                            key={stock.symbol}
                            onClick={() => setSymbol(stock.symbol)}
                            disabled={loading}
                            className="group relative px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-orange-400/60">#{index + 1}</span>
                              <span className="font-mono text-sm text-white group-hover:text-orange-300 transition-colors">
                                {stock.symbol}
                              </span>
                              {stock.total_searches > 1 && (
                                <span className="text-xs text-mist-500">
                                  {stock.total_searches}次
                                </span>
                              )}
                            </div>
                            {stock.company_name && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-night-800 border border-night-700 text-xs text-mist-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {stock.company_name}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 默认推荐（当没有热门数据或作为补充） */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-mist-600">
                      {trendingStocks.length > 0 ? '更多推荐：' : '热门标的：'}
                    </span>
                    {(trendingStocks.length > 0 
                      ? DEFAULT_FEATURED_STOCKS.filter(
                          s => !trendingStocks.some(t => t.symbol === s.symbol)
                        ).slice(0, 5)
                      : DEFAULT_FEATURED_STOCKS
                    ).map((stock, index) => (
                      <button
                        key={stock.symbol}
                        onClick={() => setSymbol(stock.symbol)}
                        disabled={loading}
                        className="stock-chip disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {stock.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 加载状态 */}
            {loading && (
              <div className="mt-16 flex justify-center animate-fade-in-up">
                <div className="gemini-card p-10 flex flex-col items-center gap-8 pulse-glow">
                  <CircularLoader step={loadingStep} totalSteps={LOADING_STEPS.length} />
                  
                  <div className="text-center">
                    <p className="text-xl font-medium text-white mb-2">
                      {LOADING_STEPS[loadingStep].text}
                    </p>
                    <p className="text-sm text-mist-500">
                      预计需要 15-30 秒，请稍候...
                    </p>
                  </div>
                  
                  {/* 步骤指示器 */}
                  <div className="flex gap-2">
                    {LOADING_STEPS.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          index === loadingStep 
                            ? 'bg-gemini-blue scale-125 shadow-lg shadow-gemini-blue/50' 
                            : index < loadingStep 
                              ? 'bg-gemini-blue/50' 
                              : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 特性卡片 */}
            {!loading && (
              <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Brain,
                    title: 'AI 深度分析',
                    description: '基于 Gemini 3 Flash 模型，深入分析企业基本面、行业格局与竞争优势',
                    gradient: 'from-gemini-blue to-gemini-purple',
                    delay: '300',
                  },
                  {
                    icon: BarChart3,
                    title: '可视化图表',
                    description: '桑基图展示营收流向，柱状图、饼图、折线图多维度呈现财务数据',
                    gradient: 'from-gemini-purple to-gemini-pink',
                    delay: '400',
                  },
                  {
                    icon: Globe2,
                    title: '实时信息',
                    description: '整合 Google Search 与 FMP API，获取最新新闻动态与财务数据',
                    gradient: 'from-gemini-pink to-gemini-yellow',
                    delay: '500',
                  },
                ].map((feature, index) => (
                  <div 
                    key={index} 
                    className={`feature-card text-center animate-fade-in-up delay-${feature.delay}`}
                  >
                    {/* 图标 */}
                    <div className="relative inline-flex mb-6">
                      <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      {/* 光晕 */}
                      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-30 blur-2xl`} />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                    <p className="text-mist-400 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Report Section */}
      {reportData && (
        <div className="pt-24">
          <Report 
            data={reportData} 
            aiLoading={aiLoading}
            aiError={aiError}
            onReset={() => {
              setReportData(null);
              setSymbol('');
              setAiLoading(false);
              setAiError('');
              setError('');
            }} 
          />
        </div>
      )}
    </main>
  );
}
