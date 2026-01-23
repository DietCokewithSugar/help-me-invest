'use client';

import { useState } from 'react';
import { Shield, TrendingUp, AlertTriangle, Info, DollarSign, Building2, Zap, PiggyBank } from 'lucide-react';
import type { FinancialScores } from '@/types';

interface Props {
  financialScores: FinancialScores;
  theme?: 'dark' | 'light';
}

// 指标说明映射
const scoreDescriptions: Record<string, { title: string; description: string; interpretation?: string }> = {
  altmanZScore: {
    title: '奥特曼 Z-Score',
    description: 'Z-Score 模型用于预测破产风险。分数越高，破产风险越低。通常 > 3.0 为健康，< 1.8 为危险。',
    interpretation: '< 1.8: 危险 | 1.8-3.0: 预警 | > 3.0: 健康',
  },
  piotroskiScore: {
    title: '皮奥特罗斯基 F-Score',
    description: '衡量公司财务状况是否在改善（包括盈利、杠杆、运营效率）。8-9 分通常被认为是极好的。',
    interpretation: '0-2: 较差 | 3-6: 一般 | 7-9: 优秀',
  },
  workingCapital: {
    title: '营运资金',
    description: '流动资产 - 流动负债。反映短期资金周转能力。',
  },
  totalAssets: {
    title: '总资产',
    description: '企业拥有或控制的全部资产。',
  },
  retainedEarnings: {
    title: '留存收益',
    description: '企业历年积累的净利润。',
  },
  ebit: {
    title: 'EBIT',
    description: '息税前利润，反映核心业务盈利能力。',
  },
  marketCap: {
    title: '市值',
    description: '股票总市值，反映市场对公司的估值。',
  },
  totalLiabilities: {
    title: '总负债',
    description: '企业承担的确切债务总额。',
  },
  revenue: {
    title: '营收',
    description: '企业的主营业务收入。',
  },
};

// Z-Score 颜色和状态
function getZScoreInfo(score: number) {
  if (score < 1.8) return { label: '危险', color: 'text-red-500', bg: 'bg-red-500' };
  if (score < 3.0) return { label: '预警', color: 'text-amber-500', bg: 'bg-amber-500' };
  return { label: '健康', color: 'text-emerald-500', bg: 'bg-emerald-500' };
}

// F-Score 颜色和状态
function getFScoreInfo(score: number) {
  if (score <= 2) return { label: '较差', color: 'text-red-500', bg: 'bg-red-500' };
  if (score <= 6) return { label: '一般', color: 'text-amber-500', bg: 'bg-amber-500' };
  return { label: '优秀', color: 'text-emerald-500', bg: 'bg-emerald-500' };
}

export default function FinancialScoresDisplay({ financialScores, theme = 'dark' }: Props) {
  const isLight = theme === 'light';
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const zScore = financialScores.altmanZScore;
  const fScore = financialScores.piotroskiScore;
  const zInfo = getZScoreInfo(zScore);
  const fInfo = getFScoreInfo(fScore);

  // 紧凑的指标行组件
  const MetricRow = ({ label, value, metricKey, highlightColor }: any) => {
    const desc = metricKey ? scoreDescriptions[metricKey] : null;

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

        {/* Tooltip */}
        {desc && hoveredMetric === metricKey && (
          <div className="absolute z-50 bottom-full right-0 mb-2 w-64 p-3 bg-surface border border-white/10 rounded-sm shadow-xl">
            <h4 className="text-white text-xs font-bold mb-1">{desc.title}</h4>
            <p className="text-mist-400 text-xs leading-relaxed">{desc.description}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 核心评分卡片 */}
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

          {/* Tooltip/Reminder */}
          {hoveredMetric === 'altmanZScore' && (
            <div className="absolute left-0 bottom-full mb-2 w-full p-3 bg-surface border border-white/10 rounded-sm shadow-xl z-20">
              <h4 className="text-white text-xs font-bold mb-1">{scoreDescriptions.altmanZScore.title}</h4>
              <p className="text-mist-400 text-xs leading-relaxed">{scoreDescriptions.altmanZScore.description}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-mono font-bold ${zInfo.color}`}>{zScore.toFixed(2)}</span>
            </div>

            {/* Visual Meter */}
            <div className="h-1.5 w-full bg-white/10 rounded-sm overflow-hidden flex gap-0.5">
              {/* 危险区 < 1.8 */}
              <div className={`h-full flex-1 ${zScore < 1.8 ? 'bg-red-500' : (isLight ? 'bg-red-100' : 'bg-red-900/30')}`} />
              {/* 灰色区 1.8 - 3.0 */}
              <div className={`h-full flex-1 ${zScore >= 1.8 && zScore < 3.0 ? 'bg-amber-500' : (isLight ? 'bg-amber-100' : 'bg-amber-900/30')}`} />
              {/* 安全区 > 3.0 */}
              <div className={`h-full flex-1 ${zScore >= 3.0 ? 'bg-emerald-500' : (isLight ? 'bg-emerald-100' : 'bg-emerald-900/30')}`} />
            </div>
            <div className="flex justify-between text-[10px] text-mist-600 font-mono mt-1">
              <span>0</span>
              <span>1.8</span>
              <span>3.0</span>
              <span>Distress</span>
            </div>
          </div>

          <p className="text-xs text-mist-500 leading-relaxed group-hover:text-mist-400 transition-colors">
            {zScore >= 3.0
              ? `当前 Z-Score 远超 3.0。这说明公司财务状况健康，破产风险极低。`
              : zScore >= 1.8
                ? `当前 Z-Score 处于 1.8-3.0 预警区间。这说明公司财务状况一般，破产风险处于预警状态。`
                : `当前 Z-Score 低于 1.8。这说明公司财务状况危险，破产风险较高。`}
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

          {/* Tooltip/Reminder */}
          {hoveredMetric === 'piotroskiScore' && (
            <div className="absolute left-0 bottom-full mb-2 w-full p-3 bg-surface border border-white/10 rounded-sm shadow-xl z-20">
              <h4 className="text-white text-xs font-bold mb-1">{scoreDescriptions.piotroskiScore.title}</h4>
              <p className="text-mist-400 text-xs leading-relaxed">{scoreDescriptions.piotroskiScore.description}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-mono font-bold ${fInfo.color}`}>{fScore}</span>
              <span className="text-mist-500 text-sm">/ 9</span>
            </div>

            {/* Visual Blocks */}
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
            {scoreDescriptions.piotroskiScore.description}
          </p>
        </div>
      </div>

      {/* 详细计算因子 */}
      <div className="bg-white/5 border border-white/10 rounded-md p-5 md:p-6">
        <h3 className="text-sm font-semibold text-mist-200 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-mist-500 rounded-sm"></span>
          计算因子详情
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 资产 */}
          <div>
            <span className="text-xs text-mist-600 font-mono mb-2 block uppercase">Assets & Cap</span>
            <MetricRow label="总资产" value={formatNumber(financialScores.totalAssets)} metricKey="totalAssets" />
            <MetricRow label="市值" value={formatNumber(financialScores.marketCap)} metricKey="marketCap" />
            <MetricRow label="营收" value={formatNumber(financialScores.revenue)} metricKey="revenue" />
          </div>

          {/* 盈利 */}
          <div>
            <span className="text-xs text-mist-600 font-mono mb-2 block uppercase">Profitability</span>
            <MetricRow
              label="留存收益"
              value={formatNumber(financialScores.retainedEarnings)}
              metricKey="retainedEarnings"
              highlightColor={financialScores.retainedEarnings < 0 ? 'text-amber-500' : undefined}
            />
            <MetricRow label="EBIT" value={formatNumber(financialScores.ebit)} metricKey="ebit" />
          </div>

          {/* 负债 */}
          <div>
            <span className="text-xs text-mist-600 font-mono mb-2 block uppercase">Liabilities</span>
            <MetricRow
              label="营运资金"
              value={formatNumber(financialScores.workingCapital)}
              metricKey="workingCapital"
              highlightColor={financialScores.workingCapital < 0 ? 'text-amber-500' : undefined}
            />
            <MetricRow label="总负债" value={formatNumber(financialScores.totalLiabilities)} metricKey="totalLiabilities" />
          </div>
        </div>
      </div>
    </div>
  );
}
