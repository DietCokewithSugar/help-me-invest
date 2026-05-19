'use client';

import { useLanguage } from '@/contexts/LanguageContext';

// ─── types ──────────────────────────────────────────────────────────────────

export interface AllocationItem {
  name: string;
  category?: string;
  percentage: number;
  amount: number;
  ticker?: string;
  productName?: string;
  rationale: string;
  riskLevel: number;
  expectedReturn?: number;
  risks: string[];
  color: string;
}

export interface MarketContextItem {
  title: string;
  body: string;
  impact?: 'positive' | 'neutral' | 'negative';
}

export interface ExecutionPhase {
  phase: string;
  timeframe?: string;
  actions: string[];
}

export interface PortfolioRisk {
  name: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export interface AssetAllocationReportData {
  strategy?: { name?: string; summary?: string; targetReturn?: string; horizon?: string };
  allocation: AllocationItem[];
  marketContext?: MarketContextItem[];
  executionPlan?: ExecutionPhase[];
  portfolioRisks?: PortfolioRisk[];
}

interface Props {
  report: AssetAllocationReportData;
  currency?: string;
}

// ─── presentational helpers ────────────────────────────────────────────────

function Section({ kicker, title, children }: { kicker: string; title?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/10 pt-8 mt-8 first:border-t-0 first:pt-0 first:mt-0">
      <div className="mb-5">
        <div className="mono-kicker">{kicker}</div>
        {title ? (
          <h2 className="font-serif text-2xl md:text-3xl mt-2 leading-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RiskLevelBar({ level }: { level: number }) {
  const clamped = Math.max(1, Math.min(10, Math.round(level || 0)));
  const tone = clamped <= 3 ? 'bg-growth' : clamped <= 6 ? 'bg-glacier-500' : 'bg-decay';
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`block w-1.5 h-3 rounded-[1px] ${i < clamped ? tone : 'bg-white/10'}`}
          />
        ))}
      </div>
      <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {clamped}/10
      </span>
    </div>
  );
}

function ImpactBadge({ impact, labels }: { impact?: string; labels: { positive: string; neutral: string; negative: string } }) {
  if (!impact) return null;
  const map: Record<string, { tone: string; label: string }> = {
    positive: { tone: 'bg-growth/15 text-growth border-growth/30', label: labels.positive },
    neutral: { tone: 'bg-white/5 text-mist-300 border-white/15', label: labels.neutral },
    negative: { tone: 'bg-decay/15 text-decay border-decay/30', label: labels.negative },
  };
  const v = map[impact] ?? map.neutral;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill border text-[10px] font-mono uppercase tracking-[0.1em] ${v.tone}`}>
      {v.label}
    </span>
  );
}

function LevelBadge({ level, labels }: { level: 'low' | 'medium' | 'high'; labels: { low: string; medium: string; high: string } }) {
  const map = {
    low: { tone: 'bg-growth/15 text-growth border-growth/30', label: labels.low },
    medium: { tone: 'bg-glacier-500/15 text-glacier-500 border-glacier-500/30', label: labels.medium },
    high: { tone: 'bg-decay/15 text-decay border-decay/30', label: labels.high },
  };
  const v = map[level] ?? map.medium;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill border text-[10px] font-mono uppercase tracking-[0.1em] ${v.tone}`}>
      {v.label}
    </span>
  );
}

function formatAmount(amount: number, currency: string, isZh: boolean) {
  const n = Number.isFinite(amount) ? amount : 0;
  const unit = currency === 'CNY' ? (isZh ? '万元' : 'k CNY') : (isZh ? '万美元' : 'k USD');
  const value = isZh ? n.toLocaleString('zh-CN', { maximumFractionDigits: 1 }) : (n * 10).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${value} ${unit}`;
}

// ─── main component ────────────────────────────────────────────────────────

export default function AssetAllocationReport({ report, currency = 'CNY' }: Props) {
  const { t, locale } = useLanguage();
  const isZh = locale === 'zh';
  const r = t.assetAllocation.report;

  if (!report?.allocation?.length) return null;

  const totalPercentage = report.allocation.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);

  return (
    <div className="space-y-0">
      {/* ── STRATEGY ── */}
      {(report.strategy?.name || report.strategy?.summary) && (
        <Section kicker={r.strategyKicker} title={report.strategy?.name}>
          {report.strategy?.summary && (
            <p className="text-base leading-relaxed font-serif" style={{ color: 'var(--text-secondary)' }}>
              {report.strategy.summary}
            </p>
          )}
          {(report.strategy?.targetReturn || report.strategy?.horizon) && (
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 max-w-md">
              {report.strategy?.targetReturn && (
                <>
                  <dt className="mono-kicker self-center">{r.targetReturn}</dt>
                  <dd className="font-mono text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{report.strategy.targetReturn}</dd>
                </>
              )}
              {report.strategy?.horizon && (
                <>
                  <dt className="mono-kicker self-center">{r.horizon}</dt>
                  <dd className="font-mono text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{report.strategy.horizon}</dd>
                </>
              )}
            </dl>
          )}
        </Section>
      )}

      {/* ── ALLOCATION ── */}
      <Section kicker={r.allocationKicker} title={r.allocationTitle}>
        <div className="space-y-3">
          {report.allocation.map((item, idx) => (
            <article
              key={`${item.name}-${idx}`}
              className="rounded-md border border-white/10 bg-white/[0.02] p-5"
            >
              {/* Top row: indicator · name · ticker · % · amount */}
              <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-3">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm self-center shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <h3 className="font-serif text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {item.name}
                </h3>
                {item.ticker && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-sm border border-white/15 text-mist-300 uppercase tracking-[0.06em]">
                    {item.ticker}
                  </span>
                )}
                {item.category && (
                  <span className="mono-kicker">{item.category}</span>
                )}
                <span className="ml-auto flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {Number(item.percentage).toFixed(0)}%
                  </span>
                  <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {formatAmount(item.amount, currency, isZh)}
                  </span>
                </span>
              </header>

              {item.productName && (
                <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted, #9D937C)' }}>
                  {item.productName}
                </p>
              )}

              {/* Two-column: rationale | risk */}
              <div className="grid md:grid-cols-[1fr_220px] gap-x-8 gap-y-4">
                <div>
                  <div className="mono-kicker mb-1.5">{r.rationale}</div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {item.rationale}
                  </p>
                </div>
                <div>
                  <div className="mono-kicker mb-1.5">{r.riskLevel}</div>
                  <RiskLevelBar level={item.riskLevel} />
                  {typeof item.expectedReturn === 'number' && item.expectedReturn > 0 && (
                    <div className="mt-3">
                      <div className="mono-kicker mb-1.5">{r.expectedReturn}</div>
                      <div className="font-mono text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {item.expectedReturn.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {item.risks?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="mono-kicker mb-2">{r.keyRisks}</div>
                  <ul className="space-y-1.5">
                    {item.risks.map((risk, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-mono text-xs tabular-nums shrink-0 mt-1 text-mist-500">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 px-1">
          <span className="mono-kicker">{r.total}</span>
          <span className="font-mono text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {totalPercentage.toFixed(0)}%
          </span>
        </div>
      </Section>

      {/* ── MARKET CONTEXT ── */}
      {report.marketContext && report.marketContext.length > 0 && (
        <Section kicker={r.marketKicker} title={r.marketTitle}>
          <div className="grid md:grid-cols-2 gap-3">
            {report.marketContext.map((ctx, i) => (
              <div key={i} className="rounded-md border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-serif text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {ctx.title}
                  </h4>
                  <ImpactBadge impact={ctx.impact} labels={r.impact} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {ctx.body}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── EXECUTION PLAN ── */}
      {report.executionPlan && report.executionPlan.length > 0 && (
        <Section kicker={r.executionKicker} title={r.executionTitle}>
          <ol className="space-y-3">
            {report.executionPlan.map((phase, i) => (
              <li key={i} className="grid grid-cols-[40px_1fr] gap-4">
                <div className="font-mono text-xs tabular-nums pt-0.5 text-mist-500">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <h4 className="font-serif text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {phase.phase}
                    </h4>
                    {phase.timeframe && (
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-mist-400">
                        {phase.timeframe}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {phase.actions.map((action, j) => (
                      <li key={j} className="text-sm leading-relaxed flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span className="text-mist-500 select-none">·</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ── PORTFOLIO-LEVEL RISKS ── */}
      {report.portfolioRisks && report.portfolioRisks.length > 0 && (
        <Section kicker={r.portfolioRisksKicker} title={r.portfolioRisksTitle}>
          <div className="space-y-3">
            {report.portfolioRisks.map((risk, i) => (
              <div key={i} className="rounded-md border border-white/10 bg-white/[0.02] p-4">
                <header className="flex items-center justify-between gap-3 mb-2">
                  <h4 className="font-serif text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {risk.name}
                  </h4>
                  <LevelBadge level={risk.level} labels={r.levels} />
                </header>
                <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {risk.description}
                </p>
                <div className="grid grid-cols-[80px_1fr] gap-3 pt-2 border-t border-white/5">
                  <span className="mono-kicker self-start pt-0.5">{r.mitigation}</span>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {risk.mitigation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
