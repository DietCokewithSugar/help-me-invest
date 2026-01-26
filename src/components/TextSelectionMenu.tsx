'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Loader2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

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
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (showPopover) return;

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

            if (!showPopover) {
                setShowButton(false);
            }
        };

        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);

        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current?.contains(e.target as Node)) {
                return;
            }

            if (buttonRef.current?.contains(e.target as Node)) {
                return;
            }

            setShowPopover(false);
            setShowButton(false);
            setExplanation('');
            setError('');
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mouseup', handleSelectionChange);
            document.removeEventListener('keyup', handleSelectionChange);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPopover]);

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
                body: JSON.stringify({ text: selection.text }),
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || '解释请求失败');
                }
                setExplanation(data.explanation);
            } else {
                // If response is not JSON (e.g. HTML error page), handle it gracefully
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

    if (!selection.rect) return null;

    const buttonTop = selection.rect.top + window.scrollY - 36;
    const buttonLeft = selection.rect.left + window.scrollX + (selection.rect.width / 2) - 40;

    return createPortal(
        <>
            <AnimatePresence>
                {showButton && !showPopover && (
                    <motion.button
                        ref={buttonRef}
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                        transition={{ duration: 0.1 }}
                        style={{
                            position: 'absolute',
                            top: buttonTop,
                            left: buttonLeft,
                            zIndex: 9999,
                        }}
                        onClick={handleExplain}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface dark:bg-surface border border-slate-200 dark:border-white/10 rounded-md shadow-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer text-xs font-medium theme-text-primary"
                    >
                        <MessageSquare size={13} className="text-teal-600 dark:text-glacier-500" />
                        <span>AI 解读</span>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPopover && (
                    <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, scale: 0.98, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 5 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: selection.rect.bottom + window.scrollY + 10,
                            left: Math.min(Math.max(10, selection.rect.left + window.scrollX), window.innerWidth - 330),
                            zIndex: 9999,
                        }}
                        className="w-[320px] md:w-[360px] bg-surface border border-slate-200 dark:border-white/10 rounded-md shadow-2xl overflow-hidden flex flex-col transition-colors"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold tracking-wider text-teal-600 dark:text-glacier-500 uppercase">AI Insight</span>
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

                        {/* Content */}
                        <div className="p-4 text-sm leading-relaxed max-h-[350px] overflow-y-auto">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                    <Loader2 size={20} className="animate-spin text-teal-600 dark:text-glacier-500" />
                                    <span className="text-xs text-mist-500 dark:text-mist-500 font-medium">分析中...</span>
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

                        {/* Context Footer */}
                        {selection.text && (
                            <div className="px-4 py-2.5 bg-slate-50/30 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-400 dark:text-mist-500 truncate font-mono">
                                SOURCE: "{selection.text}"
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>,
        document.body
    );
}
