'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDownIcon } from '@/components/Icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSupabaseClient, isSupabaseClientConfigured } from '@/lib/supabase-client';
import Testimonials from '@/components/Testimonials';

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-h2">{title}</h2>
      {subtitle && <p className="mt-1 text-[14px] text-text-2">{subtitle}</p>}
    </div>
  );
}

/**
 * 首页下半部分：核心优势、研报维度、用户反馈、FAQ、页脚。
 * 全部是静态内容，不做滚动入场、自动轮播或数字翻牌等装饰动画；
 * 只有 FAQ 的展开收起是用户主动触发的交互。
 */
export default function HomeMarketing() {
  const { t, locale } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);

  const coreAdvantages = [
    { id: 'ai-logic', number: t.home.features.one, title: t.home.features.feature1Title, description: t.home.features.feature1Desc },
    { id: 'multi-source', number: t.home.features.two, title: t.home.features.feature2Title, description: t.home.features.feature2Desc },
    { id: 'minimalist', number: t.home.features.three, title: t.home.features.feature3Title, description: t.home.features.feature3Desc },
  ];

  const dimensions = [
    { label: t.aiShowcase.revenueStructure, detail: t.aiShowcase.revenueDesc },
    { label: t.aiShowcase.industryPosition, detail: t.aiShowcase.industryDesc },
    { label: t.aiShowcase.competitiveAdvantage, detail: t.aiShowcase.competitiveDesc },
    { label: t.aiShowcase.riskFactors, detail: t.aiShowcase.riskDesc },
    { label: t.aiShowcase.valuationAnalysis, detail: t.aiShowcase.valuationDesc },
  ];

  const fetchReportCount = useCallback(async () => {
    try {
      const response = await fetch('/api/report-count');
      const data = await response.json();
      if (data.success && typeof data.count === 'number') {
        setReportCount(data.count);
      }
    } catch (err) {
      console.log('获取研报总数失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchReportCount();

    if (!isSupabaseClientConfigured) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel('report-count-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'search_records', filter: 'is_valid=eq.true' },
        () => setReportCount((prev) => (prev !== null ? prev + 1 : 1))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'search_records' },
        (payload) => {
          const oldValid = payload.old?.is_valid;
          const newValid = payload.new?.is_valid;
          if (oldValid === true && newValid === false) {
            setReportCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
          } else if (oldValid === false && newValid === true) {
            setReportCount((prev) => (prev !== null ? prev + 1 : 1));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'search_records' },
        (payload) => {
          if (payload.old?.is_valid === true) {
            setReportCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReportCount]);

  const faqs = [
    { q: t.home.faq.q1, lines: [t.home.faq.a1_1, t.home.faq.a1_2] },
    { q: t.home.faq.q2, lines: [t.home.faq.a2_1, t.home.faq.a2_2] },
  ];

  return (
    <>
      <section className="page-container py-10 md:py-14">
        <SectionHeading title={t.home.features.title} subtitle={t.home.features.subtitle} />
        <div className="grid gap-4 md:grid-cols-3">
          {coreAdvantages.map((advantage) => (
            <div key={advantage.id} className="panel p-5">
              <div className="stat-number">{advantage.number}</div>
              <h3 className="mt-2 text-h3">{advantage.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-text-2">{advantage.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-container pb-10 md:pb-14">
        <SectionHeading title={t.home.aiShowcase.title} subtitle={t.home.aiShowcase.displayTitle} />
        <div className="panel overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th className="w-40 md:w-56">{t.aiShowcase.dimensions}</th>
                <th>{locale === 'zh' ? '分析内容' : 'What we look at'}</th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dimension, index) => (
                <tr key={dimension.label}>
                  <td className="font-mono text-text-3">{String(index + 1).padStart(2, '0')}</td>
                  <td className="font-medium text-fg">{dimension.label}</td>
                  <td className="text-text-2">{dimension.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="page-container pb-10 md:pb-14">
        <SectionHeading title={t.home.testimonials.title} subtitle={t.home.testimonials.subtitle} />
        <Testimonials />
      </section>

      <section className="page-container pb-10 md:pb-14">
        <SectionHeading title={t.home.faq.title} />
        <div className="panel divide-y divide-white/10">
          {faqs.map(({ q, lines }, idx) => (
            <div key={idx}>
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                aria-expanded={expandedFaq === idx}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-hover"
              >
                <span className="text-[14px] font-medium text-fg">{q}</span>
                <ChevronDownIcon size={16} className={`shrink-0 text-text-3 ${expandedFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === idx && (
                <div className="space-y-2 px-5 pb-4">
                  {lines.map((line, i) => (
                    <p key={i} className="text-[14px] leading-6 text-text-2">{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div>
            <button
              type="button"
              onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
              aria-expanded={expandedFaq === 2}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-hover"
            >
              <span className="text-[14px] font-medium text-fg">{t.home.faq.q3}</span>
              <ChevronDownIcon size={16} className={`shrink-0 text-text-3 ${expandedFaq === 2 ? 'rotate-180' : ''}`} />
            </button>
            {expandedFaq === 2 && (
              <div className="grid gap-6 px-5 pb-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2 text-[14px]">
                  <p className="text-text-2">{t.home.faq.a3_1}</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-text-3">{t.home.faq.wechat}</dt>
                    <dd className="font-mono text-fg">wkzSteven</dd>
                    <dt className="text-text-3">{t.home.faq.email}</dt>
                    <dd>
                      <a href="mailto:wangkaizhou2016@gmail.com" className="text-accent hover:underline">
                        wangkaizhou2016@gmail.com
                      </a>
                    </dd>
                  </dl>
                </div>
                <div className="text-center">
                  <div className="mx-auto h-28 w-28 rounded-sm bg-pure-white p-1 ring-1 ring-white/10">
                    <img src="/wechat-qr.jpg" alt="WeChat QR" className="h-full w-full object-contain" />
                  </div>
                  <p className="mt-2 text-[12px] text-text-3">{t.home.faq.scanQr}</p>
                  <p className="text-[12px] text-text-4">{t.home.faq.qrExpiry}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-[13px] text-text-3">
          {t.home.faq.q4}
          <a href="mailto:wangkaizhou2016@gmail.com" className="ml-1 text-accent hover:underline">
            {t.common.contactUs}
          </a>
        </p>
      </section>

      <footer className="border-t border-line bg-panel">
        <div className="page-container flex flex-col gap-2 py-6 text-[12px] text-text-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p>{t.home.footer.copyright(new Date().getFullYear())}</p>
            <p>{t.home.footer.dataSource}</p>
          </div>
          <p className="flex items-baseline gap-1.5">
            <span>{t.home.footer.reportCount}</span>
            <span className="font-mono text-[14px] font-semibold text-fg">
              {reportCount !== null ? reportCount.toLocaleString() : '—'}
            </span>
            <span>{t.home.footer.reportUnit}</span>
          </p>
        </div>
      </footer>
    </>
  );
}
