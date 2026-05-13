import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const MAX_BODY_LENGTH = 4000;
const MAX_NAME_LENGTH = 60;

function detectLanguage(text: string): string {
  return /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en';
}

/**
 * POST /api/feedback/issues/:id/comments
 * Body: { body, authorId, authorName?, parentId?, language? }
 *
 * Increments the parent issue's comment_count using a select-then-update so the
 * list view's "discussed" sort stays accurate without a DB trigger.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase 未配置' }, { status: 500 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing issue id' }, { status: 400 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const body = String(payload?.body || '').trim().slice(0, MAX_BODY_LENGTH);
  const authorId = String(payload?.authorId || '').trim().slice(0, 64);
  const authorName = payload?.authorName
    ? String(payload.authorName).trim().slice(0, MAX_NAME_LENGTH)
    : null;
  const parentId = payload?.parentId ? String(payload.parentId) : null;
  const language = (payload?.language && typeof payload.language === 'string')
    ? payload.language
    : detectLanguage(body);

  if (!body) {
    return NextResponse.json({ success: false, error: 'Missing body' }, { status: 400 });
  }
  if (!authorId) {
    return NextResponse.json({ success: false, error: 'Missing authorId' }, { status: 400 });
  }

  const { data: issue, error: issueErr } = await supabase
    .from('feedback_issues')
    .select('id, comment_count')
    .eq('id', id)
    .single();
  if (issueErr || !issue) {
    return NextResponse.json({ success: false, error: 'Issue not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('feedback_comments')
    .insert({
      issue_id: id,
      parent_id: parentId,
      body,
      author_id: authorId,
      author_name: authorName,
      language,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Feedback comment create error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Insert failed' }, { status: 500 });
  }

  await supabase
    .from('feedback_issues')
    .update({
      comment_count: (issue.comment_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({ success: true, data });
}
