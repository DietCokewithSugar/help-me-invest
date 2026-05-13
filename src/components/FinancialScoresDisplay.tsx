'use client';

import { useState } from 'react';
import { Shield, TrendingUp } from 'lucide-react';
import type { FinancialScores } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  financialScores: FinancialScores;
  theme?: 'dark' | 'light';
}

type ScoreDescriptionKey =
  | 'workingCapital'
  | 'totalAssets'
  | 'retainedEarnings'
  | 'ebit'
  | 'marketCap'
  | 'totalLiabilities'
  | 'revenue';

export default function FinancialScoresDisplay({ financialScores, theme = 'dark' }: Props) {
  const isLight = theme === 'light';
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const { t } = useLanguage();
  const scoresT = t.report.proValuation.scores;
  const zScoreT = scoresT.zScore;
  const fScoreT = scoresT.fScore;
  const descT = scoresT.descriptions;

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  function getZScoreInfo(score: number) {
    if (score < 1.8) return { label: zScoreT.labelDanger, color: 'text-red-500', bg: 'bg-red-500' };
    if (score < 3.0) return { label: zScoreT.labelWarn, color: 'text-amber-500', bg: 'bg-amber-500' };
    return { label: zScoreT.labelSafe, color: 'text-emerald-500', bg: 'bg-emerald-500' };
  }

  function getFScoreInfo(score: number) {
    if (score <= 2) return { label: fScoreT.labelBad, color: 'text-red-500', bg: 'bg-red-500' };
    if (score <= 6) return { label: fScoreT.labelMid, color: 'text-amber-500', bg: 'bg-amber-500' };
    return { label: fScoreT.labelGood, color: 'text-emerald-500', bg: 'bg-emerald-500' };
  }

  const zScore = financialScores.altmanZScore;
  const fScore = financialScores.piotroskiScore;
  const zInfo = getZScoreInfo(zScore);
  const fInfo = getFScoreInfo(fScore);

  const MetricRow = ({
    label,
    value,
    metricKey,
    highlightColor,
  }: {
    label: string;
    value: string;
    metricKey?: ScoreDescriptionKey;
    highlightColor?: string;
  }) => {
    const desc = metricKey ? descT[metricKey] : null;

    return (
      <div
        className="group relative flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded-sm transition-colors cursor-pointer"
        onClick={() => {
          if (metricKey) {
            setHoveredMetric(hoveredMetric === metricKey ? null : metricKey);
          }
        }}
      >
        <span className="text-mist-400 text-sm font-medium">{label}</span>
        <span className={`font-mono text-sm ${highlightColor || 'text-mist-200'}`}>{value}</span>

        {desc && hoveredMetric === metricKey && (
          <div className="absolute z-50 bottom-full right-0 mb-2 w-64 p-3 bg-surface border border-white/10 rounded-sm shadow-xl">
            <h4 className="text-white text-xs font-bold mb-1">{desc.title}</h4>
            <p className="text-mist-400 text-xs leading-relaxed">{desc.description}</p>
          </div>
        )}
      </div>
    );
  };

  const zScoreFormatted = zScore.toFixed(2);
  const zScoreInterpretation =
    zScore >= 3.0
      ? zScoreT.interpretSafe(zScoreFormatted)
      : zScore >= 1.8
        ? zScoreT.interpretWarn(zScoreFormatted)
        : zScoreT.interpretDanger(zScoreFormatted);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Altman Z-Score */}
        <div
          className="bg-white/5 border border-white/10 rounded-md p-5 group hover:border-white/20 transition-colors cursor-pointer relative"
          onClick={() => setHoveredMetric(hoveredMetric === 'altmanZScore' ? null : 'altmanZScore')}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-mist-400" />
              <h3 className="text-sm font-medium text-mist-200">Altman Z-Score</h3>
            </div>
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm bg-white/5 ${zInfo.color}`}>
              {zInfo.label}
            </span>
          </div>

          {hoveredMetric === 'altmanZScore' && (
            <div className="absolute left-0 bottom-full mb-2 w-full p-3 bg-surface border border-white/10 rounded-sm shadow-xl z-20">
              <h4 className="text-white text-xs font-bold mb-1">{zScoreT.descTitle}</h4>
              <p className="text-mist-400 text-xs leading-relaxed">{zScoreT.desc}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-mono font-bold ${zInfo.color}`}>{zScoreFormatted}</span>
            </div>

            <div className="h-1.5 w-full bg-white/10 rounded-sm overflow-hidden flex gap-0.5">
              <div className={`h-full flex-1 ${zScore < 1.8 ? 'bg-red-500' : (isLight ? 'bg-red-100' : 'bg-red-900/30')}`} />
              <div className={`h-full flex-1 ${zScore >= 1.8 && zScore < 3.0 ? 'bg-amber-500' : (isLight ? 'bg-amber-100' : 'bg-amber-900/30')}`} />
              <div className={`h-full flex-1 ${zScore >= 3.0 ? 'bg-emerald-500' : (isLight ? 'bg-emerald-100' : 'bg-emerald-900/30')}`} />
            </div>
            <div className="flex justify-between text-[10px] text-mist-600 font-mono mt-1">
              <span>0</span>
              <span>1.8</span>
              <span>3.0</span>
              <span>{zScoreT.legendDistress}</span>
            </div>
          </div>

          <p className="text-xs text-mist-500 leading-relaxed group-hover:text-mist-400 transition-colors">
            {zScoreInterpretation}
          </p>
        </div>

        {/* Piotroski F-Score */}
        <div
          className="bg-white/5 border border-white/10 rounded-md p-5 group hover:border-white/20 transition-colors cursor-pointer relative"
          onClick={() => setHoveredMetric(hoveredMetric === 'piotroskiScore' ? null : 'piotroskiScore')}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-mist-400" />
              <h3 className="text-sm font-medium text-mist-200">Piotroski F-Score</h3>
            </div>
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm bg-white/5 ${fInfo.color}`}>
              {fInfo.label}
            </span>
          </div>

          {hoveredMetric === 'piotroskiScore' && (
            <div className="absolute left-0 bottom-full mb-2 w-full p-3 bg-surface border border-white/10 rounded-sm shadow-xl z-20">
              <h4 className="text-white text-xs font-bold mb-1">{fScoreT.descTitle}</h4>
              <p className="text-mist-400 text-xs leading-relaxed">{fScoreT.desc}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-mono font-bold ${fInfo.color}`}>{fScore}</span>
              <span className="text-mist-500 text-sm">/ 9</span>
            </div>

            <div className="flex gap-1 h-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-[1px] ${i < fScore ? fInfo.bg : (isLight ? 'bg-slate-200' : 'bg-white/10')}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-mist-600 font-mono mt-1">
              <span>0</span>
              <span>9</span>
            </div>
          </div>

          <p className="text-xs text-mist-500 leading-relaxed group-hover:text-mist-400 transition-colors">
            {fScoreT.desc}
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-md p-5 md:p-6">
        <h3 className="text-sm font-semibold text-mist-200 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-mist-500 rounded-sm"></span>
          {scoresT.sectionTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="text-xs text-mist-600 font-mono mb-2 block uppercase">{scoresT.columns.assetsAndCap}</span>
            <MetricRow label={scoresT.rows.totalAssets} value={formatNumber(financialScores.totalAssets)} metricKey="totalAssets" />
            <MetricRow label={scoresT.rows.marketCap} value={formatNumber(financialScores.marketCap)} metricKey="marketCap" />
            <MetricRow label={scoresT.rows.revenue} value={formatNumber(financialScores.revenue)} metricKey="revenue" />
          </div>

          <div>
            <span className="text-xs text-mist-600 font-mono mb-2 block uppercase">{scoresT.columns.profitability}</span>
            <MetricRow
              label={scoresT.rows.retainedEarnings}
              value={formatNumber(financialScores.retainedEarnings)}
              metricKey="retainedEarnings"
              highlightColor={financialScores.retainedEarnings < 0 ? 'text-amber-500' : undefined}
            />
            <MetricRow label={scoresT.rows.ebit} value={formatNumber(financialScores.ebit)} metricKey="ebit" />
          </div>

          <div>
            <span className="text-xs text-mist-600 font-mono mb-2 block uppercase">{scoresT.columns.liabilities}</span>
            <MetricRow
              label={scoresT.rows.workingCapital}
              value={formatNumber(financialScores.workingCapital)}
              metricKey="workingCapital"
              highlightColor={financialScores.workingCapital < 0 ? 'text-amber-500' : undefined}
            />
            <MetricRow label={scoresT.rows.totalLiabilities} value={formatNumber(financialScores.totalLiabilities)} metricKey="totalLiabilities" />
          </div>
        </div>
      </div>
    </div>
  );
}
