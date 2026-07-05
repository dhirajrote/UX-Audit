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

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the three values above. Locally, `vercel dev` reads `.env` automatically. On Vercel, add the same three variables under **Project → Settings → Environment Variables**.

**Never commit `.env`** — it's already in `.gitignore`.

## 4. Run it

```bash
npm install

# Recommended: runs both the Vite frontend AND the /api serverless functions together
npm install -g vercel
vercel dev

# Frontend-only (AI/persistence calls will fail without the functions running)
npm run dev
```

`vercel dev` will print a local URL (typically `http://localhost:3000`) serving both the app and `/api/ai`, `/api/state`.

## 5. Deploy

Push to GitHub (already done) → import the repo at [vercel.com/new](https://vercel.com/new) → add the same 3 environment variables in the Vercel dashboard → deploy. Vercel auto-detects the Vite frontend and the `/api` functions.

## Structure

- `src/App.jsx` — the complete frontend application.
- `src/main.jsx` — Vite/React entry point.
- `index.html` — HTML shell.
- `api/ai.js` — serverless function proxying AI generation requests to Anthropic.
- `api/state.js` — serverless function reading/writing app state to Supabase.
- `api/_supabase.js` — shared Supabase client (service role, server-side only).
- `supabase/schema.sql` — one-time SQL to create the `app_state` table.

## Notes

- The frontend calls `/api/ai` and `/api/state` first, and falls back to a direct (keyless) Anthropic call and browser storage if those routes aren't available — so this same `src/App.jsx` still works if you paste it back into a Claude artifact without a backend, just without persistence across sessions or a hidden API key.
- PDF/DOCX exports render as styled HTML (print-to-PDF for PDF, Word-compatible HTML for DOCX). PPTX exports as an HTML slide deck rather than a binary `.pptx`, since no pptx-writing library is used. See in-app labels for details.
- This is single-tenant (one shared `app_state` row) — there's no login/multi-user support yet. Ask if you want auth added (Supabase Auth is a natural fit here).


