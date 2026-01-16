'use client';

import { useRef, useState } from 'react';
import { 
  Building2, TrendingUp, Target, Shield, Newspaper, 
  ArrowLeft, Download, Users, AlertTriangle, Sparkles,
  Globe, Calendar, DollarSign, Users2, Loader2, CheckCircle,
  FileSpreadsheet, Calculator, Briefcase, ChevronDown, ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SankeyChart from './SankeyChart';
import RevenueCharts from './RevenueCharts';
import FinancialStatements from './FinancialStatements';
import ValuationMetrics from './ValuationMetrics';
import EventCalendar from './EventCalendar';
import HoldingsAnalysis from './HoldingsAnalysis';
import type { ReportData } from '@/types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportProps {
  data: ReportData;
  onReset: () => void;
}

export default function Report({ data, onReset }: ReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    aiAnalysis: true,
    financialStatements: true,
    valuation: true,
    events: false,
    holdings: false,
  });

  const { 
    profile, 
    incomeStatements, 
    balanceSheets = [],
    cashFlowStatements = [],
    keyMetrics = [],
    financialRatios = [],
    financialGrowth = [],
    dcfValuation = null,
    enterpriseValues = [],
    earningsCalendar = [],
    dividendHistory = [],
    stockSplits = [],
    institutionalHolders = [],
    insiderTrading = [],
    peers, 
    news, 
    aiAnalysis, 
    sankeyData 
  } = data;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0f0f23',
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${profile.symbol}_投资研究报告.pdf`);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatNumber = (num: number) => {
    if (!num) return 'N/A';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 兼容新旧 API 格式
  const marketCap = profile.marketCap || profile.mktCap || 0;
  const priceChange = profile.change ?? profile.changes ?? 0;
  const priceChangePercent = profile.changePercentage 
    ? `${profile.changePercentage.toFixed(2)}%` 
    : profile.changesPercentage || '0%';
  const exchangeName = profile.exchange || profile.exchangeShortName || '';

  // 快捷导航
  const sections = [
    { id: 'aiAnalysis', label: 'AI 分析', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'financialStatements', label: '财务报表', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'valuation', label: '估值指标', icon: <Calculator className="w-4 h-4" /> },
    { id: 'events', label: '事件日历', icon: <Calendar className="w-4 h-4" /> },
    { id: 'holdings', label: '持仓分析', icon: <Briefcase className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          返回搜索
        </button>
        <div className="flex items-center gap-4">
          {/* 快捷导航 */}
          <div className="hidden md:flex items-center gap-2 bg-midnight/50 rounded-lg p-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  const element = document.getElementById(section.id);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                {section.icon}
                <span className="hidden lg:inline">{section.label}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-medium ${
              exportSuccess 
                ? 'bg-green-600 text-white' 
                : 'bg-aurora-600 hover:bg-aurora-500 text-white'
            }`}
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导出中...
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                导出成功!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导出PDF报告
              </>
            )}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-8">
        {/* 公司头部信息 */}
        <header className="glass-card p-8 gradient-border animate-fade-in-up">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {profile.image && (
              <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center p-3 shrink-0">
                <img
                  src={profile.image}
                  alt={profile.companyName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                  {profile.companyName}
                </h1>
                <span className="px-4 py-1.5 bg-aurora-500/20 text-aurora-400 rounded-full text-sm font-mono font-semibold">
                  {profile.symbol}
                </span>
                <span className="px-3 py-1 bg-white/5 text-slate-400 rounded-full text-xs">
                  {exchangeName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 text-sm mb-6">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {profile.sector || 'N/A'}
                </span>
                <span>•</span>
                <span>{profile.industry || 'N/A'}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {profile.country || 'N/A'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 hover:border-aurora-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                    <DollarSign className="w-3.5 h-3.5" />
                    市值
                  </div>
                  <p className="text-xl font-bold text-white font-mono">${formatNumber(marketCap)}</p>
                </div>
                <div className="glass-card p-4 hover:border-aurora-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    股价
                  </div>
                  <p className="text-xl font-bold text-white font-mono">
                    ${profile.price?.toFixed(2) || 'N/A'}
                    <span className={`text-sm ml-2 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChangePercent}
                    </span>
                  </p>
                </div>
                <div className="glass-card p-4 hover:border-aurora-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                    <Users2 className="w-3.5 h-3.5" />
                    员工数
                  </div>
                  <p className="text-xl font-bold text-white font-mono">
                    {profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="glass-card p-4 hover:border-aurora-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    IPO日期
                  </div>
                  <p className="text-xl font-bold text-white font-mono">{profile.ipoDate || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ==================== AI 分析内容 ==================== */}
        <section id="aiAnalysis">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer group"
            onClick={() => toggleSection('aiAnalysis')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aurora-500/20 to-aurora-600/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-aurora-400" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">AI 智能分析</h2>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              {expandedSections.aiAnalysis ? (
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white" />
              )}
            </button>
          </div>

          {expandedSections.aiAnalysis && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 企业概况 */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-aurora-500/20 to-aurora-600/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-aurora-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">企业概况</h3>
                  </div>
                  <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{aiAnalysis.companyOverview}</ReactMarkdown>
                  </div>
                </div>

                {/* 行业分析 */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">行业分析</h3>
                  </div>
                  <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{aiAnalysis.industryAnalysis}</ReactMarkdown>
                  </div>
                </div>

                {/* 行业痛点 */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">行业痛点与障碍</h3>
                  </div>
                  <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{aiAnalysis.industryPainPoints}</ReactMarkdown>
                  </div>
                </div>

                {/* 竞争格局 */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">竞争格局</h3>
                  </div>
                  <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 mb-4">
                    <ReactMarkdown>{aiAnalysis.competitors}</ReactMarkdown>
                  </div>
                  {peers && peers.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                      <span className="text-xs text-slate-500 mr-2">主要竞争对手:</span>
                      {peers.slice(0, 8).map((peer) => (
                        <span key={peer} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-sm font-mono hover:bg-purple-500/20 transition-colors cursor-default">
                          {peer}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 竞争优势 */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">竞争优势</h3>
                  </div>
                  <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{aiAnalysis.competitiveAdvantage}</ReactMarkdown>
                  </div>
                </div>

                {/* 护城河 */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-400/20 to-gold-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-gold-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">核心护城河</h3>
                  </div>
                  <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{aiAnalysis.moat}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* 最新动态 */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">最新发展动态</h3>
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full">AI + Google Search</span>
                </div>
                <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown>{aiAnalysis.recentDevelopments}</ReactMarkdown>
                </div>
              </div>

              {/* 投资结论 */}
              <div className="glass-card p-8 gradient-border glow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-aurora-500 to-gold-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white">投资建议总结</h3>
                </div>
                <div className="prose prose-invert prose-slate prose-lg max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                  <ReactMarkdown>{aiAnalysis.investmentConclusion}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ==================== 财务报表 ==================== */}
        <section id="financialStatements">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer group"
            onClick={() => toggleSection('financialStatements')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">财务数据</h2>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              {expandedSections.financialStatements ? (
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white" />
              )}
            </button>
          </div>

          {expandedSections.financialStatements && (
            <div className="space-y-6 animate-fade-in-up">
              {/* 桑基图和营收图表 */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-white">财务数据可视化</h3>
                    <p className="text-sm text-slate-500">基于近5年财务报表数据</p>
                  </div>
                </div>
                
                {/* 桑基图 */}
                {sankeyData && sankeyData.links && sankeyData.links.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-aurora-500 rounded-full"></span>
                      营收流向分析（桑基图）
                      <span className="text-xs text-slate-500 font-normal ml-2">
                        {incomeStatements[0]?.date?.split('-')[0] || ''} 财年
                      </span>
                    </h4>
                    <SankeyChart data={sankeyData} />
                  </div>
                )}

                {/* 其他图表 */}
                <RevenueCharts incomeStatements={incomeStatements} />
              </div>

              {/* 三大财务报表 */}
              <FinancialStatements 
                incomeStatements={incomeStatements}
                balanceSheets={balanceSheets}
                cashFlowStatements={cashFlowStatements}
              />
            </div>
          )}
        </section>

        {/* ==================== 估值与财务指标 ==================== */}
        <section id="valuation">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer group"
            onClick={() => toggleSection('valuation')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/20 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">估值与指标</h2>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              {expandedSections.valuation ? (
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white" />
              )}
            </button>
          </div>

          {expandedSections.valuation && (
            <div className="animate-fade-in-up">
              <ValuationMetrics
                profile={profile}
                keyMetrics={keyMetrics}
                financialRatios={financialRatios}
                financialGrowth={financialGrowth}
                dcfValuation={dcfValuation}
                enterpriseValues={enterpriseValues}
              />
            </div>
          )}
        </section>

        {/* ==================== 事件日历 ==================== */}
        <section id="events">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer group"
            onClick={() => toggleSection('events')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">事件日历</h2>
              <span className="text-xs text-slate-500">
                财报 · 分红 · 拆股
              </span>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              {expandedSections.events ? (
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white" />
              )}
            </button>
          </div>

          {expandedSections.events && (
            <div className="animate-fade-in-up">
              <EventCalendar
                earningsCalendar={earningsCalendar}
                dividendHistory={dividendHistory}
                stockSplits={stockSplits}
              />
            </div>
          )}
        </section>

        {/* ==================== 持仓与交易分析 ==================== */}
        <section id="holdings">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer group"
            onClick={() => toggleSection('holdings')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">持仓分析</h2>
              <span className="text-xs text-slate-500">
                机构持仓 · 内幕交易
              </span>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              {expandedSections.holdings ? (
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white" />
              )}
            </button>
          </div>

          {expandedSections.holdings && (
            <div className="animate-fade-in-up">
              <HoldingsAnalysis
                institutionalHolders={institutionalHolders}
                insiderTrading={insiderTrading}
              />
            </div>
          )}
        </section>

        {/* ==================== 最新新闻 ==================== */}
        {news && news.length > 0 && (
          <section className="glass-card p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/20 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-rose-400" />
              </div>
              <h2 className="text-xl font-display font-bold text-white">相关新闻资讯</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.slice(0, 9).map((item, index) => (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-midnight/50 rounded-xl border border-white/5 hover:border-aurora-500/30 transition-all group"
                >
                  <p className="text-slate-300 font-medium mb-3 line-clamp-2 group-hover:text-aurora-400 transition-colors leading-snug">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[120px]">{item.site}</span>
                    <span>{formatDate(item.publishedDate)}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 免责声明 */}
        <footer className="text-center py-8 border-t border-white/5">
          <p className="text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
            ⚠️ 免责声明：本报告由 AI 自动生成，仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
            报告中的分析基于公开数据和 AI 推理，可能存在偏差或不准确之处，请结合专业投资顾问意见进行决策。
          </p>
          <p className="mt-4 text-xs text-slate-600">
            数据来源：Financial Modeling Prep (Premium) | AI 分析：Google Gemini 2.5 Flash
          </p>
        </footer>
      </div>
    </div>
  );
}
