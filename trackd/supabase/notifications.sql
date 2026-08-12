-- Run this in the Supabase dashboard: SQL Editor → New query
-- Notifies users when someone follows them or likes their review.

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  type       text not null check (type in ('follow', 'like')),
  actor_id   uuid references auth.users(id) on delete cascade not null,
  rating_id  uuid references public.ratings(id) on delete cascade,
  read       boolean default false not null,
  created_at timestamptz default now() not null
);

create index notifications_user_id_read_idx on public.notifications (user_id, read);

-- Row-level security
alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert/delete policies: rows are only ever written by the trigger
-- functions below, which run as security definer and so bypass RLS.

-- ── follows → 'follow' notifications ───────────────────────

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications (user_id, type, actor_id)
    values (new.following_id, 'follow', new.follower_id);
  end if;
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_unfollow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'follow' and user_id = old.following_id and actor_id = old.follower_id;
  return old;
end;
$$;

create trigger follows_notify_delete
  after delete on public.follows
  for each row execute function public.notify_on_unfollow();

-- ── review_likes → 'like' notifications ────────────────────

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id from public.ratings where id = new.rating_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, rating_id)
    values (owner_id, 'like', new.user_id, new.rating_id);
  end if;
  return new;
end;
$$;

create trigger review_likes_notify
  after insert on public.review_likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_unlike()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'like' and actor_id = old.user_id and rating_id = old.rating_id;
  return old;
end;
$$;

create trigger review_likes_notify_delete
  after delete on public.review_likes
  for each row execute function public.notify_on_unlike();
