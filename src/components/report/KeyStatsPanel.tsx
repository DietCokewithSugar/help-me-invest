'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-number';
import type { KeyStatistics } from '@/types';

type Num = number | null | undefined;

function isNum(value: Num): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 关键统计：两列键值表，标签左对齐、数值右对齐并使用等宽数字，
 * 缺失值统一显示「—」，保证每行高度与基线一致。
 */
export default function KeyStatsPanel({
  stats,
  quote,
  marketCap,
}: {
  stats: KeyStatistics | null | undefined;
  quote: Record<string, any> | null | undefined;
  marketCap: Num;
}) {
  const { t, locale } = useLanguage();
  const o = t.report.overview;
  const unitMode = locale === 'zh' ? 'zh' : 'en';

  const fixed = (value: Num, digits = 2) => (isNum(value) ? value.toFixed(digits) : '—');
  const compact = (value: Num) => (isNum(value) ? formatNumber(value, unitMode) : '—');
  const percent = (value: Num) => (isNum(value) ? `${(value * 100).toFixed(2)}%` : '—');
  const range = (low: Num, high: Num) => (isNum(low) && isNum(high) ? `${low.toFixed(2)} – ${high.toFixed(2)}` : '—');

  const rows: Array<[string, string]> = [
    [t.common.marketCap, compact(marketCap)],
    [o.peTTM, fixed(stats?.trailingPE ?? quote?.pe)],
    [o.forwardPE, fixed(stats?.forwardPE)],
    [o.epsTTM, fixed(stats?.trailingEps ?? quote?.eps)],
    [o.priceToBook, fixed(stats?.priceToBook)],
    [o.evEbitda, fixed(stats?.enterpriseToEbitda)],
    [o.dividendYield, percent(stats?.dividendYield)],
    [o.beta, fixed(stats?.beta)],
    [o.previousClose, fixed(quote?.previousClose)],
    [o.dayRange, range(quote?.dayLow, quote?.dayHigh)],
    [o.range52w, range(stats?.fiftyTwoWeekLow ?? quote?.yearLow, stats?.fiftyTwoWeekHigh ?? quote?.yearHigh)],
    [o.volume, compact(quote?.volume)],
    [o.avgVolume, compact(stats?.averageVolume ?? quote?.avgVolume)],
    [o.sharesOutstanding, compact(stats?.sharesOutstanding ?? quote?.sharesOutstanding)],
    [o.institutions, percent(stats?.heldPercentInstitutions)],
    [o.insiders, percent(stats?.heldPercentInsiders)],
    [o.shortFloat, percent(stats?.shortPercentOfFloat)],
    [o.nextEarnings, stats?.nextEarningsDate || '—'],
  ];

  // 全部缺失的行没有信息量，直接省略
  const visible = rows.filter(([, value]) => value !== '—');
  if (visible.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-title">{o.keyStats}</span>
      </div>
      <dl className="grid grid-cols-1 px-4 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-1">
        {visible.map(([label, value]) => (
          <div key={label} className="kv-row">
            <dt className="kv-label">{label}</dt>
            <dd className="kv-value">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
