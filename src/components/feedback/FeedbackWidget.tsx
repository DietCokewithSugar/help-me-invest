'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import FeedbackComposer from './FeedbackComposer';
import type { FeedbackIssue } from '@/types';

/**
 * Global floating "Feedback" button.
 *
 * Pinned bottom-right on every page. Opens a small popover with the same
 * FeedbackComposer used on the /feedback page. After submission the user can
 * either jump to the /feedback board or write another. The popover is hidden
 * while the user is already on a /feedback route to avoid duplication.
 */
export default function FeedbackWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const widgetT = t.feedback.widget;

  const [open, setOpen] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<FeedbackIssue | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const onFeedbackRoute = pathname?.startsWith('/feedback') ?? false;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Reset the "submitted" state whenever the panel is closed so the next open
  // starts at the composer again.
  useEffect(() => {
    if (!open) setLastSubmitted(null);
  }, [open]);

  if (onFeedbackRoute) return null;

  return (
    <div className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[55] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="w-[min(360px,calc(100vw-2.5rem))] rounded-md bg-surface border border-white/10 shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="flex items-start justify-between p-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-mist-100">{widgetT.title}</h3>
                <p className="text-xs text-mist-500 mt-0.5">{widgetT.subtitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-sm bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Close feedback"
              >
                <X className="w-3.5 h-3.5 text-mist-400" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {lastSubmitted ? (
                <div className="text-center space-y-3 py-3">
                  <div className="text-sm font-semibold text-glacier-300">{widgetT.submittedTitle}</div>
                  <p className="text-xs text-mist-400 px-2">{widgetT.submittedHint}</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push(`/feedback/${lastSubmitted.id}`);
                      }}
                      className="px-3 py-1.5 text-xs rounded-sm bg-glacier-500 hover:bg-glacier-400 text-obsidian font-semibold transition-colors"
                    >
                      {widgetT.viewAll}
                    </button>
                    <button
                      onClick={() => setLastSubmitted(null)}
                      className="px-3 py-1.5 text-xs rounded-sm border border-white/10 text-mist-300 hover:bg-white/10 transition-colors"
                    >
                      {widgetT.newAnother}
                    </button>
                  </div>
                </div>
              ) : (
                <FeedbackComposer
                  variant="compact"
                  defaultCategory="ux"
                  onSubmitted={(issue) => setLastSubmitted(issue)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        title={widgetT.tooltip}
        aria-label={widgetT.tooltip}
        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-glacier-500 hover:bg-glacier-400 text-obsidian font-semibold text-sm shadow-lg shadow-glacier-500/30 transition-all"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">{widgetT.open}</span>
      </button>
    </div>
  );
}
