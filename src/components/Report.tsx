'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { toPng } from 'html-to-image';
import {
  Building2, TrendingUp, Target, Shield, Newspaper,
  ArrowLeft, Users, AlertTriangle, Sparkles,
  Globe, Calendar, DollarSign, Users2, Image as ImageIcon,
  FileSpreadsheet, Calculator, Briefcase, ChevronDown, ChevronUp,
  FileText,
  ExternalLink,
  Info,
  RefreshCw,
  Share2,
  Link2,
  MessageCircle,
  Tag,
  Zap,
  Crown,
  Flame,
  TrendingDown,
  Activity,
  Sun,
  SunDim,
  UserX,
  Warehouse,
  FileDown,
  Scale,
} from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 专业版报告的 Markdown 表格组件配置
// GFM 表格：沿用 markdown 中声明的列对齐（数字列通常为右对齐），数字使用等宽数字
const proMarkdownComponents: Components = {
  table: ({ children }) => (
    <div className="not-prose my-4 overflow-x-auto rounded-md border border-line">
      <table className="data-table">{children}</table>
    </div>
  ),
  th: ({ children, style }) => <th style={style}>{children}</th>,
  td: ({ children, style }) => (
    <td style={style} className="font-mono whitespace-nowrap">
      {children}
    </td>
  ),
};

// 专业版报告的 Markdown 渲染组件
const ProMarkdown = ({ children }: { children: string }) => (
  <div className="prose prose-report max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-h2:text-glacier-400 prose-h2:text-base prose-h2:font-medium prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-mist-200 prose-h3:text-sm prose-h3:font-medium prose-h3:mt-4 prose-h3:mb-2 text-sm">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>
      {children}
    </ReactMarkdown>
  </div>
);
import SankeyChart from './SankeyChart';
import RevenueCharts from './RevenueCharts';
import FinancialStatements from './FinancialStatements';
import ValuationMetrics from './ValuationMetrics';
import ProfessionalValuationMetrics from './ProfessionalValuationMetrics';
import EventCalendar from './EventCalendar';
import HoldingsAnalysis from './HoldingsAnalysis';
import ShareExportModal from './ShareExportModal';
import PriceChart from './report/PriceChart';
import KeyStatsPanel from './report/KeyStatsPanel';
import AnalystPanel from './report/AnalystPanel';
import type { ReportData, MarketType } from '@/types';
import { detectMarketFromSymbol, getMarketConfig } from '@/lib/markets';
import { buildSankeyData } from '@/lib/sankey-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompare } from '@/contexts/CompareContext';
import { translateDiagnosticTag } from '@/i18n/diagnosticTags';
import { exportReportToExcel } from '@/lib/export-excel';
import { formatCurrencyCompact, formatCurrencyFixed, resolveReportCurrency } from '@/lib/currency';
import { useModalA11y } from '@/hooks/useModalA11y';

// 市场标识徽章 - 极简设计，无 emoji，直角
const MarketBadge = ({ market }: { market: MarketType }) => (
  <span className="badge font-mono">{market}</span>
);

// 公司 Logo：加载失败时显示占位图标（不显示加载动画）
function CompanyLogo({ src, alt }: { src?: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-line bg-raised">
        <Building2 className="h-6 w-6 text-text-3" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-pure-white p-1.5">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        onError={() => setHasError(true)}
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
  onVersionChange?: (version: 'beginner' | 'standard' | 'professional') => void;
  theme?: 'dark' | 'light';
  isModalView?: boolean;
  initialReportVersion?: 'beginner' | 'standard' | 'professional';
}

// 分析卡片组件 - 扁平化设计
function AnalysisCard({
  title,
  children,
  onShare,
  collapsible = true,
  defaultExpanded = true,
}: {
  title: string;
  children: React.ReactNode;
  onShare?: (title: string, contentElement: HTMLDivElement) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare && contentRef.current) {
      onShare(title, contentRef.current);
    }
  };

  return (
    <div className="streaming-card panel">
      <div
        className={`panel-header ${collapsible ? 'cursor-pointer select-none' : ''} ${isExpanded ? '' : '!border-b-0'}`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <h3 className="panel-title">{title}</h3>
        <div className="flex items-center gap-1">
          {onShare && (
            <button
              onClick={handleShare}
              className="btn-ghost !h-7 !w-7 !p-0"
              title={t.report.shareModule}
              aria-label={t.report.shareModule}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              aria-expanded={isExpanded}
              className="btn-ghost !h-7 !w-7 !p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
      <div
        ref={contentRef}
        className={`prose prose-report max-w-none prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 px-5 py-4 ${isExpanded ? '' : 'hidden'}`}
      >
        {children}
      </div>
    </div>
  );
}

// 可折叠区块 - 扁平化设计
function CollapsibleSection({
  id,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  sectionNumber,
  onShare,
}: {
  id: string;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  sectionNumber?: string;
  onShare?: (title: string, contentElement: HTMLDivElement) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare && contentRef.current) {
      onShare(title, contentRef.current);
    }
  };

  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button type="button" className="flex min-w-0 items-baseline gap-3 text-left" onClick={onToggle} aria-expanded={expanded}>
          {sectionNumber && <span className="font-mono text-[13px] text-text-3">{sectionNumber}</span>}
          <h2 className="text-h3">{title}</h2>
          {subtitle && <span className="hidden truncate text-[12px] text-text-3 md:inline">{subtitle}</span>}
        </button>
        <div className="flex items-center gap-1">
          {onShare && (
            <button
              onClick={handleShare}
              className="btn-ghost !h-8 !w-8 !p-0"
              title={t.report.shareModule}
              aria-label={t.report.shareModule}
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onToggle} className="btn-ghost !h-8 !w-8 !p-0" aria-label={title}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div ref={contentRef} className={expanded ? '' : 'hidden'}>
        {children}
      </div>
    </section>
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

function IconActionButton({
  icon: Icon,
  tooltip,
  onClick,
  disabled = false,
  loading = false,
  className = '',
}: {
  icon: any;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-line-strong bg-panel text-text-2 transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      aria-label={tooltip}
      title={tooltip}
    >
      <Icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}

// 五维度评估系统 - 级别类型
type DimensionLevel = 'good' | 'neutral' | 'bad' | 'special';

// 五维度评估标签
interface DimensionTag {
  dimension: string;        // 维度名称（中文）
  dimensionKey: string;     // 维度键（英文）
  level: DimensionLevel;    // 级别
  label: string;            // 标签文字
  icon: any;                // 图标
}

// 极简黑白高级感样式配置
const LEVEL_STYLES: Record<DimensionLevel, { bg: string; border: string; text: string; iconColor: string }> = {
  'good': {
    bg: 'bg-up/10',
    border: 'border-up/30',
    text: 'text-up',
    iconColor: 'text-up',
  },
  'neutral': {
    bg: 'bg-raised',
    border: 'border-line-strong',
    text: 'text-text-1',
    iconColor: 'text-text-3',
  },
  'bad': {
    bg: 'bg-down/5',
    border: 'border-down/25',
    text: 'text-down',
    iconColor: 'text-down',
  },
  'special': {
    bg: 'bg-accent/10',
    border: 'border-accent/30',
    text: 'text-accent',
    iconColor: 'text-accent',
  },
};

// 单个维度标签组件
function DimensionBadge({ tag }: { tag: DimensionTag }) {
  const style = LEVEL_STYLES[tag.level];
  const { locale } = useLanguage();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-text-3">{translateDiagnosticTag(tag.dimension, locale)}</span>
      <span className={`inline-flex h-6 items-center rounded-sm border px-2 text-[12px] font-medium ${style.bg} ${style.border} ${style.text}`}>
        {translateDiagnosticTag(tag.label, locale)}
      </span>
    </div>
  );
}

// 生成五维度评估标签
function generateDimensionTags(
  aiAnalysis: any,
  profile: any,
  financialGrowth: any[]
): DimensionTag[] {
  const tags: DimensionTag[] = [];
  const marketCap = profile.marketCap || profile.mktCap || 0;
  const industry = (profile.industry || '').toLowerCase();
  const sector = (profile.sector || '').toLowerCase();

  // 获取财务增长数据
  const latestGrowth = financialGrowth && financialGrowth.length > 0 ? financialGrowth[0] : null;
  const revenueGrowth = latestGrowth?.revenueGrowth ?? 0;
  const netIncomeGrowth = latestGrowth?.netIncomeGrowth ?? 0;

  // AI 分析文本
  const aiText = aiAnalysis ?
    ((aiAnalysis.moat || '') + (aiAnalysis.competitiveAdvantage || '') + (aiAnalysis.industryAnalysis || '')).toLowerCase() : '';

  // ============== 1. 行业前景 ==============
  const sunriseIndustries = ['semiconductor', 'ai', 'artificial intelligence', '半导体', '人工智能', 'electric vehicles', '新能源', 'biotechnology', '生物医药', 'cloud computing', '云计算', 'renewable energy', '光伏', '储能'];
  const sunsetIndustries = ['coal', '煤炭', 'traditional media', '纸媒', 'tobacco', '烟草'];
  const policySupported = ['芯片', 'chip', '国产替代', '战略新兴', 'national strategy', '国家战略', '政策扶持', 'government support'];

  const isSunrise = sunriseIndustries.some(k => industry.includes(k) || sector.includes(k) || aiText.includes(k));
  const isSunset = sunsetIndustries.some(k => industry.includes(k) || sector.includes(k) || aiText.includes(k));
  const isPolicySupported = policySupported.some(k => aiText.includes(k));

  if (isPolicySupported) {
    tags.push({ dimension: '行业前景', dimensionKey: 'industryOutlook', level: 'special', label: '政策扶持', icon: Shield });
  } else if (isSunrise) {
    tags.push({ dimension: '行业前景', dimensionKey: 'industryOutlook', level: 'good', label: '朝阳行业', icon: Sun });
  } else if (isSunset) {
    tags.push({ dimension: '行业前景', dimensionKey: 'industryOutlook', level: 'bad', label: '夕阳行业', icon: SunDim });
  } else {
    tags.push({ dimension: '行业前景', dimensionKey: 'industryOutlook', level: 'neutral', label: '成熟行业', icon: Building2 });
  }

  // ============== 2. 行业地位 ==============
  const monopolyKeywords = ['垄断', 'monopoly', '寡头', 'oligopoly', '独家', 'exclusive'];
  const leaderKeywords = ['龙头', '领导者', 'leader', 'market leader', 'industry leader', '第一', 'no.1', '#1', '领先'];
  const secondTierKeywords = ['主要参与者', 'major player', '竞争者', 'competitor', '前列'];

  const isMonopoly = monopolyKeywords.some(k => aiText.includes(k));
  const isLeader = leaderKeywords.some(k => aiText.includes(k));
  const isSecondTier = secondTierKeywords.some(k => aiText.includes(k));

  if (isMonopoly) {
    tags.push({ dimension: '行业地位', dimensionKey: 'industryPosition', level: 'special', label: '行业垄断', icon: Shield });
  } else if (isLeader) {
    tags.push({ dimension: '行业地位', dimensionKey: 'industryPosition', level: 'good', label: '行业龙头', icon: Crown });
  } else if (isSecondTier) {
    tags.push({ dimension: '行业地位', dimensionKey: 'industryPosition', level: 'neutral', label: '第二梯队', icon: Users2 });
  } else {
    tags.push({ dimension: '行业地位', dimensionKey: 'industryPosition', level: 'bad', label: '边缘玩家', icon: UserX });
  }

  // ============== 3. 经营情况 ==============
  const restructuringKeywords = ['重组', 'restructuring', '业务转型', 'transformation', '并购中', 'merger'];
  const isRestructuring = restructuringKeywords.some(k => aiText.includes(k));

  if (isRestructuring) {
    tags.push({ dimension: '经营情况', dimensionKey: 'operations', level: 'special', label: '转型中', icon: RefreshCw });
  } else if (revenueGrowth > 0.10 && netIncomeGrowth > 0.15) {
    tags.push({ dimension: '经营情况', dimensionKey: 'operations', level: 'good', label: '经营优秀', icon: TrendingUp });
  } else if (revenueGrowth < 0 || netIncomeGrowth < -0.10) {
    tags.push({ dimension: '经营情况', dimensionKey: 'operations', level: 'bad', label: '经营困难', icon: TrendingDown });
  } else {
    tags.push({ dimension: '经营情况', dimensionKey: 'operations', level: 'neutral', label: '经营平稳', icon: Activity });
  }

  // ============== 4. 发展势头（重点：小型优质企业最好，巨无霸应该低）==============
  // 市值阈值（美元）
  const GIANT_THRESHOLD = 500e9;      // 5000亿美元，巨无霸
  const LARGE_THRESHOLD = 50e9;       // 500亿美元，大型
  const SMALL_THRESHOLD = 10e9;       // 100亿美元，小型

  if (marketCap >= GIANT_THRESHOLD) {
    // 万亿巨头，体量太大难以翻倍
    tags.push({ dimension: '发展势头', dimensionKey: 'growthMomentum', level: 'special', label: '巨无霸', icon: Building2 });
  } else if (marketCap < LARGE_THRESHOLD && revenueGrowth > 0.20 && netIncomeGrowth > 0.25) {
    // 小型且高增长，最有翻倍潜力
    tags.push({ dimension: '发展势头', dimensionKey: 'growthMomentum', level: 'good', label: '高速成长', icon: Zap });
  } else if (revenueGrowth < 0.05 || netIncomeGrowth < 0) {
    tags.push({ dimension: '发展势头', dimensionKey: 'growthMomentum', level: 'bad', label: '增长乏力', icon: TrendingDown });
  } else {
    tags.push({ dimension: '发展势头', dimensionKey: 'growthMomentum', level: 'neutral', label: '稳健增长', icon: TrendingUp });
  }

  // ============== 5. 目前体量 ==============
  // 市值分级（美元）
  const TRILLION_THRESHOLD = 1e12;    // 万亿美元
  const LARGE_CAP = 100e9;            // 千亿美元
  const MID_CAP = 10e9;               // 百亿美元

  if (marketCap >= TRILLION_THRESHOLD) {
    tags.push({ dimension: '目前体量', dimensionKey: 'scale', level: 'special', label: '万亿巨头', icon: Crown });
  } else if (marketCap >= LARGE_CAP) {
    tags.push({ dimension: '目前体量', dimensionKey: 'scale', level: 'good', label: '大型企业', icon: Building2 });
  } else if (marketCap >= MID_CAP) {
    tags.push({ dimension: '目前体量', dimensionKey: 'scale', level: 'neutral', label: '中型企业', icon: Building2 });
  } else {
    tags.push({ dimension: '目前体量', dimensionKey: 'scale', level: 'bad', label: '小型企业', icon: Warehouse });
  }

  return tags;
}

// 五维度评估标签展示组件
function CompanyTags({
  aiAnalysis,
  profile,
  financialGrowth,
  news,
  isLoading
}: {
  aiAnalysis: any;
  profile: any;
  financialGrowth: any[];
  news: any[];
  isLoading?: boolean;
}) {
  const { t } = useLanguage();
  const tags = useMemo(() => {
    return generateDimensionTags(aiAnalysis, profile, financialGrowth);
  }, [aiAnalysis, profile, financialGrowth]);

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[12px] text-text-3">
        <span className="h-3 w-3 rounded-full border-2 border-text-4 border-t-accent animate-spin" aria-hidden="true" />
        <span>{t.report.analyzingCompanyFeatures}</span>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        {tags.map((tag, index) => (
          <DimensionBadge key={`${tag.dimensionKey}-${index}`} tag={tag} />
        ))}
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
  onVersionChange,
  theme = 'dark',
  isModalView = false,
  initialReportVersion = 'standard',
}: ReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isSharePickerOpen, setIsSharePickerOpen] = useState(false);
  const sharePickerA11y = useModalA11y({
    isOpen: isSharePickerOpen,
    onClose: () => setIsSharePickerOpen(false),
  });
  const [shareNotice, setShareNotice] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [reportVersion, setReportVersion] = useState<'beginner' | 'standard' | 'professional'>(initialReportVersion);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    aiAnalysis: true,
    beginnerAnalysis: true,
    financialStatements: true,
    valuation: true,
    proAnalysis: true,
    events: false,
    holdings: false,
    news: true,
  });
  // 桑基图年份选择状态（0 表示最新年份）
  const [sankeyYearIndex, setSankeyYearIndex] = useState(0);

  const { locale, t } = useLanguage();
  const { addCompany, isInCompare, isFull } = useCompare();

  // 分享模块状态
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    title: string;
    contentHtml: string;
  }>({
    isOpen: false,
    title: '',
    contentHtml: '',
  });

  // 处理分享模块
  const handleShareModule = useCallback((title: string, contentElement: HTMLDivElement) => {
    setShareModalState({
      isOpen: true,
      title,
      contentHtml: contentElement.innerHTML,
    });
  }, []);

  const showShareNotice = useCallback((message: string) => {
    setShareNotice(message);
    window.setTimeout(() => {
      setShareNotice('');
    }, 2200);
  }, []);

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
    proAiAnalysis,  // 专业版 AI 分析
    earningsTranscripts = [],
    earningsCallSummary = '',
    sankeyData: initialSankeyData,
    market,
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
      label: stmt.date?.split('-')[0] || stmt.calendarYear || stmt.fiscalYear || t.report.sankey.yearIndex(index + 1),
    }));
  }, [incomeStatements, t]);

  const resolvedMarket: MarketType = useMemo(() => {
    const profileMarket = (profile as any)?.market as MarketType | undefined;
    return market || profileMarket || detectMarketFromSymbol(profile?.symbol || '');
  }, [market, profile]);

  // 获取市场配置
  const marketConfig = getMarketConfig(resolvedMarket);
  const isUSMarket = resolvedMarket === 'US';

  const currency = useMemo(
    () =>
      resolveReportCurrency({
        market: resolvedMarket,
        profile: profile as any,
        incomeStatements,
        balanceSheets,
        cashFlowStatements,
      }),
    [resolvedMarket, profile, incomeStatements, balanceSheets, cashFlowStatements]
  );

  // 检查数据可用性
  const hasHoldingsData = institutionalHolders.length > 0 || insiderTrading.length > 0;
  const hasEventsData = (earningsCalendar.length > 0 || dividendHistory.length > 0 || stockSplits.length > 0);
  const hasNewsData = news && news.length > 0;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatAmountCompact = (num: number | null | undefined) =>
    formatCurrencyCompact(num, {
      locale,
      currencySymbol: currency.symbol,
      currencyCode: currency.code,
    });

  const formatAmountFixed = (num: number | null | undefined, decimals = 2) =>
    formatCurrencyFixed(num, {
      currencySymbol: currency.symbol,
      currencyCode: currency.code,
      decimals,
    });

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
  // 普通版 AI 分析区域是否可见（加载中或有内容时都显示）
  const showAiSectionArea = reportVersion === 'standard' && (aiLoading || showAiSection);
  const showBeginnerArea = reportVersion === 'beginner';

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
  const showFinancialStatementsInVersion = reportVersion === 'standard' || reportVersion === 'beginner';
  const showNewsInVersion = reportVersion === 'standard' && hasNewsData;

  // 监听滚动，更新当前活跃的 section
  React.useEffect(() => {
    const handleScroll = () => {
      // 根据版本动态构建可用的 sections
      const availableSections: string[] = [];
      if (reportVersion === 'beginner') {
        availableSections.push('beginnerAnalysis');
        availableSections.push('financialStatements');
      } else if (reportVersion === 'standard') {
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
  }, [reportVersion, showAiSection, showBeginnerArea, hasEventsData, hasHoldingsData, hasNewsData]);

  // 快捷导航 - 根据版本和市场类型和数据可用性显示
  const baseSections = [
    ...(showBeginnerArea ? [{ id: 'beginnerAnalysis', label: t.report.beginnerReport, icon: Sparkles }] : []),
    ...(showAiSectionInVersion ? [{ id: 'aiAnalysis', label: t.report.sections.aiAnalysis, icon: Sparkles }] : []),
    ...(showFinancialStatementsInVersion ? [{ id: 'financialStatements', label: t.report.sections.financialData, icon: FileSpreadsheet }] : []),
    ...(showValuationSection ? [{ id: 'proAnalysis', label: t.report.sections.proAnalysis, icon: Sparkles }] : []),
    ...(showValuationSection ? [{ id: 'valuation', label: t.report.sections.valuation, icon: Calculator }] : []),
    ...(hasEventsData ? [{ id: 'events', label: t.report.sections.events, icon: Calendar }] : []),
    ...(hasHoldingsData ? [{ id: 'holdings', label: t.report.sections.holdings, icon: Briefcase }] : []),
    ...(showNewsInVersion ? [{ id: 'news', label: t.report.sections.news, icon: Newspaper }] : []),
  ];

  // 添加编号
  const sections = baseSections.map((s, i) => ({ ...s, number: String(i + 1).padStart(2, '0') }));

  // 货币符号（优先使用报表返回币种，其次按市场兜底）
  const currencySymbol = currency.symbol;
  const currencyCode = currency.code;

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/${locale}/companies/${encodeURIComponent(profile.symbol)}`;
  }, [profile.symbol]);

  const copyToClipboard = useCallback(async (text: string) => {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch {
        return false;
      }
    }
  }, []);

  const handleShareAsImage = useCallback(async () => {
    try {
      if (!reportRef.current) {
        showShareNotice(t.shareModal.notFound);
        return;
      }

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: theme === 'light' ? '#f8fafc' : '#0a0a0f',
        cacheBust: false,
        skipFonts: true,
        style: { transform: 'none' },
      });

      const link = document.createElement('a');
      link.download = `${profile.symbol}_${t.shareExportCard.investReport}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showShareNotice(t.shareModal.success);
    } catch (error) {
      console.error('Direct image export failed:', error);
      showShareNotice(t.shareModal.failed);
    }
  }, [profile.symbol, showShareNotice, t, theme]);

  const handleShareAsExcel = useCallback(() => {
    exportReportToExcel(data, t);
  }, [data, t]);

  const handleShareLink = useCallback(async () => {
    const link = getShareUrl();
    const copied = await copyToClipboard(link);
    showShareNotice(copied ? t.report.shareActions.copyLinkSuccess : t.shareModal.failed);
  }, [copyToClipboard, getShareUrl, showShareNotice, t]);

  const handleShareToWeChat = useCallback(async () => {
    const link = getShareUrl();
    const title = `${profile.companyName} (${profile.symbol})`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: title,
          url: link,
        });
        showShareNotice(t.shareModal.success);
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
      }
    }

    const copied = await copyToClipboard(link);
    showShareNotice(copied ? t.report.shareActions.wechatCopyHint : t.report.shareActions.shareUnavailable);
  }, [copyToClipboard, getShareUrl, profile.companyName, profile.symbol, showShareNotice, t]);

  const handleShareToFacebook = useCallback(() => {
    const link = getShareUrl();
    if (typeof window !== 'undefined') {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
      window.open(fbUrl, '_blank', 'noopener,noreferrer');
    }
  }, [getShareUrl]);

  React.useEffect(() => {
    if (!isSharePickerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSharePickerOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isSharePickerOpen]);

  // 获取 section 编号
  const getSectionNumber = (id: string) => sections.find(s => s.id === id)?.number || '';
  // Online search is disabled; keep the card as a non-real-time supplemental analysis section.
  const showRecentDevelopmentsInStandard = true;

  const renderReportVersionSwitcher = () => (
    <div role="radiogroup" className="inline-flex shrink-0 overflow-hidden rounded-md border border-line-strong bg-panel">
      {(['beginner', 'standard', 'professional'] as const).map((ver, index) => {
        const labels = {
          beginner: t.report.beginnerReport,
          standard: t.report.basicVersion,
          professional: t.report.proVersion,
        };
        const isActive = reportVersion === ver;
        return (
          <button
            key={ver}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => {
              if (isActive) return;
              setReportVersion(ver);
              if (onVersionChange) {
                onVersionChange(ver);
              }
            }}
            className={`h-8 px-3 text-[13px] font-medium whitespace-nowrap ${index > 0 ? 'border-l border-line' : ''} ${
              isActive ? 'bg-accent/10 text-accent' : 'text-text-2 hover:bg-hover hover:text-fg'
            }`}
          >
            {labels[ver]}
          </button>
        );
      })}
    </div>
  );

  const runShareAction = async (action: () => void | Promise<void>) => {
    try {
      await action();
    } finally {
      setIsSharePickerOpen(false);
    }
  };

  const renderActionIcons = () => (
    <>
      {profile && (
        <IconActionButton
          icon={Scale}
          tooltip={isInCompare(profile.symbol) ? t.compare.alreadyInCompare : t.compare.addToCompare}
          disabled={isInCompare(profile.symbol) || isFull}
          onClick={() => {
            addCompany({
              symbol: profile.symbol,
              companyName: profile.companyName,
              market: resolvedMarket,
              image: profile.image,
              price: profile.price,
              changePercentage: profile.changesPercentage ? parseFloat(profile.changesPercentage) : profile.changePercentage,
              marketCap: profile.marketCap || profile.mktCap,
              sector: profile.sector,
              industry: profile.industry,
            });
          }}
        />
      )}

      <IconActionButton
        icon={Share2}
        tooltip={t.common.share}
        onClick={() => setIsSharePickerOpen(true)}
      />

      {onRegenerate && (
        <IconActionButton
          icon={RefreshCw}
          tooltip={isRegenerating ? t.report.generating : t.report.regenerate}
          loading={isRegenerating}
          disabled={isRegenerating || aiLoading}
          onClick={async () => {
            setIsRegenerating(true);
            try {
              await onRegenerate();
            } finally {
              setIsRegenerating(false);
            }
          }}
        />
      )}
    </>
  );

  const priceUp = priceChange >= 0;
  const employees = profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees, 10) : NaN;
  const headerFacts: Array<[string, string]> = [
    [t.common.marketCap, formatAmountCompact(marketCap)],
    [t.common.employees, Number.isFinite(employees) ? employees.toLocaleString() : '—'],
    ['IPO', profile.ipoDate || '—'],
    ['CEO', profile.ceo || '—'],
  ];

  const jumpToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="overflow-x-clip">
      <div ref={reportRef} className="bg-page">
        {/* 公司头部：名称与代码在左，最新价与涨跌在右，下方一行关键信息 */}
        <header className="border-b border-line bg-panel">
          <div className="page-container py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <CompanyLogo src={profile.image} alt={profile.companyName} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-[22px] font-semibold leading-7 text-fg">{profile.companyName}</h1>
                    <span className="font-mono text-[15px] font-semibold text-text-2">{profile.symbol}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-text-3">
                    <MarketBadge market={resolvedMarket} />
                    {exchangeName && <span>{exchangeName}</span>}
                    {currencyCode && <><span aria-hidden="true">·</span><span>{currencyCode}</span></>}
                    {profile.sector && <><span aria-hidden="true">·</span><span>{profile.sector}</span></>}
                    {profile.industry && <><span aria-hidden="true">·</span><span>{profile.industry}</span></>}
                    {profile.country && <><span aria-hidden="true">·</span><span>{profile.country}</span></>}
                  </div>
                </div>
              </div>

              <div className="shrink-0 md:text-right">
                <div className="flex items-baseline gap-2 md:justify-end">
                  <span className="font-mono text-[28px] font-semibold leading-8 text-fg">
                    {typeof profile.price === 'number' ? profile.price.toFixed(2) : '—'}
                  </span>
                  <span className="text-[12px] text-text-3">{currencyCode}</span>
                </div>
                <div className={`mt-1 font-mono text-[14px] font-medium ${priceUp ? 'text-up' : 'text-down'}`}>
                  {priceUp ? '+' : ''}{Number(priceChange).toFixed(2)} ({priceUp && !String(priceChangePercent).startsWith('-') ? '+' : ''}{priceChangePercent})
                </div>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-3 sm:grid-cols-4">
              {headerFacts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[12px] text-text-3">{label}</dt>
                  <dd className="mt-0.5 truncate font-mono text-[14px] font-medium text-fg">{value}</dd>
                </div>
              ))}
            </dl>

            <CompanyTags
              aiAnalysis={aiAnalysis}
              profile={profile}
              financialGrowth={financialGrowth}
              news={news}
              isLoading={aiLoading && !aiAnalysis}
            />
          </div>
        </header>

        {/* 工具栏：报告版本 · 章节跳转 · 操作（吸顶，位于全站导航下方） */}
        <div className="sticky top-14 z-30 border-b border-line bg-panel">
          <div className="page-container flex h-12 items-center gap-4">
            {renderReportVersionSwitcher()}
            <nav className="hidden h-full min-w-0 flex-1 items-stretch overflow-x-auto lg:flex" aria-label={t.report.sections.aiAnalysis}>
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jumpToSection(section.id)}
                  className={`tab !h-full whitespace-nowrap ${activeSection === section.id ? 'tab-active' : ''}`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              {shareNotice && <span className="hidden text-[12px] text-accent sm:inline">{shareNotice}</span>}
              {renderActionIcons()}
            </div>
          </div>
        </div>

        <div className="page-container space-y-8 py-6">
        {/* 概览：价格走势 · 关键统计 · 分析师评级 */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <PriceChart history={data.historicalPrices || []} theme={theme} currencyCode={currencyCode} />
            <AnalystPanel consensus={data.analystConsensus} currentPrice={profile.price} />
          </div>
          <KeyStatsPanel stats={data.keyStats} quote={data.quote} marketCap={marketCap} />
        </div>

        {/* ==================== Beginner Analysis Section ==================== */}
        {showBeginnerArea && (
          <CollapsibleSection
            id="beginnerAnalysis"
            title={t.report.beginnerReport}
            subtitle={t.report.beginnerSubtitle}
            expanded={expandedSections.aiAnalysis}
            onToggle={() => toggleSection('aiAnalysis')}
            sectionNumber={getSectionNumber('beginnerAnalysis')}
            onShare={handleShareModule}
          >
            <div className="space-y-4">
              {/* Verdict */}
              <AnalysisCard title={t.report.beginnerSections.verdict} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerVerdict ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{data.beginnerAiAnalysis.beginnerVerdict}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.verdictLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* Company Intro */}
              <AnalysisCard title={t.report.beginnerSections.companyIntro} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerCompanyIntro ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{data.beginnerAiAnalysis.beginnerCompanyIntro}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.companyIntroLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* Risk / Reward */}
              <AnalysisCard title={t.report.beginnerSections.riskReward} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerRiskReward ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{data.beginnerAiAnalysis.beginnerRiskReward}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.riskRewardLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* Action Plan */}
              <AnalysisCard title={t.report.beginnerSections.actionPlan} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerActionPlan ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{data.beginnerAiAnalysis.beginnerActionPlan}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.actionPlanLoading}</span>
                  </div>
                )}
              </AnalysisCard>
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== AI 生成中提示（仅普通版） ==================== */}
        {showAiLoading && showAiSectionArea && (
          <div className="panel flex items-center gap-3 border-l-2 !border-l-accent px-4 py-3">
            <span className="h-4 w-4 shrink-0 rounded-full border-2 border-text-4 border-t-accent animate-spin" aria-hidden="true" />
            <div className="text-[13px]">
              <span className="font-medium text-fg">{t.report.aiAnalysis}</span>
              <span className="ml-2 text-text-3">{t.report.dataLoaded} · {t.report.analyzingMoat}</span>
            </div>
          </div>
        )}

        {/* ==================== AI 分析内容（仅普通版） ==================== */}
        {showAiSectionArea && (
          <CollapsibleSection
            id="aiAnalysis"
            title={t.report.sections.aiAnalysis}
            expanded={expandedSections.aiAnalysis}
            onToggle={() => toggleSection('aiAnalysis')}
            sectionNumber={getSectionNumber('aiAnalysis')}
            onShare={handleShareModule}
          >
            <div className="space-y-4">
              {aiError && (
                <div className="panel p-6 md:p-8 border border-down/20 bg-down/10">
                  <p className="text-down text-sm">{aiError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                {/* 企业概况 */}
                <AnalysisCard title={t.report.analysis.companyOverview} onShare={handleShareModule}>
                  {aiAnalysis?.companyOverview ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.companyOverview}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-text-3 text-[13px]">
                      <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                      <span>{t.report.analysis.companyOverviewLoading}</span>
                    </div>
                  )}
                </AnalysisCard>

                {/* 行业分析（含痛点） — merged */}
                <AnalysisCard title={t.report.analysis.industryCombined} onShare={handleShareModule}>
                  <div className="space-y-5">
                    <div>
                      <h4 className="label-caps mb-2">
                        {t.report.analysis.industryOverviewSub}
                      </h4>
                      {aiAnalysis?.industryAnalysis ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.industryAnalysis}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-2 text-mist-500 text-sm">
                          <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                          <span>{t.report.analysis.industryAnalysisLoading}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="label-caps mb-2">
                        {t.report.analysis.industryPainPointsSub}
                      </h4>
                      {aiAnalysis?.industryPainPoints ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.industryPainPoints}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-2 text-mist-500 text-sm">
                          <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                          <span>{t.report.analysis.industryPainPointsLoading}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </AnalysisCard>

                {/* 竞争格局与护城河 — merged */}
                <AnalysisCard title={t.report.analysis.competitiveCombined} onShare={handleShareModule}>
                  <div className="space-y-5">
                    <div>
                      <h4 className="label-caps mb-2">
                        {t.report.analysis.competitiveLandscapeSub}
                      </h4>
                      {aiAnalysis?.competitors ? (
                        <>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.competitors}</ReactMarkdown>
                          {peers && peers.length > 0 && (
                            <div className="not-prose mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                              <span className="mr-1 text-[12px] text-text-3">{t.report.analysis.mainCompetitors}</span>
                              {peers.slice(0, 8).map((peer) => (
                                <a
                                  key={peer}
                                  href={`/${locale}/companies/${encodeURIComponent(peer)}`}
                                  className="inline-flex h-7 items-center rounded-sm border border-line-strong px-2 font-mono text-[12px] font-semibold text-accent hover:bg-hover"
                                >
                                  {peer}
                                </a>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-mist-500 text-sm">
                          <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                          <span>{t.report.analysis.competitiveLandscapeLoading}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="label-caps mb-2">
                        {t.report.analysis.competitiveAdvantageSub}
                      </h4>
                      {aiAnalysis?.competitiveAdvantage ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.competitiveAdvantage}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-2 text-mist-500 text-sm">
                          <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                          <span>{t.report.analysis.competitiveAdvantageLoading}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="label-caps mb-2">
                        {t.report.analysis.coreMoatSub}
                      </h4>
                      {aiAnalysis?.moat ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.moat}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-2 text-mist-500 text-sm">
                          <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                          <span>{t.report.analysis.coreMoatLoading}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </AnalysisCard>
              </div>

              {/* 最新动态：不使用联网搜索，仅展示非实时补充分析 */}
              {showRecentDevelopmentsInStandard && (
                <AnalysisCard title={t.report.analysis.recentDevelopments} onShare={handleShareModule}>
                  {aiAnalysis?.recentDevelopments ? (
                    <div className="prose prose-report max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-a:text-glacier-500 prose-a:no-underline hover:prose-a:underline text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.recentDevelopments}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-text-3 text-[13px]">
                      <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                      <span>{t.report.analysis.recentDevelopmentsLoading}</span>
                    </div>
                  )}
                </AnalysisCard>
              )}

              {/* 财报电话会议精要 */}
              {(earningsCallSummary || aiLoading) && (
                <AnalysisCard title={t.report.analysis.earningsCallSummary} onShare={handleShareModule}>
                  {earningsCallSummary ? (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{earningsCallSummary}</ReactMarkdown>
                      {transcriptText && (
                        <div className="not-prose mt-4 space-y-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTranscript((prev) => !prev);
                            }}
                            className="btn-secondary text-sm"
                          >
                            {showTranscript ? t.report.analysis.hideOriginal : t.report.analysis.viewOriginal}
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
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-text-3 text-[13px]">
                      <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                      <span>{t.report.analysis.earningsCallSummaryLoading}</span>
                    </div>
                  )}
                </AnalysisCard>
              )}

              {/* 投资建议总结 */}
              <AnalysisCard title={t.report.analysis.investmentConclusion} onShare={handleShareModule}>
                {aiAnalysis?.investmentConclusion ? (
                  <div className="prose prose-report max-w-none prose-p:text-mist-200 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-200 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={proMarkdownComponents}>{aiAnalysis.investmentConclusion}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.analysis.investmentConclusionLoading}</span>
                  </div>
                )}
              </AnalysisCard>
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 财务报表（仅普通版） ==================== */}
        {showFinancialStatementsInVersion && (
          <CollapsibleSection
            id="financialStatements"
            title={t.report.sections.financialData}
            subtitle={t.report.sections.financialSubtitle}
            expanded={expandedSections.financialStatements}
            onToggle={() => toggleSection('financialStatements')}
            sectionNumber={getSectionNumber('financialStatements')}
            onShare={handleShareModule}
          >
            <div className="space-y-4">
              {/* 桑基图和营收图表 */}
              <div className="panel p-5">
                {/* 桑基图 */}
                {currentSankeyData && currentSankeyData.links && currentSankeyData.links.length > 0 && (
                  <div className="mb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <h4 className="panel-title">{t.report.sankey.title}</h4>
                      {availableYears.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-mist-500 whitespace-nowrap">{t.report.sankey.selectYear}</span>
                          <div className="inline-flex flex-wrap overflow-hidden rounded-md border border-line-strong">
                            {availableYears.map((year, yearPos) => (
                              <button
                                key={year.index}
                                type="button"
                                onClick={() => setSankeyYearIndex(year.index)}
                                className={`h-7 px-2.5 font-mono text-[12px] font-medium whitespace-nowrap ${yearPos > 0 ? 'border-l border-line' : ''} ${sankeyYearIndex === year.index
                                  ? 'bg-accent/10 text-accent'
                                  : 'text-text-2 hover:bg-hover hover:text-fg'
                                  }`}
                              >
                                {year.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <SankeyChart
                      data={currentSankeyData}
                      currencySymbol={currencySymbol}
                      currencyCode={currencyCode}
                      theme={theme}
                    />
                  </div>
                )}

                {/* 其他图表 */}
                <RevenueCharts
                  incomeStatements={incomeStatements}
                  incomeStatementsQuarter={data.incomeStatementsQuarter}
                  currencySymbol={currencySymbol}
                  currencyCode={currencyCode}
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
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 专业版 AI 分析（7个独立模块） ==================== */}
        {showValuationSection && (
          <CollapsibleSection
            id="proAnalysis"
            title={t.report.sections.proAnalysis}
            subtitle={t.report.sections.proSubtitle}
            expanded={expandedSections.proAnalysis}
            onToggle={() => toggleSection('proAnalysis')}
            sectionNumber={getSectionNumber('proAnalysis')}
            onShare={handleShareModule}
          >
            <div className="space-y-4">
              {/* 1. 公司与商业模式（合并生意模式 + 运营模式） */}
              <AnalysisCard title={t.report.proAnalysis.businessAndOperating} onShare={handleShareModule}>
                <div className="space-y-5">
                  <div>
                    <h4 className="label-caps mb-2">
                      {t.report.proAnalysis.businessModelSub}
                    </h4>
                    {proAiAnalysis?.proBusinessModel ? (
                      <ProMarkdown>{proAiAnalysis.proBusinessModel}</ProMarkdown>
                    ) : (
                      <div className="flex items-center gap-2 text-text-3 text-[13px]">
                        <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                        <span>{t.report.proAnalysis.businessModelLoading}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <h4 className="label-caps mb-2">
                      {t.report.proAnalysis.operatingModelSub}
                    </h4>
                    {proAiAnalysis?.proOperatingModel ? (
                      <ProMarkdown>{proAiAnalysis.proOperatingModel}</ProMarkdown>
                    ) : (
                      <div className="flex items-center gap-2 text-text-3 text-[13px]">
                        <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                        <span>{t.report.proAnalysis.operatingModelLoading}</span>
                      </div>
                    )}
                  </div>
                </div>
              </AnalysisCard>

              {/* 2. 行业前景评估 */}
              <AnalysisCard title={t.report.proAnalysis.industryOutlook} onShare={handleShareModule}>
                {proAiAnalysis?.proIndustryOutlook ? (
                  <ProMarkdown>{proAiAnalysis.proIndustryOutlook}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.industryOutlookLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 4. 竞争地位与护城河 */}
              <AnalysisCard title={t.report.proAnalysis.moatAnalysis} onShare={handleShareModule}>
                {proAiAnalysis?.proMoatAnalysis ? (
                  <ProMarkdown>{proAiAnalysis.proMoatAnalysis}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.moatAnalysisLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 5. 财务健康与经营质量 */}
              <AnalysisCard title={t.report.proAnalysis.financialHealth} onShare={handleShareModule}>
                {proAiAnalysis?.proFinancialHealth ? (
                  <ProMarkdown>{proAiAnalysis.proFinancialHealth}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.financialHealthLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 6. 估值与买入时机 */}
              <AnalysisCard title={t.report.proAnalysis.valuation} onShare={handleShareModule}>
                {proAiAnalysis?.proValuation ? (
                  <ProMarkdown>{proAiAnalysis.proValuation}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.valuationLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 7. 综合投资建议 */}
              <AnalysisCard title={t.report.proAnalysis.investmentConclusion} onShare={handleShareModule} collapsible={false}>
                {proAiAnalysis?.proInvestmentConclusion ? (
                  <ProMarkdown>{proAiAnalysis.proInvestmentConclusion}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-text-3 text-[13px]">
                    <div className="w-3 h-3 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.investmentConclusionLoading}</span>
                  </div>
                )}
              </AnalysisCard>
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 估值与财务指标（仅专业版） ==================== */}
        {showValuationSection && (
          <CollapsibleSection
            id="valuation"
            title={t.report.sections.valuation}
            expanded={expandedSections.valuation}
            onToggle={() => toggleSection('valuation')}
            sectionNumber={getSectionNumber('valuation')}
            onShare={handleShareModule}
          >
            <div>
              <ProfessionalValuationMetrics
                profile={profile}
                keyMetrics={keyMetrics}
                keyMetricsTTM={keyMetricsTTM}
                financialRatios={financialRatios}
                financialRatiosTTM={financialRatiosTTM}
                financialScores={data.financialScores}
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 事件日历 ==================== */}
        {hasEventsData && (
          <CollapsibleSection
            id="events"
            title={t.report.sections.events}
            subtitle={t.report.sections.eventsSubtitle}
            expanded={expandedSections.events}
            onToggle={() => toggleSection('events')}
            sectionNumber={getSectionNumber('events')}
            onShare={handleShareModule}
          >
            <div>
              <EventCalendar
                earningsCalendar={earningsCalendar}
                dividendHistory={dividendHistory}
                stockSplits={stockSplits}
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== 持仓与交易分析（仅美股） ==================== */}
        {hasHoldingsData && (
          <CollapsibleSection
            id="holdings"
            title={t.report.sections.holdings}
            subtitle={t.report.sections.holdingsSubtitle}
            expanded={expandedSections.holdings}
            onToggle={() => toggleSection('holdings')}
            sectionNumber={getSectionNumber('holdings')}
            onShare={handleShareModule}
          >
            <div>
              <HoldingsAnalysis
                institutionalHolders={institutionalHolders}
                insiderTrading={insiderTrading}
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                theme={theme}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* 非美股市场的数据限制提示 */}
        {!isUSMarket && (
          <div className="rounded-md border border-warn/30 bg-warn/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <div>
                <h4 className="text-[13px] font-semibold text-warn">{t.report.dataNotice.title}</h4>
                <p className="mt-1 text-[13px] leading-5 text-text-2">
                  {t.report.dataNotice.content(marketConfig.nameCn)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 最新新闻（仅普通版） ==================== */}
        {showNewsInVersion && (
          <CollapsibleSection
            id="news"
            title={t.report.sections.news}
            expanded={expandedSections.news}
            onToggle={() => toggleSection('news')}
            sectionNumber={getSectionNumber('news')}
            onShare={handleShareModule}
          >
            <div>
              <div className="panel divide-y divide-white/10">
                {news.slice(0, 10).map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 px-4 py-3 hover:bg-hover"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-[14px] font-medium leading-5 text-fg">{item.title}</span>
                      <span className="mt-1 block truncate text-[12px] text-text-3">{item.site}</span>
                    </span>
                    <span className="whitespace-nowrap font-mono text-[12px] text-text-3">{formatDate(item.publishedDate)}</span>
                  </a>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* 免责声明 */}
        <footer className="border-t border-line pt-6 text-[12px] leading-5 text-text-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              {data.reportGeneratedAt && (
                <p>
                  {t.report.footer.generatedAt(new Date(data.reportGeneratedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }))}
                </p>
              )}
              {data.dataSources && data.dataSources.length > 0 && (
                <p>{t.report.overview.dataSources}: {data.dataSources.join(' · ')} · DeepSeek</p>
              )}
            </div>
            {data.reportGeneratedAt && onRegenerate && (
              <button
                type="button"
                onClick={async () => {
                  setIsRegenerating(true);
                  try {
                    await onRegenerate();
                  } finally {
                    setIsRegenerating(false);
                  }
                }}
                disabled={isRegenerating || aiLoading}
                className="btn-secondary self-start md:self-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? t.report.regenerating : t.report.regenerateAi}
              </button>
            )}
          </div>
          <p className="mt-4 max-w-4xl">{t.report.footer.disclaimer}</p>
        </footer>
        </div>
      </div>

      {isSharePickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label={t.common.close || 'Close'}
            onClick={() => setIsSharePickerOpen(false)}
          />
          <div
            ref={sharePickerA11y.dialogRef as any}
            role="dialog"
            aria-modal="true"
            aria-labelledby={sharePickerA11y.titleId}
            tabIndex={-1}
            className="relative w-full max-w-sm overflow-hidden rounded-md border border-line bg-panel shadow-xl focus:outline-none animate-fade-in"
          >
            <h3 id={sharePickerA11y.titleId} className="panel-header panel-title">{t.common.share}</h3>
            <div className="py-1">
              <button
                onClick={() => runShareAction(handleShareAsImage)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-text-1 hover:bg-hover"
              >
                <ImageIcon className="h-4 w-4" />
                {t.report.shareActions.image}
              </button>
              <button
                onClick={() => runShareAction(handleShareAsExcel)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-text-1 hover:bg-hover"
              >
                <FileDown className="h-4 w-4" />
                {t.report.shareActions.excel}
              </button>
              <button
                onClick={() => runShareAction(handleShareLink)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-text-1 hover:bg-hover"
              >
                <Link2 className="h-4 w-4" />
                {t.report.shareActions.link}
              </button>
              <button
                onClick={() => runShareAction(handleShareToWeChat)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-text-1 hover:bg-hover"
              >
                <MessageCircle className="h-4 w-4" />
                {t.report.shareActions.wechat}
              </button>
              <button
                onClick={() => runShareAction(handleShareToFacebook)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-text-1 hover:bg-hover"
              >
                <ExternalLink className="h-4 w-4" />
                {t.report.shareActions.facebook}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享模块模态框 */}
      <ShareExportModal
        isOpen={shareModalState.isOpen}
        onClose={() => setShareModalState(s => ({ ...s, isOpen: false }))}
        title={shareModalState.title}
        contentHtml={shareModalState.contentHtml}
        companyName={profile.companyName}
        symbol={profile.symbol}
        theme={theme}
      />
    </div>
  );
}
