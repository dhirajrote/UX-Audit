# Auditlane — UX Audit Management App

A single-file React application for running structured UX/UI audits: project workspaces, module/screen trees, issue tracking with AI-assisted recommendations, severity/area configuration, reporting, and a full multi-format Export Center (PDF, XLSX, CSV, DOCX, PPTX, JSON).

## Structure

- `src/App.jsx` — the complete application (components, state, styling, export/report generation).

## Notes

- Built as a self-contained React component (no build config included yet). To run it locally, drop it into a standard Vite/CRA React app as the root component and install its dependencies: `lucide-react`, `recharts`, `xlsx`.
- The AI Assistant and per-issue "Generate" actions call the Anthropic Messages API directly from the client — wire up your own API key/proxy before deploying outside of the Claude Artifacts environment.
- PDF/DOCX exports render as styled HTML (print-to-PDF for PDF, Word-compatible HTML for DOCX). PPTX exports as an HTML slide deck. See in-app labels for details.
