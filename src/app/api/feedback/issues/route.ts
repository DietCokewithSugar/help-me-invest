import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { FeedbackCategory } from '@/types';

const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'ux', 'feature', 'other'];
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 8000;
const MAX_NAME_LENGTH = 60;

type SortKey = 'newest' | 'top' | 'discussed';

function detectLanguage(text: string): string {
  // Lightweight heuristic: if any CJK character is present, treat as Chinese.
  return /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en';
}

/**
 * GET /api/feedback/issues
 *   ?sort=newest|top|discussed (default: newest)
 *   ?q=<search>
 *   ?category=bug|ux|feature|other
 *   ?limit=<int 1-50, default 20>
 *   ?offset=<int, default 0>
 *   ?voterId=<localStorage uuid> -- if provided, return this voter's vote per row
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase 未配置' }, { status: 500 });
  }

  const url = new URL(request.url);
  const sort = (url.searchParams.get('sort') as SortKey) || 'newest';
  const q = (url.searchParams.get('q') || '').trim();
  const category = url.searchParams.get('category') as FeedbackCategory | null;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 20), 1), 50);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
  const voterId = url.searchParams.get('voterId') || '';

  let query = supabase
    .from('feedback_issues')
    .select('*', { count: 'exact' });

  if (category && VALID_CATEGORIES.includes(category)) {
    query = query.eq('category', category);
  }
  if (q) {
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
  }

  if (sort === 'top') {
    // Postgrest doesn't let us order on a computed (upvotes-downvotes) expression
    // directly, so we order primarily by upvotes then by created_at as a stable
    // tiebreaker. Downvote-heavy items still surface less because upvotes lead.
    query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false });
  } else if (sort === 'discussed') {
    query = query.order('comment_count', { ascending: false }).order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('Feedback list error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  let voteByIssue: Record<string, number> = {};
  if (voterId && data && data.length > 0) {
    const ids = data.map((row) => row.id);
    const { data: voteRows, error: voteErr } = await supabase
      .from('feedback_votes')
      .select('target_id, vote')
      .eq('voter_id', voterId)
      .eq('target_type', 'issue')
      .in('target_id', ids);
    if (!voteErr && voteRows) {
      voteByIssue = Object.fromEntries(voteRows.map((row: any) => [row.target_id, row.vote]));
    }
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    total: count || 0,
    limit,
    offset,
    voteByIssue,
  });
}

/**
 * POST /api/feedback/issues
 * Body: { title, body, category, authorId, authorName?, language? }
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase 未配置' }, { status: 500 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const title = String(payload?.title || '').trim().slice(0, MAX_TITLE_LENGTH);
  const body = String(payload?.body || '').trim().slice(0, MAX_BODY_LENGTH);
  const authorId = String(payload?.authorId || '').trim().slice(0, 64);
  const authorName = payload?.authorName
    ? String(payload.authorName).trim().slice(0, MAX_NAME_LENGTH)
    : null;
  const rawCategory = String(payload?.category || 'other');
  const category = (VALID_CATEGORIES.includes(rawCategory as FeedbackCategory)
    ? rawCategory
    : 'other') as FeedbackCategory;
  const language = (payload?.language && typeof payload.language === 'string')
    ? payload.language
    : detectLanguage(`${title}\n${body}`);

  if (!title) {
    return NextResponse.json({ success: false, error: 'Missing title' }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ success: false, error: 'Missing body' }, { status: 400 });
  }
  if (!authorId) {
    return NextResponse.json({ success: false, error: 'Missing authorId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('feedback_issues')
    .insert({
      title,
      body,
      category,
      author_id: authorId,
      author_name: authorName,
      language,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Feedback create error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
