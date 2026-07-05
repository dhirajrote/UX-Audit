-- Run this once in your Supabase project's SQL editor (Project → SQL Editor → New query).

create table if not exists app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security is enabled by default on new Supabase projects.
-- This app talks to Supabase only through the serverless functions in /api,
-- which use the SERVICE ROLE key (bypasses RLS). No client-side Supabase
-- calls are made, so no public policies are required. If you later want to
-- call Supabase directly from the browser with the anon key instead, add
-- appropriate RLS policies before doing so.
alter table app_state enable row level security;
