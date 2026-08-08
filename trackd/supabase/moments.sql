-- Run this in the Supabase dashboard: SQL Editor → New query
-- "Moments" are short, timestamped user comments pinned to a point in a
-- track (e.g. "0:47 — the beat switch here is insane"). No lyrics are
-- stored here, only user commentary.

create table public.moments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  spotify_track_id  text not null,
  track_name        text not null,
  album_id          text not null,
  album_name        text not null,
  album_image       text,
  timestamp_seconds int not null check (timestamp_seconds >= 0),
  comment_text      text not null check (char_length(trim(comment_text)) > 0),
  created_at        timestamptz default now() not null
);

create index moments_track_idx on public.moments (spotify_track_id);
create index moments_album_idx on public.moments (album_id);

alter table public.moments enable row level security;

create policy "Anyone can view moments"
  on public.moments for select using (true);

create policy "Users can insert own moments"
  on public.moments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own moments"
  on public.moments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own moments"
  on public.moments for delete
  using (auth.uid() = user_id);
