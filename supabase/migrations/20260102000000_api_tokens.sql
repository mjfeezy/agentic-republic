-- Station-scoped API tokens. Used by external agents (Claude Code, Cursor,
-- a CI script, anything) to submit civic packets without going through the
-- Supabase auth flow. Tokens are stored hashed; the plaintext is shown once
-- when issued and never persisted.

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  station_id uuid not null references public.stations(id) on delete cascade,
  representative_id uuid not null references public.representatives(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_tokens_station_idx on public.api_tokens(station_id);
create index if not exists api_tokens_rep_idx on public.api_tokens(representative_id);

alter table public.api_tokens enable row level security;

-- No anon/authenticated policies — only service-role accesses this table.
-- The /api/packets/ingest route uses the admin client to verify the token.
drop policy if exists api_tokens_admin_only on public.api_tokens;
create policy api_tokens_admin_only on public.api_tokens
  for all using (false) with check (false);
