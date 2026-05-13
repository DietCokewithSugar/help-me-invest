import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * GET /api/feedback/issues/:id?voterId=<id>
 * Returns the issue, all of its comments (flat list ordered by created_at) and,
 * if voterId is provided, the voter's vote on the issue and on each comment.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase 未配置' }, { status: 500 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
  }

  const voterId = new URL(request.url).searchParams.get('voterId') || '';

  const { data: issue, error: issueErr } = await supabase
    .from('feedback_issues')
    .select('*')
    .eq('id', id)
    .single();

  if (issueErr || !issue) {
    if (!issueErr || issueErr.code === 'PGRST116') {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    console.error('Feedback detail error:', issueErr);
    return NextResponse.json({ success: false, error: issueErr.message }, { status: 500 });
  }

  const { data: comments, error: commentErr } = await supabase
    .from('feedback_comments')
    .select('*')
    .eq('issue_id', id)
    .order('created_at', { ascending: true });

  if (commentErr) {
    console.error('Feedback comments error:', commentErr);
    return NextResponse.json({ success: false, error: commentErr.message }, { status: 500 });
  }

  let issueVote = 0;
  let voteByComment: Record<string, number> = {};
  if (voterId) {
    const { data: voteRows } = await supabase
      .from('feedback_votes')
      .select('target_type, target_id, vote')
      .eq('voter_id', voterId)
      .or(
        `and(target_type.eq.issue,target_id.eq.${id})` +
        (comments && comments.length > 0
          ? `,and(target_type.eq.comment,target_id.in.(${comments.map((c: any) => c.id).join(',')}))`
          : ''),
      );
    if (voteRows) {
      for (const row of voteRows as any[]) {
        if (row.target_type === 'issue' && row.target_id === id) issueVote = row.vote;
        if (row.target_type === 'comment') voteByComment[row.target_id] = row.vote;
      }
    }
  }

  return NextResponse.json({
    success: true,
    issue,
    comments: comments || [],
    issueVote,
    voteByComment,
  });
}
