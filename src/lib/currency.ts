import { getMarketConfig, type MarketType } from '@/lib/markets';
import { formatNumber as formatNumberUtil, type UnitMode } from '@/lib/format-number';

export interface CurrencyContext {
  code: string;
  symbol: string;
}

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  USD: '$',
  CNY: '¥',
  RMB: '¥',
  CNH: '¥',
  HKD: 'HK$',
  JPY: '¥',
  KRW: '₩',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF ',
};

type CurrencyLike = {
  currency?: string | null;
  reportedCurrency?: string | null;
};

type StatementLike = {
  reportedCurrency?: string | null;
};

export function normalizeCurrencyCode(input?: string | null): string | null {
  if (!input) return null;
  const normalized = input.trim().toUpperCase();
  return normalized || null;
}

export function getCurrencySymbol(
  currencyCode?: string | null,
  fallbackSymbol = '$'
): string {
  const normalized = normalizeCurrencyCode(currencyCode);
  if (!normalized) return fallbackSymbol;
  return CURRENCY_SYMBOL_MAP[normalized] || `${normalized} `;
}

export function resolveReportCurrency(params: {
  market: MarketType;
  profile?: CurrencyLike | null;
  incomeStatements?: StatementLike[] | null;
  balanceSheets?: StatementLike[] | null;
  cashFlowStatements?: StatementLike[] | null;
}): CurrencyContext {
  const marketConfig = getMarketConfig(params.market);
  const candidates = [
    params.profile?.currency,
    params.profile?.reportedCurrency,
    params.incomeStatements?.[0]?.reportedCurrency,
    params.balanceSheets?.[0]?.reportedCurrency,
    params.cashFlowStatements?.[0]?.reportedCurrency,
    marketConfig.currency,
  ];

  const code =
    candidates.map(normalizeCurrencyCode).find((item): item is string => !!item) ||
    marketConfig.currency;

  return {
    code,
    symbol: getCurrencySymbol(code, marketConfig.currencySymbol),
  };
}

export function getUnitModeByLocale(locale?: string): UnitMode {
  return locale === 'zh' ? 'zh' : 'en';
}

export function getChartScaleByLocale(locale?: string): number {
  return getUnitModeByLocale(locale) === 'zh' ? 1e8 : 1e9;
}

export function getChartUnitByLocale(locale?: string): string {
  return getUnitModeByLocale(locale) === 'zh' ? '亿' : 'B';
}

export function formatCurrencyCompact(num: number | null | undefined, params: {
  locale?: string;
  currencySymbol: string;
  currencyCode: string;
}): string {
  if (num === undefined || num === null || Number.isNaN(num)) return 'N/A';
  const unitMode = getUnitModeByLocale(params.locale);
  const compact = formatNumberUtil(num, unitMode);
  return `${params.currencySymbol}${compact} ${params.currencyCode}`;
}

export function formatCurrencyFixed(
  num: number | null | undefined,
  params: {
    currencySymbol: string;
    currencyCode: string;
    decimals?: number;
  }
): string {
  if (num === undefined || num === null || Number.isNaN(num)) return 'N/A';
  const decimals = params.decimals ?? 2;
  return `${params.currencySymbol}${num.toFixed(decimals)} ${params.currencyCode}`;
}
