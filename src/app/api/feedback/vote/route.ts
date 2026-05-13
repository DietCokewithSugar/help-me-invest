import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

type TargetType = 'issue' | 'comment';

/**
 * POST /api/feedback/vote
 * Body: { targetType: 'issue'|'comment', targetId, voterId, vote: -1|0|1 }
 *
 * `vote=0` removes a previous vote. The handler reads the previous vote for
 * (target, voter), writes (or deletes) the row, and then adjusts the
 * upvotes/downvotes counters on the target row by the delta. This keeps the
 * counters server-authoritative without a DB trigger.
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

  const targetType = String(payload?.targetType || '') as TargetType;
  const targetId = String(payload?.targetId || '').trim();
  const voterId = String(payload?.voterId || '').trim().slice(0, 64);
  const voteRaw = Number(payload?.vote);

  if (targetType !== 'issue' && targetType !== 'comment') {
    return NextResponse.json({ success: false, error: 'Invalid targetType' }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ success: false, error: 'Missing targetId' }, { status: 400 });
  }
  if (!voterId) {
    return NextResponse.json({ success: false, error: 'Missing voterId' }, { status: 400 });
  }
  if (![-1, 0, 1].includes(voteRaw)) {
    return NextResponse.json({ success: false, error: 'Invalid vote' }, { status: 400 });
  }
  const vote = voteRaw as -1 | 0 | 1;

  const table = targetType === 'issue' ? 'feedback_issues' : 'feedback_comments';

  // Read the previous vote (if any) so we know how to adjust counters.
  const { data: existing } = await supabase
    .from('feedback_votes')
    .select('id, vote')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('voter_id', voterId)
    .maybeSingle();

  const prevVote = (existing?.vote as -1 | 1 | undefined) ?? 0;

  if (prevVote === vote) {
    // No-op. Return the current target counters so the client can sync state.
    const { data: target } = await supabase
      .from(table)
      .select('upvotes, downvotes')
      .eq('id', targetId)
      .single();
    return NextResponse.json({
      success: true,
      vote: prevVote,
      upvotes: target?.upvotes ?? 0,
      downvotes: target?.downvotes ?? 0,
    });
  }

  // Persist the new vote row (or delete it if vote=0).
  if (vote === 0) {
    if (existing) {
      await supabase.from('feedback_votes').delete().eq('id', existing.id);
    }
  } else if (existing) {
    await supabase
      .from('feedback_votes')
      .update({ vote, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('feedback_votes')
      .insert({ target_type: targetType, target_id: targetId, voter_id: voterId, vote });
  }

  // Read current counters, apply delta, write back.
  const { data: target, error: targetErr } = await supabase
    .from(table)
    .select('upvotes, downvotes')
    .eq('id', targetId)
    .single();
  if (targetErr || !target) {
    return NextResponse.json({ success: false, error: 'Target not found' }, { status: 404 });
  }

  let upvotes = target.upvotes || 0;
  let downvotes = target.downvotes || 0;

  if (prevVote === 1) upvotes -= 1;
  if (prevVote === -1) downvotes -= 1;
  if (vote === 1) upvotes += 1;
  if (vote === -1) downvotes += 1;

  await supabase
    .from(table)
    .update({ upvotes, downvotes })
    .eq('id', targetId);

  return NextResponse.json({ success: true, vote, upvotes, downvotes });
}
