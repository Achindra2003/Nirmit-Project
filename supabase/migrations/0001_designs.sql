-- ─────────────────────────────────────────────────────────────────────
-- Nirmit · designs table
--
-- A saved design = one room_state JSON blob + name + philosophy, owned
-- by one Supabase auth user. RLS makes the table per-user from the
-- database level: even if the frontend forgets a user_id filter, the
-- policy below ensures users can only read/write/delete their own rows.
--
-- Run this once in the Supabase SQL editor (Database → SQL editor →
-- New query → paste → Run). Safe to re-run: the `if not exists` guards
-- protect each step.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.designs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  philosophy  text,
  room_state  jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- listDesigns sorts by updated_at desc per user; this index lets that
-- query stay fast as the table grows. Per-user secondary sort indexes
-- like this are the standard pattern with RLS-scoped tables.
create index if not exists designs_user_updated_idx
  on public.designs (user_id, updated_at desc);

-- ── Row Level Security ──────────────────────────────────────────────
-- Enable RLS, then add one policy per CRUD verb. The `auth.uid()`
-- function returns the JWT's `sub` claim — the Supabase user id — when
-- the request is authenticated, NULL otherwise. So an anonymous
-- (unauthenticated) request will always fail every policy and see no
-- rows / be unable to write.
alter table public.designs enable row level security;

drop policy if exists "users read own designs" on public.designs;
create policy "users read own designs"
  on public.designs for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own designs" on public.designs;
create policy "users insert own designs"
  on public.designs for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own designs" on public.designs;
create policy "users update own designs"
  on public.designs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own designs" on public.designs;
create policy "users delete own designs"
  on public.designs for delete
  using (auth.uid() = user_id);

-- ── updated_at maintained automatically ─────────────────────────────
-- Postgres trigger: every UPDATE on a designs row stamps updated_at to
-- now(). Keeps the frontend's "sort by most recently edited" honest
-- without making every save path remember to set the timestamp.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists designs_set_updated_at on public.designs;
create trigger designs_set_updated_at
  before update on public.designs
  for each row execute function public.set_updated_at();
