'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AIShowcase() {
  const { t } = useLanguage();
  const [currentStock, setCurrentStock] = useState(0);
  const [activeDimension, setActiveDimension] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [typedText, setTypedText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const ANALYSIS_DIMENSIONS = [
    { id: 'revenue', label: t.aiShowcase.revenueStructure, detail: t.aiShowcase.revenueDesc },
    { id: 'position', label: t.aiShowcase.industryPosition, detail: t.aiShowcase.industryDesc },
    { id: 'advantage', label: t.aiShowcase.competitiveAdvantage, detail: t.aiShowcase.competitiveDesc },
    { id: 'risk', label: t.aiShowcase.riskFactors, detail: t.aiShowcase.riskDesc },
    { id: 'valuation', label: t.aiShowcase.valuationAnalysis, detail: t.aiShowcase.valuationDesc },
  ];

  const DEMO_STOCKS = [
    { symbol: 'NVDA', name: t.aiShowcase.nvidia, sector: t.aiShowcase.semiconductor },
    { symbol: 'AAPL', name: t.aiShowcase.apple, sector: t.aiShowcase.consumerElectronics },
    { symbol: 'TSLA', name: t.aiShowcase.tesla, sector: t.aiShowcase.newEnergyVehicle },
  ];

  const stock = DEMO_STOCKS[currentStock];
  const dimension = ANALYSIS_DIMENSIONS[activeDimension];
  
  useEffect(() => {
    const stockCount = DEMO_STOCKS.length;
    const interval = setInterval(() => {
      setCurrentStock(prev => (prev + 1) % stockCount);
      setActiveDimension(0);
      setTypedText('');
    }, 12000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    const dimCount = ANALYSIS_DIMENSIONS.length;
    const interval = setInterval(() => {
      setActiveDimension(prev => (prev + 1) % dimCount);
      setTypedText('');
      setIsTyping(true);
    }, 2400);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStock]);
  
  useEffect(() => {
    if (!isTyping) return;
    
    const text = dimension.detail;
    let index = 0;
    
    const timer = setInterval(() => {
      if (index <= text.length) {
        setTypedText(text.slice(0, index));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 50);
    
    return () => clearInterval(timer);
  }, [dimension, isTyping]);
  
  return (
    <div ref={containerRef} className="relative">
      <div className="glass-card p-8 md:p-12 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-glacier-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-gemini-blue/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left - Stock info */}
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-mist-500 text-sm tracking-wider uppercase">{t.aiShowcase.title}</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={stock.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-4xl md:text-5xl font-light text-white tracking-tight">
                    {stock.symbol}
                  </h3>
                  <p className="text-xl text-mist-400 mt-1">{stock.name}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Terminal */}
            <div className="bg-obsidian/80 rounded-2xl p-6 font-mono text-sm border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-mist-600 text-xs">{t.aiShowcase.terminal}</span>
              </div>
              
              <div className="space-y-2 text-mist-400">
                <p><span className="text-glacier-400">$</span> analyze --symbol {stock.symbol}</p>
                <p className="text-mist-600"># Fetching financial data...</p>
                <p className="text-mist-600"># Running AI analysis...</p>
                <div className="flex items-center gap-2">
                  <span className="text-glacier-400">{'>'}</span>
                  <span className="text-white">{typedText}</span>
                  <span className="w-2 h-4 bg-glacier-400 animate-blink" />
                </div>
              </div>
            </div>
            
            {/* Stock switcher */}
            <div className="flex items-center gap-3">
              {DEMO_STOCKS.map((s, i) => (
                <button
                  key={s.symbol}
                  onClick={() => {
                    setCurrentStock(i);
                    setActiveDimension(0);
                    setTypedText('');
                  }}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                    i === currentStock
                      ? 'bg-glacier-500/20 text-glacier-400 border border-glacier-500/30'
                      : 'text-mist-500 hover:text-mist-400'
                  }`}
                >
                  {s.symbol}
                </button>
              ))}
            </div>
          </div>
          
          {/* Right - Analysis dimensions */}
          <div className="space-y-4">
            <p className="text-mist-500 text-sm mb-6">{t.aiShowcase.dimensions}</p>
            
            {ANALYSIS_DIMENSIONS.map((dim, index) => (
              <motion.div
                key={dim.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-4 rounded-xl transition-all duration-500 ${
                  index === activeDimension
                    ? 'bg-white/5 border border-glacier-500/30'
                    : 'border border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${
                    index < activeDimension
                      ? 'bg-glacier-500/20'
                      : index === activeDimension
                        ? 'bg-gradient-to-br from-glacier-500 to-gemini-blue'
                        : 'bg-white/5'
                  }`}>
                    {index < activeDimension ? (
                      <svg className="w-5 h-5 text-glacier-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : index === activeDimension ? (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 bg-mist-600 rounded-full" />
                    )}
                  </div>
                  
                  {/* Dimension info */}
                  <div className="flex-1">
                    <h4 className={`font-medium transition-colors ${
                      index === activeDimension ? 'text-white' : 'text-mist-400'
                    }`}>
                      {dim.label}
                    </h4>
                    {index === activeDimension && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-sm text-mist-500 mt-1"
                      >
                        {dim.detail}
                      </motion.p>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  {index === activeDimension && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-glacier-500 to-gemini-blue"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2.4, ease: 'linear' }}
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
