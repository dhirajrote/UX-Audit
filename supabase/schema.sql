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
-- ONE-TIME MIGRATION (only needed if you had this app running BEFORE the
-- registration/multi-user update, i.e. you already have data saved under
-- app_state.id = 'default'). Run this once to move your existing admin
-- data onto the new 'admin' id — safe to skip if you're starting fresh.
-- ---------------------------------------------------------------------
-- update app_state set id = 'admin' where id = 'default';
