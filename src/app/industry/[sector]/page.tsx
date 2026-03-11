'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import CompanyOverviewModal from '@/components/CompanyOverviewModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMarketCap, type SupplyChainData, type SupplyChainNode } from '@/lib/industry-data';
import { stripEmoji } from '@/lib/text-utils';
import type { CompanyDiagnostic } from '@/types';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface CompanyInfo {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  change: number;
  revenueGrowth: number;
  industry: string;
  image: string;
}

interface DetailData {
  sector: string;
  companies: CompanyInfo[];
  supplyChain: SupplyChainData | null;
  totalMarketCap: number;
  avgGrowth: number;
  companyCount: number;
  topCompany: CompanyInfo | null;
  news: { title: string; url: string; date: string; source: string; sentiment: string }[];
}

type SortKey = 'marketCap' | 'revenueGrowth' | 'change';
type SortDir = 'asc' | 'desc';

const darkPanelStyle = {
  backgroundColor: '#121212',
  borderColor: 'rgba(255, 255, 255, 0.12)',
} as const;

const darkTableHeaderStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
} as const;

export default function IndustryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'chain' | 'companies' | 'news'>('chain');
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

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const sortedCompanies = useMemo(() => {
    if (!data) return [];
    const copy = [...data.companies];
    copy.sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const handleCompanySort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

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
        router.push(`/?symbol=${symbol}`);
      }
    } catch {
      router.push(`/?symbol=${symbol}`);
    } finally {
      setLoadingCompany(null);
    }
  };

  const handleCloseOverview = () => {
    setShowOverviewModal(false);
    setTimeout(() => setSelectedCompany(null), 300);
  };

  const scatterOption = useMemo(() => {
    if (!data || data.companies.length === 0) return {};

    return {
      backgroundColor: isDark ? '#121212' : 'transparent',
      color: ['#88ABDA', '#98B6C2', '#C0D09D', '#CB523E', '#DFD6B8'],
      grid: { top: 60, right: 30, bottom: 50, left: 60 },
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#121212' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontFamily: 'Inter', fontSize: 12 },
        formatter: (params: any) => {
          const d = params.data;
          if (!d) return '';
          return `<div style="font-family:Inter">
            <div style="font-weight:600">${stripEmoji(d[3])}</div>
            <div style="font-family:'JetBrains Mono';font-size:11px;color:${isDark ? '#94a3b8' : '#475569'}">${stripEmoji(d[4])}</div>
            <div style="font-family:'JetBrains Mono';font-size:11px;margin-top:4px">
              ${t.industry.detail.companyTableCols.marketCap}: ${formatMarketCap(d[0], locale)}<br/>
              ${t.industry.detail.companyTableCols.revenueGrowth}: <span style="color:${d[1] >= 0 ? '#10B981' : '#EF4444'}">${d[1] > 0 ? '+' : ''}${d[1]}%</span>
            </div>
          </div>`;
        },
      },
      xAxis: {
        type: 'log',
        name: t.industry.detail.scatterXAxis,
        nameTextStyle: { color: isDark ? '#64748b' : '#64748b', fontSize: 11 },
        axisLabel: {
          color: isDark ? '#64748b' : '#64748b',
          fontFamily: '"JetBrains Mono"',
          fontSize: 10,
          formatter: (v: number) => formatMarketCap(v, locale),
        },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } },
      },
      yAxis: {
        type: 'value',
        name: t.industry.detail.scatterYAxis,
        nameTextStyle: { color: isDark ? '#64748b' : '#64748b', fontSize: 11 },
        axisLabel: {
          color: isDark ? '#64748b' : '#64748b',
          fontFamily: '"JetBrains Mono"',
          fontSize: 10,
          formatter: (v: number) => `${v}%`,
        },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } },
      },
      visualMap: {
        show: false,
        dimension: 1,
        min: -20,
        max: 30,
        inRange: {
          color: ['#EF4444', '#F87171', '#94A3B8', '#6EE7B7', '#10B981'],
        },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (d: any) => Math.max(8, Math.min(30, Math.log10(d[0] / 1e8) * 6)),
          data: data.companies.map((c) => [c.marketCap, c.revenueGrowth, c.change, stripEmoji(c.name), stripEmoji(c.symbol)]),
          emphasis: {
            itemStyle: { borderColor: '#14b8a6', borderWidth: 2 },
          },
        },
        {
          type: 'line',
          markLine: {
            silent: true,
            lineStyle: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', type: 'dashed' },
            data: [{ yAxis: 0 }],
            label: { show: false },
          },
          data: [],
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 70,
          top: 10,
          style: {
            text: stripEmoji(t.industry.detail.highGrowth) + ' ←',
            fill: isDark ? '#64748b' : '#94a3b8',
            fontSize: 10,
            fontFamily: 'Inter',
          },
        },
        {
          type: 'text',
          right: 40,
          top: 10,
          style: {
            text: '→ ' + stripEmoji(t.industry.detail.pillar),
            fill: isDark ? '#64748b' : '#94a3b8',
            fontSize: 10,
            fontFamily: 'Inter',
          },
        },
      ],
    };
  }, [data, isDark, locale, t]);

  const hasPillarLabels = !!data?.supplyChain?.layerLabels;

  const layerLabels = useMemo(() => {
    const chain = data?.supplyChain;
    if (chain?.layerLabels) {
      const ll = chain.layerLabels;
      return {
        upstream: stripEmoji(locale === 'zh' ? ll.upstream.zh : ll.upstream.en),
        midstream: stripEmoji(locale === 'zh' ? ll.midstream.zh : ll.midstream.en),
        downstream: stripEmoji(locale === 'zh' ? ll.downstream.zh : ll.downstream.en),
      };
    }
    return {
      upstream: stripEmoji(t.industry.detail.upstream),
      midstream: stripEmoji(t.industry.detail.midstream),
      downstream: stripEmoji(t.industry.detail.downstream),
    };
  }, [data, locale, t]);

  const supplyChainFlowOption = useMemo(() => {
    if (!data?.supplyChain) return {};
    const chain = data.supplyChain;

    const nodes: { name: string; itemStyle?: any }[] = [];
    const links: { source: string; target: string; value: number }[] = [];

    const upLabel = layerLabels.upstream;
    const midLabel = layerLabels.midstream;
    const downLabel = layerLabels.downstream;

    nodes.push({ name: upLabel, itemStyle: { color: '#88ABDA' } });
    nodes.push({ name: midLabel, itemStyle: { color: '#C0D09D' } });
    nodes.push({ name: downLabel, itemStyle: { color: '#CB523E' } });

    const nodeName = (node: SupplyChainNode) => stripEmoji(locale === 'zh' ? node.name.zh : node.name.en);

    for (const node of chain.upstream) {
      const nm = nodeName(node);
      nodes.push({ name: nm, itemStyle: { color: '#98B6C2' } });
      links.push({ source: nm, target: midLabel, value: node.companies.length * 2 });
    }
    for (const node of chain.midstream) {
      const nm = nodeName(node);
      nodes.push({ name: nm, itemStyle: { color: '#DFD6B8' } });
      links.push({ source: upLabel, target: nm, value: node.companies.length * 2 });
      links.push({ source: nm, target: downLabel, value: node.companies.length * 2 });
    }
    for (const node of chain.downstream) {
      const nm = nodeName(node);
      nodes.push({ name: nm, itemStyle: { color: '#EAE4D1' } });
      links.push({ source: midLabel, target: nm, value: node.companies.length * 2 });
    }

    return {
      backgroundColor: isDark ? '#121212' : 'transparent',
      color: ['#88ABDA', '#98B6C2', '#C0D09D', '#CB523E', '#DFD6B8', '#EAE4D1'],
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#121212' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontFamily: 'Inter', fontSize: 12 },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          nodeGap: 14,
          nodeWidth: 20,
          lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.3 },
          label: {
            color: isDark ? '#e2e8f0' : '#1e293b',
            fontFamily: 'Inter',
            fontSize: 11,
          },
          data: nodes,
          links,
        },
      ],
    };
  }, [data, isDark, locale, layerLabels]);

  const Sparkline = ({ growth }: { growth: number }) => {
    const points = useMemo(() => {
      const pts: number[] = [];
      let val = 100;
      for (let i = 0; i < 12; i++) {
        val += val * (growth / 100 / 12) + (Math.random() - 0.5) * 3;
        pts.push(val);
      }
      return pts;
    }, [growth]);

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 60;
    const h = 20;
    const path = points
      .map((v, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

    const color = growth >= 0 ? '#10B981' : '#EF4444';
    return (
      <svg width={w} height={h} className="inline-block">
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  };

  const shareTag = (share: 'large' | 'medium' | 'small') => {
    const labels = {
      large: t.industry.detail.marketShareLarge,
      medium: t.industry.detail.marketShareMedium,
      small: t.industry.detail.marketShareSmall,
    };
    const cls = {
      large: 'bg-glacier-500/20 text-glacier-500',
      medium: 'bg-yellow-500/20 text-yellow-500',
      small: 'bg-mist-500/20 text-mist-400',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-medium ${cls[share]}`}>
        {labels[share]}
      </span>
    );
  };

  const companyTag = (c: CompanyInfo) => {
    if (c.marketCap > 1e11 && c.revenueGrowth >= 10) return t.industry.detail.pillar;
    if (c.revenueGrowth >= 15) return t.industry.detail.highGrowth;
    if (c.marketCap < 5e10 && c.revenueGrowth >= 5) return t.industry.detail.emerging;
    return t.industry.detail.mature;
  };

  const companyTagColor = (c: CompanyInfo) => {
    if (c.marketCap > 1e11 && c.revenueGrowth >= 10) return 'text-glacier-500 bg-glacier-500/10';
    if (c.revenueGrowth >= 15) return 'text-growth bg-growth/10';
    if (c.marketCap < 5e10 && c.revenueGrowth >= 5) return 'text-blue-400 bg-blue-500/10';
    return 'text-mist-400 bg-mist-500/10';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-obsidian)' }}>
      <Header theme={theme} toggleTheme={toggleTheme} showContactModal={() => setShowContactModal(true)} />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-28 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href="/industry" className="text-glacier-500 hover:text-glacier-400 transition-colors">
            {t.industry.detail.backToOverview}
          </Link>
          <span className="text-mist-500">/</span>
          <span style={{ color: 'var(--text-primary)' }}>{sectorName}</span>
        </div>

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
              {[
                { label: t.industry.detail.totalMarketCap, value: formatMarketCap(data.totalMarketCap, locale) },
                { label: t.industry.detail.companyCount, value: String(data.companyCount) },
                { label: t.industry.detail.avgGrowth, value: `${data.avgGrowth > 0 ? '+' : ''}${data.avgGrowth}%`, color: data.avgGrowth >= 0 ? 'text-growth' : 'text-decay' },
                { label: t.industry.detail.topCompany, value: stripEmoji(data.topCompany?.symbol || '-') },
              ].map((stat) => (
                <div key={stat.label} className="gemini-card p-4 transition-colors hover:border-white/20" style={isDark ? darkPanelStyle : undefined}>
                  <div className="text-xs text-mist-500 mb-1">{stat.label}</div>
                  <div className={`text-lg font-mono font-semibold ${stat.color || ''}`} style={stat.color ? undefined : { color: 'var(--text-heading)' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-md w-fit border" style={isDark ? darkPanelStyle : { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              {(['chain', 'companies', 'news'] as const).map((tab) => {
                const labels = {
                  chain: hasPillarLabels ? t.industry.detail.supplyChainPillar : t.industry.detail.supplyChain,
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

            {/* Tab Content */}
            {activeTab === 'chain' && (
              <div className="space-y-6">
                {/* Sankey Flow */}
                {data.supplyChain && (
                  <section className="gemini-card p-4 md:p-6" style={isDark ? darkPanelStyle : undefined}>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
                      {hasPillarLabels ? t.industry.detail.supplyChainPillar : t.industry.detail.supplyChain}
                    </h3>
                    <p className="text-xs text-mist-500 mb-4">
                      {hasPillarLabels ? t.industry.detail.supplyChainDescPillar : t.industry.detail.supplyChainDesc}
                    </p>
                    <div
                      className="rounded-sm p-2"
                      style={{
                        minHeight: hasPillarLabels ? 480 : 320,
                        backgroundColor: isDark ? '#121212' : 'transparent',
                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : undefined,
                      }}
                    >
                      <ReactECharts
                        option={supplyChainFlowOption}
                        style={{ width: '100%', height: hasPillarLabels ? 480 : 320 }}
                        opts={{ renderer: 'canvas' }}
                        notMerge
                      />
                    </div>
                  </section>
                )}

                {/* Tree Table */}
                {data.supplyChain && (
                  <section className="gemini-card overflow-hidden" style={isDark ? darkPanelStyle : undefined}>
                    <div className="p-4 md:p-6 pb-0">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                        {hasPillarLabels ? t.industry.detail.pillarCompanies : t.industry.detail.nodeCompanies}
                      </h3>
                    </div>
                    <div className="p-4 md:p-6 space-y-2">
                      {(['upstream', 'midstream', 'downstream'] as const).map((layer) => {
                        const layerLabel = layerLabels[layer];
                        const nodes = data.supplyChain![layer];
                        return (
                          <div key={layer}>
                            <div className="text-xs font-semibold text-mist-500 uppercase tracking-wider mb-2">
                              {layerLabel}
                            </div>
                            {nodes.map((node) => {
                              const isExpanded = expandedNodes.has(node.id);
                              const nm = stripEmoji(locale === 'zh' ? node.name.zh : node.name.en);
                              return (
                                <div key={node.id} className="mb-1">
                                  <button
                                    onClick={() => toggleNode(node.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-white/5 transition-colors text-left border border-transparent hover:border-white/10"
                                    style={isDark ? { backgroundColor: 'rgba(255,255,255,0.015)' } : undefined}
                                  >
                                    <span className={`text-[10px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{nm}</span>
                                    <span className="text-[10px] text-mist-500 font-mono ml-auto">{node.companies.length}</span>
                                  </button>
                                  {isExpanded && (
                                    <div className="ml-6 border-l pl-3 py-1 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
                                      {node.companies.map((co) => (
                                        <div
                                          key={co.symbol}
                                          className={`flex items-center gap-3 px-2 py-1 hover:bg-white/5 rounded-sm transition-colors cursor-pointer ${loadingCompany === co.symbol ? 'opacity-60' : ''}`}
                                          onClick={() => handleCompanyClick(co.symbol)}
                                        >
                                          <span className="text-xs font-mono text-glacier-500 w-14">{stripEmoji(co.symbol)}</span>
                                          <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{stripEmoji(co.name)}</span>
                                          {loadingCompany === co.symbol ? (
                                            <span className="w-3 h-3 border border-glacier-500 border-t-transparent rounded-full animate-spin" />
                                          ) : shareTag(co.share)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeTab === 'companies' && (
              <div className="space-y-6">
                {/* Scatter Plot */}
                <section className="gemini-card p-4 md:p-6" style={isDark ? darkPanelStyle : undefined}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
                    {t.industry.detail.scatterTitle}
                  </h3>
                  <div
                    className="rounded-sm p-2"
                    style={{
                      minHeight: 380,
                      backgroundColor: isDark ? '#121212' : 'transparent',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : undefined,
                    }}
                  >
                    <ReactECharts
                      option={scatterOption}
                      style={{ width: '100%', height: 380 }}
                      opts={{ renderer: 'canvas' }}
                      notMerge
                    />
                  </div>
                </section>

                {/* Company Table with Sparklines */}
                <section className="gemini-card overflow-hidden" style={isDark ? darkPanelStyle : undefined}>
                  <div className="p-4 md:p-6 pb-0">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                      {t.industry.detail.companyTable}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border-color)', ...(isDark ? darkTableHeaderStyle : {}) }}>
                          <th className="text-left px-4 md:px-6 py-3 text-mist-400 font-medium text-xs">
                            {t.industry.detail.companyTableCols.name}
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-mist-400 font-medium text-xs hidden md:table-cell">
                            {t.industry.detail.companyTableCols.symbol}
                          </th>
                          <ThSort label={t.industry.detail.companyTableCols.marketCap} k="marketCap" current={sortKey} dir={sortDir} onSort={handleCompanySort} />
                          <ThSort label={t.industry.detail.companyTableCols.revenueGrowth} k="revenueGrowth" current={sortKey} dir={sortDir} onSort={handleCompanySort} />
                          <th className="text-center px-4 py-3 text-mist-400 font-medium text-xs hidden lg:table-cell">
                            {t.industry.detail.companyTableCols.trend}
                          </th>
                          <th className="text-left px-4 py-3 text-mist-400 font-medium text-xs">
                            {t.industry.detail.companyTableCols.tag}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCompanies.map((c, idx) => (
                          <tr
                            key={c.symbol}
                            className="border-b cursor-pointer transition-colors hover:bg-white/5"
                            style={{
                              borderColor: 'var(--border-color)',
                              backgroundColor: isDark && idx % 2 === 1 ? 'rgba(255,255,255,0.012)' : undefined,
                            }}
                            onClick={() => handleCompanyClick(c.symbol)}
                          >
                            <td className="px-4 md:px-6 py-3">
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{stripEmoji(c.name)}</span>
                            </td>
                            <td className="px-4 md:px-6 py-3 font-mono text-xs text-glacier-500 hidden md:table-cell">
                              {stripEmoji(c.symbol)}
                            </td>
                            <td className="px-4 md:px-6 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                              {formatMarketCap(c.marketCap, locale)}
                            </td>
                            <td className="px-4 md:px-6 py-3 font-mono text-xs">
                              <span className={c.revenueGrowth >= 0 ? 'text-growth' : 'text-decay'}>
                                {c.revenueGrowth > 0 ? '+' : ''}{c.revenueGrowth}%
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-center">
                              <Sparkline growth={c.revenueGrowth} />
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-sm text-[10px] font-medium ${companyTagColor(c)}`}>
                                {stripEmoji(companyTag(c))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'news' && (
              <section className="gemini-card p-4 md:p-6" style={isDark ? darkPanelStyle : undefined}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
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
                          <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
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

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title={t.home.contact.title}
        scanQr={t.home.contact.scanQr}
        lookForward={t.home.contact.lookForward}
        wechatLabel={t.home.faq.wechat}
        emailLabel={t.home.faq.email}
      />

      <CompanyOverviewModal
        company={selectedCompany}
        isOpen={showOverviewModal}
        onClose={handleCloseOverview}
        onCompanyChange={(newCompany) => setSelectedCompany(newCompany)}
      />
    </div>
  );
}

function ThSort({
  label, k, current, dir, onSort,
}: {
  label: string; k: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === k;
  return (
    <th
      className="text-left px-4 md:px-6 py-3 text-mist-400 font-medium text-xs cursor-pointer select-none hover:text-glacier-400 transition-colors whitespace-nowrap"
      onClick={() => onSort(k)}
    >
      {label}
      <span className={`ml-1 inline-block ${active ? 'text-glacier-500' : 'text-mist-600'}`}>
        {active && dir === 'asc' ? '↑' : '↓'}
      </span>
    </th>
  );
}
