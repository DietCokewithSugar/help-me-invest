import { cookies } from 'next/headers';
import { zh, en } from '@/i18n';
import { MARKET_CONFIGS } from '@/lib/markets';
import HomeSearchIsland, {
  type FeaturedStockChip,
  type PlaceholderRotationItem,
  type SearchIslandLabels,
} from '@/components/home/HomeSearchIsland';
import HomeMarketing from '@/components/home/HomeMarketing';
import ThemeAwareHeader from '@/components/ThemeAwareHeader';

// Stocks rotated in the placeholder + shown as fallback trending chips. Kept
// here on the server so crawlers see real symbols + Chinese/English labels in
// the initial HTML.
const FEATURED_STOCK_SYMBOLS = [
  'AAPL',
  'NVDA',
  'TSLA',
  'MSFT',
  'GOOGL',
  '600519.SS',
  '000858.SZ',
  '0700.HK',
  '9988.HK',
  '7203.T',
  '005930.KS',
  '035720.KS',
  'CBA.AX',
  'BHP.AX',
];

const SUPPORTED_LOCALES = new Set(['zh', 'en']);

interface HomePageProps {
  params: { locale: string };
}

export default function HomePage({ params }: HomePageProps) {
  const locale: 'zh' | 'en' = SUPPORTED_LOCALES.has(params.locale)
    ? (params.locale as 'zh' | 'en')
    : 'zh';
  const t = locale === 'zh' ? zh : en;

  const featuredStocks: FeaturedStockChip[] = FEATURED_STOCK_SYMBOLS.map((sym) => ({
    symbol: sym,
    label: (t.home.featuredStocks as Record<string, string>)[sym] || sym,
    href: `/${locale}/companies/${encodeURIComponent(sym)}`,
  }));

  const rotation: PlaceholderRotationItem[] = FEATURED_STOCK_SYMBOLS.map((sym) => ({
    symbol: sym,
    label: (t.home.featuredStocks as Record<string, string>)[sym] || sym,
  }));

  // Default market is US for home page; the AI market-detect badge surfaces
  // this in the SSR output before the user types anything.
  const currentMarketConfig = MARKET_CONFIGS.US;
  const marketRecommended: FeaturedStockChip[] = currentMarketConfig.featuredStocks.slice(0, 5).map((stock) => ({
    symbol: stock.symbol,
    label: stock.name,
    href: `/${locale}/companies/${encodeURIComponent(stock.symbol)}`,
  }));

  const labels: SearchIslandLabels = {
    aiMarketDetectPrefix: t.home.search.aiMarketDetect,
    currentMarketName: currentMarketConfig.nameCn,
    startAnalysis: t.home.search.startAnalysis,
    suggestionsHeading: t.home.search.suggestions,
    noMatch: t.home.search.noMatch,
    enterSymbol: t.home.search.enterSymbol,
    searchHistory: t.home.search.searchHistory,
    clearAll: t.home.search.clearAll,
    delete: t.common.delete,
    trendingThisWeek: t.home.search.trendingThisWeek,
    realtimeUpdate: t.home.search.realtimeUpdate,
    marketHotLabel: t.home.search.marketHot(currentMarketConfig.nameCn),
  };

  const reportTypeOptions = [
    {
      value: 'beginner' as const,
      label: t.home.reportTypeSelector.beginner,
      desc: t.home.reportTypeSelector.beginnerDesc,
    },
    {
      value: 'standard' as const,
      label: t.home.reportTypeSelector.standard,
      desc: t.home.reportTypeSelector.standardDesc,
    },
    {
      value: 'pro' as const,
      label: t.home.reportTypeSelector.pro,
      desc: t.home.reportTypeSelector.proDesc,
    },
  ];

  const themeCookie = cookies().get('theme')?.value;
  const initialTheme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';

  return (
    <main className="min-h-screen">
      <ThemeAwareHeader initialTheme={initialTheme} />

      {/* Hero section - everything except the interactive parts is SSR'd */}
      <section className="pt-28 md:pt-32 pb-16 md:pb-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mt-12 md:mt-14 mb-12 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light text-white mb-6 md:mb-8 leading-tight tracking-tight">
              {t.home.hero.title}
              <br className="md:hidden" />
              <span className="gradient-text font-normal">{t.home.hero.titleHighlight}</span>
            </h2>
            <p className="text-base md:text-xl text-mist-400 max-w-2xl mx-auto leading-relaxed px-4">
              {t.home.hero.subtitle1}
              <br className="hidden md:block" />
              <span className="text-mist-500">{t.home.hero.subtitle2}</span>
            </p>
          </div>

          <HomeSearchIsland
            locale={locale}
            initialPlaceholder={rotation[0]}
            rotation={rotation}
            featuredStocks={featuredStocks}
            marketRecommended={marketRecommended}
            reportTypeOptions={reportTypeOptions}
            labels={labels}
          />
        </div>
      </section>

      <HomeMarketing />
    </main>
  );
}
