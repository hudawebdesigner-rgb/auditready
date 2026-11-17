-- =====================================================================
-- Seller Intelligence Platform — initial schema (Phase 0)
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. It is safe to run once on a fresh project.
--
-- Design rules enforced HERE, in the database, not just in app code:
--   * One row per (marketplace, seller_id)            -> no exact duplicates
--   * business phone / owner direct phone / owner email are separate
--     contact types and can never be mixed up
--   * owner_direct_phone and owner_email may ONLY come from Apollo
--   * every enriched value carries a source + confidence (0-100)
--   * missing data = no value (NULL / no row), never a guess
--   * Row Level Security: only invited team members can see anything
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------
create type public.marketplace as enum ('amazon', 'walmart');

-- Where a piece of data came from. 'manual' = typed in by a team member.
create type public.data_source as enum (
  'rainforest',      -- Amazon seller data (Traject Data)
  'bluecart',        -- Walmart seller data (Traject Data)
  'cobalt',          -- Secretary of State filings (Cobalt Intelligence)
  'opencorporates',  -- optional alternative registry source
  'apollo',          -- Apollo.io company / people enrichment
  'manual'
);

create type public.pipeline_step as enum ('collect', 'match', 'enrich');

-- Result of one pipeline step for one seller.
create type public.step_status as enum (
  'pending',    -- not attempted yet
  'success',    -- got data
  'no_result',  -- API worked, but nothing was found (this is NOT an error)
  'skipped',    -- deliberately not run (non-US seller, low match confidence, credit limit...)
  'failed'      -- API error after all retries
);

create type public.contact_type as enum (
  'business_phone',      -- the company's public line
  'business_email',      -- the company's public email (info@, sales@ ...)
  'owner_direct_phone',  -- decision-maker's direct line — Apollo only
  'owner_email'          -- decision-maker's email — Apollo only
);

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Normalises a business name for fuzzy duplicate detection:
-- "Acme Widgets, L.L.C." -> "acme widgets"
create or replace function public.normalize_business_name(name text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(coalesce(name, '')), '[^a-z0-9 ]', ' ', 'g'),
          '\m(llc|l l c|inc|incorporated|corp|corporation|co|company|ltd|limited|lp|llp|pllc)\M',
          ' ', 'g'),
        '\s+', ' ', 'g')
    ),
    '')
$$;

-- ---------------------------------------------------------------------
-- Team access (only you and your boss)
-- ---------------------------------------------------------------------

-- Emails allowed into the app. A login whose email is not listed here
-- can sign in technically but will see NO data.
create table public.team_allowed_emails (
  email      text primary key check (email = lower(email)),
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table public.team_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members where user_id = auth.uid())
$$;

create or replace function public.is_team_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members where user_id = auth.uid() and role = 'admin'
  )
$$;

-- When a new login is created, add it to the team if its email is allowed.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (user_id, email, role)
  select new.id, lower(new.email), a.role
  from public.team_allowed_emails a
  where a.email = lower(new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- When an email is allowed AFTER the login already exists, add it too.
create or replace function public.handle_new_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (user_id, email, role)
  select u.id, lower(u.email), new.role
  from auth.users u
  where lower(u.email) = new.email
  on conflict (user_id) do update set role = excluded.role;
  return new;
end;
$$;

create trigger on_allowed_email_added
  after insert on public.team_allowed_emails
  for each row execute function public.handle_new_allowed_email();

-- ---------------------------------------------------------------------
-- sellers: one row per marketplace storefront
-- ---------------------------------------------------------------------
create table public.sellers (
  id                          uuid primary key default gen_random_uuid(),
  marketplace                 public.marketplace not null,
  seller_id                   text not null check (btrim(seller_id) <> ''),
  store_name                  text,
  profile_url                 text,

  -- Exactly what the marketplace displays (legally required seller info)
  business_name_displayed     text,
  business_address_displayed  text,      -- full address as shown
  address_city                text,      -- parsed parts (NULL if not parseable)
  address_state               text,      -- 2-letter US state code
  address_postal_code         text,
  address_country             text,      -- 2-letter country code, e.g. 'US'
  is_us                       boolean generated always as (address_country = 'US') stored,

  category                    text,
  rating                      numeric(3, 2) check (rating between 0 and 5),
  rating_count                integer check (rating_count >= 0),

  source                      public.data_source,   -- who supplied the displayed data
  raw                         jsonb,                -- original API response, for audit

  -- Pipeline progress, one status per step
  collect_status              public.step_status not null default 'pending',
  match_status                public.step_status not null default 'pending',
  enrich_status               public.step_status not null default 'pending',
  skip_reason                 text,                 -- e.g. 'non_us', 'low_match_confidence'
  last_refreshed_at           timestamptz,          -- last successful 'collect'
  last_matched_at             timestamptz,
  last_enriched_at            timestamptz,

  -- Outreach compliance (cold calls / emails)
  do_not_contact              boolean not null default false,
  do_not_contact_reason       text,

  -- Used for fuzzy duplicate detection
  name_normalized             text generated always as (
                                public.normalize_business_name(coalesce(business_name_displayed, store_name))
                              ) stored,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint sellers_marketplace_seller_id_key unique (marketplace, seller_id),
  constraint sellers_state_format check (address_state is null or address_state ~ '^[A-Z]{2}$'),
  constraint sellers_country_format check (address_country is null or address_country ~ '^[A-Z]{2}$')
);

create index sellers_state_idx        on public.sellers (address_state);
create index sellers_category_idx     on public.sellers (category);
create index sellers_refreshed_idx    on public.sellers (last_refreshed_at);
create index sellers_statuses_idx     on public.sellers (collect_status, match_status, enrich_status);
create index sellers_name_trgm_idx    on public.sellers using gin (name_normalized extensions.gin_trgm_ops);
create index sellers_address_trgm_idx on public.sellers using gin (lower(business_address_displayed) extensions.gin_trgm_ops);

create trigger sellers_set_updated_at
  before update on public.sellers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- legal_entities: the LLC / corporation behind a seller (public filings)
-- A seller can have several candidate matches; is_primary marks the best.
-- ---------------------------------------------------------------------
create table public.legal_entities (
  id                        uuid primary key default gen_random_uuid(),
  seller_id                 uuid not null references public.sellers (id) on delete cascade,
  legal_name                text not null,
  entity_type               text,            -- LLC, Corporation, LP ...
  jurisdiction_state        text check (jurisdiction_state is null or jurisdiction_state ~ '^[A-Z]{2}$'),
  registration_number       text,
  status                    text,            -- Active, Inactive, Dissolved ... as filed
  formation_date            date,
  registered_address        text,
  registered_agent_name     text,            -- from public filings ONLY
  registered_agent_address  text,            -- from public filings ONLY
  match_confidence          smallint not null check (match_confidence between 0 and 100),
  match_reasons             jsonb,           -- why we think it matches (name score, state, address...)
  source                    public.data_source not null
                              check (source in ('cobalt', 'opencorporates', 'manual')),
  source_url                text,            -- link to the filing, if provided
  raw                       jsonb,
  is_primary                boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index legal_entities_seller_idx on public.legal_entities (seller_id);
create unique index legal_entities_one_primary_per_seller
  on public.legal_entities (seller_id) where is_primary;
create unique index legal_entities_no_dupe_filing
  on public.legal_entities (seller_id, jurisdiction_state, registration_number)
  where registration_number is not null;

create trigger legal_entities_set_updated_at
  before update on public.legal_entities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- contacts: phone numbers and emails, each labelled by type and source
-- ---------------------------------------------------------------------
create table public.contacts (
  id                     uuid primary key default gen_random_uuid(),
  seller_id              uuid not null references public.sellers (id) on delete cascade,
  contact_type           public.contact_type not null,
  full_name              text,         -- person's name (owner contacts)
  title                  text,         -- e.g. CEO, Founder
  value                  text not null check (btrim(value) <> ''),  -- the phone number or email
  source                 public.data_source not null,
  confidence             smallint not null check (confidence between 0 and 100),
  source_record_id       text,         -- e.g. Apollo person / organization id
  verified_at            timestamptz,
  do_not_contact         boolean not null default false,
  do_not_contact_reason  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- HARD RULE: decision-maker direct lines / emails come from Apollo only.
  constraint contacts_owner_from_apollo check (
    contact_type not in ('owner_direct_phone', 'owner_email') or source = 'apollo'
  ),
  -- Owner contacts must name the person they belong to.
  constraint contacts_owner_has_name check (
    contact_type not in ('owner_direct_phone', 'owner_email') or full_name is not null
  ),
  constraint contacts_no_dupes unique (seller_id, contact_type, value)
);

create index contacts_seller_idx on public.contacts (seller_id);
create index contacts_type_idx   on public.contacts (contact_type);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- job_runs: one row per pipeline run (POC run, scheduled job, "Run now")
-- ---------------------------------------------------------------------
create table public.job_runs (
  id                 uuid primary key default gen_random_uuid(),
  job_type           text not null check (job_type in
                       ('poc', 'collect_new', 'refresh_stale', 'enrich_unenriched', 'manual')),
  trigger            text not null default 'manual' check (trigger in ('manual', 'schedule')),
  status             text not null default 'queued' check (status in
                       ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  triggered_by       uuid references auth.users (id) on delete set null,
  sellers_total      integer not null default 0,
  sellers_succeeded  integer not null default 0,
  sellers_failed     integer not null default 0,
  credits_used       jsonb not null default '{}'::jsonb,  -- {"rainforest": 12, "apollo": 3}
  error              text,
  started_at         timestamptz,
  finished_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index job_runs_created_idx on public.job_runs (created_at desc);

-- ---------------------------------------------------------------------
-- enrichment_runs: one row per API call attempt per seller per step
-- (the detailed log behind match rates, failures and credit usage)
-- ---------------------------------------------------------------------
create table public.enrichment_runs (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.sellers (id) on delete cascade,
  job_run_id    uuid references public.job_runs (id) on delete set null,
  step          public.pipeline_step not null,
  provider      public.data_source not null,
  status        public.step_status not null check (status <> 'pending'),
  error         text,
  http_status   integer,
  attempts      smallint not null default 1 check (attempts >= 1),
  credits_used  numeric(10, 2) not null default 0 check (credits_used >= 0),
  duration_ms   integer,
  ran_at        timestamptz not null default now()
);

create index enrichment_runs_seller_idx on public.enrichment_runs (seller_id, ran_at desc);
create index enrichment_runs_job_idx    on public.enrichment_runs (job_run_id);
create index enrichment_runs_daily_idx  on public.enrichment_runs (provider, ran_at);

-- Credits used per provider per day (UTC) — powers the Apollo daily limit.
create view public.daily_credit_usage
with (security_invoker = true) as
select
  (ran_at at time zone 'utc')::date as usage_date,
  provider,
  count(*)                          as calls,
  sum(credits_used)                 as credits_used
from public.enrichment_runs
group by 1, 2;

-- ---------------------------------------------------------------------
-- duplicate_candidates: possible duplicates for human review
-- ---------------------------------------------------------------------
create table public.duplicate_candidates (
  id           uuid primary key default gen_random_uuid(),
  seller_a     uuid not null references public.sellers (id) on delete cascade,
  seller_b     uuid not null references public.sellers (id) on delete cascade,
  match_type   text not null check (match_type in ('name', 'address', 'name_and_address', 'legal_entity')),
  similarity   numeric(4, 3) not null check (similarity between 0 and 1),
  status       text not null default 'pending' check (status in
                 ('pending', 'confirmed_duplicate', 'not_duplicate')),
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint duplicate_candidates_ordered check (seller_a < seller_b),
  constraint duplicate_candidates_pair_key unique (seller_a, seller_b)
);

create index duplicate_candidates_status_idx on public.duplicate_candidates (status);

-- ---------------------------------------------------------------------
-- settings: a single row of app-wide settings
-- ---------------------------------------------------------------------
create table public.settings (
  id                          smallint primary key default 1 check (id = 1),
  us_only                     boolean  not null default true,
  apollo_daily_credit_limit   integer  not null default 50  check (apollo_daily_credit_limit >= 0),
  match_confidence_threshold  smallint not null default 70  check (match_confidence_threshold between 0 and 100),
  stale_after_days            smallint not null default 30  check (stale_after_days between 1 and 365),
  updated_at                  timestamptz not null default now(),
  updated_by                  uuid references auth.users (id) on delete set null
);

insert into public.settings (id) values (1);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- The browser uses the public "anon" key, so these policies are what
-- actually protect the data. Edge Functions use the service-role key
-- (kept in Supabase secrets) which bypasses RLS to write pipeline data.
-- =====================================================================
alter table public.team_allowed_emails  enable row level security;
alter table public.team_members         enable row level security;
alter table public.sellers              enable row level security;
alter table public.legal_entities       enable row level security;
alter table public.contacts             enable row level security;
alter table public.job_runs             enable row level security;
alter table public.enrichment_runs      enable row level security;
alter table public.duplicate_candidates enable row level security;
alter table public.settings             enable row level security;

-- Logged-out visitors get nothing at all.
revoke all on all tables in schema public from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_team_member(), public.is_team_admin() to authenticated;

-- team
create policy "team can see team"        on public.team_members        for select to authenticated using (public.is_team_member());
create policy "admins manage allowlist"  on public.team_allowed_emails for all    to authenticated using (public.is_team_admin()) with check (public.is_team_admin());

-- sellers: team can view, add (paste seller IDs) and edit (e.g. do-not-contact); admins delete
create policy "team reads sellers"    on public.sellers for select to authenticated using (public.is_team_member());
create policy "team adds sellers"     on public.sellers for insert to authenticated with check (public.is_team_member());
create policy "team edits sellers"    on public.sellers for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy "admins delete sellers" on public.sellers for delete to authenticated using (public.is_team_admin());

-- legal entities: written by the pipeline; team can view and correct
create policy "team reads entities"  on public.legal_entities for select to authenticated using (public.is_team_member());
create policy "team edits entities"  on public.legal_entities for update to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- contacts: written by the pipeline; team can view and flag do-not-contact
create policy "team reads contacts"  on public.contacts for select to authenticated using (public.is_team_member());
create policy "team edits contacts"  on public.contacts for update to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- logs: read-only for the team
create policy "team reads job runs"        on public.job_runs        for select to authenticated using (public.is_team_member());
create policy "team reads enrichment runs" on public.enrichment_runs for select to authenticated using (public.is_team_member());

-- duplicates: team reviews them
create policy "team reads duplicates"   on public.duplicate_candidates for select to authenticated using (public.is_team_member());
create policy "team reviews duplicates" on public.duplicate_candidates for update to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- settings: everyone on the team can see them; only admins change them
create policy "team reads settings"    on public.settings for select to authenticated using (public.is_team_member());
create policy "admins change settings" on public.settings for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
