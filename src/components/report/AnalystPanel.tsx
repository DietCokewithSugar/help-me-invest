'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { AnalystConsensus } from '@/types';

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 分析师一致预期：评级分布（水平堆叠条 + 计数表）、目标价区间、近期评级变动。
 * 颜色只用涨跌语义色与中性灰，不做装饰。
 */
export default function AnalystPanel({
  consensus,
  currentPrice,
}: {
  consensus: AnalystConsensus | null | undefined;
  currentPrice: number | null | undefined;
}) {
  const { t } = useLanguage();
  const o = t.report.overview;
  if (!consensus) return null;

  const latest = consensus.trend.find((row) => row.period === '0m') ?? consensus.trend[0];
  const buckets = latest
    ? [
        { key: 'strongBuy', label: o.strongBuy, count: latest.strongBuy, color: 'bg-up' },
        { key: 'buy', label: o.buy, count: latest.buy, color: 'bg-up/60' },
        { key: 'hold', label: o.hold, count: latest.hold, color: 'bg-text-4' },
        { key: 'sell', label: o.sell, count: latest.sell, color: 'bg-down/60' },
        { key: 'strongSell', label: o.strongSell, count: latest.strongSell, color: 'bg-down' },
      ]
    : [];
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  const price = isNum(currentPrice) ? currentPrice : consensus.currentPrice;
  const upside = isNum(consensus.targetMean) && isNum(price) && price > 0 ? (consensus.targetMean / price - 1) * 100 : null;

  const recommendationLabels: Record<string, string> = {
    strong_buy: o.strongBuy,
    buy: o.buy,
    hold: o.hold,
    underperform: o.underperform,
    sell: o.sell,
    strong_sell: o.strongSell,
  };
  const consensusLabel = consensus.recommendationKey ? recommendationLabels[consensus.recommendationKey] ?? consensus.recommendationKey : null;

  const hasTargets = isNum(consensus.targetLow) && isNum(consensus.targetHigh) && consensus.targetHigh > consensus.targetLow;
  const position = (value: number | null | undefined) =>
    hasTargets && isNum(value)
      ? Math.min(100, Math.max(0, ((value - consensus.targetLow!) / (consensus.targetHigh! - consensus.targetLow!)) * 100))
      : null;
  const pricePos = position(price);
  const meanPos = position(consensus.targetMean);

  if (total === 0 && !isNum(consensus.targetMean) && consensus.recentActions.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-title">{o.analyst}</span>
        {isNum(consensus.numberOfAnalysts) && (
          <span className="text-[12px] text-text-3">{o.analysts(consensus.numberOfAnalysts)}</span>
        )}
      </div>

      <div className="grid gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">
        {/* 一致评级 + 目标价 */}
        <div>
          <dl>
            <div className="kv-row">
              <dt className="kv-label">{o.consensus}</dt>
              <dd className="kv-value">{consensusLabel ?? '—'}</dd>
            </div>
            <div className="kv-row">
              <dt className="kv-label">{o.targetMean}</dt>
              <dd className="kv-value">{isNum(consensus.targetMean) ? consensus.targetMean.toFixed(2) : '—'}</dd>
            </div>
            <div className="kv-row">
              <dt className="kv-label">{o.upside}</dt>
              <dd className={`kv-value ${upside === null ? '' : upside >= 0 ? '!text-up' : '!text-down'}`}>
                {upside === null ? '—' : `${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%`}
              </dd>
            </div>
            <div className="kv-row">
              <dt className="kv-label">{o.targetRange}</dt>
              <dd className="kv-value">
                {hasTargets ? `${consensus.targetLow!.toFixed(2)} – ${consensus.targetHigh!.toFixed(2)}` : '—'}
              </dd>
            </div>
          </dl>
          {hasTargets && (
            <div className="mt-3">
              <div className="relative h-1.5 rounded-sm bg-raised ring-1 ring-inset ring-white/10">
                {meanPos !== null && (
                  <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-accent" style={{ left: `${meanPos}%` }} title={o.targetMean} />
                )}
                {pricePos !== null && (
                  <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-fg" style={{ left: `${pricePos}%` }} />
                )}
              </div>
              <div className="mt-1 flex justify-between font-mono text-[11px] text-text-3">
                <span>{consensus.targetLow!.toFixed(2)}</span>
                <span>{consensus.targetHigh!.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 评级分布 */}
        <div>
          {total > 0 ? (
            <>
              <div className="flex h-2 overflow-hidden rounded-sm">
                {buckets.map((b) =>
                  b.count > 0 ? (
                    <span key={b.key} className={b.color} style={{ width: `${(b.count / total) * 100}%` }} title={`${b.label} ${b.count}`} />
                  ) : null
                )}
              </div>
              <dl className="mt-2">
                {buckets.map((b) => (
                  <div key={b.key} className="kv-row !py-1.5">
                    <dt className="kv-label flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-sm ${b.color}`} />
                      {b.label}
                    </dt>
                    <dd className="kv-value">{b.count}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-[13px] text-text-3">—</p>
          )}
        </div>

        {/* 近期评级变动 */}
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <div className="label-caps mb-2">{o.recentActions}</div>
          {consensus.recentActions.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="!px-0">{o.date}</th>
                  <th>{o.firm}</th>
                  <th className="num !pr-0">{o.grade}</th>
                </tr>
              </thead>
              <tbody>
                {consensus.recentActions.slice(0, 5).map((action, index) => (
                  <tr key={`${action.date}-${action.firm}-${index}`}>
                    <td className="!px-0 font-mono text-text-3 whitespace-nowrap">{action.date.slice(5)}</td>
                    <td className="max-w-[120px] truncate">{action.firm}</td>
                    <td className="num !pr-0">{action.toGrade || action.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[13px] text-text-3">—</p>
          )}
        </div>
      </div>
    </section>
  );
}
