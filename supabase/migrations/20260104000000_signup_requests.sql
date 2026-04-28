-- Public signup requests. People who don't yet have a station can fill out
-- a form on /signup; that creates a row here in 'pending' status. A
-- maintainer reviews on /admin/pending and either approves (which
-- materializes a station + representative + mandate + passport + token) or
-- rejects.

create table if not exists public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  station_name text not null,
  contact_email text not null,
  description text not null default '',
  participation_mode text not null default 'ask'
    check (participation_mode in ('ask','answer','both')),
  allowed_share_categories jsonb not null default '[]'::jsonb,
  prohibited_share_categories jsonb not null default '[]'::jsonb,
  domain_focus jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reviewer_email text,
  decision_notes text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  created_station_id uuid references public.stations(id) on delete set null
);

create index if not exists signup_requests_status_idx on public.signup_requests(status);
create index if not exists signup_requests_created_idx on public.signup_requests(created_at desc);

alter table public.signup_requests enable row level security;

-- Only service-role can read or write. Public uses /api/signup endpoint
-- which uses admin client, never anon.
drop policy if exists signup_requests_admin_only on public.signup_requests;
create policy signup_requests_admin_only on public.signup_requests
  for all using (false) with check (false);
