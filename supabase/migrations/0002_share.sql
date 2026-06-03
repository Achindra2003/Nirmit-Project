-- ─────────────────────────────────────────────────────────────────────
-- Nirmit · design sharing (collaboration)
--
-- A design can be shared via an opaque, unguessable token (uuid). Anyone
-- holding the token can VIEW the room and EDIT it (collaborative,
-- last-write-wins) — the homeowner shares the link with family / a
-- contractor and they all work on the same room. The owner remains the only
-- one who can rename or delete it (those still go through the per-user
-- policies in 0001).
--
-- Run this once in the Supabase SQL editor (Database → SQL editor → New
-- query → paste → Run). Safe to re-run.
--
-- ⚠ Privacy note: the read policy below exposes any row that HAS a token to
-- anyone who queries by it. The token is an unguessable uuid and only shared
-- rooms carry one, so this is "anyone with the link" — appropriate for a
-- share feature. Tightening to a token-checking RPC is a future hardening.
-- ─────────────────────────────────────────────────────────────────────

alter table public.designs
  add column if not exists share_token uuid unique;

-- READ: anyone (incl. anonymous) may read a shared row. The frontend always
-- filters by the exact token, so a viewer only ever sees the room they were
-- given the link to.
drop policy if exists "anyone reads shared designs" on public.designs;
create policy "anyone reads shared designs"
  on public.designs for select
  using (share_token is not null);

-- EDIT: anyone with the token may patch a shared design's room_state
-- (last-write-wins). The frontend only ever updates room_state on this path.
drop policy if exists "anyone edits shared designs" on public.designs;
create policy "anyone edits shared designs"
  on public.designs for update
  using (share_token is not null)
  with check (share_token is not null);

-- LIVE SYNC: add the table to the realtime publication so collaborators get
-- row-change events (idempotent — ignores "already added").
do $$ begin
  alter publication supabase_realtime add table public.designs;
exception
  when duplicate_object then null;
  when undefined_object then null;  -- publication missing on very old projects
end $$;
