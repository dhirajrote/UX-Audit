# Annotex — UX Audit Management App

A single-file React application for running structured UX/UI audits: project workspaces, module/screen trees, issue tracking with AI-assisted recommendations, severity/area configuration, reporting, and a full multi-format Export Center (PDF, XLSX, CSV, DOCX, PPTX, JSON).

Backed by a real backend: Vercel serverless functions for an AI proxy (keeps your Anthropic key secret) and Supabase Postgres for persistence, plus multi-user login with open registration — every account (including newly registered ones) gets its own completely private set of projects. The Audit Workspace also supports bulk import (paste an outline or upload a CSV), inline rename/delete for modules and screens, project edit/delete, and a per-project summary panel. There's also a full subscription/plan system: free trial, paid, and enterprise packages, with admin tooling to manage every user's plan, trial, and payment status. A public marketing landing page (hero, features, live pricing) is the entry point for anyone who isn't logged in yet. And there's a full **Audit Templates** module: 15 built-in checklists based on standard UX evaluation methods (heuristic evaluation, WCAG accessibility, cognitive walkthrough, visual design, and more), a checklist builder for custom templates, 8 scoring models, template versioning, and AI assistance on every checklist item.

## 1. Set up Supabase (persistence + accounts + billing)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates:
   - `app_state` — one row per user, storing their whole app state (projects, screens, issues, config) as JSON.
   - `users` — registered accounts (username + bcrypt password hash). The built-in admin account is *not* a row here — see below.
   - `packages`, `subscriptions`, `subscription_history`, `payments`, `notifications`, `sales_requests` — the billing system (see section 4). The script also seeds the 3 default packages (Free Trial, Individual, Team/Enterprise).
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

**Registered accounts** — anyone can create an account from the login screen ("Create one" link → username + password, 8+ char minimum). Passwords are hashed with bcrypt before being stored; nothing is ever stored in plaintext. Each registered account gets its own private `app_state` row — **registered users never see the admin's projects, and different registered users never see each other's projects.** Every new account starts pre-loaded with 2 sample projects (an e-commerce checkout audit and a mobile onboarding audit, each with a couple of example issues) so the app isn't a blank screen on first login — delete or edit them like any other project once you get your bearings.

You still need one required, private env var:
- `SESSION_SECRET` = any long random string, e.g. generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  This **must** stay a private environment variable — it signs the session cookie. If it were hardcoded, anyone reading the repo could forge a valid login session for any account without ever knowing a password.

**If you were already running this app before registration was added** (i.e. you have existing data saved under `app_state.id = 'default'`), run the one-time migration at the bottom of `supabase/schema.sql` to move it onto the admin account's new id (`'admin'`) so you don't lose it.

## 4. Subscriptions & billing

There's no payment gateway connected (Stripe, etc.) — by design, for now. Instead:

- Every new registration is automatically put on the **Free Trial** package (15 days by default) — this happens at signup, mirrored from the package marked `is_default` in the `packages` table.
- Users self-serve between **Free Trial** and **Individual** from the **Billing** page in the sidebar — choosing "Individual" applies immediately and logs a `pending` payment for the admin to confirm once they've actually collected payment (bank transfer, invoice, whatever you use outside the app).
- **Team / Enterprise** has no visible price — users hit "Contact Sales", which files a request under the admin's **Subscriptions → Sales Requests** tab. The admin manually assigns the Enterprise package (or any package) to that user from **Subscriptions → All Subscriptions → Manage**.
- The admin's **Subscriptions** screen can, per user: assign/change their package, extend or end a trial, extend a paid period, activate/deactivate, and record a payment (paid/pending/failed) — this is the "admin manually marks paid plans" flow. The **Packages** screen is full CRUD for the packages themselves (a package can't be deleted while users are on it — archive it instead by setting Status to Inactive). **Overview** has the analytics: trial/paid counts, conversion rate, revenue, package-wise subscriber counts, expiring subscriptions, and recent upgrades/downgrades.
- Users get a slim in-app banner when their trial has ≤3 days left or has expired, and a notification bell (top right) for trial/renewal/payment/package-change events. There's no email delivery — everything is in-app only.
- The admin account itself isn't billed — it's exempt from all of this.

If you want real payment collection later, Stripe is the natural next step: Checkout/Billing Portal for the user-facing flow, and a webhook that calls the same `assign_package` / `record_payment` logic already in `api/admin/subscriptions.js` instead of the admin doing it by hand.

## 5. Configure environment variables

Copy `.env.example` to `.env`. At minimum you need `SESSION_SECRET` plus the Supabase and Anthropic values from steps 1–2; `AUTH_USERNAME`/`AUTH_PASSWORD` are optional overrides. Locally, `vercel dev` reads `.env` automatically. On Vercel, add the same variables under **Project → Settings → Environment Variables**.

**Never commit `.env`** — it's already in `.gitignore`. (`.env.example` is committed but must only ever contain placeholders — never paste real values into it.)

## 6. Run it

```bash
npm install

# Recommended: runs both the Vite frontend AND the /api serverless functions together
npm install -g vercel
vercel dev

# Frontend-only (AI/persistence/login calls will fail without the functions running)
npm run dev
```

`vercel dev` will print a local URL (typically `http://localhost:3000`) serving both the app and `/api/ai`, `/api/state`, `/api/auth`, `/api/register`.

## 7. Deploy

Push to GitHub (already done) → import the repo at [vercel.com/new](https://vercel.com/new) → add all 6 environment variables in the Vercel dashboard → deploy. Vercel auto-detects the Vite frontend and the `/api` functions.

## Structure

- `src/App.jsx` — the complete frontend application (includes the login/register screens).
- `src/main.jsx` — Vite/React entry point.
- `index.html` — HTML shell.
- `api/auth.js` — login / logout / session-check (checks the admin account first, then the `users` table).
- `api/register.js` — creates a new user account (bcrypt-hashed password), seeds their workspace with 2 sample projects, and logs them in.
- `api/_seedData.js` — the 2 sample projects (plus default screen types/areas/severities) given to every newly registered account.
- `api/users.js` — admin-only: list registered accounts, reset a user's password, or delete an account (and their data).
- `api/_auth.js` — shared session signing/verification helpers (HMAC-signed cookie, no extra dependency).
- `api/ai.js` — serverless function proxying AI generation requests to Anthropic (requires a valid session, any account).
- `api/state.js` — serverless function reading/writing app state to Supabase, scoped to the caller's own session (`session.uid`) — never a client-supplied id.
- `api/_supabase.js` — shared Supabase client (service role, server-side only).
- `api/subscription.js` — the caller's own subscription (view + self-service change plan/cancel/reactivate/contact sales).
- `api/packages.js` — package CRUD. GET is public (no login required — the landing page's pricing section needs it), and only returns active packages unless the caller is the admin; POST/PUT/DELETE are admin-only.
- `api/admin/subscriptions.js` — admin-only: list/inspect every user's subscription, assign packages, extend/end trials, activate/deactivate, extend periods, record payments.
- `api/admin/analytics.js` — admin-only: subscription analytics (trial/paid counts, conversion rate, revenue, expiring subscriptions, recent upgrades/downgrades).
- `api/admin/sales-requests.js` — admin-only: view and update "Contact Sales" submissions.
- `api/notifications.js` — the caller's own in-app notifications (trial/renewal/payment/package-change events).
- `api/_billing.js` — shared helpers (trial auto-assignment, status reconciliation, notification creation).
- `api/leads.js` — landing-page lead capture. POST is public (no login); GET/PUT (the admin CRM) are admin-only.
- `api/settings.js` — global appearance settings (primary color, default theme). GET is public (landing/login screens need it); PUT is admin-only.
- `supabase/schema.sql` — one-time SQL to create all tables (`app_state`, `users`, `packages`, `subscriptions`, `subscription_history`, `payments`, `notifications`, `sales_requests`, `leads`, `app_settings`), seed the 3 default packages, plus a migration for pre-existing single-user data.

## Notes

- The frontend calls `/api/auth`, `/api/ai`, and `/api/state` first, and falls back to skipping the login gate (with demo seed data) plus a direct (keyless) Anthropic call if those routes aren't reachable at all — so this same `src/App.jsx` still works if you paste it back into a Claude artifact without a backend, just without login, multi-user data isolation, persistence across sessions, or a hidden API key. Real backend deployments start every new account with zero projects, not the demo data.
- PDF/DOCX exports render as styled HTML (print-to-PDF for PDF, Word-compatible HTML for DOCX). PPTX exports as an HTML slide deck rather than a binary `.pptx`, since no pptx-writing library is used. See in-app labels for details.
- Registration is open to anyone who reaches `/api/register` — there's no invite code or admin approval step. The admin account has a **Users** screen (sidebar, admin-only) to see everyone who's registered, reset a forgotten password on their behalf, or delete an account entirely (which also removes their saved audit data). There's still no self-service "forgot password" flow for users themselves — an admin has to do it for them.
- The landing page (shown to anyone not logged in) pulls pricing live from `/api/packages`, and falls back to a hardcoded copy of the 3 seeded packages if that endpoint isn't reachable (e.g. no backend deployed yet), so the page never looks broken or empty. The Enterprise "Contact Sales" button on the landing page is a plain `mailto:` link (update the address in `src/App.jsx`'s `LandingPage` component) since there's no logged-in user yet to attach a sales request to — once someone's registered, the same action inside the app (Billing page) files a proper request the admin can see and act on.
- **Audit Templates** are entirely client-side: they live in the same per-user `app_state` JSON blob as your projects (no new tables), and every AI action on a checklist item reuses the existing `/api/ai` proxy — no new backend surface at all. The 15 built-in templates are seeded as a JS constant and merge in automatically for every account, including ones that registered before this feature shipped.
- Templates are **private per account** — there's no team/organization layer yet, so "share templates across teams" from the original spec isn't implemented. If you need real sharing (multiple people editing the same template library, comments, mentions, approvals), that requires an org/permissions model that doesn't exist yet, on top of the current strict per-account data isolation.
- "Combine multiple templates into one audit" works — pick more than one template when starting an audit and their checklists run together, with a per-template score plus a blended overall score.
- All 8 scoring models (Percentage, 5-Star, Numeric, Weighted, Pass/Fail, Maturity, UX Health, Overall Experience) are implemented via one shared scoring function — shown in full on the Review step of an audit run, with a "show all" toggle for every model's value alongside the primary one.
- Taking an audit is a step-by-step wizard: one checklist item per screen, a progress bar, a clickable step-dot overview (answered items marked distinctly), Back/Next navigation, and a Review step at the end showing every answer plus the full score breakdown before marking the audit complete. You can jump to any item at any time via the dots or the Review table's "Edit" links — it's guided, not locked into strict linear order.
- Import/export is JSON-only for now (upload a template JSON to import; export isn't wired to a button yet but the same shape used for import — `{name, category, description, checklist: [...]}` — is what a hand-written or scripted export should produce). CSV/Excel export and public shareable template links from the original spec aren't built.
- The "Future AI Features" section of the original spec (one-line AI-generated templates, Figma/screenshot ingestion, a community marketplace, benchmarking against historical audits, design-token integration) was intentionally left out of this pass — it's marked as future work in the spec itself.
- **Audit Templates is now a premium, gated feature.** Every package has a `feature_flags` jsonb column (e.g. `{"audit_templates": true}`), editable per-package from the admin **Packages** screen under "Gated features". Free Trial ships with it off; Individual and Enterprise ship with it on. Users without it see an upgrade prompt instead of the Templates screen (a soft UX gate, not a hard security boundary — the underlying data/AI calls are still protected the same way everything else already is, by the session).
  - **If you already had packages in Supabase before this update**, re-run `supabase/schema.sql` — it adds the `feature_flags` column and backfills it for packages still named exactly "Free Trial", "Individual", and "Team / Enterprise" (only where the flag isn't already set, so it won't override any manual toggling you've done). If you renamed a package, its flags won't auto-backfill — just toggle it yourself in the Packages screen.
- Templates can be assigned to a Project, Module, Screen, or the Entire Organization (all projects) when starting an audit. "Screen" already covers every screen type — popups, slide-outs, modals, drawers, wizards — since those are all just `type` values on the same Screen record; the picker now shows the type next to each screen's name to make that clear.
- **Landing page CRM**: the landing page's "Talk to sales" nav link and each pricing card's Enterprise "Contact Sales" button now open an in-app lead capture form (name, email, company, interested plan, message) instead of a `mailto:` link. Submissions are public (no login needed, since the visitor isn't a user yet) and land in a new `leads` table. The admin **Leads** screen (sidebar, admin-only) is a lightweight CRM: status pipeline (New → Contacted → Qualified → Converted → Closed), search, and per-lead notes.
  - This is the first genuinely public (unauthenticated) write endpoint in the app (`POST /api/leads`). There's no CAPTCHA or rate limiting on it — for a low-traffic personal/small-team site that's an acceptable tradeoff, but if this ever gets meaningful public traffic, add rate limiting or a CAPTCHA before relying on it.
- **Appearance settings** (Settings → Appearance, admin-only): a primary brand color and a default light/dark theme, both stored in a single global `app_settings` row and applied everywhere — the landing page, login/register screens, and as the starting theme for brand-new accounts. This is a global *default*, not a forced override: each signed-in account can still flip their own light/dark toggle in the sidebar same as before. The color is applied via CSS custom properties computed from the one hex value the admin picks (a darker shade for hover states, a light/dark tint for soft backgrounds depending on the active theme) — there's no separate control for those derived shades.
- **First-time welcome tour**: every account sees a 6-step guided intro on their first login (welcome, projects/workspace, bulk import, templates, AI, exports). It's shown exactly once — tracked via an `onboardingSeen` flag in the account's saved state — and can be skipped at any step. Accounts that existed before this feature shipped will see it once on their next login, since the flag didn't exist for them yet.
- **Bulk issue import**: in the Audit Workspace sidebar (the second upload button), paste or upload a CSV of issues — columns: Module, Screen, Screen Type, Audit Type, Area, Summary, Severity, Recommendation, Status (header names are matched loosely, and there's a downloadable template). Modules and screens are matched by name and auto-created if missing (flagged "new" in the preview), issue IDs continue your existing UX-###/UI-### numbering, and unknown severities fall back to medium with a per-line warning instead of failing the whole import.
