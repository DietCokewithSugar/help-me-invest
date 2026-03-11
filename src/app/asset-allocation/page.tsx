'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import ExportModal from '@/components/ExportModal';
import AllocationCharts from '@/components/AllocationCharts';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download } from 'lucide-react';

const TOTAL_STEPS = 5;

const ASSET_TYPE_ICONS: Record<string, string> = {
  usStocks: '🇺🇸',
  aShares: '🇨🇳',
  hkStocks: '🇭🇰',
  bonds: '🏛️',
  gold: '🥇',
  realEstate: '🏠',
  crypto: '₿',
  funds: '📊',
  cash: '💵',
  commodities: '🛢️',
};

const RETURN_LEVEL_COLORS: Record<string, string> = {
  conservative: 'border-growth/40 hover:border-growth/70',
  moderate: 'border-glacier-500/40 hover:border-glacier-500/70',
  growth: 'border-yellow-500/40 hover:border-yellow-500/70',
  aggressive: 'border-decay/40 hover:border-decay/70',
};

const RETURN_LEVEL_ACTIVE: Record<string, string> = {
  conservative: 'border-growth bg-growth/10',
  moderate: 'border-glacier-500 bg-glacier-500/10',
  growth: 'border-yellow-500 bg-yellow-500/10',
  aggressive: 'border-decay bg-decay/10',
};

const OUTLOOK_ICONS: Record<string, string> = {
  us: '🇺🇸',
  china: '🇨🇳',
  both: '🌐',
  unsure: '🤖',
};

interface FormData {
  assetTypes: string[];
  returnLevel: string;
  investAmount: string;
  totalAssets: string;
  currency: string;
  marketOutlook: string;
  investmentHorizon: string;
  existingAssets: string;
  interests: string;
}

export default function AssetAllocationPage() {
  const { t, locale } = useLanguage();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    assetTypes: [],
    returnLevel: '',
    investAmount: '',
    totalAssets: '',
    currency: 'CNY',
    marketOutlook: '',
    investmentHorizon: 'medium',
    existingAssets: '',
    interests: '',
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleAssetType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      assetTypes: prev.assetTypes.includes(type)
        ? prev.assetTypes.filter(t => t !== type)
        : [...prev.assetTypes, type],
    }));
  };

  const validateStep = (step: number): string | null => {
    const aa = t.assetAllocation;
    switch (step) {
      case 1:
        return formData.assetTypes.length === 0 ? aa.errors.selectAsset : null;
      case 2:
        return !formData.returnLevel ? aa.errors.selectReturn : null;
      case 3:
        if (!formData.investAmount) return aa.errors.enterInvestAmount;
        if (!formData.totalAssets) return aa.errors.enterTotalAssets;
        if (Number(formData.investAmount) > Number(formData.totalAssets)) return aa.errors.investExceedsTotal;
        return null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const goPrev = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleGenerate = async () => {
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setIsGenerating(true);
    setRecommendation(null);
    setChartData(null);

    try {
      const res = await fetch('/api/asset-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetTypes: formData.assetTypes,
          returnLevel: formData.returnLevel,
          investAmount: Number(formData.investAmount),
          totalAssets: Number(formData.totalAssets),
          currency: formData.currency,
          marketOutlook: formData.marketOutlook,
          investmentHorizon: formData.investmentHorizon,
          existingAssets: formData.existingAssets,
          interests: formData.interests,
          language: locale,
        }),
      });

      if (!res.ok) {
        throw new Error(t.assetAllocation.errors.generateFailed);
      }

      const data = await res.json();
      setRecommendation(data.recommendation);
      if (data.chartData) setChartData(data.chartData);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e: any) {
      setError(e.message || t.assetAllocation.errors.generateFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    setFormData({
      assetTypes: [],
      returnLevel: '',
      investAmount: '',
      totalAssets: '',
      currency: 'CNY',
      marketOutlook: '',
      investmentHorizon: 'medium',
      existingAssets: '',
      interests: '',
    });
    setCurrentStep(1);
    setRecommendation(null);
    setChartData(null);
    setError(null);
  };

  const aa = t.assetAllocation;

  const assetTypeKeys = Object.keys(aa.assetTypes) as Array<keyof typeof aa.assetTypes>;
  const returnLevelKeys = ['conservative', 'moderate', 'growth', 'aggressive'] as const;
  const outlookKeys = ['us', 'china', 'both', 'unsure'] as const;
  const horizonKeys = ['short', 'medium', 'long', 'veryLong'] as const;

  return (
    <div className="min-h-screen transition-colors duration-200" style={{ backgroundColor: 'var(--bg-obsidian)' }}>
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        showContactModal={() => setShowContactModal(true)}
      />

      <div className="pt-32 pb-16 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {aa.title}
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {aa.subtitle}
            </p>
          </div>

          {/* Step indicator */}
          {!recommendation && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const step = i + 1;
                const isActive = step === currentStep;
                const isDone = step < currentStep;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isDone) {
                          setError(null);
                          setCurrentStep(step);
                        }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                        isActive
                          ? 'bg-glacier-500 text-white'
                          : isDone
                          ? 'bg-glacier-500/20 text-glacier-500 cursor-pointer hover:bg-glacier-500/30'
                          : 'border border-white/10 text-mist-500'
                      }`}
                    >
                      {isDone ? '✓' : step}
                    </button>
                    {step < TOTAL_STEPS && (
                      <div className={`w-8 h-px ${isDone ? 'bg-glacier-500/40' : 'bg-white/10'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step content */}
          {!recommendation && !isGenerating && (
            <div className="gemini-card p-6 md:p-8">
              {/* Step 1: Asset Types */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{aa.step1Title}</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{aa.step1Desc}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {assetTypeKeys.map(key => {
                      const isSelected = formData.assetTypes.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleAssetType(key)}
                          className={`flex items-center gap-3 p-4 rounded-md border transition-all text-left ${
                            isSelected
                              ? 'border-glacier-500 bg-glacier-500/10'
                              : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xl">{ASSET_TYPE_ICONS[key]}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {aa.assetTypes[key]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Return Level */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{aa.step2Title}</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{aa.step2Desc}</p>
                  <div className="grid gap-3">
                    {returnLevelKeys.map(key => {
                      const isSelected = formData.returnLevel === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setFormData(prev => ({ ...prev, returnLevel: key }))}
                          className={`flex flex-col p-4 rounded-md border transition-all text-left ${
                            isSelected
                              ? RETURN_LEVEL_ACTIVE[key]
                              : RETURN_LEVEL_COLORS[key]
                          }`}
                        >
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {aa.returnLevels[key as keyof typeof aa.returnLevels]}
                          </span>
                          <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {aa.returnLevels[`${key}Desc` as keyof typeof aa.returnLevels]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Financial Situation */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{aa.step3Title}</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{aa.step3Desc}</p>
                  <div className="space-y-5">
                    {/* Currency selector */}
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {aa.currency}
                      </label>
                      <div className="flex gap-3">
                        {(['CNY', 'USD'] as const).map(cur => (
                          <button
                            key={cur}
                            onClick={() => setFormData(prev => ({ ...prev, currency: cur }))}
                            className={`px-4 py-2 rounded-md border text-sm transition-all ${
                              formData.currency === cur
                                ? 'border-glacier-500 bg-glacier-500/10 text-glacier-500'
                                : 'border-white/10 hover:border-white/20'
                            }`}
                            style={{ color: formData.currency === cur ? undefined : 'var(--text-primary)' }}
                          >
                            {cur === 'CNY' ? aa.currencyCNY : aa.currencyUSD}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Invest amount */}
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {aa.investAmount}
                      </label>
                      <input
                        type="number"
                        value={formData.investAmount}
                        onChange={e => setFormData(prev => ({ ...prev, investAmount: e.target.value }))}
                        placeholder={aa.investAmountPlaceholder}
                        className="gemini-input w-full px-4 py-3 rounded-[12px] text-sm font-mono"
                      />
                    </div>

                    {/* Total assets */}
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {aa.totalAssets}
                      </label>
                      <input
                        type="number"
                        value={formData.totalAssets}
                        onChange={e => setFormData(prev => ({ ...prev, totalAssets: e.target.value }))}
                        placeholder={aa.totalAssetsPlaceholder}
                        className="gemini-input w-full px-4 py-3 rounded-[12px] text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Market Outlook */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{aa.step4Title}</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{aa.step4Desc}</p>
                  <div className="space-y-6">
                    {/* Market outlook */}
                    <div>
                      <label className="block text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {aa.marketOutlook}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {outlookKeys.map(key => {
                          const isSelected = formData.marketOutlook === key;
                          return (
                            <button
                              key={key}
                              onClick={() => setFormData(prev => ({ ...prev, marketOutlook: key }))}
                              className={`flex items-start gap-3 p-4 rounded-md border transition-all text-left ${
                                isSelected
                                  ? 'border-glacier-500 bg-glacier-500/10'
                                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                              }`}
                            >
                              <span className="text-xl mt-0.5">{OUTLOOK_ICONS[key]}</span>
                              <div>
                                <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>
                                  {aa.outlookOptions[key as keyof typeof aa.outlookOptions]}
                                </span>
                                <span className="text-xs mt-0.5 block" style={{ color: 'var(--text-secondary)' }}>
                                  {aa.outlookOptions[`${key}Desc` as keyof typeof aa.outlookOptions]}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Investment horizon */}
                    <div>
                      <label className="block text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {aa.investmentHorizon}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {horizonKeys.map(key => {
                          const isSelected = formData.investmentHorizon === key;
                          return (
                            <button
                              key={key}
                              onClick={() => setFormData(prev => ({ ...prev, investmentHorizon: key }))}
                              className={`px-4 py-2 rounded-md border text-xs transition-all ${
                                isSelected
                                  ? 'border-glacier-500 bg-glacier-500/10 text-glacier-500'
                                  : 'border-white/10 hover:border-white/20'
                              }`}
                              style={{ color: isSelected ? undefined : 'var(--text-primary)' }}
                            >
                              {aa.horizonOptions[key as keyof typeof aa.horizonOptions]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Preferences */}
              {currentStep === 5 && (
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{aa.step5Title}</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{aa.step5Desc}</p>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {aa.existingAssets}
                      </label>
                      <textarea
                        value={formData.existingAssets}
                        onChange={e => setFormData(prev => ({ ...prev, existingAssets: e.target.value }))}
                        placeholder={aa.existingAssetsPlaceholder}
                        rows={3}
                        className="gemini-input w-full px-4 py-3 rounded-[12px] text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {aa.interests}
                      </label>
                      <textarea
                        value={formData.interests}
                        onChange={e => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                        placeholder={aa.interestsPlaceholder}
                        rows={3}
                        className="gemini-input w-full px-4 py-3 rounded-[12px] text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 px-4 py-2 rounded-md bg-decay/10 border border-decay/30 text-decay text-xs">
                  {error}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={goPrev}
                  disabled={currentStep === 1}
                  className={`px-5 py-2.5 rounded-md border text-sm transition-all ${
                    currentStep === 1
                      ? 'border-white/5 text-mist-500 cursor-not-allowed'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  style={{ color: currentStep === 1 ? undefined : 'var(--text-primary)' }}
                >
                  {aa.prev}
                </button>
                <div className="flex gap-3">
                  {currentStep < TOTAL_STEPS ? (
                    <button
                      onClick={goNext}
                      className="px-6 py-2.5 rounded-md bg-glacier-500 hover:bg-glacier-600 text-white text-sm font-medium transition-all"
                    >
                      {aa.next}
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      className="px-6 py-2.5 rounded-md bg-glacier-500 hover:bg-glacier-600 text-white text-sm font-medium transition-all"
                    >
                      {aa.generate}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="gemini-card p-8 md:p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-glacier-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-glacier-500 border-t-transparent animate-spin" />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {aa.generating}
                </span>
              </div>
              <div className="mt-6 flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-glacier-500/60"
                    style={{
                      animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error after generate */}
          {!isGenerating && error && recommendation === null && currentStep === 5 && (
            <div className="mt-4 px-4 py-2 rounded-md bg-decay/10 border border-decay/30 text-decay text-xs text-center">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {recommendation && (
          <div ref={resultRef} className="max-w-4xl mx-auto mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {aa.resultTitle}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-glacier-500/30 hover:border-glacier-500/60 hover:bg-glacier-500/10 text-xs transition-all text-glacier-500"
                >
                  <Download className="w-3.5 h-3.5" />
                  {locale === 'zh' ? '导出图片' : 'Export'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-md border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs transition-all"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {aa.regenerate}
                </button>
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 rounded-md border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs transition-all"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {aa.startOver}
                </button>
              </div>
            </div>
            <div ref={reportRef} className="gemini-card p-6 md:p-8">
              {chartData && (
                <AllocationCharts chartData={chartData} theme={theme} currency={formData.currency} />
              )}
              <div className="prose-gemini text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {recommendation}
                </ReactMarkdown>
              </div>
            </div>
            <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-muted, #64748b)' }}>
              {aa.disclaimer}
            </p>
          </div>
        )}

        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          targetRef={reportRef as React.RefObject<HTMLDivElement>}
          fileName={locale === 'zh' ? '资产配置方案' : 'Asset_Allocation_Plan'}
        />
      </div>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title={t.home.contact.title}
        scanQr={t.home.contact.scanQr}
        lookForward={t.home.contact.lookForward}
        wechatLabel={t.home.faq.wechat}
        emailLabel={t.home.faq.email}
      />
    </div>
  );
}
