'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Lightbulb, MessageSquare, MoreHorizontal, ThumbsUp, ThumbsDown, MessageCircle, Plus, X } from 'lucide-react';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { withLocale } from '@/lib/locale-path';
import { useFeedbackIdentity } from '@/hooks/useFeedbackIdentity';
import FeedbackComposer from '@/components/feedback/FeedbackComposer';
import TranslatableBody from '@/components/feedback/TranslatableBody';
import type { FeedbackCategory, FeedbackIssue } from '@/types';
import { formatRelativeTime } from '@/lib/relative-time';

const SORT_KEYS = ['newest', 'top', 'discussed'] as const;
type SortKey = typeof SORT_KEYS[number];

const CATEGORY_ICON: Record<FeedbackCategory, JSX.Element> = {
  bug: <Bug className="w-3.5 h-3.5" />,
  ux: <MessageSquare className="w-3.5 h-3.5" />,
  feature: <Lightbulb className="w-3.5 h-3.5" />,
  other: <MoreHorizontal className="w-3.5 h-3.5" />,
};

const CATEGORY_COLOR: Record<FeedbackCategory, string> = {
  bug: 'bg-red-500/15 text-red-300 border-red-500/30',
  ux: 'bg-glacier-500/15 text-glacier-300 border-glacier-500/30',
  feature: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  other: 'bg-white/10 text-mist-300 border-white/15',
};

const PAGE_LIMIT = 20;

export default function FeedbackPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const fbT = t.feedback;
  const { identityId } = useFeedbackIdentity();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [voteByIssue, setVoteByIssue] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [category, setCategory] = useState<FeedbackCategory | 'all'>('all');
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'dark' | 'light' | null) || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const fetchIssues = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      const nextOffset = opts.reset ? 0 : offset;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('sort', sort);
        params.set('limit', String(PAGE_LIMIT));
        params.set('offset', String(nextOffset));
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (category !== 'all') params.set('category', category);
        if (identityId) params.set('voterId', identityId);

        const response = await fetch(`/api/feedback/issues?${params.toString()}`);
        const data = await response.json().catch(() => ({}));
        if (data?.success) {
          setTotal(data.total || 0);
          setVoteByIssue((prev) => (opts.reset ? data.voteByIssue || {} : { ...prev, ...(data.voteByIssue || {}) }));
          setIssues((prev) => (opts.reset ? data.data : [...prev, ...data.data]));
          setOffset(nextOffset + (data.data?.length || 0));
        }
      } catch (err) {
        console.error('Failed to load feedback list:', err);
      } finally {
        setLoading(false);
      }
    },
    [offset, sort, searchQuery, category, identityId],
  );

  // Initial / filter-change load. The fetch function captures `offset`, so we
  // intentionally reset offset to 0 by calling with `{ reset: true }`.
  useEffect(() => {
    setOffset(0);
    fetchIssues({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, category, identityId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchIssues({ reset: true });
  };

  const handleVote = async (issueId: string, nextVote: 1 | -1) => {
    if (!identityId) return;
    const prevVote = voteByIssue[issueId] || 0;
    const effective: -1 | 0 | 1 = prevVote === nextVote ? 0 : nextVote;

    // Optimistic update.
    setIssues((list) =>
      list.map((row) => {
        if (row.id !== issueId) return row;
        const upDelta = (effective === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0);
        const downDelta = (effective === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0);
        return { ...row, upvotes: row.upvotes + upDelta, downvotes: row.downvotes + downDelta };
      }),
    );
    setVoteByIssue((prev) => ({ ...prev, [issueId]: effective }));

    try {
      const response = await fetch('/api/feedback/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'issue', targetId: issueId, voterId: identityId, vote: effective }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        // Roll back on failure.
        setIssues((list) =>
          list.map((row) => (row.id === issueId
            ? { ...row, upvotes: row.upvotes - 0, downvotes: row.downvotes - 0 }
            : row)),
        );
        setVoteByIssue((prev) => ({ ...prev, [issueId]: prevVote }));
      } else {
        // Replace counters with server-authoritative values just in case.
        setIssues((list) =>
          list.map((row) => (row.id === issueId
            ? { ...row, upvotes: data.upvotes, downvotes: data.downvotes }
            : row)),
        );
      }
    } catch {
      setVoteByIssue((prev) => ({ ...prev, [issueId]: prevVote }));
    }
  };

  const onSubmitted = (issue: FeedbackIssue) => {
    setComposerOpen(false);
    setIssues((list) => [issue, ...list]);
    setTotal((n) => n + 1);
  };

  const remaining = useMemo(() => Math.max(total - offset, 0), [total, offset]);
  const hasMore = remaining > 0 && issues.length < total;

  return (
    <div className="min-h-screen bg-main-bg transition-colors duration-200">
      <div className="fixed inset-0 bg-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onReset={() => router.push(withLocale(locale, '/'))}
      />

      <div className="pt-32 pb-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">{fbT.pageTitle}</h2>
              <p className="text-text-secondary text-sm md:text-base">{fbT.pageSubtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-text-primary leading-none">{total}</div>
                <div className="text-[10px] text-text-muted mt-1 font-mono uppercase tracking-wider">
                  {fbT.countLabel(total)}
                </div>
              </div>
              <button
                onClick={() => setComposerOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-glacier-500 hover:bg-glacier-400 text-obsidian font-semibold text-sm transition-colors"
              >
                {composerOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {composerOpen ? fbT.composer.cancel : fbT.newIssue}
              </button>
            </div>
          </div>

          {/* Composer */}
          <AnimatePresence>
            {composerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-1">
                  <FeedbackComposer onSubmitted={onSubmitted} onCancel={() => setComposerOpen(false)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={fbT.searchPlaceholder}
                className="w-full px-3 py-2 rounded-sm bg-white/5 border border-white/10 text-sm text-mist-200 placeholder-mist-600 focus:outline-none focus:border-glacier-500/50"
              />
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex p-0.5 bg-white/5 border border-white/10 rounded-sm">
                {SORT_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-sm transition-all whitespace-nowrap ${
                      sort === key
                        ? 'bg-glacier-500 text-obsidian font-bold'
                        : 'text-mist-500 hover:text-mist-200'
                    }`}
                  >
                    {fbT[`sort${key.charAt(0).toUpperCase() + key.slice(1)}` as 'sortNewest' | 'sortTop' | 'sortDiscussed']}
                  </button>
                ))}
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory | 'all')}
                className="px-2.5 py-1 text-xs rounded-sm bg-white/5 border border-white/10 text-mist-300 focus:outline-none focus:border-glacier-500/50"
              >
                <option value="all">{fbT.categories.all}</option>
                {(['bug', 'ux', 'feature', 'other'] as FeedbackCategory[]).map((key) => (
                  <option key={key} value={key}>{fbT.categories[key]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue list */}
          <div className="space-y-3">
            {issues.length === 0 && !loading ? (
              <div className="rounded-md border border-dashed border-white/10 px-6 py-12 text-center">
                <p className="text-mist-300 mb-2">{fbT.empty}</p>
                <p className="text-mist-500 text-xs">{fbT.emptyHint}</p>
              </div>
            ) : (
              issues.map((issue) => {
                const userVote = voteByIssue[issue.id] || 0;
                const score = issue.upvotes - issue.downvotes;
                return (
                  <div
                    key={issue.id}
                    className="rounded-md border border-white/10 bg-white/5 hover:border-glacier-500/30 transition-colors p-4 md:p-5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Vote column */}
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <button
                          onClick={() => handleVote(issue.id, 1)}
                          aria-label={fbT.detail.voteUp}
                          className={`p-1 rounded-sm border transition-colors ${
                            userVote === 1
                              ? 'bg-glacier-500/20 border-glacier-500/50 text-glacier-300'
                              : 'bg-white/5 border-white/10 text-mist-500 hover:bg-white/10 hover:text-mist-300'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-xs font-mono font-semibold ${score > 0 ? 'text-glacier-300' : score < 0 ? 'text-red-300' : 'text-mist-400'}`}>
                          {score}
                        </span>
                        <button
                          onClick={() => handleVote(issue.id, -1)}
                          aria-label={fbT.detail.voteDown}
                          className={`p-1 rounded-sm border transition-colors ${
                            userVote === -1
                              ? 'bg-red-500/20 border-red-500/50 text-red-300'
                              : 'bg-white/5 border-white/10 text-mist-500 hover:bg-white/10 hover:text-mist-300'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase border ${CATEGORY_COLOR[issue.category]}`}>
                            {CATEGORY_ICON[issue.category]}
                            {fbT.categories[issue.category]}
                          </span>
                          <span className="text-[10px] text-mist-500 font-mono">
                            {issue.author_name || fbT.detail.authorAnonymous}
                          </span>
                          <span className="text-[10px] text-mist-600">·</span>
                          <span className="text-[10px] text-mist-500 font-mono">
                            {formatRelativeTime(issue.created_at, locale, fbT.relativeTime)}
                          </span>
                        </div>

                        <Link href={withLocale(locale, `/feedback/${issue.id}`)} className="block group">
                          <h3 className="text-base md:text-lg font-semibold text-mist-100 group-hover:text-glacier-300 transition-colors mb-2 break-words">
                            {issue.title}
                          </h3>
                          <TranslatableBody
                            text={issue.body.length > 240 ? `${issue.body.slice(0, 240)}…` : issue.body}
                            sourceLang={issue.language}
                            size="sm"
                            className="text-sm text-mist-400 line-clamp-3"
                          />
                        </Link>

                        <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-mist-500">
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {fbT.detail.commentCount(issue.comment_count)}
                          </span>
                          <Link href={withLocale(locale, `/feedback/${issue.id}`)} className="ml-auto text-glacier-400 hover:text-glacier-300">
                            {fbT.open} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchIssues()}
                disabled={loading}
                className="px-4 py-1.5 text-sm rounded-sm border border-white/10 text-mist-300 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {loading ? fbT.loading : fbT.loadMore}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
