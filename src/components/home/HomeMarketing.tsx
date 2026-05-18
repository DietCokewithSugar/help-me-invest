'use client';

import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, HelpCircleIcon, DollarSignIcon, MessageCircleIcon } from '@/components/Icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSupabaseClient, isSupabaseClientConfigured } from '@/lib/supabase-client';

const AIShowcase = lazy(() => import('@/components/AIShowcase'));
const Testimonials = lazy(() => import('@/components/Testimonials'));
const FlipCounter = lazy(() => import('@/components/FlipCounter'));

function MarketingLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-glacier-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-blue animate-bounce" style={{ animationDelay: '100ms' }} />
      <div className="w-3 h-3 rounded-full bg-gemini-purple animate-bounce" style={{ animationDelay: '200ms' }} />
      <div className="w-3 h-3 rounded-full bg-aurora-3 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/**
 * The non-interactive (or only-mildly-interactive) sections of the home page:
 * core advantages, AI showcase, market coverage, testimonials, FAQ, footer.
 * Lives in a client component because some children use Supabase realtime
 * subscriptions, lazy imports, and translation hooks.
 */
export default function HomeMarketing() {
  const { t } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);

  const coreAdvantages = [
    {
      id: 'ai-logic',
      number: t.home.features.one,
      title: t.home.features.feature1Title,
      description: t.home.features.feature1Desc,
    },
    {
      id: 'multi-source',
      number: t.home.features.two,
      title: t.home.features.feature2Title,
      description: t.home.features.feature2Desc,
    },
    {
      id: 'minimalist',
      number: t.home.features.three,
      title: t.home.features.feature3Title,
      description: t.home.features.feature3Desc,
    },
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

  return (
    <>
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.features.title}</h3>
            <p className="text-mist-500 text-sm md:text-base">{t.home.features.subtitle}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {coreAdvantages.map((advantage, index) => (
              <motion.div
                key={advantage.id}
                className="feature-card group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="cn-number mb-6">{advantage.number}</div>
                <h4 className="text-xl font-medium text-white mb-3">{advantage.title}</h4>
                <p className="text-mist-400 leading-relaxed text-[15px]">{advantage.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.aiShowcase.title}</h3>
            <p className="text-mist-500 text-sm md:text-base">{t.home.aiShowcase.displayTitle}</p>
          </motion.div>
          <Suspense
            fallback={
              <div className="glass-card p-12 flex items-center justify-center">
                <MarketingLoader />
              </div>
            }
          >
            <AIShowcase />
          </Suspense>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-6">{t.home.globalVision.title}</h3>
              <p className="text-mist-400 leading-relaxed mb-10 text-[15px] md:text-base max-w-2xl mx-auto">
                {t.home.globalVision.subtitle}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
                {[
                  { name: t.markets.us, code: 'NYSE / NASDAQ', color: '#4285f4' },
                  { name: t.markets.cn, code: 'SSE / SZSE', color: '#ea4335' },
                  { name: t.markets.hk, code: 'HKEX', color: '#fbbc04' },
                  { name: t.markets.jp, code: 'TSE', color: '#34a853' },
                  { name: t.markets.kr, code: 'KRX', color: '#a855f7' },
                  { name: t.markets.au, code: 'ASX', color: '#00acc1' },
                ].map((market) => (
                  <div
                    key={market.name}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-colors"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: market.color }} />
                    <div>
                      <div className="text-white font-medium text-sm">{market.name}</div>
                      <div className="text-mist-600 text-xs">{market.code}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.testimonials.title}</h3>
            <p className="text-mist-500 text-sm md:text-base">{t.home.testimonials.subtitle}</p>
          </motion.div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <MarketingLoader />
              </div>
            }
          >
            <Testimonials />
          </Suspense>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4">{t.home.faq.title}</h3>
          </motion.div>

          <div className="space-y-4">
            {[
              { idx: 0, q: t.home.faq.q1, lines: [t.home.faq.a1_1, t.home.faq.a1_2], Icon: HelpCircleIcon, accent: 'glacier' },
              { idx: 1, q: t.home.faq.q2, lines: [t.home.faq.a2_1, t.home.faq.a2_2], Icon: DollarSignIcon, accent: 'gemini-purple' },
            ].map(({ idx, q, lines, Icon, accent }) => (
              <motion.div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-sm bg-${accent}-500/10 border border-${accent}-500/20 flex items-center justify-center flex-shrink-0 text-${accent}-500`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">
                      {q}
                    </span>
                  </div>
                  <ChevronDownIcon
                    size={16}
                    className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${
                      expandedFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/5">
                        {lines.map((line, i) => (
                          <p key={i} className="text-mist-400 leading-relaxed text-sm">
                            {line}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            <motion.div
              className="bg-white/5 border border-white/10 rounded-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-sm bg-gemini-yellow/10 border border-gemini-yellow/20 flex items-center justify-center flex-shrink-0 text-gemini-yellow">
                    <MessageCircleIcon size={16} />
                  </div>
                  <span className="text-sm md:text-base font-medium text-mist-200 group-hover:text-white transition-colors text-left">
                    {t.home.faq.q3}
                  </span>
                </div>
                <ChevronDownIcon
                  size={16}
                  className={`text-mist-500 transition-transform duration-300 flex-shrink-0 ${
                    expandedFaq === 2 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {expandedFaq === 2 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/5">
                      <div className="space-y-2">
                        <p className="text-mist-400 leading-relaxed text-sm">{t.home.faq.a3_1}</p>
                        <div className="space-y-2 pl-4">
                          <p className="text-mist-400 text-sm">
                            <span className="text-mist-500">{t.home.faq.wechat}</span>
                            <span className="text-white font-mono ml-2">wkzSteven</span>
                          </p>
                          <p className="text-mist-400 text-sm">
                            <span className="text-mist-500">{t.home.faq.email}</span>
                            <a
                              href="mailto:wangkaizhou2016@gmail.com"
                              className="text-glacier-400 hover:text-glacier-300 transition-colors ml-2"
                            >
                              wangkaizhou2016@gmail.com
                            </a>
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="bg-white/5 rounded-md p-4 text-center border border-white/5">
                          <p className="text-mist-400 text-sm mb-3">{t.home.faq.scanQr}</p>
                          <div className="w-32 h-32 bg-white rounded-sm p-1 mx-auto">
                            <img src="/wechat-qr.jpg" alt="WeChat QR" className="w-full h-full object-contain" />
                          </div>
                          <p className="text-mist-600 text-xs mt-3">{t.home.faq.qrExpiry}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-mist-600 text-sm">
              {t.home.faq.q4}
              <a
                href="mailto:wangkaizhou2016@gmail.com"
                className="text-glacier-400 hover:text-glacier-300 transition-colors ml-1"
              >
                {t.common.contactUs}
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 md:py-12 px-4 md:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-mist-500 text-sm mb-1">
            <span>{t.home.footer.reportCount}</span>
            <Suspense fallback={<span className="font-mono">—</span>}>
              <FlipCounter value={reportCount} className="text-glacier-400 text-base relative" />
            </Suspense>
            <span>{t.home.footer.reportUnit}</span>
          </div>
          <p className="text-mist-600 text-sm">{t.home.footer.copyright(new Date().getFullYear())}</p>
          <p className="text-mist-700 text-xs mt-2">{t.home.footer.dataSource}</p>
        </div>
      </footer>
    </>
  );
}
