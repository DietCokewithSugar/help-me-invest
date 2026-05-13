-- ============================================================================
-- Feedback Board (GitHub-issue-style)
-- - feedback_issues: top-level issues posted by users
-- - feedback_comments: comments + replies, threaded via parent_id
-- - feedback_votes: one row per (target, voter) so we can toggle / switch vote
--
-- Identity model: this project has no login, so author/voter is identified by a
-- random UUID stored in the browser's localStorage. The columns are plain text
-- to make that obvious and to allow any future migration to real auth.
-- ============================================================================

-- ============================================================================
-- feedback_issues
-- ============================================================================
create table if not exists feedback_issues (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  author_name text,
  title text not null,
  body text not null,
  language text,
  category text not null default 'other',
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  comment_count integer not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_issues_created_at_idx
  on feedback_issues (created_at desc);
create index if not exists feedback_issues_score_idx
  on feedback_issues ((upvotes - downvotes) desc);
create index if not exists feedback_issues_category_idx
  on feedback_issues (category);

-- ============================================================================
-- feedback_comments
-- ============================================================================
create table if not exists feedback_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references feedback_issues(id) on delete cascade,
  parent_id uuid references feedback_comments(id) on delete cascade,
  author_id text not null,
  author_name text,
  body text not null,
  language text,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists feedback_comments_issue_id_idx
  on feedback_comments (issue_id, created_at);
create index if not exists feedback_comments_parent_id_idx
  on feedback_comments (parent_id);

-- ============================================================================
-- feedback_votes
-- One row per (target, voter). target_type is 'issue' or 'comment'.
-- vote is +1 (upvote) or -1 (downvote). Switching vote rewrites the row.
-- ============================================================================
create table if not exists feedback_votes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('issue', 'comment')),
  target_id uuid not null,
  voter_id text not null,
  vote smallint not null check (vote in (1, -1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_type, target_id, voter_id)
);

create index if not exists feedback_votes_target_idx
  on feedback_votes (target_type, target_id);
create index if not exists feedback_votes_voter_idx
  on feedback_votes (voter_id);

-- ============================================================================
-- Row Level Security
-- The Next.js API routes always use the service-role key, so this just opens
-- the tables for read+write through any client. Tighten later if real auth
-- is introduced.
-- ============================================================================
alter table feedback_issues enable row level security;
alter table feedback_comments enable row level security;
alter table feedback_votes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_issues'
      and policyname = 'Allow all access'
  ) then
    create policy "Allow all access" on feedback_issues for all using (true) with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_comments'
      and policyname = 'Allow all access'
  ) then
    create policy "Allow all access" on feedback_comments for all using (true) with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_votes'
      and policyname = 'Allow all access'
  ) then
    create policy "Allow all access" on feedback_votes for all using (true) with check (true);
  end if;
end $$;
