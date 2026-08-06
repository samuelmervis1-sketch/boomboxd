-- Run this in the Supabase dashboard: SQL Editor → New query

create table public.ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  album_id    text not null,
  album_name  text not null,
  album_artist text not null,
  album_image text,
  rating      numeric(2,1) not null check (rating >= 0.5 and rating <= 5.0),
  review      text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique (user_id, album_id)
);

-- Auto-update updated_at on edits
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ratings_updated_at
  before update on public.ratings
  for each row execute function update_updated_at();

-- Row-level security
alter table public.ratings enable row level security;

create policy "Anyone can view ratings"
  on public.ratings for select using (true);

create policy "Users can insert own ratings"
  on public.ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own ratings"
  on public.ratings for delete
  using (auth.uid() = user_id);
