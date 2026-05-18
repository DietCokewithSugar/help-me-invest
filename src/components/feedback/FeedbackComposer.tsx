'use client';

import { useId, useState, FormEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedbackIdentity } from '@/hooks/useFeedbackIdentity';
import type { FeedbackCategory, FeedbackIssue } from '@/types';

interface FeedbackComposerProps {
  /** Visual variant — compact for the widget popover, full for the page. */
  variant?: 'compact' | 'full';
  /** Pre-fill the category (e.g. quick-feedback widget defaults to 'ux'). */
  defaultCategory?: FeedbackCategory;
  /** Called after a successful submission with the created issue. */
  onSubmitted?: (issue: FeedbackIssue) => void;
  /** Cancel button visibility. */
  onCancel?: () => void;
}

const CATEGORY_KEYS: FeedbackCategory[] = ['bug', 'ux', 'feature', 'other'];

export default function FeedbackComposer({
  variant = 'full',
  defaultCategory = 'ux',
  onSubmitted,
  onCancel,
}: FeedbackComposerProps) {
  const { t, locale } = useLanguage();
  const composerT = t.feedback.composer;
  const categoriesT = t.feedback.categories;
  const { identityId, displayName, setDisplayName, ready } = useFeedbackIdentity();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(displayName || '');

  const ids = {
    title: useId(),
    body: useId(),
    name: useId(),
    error: useId(),
    categoryGroup: useId(),
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;

    if (!title.trim()) {
      setError(composerT.validateTitle);
      return;
    }
    if (!body.trim()) {
      setError(composerT.validateBody);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const trimmedName = nameDraft.trim();
      if (trimmedName !== displayName) {
        setDisplayName(trimmedName);
      }
      const response = await fetch('/api/feedback/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          authorId: identityId,
          authorName: trimmedName || null,
          language: locale,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        setError(data?.error || composerT.submitError);
        setSubmitting(false);
        return;
      }
      setTitle('');
      setBody('');
      onSubmitted?.(data.data as FeedbackIssue);
    } catch (err: any) {
      setError(err?.message || composerT.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const compact = variant === 'compact';

  return (
    <form
      onSubmit={handleSubmit}
      aria-describedby={error ? ids.error : undefined}
      className={`flex flex-col gap-3 ${compact ? '' : 'p-5 rounded-md bg-white/5 border border-white/10'}`}
    >
      <div className="space-y-1">
        <label htmlFor={ids.title} className="text-[11px] font-mono text-mist-500 uppercase tracking-wider">{composerT.titleField}</label>
        <input
          id={ids.title}
          name="title"
          type="text"
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={composerT.titlePlaceholder}
          maxLength={200}
          required
          aria-invalid={!!error && !title.trim()}
          className="w-full px-3 py-2 rounded-sm bg-white/5 border border-white/10 text-sm text-mist-200 placeholder-mist-600 focus:outline-none focus:border-glacier-500/50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={ids.body} className="text-[11px] font-mono text-mist-500 uppercase tracking-wider">{composerT.bodyField}</label>
        <textarea
          id={ids.body}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={composerT.bodyPlaceholder}
          maxLength={8000}
          rows={compact ? 4 : 6}
          required
          aria-invalid={!!error && !body.trim()}
          className="w-full px-3 py-2 rounded-sm bg-white/5 border border-white/10 text-sm text-mist-200 placeholder-mist-600 focus:outline-none focus:border-glacier-500/50 resize-y leading-relaxed"
        />
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        <div className="space-y-1">
          <span id={ids.categoryGroup} className="text-[11px] font-mono text-mist-500 uppercase tracking-wider">{composerT.categoryField}</span>
          <div role="radiogroup" aria-labelledby={ids.categoryGroup} className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={category === key}
                onClick={() => setCategory(key)}
                className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${
                  category === key
                    ? 'bg-glacier-500/20 border-glacier-500/50 text-glacier-300'
                    : 'bg-white/5 border-white/10 text-mist-400 hover:bg-white/10'
                }`}
              >
                {categoriesT[key]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.name} className="text-[11px] font-mono text-mist-500 uppercase tracking-wider">{composerT.nameField}</label>
          <input
            id={ids.name}
            name="name"
            type="text"
            autoComplete="nickname"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder={composerT.namePlaceholder}
            maxLength={60}
            className="w-full px-3 py-2 rounded-sm bg-white/5 border border-white/10 text-sm text-mist-200 placeholder-mist-600 focus:outline-none focus:border-glacier-500/50"
          />
        </div>
      </div>

      {error && (
        <div
          id={ids.error}
          role="alert"
          aria-live="polite"
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded-sm border border-white/10 text-mist-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {composerT.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !ready}
          className="px-4 py-1.5 text-sm rounded-sm bg-glacier-500 hover:bg-glacier-400 text-obsidian font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? composerT.submitting : composerT.submit}
        </button>
      </div>
    </form>
  );
}
