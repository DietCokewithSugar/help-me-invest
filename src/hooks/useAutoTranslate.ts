'use client';

import { useEffect, useRef, useState } from 'react';

const translationCache = new Map<string, string>();

function cacheKey(text: string, targetLang: string, sourceLang: string): string {
  return `${targetLang}|${sourceLang}|${text}`;
}

interface AutoTranslateOptions {
  /** Source language of the text. Use 'auto' to let the model detect. */
  sourceLang?: string;
  /** Target language to translate into. */
  targetLang: string;
  /** Disable network translation; just return the original text. */
  enabled?: boolean;
}

interface AutoTranslateResult {
  /** Either the translated text (when translation succeeded) or the original. */
  text: string;
  /** True while the network request is in flight. */
  loading: boolean;
  /** True when the returned text is a successful AI translation of the input. */
  translated: boolean;
  /** Non-null when translation failed. */
  error: string | null;
}

/**
 * useAutoTranslate
 *
 * Sends `text` to /api/feedback/translate when the target language differs from
 * the source language. Results are cached per (text + langs) so flipping
 * between "show original / show translation" is instant.
 *
 * If the target equals the source (or `enabled` is false, or `text` is empty),
 * the original text is returned immediately without any network call.
 */
export function useAutoTranslate(text: string, options: AutoTranslateOptions): AutoTranslateResult {
  const { sourceLang = 'auto', targetLang, enabled = true } = options;
  const sameLang = sourceLang !== 'auto' && sourceLang === targetLang;
  const shouldTranslate = enabled && !sameLang && Boolean(text && text.trim());

  const [state, setState] = useState<{ text: string; loading: boolean; translated: boolean; error: string | null }>(() => ({
    text,
    loading: false,
    translated: false,
    error: null,
  }));

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!shouldTranslate) {
      setState({ text, loading: false, translated: false, error: null });
      return;
    }
    const key = cacheKey(text, targetLang, sourceLang);
    const cached = translationCache.get(key);
    if (cached !== undefined) {
      setState({ text: cached, loading: false, translated: cached !== text, error: null });
      return;
    }
    const reqId = ++requestIdRef.current;
    setState({ text, loading: true, translated: false, error: null });

    fetch('/api/feedback/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (reqId !== requestIdRef.current) return;
        if (!res.ok || !data?.success) {
          setState({ text, loading: false, translated: false, error: data?.error || 'translate-failed' });
          return;
        }
        const translatedText = data.translated || text;
        translationCache.set(key, translatedText);
        const isReallyTranslated = !data.skipped && translatedText && translatedText !== text;
        setState({
          text: translatedText,
          loading: false,
          translated: Boolean(isReallyTranslated),
          error: null,
        });
      })
      .catch((err) => {
        if (reqId !== requestIdRef.current) return;
        setState({ text, loading: false, translated: false, error: err?.message || 'translate-failed' });
      });
  }, [text, targetLang, sourceLang, shouldTranslate]);

  return state;
}
