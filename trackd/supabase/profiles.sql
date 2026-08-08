-- Run this in the Supabase dashboard: SQL Editor → New query
-- Adds a profiles table so users have a public username/display name
-- instead of exposing their auth email everywhere.

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Anyone can view profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
-- Runs as the function owner (definer), which owns public.profiles and so
-- bypasses RLS for this insert — no insert policy is needed for regular users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username  text;
  final_username text;
  suffix         int := 0;
begin
  base_username := split_part(coalesce(new.email, 'user'), '@', 1);
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'full_name', base_username));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
