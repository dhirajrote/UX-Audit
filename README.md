# Auditlane — UX Audit Management App

A single-file React application for running structured UX/UI audits: project workspaces, module/screen trees, issue tracking with AI-assisted recommendations, severity/area configuration, reporting, and a full multi-format Export Center (PDF, XLSX, CSV, DOCX, PPTX, JSON).

## Run it

```bash
npm install
npm run dev       # local dev server (Vite)
npm run build     # production build to dist/
npm run preview   # preview the production build
```

## Structure

- `src/App.jsx` — the complete application (components, state, styling, export/report generation).
- `src/main.jsx` — Vite/React entry point.
- `index.html` — HTML shell.

## Notes

- The AI Assistant and per-issue "Generate" actions call the Anthropic Messages API directly from the client (`https://api.anthropic.com/v1/messages`). Outside of the Claude Artifacts environment this call has no API key attached — wire up your own key or a small proxy server before deploying, since browsers can't safely hold a secret API key.
- PDF/DOCX exports render as styled HTML (print-to-PDF for PDF, Word-compatible HTML for DOCX). PPTX exports as an HTML slide deck rather than a binary `.pptx`, since no pptx-writing library is used. See in-app labels for details.
- Data is in-memory/seeded only in this scaffold — hook up `window.storage` (Claude Artifacts) or your own backend/localStorage for persistence outside that environment.

