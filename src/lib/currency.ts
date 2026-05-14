import { getMarketConfig, type MarketType } from '@/lib/markets';

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
