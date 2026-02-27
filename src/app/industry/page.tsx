'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrendColor } from '@/lib/industry-data';
import { stripEmoji } from '@/lib/text-utils';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface SectorData {
  sector: string;
  marketCapWeight: number;
  change1D: number;
  cagr3y: number;
  trend: string;
  sentiment: number;
  pe: number | null;
  leadingCompany: { symbol: string; name: string };
}

type SortKey = 'marketCapWeight' | 'cagr3y' | 'sentiment' | 'change1D';
type SortDir = 'asc' | 'desc';

const darkPanelStyle = {
  backgroundColor: '#121212',
  borderColor: 'rgba(255, 255, 255, 0.12)',
} as const;

const darkTableHeaderStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
} as const;

export default function IndustryPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('marketCapWeight');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showContactModal, setShowContactModal] = useState(false);
  const isDark = theme === 'dark';

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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/industry/overview');
      const json = await res.json();
      if (json.success && json.data) {
        setSectors(json.data);
      } else {
        setError(json.error || t.industry.error);
      }
    } catch {
      setError(t.industry.error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sectorName = useCallback(
    (sector: string) => {
      const sectorMap = t.sectors as Record<string, string>;
      return stripEmoji(sectorMap[sector] || sector);
    },
    [t]
  );

  const trendLabel = useCallback(
    (trend: string) => {
      const labels = t.industry.trendLabels as Record<string, string>;
      return labels[trend] || trend;
    },
    [t]
  );

  const sentimentLabel = useCallback(
    (score: number) => {
      const labels = t.industry.sentimentLabels;
      if (score >= 80) return labels.veryBullish;
      if (score >= 60) return labels.bullish;
      if (score >= 40) return labels.neutral;
      if (score >= 20) return labels.bearish;
      return labels.veryBearish;
    },
    [t]
  );

  const treemapOption = useMemo(() => {
    if (sectors.length === 0) return {};
    const isDark = theme === 'dark';
    return {
      backgroundColor: isDark ? '#121212' : 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#121212' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontFamily: 'Inter' },
        formatter: (params: any) => {
          const d = params.data;
          if (!d || !d.sectorData) return '';
          const sd = d.sectorData as SectorData;
          return `<div style="font-family:Inter;min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${sectorName(sd.sector)}</div>
            <div style="font-family:'JetBrains Mono';font-size:12px;display:flex;justify-content:space-between;gap:12px">
              <span style="opacity:0.6">${t.industry.treemapTooltipCap}</span>
              <span>${sd.marketCapWeight}%</span>
            </div>
            <div style="font-family:'JetBrains Mono';font-size:12px;display:flex;justify-content:space-between;gap:12px">
              <span style="opacity:0.6">${t.industry.treemapTooltipCagr}</span>
              <span style="color:${sd.cagr3y >= 0 ? '#10B981' : '#EF4444'}">${sd.cagr3y > 0 ? '+' : ''}${sd.cagr3y}%</span>
            </div>
            <div style="font-family:'JetBrains Mono';font-size:12px;display:flex;justify-content:space-between;gap:12px">
              <span style="opacity:0.6">${t.industry.treemapTooltipSentiment}</span>
              <span>${sentimentLabel(sd.sentiment)}</span>
            </div>
          </div>`;
        },
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          itemStyle: {
            borderColor: isDark ? '#0A0A0B' : '#F8FAFC',
            borderWidth: 2,
            gapWidth: 2,
          },
          label: {
            show: true,
            formatter: (params: any) => {
              const sd = params.data?.sectorData;
              if (!sd) return '';
              return `{name|${sectorName(sd.sector)}}\n{val|${sd.marketCapWeight}%}`;
            },
            rich: {
              name: {
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Inter',
                color: '#fff',
                lineHeight: 20,
              },
              val: {
                fontSize: 11,
                fontFamily: '"JetBrains Mono"',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 16,
              },
            },
          },
          data: sectors.map((sd) => ({
            name: sd.sector,
            value: sd.marketCapWeight,
            sectorData: sd,
            itemStyle: {
              color: getTrendColor(sd.trend, theme),
            },
          })),
        },
      ],
    };
  }, [sectors, theme, sectorName, sentimentLabel, t]);

  const sortedSectors = useMemo(() => {
    const copy = [...sectors];
    copy.sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortDir === 'desc' ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
    return copy;
  }, [sectors, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleTreemapClick = (params: any) => {
    const sd = params.data?.sectorData;
    if (sd?.sector) {
      router.push(`/industry/${encodeURIComponent(sd.sector)}`);
    }
  };

  const handleRowClick = (sector: string) => {
    router.push(`/industry/${encodeURIComponent(sector)}`);
  };

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
    <span className={`ml-1 inline-block transition-colors ${active ? 'text-glacier-500' : 'text-mist-600'}`}>
      {active && dir === 'asc' ? '↑' : '↓'}
    </span>
  );

  const trendBadgeClass = (trend: string) => {
    const base = 'px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium';
    switch (trend) {
      case 'fastGrowth':
        return `${base} bg-growth/20 text-growth`;
      case 'slowGrowth':
        return `${base} bg-emerald-500/10 text-emerald-400`;
      case 'stagnant':
        return `${base} bg-mist-500/10 text-mist-400`;
      case 'decline':
        return `${base} bg-orange-500/10 text-orange-400`;
      case 'severeDecline':
        return `${base} bg-decay/20 text-decay`;
      default:
        return `${base} bg-mist-500/10 text-mist-400`;
    }
  };

  const sentimentBarColor = (score: number) => {
    if (score >= 60) return 'bg-growth';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-decay';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-obsidian)' }}>
      <Header theme={theme} toggleTheme={toggleTheme} showContactModal={() => setShowContactModal(true)} />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-28 pb-16">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-heading)' }}>
            {t.industry.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t.industry.subtitle}
          </p>
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
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm rounded-md border border-white/10 text-mist-300 hover:border-glacier-500/50 transition-colors"
            >
              {t.industry.retry}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Treemap */}
            <section className="gemini-card p-4 md:p-6">
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
                {t.industry.treemapTitle}
              </h2>
              <div className="w-full" style={{ minHeight: 400 }}>
                <ReactECharts
                  option={treemapOption}
                  style={{ width: '100%', height: 420 }}
                  onEvents={{ click: handleTreemapClick }}
                  opts={{ renderer: 'canvas' }}
                  notMerge
                />
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-mist-400">
                {['fastGrowth', 'slowGrowth', 'stagnant', 'decline', 'severeDecline'].map((tr) => (
                  <div key={tr} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: getTrendColor(tr, theme) }}
                    />
                    <span>{trendLabel(tr)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Grid */}
            <section className="gemini-card overflow-hidden" style={isDark ? darkPanelStyle : undefined}>
              <div className="p-4 md:p-6 pb-0">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {t.industry.rankingTitle}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)', ...(isDark ? darkTableHeaderStyle : {}) }}>
                      <th className="text-left px-4 md:px-6 py-3 text-mist-400 font-medium text-xs">
                        {t.industry.rankingCols.sector}
                      </th>
                      <ThSortable
                        label={t.industry.rankingCols.marketCapWeight}
                        sortKey="marketCapWeight"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                      <ThSortable
                        label={t.industry.rankingCols.cagr3y}
                        sortKey="cagr3y"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                      <ThSortable
                        label={t.industry.rankingCols.sentiment}
                        sortKey="sentiment"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                      <th className="text-left px-4 md:px-6 py-3 text-mist-400 font-medium text-xs hidden md:table-cell">
                        {t.industry.rankingCols.leadingCompany}
                      </th>
                      <th className="text-left px-4 md:px-6 py-3 text-mist-400 font-medium text-xs">
                        {t.industry.rankingCols.trend}
                      </th>
                      <th className="text-right px-4 md:px-6 py-3 text-mist-400 font-medium text-xs w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSectors.map((sd, idx) => (
                      <tr
                        key={sd.sector}
                        className="border-b cursor-pointer transition-colors hover:bg-white/5"
                        style={{
                          borderColor: 'var(--border-color)',
                          backgroundColor: isDark && idx % 2 === 1 ? 'rgba(255,255,255,0.012)' : undefined,
                        }}
                        onClick={() => handleRowClick(sd.sector)}
                      >
                        <td className="px-4 md:px-6 py-3">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {sectorName(sd.sector)}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                          {sd.marketCapWeight}%
                        </td>
                        <td className="px-4 md:px-6 py-3 font-mono text-xs">
                          <span className={sd.cagr3y >= 0 ? 'text-growth' : 'text-decay'}>
                            {sd.cagr3y > 0 ? '+' : ''}
                            {sd.cagr3y}%
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${sentimentBarColor(sd.sentiment)}`}
                                style={{ width: `${sd.sentiment}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-mist-400 w-8">{sd.sentiment}</span>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 hidden md:table-cell">
                          <span className="text-xs font-mono text-glacier-500">
                            {stripEmoji(sd.leadingCompany.symbol)}
                          </span>
                          <span className="text-xs text-mist-500 ml-1.5">{stripEmoji(sd.leadingCompany.name)}</span>
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <span className={trendBadgeClass(sd.trend)}>{trendLabel(sd.trend)}</span>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-right">
                          <span className="text-xs text-glacier-500 hover:text-glacier-400">
                            {t.industry.viewDetail} →
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
      </main>

      {showContactModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowContactModal(false)}>
          <div className="p-6 rounded-md max-w-sm text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>{t.home.contact.title}</h3>
            <p className="text-sm text-mist-400">{t.home.contact.lookForward}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ThSortable({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className="text-left px-4 md:px-6 py-3 text-mist-400 font-medium text-xs cursor-pointer select-none hover:text-glacier-400 transition-colors whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className={`ml-1 inline-block transition-colors ${active ? 'text-glacier-500' : 'text-mist-600'}`}>
        {active && dir === 'asc' ? '↑' : '↓'}
      </span>
    </th>
  );
}
