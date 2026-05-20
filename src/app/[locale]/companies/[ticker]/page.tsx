'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Report from '@/components/Report';
import { useLanguage } from '@/contexts/LanguageContext';
import { withLocale } from '@/lib/locale-path';
import { useCompanyReport, type ReportType } from '@/hooks/useCompanyReport';
import {
  TrendingUpIcon,
  FileTextIcon,
  BarChart3Icon,
  BrainIcon,
  Globe2Icon,
} from '@/components/Icons';
import { detectMarketFromSymbol, getMarketConfig } from '@/lib/markets';
import type { MarketType } from '@/types';

const LOADING_STEPS_META = [
  { icon: FileTextIcon, color: 'from-glacier-500 to-glacier-600' },
  { icon: BarChart3Icon, color: 'from-gemini-purple to-gemini-pink' },
  { icon: BrainIcon, color: 'from-gemini-blue to-gemini-purple' },
  { icon: Globe2Icon, color: 'from-glacier-400 to-gemini-blue' },
  { icon: TrendingUpIcon, color: 'from-gemini-green to-glacier-500' },
];

function GeminiLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-glacier-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-blue animate-bounce" style={{ animationDelay: '100ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-purple animate-bounce" style={{ animationDelay: '200ms' }} />
      <div className="w-3 h-3 rounded-full bg-aurora-3 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

function LinearLoader({
  step,
  totalSteps,
  stepTexts,
  estimateText,
}: {
  step: number;
  totalSteps: number;
  stepTexts: string[];
  estimateText: string;
}) {
  const progress = ((step + 1) / totalSteps) * 100;
  const Icon = LOADING_STEPS_META[step].icon;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-glacier-500/15 flex items-center justify-center">
          <Icon className="w-4 h-4 text-glacier-500" />
        </div>
        <span className="text-sm text-mist-300">{stepTexts[step]}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-glacier-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-mist-600">
        <span>
          {step + 1} / {totalSteps}
        </span>
        <span>{estimateText}</span>
      </div>
    </div>
  );
}

// Mirror of the regex used by the server layout. Defense-in-depth: if the
// layout ever stops short of calling notFound(), we don't want the report
// flow to attempt /api/fmp lookups against arbitrary user input.
const TICKER_REGEX = /^[A-Z0-9.\-=^]{1,12}$/;

function CompanyReportPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useLanguage();

  // Normalize ticker from URL. Next.js gives us `params.ticker` as a string
  // (it's `[ticker]` not `[...ticker]`), already URI-decoded.
  const rawTicker = (Array.isArray(params?.ticker) ? params.ticker[0] : params?.ticker) || '';
  const ticker = decodeURIComponent(String(rawTicker)).toUpperCase();
  if (!TICKER_REGEX.test(ticker)) {
    // The layout already 404s for malformed tickers; this is just a final
    // backstop so the report-generation hook never sees garbage symbols.
    notFound();
  }

  const initialReportType = (searchParams.get('type') as ReportType | null) || 'standard';
  const [reportType, setReportType] = useState<ReportType>(initialReportType);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const {
    loading,
    aiLoading,
    aiError,
    error,
    reportData,
    loadingStep,
    setLoadingStep,
    retryCount,
    isRetryable,
    analyze,
    changeVersion,
    regenerate,
  } = useCompanyReport({ locale, t });

  // theme bootstrap (kept consistent with other pages until Task 3 SSR work)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = savedTheme || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // 进入页面或切换 ticker / locale 时自动触发分析
  const lastSignatureRef = useRef<string>('');
  useEffect(() => {
    if (!ticker) return;
    const signature = `${ticker}|${locale}|${reportType}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    analyze(ticker, { reportType });
  }, [ticker, locale, reportType, analyze]);

  // loading step rotator
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS_META.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading, setLoadingStep]);

  const loadingStepTexts = [
    t.home.loading.step1,
    t.home.loading.step2,
    t.home.loading.step3,
    t.home.loading.step4,
    t.home.loading.step5,
  ];

  const goHome = () => {
    router.push(withLocale(locale, '/'));
  };

  // Resolve current market for badge
  const currentMarket: MarketType = detectMarketFromSymbol(ticker || '');
  const marketConfig = getMarketConfig(currentMarket);

  return (
    <main className="min-h-screen">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onReset={goHome}
      />

      {/* Loading screen */}
      {loading && (
        <section className="pt-28 md:pt-32 pb-8 px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="text-center mt-8 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl md:text-3xl font-light text-white tracking-tight">
                <span className="font-mono">{ticker}</span>
                <span className="text-mist-500"> · </span>
                <span>{marketConfig.nameCn}</span>
              </h2>
            </motion.div>
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="glass-card p-6 md:p-8 w-full max-w-md">
                <LinearLoader
                  step={loadingStep}
                  totalSteps={LOADING_STEPS_META.length}
                  stepTexts={loadingStepTexts}
                  estimateText={t.home.loading.estimate}
                />
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Error panel */}
      {!loading && error && !reportData && (
        <section className="pt-28 md:pt-32 pb-12 px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="p-4 rounded-xl bg-red-500/5 border border-red-500/10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 shrink-0" />
                <div className="flex-1">
                  <span className="text-red-400/80 text-sm whitespace-pre-line">{error}</span>
                  {isRetryable && (
                    <button
                      onClick={() => analyze(ticker, { reportType })}
                      disabled={loading}
                      className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-glacier-500/20 text-glacier-400 hover:bg-glacier-500/30 transition-colors disabled:opacity-50"
                    >
                      {retryCount > 0 ? t.home.errors.retryWithCount(retryCount) : t.common.retry}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Report */}
      {reportData && (
        <div className="pt-24 md:pt-28">
          <Report
            data={reportData}
            initialReportVersion={
              reportType === 'pro' ? 'professional' : reportType === 'beginner' ? 'beginner' : 'standard'
            }
            aiLoading={aiLoading}
            aiError={aiError}
            onReset={goHome}
            theme={theme}
            onVersionChange={async (newVersion) => {
              setReportType(newVersion === 'professional' ? 'pro' : newVersion);
              await changeVersion(newVersion);
            }}
            onRegenerate={regenerate}
          />
        </div>
      )}

    </main>
  );
}

export default function CompanyReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
          <GeminiLoader />
        </div>
      }
    >
      <CompanyReportPageContent />
    </Suspense>
  );
}
