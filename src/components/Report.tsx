'use client';

import { useRef, useState } from 'react';
import { 
  Building2, TrendingUp, Target, Shield, Newspaper, 
  ArrowLeft, Download, Users, AlertTriangle, Sparkles,
  Globe, Calendar, DollarSign, Users2, Loader2, CheckCircle,
  FileSpreadsheet, Calculator, Briefcase, ChevronDown, ChevronUp,
  ExternalLink
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

// 分析卡片组件
function AnalysisCard({ 
  icon: Icon, 
  title, 
  gradient, 
  children 
}: { 
  icon: any; 
  title: string; 
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gemini-card gemini-card-glow p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-30 blur-xl`} />
        </div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      <div className="prose prose-gemini max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
        {children}
      </div>
    </div>
  );
}

// 可折叠区块
function CollapsibleSection({
  id,
  icon: Icon,
  title,
  subtitle,
  gradient,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  icon: any;
  title: string;
  subtitle?: string;
  gradient: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <button 
        className="w-full flex items-center justify-between mb-6 group"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center transition-transform group-hover:scale-105`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-30 blur-xl transition-opacity`} />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-mist-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-mist-400 group-hover:text-white transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-mist-400 group-hover:text-white transition-colors" />
          )}
        </div>
      </button>

      <div className={`transition-all duration-500 ease-out ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {children}
      </div>
    </section>
  );
}

// 统计数据卡片
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  gradient 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  subValue?: { text: string; positive?: boolean };
  gradient: string;
}) {
  return (
    <div className="gemini-card p-5 group">
      <div className="flex items-center gap-2 text-mist-500 text-xs mb-3">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p className="text-2xl font-bold text-white font-mono mb-1">{value}</p>
      {subValue && (
        <span className={`text-sm ${subValue.positive ? 'text-gemini-green' : 'text-gemini-red'}`}>
          {subValue.text}
        </span>
      )}
      {/* Hover 发光效果 */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
    </div>
  );
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
        backgroundColor: '#0a0a0f',
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
    { id: 'aiAnalysis', label: 'AI 分析', icon: Sparkles },
    { id: 'financialStatements', label: '财务报表', icon: FileSpreadsheet },
    { id: 'valuation', label: '估值指标', icon: Calculator },
    { id: 'events', label: '事件日历', icon: Calendar },
    { id: 'holdings', label: '持仓分析', icon: Briefcase },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <button
          onClick={onReset}
          className="gemini-btn gemini-btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回搜索
        </button>
        
        <div className="flex items-center gap-3">
          {/* 快捷导航 */}
          <div className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-surface/80 backdrop-blur-xl border border-white/5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  const element = document.getElementById(section.id);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-mist-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <section.icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className={`gemini-btn flex items-center gap-2 ${
              exportSuccess 
                ? 'bg-gemini-green text-white' 
                : 'gemini-btn-primary'
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
                导出成功
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导出 PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-10">
        {/* 公司头部信息 */}
        <header className="gemini-card p-8 md:p-10 animate-fade-in-up relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-gemini-blue/10 to-gemini-purple/5 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-start gap-8">
            {profile.image && (
              <div className="w-24 h-24 rounded-3xl bg-white/5 backdrop-blur-xl flex items-center justify-center p-4 shrink-0 border border-white/10">
                <img
                  src={profile.image}
                  alt={profile.companyName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {/* 公司名称和代码 */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {profile.companyName}
                </h1>
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-gemini-blue/20 to-gemini-purple/20 border border-gemini-blue/30 text-gemini-blue text-sm font-mono font-semibold">
                  {profile.symbol}
                </span>
                <span className="px-3 py-1 bg-white/5 text-mist-400 rounded-full text-xs border border-white/10">
                  {exchangeName}
                </span>
              </div>
              
              {/* 公司信息 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-mist-400 text-sm mb-8">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {profile.sector || 'N/A'}
                </span>
                <span className="text-mist-600">•</span>
                <span>{profile.industry || 'N/A'}</span>
                <span className="text-mist-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {profile.country || 'N/A'}
                </span>
              </div>
              
              {/* 统计数据 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={DollarSign}
                  label="市值"
                  value={`$${formatNumber(marketCap)}`}
                  gradient="from-gemini-blue to-gemini-purple"
                />
                <StatCard
                  icon={TrendingUp}
                  label="股价"
                  value={`$${profile.price?.toFixed(2) || 'N/A'}`}
                  subValue={{ 
                    text: `${priceChange >= 0 ? '+' : ''}${priceChangePercent}`, 
                    positive: priceChange >= 0 
                  }}
                  gradient="from-gemini-purple to-gemini-pink"
                />
                <StatCard
                  icon={Users2}
                  label="员工数"
                  value={profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees).toLocaleString() : 'N/A'}
                  gradient="from-gemini-pink to-gemini-yellow"
                />
                <StatCard
                  icon={Calendar}
                  label="IPO 日期"
                  value={profile.ipoDate || 'N/A'}
                  gradient="from-gemini-yellow to-gemini-green"
                />
              </div>
            </div>
          </div>
        </header>

        {/* ==================== AI 分析内容 ==================== */}
        <CollapsibleSection
          id="aiAnalysis"
          icon={Sparkles}
          title="AI 智能分析"
          gradient="from-gemini-blue to-gemini-purple"
          expanded={expandedSections.aiAnalysis}
          onToggle={() => toggleSection('aiAnalysis')}
        >
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalysisCard icon={Building2} title="企业概况" gradient="from-gemini-blue to-blue-600">
                <ReactMarkdown>{aiAnalysis.companyOverview}</ReactMarkdown>
              </AnalysisCard>

              <AnalysisCard icon={TrendingUp} title="行业分析" gradient="from-blue-500 to-indigo-600">
                <ReactMarkdown>{aiAnalysis.industryAnalysis}</ReactMarkdown>
              </AnalysisCard>

              <AnalysisCard icon={AlertTriangle} title="行业痛点与障碍" gradient="from-orange-500 to-red-500">
                <ReactMarkdown>{aiAnalysis.industryPainPoints}</ReactMarkdown>
              </AnalysisCard>

              <AnalysisCard icon={Users} title="竞争格局" gradient="from-purple-500 to-pink-500">
                <ReactMarkdown>{aiAnalysis.competitors}</ReactMarkdown>
                {peers && peers.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-white/5">
                    <span className="text-xs text-mist-500 mr-2">主要竞争对手:</span>
                    {peers.slice(0, 8).map((peer) => (
                      <span key={peer} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-sm font-mono hover:bg-purple-500/20 transition-colors cursor-default">
                        {peer}
                      </span>
                    ))}
                  </div>
                )}
              </AnalysisCard>

              <AnalysisCard icon={Target} title="竞争优势" gradient="from-green-500 to-emerald-600">
                <ReactMarkdown>{aiAnalysis.competitiveAdvantage}</ReactMarkdown>
              </AnalysisCard>

              <AnalysisCard icon={Shield} title="核心护城河" gradient="from-amber-500 to-orange-500">
                <ReactMarkdown>{aiAnalysis.moat}</ReactMarkdown>
              </AnalysisCard>
            </div>

            {/* 最新动态 */}
            <div className="gemini-card gemini-card-glow p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 opacity-30 blur-xl" />
                </div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">最新发展动态</h3>
                  <span className="gemini-badge text-xs">AI + Google Search</span>
                </div>
              </div>
              <div className="prose prose-gemini max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-a:text-gemini-blue prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown>{aiAnalysis.recentDevelopments}</ReactMarkdown>
              </div>
            </div>

            {/* 投资结论 */}
            <div className="relative gemini-card p-8 md:p-10 overflow-hidden">
              {/* 渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-gemini-blue/10 via-gemini-purple/5 to-gemini-pink/10" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gemini-blue via-gemini-purple to-gemini-pink" />
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gemini-blue to-gemini-pink opacity-40 blur-2xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">投资建议总结</h3>
                </div>
                <div className="prose prose-gemini prose-lg max-w-none prose-p:text-mist-200 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-200">
                  <ReactMarkdown>{aiAnalysis.investmentConclusion}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ==================== 财务报表 ==================== */}
        <CollapsibleSection
          id="financialStatements"
          icon={FileSpreadsheet}
          title="财务数据"
          subtitle="基于近5年财务报表数据"
          gradient="from-emerald-500 to-green-600"
          expanded={expandedSections.financialStatements}
          onToggle={() => toggleSection('financialStatements')}
        >
          <div className="space-y-6 animate-fade-in">
            {/* 桑基图和营收图表 */}
            <div className="gemini-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 blur-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">财务数据可视化</h3>
                  <p className="text-sm text-mist-500 mt-0.5">直观展示营收结构与财务趋势</p>
                </div>
              </div>
              
              {/* 桑基图 */}
              {sankeyData && sankeyData.links && sankeyData.links.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-2 bg-gemini-blue rounded-full" />
                    <h4 className="text-base font-medium text-mist-200">营收流向分析（桑基图）</h4>
                    <span className="text-xs text-mist-500">
                      {incomeStatements[0]?.date?.split('-')[0] || ''} 财年
                    </span>
                  </div>
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
        </CollapsibleSection>

        {/* ==================== 估值与财务指标 ==================== */}
        <CollapsibleSection
          id="valuation"
          icon={Calculator}
          title="估值与指标"
          gradient="from-violet-500 to-purple-600"
          expanded={expandedSections.valuation}
          onToggle={() => toggleSection('valuation')}
        >
          <div className="animate-fade-in">
            <ValuationMetrics
              profile={profile}
              keyMetrics={keyMetrics}
              financialRatios={financialRatios}
              financialGrowth={financialGrowth}
              dcfValuation={dcfValuation}
              enterpriseValues={enterpriseValues}
            />
          </div>
        </CollapsibleSection>

        {/* ==================== 事件日历 ==================== */}
        <CollapsibleSection
          id="events"
          icon={Calendar}
          title="事件日历"
          subtitle="财报 · 分红 · 拆股"
          gradient="from-amber-500 to-orange-500"
          expanded={expandedSections.events}
          onToggle={() => toggleSection('events')}
        >
          <div className="animate-fade-in">
            <EventCalendar
              earningsCalendar={earningsCalendar}
              dividendHistory={dividendHistory}
              stockSplits={stockSplits}
            />
          </div>
        </CollapsibleSection>

        {/* ==================== 持仓与交易分析 ==================== */}
        <CollapsibleSection
          id="holdings"
          icon={Briefcase}
          title="持仓分析"
          subtitle="机构持仓 · 内幕交易"
          gradient="from-cyan-500 to-blue-500"
          expanded={expandedSections.holdings}
          onToggle={() => toggleSection('holdings')}
        >
          <div className="animate-fade-in">
            <HoldingsAnalysis
              institutionalHolders={institutionalHolders}
              insiderTrading={insiderTrading}
            />
          </div>
        </CollapsibleSection>

        {/* ==================== 最新新闻 ==================== */}
        {news && news.length > 0 && (
          <section className="gemini-card p-6 md:p-8 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 opacity-30 blur-xl" />
              </div>
              <h2 className="text-xl font-semibold text-white">相关新闻资讯</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.slice(0, 9).map((item, index) => (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-5 rounded-2xl bg-surface/50 border border-white/5 hover:border-gemini-blue/30 hover:bg-surface transition-all"
                >
                  <p className="text-mist-200 font-medium mb-4 line-clamp-2 group-hover:text-white transition-colors leading-relaxed">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between text-xs text-mist-500">
                    <span className="truncate max-w-[120px] flex items-center gap-1">
                      {item.site}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span>{formatDate(item.publishedDate)}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 免责声明 */}
        <footer className="text-center py-12">
          <div className="gemini-divider mb-8" />
          <p className="text-xs text-mist-500 max-w-2xl mx-auto leading-relaxed mb-4">
            ⚠️ 免责声明：本报告由 AI 自动生成，仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
            报告中的分析基于公开数据和 AI 推理，可能存在偏差或不准确之处，请结合专业投资顾问意见进行决策。
          </p>
          <p className="text-xs text-mist-600">
            数据来源：Financial Modeling Prep (Premium) | AI 分析：Google Gemini 2.5 Flash
          </p>
        </footer>
      </div>
    </div>
  );
}
