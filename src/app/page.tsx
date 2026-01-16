'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, FileText, Loader2, Zap, BarChart3, Brain, Globe2 } from 'lucide-react';
import Report from '@/components/Report';
import type { ReportData } from '@/types';

const FEATURED_STOCKS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'AMD', name: 'AMD' },
];

const LOADING_STEPS = [
  { text: '正在获取企业基本信息...', icon: FileText },
  { text: '正在分析财务数据...', icon: BarChart3 },
  { text: 'AI 正在深度分析行业与竞争格局...', icon: Brain },
  { text: '正在搜索最新新闻动态...', icon: Globe2 },
  { text: '正在生成投资研究报告...', icon: Zap },
];

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleAnalyze = async () => {
    const trimmedSymbol = symbol.trim().toUpperCase();
    if (!trimmedSymbol) {
      setError('请输入股票代码');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);
    setLoadingStep(0);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: trimmedSymbol }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '分析失败，请稍后重试');
      }

      setReportData(data);
    } catch (err: any) {
      setError(err.message || '网络错误，请检查连接后重试');
    } finally {
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
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-aurora-600/5 rounded-full blur-[120px] transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-[100px] transform -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[80px] transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-xl bg-obsidian/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => {
                setReportData(null);
                setSymbol('');
                setError('');
              }}
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-700 flex items-center justify-center shadow-lg shadow-aurora-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white">智投研究</h1>
                <p className="text-xs text-slate-500">AI Investment Research</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="hidden md:flex items-center gap-4 mr-4">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Gemini 2.5 Flash
                </span>
              </div>
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Powered by FMP API</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        {!reportData && (
          <section className="max-w-4xl mx-auto px-6 pt-16 md:pt-24 pb-16">
            <div className="text-center mb-12 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-aurora-500/10 border border-aurora-500/20 rounded-full text-aurora-400 text-sm mb-6">
                <Zap className="w-4 h-4" />
                AI 驱动 · 实时数据 · 专业分析
              </div>
              <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                智能投资研究
                <br />
                <span className="gradient-text">一键生成报告</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                输入任意美股代码，AI 自动分析企业基本面、行业格局、竞争优势，
                <br className="hidden md:block" />
                生成专业级投资调研报告
              </p>
            </div>

            {/* Search Box */}
            <div className="glass-card glow p-6 md:p-8 animate-fade-in-up animation-delay-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value.toUpperCase());
                      setError('');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="输入股票代码，例如 AAPL、TSLA、NVDA"
                    disabled={loading}
                    className="w-full pl-12 pr-4 py-4 bg-midnight/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-aurora-500 focus:ring-2 focus:ring-aurora-500/20 transition-all font-mono text-lg disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-aurora-600 to-aurora-500 hover:from-aurora-500 hover:to-aurora-400 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 flex items-center justify-center gap-2 min-w-[160px] shadow-lg shadow-aurora-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      开始分析
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {error}
                </div>
              )}

              {/* 示例股票 */}
              <div className="mt-6 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-600">热门标的：</span>
                {FEATURED_STOCKS.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => setSymbol(stock.symbol)}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm bg-white/5 hover:bg-aurora-500/20 border border-white/10 hover:border-aurora-500/50 rounded-full text-slate-400 hover:text-aurora-400 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {stock.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="mt-12 text-center animate-fade-in-up">
                <div className="inline-flex flex-col items-center gap-6 glass-card loading-pulse px-10 py-8">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-aurora-500/30 border-t-aurora-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {(() => {
                        const Icon = LOADING_STEPS[loadingStep].icon;
                        return <Icon className="w-6 h-6 text-aurora-400" />;
                      })()}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium text-lg mb-2">
                      {LOADING_STEPS[loadingStep].text}
                    </p>
                    <p className="text-sm text-slate-500">
                      预计需要 15-30 秒，请稍候...
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {LOADING_STEPS.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === loadingStep ? 'bg-aurora-500 scale-125' : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {!loading && (
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up animation-delay-400">
                <div className="glass-card p-6 text-center group hover:border-aurora-500/30 transition-colors">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-aurora-500/20 to-aurora-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Brain className="w-7 h-7 text-aurora-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">AI 深度分析</h3>
                  <p className="text-sm text-slate-500">
                    基于 Gemini 2.5 Flash 模型，深入分析企业基本面、行业格局与竞争优势
                  </p>
                </div>
                <div className="glass-card p-6 text-center group hover:border-purple-500/30 transition-colors">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">可视化图表</h3>
                  <p className="text-sm text-slate-500">
                    桑基图展示营收流向，柱状图、饼图、折线图多维度呈现财务数据
                  </p>
                </div>
                <div className="glass-card p-6 text-center group hover:border-gold-400/30 transition-colors">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold-400/20 to-gold-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Globe2 className="w-7 h-7 text-gold-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">实时信息</h3>
                  <p className="text-sm text-slate-500">
                    整合 Google Search 与 FMP API，获取最新新闻动态与财务数据
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Report Section */}
        {reportData && (
          <Report 
            data={reportData} 
            onReset={() => {
              setReportData(null);
              setSymbol('');
            }} 
          />
        )}
      </div>
    </main>
  );
}
