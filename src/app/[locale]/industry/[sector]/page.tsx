'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import PageHeader from '@/components/PageHeader';
import CompanyOverviewModal from '@/components/CompanyOverviewModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { withLocale } from '@/lib/locale-path';
import { formatMarketCap, POSITION_LABELS, type ValueChainPosition } from '@/lib/industry-data';
import { stripEmoji } from '@/lib/text-utils';
import type { CompanyDiagnostic } from '@/types';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface SegmentCompanyInfo {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  change: number;
  revenueGrowth: number;
  industry: string;
  image: string;
  history: number[];
  note?: { zh: string; en: string };
}

interface SegmentInfo {
  id: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  position: ValueChainPosition | null;
  themes: { zh: string[]; en: string[] } | null;
  companies: SegmentCompanyInfo[];
  totalMarketCap: number;
  avgGrowth: number;
}

interface DetailData {
  sector: string;
  overview: { zh: string; en: string } | null;
  segments: SegmentInfo[];
  companies: SegmentCompanyInfo[];
  totalMarketCap: number;
  avgGrowth: number;
  companyCount: number;
  topCompany: SegmentCompanyInfo | null;
  news: { title: string; url: string; date: string; source: string; sentiment: string }[];
}

const darkPanelStyle = {
  backgroundColor: 'rgb(var(--c-panel))',
  borderColor: 'var(--line)',
} as const;

const darkTableHeaderStyle = {
  backgroundColor: 'rgb(var(--c-raised))',
} as const;

const POSITION_COLOR: Record<ValueChainPosition, string> = {
  upstream: '#4A86E8',
  midstream: '#3FA66B',
  downstream: '#D9534F',
  platform: '#8DB4E2',
  service: '#C9A227',
  infrastructure: '#7FA3BF',
};

export default function IndustryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'structure' | 'companies' | 'news'>('structure');
  const [selectedCompany, setSelectedCompany] = useState<CompanyDiagnostic | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const sector = typeof params.sector === 'string' ? decodeURIComponent(params.sector) : '';

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const fetchData = useCallback(async () => {
    if (!sector) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/industry/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        // Expand the first two segments by default so users see content immediately.
        const initial = new Set<string>();
        (json.data.segments as SegmentInfo[]).slice(0, 2).forEach((s) => initial.add(s.id));
        setExpandedSegments(initial);
      } else {
        setError(json.error || t.industry.error);
      }
    } catch {
      setError(t.industry.error);
    } finally {
      setLoading(false);
    }
  }, [sector, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sectorName = useMemo(() => {
    const sectorMap = t.sectors as Record<string, string>;
    return stripEmoji(sectorMap[sector] || sector);
  }, [sector, t]);

  const toggleSegment = (id: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllSegments = () => {
    if (!data) return;
    setExpandedSegments(new Set(data.segments.map((s) => s.id)));
  };

  const collapseAllSegments = () => {
    setExpandedSegments(new Set());
  };

  // Flatten all segment companies into a single de-duplicated list for the Profiles tab.
  const allCompaniesFlat = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, SegmentCompanyInfo>();
    for (const segment of data.segments) {
      for (const company of segment.companies) {
        if (!seen.has(company.symbol)) {
          seen.set(company.symbol, company);
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [data]);

  const handleCompanyClick = async (symbol: string) => {
    if (loadingCompany) return;
    setLoadingCompany(symbol);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedCompany(json.data);
        setShowOverviewModal(true);
      } else {
        router.push(`${withLocale(locale, '/companies')}/${encodeURIComponent(symbol)}`);
      }
    } catch {
      router.push(`${withLocale(locale, '/companies')}/${encodeURIComponent(symbol)}`);
    } finally {
      setLoadingCompany(null);
    }
  };

  const handleCloseOverview = () => {
    setShowOverviewModal(false);
    setTimeout(() => setSelectedCompany(null), 300);
  };

  // Segment market cap distribution treemap (used in structure tab header).
  const segmentTreemapOption = useMemo(() => {
    if (!data || data.segments.length === 0) return {};
    const totalCap = data.totalMarketCap || 1;
    const items = data.segments
      .filter((s) => s.totalMarketCap > 0)
      .map((s) => ({
        name: locale === 'zh' ? s.name.zh : s.name.en,
        value: s.totalMarketCap,
        share: (s.totalMarketCap / totalCap) * 100,
        avgGrowth: s.avgGrowth,
        position: s.position,
        itemStyle: {
          color: s.position ? POSITION_COLOR[s.position] : '#4A86E8',
        },
      }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#1B1F24' : '#FFFFFF',
        borderColor: isDark ? 'rgba(236,238,241,0.14)' : 'rgba(23,25,28,0.14)',
        textStyle: { color: isDark ? '#D8DCE2' : '#222222', fontFamily: 'Inter', fontSize: 12 },
        formatter: (params: any) => {
          const d = params.data;
          if (!d) return '';
          return `<div style="font-family:Inter;min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${stripEmoji(d.name)}</div>
            <div style="font-family:Inter,system-ui,sans-serif;font-size:11px;display:flex;justify-content:space-between;gap:12px">
              <span style="opacity:0.6">${t.industry.detail.segmentMarketCap}</span>
              <span>${formatMarketCap(d.value, locale)}</span>
            </div>
            <div style="font-family:Inter,system-ui,sans-serif;font-size:11px;display:flex;justify-content:space-between;gap:12px">
              <span style="opacity:0.6">${t.industry.detail.segmentShare}</span>
              <span>${d.share.toFixed(1)}%</span>
            </div>
            <div style="font-family:Inter,system-ui,sans-serif;font-size:11px;display:flex;justify-content:space-between;gap:12px">
              <span style="opacity:0.6">${t.industry.detail.companyTableCols.revenueGrowth}</span>
              <span style="color:${d.avgGrowth >= 0 ? (isDark ? '#26BA69' : '#0C803E') : (isDark ? '#F05050' : '#CF222E')}">${d.avgGrowth > 0 ? '+' : ''}${d.avgGrowth}%</span>
            </div>
          </div>`;
        },
      },
      series: [
        {
          type: 'treemap',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          itemStyle: { borderColor: isDark ? '#15181C' : '#FFFFFF', borderWidth: 2, gapWidth: 2 },
          label: {
            show: true,
            formatter: (params: any) => {
              const d = params.data;
              if (!d) return '';
              return `{name|${stripEmoji(d.name)}}\n{val|${d.share.toFixed(1)}%}`;
            },
            rich: {
              name: { fontSize: 12, fontWeight: 600, fontFamily: 'Inter', color: '#FFFFFF', lineHeight: 18 },
              val: { fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif', color: 'rgba(255,255,255,0.8)', lineHeight: 14 },
            },
          },
          data: items,
        },
      ],
    };
  }, [data, isDark, locale, t]);

  const positionLabel = (position: ValueChainPosition | null) => {
    if (!position) return null;
    return locale === 'zh' ? POSITION_LABELS[position].zh : POSITION_LABELS[position].en;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--c-page))' }}>
      <Header theme={theme} toggleTheme={toggleTheme} />

      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Link href={withLocale(locale, '/industry')} className="text-accent hover:underline">
              {t.industry.detail.backToOverview}
            </Link>
            <span>/</span>
            <span>{t.industry.detail.sectorPanorama}</span>
          </span>
        }
        title={sectorName}
        subtitle={data?.overview ? (locale === 'zh' ? data.overview.zh : data.overview.en) : undefined}
      />

      <main className="page-container py-6">

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-glacier-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-mist-400">{t.industry.loading}</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-mist-400">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 text-sm rounded-md border border-white/10 text-mist-300 hover:border-glacier-500/50 transition-colors">
              {t.industry.retry}
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const totalCompanies = data.segments.reduce((sum, s) => sum + s.companies.length, 0);
                const stats: { label: string; value: string; color?: string }[] = [
                  { label: t.industry.detail.segmentCount, value: String(data.segments.length) },
                  { label: t.industry.detail.companyCount, value: String(totalCompanies) },
                ];
                if (data.totalMarketCap > 0) {
                  stats.push({ label: t.industry.detail.totalMarketCap, value: formatMarketCap(data.totalMarketCap, locale) });
                }
                if (Number.isFinite(data.avgGrowth) && data.avgGrowth !== 0) {
                  stats.push({
                    label: t.industry.detail.avgGrowth,
                    value: `${data.avgGrowth > 0 ? '+' : ''}${data.avgGrowth}%`,
                    color: data.avgGrowth >= 0 ? 'text-growth' : 'text-decay',
                  });
                }
                return stats.map((stat) => (
                  <div key={stat.label} className="panel p-4 transition-colors hover:border-white/20" style={isDark ? darkPanelStyle : undefined}>
                    <div className="text-xs text-mist-500 mb-1">{stat.label}</div>
                    <div className={`text-lg font-mono font-semibold ${stat.color || ''}`} style={stat.color ? undefined : { color: 'rgb(var(--c-fg))' }}>
                      {stat.value}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-md w-fit border" style={isDark ? darkPanelStyle : { backgroundColor: 'rgb(var(--c-panel))', border: '1px solid var(--line)' }}>
              {(['structure', 'companies', 'news'] as const).map((tab) => {
                const labels = {
                  structure: t.industry.detail.structure,
                  companies: t.industry.detail.companyProfile,
                  news: t.industry.detail.news,
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-sm rounded-sm transition-colors ${activeTab === tab
                        ? 'bg-glacier-500/15 text-glacier-500 border border-glacier-500/30'
                        : 'text-mist-400 hover:text-mist-200 border border-transparent hover:border-white/10'
                      }`}
                  >
                    {stripEmoji(labels[tab])}
                  </button>
                );
              })}
            </div>

            {/* Structure tab */}
            {activeTab === 'structure' && (
              <div className="space-y-6">
                {/* Segment treemap */}
                {data.segments.some((s) => s.totalMarketCap > 0) && (
                  <section className="panel p-4 md:p-6" style={isDark ? darkPanelStyle : undefined}>
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--c-fg))' }}>
                        {t.industry.detail.segmentDistribution}
                      </h3>
                      <span className="text-[10px] label-caps text-mist-500">
                        {t.industry.detail.segmentDistributionHint}
                      </span>
                    </div>
                    <p className="text-xs text-mist-500 mb-4">
                      {t.industry.detail.segmentDistributionDesc}
                    </p>
                    <div
                      className="rounded-sm p-2"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <ReactECharts
                        option={segmentTreemapOption}
                        style={{ width: '100%', height: 320 }}
                        opts={{ renderer: 'canvas' }}
                        notMerge
                      />
                    </div>
                  </section>
                )}

                {/* Segment cards */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--c-fg))' }}>
                      {t.industry.detail.segmentList}
                    </h3>
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={expandAllSegments}
                        className="px-2 py-1 rounded-sm border border-white/10 text-mist-400 hover:border-glacier-500/40 hover:text-glacier-400 transition-colors"
                      >
                        {t.industry.detail.expandAll}
                      </button>
                      <button
                        onClick={collapseAllSegments}
                        className="px-2 py-1 rounded-sm border border-white/10 text-mist-400 hover:border-glacier-500/40 hover:text-glacier-400 transition-colors"
                      >
                        {t.industry.detail.collapseAll}
                      </button>
                    </div>
                  </div>

                  {data.segments.map((segment) => {
                    const isExpanded = expandedSegments.has(segment.id);
                    const segName = locale === 'zh' ? segment.name.zh : segment.name.en;
                    const segDesc = locale === 'zh' ? segment.description.zh : segment.description.en;
                    const themes = segment.themes
                      ? (locale === 'zh' ? segment.themes.zh : segment.themes.en)
                      : [];
                    const positionTag = positionLabel(segment.position);
                    const positionColor = segment.position ? POSITION_COLOR[segment.position] : null;

                    return (
                      <article
                        key={segment.id}
                        className="panel overflow-hidden transition-colors"
                        style={isDark ? darkPanelStyle : undefined}
                      >
                        {/* Card header (clickable) */}
                        <button
                          onClick={() => toggleSegment(segment.id)}
                          className="w-full text-left p-4 md:p-5 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-semibold" style={{ color: 'rgb(var(--c-fg))' }}>
                                {stripEmoji(segName)}
                              </h4>
                              {positionTag && positionColor && (
                                <span
                                  className="px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider"
                                  style={{
                                    color: positionColor,
                                    backgroundColor: positionColor + '20',
                                  }}
                                >
                                  {positionTag}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-mist-500">
                                {segment.companies.length} {t.industry.detail.companiesUnit}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {segment.totalMarketCap > 0 && (
                                <span className="text-xs font-mono" style={{ color: 'rgb(var(--c-text-1))' }}>
                                  {formatMarketCap(segment.totalMarketCap, locale)}
                                </span>
                              )}
                              {Number.isFinite(segment.avgGrowth) && segment.avgGrowth !== 0 && (
                                <span className={`text-xs font-mono ${segment.avgGrowth >= 0 ? 'text-growth' : 'text-decay'}`}>
                                  {segment.avgGrowth > 0 ? '+' : ''}{segment.avgGrowth}%
                                </span>
                              )}
                              <span className={`text-mist-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                            </div>
                          </div>
                          <p className="text-xs md:text-sm leading-relaxed" style={{ color: 'rgb(var(--c-text-2))' }}>
                            {stripEmoji(segDesc)}
                          </p>
                          {themes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {themes.map((theme, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-[10px] rounded-sm border border-white/10 text-mist-400"
                                  
                                >
                                  {stripEmoji(theme)}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>

                        {/* Expanded company table */}
                        {isExpanded && (
                          <div className="border-t" style={{ borderColor: 'var(--line)' }}>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr style={isDark ? darkTableHeaderStyle : undefined}>
                                    <th className="text-left px-4 md:px-5 py-2 text-mist-500 font-medium text-[10px] uppercase tracking-wider w-20">
                                      {t.industry.detail.companyTableCols.symbol}
                                    </th>
                                    <th className="text-left px-2 md:px-3 py-2 text-mist-500 font-medium text-[10px] uppercase tracking-wider">
                                      {t.industry.detail.companyTableCols.name}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {segment.companies.map((co) => (
                                    <tr
                                      key={co.symbol}
                                      className={`border-t cursor-pointer transition-colors hover:bg-white/5 ${loadingCompany === co.symbol ? 'opacity-60' : ''}`}
                                      style={{ borderColor: 'var(--line)' }}
                                      onClick={() => handleCompanyClick(co.symbol)}
                                    >
                                      <td className="px-4 md:px-5 py-3 font-mono text-xs text-glacier-500 whitespace-nowrap align-top">
                                        {stripEmoji(co.symbol)}
                                      </td>
                                      <td className="px-2 md:px-3 py-3">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs md:text-sm font-medium" style={{ color: 'rgb(var(--c-text-1))' }}>
                                            {stripEmoji(co.name)}
                                          </span>
                                          {co.note && (
                                            <span className="text-[11px] md:text-xs leading-relaxed" style={{ color: 'rgb(var(--c-text-2))' }}>
                                              {stripEmoji(locale === 'zh' ? co.note.zh : co.note.en)}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </section>
              </div>
            )}

            {/* Companies tab */}
            {activeTab === 'companies' && (
              <section className="panel overflow-hidden" style={isDark ? darkPanelStyle : undefined}>
                <div className="p-4 md:p-6 pb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--c-fg))' }}>
                    {t.industry.detail.companyTable}
                  </h3>
                  <p className="text-xs text-mist-500 mt-1">{t.industry.detail.companyTableDesc}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--line)', ...(isDark ? darkTableHeaderStyle : {}) }}>
                        <th className="text-left px-4 md:px-6 py-2 text-mist-500 font-medium text-[10px] uppercase tracking-wider w-20">
                          {t.industry.detail.companyTableCols.symbol}
                        </th>
                        <th className="text-left px-4 md:px-6 py-2 text-mist-500 font-medium text-[10px] uppercase tracking-wider">
                          {t.industry.detail.companyTableCols.name}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCompaniesFlat.map((c, idx) => (
                        <tr
                          key={c.symbol}
                          className="border-b cursor-pointer transition-colors hover:bg-white/5"
                          style={{
                            borderColor: 'var(--line)',
                            
                          }}
                          onClick={() => handleCompanyClick(c.symbol)}
                        >
                          <td className="px-4 md:px-6 py-3 font-mono text-xs text-glacier-500 align-top whitespace-nowrap">
                            {stripEmoji(c.symbol)}
                          </td>
                          <td className="px-4 md:px-6 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium" style={{ color: 'rgb(var(--c-text-1))' }}>{stripEmoji(c.name)}</span>
                              {c.note && (
                                <span className="text-[11px] md:text-xs leading-relaxed" style={{ color: 'rgb(var(--c-text-2))' }}>
                                  {stripEmoji(locale === 'zh' ? c.note.zh : c.note.en)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* News tab */}
            {activeTab === 'news' && (
              <section className="panel p-4 md:p-6" style={isDark ? darkPanelStyle : undefined}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--c-fg))' }}>
                  {t.industry.detail.news}
                </h3>
                {data.news.length === 0 ? (
                  <p className="text-sm text-mist-500 py-8 text-center">{t.industry.detail.noNews}</p>
                ) : (
                  <div className="space-y-3">
                    {data.news.map((n, idx) => (
                      <a
                        key={idx}
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-sm hover:bg-white/5 transition-colors"
                      >
                        <span
                          className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-medium ${n.sentiment === 'positive'
                              ? 'bg-growth/20 text-growth'
                              : n.sentiment === 'negative'
                                ? 'bg-decay/20 text-decay'
                                : 'bg-mist-500/10 text-mist-400'
                            }`}
                        >
                          {n.sentiment === 'positive'
                            ? t.industry.detail.newsPositive
                            : n.sentiment === 'negative'
                              ? t.industry.detail.newsNegative
                              : t.industry.detail.newsNeutral}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug" style={{ color: 'rgb(var(--c-text-1))' }}>
                            {stripEmoji(n.title)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-mist-500 font-mono">
                            <span>{stripEmoji(n.source)}</span>
                            <span>·</span>
                            <span>{new Date(n.date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        ) : null}
      </main>


      <CompanyOverviewModal
        company={selectedCompany}
        isOpen={showOverviewModal}
        onClose={handleCloseOverview}
        onCompanyChange={(newCompany) => setSelectedCompany(newCompany)}
      />
    </div>
  );
}

