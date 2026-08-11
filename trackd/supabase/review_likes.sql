-- Run this in the Supabase dashboard: SQL Editor → New query
-- Lets users like other users' ratings/reviews.

create table public.review_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  rating_id  uuid references public.ratings(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, rating_id)
);

create index review_likes_rating_id_idx on public.review_likes (rating_id);

-- Postgres check constraints can't reference other tables, so "users can't
-- like their own review" is enforced with a trigger instead.
create or replace function prevent_self_like()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.ratings
    where id = new.rating_id and user_id = new.user_id
  ) then
    raise exception 'Cannot like your own review';
  end if;
  return new;
end;
$$;

create trigger review_likes_no_self_like
  before insert on public.review_likes
  for each row execute function prevent_self_like();

-- Row-level security
alter table public.review_likes enable row level security;

create policy "Anyone can view review likes"
  on public.review_likes for select using (true);

create policy "Users can like as themselves"
  on public.review_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own likes"
  on public.review_likes for delete
  using (auth.uid() = user_id);
