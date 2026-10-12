'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Report from '@/components/Report';
import { useLanguage } from '@/contexts/LanguageContext';
import { withLocale } from '@/lib/locale-path';
import { useCompanyReport, type ReportType } from '@/hooks/useCompanyReport';
import { Check as CheckIcon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { detectMarketFromSymbol, getMarketConfig } from '@/lib/markets';
import type { MarketType } from '@/types';

const LOADING_STEP_COUNT = 5;

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full border-2 border-text-4 border-t-accent animate-spin"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/**
 * 加载状态：列出各阶段，已完成打勾、当前阶段显示转圈。
 * 阶段只前进不回绕，停在最后一步直到数据返回——不制造循环往复的「假进度」。
 */
function LoadingSteps({
  step,
  stepTexts,
  estimateText,
}: {
  step: number;
  stepTexts: string[];
  estimateText: string;
}) {
  return (
    <div className="panel w-full max-w-md">
      <ol className="divide-y divide-white/10">
        {stepTexts.map((text, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={text} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <span className="flex h-4 w-4 items-center justify-center">
                {done ? <CheckIcon size={14} className="text-up" /> : current ? <Spinner size={14} /> : (
                  <span className="h-1.5 w-1.5 rounded-full bg-text-4" />
                )}
              </span>
              <span className={current ? 'text-fg font-medium' : done ? 'text-text-2' : 'text-text-3'}>{text}</span>
            </li>
          );
        })}
      </ol>
      <div className="border-t border-line bg-raised px-4 py-2 text-[12px] text-text-3">{estimateText}</div>
    </div>
  );
}

// Mirror of the regex used by the server layout. Defense-in-depth: if the
// layout ever stops short of calling notFound(), we don't want the report
// flow to attempt /api/report-data lookups against arbitrary user input.
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

  // 阶段提示只前进不回绕，停在最后一步等待数据
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEP_COUNT - 1));
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

      {(loading || (error && !reportData)) && (
        <PageHeader
          eyebrow={marketConfig.nameCn}
          title={<span className="font-mono">{ticker}</span>}
        />
      )}

      {/* Loading screen */}
      {loading && (
        <section className="page-container py-6">
          <LoadingSteps
            step={loadingStep}
            stepTexts={loadingStepTexts}
            estimateText={t.home.loading.estimate}
          />
        </section>
      )}

      {/* Error panel */}
      {!loading && error && !reportData && (
        <section className="page-container py-6">
          <div className="max-w-3xl rounded-md border border-down/30 bg-down/5 px-4 py-3">
            <p className="whitespace-pre-line text-[13px] text-down">{error}</p>
            {isRetryable && (
              <button
                type="button"
                onClick={() => analyze(ticker, { reportType })}
                disabled={loading}
                className="btn-secondary mt-3"
              >
                {retryCount > 0 ? t.home.errors.retryWithCount(retryCount) : t.common.retry}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Report */}
      {reportData && (
        <div>
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
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size={20} />
        </div>
      }
    >
      <CompanyReportPageContent />
    </Suspense>
  );
}
