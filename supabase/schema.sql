-- AuditReady Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  created_at timestamptz default now(),
  stripe_customer_id text,
  stripe_subscription_status text,
  trial_ends_at timestamptz
);

-- Row Level Security for users
alter table public.users enable row level security;

create policy "Users can view own record"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own record"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own record"
  on public.users for insert
  with check (auth.uid() = id);

-- Xero connections table
create table public.xero_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  tenant_id text not null,
  tenant_name text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security for xero_connections
alter table public.xero_connections enable row level security;

create policy "Users can view own Xero connections"
  on public.xero_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own Xero connections"
  on public.xero_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own Xero connections"
  on public.xero_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own Xero connections"
  on public.xero_connections for delete
  using (auth.uid() = user_id);

-- Reports table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  generated_at timestamptz default now(),
  period_month text not null,
  raw_xero_data jsonb,
  ai_report_content jsonb,
  status text not null default 'generating' check (status in ('generating', 'complete', 'failed')),
  created_at timestamptz default now()
);

-- Row Level Security for reports
alter table public.reports enable row level security;

create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reports"
  on public.reports for update
  using (auth.uid() = user_id);

-- Index for faster report lookups
create index reports_user_id_idx on public.reports(user_id);
create index reports_generated_at_idx on public.reports(generated_at desc);

-- Auto-create user record on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, trial_ends_at)
  values (
    new.id,
    new.email,
    now() + interval '14 days'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
