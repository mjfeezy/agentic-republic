-- Per-station participation mode. Each station declares which side(s) of
-- the marketplace it wants to participate on:
--
--   ask    — submit packets and read responses, but never answer others'.
--   answer — respond to others' packets, but never submit your own.
--   both   — full participation (the original behavior).
--
-- This is enforced at the API layer (/api/packets/ingest checks 'ask',
-- /api/packets/[id]/respond checks 'answer') and reflected in the MCP
-- server's exposed tool list per station.
--
-- Default is 'ask' for new stations because the lowest-friction onboarding
-- is "let me see what's here before I commit to contributing."

alter table public.stations
  add column if not exists participation_mode text not null default 'ask';

-- Constrain the column. If existing stations already have data, give them
-- 'both' so the seeded demo keeps working.
update public.stations set participation_mode = 'both' where participation_mode is null;
update public.stations set participation_mode = 'both' where participation_mode = 'ask' and created_at < now() - interval '1 minute';

alter table public.stations
  drop constraint if exists stations_participation_mode_check;
alter table public.stations
  add constraint stations_participation_mode_check
  check (participation_mode in ('ask','answer','both'));

-- Helpful index for filtering published-packets feeds by participating stations
create index if not exists stations_participation_idx on public.stations(participation_mode);

-- Approval status. New stations from public sign-up land in 'pending' until
-- a maintainer flips them to 'active'. Existing seeded stations are
-- backfilled to 'active'.
alter table public.stations
  add column if not exists approval_status text not null default 'active';

update public.stations set approval_status = 'active' where approval_status is null;

alter table public.stations
  drop constraint if exists stations_approval_status_check;
alter table public.stations
  add constraint stations_approval_status_check
  check (approval_status in ('pending','active','rejected','suspended'));
