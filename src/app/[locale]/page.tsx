import { cookies } from 'next/headers';
import { zh, en } from '@/i18n';
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

  // 首页默认市场为美股；输入后由 AI 自动识别实际市场。
  const labels: SearchIslandLabels = {
    aiMarketDetectPrefix: t.home.search.aiMarketDetect,
    currentMarketName: t.markets.us,
    startAnalysis: t.home.search.startAnalysis,
    suggestionsHeading: t.home.search.suggestions,
    noMatch: t.home.search.noMatch,
    enterSymbol: t.home.search.enterSymbol,
    searchHistory: t.home.search.searchHistory,
    clearAll: t.home.search.clearAll,
    delete: t.common.delete,
    trendingThisWeek: t.home.search.trendingThisWeek,
    realtimeUpdate: t.home.search.realtimeUpdate,
    confirmKicker: t.home.search.confirmKicker,
    confirmTitle: t.home.search.confirmTitle,
    confirmHint: t.home.search.confirmHint,
    confirmYourInput: t.home.search.confirmYourInput,
    confirmNoMatch: t.home.search.confirmNoMatch,
    confirmCancel: t.home.search.confirmCancel,
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

  const coverage = [
    { name: t.markets.us, code: 'NYSE · NASDAQ', example: 'AAPL' },
    { name: t.markets.cn, code: 'SSE · SZSE', example: '600519.SS' },
    { name: t.markets.hk, code: 'HKEX', example: '0700.HK' },
    { name: t.markets.jp, code: 'TSE', example: '7203.T' },
    { name: t.markets.kr, code: 'KRX', example: '005930.KS' },
    { name: t.markets.au, code: 'ASX', example: 'BHP.AX' },
  ];

  return (
    <main className="min-h-screen">
      <ThemeAwareHeader initialTheme={initialTheme} />

      {/* Hero：除交互部分外全部 SSR，左对齐到页眉网格 */}
      <section className="border-b border-line bg-panel">
        <div className="page-container grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-9 md:text-display font-semibold tracking-tight text-fg">
              {t.home.hero.title}
              <span className="text-brand">{t.home.hero.titleHighlight}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-text-2">{t.home.hero.subtitle}</p>

            <div className="mt-8">
              <HomeSearchIsland
                locale={locale}
                initialPlaceholder={rotation[0]}
                rotation={rotation}
                featuredStocks={featuredStocks}
                reportTypeOptions={reportTypeOptions}
                labels={labels}
              />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">{t.home.globalVision.title}</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{locale === 'zh' ? '市场' : 'Market'}</th>
                    <th>{locale === 'zh' ? '交易所' : 'Exchange'}</th>
                    <th className="num">{locale === 'zh' ? '代码示例' : 'Example'}</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((market) => (
                    <tr key={market.code}>
                      <td className="font-medium">{market.name}</td>
                      <td className="text-text-2">{market.code}</td>
                      <td className="num font-mono text-text-2">{market.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-[12px] leading-5 text-text-3">{t.home.globalVision.subtitle}</p>
            </div>
          </aside>
        </div>
      </section>

      <HomeMarketing />
    </main>
  );
}
