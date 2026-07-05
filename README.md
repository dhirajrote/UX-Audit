# Auditlane — UX Audit Management App

A single-file React application for running structured UX/UI audits: project workspaces, module/screen trees, issue tracking with AI-assisted recommendations, severity/area configuration, reporting, and a full multi-format Export Center (PDF, XLSX, CSV, DOCX, PPTX, JSON).

Now backed by a real backend: Vercel serverless functions for an AI proxy (keeps your Anthropic key secret) and Supabase Postgres for persistence.

## 1. Set up Supabase (persistence)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates a single `app_state` table that stores the whole app state as JSON (projects, screens, issues, config).
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (not the `anon` key — keep this one secret) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Set up the Anthropic API key (AI features)

Get a key from [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`.

## 3. Set up login

The app is gated behind a simple sign-in screen backed by a signed session cookie (no extra auth service required).

**Username and password are hardcoded** in `api/auth.js`:
- Username: `dheerajrote`
- Password: `Qwerty123!@#`

⚠️ Because this repo is public, that means they are **visible to anyone who reads the source** — this is a light gate, not a real secret. If you want to change or hide them later without touching code, set `AUTH_USERNAME` / `AUTH_PASSWORD` as environment variables — those override the hardcoded values.

You still need one required, private env var:
- `SESSION_SECRET` = any long random string, e.g. generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  This one **must** stay a private environment variable — it signs the session cookie. If it were hardcoded, anyone reading the repo could forge a valid login session without ever knowing the password.

This is single-user, cookie-based auth — good for a personal/internal tool, not a full multi-account identity system. If you need multiple people with their own logins later, Supabase Auth (already in the stack) is the natural upgrade.

## 4. Configure environment variables

Copy `.env.example` to `.env`. At minimum you need `SESSION_SECRET` plus the Supabase and Anthropic values from steps 1–2; `AUTH_USERNAME`/`AUTH_PASSWORD` are optional overrides. Locally, `vercel dev` reads `.env` automatically. On Vercel, add the same variables under **Project → Settings → Environment Variables**.

**Never commit `.env`** — it's already in `.gitignore`.

## 5. Run it

```bash
npm install

# Recommended: runs both the Vite frontend AND the /api serverless functions together
npm install -g vercel
vercel dev

# Frontend-only (AI/persistence/login calls will fail without the functions running)
npm run dev
```

`vercel dev` will print a local URL (typically `http://localhost:3000`) serving both the app and `/api/ai`, `/api/state`, `/api/auth`.

## 6. Deploy

Push to GitHub (already done) → import the repo at [vercel.com/new](https://vercel.com/new) → add all 6 environment variables in the Vercel dashboard → deploy. Vercel auto-detects the Vite frontend and the `/api` functions.

## Structure

- `src/App.jsx` — the complete frontend application (includes the login screen).
- `src/main.jsx` — Vite/React entry point.
- `index.html` — HTML shell.
- `api/auth.js` — login / logout / session-check serverless function.
- `api/_auth.js` — shared session signing/verification helpers (HMAC-signed cookie, no extra dependency).
- `api/ai.js` — serverless function proxying AI generation requests to Anthropic (requires a valid session).
- `api/state.js` — serverless function reading/writing app state to Supabase (requires a valid session).
- `api/_supabase.js` — shared Supabase client (service role, server-side only).
- `supabase/schema.sql` — one-time SQL to create the `app_state` table.

## Notes

- The frontend calls `/api/auth`, `/api/ai`, and `/api/state` first, and falls back to skipping the login gate plus a direct (keyless) Anthropic call and browser storage if those routes aren't reachable at all — so this same `src/App.jsx` still works if you paste it back into a Claude artifact without a backend, just without login, persistence across sessions, or a hidden API key. If `/api/auth` responds but says you're not logged in, the login screen is shown as expected either way.
- PDF/DOCX exports render as styled HTML (print-to-PDF for PDF, Word-compatible HTML for DOCX). PPTX exports as an HTML slide deck rather than a binary `.pptx`, since no pptx-writing library is used. See in-app labels for details.
- This is single-tenant (one shared `app_state` row, one login) — ask if you want multi-user support added later.


