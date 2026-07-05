// /api/_supabase.js
// Shared Supabase client for serverless functions. Uses the SERVICE ROLE key,
// which must never be exposed to the browser — it's only read here, server-side.

import { createClient } from "@supabase/supabase-js";

let client = null;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.");
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return client;
}
