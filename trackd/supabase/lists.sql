-- Run this in the Supabase dashboard: SQL Editor → New query
-- User-created ranked lists of albums and songs, with drag-to-reorder support.

create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  description text,
  is_public   boolean default true not null,
  created_at  timestamptz default now() not null
);

create table public.list_items (
  id                uuid primary key default gen_random_uuid(),
  list_id           uuid references public.lists(id) on delete cascade not null,
  spotify_album_id  text,
  album_name        text not null,
  album_artist      text,
  album_image       text,
  spotify_track_id  text,
  track_name        text,
  position          int not null,
  previous_position int,
  created_at        timestamptz default now() not null
);

create index lists_user_id_idx on public.lists (user_id);
create index list_items_list_id_idx on public.list_items (list_id);
create index list_items_position_idx on public.list_items (list_id, position);

-- Row-level security
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

-- ── lists ──────────────────────────────────────────────────
-- Anyone can read public lists; owners can also read their own private ones.

create policy "Anyone can view public lists"
  on public.lists for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users can create own lists"
  on public.lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lists"
  on public.lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own lists"
  on public.lists for delete
  using (auth.uid() = user_id);

-- ── list_items ─────────────────────────────────────────────
-- Readable if the parent list is public or owned; only the list owner can
-- add, reorder, or remove items.

create policy "Anyone can view items of visible lists"
  on public.list_items for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and (l.is_public = true or l.user_id = auth.uid())
    )
  );

create policy "Owners can add items to own lists"
  on public.list_items for insert
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.user_id = auth.uid()
    )
  );

create policy "Owners can update items in own lists"
  on public.list_items for update
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.user_id = auth.uid()
    )
  );

create policy "Owners can remove items from own lists"
  on public.list_items for delete
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.user_id = auth.uid()
    )
  );
