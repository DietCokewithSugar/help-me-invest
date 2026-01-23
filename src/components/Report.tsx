'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, TrendingUp, Target, Shield, Newspaper,
  ArrowLeft, Users, AlertTriangle, Sparkles,
  Globe, Calendar, DollarSign, Users2, Image as ImageIcon,
  FileSpreadsheet, Calculator, Briefcase, ChevronDown, ChevronUp,
  FileText,
  ExternalLink,
  Info,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SankeyChart from './SankeyChart';
import RevenueCharts from './RevenueCharts';
import FinancialStatements from './FinancialStatements';
import ValuationMetrics from './ValuationMetrics';
import ProfessionalValuationMetrics from './ProfessionalValuationMetrics';
import EventCalendar from './EventCalendar';
import HoldingsAnalysis from './HoldingsAnalysis';
import ExportModal from './ExportModal';
import type { ReportData, MarketType } from '@/types';
import { getMarketConfig } from '@/lib/markets';
import { buildSankeyData } from '@/lib/sankey-utils';

// 市场标识徽章 - 极简设计，无 emoji，直角
const MarketBadge = ({ market }: { market: MarketType }) => {
  const marketInfo: Record<MarketType, { name: string; abbr: string }> = {
    US: { name: '美股', abbr: 'US' },
    CN: { name: 'A股', abbr: 'CN' },
    HK: { name: '港股', abbr: 'HK' },
    JP: { name: '日股', abbr: 'JP' },
  };
  const info = marketInfo[market] || marketInfo.US;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white/5 border border-white/10 text-mist-300 text-xs font-medium">
      <span className="text-glacier-500 font-mono">{info.abbr}</span>
      <span className="text-mist-700">|</span>
      <span>{info.name}</span>
    </span>
  );
};

// 公司 Logo 组件 - 处理图片加载失败或超时时显示备用图标
function CompanyLogo({ src, alt }: { src?: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimeout, setHasTimeout] = useState(false);

  // 5秒超时处理
  React.useEffect(() => {
    if (!src || hasError || !isLoading) return;

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setHasTimeout(true);
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [src, hasError, isLoading]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasTimeout(false);
  }, []);

  // 如果没有图片 URL、加载失败或超时，显示备用图标
  if (!src || hasError || hasTimeout) {
    return (
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-md bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
        <Building2 className="w-8 h-8 text-mist-500" />
      </div>
    );
  }

  return (
    <div className="w-16 h-16 md:w-20 md:h-20 rounded-md bg-white/5 flex items-center justify-center p-3 shrink-0 border border-white/10 relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-obsidian">
          <div className="w-5 h-5 border-2 border-white/10 border-t-glacier-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleError}
        onLoad={handleLoad}
        crossOrigin="anonymous"
      />
    </div>
  );
}

interface ReportProps {
  data: ReportData;
  onReset: () => void;
  aiLoading?: boolean;
  aiError?: string;
  onRegenerate?: () => Promise<void>;
  theme?: 'dark' | 'light';
}

// 分析卡片组件
// 分析卡片组件 - 扁平化设计
function AnalysisCard({
  icon: Icon,
  title,
  gradient,
  children
}: {
  icon: any;
  title: string;
  gradient: string; // Keep interface but ignore gradient in implementation
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-md hover:border-white/20 transition-colors">
      <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
        <Icon className="w-4 h-4 text-glacier-500" />
        <h3 className="text-base font-medium text-white uppercase tracking-wider">{title}</h3>
      </div>
      <div className="prose prose-gemini max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 text-sm">
        {children}
      </div>
    </div>
  );
}

// 可折叠区块 - 扁平化设计
function CollapsibleSection({
  id,
  icon: Icon,
  title,
  subtitle,
  gradient,
  expanded,
  onToggle,
  children,
  sectionNumber,
}: {
  id: string;
  icon: any;
  title: string;
  subtitle?: string;
  gradient: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  sectionNumber?: string;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <button
        className="w-full flex items-center justify-between mb-4 group"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* 编号 */}
          {sectionNumber && (
            <span className="text-xl font-light text-mist-600 font-mono hidden md:block w-8 border-r border-white/10 mr-2">{sectionNumber}</span>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
              <Icon className="w-4 h-4 text-mist-300 group-hover:text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-medium text-white uppercase tracking-wide group-hover:text-glacier-500 transition-colors">{title}</h2>
              {subtitle && <p className="text-xs text-mist-500 font-mono">{subtitle}</p>}
            </div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-mist-400 group-hover:text-white" />
          ) : (
            <ChevronDown className="w-4 h-4 text-mist-400 group-hover:text-white" />
          )}
        </div>
      </button>

      <div className={`transition-all duration-300 ease-out ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {children}
      </div>
    </section>
  );
}

// 侧边锚点导航组件
function SideAnchorNav({ sections, activeSection }: { sections: Array<{ id: string; label: string; number: string }>; activeSection: string }) {
  return (
    <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
      <div className="flex flex-col gap-3">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              const element = document.getElementById(section.id);
              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`group flex items-center gap-2 transition-all ${activeSection === section.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
          >
            <span className={`text-xs font-mono transition-colors ${activeSection === section.id ? 'text-glacier-500' : 'text-mist-600'
              }`}>{section.number}</span>
            <span className={`w-6 h-0.5 rounded-full transition-all ${activeSection === section.id ? 'bg-glacier-500 w-8' : 'bg-mist-700 group-hover:w-8'
              }`} />
            <span className={`text-xs transition-all max-w-0 overflow-hidden group-hover:max-w-[100px] whitespace-nowrap ${activeSection === section.id ? 'text-mist-300 max-w-[100px]' : 'text-mist-600'
              }`}>{section.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// 统计数据卡片
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
    <div className="bg-white/5 border border-white/10 p-4 rounded-sm hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-mist-500 text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-lg font-bold text-white font-mono tracking-tight">{value}</p>
        <div className="flex-1" />
        {subValue && (
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm ${subValue.positive ? 'text-growth bg-growth/10' : 'text-decay bg-decay/10'}`}>
            {subValue.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Report({
  data,
  onReset,
  aiLoading = false,
  aiError = '',
  onRegenerate,
  theme = 'dark',
}: ReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [reportVersion, setReportVersion] = useState<'standard' | 'professional'>('standard');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    aiAnalysis: true,
    financialStatements: true,
    valuation: true,
    events: false,
    holdings: false,
    news: true,
  });
  // 桑基图年份选择状态（0 表示最新年份）
  const [sankeyYearIndex, setSankeyYearIndex] = useState(0);

  const {
    profile,
    incomeStatements,
    balanceSheets = [],
    cashFlowStatements = [],
    keyMetrics = [],
    keyMetricsTTM = [],
    financialRatios = [],
    financialRatiosTTM = [],
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
    earningsTranscripts = [],
    earningsCallSummary = '',
    sankeyData: initialSankeyData,
    market = 'US' as MarketType,
  } = data;

  // 根据选择的年份动态构建桑基图数据
  const currentSankeyData = useMemo(() => {
    if (!incomeStatements || incomeStatements.length === 0) {
      return initialSankeyData || { nodes: [], links: [] };
    }
    const selectedIncome = incomeStatements[sankeyYearIndex];
    if (!selectedIncome) {
      return initialSankeyData || { nodes: [], links: [] };
    }
    return buildSankeyData(selectedIncome);
  }, [incomeStatements, sankeyYearIndex, initialSankeyData]);

  // 获取可用的年份列表
  const availableYears = useMemo(() => {
    if (!incomeStatements || incomeStatements.length === 0) return [];
    return incomeStatements.map((stmt, index) => ({
      index,
      year: stmt.date?.split('-')[0] || stmt.calendarYear || stmt.fiscalYear || '',
      label: stmt.date?.split('-')[0] || stmt.calendarYear || stmt.fiscalYear || `第${index + 1}年`,
    }));
  }, [incomeStatements]);

  // 获取市场配置
  const marketConfig = getMarketConfig(market);
  const isUSMarket = market === 'US';
  const features = marketConfig.supportedFeatures;

  // 检查数据可用性
  const hasHoldingsData = (institutionalHolders.length > 0 || insiderTrading.length > 0) && features.institutionalHolders;
  const hasEventsData = (earningsCalendar.length > 0 || dividendHistory.length > 0 || stockSplits.length > 0);
  const hasNewsData = news && news.length > 0;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  const transcriptText =
    Array.isArray(earningsTranscripts) && earningsTranscripts.length > 0
      ? earningsTranscripts[0]?.content ||
      earningsTranscripts[0]?.transcript ||
      earningsTranscripts[0]?.text ||
      ''
      : '';

  const showAiLoading = aiLoading;
  const showAiSection =
    !aiLoading && (!!aiError || !!aiAnalysis || !!earningsCallSummary);

  // 兼容新旧 API 格式
  const marketCap = profile.marketCap || profile.mktCap || 0;
  const priceChange = profile.change ?? profile.changes ?? 0;
  const priceChangePercent = profile.changePercentage
    ? `${profile.changePercentage.toFixed(2)}%`
    : profile.changesPercentage || '0%';
  const exchangeName = profile.exchange || profile.exchangeShortName || '';

  // 根据版本决定显示哪些部分
  const showValuationSection = reportVersion === 'professional';
  const showAiSectionInVersion = reportVersion === 'standard' && showAiSection;
  const showFinancialStatementsInVersion = reportVersion === 'standard';
  const showNewsInVersion = reportVersion === 'standard' && hasNewsData;

  // 监听滚动，更新当前活跃的 section
  React.useEffect(() => {
    const handleScroll = () => {
      // 根据版本动态构建可用的 sections
      const availableSections: string[] = [];
      if (reportVersion === 'standard') {
        if (showAiSection) availableSections.push('aiAnalysis');
        availableSections.push('financialStatements');
        if (hasNewsData) availableSections.push('news');
      } else {
        availableSections.push('valuation');
      }
      // 所有版本都可能有这些
      if (hasEventsData) availableSections.push('events');
      if (hasHoldingsData) availableSections.push('holdings');

      for (const id of availableSections) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reportVersion, showAiSection, hasEventsData, hasHoldingsData, hasNewsData]);

  // 快捷导航 - 根据版本和市场类型和数据可用性显示
  const baseSections = [
    ...(showAiSectionInVersion ? [{ id: 'aiAnalysis', label: 'AI 分析', icon: Sparkles }] : []),
    ...(showFinancialStatementsInVersion ? [{ id: 'financialStatements', label: '财务报表', icon: FileSpreadsheet }] : []),
    ...(showValuationSection ? [{ id: 'valuation', label: '估值指标', icon: Calculator }] : []),
    ...(hasEventsData ? [{ id: 'events', label: '事件日历', icon: Calendar }] : []),
    ...(hasHoldingsData ? [{ id: 'holdings', label: '持仓分析', icon: Briefcase }] : []),
    ...(showNewsInVersion ? [{ id: 'news', label: '新闻资讯', icon: Newspaper }] : []),
  ];

  // 添加编号
  const sections = baseSections.map((s, i) => ({ ...s, number: String(i + 1).padStart(2, '0') }));

  // 为侧边导航准备的 sections
  const navSections = sections.map((s) => ({ id: s.id, label: s.label, number: s.number }));

  // 货币符号
  const currencySymbol = marketConfig.currencySymbol;

  // 获取 section 编号
  const getSectionNumber = (id: string) => sections.find(s => s.id === id)?.number || '';

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* 侧边锚点导航 */}
      <SideAnchorNav sections={navSections} activeSection={activeSection} />

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
          {/* 版本切换 */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface/80 backdrop-blur-xl border border-white/5">
            <button
              onClick={() => setReportVersion('standard')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${reportVersion === 'standard'
                ? 'bg-glacier-500 text-white'
                : 'text-mist-400 hover:text-white'
                }`}
            >
              普通版
            </button>
            <button
              onClick={() => setReportVersion('professional')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${reportVersion === 'professional'
                ? 'bg-glacier-500 text-white'
                : 'text-mist-400 hover:text-white'
                }`}
            >
              专业版
            </button>
          </div>

          {/* 快捷导航 */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded bg-white/5 border border-white/5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  const element = document.getElementById(section.id);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-mist-400 hover:text-white hover:bg-white/5 rounded-sm transition-all"
              >
                <section.icon className="w-3 h-3" />
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          <motion.button
            onClick={() => setIsExportModalOpen(true)}
            className="gemini-btn gemini-btn-primary flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ImageIcon className="w-4 h-4" />
            导出图片
          </motion.button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-obsidian py-4">
        {/* 公司头部信息 */}
        <header className="border-b border-white/10 pb-6 mb-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <CompanyLogo src={profile.image} alt={profile.companyName} />

            <div className="flex-1 min-w-0">
              {/* 公司名称和代码 */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {profile.companyName}
                </h1>
                <span className="px-2 py-0.5 rounded-sm bg-white/5 border border-white/10 text-mist-300 text-sm font-mono font-semibold">
                  {profile.symbol}
                </span>
                <MarketBadge market={market} />
                <span className="px-2 py-0.5 bg-white/5 text-mist-400 rounded-sm text-xs border border-white/10 font-mono">
                  {exchangeName}
                </span>
              </div>

              {/* 公司信息 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-mist-500 text-xs mb-6 font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" />
                  {profile.sector || 'N/A'}
                </span>
                <span className="text-mist-700">|</span>
                <span>{profile.industry || 'N/A'}</span>
                <span className="text-mist-700">|</span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  {profile.country || 'N/A'}
                </span>
              </div>

              {/* 统计数据 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={DollarSign}
                  label="市值"
                  value={`${currencySymbol}${formatNumber(marketCap)}`}
                  gradient="none"
                />
                <StatCard
                  icon={TrendingUp}
                  label="股价"
                  value={`${currencySymbol}${profile.price?.toFixed(2) || 'N/A'}`}
                  subValue={{
                    text: `${priceChange >= 0 ? '+' : ''}${priceChangePercent}`,
                    positive: priceChange >= 0
                  }}
                  gradient="none"
                />
                <StatCard
                  icon={Users2}
                  label="员工数"
                  value={profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees).toLocaleString() : 'N/A'}
                  gradient="none"
                />
                <StatCard
                  icon={Calendar}
                  label="IPO 日期"
                  value={profile.ipoDate || 'N/A'}
                  gradient="none"
                />
              </div>
            </div>
          </div>
        </header>

        {/* ==================== AI 生成中提示（仅普通版） ==================== */}
        {showAiLoading && showAiSectionInVersion && (
          <div className="bg-white/5 border border-white/10 p-4 border-l-2 border-l-glacier-500 animate-fade-in rounded-sm">
            {/* 标题区域 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-4 border-2 border-white/10 border-t-glacier-500 rounded-full animate-spin" />
              <h3 className="text-sm font-medium text-white font-mono uppercase tracking-wider">AI 分析进行中...</h3>
            </div>

            {/* 分析步骤指示器 */}
            <div className="space-y-2 mb-4 pl-7">
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="w-1 h-1 rounded-full bg-glacier-500" />
                <span className="text-mist-300">数据加载完成</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="w-1 h-1 rounded-full bg-glacier-500 animate-pulse" />
                <span className="text-mist-400">正在分析护城河...</span>
              </div>
            </div>

            {/* 线性进度条 */}
            <div className="h-0.5 bg-white/10 w-full">
              <div className="h-full w-2/3 bg-glacier-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* ==================== AI 分析内容（仅普通版） ==================== */}
        {showAiSectionInVersion && (
          <CollapsibleSection
            id="aiAnalysis"
            icon={Sparkles}
            title="AI 智能分析"
            gradient="from-glacier-500 to-glacier-600"
            expanded={expandedSections.aiAnalysis}
            onToggle={() => toggleSection('aiAnalysis')}
            sectionNumber={getSectionNumber('aiAnalysis')}
          >
            <div className="space-y-6 animate-fade-in">
              {aiError && (
                <div className="gemini-card p-6 md:p-8 border border-red-500/20 bg-red-500/10">
                  <p className="text-red-400 text-sm">{aiError}</p>
                </div>
              )}

              {aiAnalysis && (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    <AnalysisCard icon={Building2} title="企业概况" gradient="from-glacier-600 to-glacier-700">
                      <ReactMarkdown>{aiAnalysis.companyOverview}</ReactMarkdown>
                    </AnalysisCard>

                    <AnalysisCard icon={TrendingUp} title="行业分析" gradient="from-glacier-500 to-gemini-blue">
                      <ReactMarkdown>{aiAnalysis.industryAnalysis}</ReactMarkdown>
                    </AnalysisCard>

                    <AnalysisCard icon={AlertTriangle} title="行业痛点与障碍" gradient="from-slate-500 to-slate-600">
                      <ReactMarkdown>{aiAnalysis.industryPainPoints}</ReactMarkdown>
                    </AnalysisCard>

                    <AnalysisCard icon={Users} title="竞争格局" gradient="from-slate-600 to-glacier-700">
                      <ReactMarkdown>{aiAnalysis.competitors}</ReactMarkdown>
                      {peers && peers.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-white/5">
                          <span className="text-xs text-mist-500 mr-2">主要竞争对手:</span>
                          {peers.slice(0, 8).map((peer) => (
                            <span key={peer} className="px-3 py-1 bg-glacier-500/10 border border-glacier-500/20 rounded-full text-glacier-400 text-sm font-mono hover:bg-glacier-500/15 transition-colors cursor-default">
                              {peer}
                            </span>
                          ))}
                        </div>
                      )}
                    </AnalysisCard>

                    <AnalysisCard icon={Target} title="竞争优势" gradient="from-glacier-600 to-gemini-blue">
                      <ReactMarkdown>{aiAnalysis.competitiveAdvantage}</ReactMarkdown>
                    </AnalysisCard>

                    <AnalysisCard icon={Shield} title="核心护城河" gradient="from-gemini-blue to-glacier-600">
                      <ReactMarkdown>{aiAnalysis.moat}</ReactMarkdown>
                    </AnalysisCard>
                  </div>

                  {/* 最新动态 */}
                  <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-md bg-glacier-500/10 flex items-center justify-center border border-glacier-500/20">
                        <Sparkles className="w-5 h-5 text-glacier-500" />
                      </div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">最新发展动态</h3>
                        <span className="gemini-badge text-xs">AI + Google Search</span>
                      </div>
                    </div>
                    <div className="prose prose-gemini max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-a:text-glacier-500 prose-a:no-underline hover:prose-a:underline text-sm">
                      <ReactMarkdown>{aiAnalysis.recentDevelopments}</ReactMarkdown>
                    </div>
                  </div>
                </>
              )}

              {earningsCallSummary && (
                <AnalysisCard icon={FileText} title="财报电话会议精要" gradient="from-glacier-600 to-glacier-700">
                  <ReactMarkdown>{earningsCallSummary}</ReactMarkdown>
                  {transcriptText && (
                    <div className="not-prose mt-4 space-y-3">
                      <button
                        onClick={() => setShowTranscript((prev) => !prev)}
                        className="gemini-btn gemini-btn-secondary text-sm"
                      >
                        {showTranscript ? '收起原文' : '查看原文'}
                      </button>
                      {showTranscript && (
                        <div className="rounded-md border border-white/10 max-md:border-0 bg-black/30 p-4 max-h-[420px] overflow-auto">
                          <pre className="whitespace-pre-wrap text-xs text-mist-300 leading-relaxed font-mono">
                            {transcriptText}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </AnalysisCard>
              )}

              {aiAnalysis && (
                <div className="gemini-card p-6 md:p-8 rounded-md bg-white/5 border border-white/10">
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-md bg-glacier-500/10 flex items-center justify-center border border-glacier-500/20">
                        <Sparkles className="w-6 h-6 text-glacier-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">投资建议总结</h3>
                    </div>
                    <div className="prose prose-gemini max-w-none prose-p:text-mist-200 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-200 text-base">
                      <ReactMarkdown>{aiAnalysis.investmentConclusion}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 财务报表（仅普通版） ==================== */}
        {showFinancialStatementsInVersion && (
          <CollapsibleSection
            id="financialStatements"
            icon={FileSpreadsheet}
            title="财务数据"
            subtitle="基于近5年财务报表数据"
            gradient="from-slate-500 to-slate-600"
            expanded={expandedSections.financialStatements}
            onToggle={() => toggleSection('financialStatements')}
            sectionNumber={getSectionNumber('financialStatements')}
          >
            <div className="space-y-6 animate-fade-in">
              {/* 桑基图和营收图表 */}
              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-md bg-slate-500/10 flex items-center justify-center border border-slate-500/20">
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">财务数据可视化</h3>
                    <p className="text-sm text-mist-500 mt-0.5">直观展示营收结构与财务趋势</p>
                  </div>
                </div>

                {/* 桑基图 */}
                {currentSankeyData && currentSankeyData.links && currentSankeyData.links.length > 0 && (
                  <div className="mb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-gemini-blue rounded-full" />
                        <h4 className="text-base font-medium text-mist-200">营收流向分析（桑基图）</h4>
                      </div>
                      {availableYears.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-mist-500 whitespace-nowrap">选择年份：</span>
                          <div className="flex p-1 bg-white/5 border border-white/10 rounded-lg flex-wrap gap-1">
                            {availableYears.map((year) => (
                              <button
                                key={year.index}
                                onClick={() => setSankeyYearIndex(year.index)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${sankeyYearIndex === year.index
                                  ? 'bg-glacier-500 text-white shadow-sm'
                                  : 'text-mist-400 hover:text-mist-200'
                                  }`}
                              >
                                {year.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <SankeyChart data={currentSankeyData} theme={theme} />
                  </div>
                )}

                {/* 其他图表 */}
                <RevenueCharts
                  incomeStatements={incomeStatements}
                  incomeStatementsQuarter={data.incomeStatementsQuarter}
                  theme={theme}
                />
              </div>

              {/* 三大财务报表 */}
              <FinancialStatements
                incomeStatements={incomeStatements}
                balanceSheets={balanceSheets}
                cashFlowStatements={cashFlowStatements}
                incomeStatementsQuarter={data.incomeStatementsQuarter}
                balanceSheetsQuarter={data.balanceSheetsQuarter}
                cashFlowStatementsQuarter={data.cashFlowStatementsQuarter}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 估值与财务指标（仅专业版） ==================== */}
        {showValuationSection && (
          <CollapsibleSection
            id="valuation"
            icon={Calculator}
            title="估值与指标"
            gradient="from-glacier-600 to-gemini-blue"
            expanded={expandedSections.valuation}
            onToggle={() => toggleSection('valuation')}
            sectionNumber={getSectionNumber('valuation')}
          >
            <div className="animate-fade-in">
              <ProfessionalValuationMetrics
                profile={profile}
                keyMetrics={keyMetrics}
                keyMetricsTTM={keyMetricsTTM}
                financialRatios={financialRatios}
                financialRatiosTTM={financialRatiosTTM}
                financialScores={data.financialScores}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 事件日历 ==================== */}
        {hasEventsData && (
          <CollapsibleSection
            id="events"
            icon={Calendar}
            title="事件日历"
            subtitle="财报 · 分红 · 拆股"
            gradient="from-slate-600 to-slate-700"
            expanded={expandedSections.events}
            onToggle={() => toggleSection('events')}
            sectionNumber={getSectionNumber('events')}
          >
            <div className="animate-fade-in">
              <EventCalendar
                earningsCalendar={earningsCalendar}
                dividendHistory={dividendHistory}
                stockSplits={stockSplits}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 持仓与交易分析（仅美股） ==================== */}
        {hasHoldingsData && (
          <CollapsibleSection
            id="holdings"
            icon={Briefcase}
            title="持仓分析"
            subtitle="机构持仓 · 内幕交易"
            gradient="from-glacier-700 to-slate-600"
            expanded={expandedSections.holdings}
            onToggle={() => toggleSection('holdings')}
            sectionNumber={getSectionNumber('holdings')}
          >
            <div className="animate-fade-in">
              <HoldingsAnalysis
                institutionalHolders={institutionalHolders}
                insiderTrading={insiderTrading}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* 非美股市场的数据限制提示 */}
        {!isUSMarket && (
          <div className="gemini-card p-6 border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-amber-300 font-medium mb-2">数据说明</h4>
                <p className="text-sm text-mist-400 leading-relaxed">
                  {marketConfig.nameCn}市场的部分数据（如机构持仓、内幕交易、财报电话会议等）暂不可用。
                  AI 分析已通过 Google Search 搜索补充了最新的市场动态和分析师观点，以提供更全面的投资参考。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 最新新闻（仅普通版） ==================== */}
        {showNewsInVersion && (
          <CollapsibleSection
            id="news"
            icon={Newspaper}
            title="相关新闻资讯"
            gradient="from-slate-600 to-slate-700"
            expanded={expandedSections.news}
            onToggle={() => toggleSection('news')}
            sectionNumber={getSectionNumber('news')}
          >
            <div className="animate-fade-in">
              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md">
                <div className="divide-y divide-white/5">
                  {news.slice(0, 8).map((item, index) => (
                    <a
                      key={index}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 py-4 first:pt-0 last:pb-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <span className="text-sm text-mist-600 font-mono w-6 shrink-0 pt-0.5">{String(index + 1).padStart(2, '0')}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-mist-200 font-medium mb-2 line-clamp-2 group-hover:text-white transition-colors leading-relaxed">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-mist-500">
                          <span className="truncate max-w-[120px]">{item.site}</span>
                          <span className="text-mist-700">·</span>
                          <span>{formatDate(item.publishedDate)}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-mist-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* 免责声明 */}
        <footer className="text-center py-12">
          <div className="gemini-divider mb-8" />

          {/* 报告生成时间和重新生成按钮 */}
          {data.reportGeneratedAt && (
            <div className="flex flex-col items-center gap-4 mb-8">
              <p className="text-sm text-mist-400">
                报告生成于：{new Date(data.reportGeneratedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {onRegenerate && (
                <button
                  onClick={async () => {
                    setIsRegenerating(true);
                    try {
                      await onRegenerate();
                    } finally {
                      setIsRegenerating(false);
                    }
                  }}
                  disabled={isRegenerating || aiLoading}
                  className="gemini-btn gemini-btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? '正在重新生成...' : '重新生成 AI 报告'}
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-mist-500 max-w-2xl mx-auto leading-relaxed mb-4">
            ⚠️ 免责声明：本报告由 AI 自动生成，仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
            报告中的分析基于公开数据和 AI 推理，可能存在偏差或不准确之处，请结合专业投资顾问意见进行决策。
          </p>
          <p className="text-xs text-mist-600">
            数据来源：Financial Modeling Prep (Premium) | AI 分析：Google Gemini 3 Flash
          </p>
        </footer>
      </div>

      {/* 导出模态框 */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        targetRef={reportRef}
        fileName={`${profile.symbol}_投资研究报告`}
      />
    </div>
  );
}
