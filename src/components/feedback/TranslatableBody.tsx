'use client';

import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

interface TranslatableBodyProps {
  text: string;
  /** Source language of `text`. 'auto' lets the model detect. */
  sourceLang?: string | null;
  /** Tailwind classes for the rendered <p>. */
  className?: string;
  /** Small variant (e.g. comments) shrinks the badge text. */
  size?: 'sm' | 'md';
}

/**
 * Renders user-generated text with an automatic AI translation when the source
 * language doesn't match the UI locale. The translation is rendered by default
 * (so foreign-language posts are immediately readable), with a toggle to flip
 * to the original. Translations live in an in-memory cache (see useAutoTranslate)
 * and the DB row is never modified.
 */
export default function TranslatableBody({
  text,
  sourceLang,
  className = '',
  size = 'md',
}: TranslatableBodyProps) {
  const { locale, t } = useLanguage();
  const translateT = t.feedback.translate;
  const [showOriginal, setShowOriginal] = useState(false);

  const normalizedSource = sourceLang || 'auto';
  // Only request translation when we have a known source that differs from the
  // active locale. Posts created without a language column (legacy / unknown)
  // are rendered as-is to avoid wasteful round-trips and accidental rewrites.
  const needsTranslation = Boolean(text) && normalizedSource !== 'auto' && normalizedSource !== locale;

  const { text: translated, loading, translated: didTranslate, error } = useAutoTranslate(text, {
    sourceLang: normalizedSource,
    targetLang: locale,
    enabled: needsTranslation,
  });

  const display = showOriginal || !didTranslate ? text : translated;
  const showBadge = didTranslate && !showOriginal;
  const showToggle = didTranslate;
  const badgeSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className={className}>
      {(loading || showBadge || error) && (
        <div className={`flex items-center gap-2 mb-2 ${badgeSize} text-mist-500`}>
          {loading && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {translateT.translating}
            </span>
          )}
          {!loading && showBadge && (
            <>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-glacier-500/10 border border-glacier-500/30 text-glacier-300">
                <Languages className="w-3 h-3" />
                {translateT.autoBadge}
              </span>
              {sourceLang && sourceLang !== 'auto' && (
                <span className="text-mist-600">
                  {translateT.sourceLanguage(sourceLang.toUpperCase())}
                </span>
              )}
            </>
          )}
          {!loading && error && (
            <span className="text-red-400/80">{translateT.error}</span>
          )}
          {!loading && showToggle && (
            <button
              type="button"
              onClick={() => setShowOriginal((prev) => !prev)}
              className="ml-auto text-mist-500 hover:text-mist-300 underline-offset-2 hover:underline"
            >
              {showOriginal ? translateT.showTranslation : translateT.showOriginal}
            </button>
          )}
        </div>
      )}
      <p className="whitespace-pre-wrap break-words text-mist-200 leading-relaxed">
        {display}
      </p>
    </div>
  );
}
