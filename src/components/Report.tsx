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
  RefreshCw,
  Share2,
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
const proMarkdownComponents: Components = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/5 border-b border-white/10">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-white/5">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-white/5 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-mist-300 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-mist-200 font-mono text-xs whitespace-nowrap">
      {children}
    </td>
  ),
};

// 专业版报告的 Markdown 渲染组件
const ProMarkdown = ({ children }: { children: string }) => (
  <div className="prose prose-gemini max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-h2:text-glacier-400 prose-h2:text-base prose-h2:font-medium prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-mist-200 prose-h3:text-sm prose-h3:font-medium prose-h3:mt-4 prose-h3:mb-2 text-sm">
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
import ExportModal from './ExportModal';
import ShareExportModal from './ShareExportModal';
import type { ReportData, MarketType } from '@/types';
import { getMarketConfig } from '@/lib/markets';
import { buildSankeyData } from '@/lib/sankey-utils';
import { useUnitMode } from '@/lib/UnitModeContext';
import { formatNumber as formatNumberUtil } from '@/lib/format-number';
import UnitModeToggle from './UnitModeToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompare } from '@/contexts/CompareContext';
import { translateDiagnosticTag } from '@/i18n/diagnosticTags';
import { exportReportToExcel } from '@/lib/export-excel';

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
    <div className="bg-white/5 border border-white/10 p-6 rounded-md hover:border-white/20 transition-colors relative group">
      <div
        className={`flex items-center justify-between gap-3 border-b border-white/5 pb-3 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-white uppercase tracking-wider">{title}</h3>
        <div className="flex items-center gap-2">
          {onShare && (
            <button
              onClick={handleShare}
              className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-mist-500 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
              title={t.report.shareModule}
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
              className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-mist-500 hover:text-white hover:bg-white/10 transition-all"
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
        className={`prose prose-gemini max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 text-sm transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 opacity-100' : 'h-0 opacity-0 overflow-hidden'
          }`}
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
      <div className="flex items-center justify-between mb-4 group">
        <button
          className="flex-1 flex items-center gap-3"
          onClick={onToggle}
        >
          {/* 编号 */}
          {sectionNumber && (
            <span className="text-xl font-light text-mist-600 font-mono hidden md:block w-8 border-r border-white/10 mr-2">{sectionNumber}</span>
          )}
          <div className="text-left">
            <h2 className="text-lg font-medium text-white uppercase tracking-wide group-hover:text-glacier-500 transition-colors">{title}</h2>
            {subtitle && <p className="text-xs text-mist-500 font-mono">{subtitle}</p>}
          </div>
        </button>
        <div className="flex items-center gap-2">
          {onShare && (
            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors text-mist-400 hover:text-white"
              title={t.report.shareModule}
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-mist-400 group-hover:text-white" />
            ) : (
              <ChevronDown className="w-4 h-4 text-mist-400 group-hover:text-white" />
            )}
          </button>
        </div>
      </div>

      <div ref={contentRef} className={`transition-all duration-300 ease-out ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
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
    bg: 'bg-white',
    border: 'border-transparent',
    text: 'text-black',
    iconColor: 'text-black',
  },
  'neutral': {
    bg: 'bg-white/10',
    border: 'border-white/20',
    text: 'text-mist-200',
    iconColor: 'text-mist-400',
  },
  'bad': {
    bg: 'bg-transparent',
    border: 'border-white/10',
    text: 'text-mist-500 line-through decoration-mist-700',
    iconColor: 'text-mist-600',
  },
  'special': {
    bg: 'bg-white',
    border: 'border-transparent',
    text: 'text-black',
    iconColor: 'text-black',
  },
};

// 单个维度标签组件
function DimensionBadge({ tag }: { tag: DimensionTag }) {
  const style = LEVEL_STYLES[tag.level];
  const { locale } = useLanguage();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-mist-500 font-mono uppercase tracking-widest">{translateDiagnosticTag(tag.dimension, locale)}</span>
      <div className={`inline-flex items-center px-3 py-1.5 rounded-sm text-xs font-medium border transition-all ${style.bg} ${style.border} ${style.text}`}>
        <span className="tracking-wide">{translateDiagnosticTag(tag.label, locale)}</span>
      </div>
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
      <div className="flex items-center gap-2 mt-4">
        <div className="flex items-center gap-2 text-xs text-mist-500">
          <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
          <span>{t.report.analyzingCompanyFeatures}</span>
        </div>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-white/5 pt-6">
      <div className="flex flex-wrap items-start gap-6">
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
      label: stmt.date?.split('-')[0] || stmt.calendarYear || stmt.fiscalYear || t.report.sankey.yearIndex(index + 1),
    }));
  }, [incomeStatements, t]);

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

  // Use unit mode from context
  const { unitMode } = useUnitMode();

  const formatNumber = (num: number) => {
    if (!num) return 'N/A';
    return formatNumberUtil(num, unitMode);
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

  // 为侧边导航准备的 sections
  const navSections = sections.map((s) => ({ id: s.id, label: s.label, number: s.number }));

  // 货币符号
  const currencySymbol = marketConfig.currencySymbol;

  // 获取 section 编号
  const getSectionNumber = (id: string) => sections.find(s => s.id === id)?.number || '';
  const toolbarButtonClass = 'gemini-btn gemini-btn-secondary h-9 px-3 flex items-center gap-2 text-mist-300 hover:text-mist-200';
  const toolbarIconClass = 'w-4 h-4 text-current shrink-0';
  // DeepSeek 暂不支持在线研究，普通版先隐藏“最新发展动态”卡片
  const showRecentDevelopmentsInStandard = false;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* 侧边锚点导航 */}
      <SideAnchorNav sections={navSections} activeSection={activeSection} />

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-8 animate-fade-in-up">
        {!isModalView && (
          <button
            onClick={onReset}
            className={toolbarButtonClass}
          >
            <ArrowLeft className={toolbarIconClass} />
            <span className="hidden sm:inline">{t.report.backToSearch}</span>
          </button>
        )}

        {/* Report version switcher - 3 options */}
        <div className="flex items-center gap-1 bg-white/5 rounded-sm p-0.5">
          {(['beginner', 'standard', 'professional'] as const).map((ver) => {
            const labels = {
              beginner: t.report.beginnerReport,
              standard: t.report.basicVersion,
              professional: t.report.proVersion,
            };
            const isActive = reportVersion === ver;
            return (
              <button
                key={ver}
                onClick={() => {
                  setReportVersion(ver);
                  if (onVersionChange) {
                    onVersionChange(ver);
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-sm transition-all ${
                  isActive
                    ? 'bg-accent/20 text-accent font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {labels[ver]}
              </button>
            );
          })}
        </div>

        {/* 单位切换 */}
        <UnitModeToggle className="h-9 px-3 text-mist-300 hover:text-mist-200" />

        {/* 右侧按钮组 - 推到右边 */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* 加入对比按钮 */}
          {profile && (
            <motion.button
              onClick={() => {
                addCompany({
                  symbol: profile.symbol,
                  companyName: profile.companyName,
                  market: data.market || 'US',
                  image: profile.image,
                  price: profile.price,
                  changePercentage: profile.changesPercentage ? parseFloat(profile.changesPercentage) : profile.changePercentage,
                  marketCap: profile.marketCap || profile.mktCap,
                  sector: profile.sector,
                  industry: profile.industry,
                });
              }}
              disabled={isInCompare(profile.symbol) || isFull}
              className={`${toolbarButtonClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              whileHover={{ scale: isInCompare(profile.symbol) || isFull ? 1 : 1.02 }}
              whileTap={{ scale: isInCompare(profile.symbol) || isFull ? 1 : 0.98 }}
            >
              <Scale className={toolbarIconClass} />
              <span className="hidden sm:inline">
                {isInCompare(profile.symbol) ? t.compare.alreadyInCompare : t.compare.addToCompare}
              </span>
            </motion.button>
          )}

          <motion.button
            onClick={() => setIsExportModalOpen(true)}
            className={toolbarButtonClass}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ImageIcon className={toolbarIconClass} />
            <span className="hidden sm:inline">{t.report.exportImage}</span>
          </motion.button>

          <motion.button
            onClick={() => exportReportToExcel(data, t)}
            className={toolbarButtonClass}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileDown className={toolbarIconClass} />
            <span className="hidden sm:inline">{t.report.exportExcel}</span>
          </motion.button>

          {/* 重新生成按钮 */}
          {onRegenerate && (
            <motion.button
              onClick={async () => {
                setIsRegenerating(true);
                try {
                  await onRegenerate();
                } finally {
                  setIsRegenerating(false);
                }
              }}
              disabled={isRegenerating || aiLoading}
              className={`${toolbarButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className={`${toolbarIconClass} ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRegenerating ? t.report.generating : t.report.regenerate}</span>
            </motion.button>
          )}
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-mist-500 text-xs mb-4 font-mono uppercase tracking-wider">
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

              {/* 基础数据 - 紧凑内联样式 */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm py-3 px-4 bg-white/[0.03] rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-mist-600" />
                  <span className="text-mist-500 text-xs">{t.common.marketCap}</span>
                  <span className="font-mono font-medium text-white">{currencySymbol}{formatNumber(marketCap)}</span>
                </div>
                <span className="text-mist-700">·</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-mist-600" />
                  <span className="text-mist-500 text-xs">{t.common.price}</span>
                  <span className="font-mono font-medium text-white">{currencySymbol}{profile.price?.toFixed(2) || 'N/A'}</span>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${priceChange >= 0 ? 'text-growth bg-growth/10' : 'text-decay bg-decay/10'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChangePercent}
                  </span>
                </div>
                <span className="text-mist-700 hidden sm:inline">·</span>
                <div className="flex items-center gap-2">
                  <Users2 className="w-3.5 h-3.5 text-mist-600" />
                  <span className="text-mist-500 text-xs">{t.common.employees}</span>
                  <span className="font-mono font-medium text-white">{profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees).toLocaleString() : 'N/A'}</span>
                </div>
                <span className="text-mist-700 hidden md:inline">·</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-mist-600" />
                  <span className="text-mist-500 text-xs">IPO</span>
                  <span className="font-mono font-medium text-white">{profile.ipoDate || 'N/A'}</span>
                </div>
              </div>

              {/* 智能标签 */}
              <CompanyTags
                aiAnalysis={aiAnalysis}
                profile={profile}
                financialGrowth={financialGrowth}
                news={news}
                isLoading={aiLoading && !aiAnalysis}
              />
            </div>
          </div>
        </header>

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
            <div className="space-y-6 animate-fade-in">
              {/* Verdict */}
              <AnalysisCard title={t.report.beginnerSections.verdict} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerVerdict ? (
                  <ReactMarkdown>{data.beginnerAiAnalysis.beginnerVerdict}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.verdictLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* Company Intro */}
              <AnalysisCard title={t.report.beginnerSections.companyIntro} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerCompanyIntro ? (
                  <ReactMarkdown>{data.beginnerAiAnalysis.beginnerCompanyIntro}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.companyIntroLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* Risk / Reward */}
              <AnalysisCard title={t.report.beginnerSections.riskReward} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerRiskReward ? (
                  <ReactMarkdown>{data.beginnerAiAnalysis.beginnerRiskReward}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.riskRewardLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* Action Plan */}
              <AnalysisCard title={t.report.beginnerSections.actionPlan} onShare={handleShareModule}>
                {data.beginnerAiAnalysis?.beginnerActionPlan ? (
                  <ReactMarkdown>{data.beginnerAiAnalysis.beginnerActionPlan}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.beginnerSections.actionPlanLoading}</span>
                  </div>
                )}
              </AnalysisCard>
            </div>
          </CollapsibleSection>
        )}

        {/* ==================== AI 生成中提示（仅普通版） ==================== */}
        {showAiLoading && showAiSectionArea && (
          <div className="bg-white/5 border border-white/10 p-4 border-l-2 border-l-glacier-500 animate-fade-in rounded-sm">
            {/* 标题区域 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-4 border-2 border-white/10 border-t-glacier-500 rounded-full animate-spin" />
              <h3 className="text-sm font-medium text-white font-mono uppercase tracking-wider">{t.report.aiAnalysis}</h3>
            </div>

            {/* 分析步骤指示器 */}
            <div className="space-y-2 mb-4 pl-7">
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="w-1 h-1 rounded-full bg-glacier-500" />
                <span className="text-mist-300">{t.report.dataLoaded}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="w-1 h-1 rounded-full bg-glacier-500 animate-pulse" />
                <span className="text-mist-400">{t.report.analyzingMoat}</span>
              </div>
            </div>

            {/* 线性进度条 */}
            <div className="h-0.5 bg-white/10 w-full">
              <div className="h-full w-2/3 bg-glacier-500 animate-pulse" />
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
            <div className="space-y-6 animate-fade-in">
              {aiError && (
                <div className="gemini-card p-6 md:p-8 border border-red-500/20 bg-red-500/10">
                  <p className="text-red-400 text-sm">{aiError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                {/* 企业概况 */}
                <AnalysisCard title={t.report.analysis.companyOverview} onShare={handleShareModule}>
                  {aiAnalysis?.companyOverview ? (
                    <ReactMarkdown>{aiAnalysis.companyOverview}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-mist-500 text-sm">
                      <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                      <span>{t.report.analysis.companyOverviewLoading}</span>
                    </div>
                  )}
                </AnalysisCard>

                {/* 行业分析 */}
                <AnalysisCard title={t.report.analysis.industryAnalysis} onShare={handleShareModule}>
                  {aiAnalysis?.industryAnalysis ? (
                    <ReactMarkdown>{aiAnalysis.industryAnalysis}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-mist-500 text-sm">
                      <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                      <span>{t.report.analysis.industryAnalysisLoading}</span>
                    </div>
                  )}
                </AnalysisCard>

                {/* 行业痛点与障碍 */}
                <AnalysisCard title={t.report.analysis.industryPainPoints} onShare={handleShareModule}>
                  {aiAnalysis?.industryPainPoints ? (
                    <ReactMarkdown>{aiAnalysis.industryPainPoints}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-mist-500 text-sm">
                      <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                      <span>{t.report.analysis.industryPainPointsLoading}</span>
                    </div>
                  )}
                </AnalysisCard>

                {/* 竞争格局 */}
                <AnalysisCard title={t.report.analysis.competitiveLandscape} onShare={handleShareModule}>
                  {aiAnalysis?.competitors ? (
                    <>
                      <ReactMarkdown>{aiAnalysis.competitors}</ReactMarkdown>
                      {peers && peers.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-white/5">
                          <span className="text-xs text-mist-500 mr-2">{t.report.analysis.mainCompetitors}</span>
                          {peers.slice(0, 8).map((peer) => (
                            <span key={peer} className="px-3 py-1 bg-glacier-500/10 border border-glacier-500/20 rounded-full text-glacier-400 text-sm font-mono hover:bg-glacier-500/15 transition-colors cursor-default">
                              {peer}
                            </span>
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
                </AnalysisCard>

                {/* 竞争优势 */}
                <AnalysisCard title={t.report.analysis.competitiveAdvantage} onShare={handleShareModule}>
                  {aiAnalysis?.competitiveAdvantage ? (
                    <ReactMarkdown>{aiAnalysis.competitiveAdvantage}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-mist-500 text-sm">
                      <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                      <span>{t.report.analysis.competitiveAdvantageLoading}</span>
                    </div>
                  )}
                </AnalysisCard>

                {/* 核心护城河 */}
                <AnalysisCard title={t.report.analysis.coreMoat} onShare={handleShareModule}>
                  {aiAnalysis?.moat ? (
                    <ReactMarkdown>{aiAnalysis.moat}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-mist-500 text-sm">
                      <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                      <span>{t.report.analysis.coreMoatLoading}</span>
                    </div>
                  )}
                </AnalysisCard>
              </div>

              {/* 最新动态：DeepSeek 暂不支持在线研究，普通版暂不展示 */}
              {showRecentDevelopmentsInStandard && (
                <AnalysisCard title={t.report.analysis.recentDevelopments} onShare={handleShareModule}>
                  {aiAnalysis?.recentDevelopments ? (
                    <div className="prose prose-gemini max-w-none prose-p:text-mist-300 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-300 prose-a:text-glacier-500 prose-a:no-underline hover:prose-a:underline text-sm">
                      <ReactMarkdown>{aiAnalysis.recentDevelopments}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-mist-500 text-sm">
                      <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
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
                      <ReactMarkdown>{earningsCallSummary}</ReactMarkdown>
                      {transcriptText && (
                        <div className="not-prose mt-4 space-y-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTranscript((prev) => !prev);
                            }}
                            className="gemini-btn gemini-btn-secondary text-sm"
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
                    <div className="flex items-center gap-2 text-mist-500 text-sm">
                      <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                      <span>{t.report.analysis.earningsCallSummaryLoading}</span>
                    </div>
                  )}
                </AnalysisCard>
              )}

              {/* 投资建议总结 */}
              <AnalysisCard title={t.report.analysis.investmentConclusion} onShare={handleShareModule}>
                {aiAnalysis?.investmentConclusion ? (
                  <div className="prose prose-gemini max-w-none prose-p:text-mist-200 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-li:text-mist-200 text-sm">
                    <ReactMarkdown>{aiAnalysis.investmentConclusion}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
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
            <div className="space-y-6 animate-fade-in">
              {/* 桑基图和营收图表 */}
              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md">
                {/* 桑基图 */}
                {currentSankeyData && currentSankeyData.links && currentSankeyData.links.length > 0 && (
                  <div className="mb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <h4 className="text-sm font-medium text-mist-300">{t.report.sankey.title}</h4>
                      {availableYears.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-mist-500 whitespace-nowrap">{t.report.sankey.selectYear}</span>
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
            <div className="space-y-6 animate-fade-in">
              {/* 1. 生意模式分析 */}
              <AnalysisCard title={t.report.proAnalysis.businessModel} onShare={handleShareModule}>
                {proAiAnalysis?.proBusinessModel ? (
                  <ProMarkdown>{proAiAnalysis.proBusinessModel}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.businessModelLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 2. 运营模式分析 */}
              <AnalysisCard title={t.report.proAnalysis.operatingModel} onShare={handleShareModule}>
                {proAiAnalysis?.proOperatingModel ? (
                  <ProMarkdown>{proAiAnalysis.proOperatingModel}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.operatingModelLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 3. 行业前景评估 */}
              <AnalysisCard title={t.report.proAnalysis.industryOutlook} onShare={handleShareModule}>
                {proAiAnalysis?.proIndustryOutlook ? (
                  <ProMarkdown>{proAiAnalysis.proIndustryOutlook}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.industryOutlookLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 4. 竞争地位与护城河 */}
              <AnalysisCard title={t.report.proAnalysis.moatAnalysis} onShare={handleShareModule}>
                {proAiAnalysis?.proMoatAnalysis ? (
                  <ProMarkdown>{proAiAnalysis.proMoatAnalysis}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.moatAnalysisLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 5. 财务健康与经营质量 */}
              <AnalysisCard title={t.report.proAnalysis.financialHealth} onShare={handleShareModule}>
                {proAiAnalysis?.proFinancialHealth ? (
                  <ProMarkdown>{proAiAnalysis.proFinancialHealth}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.financialHealthLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 6. 估值与买入时机 */}
              <AnalysisCard title={t.report.proAnalysis.valuation} onShare={handleShareModule}>
                {proAiAnalysis?.proValuation ? (
                  <ProMarkdown>{proAiAnalysis.proValuation}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
                    <span>{t.report.proAnalysis.valuationLoading}</span>
                  </div>
                )}
              </AnalysisCard>

              {/* 7. 综合投资建议 */}
              <AnalysisCard title={t.report.proAnalysis.investmentConclusion} onShare={handleShareModule} collapsible={false}>
                {proAiAnalysis?.proInvestmentConclusion ? (
                  <ProMarkdown>{proAiAnalysis.proInvestmentConclusion}</ProMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-mist-500 text-sm">
                    <div className="w-3 h-3 border border-mist-600 border-t-glacier-500 rounded-full animate-spin" />
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
            title={t.report.sections.events}
            subtitle={t.report.sections.eventsSubtitle}
            expanded={expandedSections.events}
            onToggle={() => toggleSection('events')}
            sectionNumber={getSectionNumber('events')}
            onShare={handleShareModule}
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
            title={t.report.sections.holdings}
            subtitle={t.report.sections.holdingsSubtitle}
            expanded={expandedSections.holdings}
            onToggle={() => toggleSection('holdings')}
            sectionNumber={getSectionNumber('holdings')}
            onShare={handleShareModule}
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
                <h4 className="text-amber-300 font-medium mb-2">{t.report.dataNotice.title}</h4>
                <p className="text-sm text-mist-400 leading-relaxed">
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
                {t.report.footer.generatedAt(new Date(data.reportGeneratedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }))}
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
                  {isRegenerating ? t.report.regenerating : t.report.regenerateAi}
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-mist-400 max-w-2xl mx-auto leading-relaxed font-sans">
            {t.report.footer.disclaimer}
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
