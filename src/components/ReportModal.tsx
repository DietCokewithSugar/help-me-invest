import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from 'lucide-react';
import Report from '@/components/Report';
import { useReportAnalysis } from '@/hooks/useReportAnalysis';
import { LinearLoader, LOADING_STEPS } from '@/components/LinearLoader';
import type { MarketType } from '@/types';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
    market: MarketType;
    companyName: string;
}

export default function ReportModal({ isOpen, onClose, symbol, market, companyName }: ReportModalProps) {
    const {
        loading,
        reportData,
        error,
        loadingStep,
        analyze,
        reset,
        setLoadingStep
    } = useReportAnalysis();

    // Trigger analysis when modal opens
    useEffect(() => {
        if (isOpen && symbol) {
            analyze(symbol, market);
        } else {
            reset();
        }
    }, [isOpen, symbol, market, analyze, reset]);

    // Handle loading steps animation linkage
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [loading, setLoadingStep]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-7xl h-full max-h-[90vh] bg-obsidian border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface/50 backdrop-blur-md z-10">
                            <div>
                                <h2 className="text-xl font-medium text-white">{companyName}</h2>
                                <div className="flex items-center gap-2 text-sm text-mist-500 font-mono">
                                    <span>{symbol}</span>
                                    <span className="px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 text-[10px]">
                                        {market}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist-400 hover:text-white transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                            {loading && !reportData && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                                    <LinearLoader step={loadingStep} totalSteps={LOADING_STEPS.length} />
                                </div>
                            )}

                            {error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                        <XIcon className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">分析失败</h3>
                                    <p className="text-mist-400 max-w-md">{error}</p>
                                    <button
                                        onClick={() => analyze(symbol, market)}
                                        className="mt-6 px-6 py-2 rounded-lg bg-glacier-500 text-white font-medium hover:bg-glacier-600 transition-colors"
                                    >
                                        重试
                                    </button>
                                </div>
                            )}

                            {reportData && (
                                <div className="p-4 md:p-6 pb-20">
                                    <Report
                                        data={reportData}
                                        onReset={onClose}
                                        // Hide "Back to Search" button inside the report since we have modal close
                                        isModalView={true}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
