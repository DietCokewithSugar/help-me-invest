'use client';

import { Zap } from 'lucide-react';
import type { KeyMetrics, CompanyProfile, FinancialRatios, FinancialScores } from '@/types';
import { useState } from 'react';
import FinancialScoresDisplay from './FinancialScoresDisplay';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  profile: CompanyProfile;
  keyMetrics: KeyMetrics[];
  keyMetricsTTM?: any[];
  financialRatios?: FinancialRatios[];
  financialRatiosTTM?: any[];
  financialScores?: FinancialScores | null;
  currencySymbol?: string;
  theme?: 'dark' | 'light';
}

type MetricDescriptionKey =
  | 'peRatioTTM'
  | 'evToEBITDATTM'
  | 'earningsYieldTTM'
  | 'freeCashFlowYieldTTM'
  | 'grahamNumber'
  | 'enterpriseValue'
  | 'grossProfitMargin'
  | 'netProfitMargin'
  | 'returnOnEquity'
  | 'returnOnInvestedCapital'
  | 'incomeQuality'
  | 'cashConversionCycle'
  | 'daysOfInventoryOutstanding'
  | 'daysOfPayablesOutstanding'
  | 'assetTurnover'
  | 'inventoryTurnover'
  | 'researchAndDevelopementToRevenue'
  | 'capexToRevenue'
  | 'stockBasedCompensationToRevenue'
  | 'dividendYield'
  | 'dividendPayoutRatio'
  | 'freeCashFlowPerShare';

export default function ProfessionalValuationMetrics({
  profile,
  keyMetrics,
  keyMetricsTTM = [],
  financialRatios = [],
  financialRatiosTTM = [],
  financialScores,
  currencySymbol = '$',
  theme = 'dark',
}: Props) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const { t } = useLanguage();
  const proValuation = t.report.proValuation;
  const metricLabels = proValuation.metrics;
  const descriptions = proValuation.descriptions;

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const value = Math.abs(num) > 1 ? num : num * 100;
    return value.toFixed(2) + '%';
  };

  const formatRatio = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return num.toFixed(2);
  };

  const formatDays = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return `${num.toFixed(1)} ${proValuation.daysUnit}`;
  };

  const formatCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return currencySymbol + formatNumber(num);
  };

  if (!keyMetrics || keyMetrics.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-md p-6 text-center text-mist-400 font-mono text-sm">
        {proValuation.noData}
      </div>
    );
  }

  const latestMetrics = keyMetrics[0];
  const latestMetricsTTM = keyMetricsTTM?.[0];
  const latestRatios = financialRatios?.[0];
  const latestRatiosTTM = financialRatiosTTM?.[0];

  const CompactMetricRow = ({
    label,
    value,
    metricKey,
    highlight = false,
    highlightColor = 'text-glacier-400',
  }: {
    label: string;
    value: string;
    metricKey?: MetricDescriptionKey;
    highlight?: boolean;
    highlightColor?: string;
  }) => {
    const desc = metricKey ? descriptions[metricKey] : null;

    return (
      <div
        className="group relative flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded-sm transition-colors cursor-pointer"
        onClick={() => {
          if (metricKey) {
            setHoveredMetric(hoveredMetric === metricKey ? null : metricKey);
          }
        }}
      >
        <span className="text-mist-400 text-sm font-medium group-hover:text-mist-300 transition-colors">
          {label}
        </span>
        <span className={`font-mono text-sm font-medium ${highlight ? highlightColor : 'text-white'}`}>
          {value}
        </span>

        {desc && hoveredMetric === metricKey && (
          <div className="absolute z-50 bottom-full right-0 mb-2 w-64 p-3 bg-surface border border-white/10 rounded-sm shadow-xl">
            <h4 className="text-white text-xs font-bold mb-1">{desc.title}</h4>
            <p className="text-mist-400 text-xs leading-relaxed">{desc.description}</p>
            {desc.insight && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-amber-200/80 text-[10px] leading-tight flex items-start gap-1">
                  <Zap className="w-3 h-3 shrink-0 mt-0.5" />
                  {desc.insight}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const MetricColumn = ({
    title,
    metrics,
  }: {
    title: string;
    metrics: { label: string; value: string; metricKey?: MetricDescriptionKey; highlight?: boolean; highlightColor?: string }[];
  }) => {
    const validMetrics = metrics.filter(m => m.value !== 'N/A');
    if (validMetrics.length === 0) return null;

    return (
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold text-sm mb-3 pb-2 border-b border-white/10">{title}</h4>
        <div className="space-y-0.5">
          {validMetrics.map((m, i) => (
            <CompactMetricRow key={i} {...m} />
          ))}
        </div>
      </div>
    );
  };

  const renderCoreRiskScores = () => {
    if (!financialScores) return null;
    return <FinancialScoresDisplay financialScores={financialScores} theme={theme} />;
  };

  const renderFundamentals = () => {
    const valuationMetrics: {
      label: string;
      value: string;
      metricKey?: MetricDescriptionKey;
      highlight?: boolean;
      highlightColor?: string;
    }[] = [
      {
        label: metricLabels.peRatioTTM,
        value: formatRatio(latestRatiosTTM?.peRatioTTM),
        metricKey: 'peRatioTTM',
      },
      {
        label: metricLabels.evToEBITDATTM,
        value: formatRatio(latestRatiosTTM?.enterpriseValueMultipleTTM || latestRatiosTTM?.evToEBITDATTM),
        metricKey: 'evToEBITDATTM',
      },
      {
        label: metricLabels.earningsYieldTTM,
        value: formatPercent(latestRatiosTTM?.earningsYieldTTM),
        metricKey: 'earningsYieldTTM',
      },
      {
        label: metricLabels.freeCashFlowYieldTTM,
        value: formatPercent(latestRatiosTTM?.freeCashFlowYieldTTM),
        metricKey: 'freeCashFlowYieldTTM',
        highlight: true,
        highlightColor: 'text-glacier-400',
      },
      {
        label: metricLabels.grahamNumber,
        value: formatCurrency(latestMetrics.grahamNumber),
        metricKey: 'grahamNumber',
      },
      {
        label: metricLabels.enterpriseValue,
        value: formatCurrency(latestMetrics.enterpriseValue),
        metricKey: 'enterpriseValue',
      },
    ];

    const profitabilityMetrics: {
      label: string;
      value: string;
      metricKey?: MetricDescriptionKey;
      highlight?: boolean;
      highlightColor?: string;
    }[] = [
      {
        label: metricLabels.grossProfitMargin,
        value: formatPercent(latestRatios?.grossProfitMargin),
        metricKey: 'grossProfitMargin',
      },
      {
        label: metricLabels.netProfitMargin,
        value: formatPercent(latestRatios?.netProfitMargin),
        metricKey: 'netProfitMargin',
      },
      {
        label: metricLabels.roe,
        value: formatPercent(latestMetricsTTM?.roeTTM || latestMetrics.roe),
        metricKey: 'returnOnEquity',
        highlight: (latestMetricsTTM?.roeTTM || latestMetrics.roe) > 0.15,
        highlightColor: 'text-gemini-green',
      },
      {
        label: metricLabels.roic,
        value: formatPercent(latestMetricsTTM?.roicTTM || latestMetrics.roic),
        metricKey: 'returnOnInvestedCapital',
        highlight: (latestMetricsTTM?.roicTTM || latestMetrics.roic) > 0.15,
        highlightColor: 'text-gemini-green',
      },
      {
        label: metricLabels.incomeQuality,
        value: formatRatio(latestMetrics.incomeQuality),
        metricKey: 'incomeQuality',
        highlight: latestMetrics.incomeQuality > 1,
        highlightColor: 'text-gemini-green',
      },
    ];

    const ccc = latestMetricsTTM?.cashConversionCycleTTM || latestRatios?.cashConversionCycle;
    const efficiencyMetrics: {
      label: string;
      value: string;
      metricKey?: MetricDescriptionKey;
      highlight?: boolean;
      highlightColor?: string;
    }[] = [
      {
        label: metricLabels.cashConversionCycle,
        value: formatDays(ccc),
        metricKey: 'cashConversionCycle',
        highlight: ccc && ccc < 0,
        highlightColor: 'text-gemini-green',
      },
      {
        label: metricLabels.daysOfInventoryOutstanding,
        value: formatDays(latestMetricsTTM?.daysOfInventoryOutstandingTTM || latestMetrics.daysOfInventoryOnHand),
        metricKey: 'daysOfInventoryOutstanding',
      },
      {
        label: metricLabels.daysOfPayablesOutstanding,
        value: formatDays(latestMetricsTTM?.daysOfPayablesOutstandingTTM || latestMetrics.daysPayablesOutstanding),
        metricKey: 'daysOfPayablesOutstanding',
      },
      {
        label: metricLabels.assetTurnover,
        value: formatRatio(latestRatiosTTM?.assetTurnoverTTM),
        metricKey: 'assetTurnover',
      },
      {
        label: metricLabels.inventoryTurnover,
        value: formatRatio(latestRatiosTTM?.inventoryTurnoverTTM),
        metricKey: 'inventoryTurnover',
      },
    ];

    const hasValuation = valuationMetrics.some(m => m.value !== 'N/A');
    const hasProfitability = profitabilityMetrics.some(m => m.value !== 'N/A');
    const hasEfficiency = efficiencyMetrics.some(m => m.value !== 'N/A');

    if (!hasValuation && !hasProfitability && !hasEfficiency) return null;

    return (
      <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md">
        <h3 className="text-sm font-semibold text-mist-200 mb-6 flex items-center gap-2">
          <span className="w-1 h-4 bg-glacier-500 rounded-sm"></span>
          {proValuation.financialMetrics}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <MetricColumn title={proValuation.columns.valuation} metrics={valuationMetrics} />
          <MetricColumn title={proValuation.columns.profitability} metrics={profitabilityMetrics} />
          <MetricColumn title={proValuation.columns.efficiency} metrics={efficiencyMetrics} />
        </div>
      </div>
    );
  };

  const renderCapitalAndReturns = () => {
    const capitalMetrics: {
      label: string;
      value: string;
      metricKey?: MetricDescriptionKey;
      highlight?: boolean;
      highlightColor?: string;
    }[] = [
      {
        label: metricLabels.rdToRevenue,
        value: formatPercent(latestMetricsTTM?.researchAndDevelopementToRevenueTTM || latestMetrics.researchAndDdevelopementToRevenue),
        metricKey: 'researchAndDevelopementToRevenue',
      },
      {
        label: metricLabels.capexToRevenue,
        value: formatPercent(latestMetricsTTM?.capexToRevenueTTM || latestMetrics.capexToRevenue),
        metricKey: 'capexToRevenue',
      },
      {
        label: metricLabels.stockBasedCompensationToRevenue,
        value: formatPercent(latestMetricsTTM?.stockBasedCompensationToRevenueTTM || latestMetrics.stockBasedCompensationToRevenue),
        metricKey: 'stockBasedCompensationToRevenue',
        highlight: (latestMetricsTTM?.stockBasedCompensationToRevenueTTM || latestMetrics.stockBasedCompensationToRevenue) > 0.1,
        highlightColor: 'text-gemini-red',
      },
    ];

    const returnMetrics: {
      label: string;
      value: string;
      metricKey?: MetricDescriptionKey;
      highlight?: boolean;
      highlightColor?: string;
    }[] = [
      {
        label: metricLabels.dividendYield,
        value: formatPercent(latestRatios?.dividendYield),
        metricKey: 'dividendYield',
      },
      {
        label: metricLabels.payoutRatio,
        value: formatPercent(latestMetrics?.payoutRatio),
        metricKey: 'dividendPayoutRatio',
      },
      {
        label: metricLabels.freeCashFlowPerShare,
        value: formatCurrency(latestMetrics.freeCashFlowPerShare),
        metricKey: 'freeCashFlowPerShare',
      },
    ];

    const hasCapital = capitalMetrics.some(m => m.value !== 'N/A');
    const hasReturns = returnMetrics.some(m => m.value !== 'N/A');

    if (!hasCapital && !hasReturns) return null;

    return (
      <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-md">
        <h3 className="text-sm font-semibold text-mist-200 mb-6 flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-500 rounded-sm"></span>
          {proValuation.capitalAndReturns}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <MetricColumn title={proValuation.columns.capitalStructure} metrics={capitalMetrics} />
          <MetricColumn title={proValuation.columns.shareholderReturns} metrics={returnMetrics} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {renderCoreRiskScores()}
      {renderFundamentals()}
      {renderCapitalAndReturns()}
    </div>
  );
}
