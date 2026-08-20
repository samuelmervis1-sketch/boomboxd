-- Run this in the Supabase dashboard: SQL Editor -> New query
-- Follow-up to the security audit: pins search_path on SECURITY DEFINER
-- functions, and caps free-text field lengths at the database boundary.

-- ── 1. Pin search_path on SECURITY DEFINER functions ────────────────
-- Without a fixed search_path, a SECURITY DEFINER function resolves any
-- unqualified name (table, function, operator) against whatever
-- search_path the *caller's* session has set — the classic Postgres
-- privilege-escalation vector for this function type. All six of these
-- already schema-qualify every object they touch (public.profiles,
-- public.notifications, etc.), so this closes the class of bug as
-- defense-in-depth rather than fixing an active exploit.
--
-- handle_new_user and rls_auto_enable already carry a SET search_path
-- clause (to 'public' and 'pg_catalog' respectively) — this normalizes
-- all six to the same value Supabase's linter recommends.

alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.notify_on_follow() set search_path = public, pg_temp;
alter function public.notify_on_like() set search_path = public, pg_temp;
alter function public.remove_follow_notification() set search_path = public, pg_temp;
alter function public.remove_like_notification() set search_path = public, pg_temp;
alter function public.rls_auto_enable() set search_path = public, pg_temp;

-- ── 2. Cap free-text field lengths ───────────────────────────────────
-- The client already enforces these limits (RatingModal's review
-- textarea: maxLength 2000; the moment comment input: maxLength 200),
-- but nothing stopped a direct API call — using the public anon key,
-- bypassing the UI entirely — from writing an arbitrarily long value.
-- These constraints close that gap at the boundary that actually
-- matters, independent of what the client sends.

alter table public.ratings
  add constraint ratings_review_length_check
  check (char_length(review) <= 2000);

alter table public.moments
  add constraint moments_comment_text_length_check
  check (char_length(comment_text) <= 2000);
