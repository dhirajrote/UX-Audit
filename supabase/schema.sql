-- Run this once in your Supabase project's SQL editor (Project → SQL Editor → New query).
-- If you already ran an earlier version of this file, it's safe to re-run —
-- everything uses "if not exists".

create extension if not exists pgcrypto;

-- One row per user (admin or registered), storing their entire app state
-- (projects, screen types, areas, severities, theme) as JSON. The admin
-- account always uses id = 'admin'; registered users use their users.id
-- (as text). The API derives this id from the session server-side — it's
-- never trusted from the client.
create table if not exists app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Registered user accounts (created via the Register screen / api/register.js).
-- The built-in admin account (dheerajrote) is NOT a row here — it's checked
-- against env vars / hardcoded values in api/auth.js and always uses
-- app_state.id = 'admin'.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security is enabled by default on new Supabase projects.
-- This app talks to Supabase only through the serverless functions in /api,
-- which use the SERVICE ROLE key (bypasses RLS). No client-side Supabase
-- calls are made, so no public policies are required. If you later want to
-- call Supabase directly from the browser with the anon key instead, add
-- appropriate RLS policies before doing so.
alter table app_state enable row level security;
alter table users enable row level security;

-- ---------------------------------------------------------------------
-- SUBSCRIPTIONS & PACKAGES
-- No real payment gateway is wired up (by request) — payments are recorded
-- manually by the admin, and package assignment can be done by the admin
-- at any time. Every table here is keyed by the same user id used
-- elsewhere ('admin' for the built-in account, users.id as text for
-- registered accounts).
-- ---------------------------------------------------------------------

create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric not null default 0,        -- monthly price
  yearly_price numeric,                     -- optional yearly price
  billing_cycle text not null default 'monthly', -- 'monthly' | 'yearly' | 'both' | 'trial' | 'enterprise'
  features jsonb not null default '[]',     -- array of strings
  user_limit int,                           -- null = unlimited
  storage_limit text,                       -- free-form, e.g. "5 GB"
  is_trial boolean not null default false,
  is_enterprise boolean not null default false,
  is_default boolean not null default false, -- auto-assigned to new registrations
  trial_days int not null default 15,       -- only meaningful when is_trial = true
  status text not null default 'active',    -- 'active' | 'inactive'
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per user: their current subscription state.
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  package_id uuid references packages(id),
  status text not null default 'trial',     -- 'trial' | 'active' | 'expired' | 'cancelled'
  billing_cycle text,                       -- 'monthly' | 'yearly' | null
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_end timestamptz,           -- renewal date, for paid plans
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only audit log of every subscription change.
create table if not exists subscription_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  from_package_id uuid,
  to_package_id uuid,
  action text not null,   -- trial_started | upgraded | downgraded | cancelled | renewed | admin_assigned | trial_extended | trial_ended | reactivated
  actor text not null default 'user', -- 'user' | 'admin'
  notes text,
  created_at timestamptz not null default now()
);

-- Manually-recorded payments (no live payment gateway is connected).
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  package_id uuid,
  amount numeric not null default 0,
  billing_cycle text,
  status text not null default 'paid', -- 'paid' | 'pending' | 'failed' | 'cancelled'
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- In-app notifications (trial expiring, renewal, payment status, package changes).
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- "Contact Sales" / "Request a Demo" submissions for the Enterprise package.
create table if not exists sales_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  package_id uuid,
  message text,
  status text not null default 'new', -- 'new' | 'contacted' | 'closed'
  created_at timestamptz not null default now()
);

alter table packages enable row level security;
alter table subscriptions enable row level security;
alter table subscription_history enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table sales_requests enable row level security;

-- Seed the 3 default packages described in the spec. Safe to re-run — only
-- inserts if a package with that name doesn't already exist.
insert into packages (name, description, price, yearly_price, billing_cycle, features, is_trial, is_enterprise, is_default, trial_days, status, display_order)
select 'Free Trial', 'Try the full audit workflow before you buy.', 0, null, 'trial',
  '["Full audit workspace", "AI-assisted recommendations", "Export Center (all formats)", "Up to 2 projects"]'::jsonb,
  true, false, true, 15, 'active', 0
where not exists (select 1 from packages where name = 'Free Trial');

insert into packages (name, description, price, yearly_price, billing_cycle, features, is_trial, is_enterprise, is_default, trial_days, status, display_order)
select 'Individual', 'For freelance and independent UX auditors.', 19, 190, 'both',
  '["Unlimited projects", "AI-assisted recommendations", "Export Center (all formats)", "Priority support"]'::jsonb,
  false, false, false, 0, 'active', 1
where not exists (select 1 from packages where name = 'Individual');

insert into packages (name, description, price, yearly_price, billing_cycle, features, is_trial, is_enterprise, is_default, trial_days, status, display_order)
select 'Team / Enterprise', 'For agencies and organizations auditing at scale.', 0, null, 'enterprise',
  '["Everything in Individual", "Multiple team members", "Custom feature allocation", "Dedicated support"]'::jsonb,
  false, true, false, 0, 'active', 2
where not exists (select 1 from packages where name = 'Team / Enterprise');

-- ---------------------------------------------------------------------
-- PREMIUM FEATURE GATING
-- feature_flags is a jsonb object of { featureKey: boolean }, editable by
-- the admin per-package (Packages screen). Currently gated: "audit_templates".
-- Backfill only sets a default for packages that don't already have the key,
-- so re-running this won't clobber an admin's own toggle choices.
-- ---------------------------------------------------------------------
alter table packages add column if not exists feature_flags jsonb not null default '{}'::jsonb;

update packages set feature_flags = feature_flags || '{"audit_templates": false}'::jsonb
where name = 'Free Trial' and not (feature_flags ? 'audit_templates');

update packages set feature_flags = feature_flags || '{"audit_templates": true}'::jsonb
where name in ('Individual', 'Team / Enterprise') and not (feature_flags ? 'audit_templates');

-- ---------------------------------------------------------------------
-- LANDING PAGE CRM
-- Public lead capture from the marketing landing page (logged-out visitors,
-- so this table is written to from an unauthenticated endpoint —
-- api/leads.js POST). No login required to submit; GET/PUT are admin-only.
-- ---------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  message text,
  interested_package text,
  source text not null default 'landing_page',
  status text not null default 'new', -- 'new' | 'contacted' | 'qualified' | 'converted' | 'closed'
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table leads enable row level security;

-- ---------------------------------------------------------------------
-- ONE-TIME MIGRATION (only needed if you had this app running BEFORE the
-- registration/multi-user update, i.e. you already have data saved under
-- app_state.id = 'default'). Run this once to move your existing admin
-- data onto the new 'admin' id — safe to skip if you're starting fresh.
-- ---------------------------------------------------------------------
-- update app_state set id = 'admin' where id = 'default';
