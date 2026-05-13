'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bug, Lightbulb, MessageSquare, MoreHorizontal, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedbackIdentity } from '@/hooks/useFeedbackIdentity';
import TranslatableBody from '@/components/feedback/TranslatableBody';
import { formatRelativeTime } from '@/lib/relative-time';
import type { FeedbackCategory, FeedbackComment, FeedbackIssue } from '@/types';

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

interface CommentNode extends FeedbackComment {
  children: CommentNode[];
}

function buildCommentTree(comments: FeedbackComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CommentNode[] = [];
  comments.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export default function FeedbackDetailPage() {
  const router = useRouter();
  const params = useParams();
  const issueId = (Array.isArray(params?.id) ? params.id[0] : (params?.id as string)) || '';
  const { t, locale } = useLanguage();
  const fbT = t.feedback;
  const { identityId, displayName, setDisplayName, ready } = useFeedbackIdentity();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [issue, setIssue] = useState<FeedbackIssue | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [issueVote, setIssueVote] = useState(0);
  const [voteByComment, setVoteByComment] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [composerBody, setComposerBody] = useState('');
  const [composerName, setComposerName] = useState('');
  const [replyTo, setReplyTo] = useState<FeedbackComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'dark' | 'light' | null) || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    setComposerName(displayName || '');
  }, [displayName]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const fetchDetail = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (identityId) params.set('voterId', identityId);
      const response = await fetch(`/api/feedback/issues/${issueId}?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (response.status === 404 || !data?.success) {
        setNotFound(true);
        return;
      }
      setIssue(data.issue);
      setComments(data.comments || []);
      setIssueVote(data.issueVote || 0);
      setVoteByComment(data.voteByComment || {});
    } catch (err) {
      console.error('Failed to load feedback detail:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [issueId, identityId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  const sendVote = async (
    targetType: 'issue' | 'comment',
    targetId: string,
    nextVote: 1 | -1,
    currentVote: number,
  ) => {
    if (!identityId) return;
    const effective: -1 | 0 | 1 = currentVote === nextVote ? 0 : nextVote;
    try {
      const response = await fetch('/api/feedback/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, voterId: identityId, vote: effective }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) return;
      if (targetType === 'issue') {
        setIssueVote(effective);
        setIssue((prev) => (prev ? { ...prev, upvotes: data.upvotes, downvotes: data.downvotes } : prev));
      } else {
        setVoteByComment((prev) => ({ ...prev, [targetId]: effective }));
        setComments((prev) =>
          prev.map((c) => (c.id === targetId ? { ...c, upvotes: data.upvotes, downvotes: data.downvotes } : c)),
        );
      }
    } catch {
      // Best-effort optimistic UI; ignore.
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !issueId) return;
    if (!composerBody.trim()) {
      setComposerError(fbT.composer.validateBody);
      return;
    }
    setComposerError(null);
    setSubmitting(true);
    try {
      const trimmedName = composerName.trim();
      if (trimmedName !== displayName) {
        setDisplayName(trimmedName);
      }
      const response = await fetch(`/api/feedback/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: composerBody.trim(),
          authorId: identityId,
          authorName: trimmedName || null,
          parentId: replyTo?.id || null,
          language: locale,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        setComposerError(data?.error || fbT.composer.submitError);
        setSubmitting(false);
        return;
      }
      setComments((prev) => [...prev, data.data as FeedbackComment]);
      setIssue((prev) => (prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev));
      setComposerBody('');
      setReplyTo(null);
    } catch (err: any) {
      setComposerError(err?.message || fbT.composer.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (node: CommentNode, depth: number) => {
    const vote = voteByComment[node.id] || 0;
    const score = node.upvotes - node.downvotes;
    return (
      <div key={node.id} className={depth === 0 ? '' : 'mt-3'}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-1">
            <button
              onClick={() => sendVote('comment', node.id, 1, vote)}
              aria-label={fbT.detail.voteUp}
              className={`p-0.5 rounded-sm border transition-colors ${
                vote === 1
                  ? 'bg-glacier-500/20 border-glacier-500/50 text-glacier-300'
                  : 'bg-white/5 border-white/10 text-mist-500 hover:bg-white/10 hover:text-mist-300'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <span className={`text-[10px] font-mono font-semibold ${score > 0 ? 'text-glacier-300' : score < 0 ? 'text-red-300' : 'text-mist-500'}`}>
              {score}
            </span>
            <button
              onClick={() => sendVote('comment', node.id, -1, vote)}
              aria-label={fbT.detail.voteDown}
              className={`p-0.5 rounded-sm border transition-colors ${
                vote === -1
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-white/5 border-white/10 text-mist-500 hover:bg-white/10 hover:text-mist-300'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0 rounded-sm bg-white/5 border border-white/10 p-3">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold text-mist-200">{node.author_name || fbT.detail.authorAnonymous}</span>
              <span className="text-[10px] text-mist-500">·</span>
              <span className="text-[10px] text-mist-500 font-mono">
                {formatRelativeTime(node.created_at, locale, fbT.relativeTime)}
              </span>
            </div>
            <TranslatableBody text={node.body} sourceLang={node.language} size="sm" />
            <button
              onClick={() => setReplyTo(node)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-mist-500 hover:text-glacier-300 transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              {fbT.detail.reply}
            </button>
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="mt-2 pl-6 md:pl-9 border-l border-white/5 space-y-2">
            {node.children.map((child) => renderComment(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-main-bg transition-colors duration-200">
      <div className="fixed inset-0 bg-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onReset={() => router.push('/')}
        showContactModal={() => router.push('/feedback')}
      />

      <div className="pt-32 pb-24 px-4 md:px-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <Link
            href="/feedback"
            className="inline-flex items-center gap-1.5 text-sm text-mist-400 hover:text-glacier-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {fbT.backToList}
          </Link>

          {notFound ? (
            <div className="rounded-md border border-white/10 p-8 text-center text-mist-400">{fbT.notFound}</div>
          ) : loading || !issue ? (
            <div className="rounded-md border border-white/10 p-8 text-center text-mist-500">{fbT.loading}</div>
          ) : (
            <>
              <article className="rounded-md border border-white/10 bg-white/5 p-5 md:p-6">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase border ${CATEGORY_COLOR[issue.category]}`}>
                    {CATEGORY_ICON[issue.category]}
                    {fbT.categories[issue.category]}
                  </span>
                  <span className="text-[11px] text-mist-500 font-mono">
                    {issue.author_name || fbT.detail.authorAnonymous}
                  </span>
                  <span className="text-[11px] text-mist-600">·</span>
                  <span className="text-[11px] text-mist-500 font-mono">
                    {formatRelativeTime(issue.created_at, locale, fbT.relativeTime)}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-mist-100 mb-4 break-words">{issue.title}</h1>

                <TranslatableBody text={issue.body} sourceLang={issue.language} className="text-sm md:text-base text-mist-300" />

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendVote('issue', issue.id, 1, issueVote)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-xs transition-colors ${
                        issueVote === 1
                          ? 'bg-glacier-500/20 border-glacier-500/50 text-glacier-300'
                          : 'bg-white/5 border-white/10 text-mist-400 hover:bg-white/10'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="font-mono">{issue.upvotes}</span>
                    </button>
                    <button
                      onClick={() => sendVote('issue', issue.id, -1, issueVote)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-xs transition-colors ${
                        issueVote === -1
                          ? 'bg-red-500/20 border-red-500/50 text-red-300'
                          : 'bg-white/5 border-white/10 text-mist-400 hover:bg-white/10'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span className="font-mono">{issue.downvotes}</span>
                    </button>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-mist-500 font-mono">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {fbT.detail.commentCount(issue.comment_count)}
                  </span>
                </div>
              </article>

              {/* Comments */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-mist-200 flex items-center gap-2">
                  <span className="w-1 h-4 bg-glacier-500 rounded-sm" />
                  {fbT.detail.commentsTitle}
                  <span className="text-mist-500 font-mono text-xs">({issue.comment_count})</span>
                </h2>

                {commentTree.length === 0 ? (
                  <p className="text-sm text-mist-500 italic">{fbT.detail.noComments}</p>
                ) : (
                  <div className="space-y-3">
                    {commentTree.map((node) => renderComment(node, 0))}
                  </div>
                )}

                {/* Comment composer */}
                <form
                  onSubmit={submitComment}
                  className="space-y-2 rounded-md border border-white/10 bg-white/5 p-4"
                >
                  {replyTo && (
                    <div className="flex items-center justify-between text-xs text-mist-400 bg-white/5 border border-white/10 rounded-sm px-2 py-1.5">
                      <span>{fbT.detail.replyTo(replyTo.author_name || fbT.detail.authorAnonymous)}</span>
                      <button
                        type="button"
                        onClick={() => setReplyTo(null)}
                        className="text-mist-500 hover:text-mist-200"
                      >
                        {fbT.detail.cancelReply}
                      </button>
                    </div>
                  )}
                  <textarea
                    value={composerBody}
                    onChange={(e) => setComposerBody(e.target.value)}
                    placeholder={fbT.detail.addComment}
                    rows={3}
                    maxLength={4000}
                    className="w-full px-3 py-2 rounded-sm bg-white/5 border border-white/10 text-sm text-mist-200 placeholder-mist-600 focus:outline-none focus:border-glacier-500/50 resize-y"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={composerName}
                      onChange={(e) => setComposerName(e.target.value)}
                      placeholder={fbT.composer.namePlaceholder}
                      maxLength={60}
                      className="flex-1 px-3 py-1.5 rounded-sm bg-white/5 border border-white/10 text-xs text-mist-200 placeholder-mist-600 focus:outline-none focus:border-glacier-500/50"
                    />
                    {composerError && <span className="text-xs text-red-400">{composerError}</span>}
                    <button
                      type="submit"
                      disabled={submitting || !ready}
                      className="px-3 py-1.5 text-sm rounded-sm bg-glacier-500 hover:bg-glacier-400 text-obsidian font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? fbT.detail.commentSubmitting : fbT.detail.commentSubmit}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
