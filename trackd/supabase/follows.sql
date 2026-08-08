-- Run this in the Supabase dashboard: SQL Editor → New query
-- Lets users follow each other so the Feed page can show ratings from
-- people they follow.

create table public.follows (
  follower_id  uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at   timestamptz default now() not null,
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

-- Row-level security
alter table public.follows enable row level security;

create policy "Anyone can view follows"
  on public.follows for select using (true);

create policy "Users can follow as themselves"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow their own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);
