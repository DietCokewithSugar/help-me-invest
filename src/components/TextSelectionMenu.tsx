'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Loader2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface SelectionState {
    text: string;
    rect: DOMRect | null;
}

export default function TextSelectionMenu() {
    const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null });
    const [showButton, setShowButton] = useState(false);
    const [showPopover, setShowPopover] = useState(false);
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState('');
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const { locale, t } = useLanguage();

    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null); // Kept for type safety, though conditional in render
    const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (showPopover) return;

            // Debounce selection changes
            if (selectionTimeoutRef.current) {
                clearTimeout(selectionTimeoutRef.current);
            }

            selectionTimeoutRef.current = setTimeout(() => {
                const activeSelection = window.getSelection();
                const text = activeSelection?.toString().trim();

                if (text && text.length > 1 && text.length < 1000) {
                    const range = activeSelection?.getRangeAt(0);
                    const rect = range?.getBoundingClientRect();
                    if (rect && rect.width > 0) {
                        setSelection({
                            text: text,
                            rect: rect,
                        });
                        setShowButton(true);
                        return;
                    }
                }

                // Only hide button if we are not showing the popover
                // and strictly if logic dictates we lost selection or it's invalid
                if (!showPopover) {
                    setShowButton(false);
                }
            }, 150); // 150ms debounce
        };

        // Use selectionchange for better mobile support
        document.addEventListener('selectionchange', handleSelectionChange);

        // Keep scroll listener to update position if needed, or hide on scroll?
        // Usually scroll hides selection menus
        const handleScroll = () => {
            if (showButton && !showPopover) setShowButton(false);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (popoverRef.current?.contains(e.target as Node)) {
                return;
            }

            // On mobile, the button might not be in the same "flow", but we still check
            // Note: On mobile fixed button, we usually want explicit close or tapping outside mask
            if (buttonRef.current?.contains(e.target as Node)) {
                return;
            }

            setShowPopover(false);
            setShowButton(false);
            setExplanation('');
            setError('');
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
        };
    }, [showPopover, showButton]);

    const handleExplain = async () => {
        if (!selection.text) return;

        setLoading(true);
        setError('');
        setShowButton(false);
        setShowPopover(true);

        try {
            const response = await fetch('/api/explain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: selection.text, language: locale }),
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || '解释请求失败');
                }
                setExplanation(data.explanation);
            } else {
                const text = await response.text();
                console.error('Non-JSON response from /api/explain:', text.substring(0, 200));
                throw new Error('服务响应格式错误，请稍后再试');
            }
        } catch (err: any) {
            setError(err.message || '发生未知错误');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(explanation || selection.text);
    };

    if (!selection.rect && !showPopover) return null; // Logic check: selection.rect is needed for button position on desktop

    // Desktop Position Calculation
    const buttonTop = selection.rect ? selection.rect.top + window.scrollY - 36 : 0;
    const buttonLeft = selection.rect ? selection.rect.left + window.scrollX + (selection.rect.width / 2) - 40 : 0;

    const popoverTop = selection.rect ? selection.rect.bottom + window.scrollY + 10 : 0;
    const popoverLeft = selection.rect ? Math.min(Math.max(10, selection.rect.left + window.scrollX), window.innerWidth - 330) : 0;

    return createPortal(
        <>
            {/* Trigger Button */}
            <AnimatePresence>
                {showButton && !showPopover && (
                    <motion.button
                        ref={buttonRef}
                        initial={{ opacity: 0, y: 20, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 20, x: "-50%" }}
                        className="fixed bottom-6 left-1/2 z-[9999] flex items-center gap-2 px-6 py-3 bg-surface border border-slate-200 dark:border-white/10 rounded-full shadow-xl hover:scale-105 transition-transform cursor-pointer"
                        onClick={handleExplain}
                    >
                        <MessageSquare size={16} className="text-teal-600 dark:text-glacier-500" />
                        <span className="font-medium text-sm theme-text-primary whitespace-nowrap">{t.textSelection.aiExplain}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Result Popover / Sheet */}
            <AnimatePresence>
                {showPopover && (
                    isMobile ? (
                        // Mobile: Bottom Sheet Overlay
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 z-[9998] backdrop-blur-[2px]"
                                onClick={() => setShowPopover(false)}
                            />
                            <motion.div
                                ref={popoverRef}
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed bottom-0 left-0 right-0 z-[9999] bg-surface rounded-t-2xl shadow-2xl border-t border-slate-200 dark:border-white/10 max-h-[80vh] flex flex-col"
                            >
                                {/* Mobile Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-teal-500 rounded-full" />
                                        <span className="font-bold text-base text-slate-900 dark:text-white">{t.textSelection.aiInsight}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        {!loading && !error && (
                                            <button onClick={handleCopy} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-mist-400">
                                                <Copy size={16} />
                                            </button>
                                        )}
                                        <button onClick={() => setShowPopover(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-mist-400">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile Content */}
                                <div className="p-5 overflow-y-auto min-h-[200px]">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                                            <Loader2 size={32} className="animate-spin text-teal-600 dark:text-glacier-500" />
                                            <span className="text-sm text-mist-500">{t.textSelection.analyzing}</span>
                                        </div>
                                    ) : error ? (
                                        <div className="text-decay p-4 bg-red-500/5 border border-decay/20 rounded-lg text-sm">
                                            {error}
                                        </div>
                                    ) : (
                                        <div className="prose-gemini prose-sm max-w-none prose-p:my-2 leading-relaxed">
                                            <ReactMarkdown>{explanation}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                                {selection.text && (
                                    <div className="px-5 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/10 text-xs text-mist-500 truncate font-mono">
                                        SELECTED: {selection.text.substring(0, 40)}{selection.text.length > 40 ? '...' : ''}
                                    </div>
                                )}
                            </motion.div>
                        </>
                    ) : (
                        // Desktop: Popover
                        <motion.div
                            ref={popoverRef}
                            initial={{ opacity: 0, scale: 0.98, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 5 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'absolute',
                                top: popoverTop,
                                left: popoverLeft,
                                zIndex: 9999,
                            }}
                            className="w-[320px] md:w-[360px] bg-surface border border-slate-200 dark:border-white/10 rounded-md shadow-2xl overflow-hidden flex flex-col transition-colors"
                        >
                            {/* Existing Desktop Header & Content logic... copied for consistency */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold tracking-wider text-teal-600 dark:text-glacier-500 uppercase">{t.textSelection.aiInsightDesktop}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!loading && !error && (
                                        <button onClick={handleCopy} className="p-1.5 text-slate-400 dark:text-mist-500 hover:text-slate-700 dark:hover:text-mist-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-sm transition-colors" title="复制结果">
                                            <Copy size={13} />
                                        </button>
                                    )}
                                    <button onClick={() => setShowPopover(false)} className="p-1.5 text-slate-400 dark:text-mist-500 hover:text-slate-700 dark:hover:text-mist-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-sm transition-colors" title="关闭">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 text-sm leading-relaxed max-h-[350px] overflow-y-auto">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                                        <Loader2 size={20} className="animate-spin text-teal-600 dark:text-glacier-500" />
                                        <span className="text-xs text-mist-500 dark:text-mist-500 font-medium">{t.textSelection.analyzingShort}</span>
                                    </div>
                                ) : error ? (
                                    <div className="text-decay text-xs p-2 bg-red-500/5 border border-decay/20 rounded-sm">
                                        {error}
                                    </div>
                                ) : (
                                    <div className="prose-gemini prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0">
                                        <ReactMarkdown>{explanation}</ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {selection.text && (
                                <div className="px-4 py-2.5 bg-slate-50/30 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-400 dark:text-mist-500 truncate font-mono">
                                    SOURCE: "{selection.text}"
                                </div>
                            )}
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </>,
        document.body
    );
}
