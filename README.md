# Auditlane — UX Audit Management App

A single-file React application for running structured UX/UI audits: project workspaces, module/screen trees, issue tracking with AI-assisted recommendations, severity/area configuration, reporting, and a full multi-format Export Center (PDF, XLSX, CSV, DOCX, PPTX, JSON).

Backed by a real backend: Vercel serverless functions for an AI proxy (keeps your Anthropic key secret) and Supabase Postgres for persistence, plus multi-user login with open registration — every account (including newly registered ones) gets its own completely private set of projects. The Audit Workspace also supports bulk import (paste an outline or upload a CSV), inline rename/delete for modules and screens, project edit/delete, and a per-project summary panel.

## 1. Set up Supabase (persistence + accounts)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates:
   - `app_state` — one row per user, storing their whole app state (projects, screens, issues, config) as JSON.
   - `users` — registered accounts (username + bcrypt password hash). The built-in admin account is *not* a row here — see below.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (not the `anon` key — keep this one secret) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Set up the Anthropic API key (AI features)

Get a key from [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`.

## 3. Accounts: admin login + open registration

**Admin account** — hardcoded in `api/auth.js` at the user's explicit request:
- Username: `dheerajrote`
- Password: `Qwerty123!@#`

⚠️ Because this repo is public, that means these are **visible to anyone who reads the source** — a light gate, not a real secret. Override with `AUTH_USERNAME` / `AUTH_PASSWORD` env vars if you want them private instead.

**Registered accounts** — anyone can create an account from the login screen ("Create one" link → username + password, 8+ char minimum). Passwords are hashed with bcrypt before being stored; nothing is ever stored in plaintext. Each registered account gets its own private `app_state` row — **registered users never see the admin's projects, and different registered users never see each other's projects.**

You still need one required, private env var:
- `SESSION_SECRET` = any long random string, e.g. generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  This **must** stay a private environment variable — it signs the session cookie. If it were hardcoded, anyone reading the repo could forge a valid login session for any account without ever knowing a password.

**If you were already running this app before registration was added** (i.e. you have existing data saved under `app_state.id = 'default'`), run the one-time migration at the bottom of `supabase/schema.sql` to move it onto the admin account's new id (`'admin'`) so you don't lose it.

## 4. Configure environment variables

Copy `.env.example` to `.env`. At minimum you need `SESSION_SECRET` plus the Supabase and Anthropic values from steps 1–2; `AUTH_USERNAME`/`AUTH_PASSWORD` are optional overrides. Locally, `vercel dev` reads `.env` automatically. On Vercel, add the same variables under **Project → Settings → Environment Variables**.

**Never commit `.env`** — it's already in `.gitignore`. (`.env.example` is committed but must only ever contain placeholders — never paste real values into it.)

## 5. Run it

```bash
npm install

# Recommended: runs both the Vite frontend AND the /api serverless functions together
npm install -g vercel
vercel dev

# Frontend-only (AI/persistence/login calls will fail without the functions running)
npm run dev
```

`vercel dev` will print a local URL (typically `http://localhost:3000`) serving both the app and `/api/ai`, `/api/state`, `/api/auth`, `/api/register`.

## 6. Deploy

Push to GitHub (already done) → import the repo at [vercel.com/new](https://vercel.com/new) → add all 6 environment variables in the Vercel dashboard → deploy. Vercel auto-detects the Vite frontend and the `/api` functions.

## Structure

- `src/App.jsx` — the complete frontend application (includes the login/register screens).
- `src/main.jsx` — Vite/React entry point.
- `index.html` — HTML shell.
- `api/auth.js` — login / logout / session-check (checks the admin account first, then the `users` table).
- `api/register.js` — creates a new user account (bcrypt-hashed password) and logs them in.
- `api/_auth.js` — shared session signing/verification helpers (HMAC-signed cookie, no extra dependency).
- `api/ai.js` — serverless function proxying AI generation requests to Anthropic (requires a valid session, any account).
- `api/state.js` — serverless function reading/writing app state to Supabase, scoped to the caller's own session (`session.uid`) — never a client-supplied id.
- `api/_supabase.js` — shared Supabase client (service role, server-side only).
- `supabase/schema.sql` — one-time SQL to create the `app_state` and `users` tables, plus a migration for pre-existing single-user data.

## Notes

- The frontend calls `/api/auth`, `/api/ai`, and `/api/state` first, and falls back to skipping the login gate (with demo seed data) plus a direct (keyless) Anthropic call if those routes aren't reachable at all — so this same `src/App.jsx` still works if you paste it back into a Claude artifact without a backend, just without login, multi-user data isolation, persistence across sessions, or a hidden API key. Real backend deployments start every new account with zero projects, not the demo data.
- PDF/DOCX exports render as styled HTML (print-to-PDF for PDF, Word-compatible HTML for DOCX). PPTX exports as an HTML slide deck rather than a binary `.pptx`, since no pptx-writing library is used. See in-app labels for details.
- Registration is open to anyone who reaches `/api/register` — there's no invite code or admin approval step. If you want to lock that down later (invite-only, email verification, admin approval queue), that's a reasonable next addition.
