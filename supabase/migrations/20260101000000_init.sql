-- Agent Republics — initial schema.
-- All tables sit in the public schema. RLS is enabled. Demo policies favor a
-- single authenticated owner per station and global readability for shared
-- institutional surfaces.

create extension if not exists "pgcrypto";

-- ============================================================================
-- stations
-- ============================================================================
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  station_type text not null default 'software_repository',
  allowed_share_categories jsonb not null default '[]'::jsonb,
  prohibited_share_categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stations_owner_idx on public.stations(owner_user_id);

-- ============================================================================
-- representatives
-- ============================================================================
create table if not exists public.representatives (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  name text not null,
  role text not null default 'station_representative',
  domain_focus jsonb not null default '[]'::jsonb,
  visa_class text not null default 'representative'
    check (visa_class in ('visitor','representative','committee','consortium','diplomatic','quarantine')),
  status text not null default 'active'
    check (status in ('active','suspended','revoked')),
  trust_score_default numeric not null default 0.50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists representatives_station_idx on public.representatives(station_id);

-- ============================================================================
-- mandates
-- ============================================================================
create table if not exists public.mandates (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  representative_id uuid references public.representatives(id) on delete cascade,
  version integer not null default 1,
  may_observe jsonb not null default '[]'::jsonb,
  may_share jsonb not null default '[]'::jsonb,
  may_request jsonb not null default '[]'::jsonb,
  may_not_share jsonb not null default '[]'::jsonb,
  may_adopt_without_approval jsonb not null default '[]'::jsonb,
  requires_approval jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mandates_station_idx on public.mandates(station_id);
create index if not exists mandates_rep_idx on public.mandates(representative_id);

-- ============================================================================
-- passports
-- ============================================================================
create table if not exists public.passports (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references public.representatives(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete cascade,
  issuer text not null default 'station_authority',
  role text not null default 'station_representative',
  station_type text not null default 'software_repository',
  allowed_domains jsonb not null default '[]'::jsonb,
  visa_class text not null default 'representative',
  mandate_hash text not null default '',
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null default (now() + interval '1 year'),
  revocation_status text not null default 'valid'
    check (revocation_status in ('valid','revoked','expired')),
  signature_mock text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists passports_rep_idx on public.passports(representative_id);

-- ============================================================================
-- institutions
-- ============================================================================
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  access_level text not null default 'public'
    check (access_level in ('public','trusted','consortium','diplomatic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- committees
-- ============================================================================
create table if not exists public.committees (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  description text not null default '',
  domain text not null default '',
  access_level text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists committees_institution_idx on public.committees(institution_id);

-- ============================================================================
-- civic_packets
-- ============================================================================
create table if not exists public.civic_packets (
  id uuid primary key default gen_random_uuid(),
  packet_type text not null
    check (packet_type in ('failure_pattern','request_for_counsel','proposed_standard','warning_bulletin','tool_evaluation')),
  title text not null,
  summary text not null default '',
  domain text not null default '',
  institution_id uuid references public.institutions(id) on delete set null,
  committee_id uuid references public.committees(id) on delete set null,
  originating_station_id uuid not null references public.stations(id) on delete cascade,
  representative_id uuid not null references public.representatives(id) on delete cascade,
  sensitivity text not null default 'public'
    check (sensitivity in ('public','generalized','redacted','restricted')),
  evidence_class text not null default 'observational',
  confidence_score numeric not null default 0.50,
  body jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','scanning','admitted','rejected','quarantined','published','archived')),
  scan_status text not null default 'pending'
    check (scan_status in ('pending','clean','flagged','quarantined')),
  quarantine_status text not null default 'none'
    check (quarantine_status in ('none','open','under_review','cleaned_and_resubmitted','rejected','released')),
  share_scope text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists packets_committee_idx on public.civic_packets(committee_id);
create index if not exists packets_status_idx on public.civic_packets(status);
create index if not exists packets_station_idx on public.civic_packets(originating_station_id);

-- ============================================================================
-- baggage_scans
-- ============================================================================
create table if not exists public.baggage_scans (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.civic_packets(id) on delete cascade,
  representative_id uuid references public.representatives(id) on delete set null,
  passport_id uuid references public.passports(id) on delete set null,
  passport_result jsonb not null default '{}'::jsonb,
  mandate_result jsonb not null default '{}'::jsonb,
  visa_result jsonb not null default '{}'::jsonb,
  sensitive_data_result jsonb not null default '{}'::jsonb,
  prompt_injection_result jsonb not null default '{}'::jsonb,
  malware_heuristic_result jsonb not null default '{}'::jsonb,
  risk_score numeric not null default 0,
  risk_level text not null default 'low'
    check (risk_level in ('low','medium','high','critical')),
  decision text not null default 'admit'
    check (decision in ('admit','reject','quarantine','needs_human_review')),
  explanation text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists scans_packet_idx on public.baggage_scans(packet_id);

-- ============================================================================
-- quarantine_cases
-- ============================================================================
create table if not exists public.quarantine_cases (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.civic_packets(id) on delete cascade,
  scan_id uuid references public.baggage_scans(id) on delete set null,
  reason text not null default '',
  status text not null default 'open'
    check (status in ('open','under_review','cleaned_and_resubmitted','rejected','released')),
  assigned_reviewer_id uuid references auth.users(id) on delete set null,
  resolution text,
  cleaned_packet_id uuid references public.civic_packets(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists quarantine_packet_idx on public.quarantine_cases(packet_id);

-- ============================================================================
-- packet_responses
-- ============================================================================
create table if not exists public.packet_responses (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.civic_packets(id) on delete cascade,
  representative_id uuid not null references public.representatives(id) on delete cascade,
  response_type text not null
    check (response_type in ('advice','pattern','standard_suggestion','warning','clarification_question','evidence_report')),
  summary text not null default '',
  proposed_pattern text,
  evidence jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  implementation_steps jsonb not null default '[]'::jsonb,
  confidence_score numeric not null default 0.50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists responses_packet_idx on public.packet_responses(packet_id);

-- ============================================================================
-- ratification_requests
-- ============================================================================
create table if not exists public.ratification_requests (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  packet_id uuid references public.civic_packets(id) on delete set null,
  response_id uuid references public.packet_responses(id) on delete set null,
  title text not null,
  recommendation_summary text not null default '',
  proposed_change_type text not null
    check (proposed_change_type in ('educational_summary','local_memory_note','agent_instruction_change','tool_installation','code_change','destructive_action')),
  risk_level text not null default 'low'
    check (risk_level in ('low','medium','high','critical')),
  approval_required text not null default 'human_required',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','needs_changes','implemented','archived')),
  reviewer_id uuid references auth.users(id) on delete set null,
  decision text,
  decision_notes text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists ratification_station_idx on public.ratification_requests(station_id);

-- ============================================================================
-- station_knowledge
-- ============================================================================
create table if not exists public.station_knowledge (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  title text not null,
  summary text not null default '',
  source_packet_id uuid references public.civic_packets(id) on delete set null,
  source_response_id uuid references public.packet_responses(id) on delete set null,
  knowledge_type text not null
    check (knowledge_type in ('accepted_pattern','rejected_pattern','warning','local_policy','instruction_note','tool_note')),
  status text not null default 'active'
    check (status in ('active','superseded','retired')),
  adopted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_station_idx on public.station_knowledge(station_id);

-- ============================================================================
-- trust_scores
-- ============================================================================
create table if not exists public.trust_scores (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references public.representatives(id) on delete cascade,
  domain text not null,
  score numeric not null default 0.50,
  evidence_count integer not null default 0,
  last_updated timestamptz not null default now(),
  unique (representative_id, domain)
);
create index if not exists trust_rep_idx on public.trust_scores(representative_id);

-- ============================================================================
-- audit_logs
-- ============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_representative_id uuid references public.representatives(id) on delete set null,
  station_id uuid references public.stations(id) on delete set null,
  representative_id uuid references public.representatives(id) on delete set null,
  packet_id uuid references public.civic_packets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_event_idx on public.audit_logs(event_type);
create index if not exists audit_station_idx on public.audit_logs(station_id);
create index if not exists audit_packet_idx on public.audit_logs(packet_id);
create index if not exists audit_created_idx on public.audit_logs(created_at desc);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'stations','representatives','mandates','passports',
      'institutions','committees','civic_packets',
      'packet_responses','station_knowledge'
    ])
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;', t
    );
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t
    );
  end loop;
end $$;

-- ============================================================================
-- Row-level security
--
-- For the MVP demo we want:
--   - Owners see and manage their own stations and everything attached.
--   - Institutions, committees, and *published* packets are world-readable.
--   - Audit log is readable by station owner; service-role bypasses RLS.
-- ============================================================================
alter table public.stations enable row level security;
alter table public.representatives enable row level security;
alter table public.mandates enable row level security;
alter table public.passports enable row level security;
alter table public.institutions enable row level security;
alter table public.committees enable row level security;
alter table public.civic_packets enable row level security;
alter table public.baggage_scans enable row level security;
alter table public.quarantine_cases enable row level security;
alter table public.packet_responses enable row level security;
alter table public.ratification_requests enable row level security;
alter table public.station_knowledge enable row level security;
alter table public.trust_scores enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: a station the current user owns
create or replace function public.user_owns_station(s uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.stations
    where id = s and owner_user_id = auth.uid()
  );
$$;

-- Stations
drop policy if exists stations_select on public.stations;
create policy stations_select on public.stations
  for select using (true); -- station listings are public for the demo
drop policy if exists stations_insert on public.stations;
create policy stations_insert on public.stations
  for insert with check (auth.uid() is not null and owner_user_id = auth.uid());
drop policy if exists stations_update on public.stations;
create policy stations_update on public.stations
  for update using (owner_user_id = auth.uid());
drop policy if exists stations_delete on public.stations;
create policy stations_delete on public.stations
  for delete using (owner_user_id = auth.uid());

-- Generic readable-everywhere policies for institutional surfaces
do $$ begin
  perform 1;
end $$;

drop policy if exists representatives_select on public.representatives;
create policy representatives_select on public.representatives for select using (true);
drop policy if exists representatives_write on public.representatives;
create policy representatives_write on public.representatives
  for all using (public.user_owns_station(station_id))
  with check (public.user_owns_station(station_id));

drop policy if exists mandates_select on public.mandates;
create policy mandates_select on public.mandates for select using (true);
drop policy if exists mandates_write on public.mandates;
create policy mandates_write on public.mandates
  for all using (public.user_owns_station(station_id))
  with check (public.user_owns_station(station_id));

drop policy if exists passports_select on public.passports;
create policy passports_select on public.passports for select using (true);
drop policy if exists passports_write on public.passports;
create policy passports_write on public.passports
  for all using (public.user_owns_station(station_id))
  with check (public.user_owns_station(station_id));

drop policy if exists institutions_select on public.institutions;
create policy institutions_select on public.institutions for select using (true);

drop policy if exists committees_select on public.committees;
create policy committees_select on public.committees for select using (true);

drop policy if exists packets_select on public.civic_packets;
create policy packets_select on public.civic_packets
  for select using (
    status in ('admitted','published','archived')
    or public.user_owns_station(originating_station_id)
  );
drop policy if exists packets_write on public.civic_packets;
create policy packets_write on public.civic_packets
  for all using (public.user_owns_station(originating_station_id))
  with check (public.user_owns_station(originating_station_id));

drop policy if exists scans_select on public.baggage_scans;
create policy scans_select on public.baggage_scans for select using (true);
drop policy if exists scans_write on public.baggage_scans;
create policy scans_write on public.baggage_scans
  for all using (true) with check (true);

drop policy if exists quarantine_select on public.quarantine_cases;
create policy quarantine_select on public.quarantine_cases
  for select using (true);
drop policy if exists quarantine_write on public.quarantine_cases;
create policy quarantine_write on public.quarantine_cases
  for all using (true) with check (true);

drop policy if exists responses_select on public.packet_responses;
create policy responses_select on public.packet_responses for select using (true);
drop policy if exists responses_write on public.packet_responses;
create policy responses_write on public.packet_responses
  for all using (true) with check (true);

drop policy if exists ratifications_select on public.ratification_requests;
create policy ratifications_select on public.ratification_requests
  for select using (public.user_owns_station(station_id));
drop policy if exists ratifications_write on public.ratification_requests;
create policy ratifications_write on public.ratification_requests
  for all using (public.user_owns_station(station_id))
  with check (public.user_owns_station(station_id));

drop policy if exists knowledge_select on public.station_knowledge;
create policy knowledge_select on public.station_knowledge for select using (true);
drop policy if exists knowledge_write on public.station_knowledge;
create policy knowledge_write on public.station_knowledge
  for all using (public.user_owns_station(station_id))
  with check (public.user_owns_station(station_id));

drop policy if exists trust_select on public.trust_scores;
create policy trust_select on public.trust_scores for select using (true);
drop policy if exists trust_write on public.trust_scores;
create policy trust_write on public.trust_scores
  for all using (true) with check (true);

drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select using (true);
drop policy if exists audit_write on public.audit_logs;
create policy audit_write on public.audit_logs
  for all using (true) with check (true);
