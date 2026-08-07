-- Run this in the Supabase dashboard: SQL Editor → New query
-- Adds support for rating individual tracks, reusing the ratings table.
-- A row with spotify_track_id = null is an album rating (unchanged behavior).
-- A row with spotify_track_id filled in is a rating for that track.

alter table public.ratings
  add column if not exists spotify_track_id text,
  add column if not exists track_name text;

-- Replace the old "one rating per user per album" constraint with one that
-- also accounts for the track, while still enforcing at most one album
-- rating (spotify_track_id is null) and one rating per track per user.
-- Requires Postgres 15+ (NULLS NOT DISTINCT) so that two rows with
-- spotify_track_id = null for the same user/album correctly conflict.
alter table public.ratings
  drop constraint if exists ratings_user_id_album_id_key;

alter table public.ratings
  add constraint ratings_user_album_track_key
  unique nulls not distinct (user_id, album_id, spotify_track_id);
