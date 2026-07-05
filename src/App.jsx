import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LayoutDashboard, FolderKanban, ClipboardList, Settings as SettingsIcon,
  FileBarChart, Search, Command, Plus, X, ChevronRight, ChevronDown,
  Sparkles, Sun, Moon, Filter, ArrowUpDown, Trash2, Pencil, Save,
  ImagePlus, Wand2, Loader2, Check, AlertTriangle, Clock, Layers,
  Monitor, Smartphone, PanelRightClose, MoreHorizontal, Download,
  TrendingUp, CircleAlert, CheckCircle2, ChevronsUpDown, GripVertical,
  FileText, FileSpreadsheet, FileType2, Presentation, Braces, Building2,
  Link2, Mail, RotateCcw, ExternalLink, Printer, CheckSquare, Square,
  CalendarRange, UserCircle2, Image as ImageIcon, ArrowLeft, Info, LogOut, Lock, Eye, EyeOff
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts";
import * as XLSX from "xlsx";

/* ============================== SEED DATA ============================== */

const SEVERITY_DEFAULTS = [
  { id: "critical", label: "Critical", color: "#DC2626", priority: 1, icon: "🔴" },
  { id: "high", label: "High", color: "#EA580C", priority: 2, icon: "🟠" },
  { id: "medium", label: "Medium", color: "#D97706", priority: 3, icon: "🟡" },
  { id: "low", label: "Low", color: "#16A34A", priority: 4, icon: "🟢" },
];

const SCREEN_TYPE_DEFAULTS = [
  { id: "screen", name: "Screen", minutes: 60, status: "active" },
  { id: "popup", name: "Popup", minutes: 30, status: "active" },
  { id: "slideout", name: "Slide Out", minutes: 30, status: "active" },
  { id: "bottomsheet", name: "Bottom Sheet", minutes: 30, status: "active" },
  { id: "wizard", name: "Wizard", minutes: 45, status: "active" },
  { id: "modal", name: "Modal", minutes: 20, status: "active" },
  { id: "drawer", name: "Drawer", minutes: 30, status: "active" },
];

const AREA_DEFAULTS = [
  "Navigation", "Information Architecture", "Visual Hierarchy", "Accessibility",
  "Forms", "Buttons", "Inputs", "Icons", "Typography", "Spacing", "Consistency",
  "Color", "Interaction", "Feedback", "Layout", "Performance", "Content",
  "Search", "Filters", "Tables", "Cards", "Charts", "Error Handling",
  "Notifications", "Loading State", "Empty State", "Micro Interactions",
  "Onboarding", "Responsive", "Others",
];

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

function makeSeedProjects() {
  const proj1 = {
    id: uid("proj"),
    name: "Caliber Health Analytics",
    client: "Caliber",
    status: "In Progress",
    updatedAt: Date.now() - 1000 * 60 * 60 * 6,
    modules: [
      {
        id: uid("mod"),
        name: "Authentication",
        screens: [
          mkScreen("Login", "screen", ["UX", "UI"], [
            mkIssue("UX", 1, "Navigation", "No visible way to recover a forgotten password from the primary login form.", "high", "Add a persistent 'Forgot password?' link directly under the password field.", "Redesign a SaaS login screen with email/password fields, a visible 'Forgot password?' link under the password field, and a primary CTA button in modern blue (#3B5BDB). Clean enterprise aesthetic, Inter typeface, 12px rounded corners.", "Open"),
            mkIssue("UI", 1, "Buttons", "Primary CTA and secondary 'Create account' link have near-identical visual weight, causing hesitation.", "medium", "Increase contrast between primary button (solid fill) and secondary action (text link) to establish clear hierarchy.", "", "Open"),
          ]),
          mkScreen("Register", "screen", ["UX"], [
            mkIssue("UX", 2, "Forms", "Password requirements are only shown after a failed submit, causing repeated errors.", "high", "Show password requirements inline, before first submission attempt.", "", "In Review"),
          ]),
          mkScreen("Forgot Password", "popup", ["UX", "UI"], []),
        ],
      },
      {
        id: uid("mod"),
        name: "Dashboard",
        screens: [
          mkScreen("Overview", "screen", ["UX", "UI"], [
            mkIssue("UX", 3, "Information Architecture", "Critical patient alerts are visually subordinate to low-priority widgets like 'Tips'.", "critical", "Move critical alerts to the top of the visual hierarchy, above the fold, with a distinct color treatment.", "Design a healthcare analytics dashboard hero section where critical patient alerts are the most visually dominant element, using a restrained red accent, above supporting KPI cards.", "Open"),
            mkIssue("UI", 2, "Charts", "Chart legends use color only to differentiate series, failing WCAG AA for colorblind users.", "high", "Add patterns or direct labeling in addition to color to differentiate chart series.", "", "Open"),
          ]),
        ],
      },
      {
        id: uid("mod"),
        name: "Reports",
        screens: [ mkScreen("Report Builder", "screen", ["UX"], []) ],
      },
    ],
  };

  const proj2 = {
    id: uid("proj"),
    name: "InnoVerv Entertainment Site",
    client: "InnoVerv",
    status: "Draft",
    updatedAt: Date.now() - 1000 * 60 * 60 * 30,
    modules: [
      {
        id: uid("mod"),
        name: "Marketing",
        screens: [
          mkScreen("Home", "screen", ["UX", "UI"], [
            mkIssue("UI", 3, "Typography", "Hero heading and body copy share near-identical font sizes, weakening the visual entry point.", "medium", "Increase the type scale contrast between hero heading and supporting copy.", "", "Open"),
          ]),
          mkScreen("Contact", "screen", ["UX"], []),
        ],
      },
    ],
  };

  return [proj1, proj2];
}

function mkScreen(name, type, auditTypes, issues) {
  return {
    id: uid("scr"),
    name,
    type,
    auditTypes,
    auditDate: new Date().toISOString().slice(0, 10),
    status: issues.length ? "In Progress" : "Not Started",
    issues,
  };
}
let __ux = 0, __ui = 0;
function mkIssue(auditType, n, area, summary, severity, recommendation, aiPrompt, status) {
  if (auditType === "UX") __ux = Math.max(__ux, n); else __ui = Math.max(__ui, n);
  return {
    id: `${auditType}-${String(n).padStart(3, "0")}`,
    auditType, area, summary, severity, recommendation, aiPrompt, status,
    createdAt: Date.now(),
  };
}

/* ============================== HELPERS ============================== */

function estimateMinutes(screenType, screenTypes) {
  const t = screenTypes.find((s) => s.name === screenType || s.id === screenType);
  return t ? t.minutes : 60;
}
function formatMinutes(min) {
  if (min < 60) return `${min} mins`;
  const h = min / 60;
  return `${h % 1 === 0 ? h : h.toFixed(1)} hr${h > 1 ? "s" : ""}`;
}
function severityMeta(sevId, severities) {
  return severities.find((s) => s.id === sevId) || severities[severities.length - 1];
}
function relTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function allScreens(projects) {
  return projects.flatMap((p) => p.modules.flatMap((m) => m.screens.map((s) => ({ ...s, projectId: p.id, projectName: p.name, moduleId: m.id, moduleName: m.name }))));
}
function allIssues(projects) {
  return allScreens(projects).flatMap((s) => s.issues.map((i) => ({ ...i, screenId: s.id, screenName: s.name, screenType: s.type, projectId: s.projectId, projectName: s.projectName, moduleId: s.moduleId, moduleName: s.moduleName })));
}

async function callClaude(prompt, system) {
  // Preferred path: our own backend proxy (/api/ai), which keeps the Anthropic
  // API key server-side. Falls back to a direct call for environments where
  // no backend is deployed (e.g. previewing this file as a Claude artifact).
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, system }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
    }
  } catch (e) { /* no backend available, fall through */ }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: system || "You are a senior UX auditor helping write concise, professional audit findings for an enterprise UX audit tool. Be specific and actionable. No preamble, no markdown headers, just the requested content.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  return text;
}

/* ---- persistence helpers: backend (Supabase via /api/state) with graceful fallback ---- */
async function loadAppState() {
  try {
    const res = await fetch("/api/state?id=default");
    if (res.ok) {
      const { data } = await res.json();
      if (data) return data;
      return null; // backend reachable, just no saved state yet
    }
  } catch (e) { /* no backend, fall through to local fallbacks */ }
  try {
    const raw = (await window.storage?.get("uxaudit:state"))?.value;
    if (raw) return JSON.parse(raw);
  } catch (e) { /* not running inside Claude artifact */ }
  try {
    const raw = window.localStorage?.getItem("uxaudit:state");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
async function saveAppState(state) {
  try {
    const res = await fetch("/api/state?id=default", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (res.ok) return;
  } catch (e) { /* no backend, fall through to local fallbacks */ }
  try { await window.storage?.set("uxaudit:state", JSON.stringify(state)); } catch (e) { /* ignore */ }
  try { window.localStorage?.setItem("uxaudit:state", JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ============================== APP ROOT ============================== */

function AppShell({ username, onLogout }) {
  const [theme, setTheme] = useState("light");
  const [projects, setProjects] = useState(() => makeSeedProjects());
  const [screenTypes, setScreenTypes] = useState(SCREEN_TYPE_DEFAULTS);
  const [areas, setAreas] = useState(AREA_DEFAULTS);
  const [severities, setSeverities] = useState(SEVERITY_DEFAULTS);
  const [activity, setActivity] = useState([
    { id: uid("act"), text: "Audit saved for Login", ts: Date.now() - 1000 * 60 * 12 },
    { id: uid("act"), text: "New issue UX-003 created in Dashboard / Overview", ts: Date.now() - 1000 * 60 * 60 * 2 },
    { id: uid("act"), text: "Project InnoVerv Entertainment Site updated", ts: Date.now() - 1000 * 60 * 60 * 30 },
  ]);

  const [view, setView] = useState("dashboard");
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeScreenId, setActiveScreenId] = useState(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [issuePanel, setIssuePanel] = useState(null); // {mode:'new'|'edit', screenId, issue}
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [exportCtx, setExportCtx] = useState(null);
  const openExport = useCallback((ctx) => setExportCtx(ctx), []);

  const showToast = useCallback((msg, icon) => {
    setToast({ msg, icon, id: uid("t") });
    setTimeout(() => setToast((t) => (t && t.msg === msg ? null : t)), 2600);
  }, []);
  const logActivity = useCallback((text) => {
    setActivity((a) => [{ id: uid("act"), text, ts: Date.now() }, ...a].slice(0, 20));
  }, []);

  /* ---- persistence ---- */
  useEffect(() => {
    (async () => {
      try {
        const parsed = await loadAppState();
        if (parsed) {
          if (parsed.projects) setProjects(parsed.projects);
          if (parsed.screenTypes) setScreenTypes(parsed.screenTypes);
          if (parsed.areas) setAreas(parsed.areas);
          if (parsed.severities) setSeverities(parsed.severities);
          if (parsed.theme) setTheme(parsed.theme);
        }
      } catch (e) { /* no saved state yet */ }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveAppState({ projects, screenTypes, areas, severities, theme });
    }, 500);
    return () => clearTimeout(t);
  }, [projects, screenTypes, areas, severities, theme, loaded]);

  /* ---- command palette keybind ---- */
  useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
      if (e.key === "Escape") { setCommandOpen(false); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const screensFlat = useMemo(() => allScreens(projects), [projects]);
  const issuesFlat = useMemo(() => allIssues(projects), [projects]);
  const activeScreen = screensFlat.find((s) => s.id === activeScreenId) || null;

  function openScreen(projectId, screenId) {
    setActiveProjectId(projectId);
    setActiveScreenId(screenId);
    setView("workspace");
  }
  function openProject(projectId) {
    const p = projects.find((pp) => pp.id === projectId);
    const firstScreen = p?.modules?.[0]?.screens?.[0];
    setActiveProjectId(projectId);
    setActiveScreenId(firstScreen ? firstScreen.id : null);
    setView("workspace");
  }

  function updateScreen(screenId, patch) {
    setProjects((prev) => prev.map((p) => ({
      ...p,
      modules: p.modules.map((m) => ({
        ...m,
        screens: m.screens.map((s) => (s.id === screenId ? { ...s, ...patch } : s)),
      })),
    })));
  }

  function saveIssue(screenId, issue, isNew) {
    setProjects((prev) => prev.map((p) => ({
      ...p,
      modules: p.modules.map((m) => ({
        ...m,
        screens: m.screens.map((s) => {
          if (s.id !== screenId) return s;
          const issues = isNew ? [...s.issues, issue] : s.issues.map((i) => (i.id === issue.id ? issue : i));
          return { ...s, issues, status: "In Progress" };
        }),
      })),
    })));
    logActivity(`${isNew ? "New issue" : "Issue updated"} ${issue.id} saved`);
    showToast(isNew ? "Issue created" : "Audit saved", "check");
  }

  function deleteIssue(screenId, issueId) {
    setProjects((prev) => prev.map((p) => ({
      ...p,
      modules: p.modules.map((m) => ({
        ...m,
        screens: m.screens.map((s) => (s.id === screenId ? { ...s, issues: s.issues.filter((i) => i.id !== issueId) } : s)),
      })),
    })));
    showToast("Issue deleted");
  }

  function nextIssueId(auditType) {
    const nums = issuesFlat.filter((i) => i.auditType === auditType).map((i) => parseInt(i.id.split("-")[1], 10)).filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${auditType}-${String(next).padStart(3, "0")}`;
  }

  function createProject(name, client) {
    const p = { id: uid("proj"), name, client, status: "Draft", updatedAt: Date.now(), modules: [{ id: uid("mod"), name: "General", screens: [] }] };
    setProjects((prev) => [p, ...prev]);
    logActivity(`Project ${name} created`);
    showToast("Project created", "check");
    setNewProjectOpen(false);
    openProject(p.id);
  }

  function addModule(projectId, name) {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, modules: [...p.modules, { id: uid("mod"), name, screens: [] }] } : p)));
  }
  function addScreen(projectId, moduleId, name, type) {
    const screen = mkScreen(name, type, ["UX", "UI"], []);
    setProjects((prev) => prev.map((p) => (p.id !== projectId ? p : {
      ...p, modules: p.modules.map((m) => (m.id === moduleId ? { ...m, screens: [...m.screens, screen] } : m)),
    })));
    logActivity(`Screen "${name}" added`);
    setActiveScreenId(screen.id);
    return screen.id;
  }

  const dashStats = useMemo(() => {
    const totalProjects = projects.length;
    const totalScreens = screensFlat.length;
    const uxIssues = issuesFlat.filter((i) => i.auditType === "UX").length;
    const uiIssues = issuesFlat.filter((i) => i.auditType === "UI").length;
    const bySev = severities.map((sv) => ({ name: sv.label, value: issuesFlat.filter((i) => i.severity === sv.id).length, color: sv.color }));
    const completed = screensFlat.filter((s) => s.issues.length > 0).length;
    const remaining = totalScreens - completed;
    const estHours = screensFlat.reduce((sum, s) => sum + estimateMinutes(s.type, screenTypes), 0) / 60;
    const byModule = {};
    issuesFlat.forEach((i) => { byModule[i.moduleName] = (byModule[i.moduleName] || 0) + 1; });
    const moduleData = Object.entries(byModule).map(([name, value]) => ({ name, value }));
    return {
      totalProjects, totalScreens, uxIssues, uiIssues,
      critical: issuesFlat.filter((i) => i.severity === "critical").length,
      high: issuesFlat.filter((i) => i.severity === "high").length,
      medium: issuesFlat.filter((i) => i.severity === "medium").length,
      low: issuesFlat.filter((i) => i.severity === "low").length,
      estHours: estHours.toFixed(1), completed, remaining, bySev, moduleData,
      uxVsUi: [{ name: "UX", value: uxIssues }, { name: "UI", value: uiIssues }],
      progress: totalScreens ? Math.round((completed / totalScreens) * 100) : 0,
    };
  }, [projects, screensFlat, issuesFlat, severities, screenTypes]);

  return (
    <div className={`uxa-root ${theme}`}>
      <StyleSheet />
      <div className="uxa-shell">
        <Sidebar view={view} setView={setView} theme={theme} setTheme={setTheme} setCommandOpen={setCommandOpen} username={username} onLogout={onLogout} />
        <div className="uxa-main">
          <TopBar
            view={view}
            activeProject={activeProject}
            setCommandOpen={setCommandOpen}
            onNewProject={() => setNewProjectOpen(true)}
          />
          <div className="uxa-content">
            {view === "dashboard" && (
              <Dashboard stats={dashStats} severities={severities} activity={activity} projects={projects}
                onOpenProject={openProject} onNewProject={() => setNewProjectOpen(true)}
                onQuickAudit={() => { const p = projects[0]; if (p) openProject(p.id); }}
                onExport={() => openExport({ scope: "allProjects" })} />
            )}
            {view === "projects" && (
              <ProjectsView projects={projects} onOpen={openProject} onNew={() => setNewProjectOpen(true)} />
            )}
            {view === "workspace" && (
              <AuditWorkspace
                project={activeProject} projects={projects}
                activeScreenId={activeScreenId} setActiveScreenId={setActiveScreenId}
                screenTypes={screenTypes} areas={areas} severities={severities}
                updateScreen={updateScreen} addModule={addModule} addScreen={addScreen}
                onOpenIssuePanel={(mode, screenId, issue) => setIssuePanel({ mode, screenId, issue })}
                onDeleteIssue={deleteIssue}
                onPickProject={(id) => openProject(id)}
                showToast={showToast}
                onExportProject={(projectId) => openExport({ scope: "entireProject", projectId })}
                onExportScreen={(projectId, screenId) => openExport({ scope: "currentScreen", projectId, screenId })}
                onExportIssueList={(projectId, screenId, filters) => openExport({ scope: "currentScreen", projectId, screenId, presetFilters: filters })}
              />
            )}
            {view === "settings" && (
              <SettingsView screenTypes={screenTypes} setScreenTypes={setScreenTypes} areas={areas} setAreas={setAreas} severities={severities} setSeverities={setSeverities} showToast={showToast} />
            )}
            {view === "reports" && (
              <ReportsView projects={projects} issuesFlat={issuesFlat} screensFlat={screensFlat} severities={severities} showToast={showToast}
                onExport={(filters) => openExport({ scope: "filteredResults", presetFilters: filters })} />
            )}
          </div>
        </div>
      </div>

      {issuePanel && (
        <IssuePanel
          data={issuePanel}
          areas={areas} severities={severities}
          nextIssueId={nextIssueId}
          onClose={() => setIssuePanel(null)}
          onSave={(issue, isNew, andNew) => {
            saveIssue(issuePanel.screenId, issue, isNew);
            if (andNew) {
              setIssuePanel({ mode: "new", screenId: issuePanel.screenId, issue: null });
            } else {
              setIssuePanel(null);
            }
          }}
        />
      )}

      {commandOpen && (
        <CommandPalette
          projects={projects} screensFlat={screensFlat} issuesFlat={issuesFlat}
          onClose={() => setCommandOpen(false)}
          onGoto={(v) => { setView(v); setCommandOpen(false); }}
          onOpenScreen={(pid, sid) => { openScreen(pid, sid); setCommandOpen(false); }}
        />
      )}

      <AIAssistant open={aiOpen} setOpen={setAiOpen} showToast={showToast} />

      {newProjectOpen && (
        <NewProjectModal onClose={() => setNewProjectOpen(false)} onCreate={createProject} />
      )}

      {exportCtx && (
        <ExportCenter
          ctx={exportCtx}
          projects={projects}
          screensFlat={screensFlat}
          issuesFlat={issuesFlat}
          severities={severities}
          areas={areas}
          screenTypes={screenTypes}
          stats={dashStats}
          onClose={() => setExportCtx(null)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="uxa-toast">
          <Check size={14} /> {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================== AUTH GATE ============================== */

export default function App() {
  const [authState, setAuthState] = useState("checking"); // checking | required | authenticated
  const [username, setUsername] = useState(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUsername(data.username);
            setAuthState("authenticated");
          } else {
            setAuthState("required");
          }
        } else {
          // /api/auth exists but errored unexpectedly — don't lock the user out
          setAuthState("authenticated");
        }
      } catch (e) {
        // No backend at all (e.g. previewing this file as a standalone Claude
        // artifact) — skip the login gate rather than dead-ending the app.
        setAuthState("authenticated");
      }
    })();
  }, []);

  async function login(u, p) {
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setUsername(data.username);
        setAuthState("authenticated");
        return true;
      }
      setAuthError(data.error || "Invalid username or password.");
      return false;
    } catch (e) {
      setAuthError("Could not reach the server. Is the backend running?");
      return false;
    }
  }

  async function logout() {
    try { await fetch("/api/auth", { method: "DELETE" }); } catch (e) { /* ignore */ }
    setUsername(null);
    setAuthState("required");
  }

  if (authState === "checking") {
    return (
      <div className="uxa-root light">
        <StyleSheet />
        <div className="uxa-auth-loading"><Loader2 size={22} className="spin" /></div>
      </div>
    );
  }

  if (authState === "required") {
    return (
      <div className="uxa-root light">
        <StyleSheet />
        <LoginScreen onLogin={login} error={authError} />
      </div>
    );
  }

  return <AppShell username={username} onLogout={username ? logout : null} />;
}

function LoginScreen({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    await onLogin(username.trim(), password);
    setBusy(false);
  }

  return (
    <div className="uxa-login-wrap">
      <form className="uxa-login-card" onSubmit={handleSubmit}>
        <div className="uxa-brand-mark lg"><Layers size={20} strokeWidth={2.5} /></div>
        <h2>Sign in to Auditlane</h2>
        <p>UX Audit Management</p>

        <div className="uxa-form-field">
          <label>Username</label>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username" />
        </div>
        <div className="uxa-form-field">
          <label>Password</label>
          <div className="uxa-password-row">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
        </div>

        {error && <div className="uxa-login-error"><Lock size={13} /> {error}</div>}

        <button className="uxa-btn primary full" type="submit" disabled={busy || !username.trim() || !password}>
          {busy ? <Loader2 size={14} className="spin" /> : <Lock size={14} />} Sign in
        </button>
      </form>
    </div>
  );
}

/* ============================== SIDEBAR / TOPBAR ============================== */

function Sidebar({ view, setView, theme, setTheme, setCommandOpen, username, onLogout }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "workspace", label: "Audit Workspace", icon: ClipboardList },
    { id: "reports", label: "Reports", icon: FileBarChart },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <aside className="uxa-sidebar">
      <div className="uxa-brand">
        <div className="uxa-brand-mark"><Layers size={16} strokeWidth={2.5} /></div>
        <span>Auditlane</span>
      </div>
      <nav className="uxa-nav">
        {items.map((it) => (
          <button key={it.id} className={`uxa-nav-item ${view === it.id ? "active" : ""}`} onClick={() => setView(it.id)}>
            <it.icon size={16} strokeWidth={2} />
            <span>{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="uxa-sidebar-footer">
        {username && onLogout && (
          <div className="uxa-user-row">
            <div className="uxa-user-avatar">{username.slice(0, 1).toUpperCase()}</div>
            <span>{username}</span>
            <button title="Log out" onClick={onLogout}><LogOut size={13} /></button>
          </div>
        )}
        <button className="uxa-cmd-btn" onClick={() => setCommandOpen(true)}>
          <Command size={13} /> <span>Search</span> <kbd>⌘K</kbd>
        </button>
        <button className="uxa-theme-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
      </div>
    </aside>
  );
}

function TopBar({ view, activeProject, setCommandOpen, onNewProject }) {
  const titles = {
    dashboard: "Dashboard", projects: "Projects", workspace: activeProject ? activeProject.name : "Audit Workspace",
    settings: "Settings", reports: "Reports",
  };
  const subtitles = {
    dashboard: "Audit program overview across all projects", projects: "All client audit engagements",
    workspace: activeProject ? `${activeProject.client} · ${activeProject.status}` : "Select a project to begin",
    settings: "Configure master data used across audits", reports: "Generate and export audit reports",
  };
  return (
    <header className="uxa-topbar">
      <div>
        <h1>{titles[view]}</h1>
        <p>{subtitles[view]}</p>
      </div>
      <div className="uxa-topbar-actions">
        <button className="uxa-search-pill" onClick={() => setCommandOpen(true)}>
          <Search size={14} /> Search projects, screens, issues… <kbd>⌘K</kbd>
        </button>
        <button className="uxa-btn primary" onClick={onNewProject}><Plus size={14} /> New Project</button>
      </div>
    </header>
  );
}

/* ============================== DASHBOARD ============================== */

function Dashboard({ stats, severities, activity, projects, onOpenProject, onNewProject, onQuickAudit, onExport }) {
  const cards = [
    { label: "Total Projects", value: stats.totalProjects, icon: FolderKanban },
    { label: "Total Screens", value: stats.totalScreens, icon: Monitor },
    { label: "Total UX Issues", value: stats.uxIssues, icon: ClipboardList },
    { label: "Total UI Issues", value: stats.uiIssues, icon: Layers },
    { label: "Critical Issues", value: stats.critical, icon: CircleAlert, tone: "critical" },
    { label: "High Issues", value: stats.high, icon: AlertTriangle, tone: "high" },
    { label: "Medium Issues", value: stats.medium, icon: AlertTriangle, tone: "medium" },
    { label: "Low Issues", value: stats.low, icon: AlertTriangle, tone: "low" },
    { label: "Estimated Audit Hours", value: `${stats.estHours}h`, icon: Clock },
    { label: "Completed Screens", value: stats.completed, icon: CheckCircle2 },
    { label: "Remaining Screens", value: stats.remaining, icon: ChevronsUpDown },
  ];

  return (
    <div className="uxa-dash">
      <div className="uxa-cards-grid">
        {cards.map((c) => (
          <div className={`uxa-stat-card ${c.tone || ""}`} key={c.label}>
            <div className="uxa-stat-icon"><c.icon size={16} /></div>
            <div className="uxa-stat-value">{c.value}</div>
            <div className="uxa-stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="uxa-dash-grid">
        <div className="uxa-panel">
          <h3>Issues by severity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.bySev} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                {stats.bySev.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="uxa-panel">
          <h3>UX vs UI issues</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.uxVsUi} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                <Cell fill="#3B5BDB" /><Cell fill="#14B8A6" />
              </Pie>
              <Tooltip /><Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="uxa-panel span2">
          <h3>Issues by module</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.moduleData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B5BDB" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="uxa-dash-grid2">
        <div className="uxa-panel">
          <div className="uxa-panel-head">
            <h3>Recent activity</h3>
          </div>
          <ul className="uxa-timeline">
            {activity.map((a) => (
              <li key={a.id}>
                <span className="uxa-timeline-dot" />
                <div>
                  <p>{a.text}</p>
                  <span>{relTime(a.ts)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="uxa-panel">
          <h3>Quick actions</h3>
          <div className="uxa-quick-actions">
            <button className="uxa-btn" onClick={onNewProject}><Plus size={14} /> New Project</button>
            <button className="uxa-btn" onClick={onQuickAudit}><ClipboardList size={14} /> Add Screen</button>
            <button className="uxa-btn" onClick={onQuickAudit}><Wand2 size={14} /> Start Audit</button>
            <button className="uxa-btn" onClick={onExport}><Download size={14} /> Export Report</button>
          </div>
          <h3 style={{ marginTop: 18 }}>Audit progress</h3>
          <div className="uxa-progress-row">
            <div className="uxa-progress-track"><div className="uxa-progress-fill" style={{ width: `${stats.progress}%` }} /></div>
            <span>{stats.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== PROJECTS ============================== */

function ProjectsView({ projects, onOpen, onNew }) {
  const [q, setQ] = useState("");
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.client.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="uxa-panel">
      <div className="uxa-panel-head">
        <div className="uxa-inline-search"><Search size={14} /><input placeholder="Filter projects…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="uxa-btn primary" onClick={onNew}><Plus size={14} /> New Project</button>
      </div>
      <table className="uxa-table">
        <thead>
          <tr>
            <th>Project Name</th><th>Client</th><th>Status</th><th>Total Screens</th><th>Total Issues</th><th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const screens = p.modules.flatMap((m) => m.screens);
            const issues = screens.flatMap((s) => s.issues);
            return (
              <tr key={p.id} className="uxa-row-click" onClick={() => onOpen(p.id)}>
                <td className="uxa-cell-strong">{p.name}</td>
                <td>{p.client}</td>
                <td><span className={`uxa-pill status-${p.status.replace(/\s/g, "")}`}>{p.status}</span></td>
                <td>{screens.length}</td>
                <td>{issues.length}</td>
                <td className="uxa-text-muted">{relTime(p.updatedAt)}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && <tr><td colSpan={6} className="uxa-empty">No projects match "{q}".</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>New project</h3><button onClick={onClose}><X size={16} /></button></div>
        <div className="uxa-form-field">
          <label>Project name *</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Onboarding Audit" />
        </div>
        <div className="uxa-form-field">
          <label>Client</label>
          <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Acme Corp" />
        </div>
        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn primary" disabled={!name.trim()} onClick={() => onCreate(name.trim(), client.trim() || "—")}>Create project</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== AUDIT WORKSPACE ============================== */

function AuditWorkspace({ project, projects, activeScreenId, setActiveScreenId, screenTypes, areas, severities, updateScreen, addModule, addScreen, onOpenIssuePanel, onDeleteIssue, onPickProject, showToast, onExportProject, onExportScreen, onExportIssueList }) {
  const [expanded, setExpanded] = useState(() => new Set(project?.modules?.map((m) => m.id) || []));
  const [addingModule, setAddingModule] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [addingScreenTo, setAddingScreenTo] = useState(null);
  const [screenName, setScreenName] = useState("");
  const [screenType, setScreenType] = useState(screenTypes[0]?.name || "Screen");

  useEffect(() => { setExpanded(new Set(project?.modules?.map((m) => m.id) || [])); }, [project?.id]);

  if (!project) {
    return (
      <div className="uxa-panel uxa-empty-state">
        <ClipboardList size={28} />
        <h3>No project selected</h3>
        <p>Choose a project to open its audit workspace.</p>
        <div className="uxa-empty-project-list">
          {projects.map((p) => <button key={p.id} className="uxa-btn" onClick={() => onPickProject(p.id)}>{p.name}</button>)}
        </div>
      </div>
    );
  }

  const screen = project.modules.flatMap((m) => m.screens).find((s) => s.id === activeScreenId) || null;

  function toggleMod(id) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="uxa-workspace">
      <aside className="uxa-tree">
        <div className="uxa-tree-head">
          <span>Modules</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button title="Export project" onClick={() => onExportProject(project.id)}><Download size={13} /></button>
            <button onClick={() => setAddingModule((v) => !v)}><Plus size={13} /></button>
          </div>
        </div>
        {addingModule && (
          <div className="uxa-tree-add">
            <input autoFocus placeholder="Module name" value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && moduleName.trim()) { addModule(project.id, moduleName.trim()); setModuleName(""); setAddingModule(false); } if (e.key === "Escape") setAddingModule(false); }} />
          </div>
        )}
        <div className="uxa-tree-list">
          {project.modules.map((m) => (
            <div key={m.id} className="uxa-tree-mod">
              <button className="uxa-tree-mod-row" onClick={() => toggleMod(m.id)}>
                {expanded.has(m.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{m.name}</span>
                <span className="uxa-tree-count">{m.screens.length}</span>
              </button>
              {expanded.has(m.id) && (
                <div className="uxa-tree-screens">
                  {m.screens.map((s) => (
                    <button key={s.id} className={`uxa-tree-screen ${activeScreenId === s.id ? "active" : ""}`} onClick={() => setActiveScreenId(s.id)}>
                      {s.type === "screen" ? <Monitor size={13} /> : <Smartphone size={13} />}
                      <span>{s.name}</span>
                      {s.issues.length > 0 && <span className="uxa-tree-badge">{s.issues.length}</span>}
                    </button>
                  ))}
                  {addingScreenTo === m.id ? (
                    <div className="uxa-tree-add nested">
                      <input autoFocus placeholder="Screen name" value={screenName} onChange={(e) => setScreenName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") setAddingScreenTo(null); }} />
                      <select value={screenType} onChange={(e) => setScreenType(e.target.value)}>
                        {screenTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                      <button className="uxa-btn tiny primary" disabled={!screenName.trim()}
                        onClick={() => { addScreen(project.id, m.id, screenName.trim(), screenType); setScreenName(""); setAddingScreenTo(null); }}>Add</button>
                    </div>
                  ) : (
                    <button className="uxa-tree-add-screen" onClick={() => setAddingScreenTo(m.id)}><Plus size={12} /> Add screen</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {screen ? (
        <ScreenPane
          screen={screen} project={project} screenTypes={screenTypes} areas={areas} severities={severities}
          updateScreen={updateScreen} onOpenIssuePanel={onOpenIssuePanel} onDeleteIssue={onDeleteIssue}
          onExportScreen={onExportScreen} onExportIssueList={onExportIssueList}
        />
      ) : (
        <div className="uxa-panel uxa-empty-state">
          <Monitor size={26} /><h3>No screen selected</h3><p>Pick a screen from the module tree, or add a new one.</p>
        </div>
      )}
    </div>
  );
}

function ScreenPane({ screen, project, screenTypes, areas, severities, updateScreen, onOpenIssuePanel, onDeleteIssue, onExportScreen, onExportIssueList }) {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);

  const minutes = estimateMinutes(screen.type, screenTypes);

  let issues = screen.issues.filter((i) =>
    (search === "" || i.summary.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase())) &&
    (sevFilter === "all" || i.severity === sevFilter) &&
    (typeFilter === "all" || i.auditType === typeFilter)
  );
  issues = issues.slice().sort((a, b) => {
    const pa = severityMeta(a.severity, severities).priority, pb = severityMeta(b.severity, severities).priority;
    return sortDesc ? pa - pb : pb - pa;
  });

  const summary = {
    ux: screen.issues.filter((i) => i.auditType === "UX").length,
    ui: screen.issues.filter((i) => i.auditType === "UI").length,
    critical: screen.issues.filter((i) => i.severity === "critical").length,
    high: screen.issues.filter((i) => i.severity === "high").length,
    medium: screen.issues.filter((i) => i.severity === "medium").length,
    low: screen.issues.filter((i) => i.severity === "low").length,
  };
  const completionPct = screen.issues.length > 0 ? 100 : 0;

  return (
    <div className="uxa-screenpane">
      <div className="uxa-screenpane-main">
        <div className="uxa-panel">
          <div className="uxa-panel-head">
            <h3 style={{ margin: 0 }}>Screen details</h3>
            <button className="uxa-btn tiny" onClick={() => onExportScreen(project.id, screen.id)}><Download size={12} /> Export screen</button>
          </div>
          <div className="uxa-screen-meta-grid">
            <div className="uxa-form-field">
              <label>Screen name *</label>
              <input value={screen.name} onChange={(e) => updateScreen(screen.id, { name: e.target.value })} />
            </div>
            <div className="uxa-form-field">
              <label>Screen type *</label>
              <select value={screen.type} onChange={(e) => updateScreen(screen.id, { type: e.target.value })}>
                {screenTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="uxa-form-field">
              <label>Module</label>
              <input value={project.modules.find((m) => m.screens.some((s) => s.id === screen.id))?.name || ""} readOnly className="readonly" />
            </div>
            <div className="uxa-form-field">
              <label>Audit type *</label>
              <div className="uxa-checkbox-row">
                {["UX", "UI"].map((t) => (
                  <label key={t} className="uxa-checkbox">
                    <input type="checkbox" checked={screen.auditTypes.includes(t)}
                      onChange={(e) => {
                        const next = e.target.checked ? [...new Set([...screen.auditTypes, t])] : screen.auditTypes.filter((x) => x !== t);
                        updateScreen(screen.id, { auditTypes: next });
                      }} /> {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="uxa-form-field">
              <label>Audit date</label>
              <input type="date" value={screen.auditDate} onChange={(e) => updateScreen(screen.id, { auditDate: e.target.value })} />
            </div>
            <div className="uxa-form-field">
              <label>Estimated time</label>
              <div className="readonly-pill"><Clock size={13} /> Estimated Time : {formatMinutes(minutes)}</div>
            </div>
          </div>
        </div>

        <div className="uxa-panel">
          <div className="uxa-issue-toolbar">
            <div className="uxa-inline-search"><Search size={14} /><input placeholder="Search issues…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <option value="all">All severities</option>
              {severities.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">UX + UI</option><option value="UX">UX only</option><option value="UI">UI only</option>
            </select>
            <button className="uxa-btn" onClick={() => setSortDesc((v) => !v)}><ArrowUpDown size={13} /> Severity</button>
            <div className="uxa-spacer" />
            <button className="uxa-btn" onClick={() => onExportIssueList(project.id, screen.id, { search, sevFilter, typeFilter })}><Download size={13} /> Export</button>
            <button className="uxa-btn primary" onClick={() => onOpenIssuePanel("new", screen.id, null)}><Plus size={14} /> Add Issue</button>
          </div>

          <table className="uxa-table sticky">
            <thead>
              <tr><th>ID</th><th>Area</th><th>Issue summary</th><th>Severity</th><th>Recommendation</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {issues.map((i) => {
                const sev = severityMeta(i.severity, severities);
                return (
                  <tr key={i.id}>
                    <td className="uxa-mono">{i.id}</td>
                    <td>{i.area}</td>
                    <td className="uxa-cell-truncate" title={i.summary}>{i.summary}</td>
                    <td><span className="uxa-sev-pill" style={{ "--sev": sev.color }}>{sev.icon} {sev.label}</span></td>
                    <td className="uxa-cell-truncate" title={i.recommendation}>{i.recommendation || "—"}</td>
                    <td><span className={`uxa-pill status-${(i.status || "Open").replace(/\s/g, "")}`}>{i.status || "Open"}</span></td>
                    <td className="uxa-row-actions">
                      <button onClick={() => onOpenIssuePanel("edit", screen.id, i)}><Pencil size={13} /></button>
                      <button onClick={() => onDeleteIssue(screen.id, i.id)}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
              {issues.length === 0 && <tr><td colSpan={7} className="uxa-empty">No issues logged yet for this screen.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="uxa-panel uxa-summary-panel">
        <h3>Screen summary</h3>
        <div className="uxa-summary-row"><span>Total UX issues</span><strong>{summary.ux}</strong></div>
        <div className="uxa-summary-row"><span>Total UI issues</span><strong>{summary.ui}</strong></div>
        <div className="uxa-summary-divider" />
        {severities.map((sv) => (
          <div className="uxa-summary-row" key={sv.id}><span>{sv.icon} {sv.label}</span><strong>{screen.issues.filter((i) => i.severity === sv.id).length}</strong></div>
        ))}
        <div className="uxa-summary-divider" />
        <div className="uxa-summary-row"><span>Estimated time</span><strong>{formatMinutes(minutes)}</strong></div>
        <div className="uxa-summary-row"><span>Completion</span><strong>{completionPct}%</strong></div>
        <div className="uxa-progress-track" style={{ marginTop: 6 }}><div className="uxa-progress-fill" style={{ width: `${completionPct}%` }} /></div>
      </aside>
    </div>
  );
}

/* ============================== ISSUE PANEL (SIDE DRAWER) ============================== */

function IssuePanel({ data, areas, severities, nextIssueId, onClose, onSave }) {
  const isNew = data.mode === "new" || !data.issue;
  const [auditType, setAuditType] = useState(data.issue?.auditType || "UX");
  const [area, setArea] = useState(data.issue?.area || areas[0]);
  const [summary, setSummary] = useState(data.issue?.summary || "");
  const [severity, setSeverity] = useState(data.issue?.severity || severities[2]?.id || "medium");
  const [recommendation, setRecommendation] = useState(data.issue?.recommendation || "");
  const [aiPrompt, setAiPrompt] = useState(data.issue?.aiPrompt || "");
  const [status, setStatus] = useState(data.issue?.status || "Open");
  const [aiBusy, setAiBusy] = useState("");

  const id = isNew ? nextIssueId(auditType) : data.issue.id;

  async function generateRecommendation() {
    if (!summary.trim()) return;
    setAiBusy("rec");
    try {
      const text = await callClaude(`Issue area: ${area}\nIssue: ${summary}\n\nWrite a single, specific, actionable UX/UI recommendation to fix this issue. 1-3 sentences, no preamble.`);
      setRecommendation(text);
    } catch (e) { /* ignore */ } finally { setAiBusy(""); }
  }
  async function generatePrompt() {
    if (!summary.trim()) return;
    setAiBusy("prompt");
    try {
      const text = await callClaude(`Issue: ${summary}\nRecommendation: ${recommendation || "(none yet)"}\n\nWrite a single AI image/design generation prompt (for a tool like Figma Make) that could recreate or redesign this screen area addressing the issue. One paragraph, concrete visual details, no preamble.`);
      setAiPrompt(text);
    } catch (e) { /* ignore */ } finally { setAiBusy(""); }
  }
  async function suggestSeverity() {
    if (!summary.trim()) return;
    setAiBusy("severity");
    try {
      const text = await callClaude(`Issue: ${summary}\n\nClassify this UX/UI issue's severity as exactly one word: critical, high, medium, or low. Respond with only that word.`);
      const found = severities.find((s) => text.toLowerCase().includes(s.id));
      if (found) setSeverity(found.id);
    } catch (e) { /* ignore */ } finally { setAiBusy(""); }
  }

  function handleSave(andNew) {
    if (!summary.trim()) return;
    onSave({ id, auditType, area, summary, severity, recommendation, aiPrompt, status, createdAt: data.issue?.createdAt || Date.now() }, isNew, andNew);
  }

  return (
    <div className="uxa-drawer-overlay" onClick={onClose}>
      <div className="uxa-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-drawer-head">
          <div><span className="uxa-mono uxa-drawer-id">{id}</span><h3>{isNew ? "New issue" : "Edit issue"}</h3></div>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="uxa-drawer-body">
          <div className="uxa-form-field">
            <label>Audit type</label>
            <div className="uxa-checkbox-row">
              {["UX", "UI"].map((t) => (
                <button key={t} className={`uxa-chip ${auditType === t ? "active" : ""}`} onClick={() => setAuditType(t)} disabled={!isNew}>{t}</button>
              ))}
            </div>
          </div>

          <div className="uxa-form-field">
            <label>Area</label>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="uxa-form-field">
            <label>UX/UI issue</label>
            <textarea rows={4} placeholder="Describe the issue in detail…" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>

          <div className="uxa-form-field">
            <label>Severity</label>
            <div className="uxa-sev-select-row">
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {severities.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
              </select>
              <button className="uxa-btn ai tiny" onClick={suggestSeverity} disabled={!summary.trim() || aiBusy}>
                {aiBusy === "severity" ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} Suggest
              </button>
            </div>
          </div>

          <div className="uxa-form-field">
            <div className="uxa-field-label-row"><label>Recommendation</label>
              <button className="uxa-btn ai tiny" onClick={generateRecommendation} disabled={!summary.trim() || aiBusy}>
                {aiBusy === "rec" ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} Generate
              </button>
            </div>
            <textarea rows={3} placeholder="Explain the recommended improvement…" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
          </div>

          <div className="uxa-form-field">
            <div className="uxa-field-label-row"><label>AI design prompt</label>
              <button className="uxa-btn ai tiny" onClick={generatePrompt} disabled={!summary.trim() || aiBusy}>
                {aiBusy === "prompt" ? <Loader2 size={13} className="spin" /> : <Wand2 size={13} />} Generate
              </button>
            </div>
            <textarea rows={4} className="uxa-mono" placeholder="Write an AI prompt that can recreate or redesign this screen using Figma Make or other AI tools." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
          </div>

          <div className="uxa-form-field">
            <label>Attachments</label>
            <button className="uxa-upload-zone" type="button"><ImagePlus size={16} /> Attach screenshot (annotate on upload)</button>
          </div>

          <div className="uxa-form-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Open</option><option>In Review</option><option>Resolved</option><option>Won't Fix</option>
            </select>
          </div>
        </div>

        <div className="uxa-drawer-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn" disabled={!summary.trim()} onClick={() => handleSave(true)}>Save &amp; New</button>
          <button className="uxa-btn primary" disabled={!summary.trim()} onClick={() => handleSave(false)}><Save size={14} /> Save</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== SETTINGS ============================== */

function SettingsView({ screenTypes, setScreenTypes, areas, setAreas, severities, setSeverities, showToast }) {
  const [tab, setTab] = useState("types");

  return (
    <div className="uxa-panel">
      <div className="uxa-settings-tabs">
        <button className={tab === "types" ? "active" : ""} onClick={() => setTab("types")}>Screen types</button>
        <button className={tab === "areas" ? "active" : ""} onClick={() => setTab("areas")}>Areas</button>
        <button className={tab === "severity" ? "active" : ""} onClick={() => setTab("severity")}>Severity</button>
      </div>
      {tab === "types" && <ScreenTypeSettings screenTypes={screenTypes} setScreenTypes={setScreenTypes} showToast={showToast} />}
      {tab === "areas" && <AreaSettings areas={areas} setAreas={setAreas} showToast={showToast} />}
      {tab === "severity" && <SeveritySettings severities={severities} setSeverities={setSeverities} showToast={showToast} />}
    </div>
  );
}

function ScreenTypeSettings({ screenTypes, setScreenTypes, showToast }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: "", minutes: 30 });

  function save() {
    if (!draft.name.trim()) return;
    if (editing === "new") {
      setScreenTypes((prev) => [...prev, { id: uid("st"), name: draft.name, minutes: Number(draft.minutes) || 30, status: "active" }]);
    } else {
      setScreenTypes((prev) => prev.map((t) => (t.id === editing ? { ...t, name: draft.name, minutes: Number(draft.minutes) || 30 } : t)));
    }
    showToast("Screen type saved", "check");
    setEditing(null);
  }
  return (
    <div>
      <table className="uxa-table">
        <thead><tr><th>Screen type</th><th>Estimated time</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {screenTypes.map((t) => (
            <tr key={t.id}>
              {editing === t.id ? (
                <>
                  <td><input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></td>
                  <td><input type="number" value={draft.minutes} onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))} style={{ width: 90 }} /> mins</td>
                  <td>{t.status}</td>
                  <td className="uxa-row-actions"><button onClick={save}><Check size={14} /></button><button onClick={() => setEditing(null)}><X size={14} /></button></td>
                </>
              ) : (
                <>
                  <td className="uxa-cell-strong">{t.name}</td>
                  <td>{formatMinutes(t.minutes)}</td>
                  <td><span className={`uxa-pill ${t.status === "active" ? "status-active" : "status-disabled"}`}>{t.status}</span></td>
                  <td className="uxa-row-actions">
                    <button onClick={() => { setEditing(t.id); setDraft({ name: t.name, minutes: t.minutes }); }}><Pencil size={13} /></button>
                    <button onClick={() => setScreenTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, status: x.status === "active" ? "disabled" : "active" } : x))}>{t.status === "active" ? <X size={13} /> : <Check size={13} />}</button>
                    <button onClick={() => setScreenTypes((prev) => prev.filter((x) => x.id !== t.id))}><Trash2 size={13} /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {editing === "new" && (
            <tr>
              <td><input autoFocus placeholder="Type name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></td>
              <td><input type="number" value={draft.minutes} onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))} style={{ width: 90 }} /> mins</td>
              <td>active</td>
              <td className="uxa-row-actions"><button onClick={save}><Check size={14} /></button><button onClick={() => setEditing(null)}><X size={14} /></button></td>
            </tr>
          )}
        </tbody>
      </table>
      <button className="uxa-btn" style={{ marginTop: 12 }} onClick={() => { setEditing("new"); setDraft({ name: "", minutes: 30 }); }}><Plus size={14} /> Add screen type</button>
    </div>
  );
}

function AreaSettings({ areas, setAreas, showToast }) {
  const [newArea, setNewArea] = useState("");
  return (
    <div>
      <div className="uxa-chip-cloud">
        {areas.map((a) => (
          <span className="uxa-chip removable" key={a}>{a}<button onClick={() => setAreas((prev) => prev.filter((x) => x !== a))}><X size={11} /></button></span>
        ))}
      </div>
      <div className="uxa-inline-form">
        <input placeholder="New area name" value={newArea} onChange={(e) => setNewArea(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newArea.trim()) { setAreas((prev) => [...prev, newArea.trim()]); setNewArea(""); showToast("Area added"); } }} />
        <button className="uxa-btn primary" disabled={!newArea.trim()} onClick={() => { setAreas((prev) => [...prev, newArea.trim()]); setNewArea(""); showToast("Area added"); }}><Plus size={14} /> Add</button>
      </div>
    </div>
  );
}

function SeveritySettings({ severities, setSeverities, showToast }) {
  function update(id, patch) { setSeverities((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))); }
  return (
    <table className="uxa-table">
      <thead><tr><th>Icon</th><th>Label</th><th>Color</th><th>Priority</th></tr></thead>
      <tbody>
        {severities.sort((a, b) => a.priority - b.priority).map((s) => (
          <tr key={s.id}>
            <td style={{ fontSize: 16 }}>{s.icon}</td>
            <td><input value={s.label} onChange={(e) => update(s.id, { label: e.target.value })} /></td>
            <td><input type="color" value={s.color} onChange={(e) => update(s.id, { color: e.target.value })} style={{ width: 44, height: 28, padding: 2 }} /></td>
            <td><input type="number" value={s.priority} onChange={(e) => update(s.id, { priority: Number(e.target.value) })} style={{ width: 60 }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ============================== REPORTS ============================== */

function ReportsView({ projects, issuesFlat, screensFlat, severities, showToast, onExport }) {
  const [projectFilter, setProjectFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = issuesFlat.filter((i) =>
    (projectFilter === "all" || i.projectId === projectFilter) &&
    (sevFilter === "all" || i.severity === sevFilter) &&
    (typeFilter === "all" || i.auditType === typeFilter)
  );

  function exportCSV() {
    const headers = ["ID", "Project", "Module", "Screen", "Audit Type", "Area", "Summary", "Severity", "Recommendation", "Status"];
    const rows = filtered.map((i) => [i.id, i.projectName, i.moduleName, i.screenName, i.auditType, i.area, i.summary, i.severity, i.recommendation, i.status]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-report.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("Export complete", "check");
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-report.json"; a.click();
    URL.revokeObjectURL(url);
    showToast("Export complete", "check");
  }

  return (
    <div className="uxa-panel">
      <div className="uxa-issue-toolbar">
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
          <option value="all">All severities</option>
          {severities.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">UX + UI</option><option value="UX">UX only</option><option value="UI">UI only</option>
        </select>
        <div className="uxa-spacer" />
        <button className="uxa-btn" onClick={exportJSON}><Download size={13} /> Quick JSON</button>
        <button className="uxa-btn" onClick={exportCSV}><Download size={13} /> Quick CSV</button>
        <button className="uxa-btn primary" onClick={() => onExport({ projectFilter, sevFilter, typeFilter })}><Sparkles size={13} /> Export Center</button>
      </div>
      <table className="uxa-table">
        <thead><tr><th>ID</th><th>Project</th><th>Screen</th><th>Area</th><th>Severity</th><th>Status</th></tr></thead>
        <tbody>
          {filtered.map((i) => {
            const sev = severityMeta(i.severity, severities);
            return (
              <tr key={`${i.projectId}-${i.id}`}>
                <td className="uxa-mono">{i.id}</td><td>{i.projectName}</td><td>{i.screenName}</td><td>{i.area}</td>
                <td><span className="uxa-sev-pill" style={{ "--sev": sev.color }}>{sev.icon} {sev.label}</span></td>
                <td><span className={`uxa-pill status-${(i.status || "Open").replace(/\s/g, "")}`}>{i.status}</span></td>
              </tr>
            );
          })}
          {filtered.length === 0 && <tr><td colSpan={6} className="uxa-empty">No issues match these filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ============================== COMMAND PALETTE ============================== */

function CommandPalette({ projects, screensFlat, issuesFlat, onClose, onGoto, onOpenScreen }) {
  const [q, setQ] = useState("");
  const views = [
    { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Go to Projects", icon: FolderKanban },
    { id: "reports", label: "Go to Reports", icon: FileBarChart },
    { id: "settings", label: "Go to Settings", icon: SettingsIcon },
  ].filter((v) => v.label.toLowerCase().includes(q.toLowerCase()));

  const matchedScreens = q.length > 0 ? screensFlat.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.projectName.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const matchedIssues = q.length > 0 ? issuesFlat.filter((i) => i.summary.toLowerCase().includes(q.toLowerCase()) || i.id.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];

  return (
    <div className="uxa-modal-overlay top" onClick={onClose}>
      <div className="uxa-command" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-command-input"><Search size={15} /><input autoFocus placeholder="Search projects, screens, issues, or jump to a page…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="uxa-command-results">
          {views.length > 0 && (
            <div className="uxa-command-group">
              <span>Navigate</span>
              {views.map((v) => <button key={v.id} onClick={() => onGoto(v.id)}><v.icon size={14} /> {v.label}</button>)}
            </div>
          )}
          {matchedScreens.length > 0 && (
            <div className="uxa-command-group">
              <span>Screens</span>
              {matchedScreens.map((s) => <button key={s.id} onClick={() => onOpenScreen(s.projectId, s.id)}><Monitor size={14} /> {s.name} <span className="uxa-command-sub">{s.projectName}</span></button>)}
            </div>
          )}
          {matchedIssues.length > 0 && (
            <div className="uxa-command-group">
              <span>Issues</span>
              {matchedIssues.map((i) => <button key={`${i.projectId}-${i.id}`} onClick={() => onOpenScreen(i.projectId, i.screenId)}><span className="uxa-mono">{i.id}</span> {i.summary.slice(0, 48)}{i.summary.length > 48 ? "…" : ""}</button>)}
            </div>
          )}
          {q.length > 0 && views.length === 0 && matchedScreens.length === 0 && matchedIssues.length === 0 && (
            <div className="uxa-empty">No results for "{q}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== AI ASSISTANT (FLOATING) ============================== */

function AIAssistant({ open, setOpen, showToast }) {
  const [mode, setMode] = useState("best-practices");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  const modes = {
    "best-practices": { label: "UX best practices", prompt: (t) => `Give 4-5 concise UX best practices relevant to: ${t}. Bullet points, no preamble.` },
    "summarize": { label: "Summarize audit notes", prompt: (t) => `Summarize these audit notes into a short client-ready paragraph:\n\n${t}` },
    "rewrite": { label: "Rewrite issue clearly", prompt: (t) => `Rewrite this UX issue description to be clearer and more professional, 1-3 sentences:\n\n${t}` },
  };

  async function run() {
    if (!input.trim()) return;
    setBusy(true); setOutput("");
    try {
      const text = await callClaude(modes[mode].prompt(input));
      setOutput(text);
    } catch (e) {
      setOutput("Something went wrong reaching the AI service. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <button className="uxa-fab" onClick={() => setOpen((o) => !o)}><Sparkles size={20} /></button>
      {open && (
        <div className="uxa-ai-panel">
          <div className="uxa-ai-head">
            <span><Sparkles size={14} /> AI Assistant</span>
            <button onClick={() => setOpen(false)}><X size={15} /></button>
          </div>
          <div className="uxa-ai-modes">
            {Object.entries(modes).map(([k, v]) => (
              <button key={k} className={mode === k ? "active" : ""} onClick={() => setMode(k)}>{v.label}</button>
            ))}
          </div>
          <textarea rows={4} placeholder="Paste an issue, notes, or a topic…" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="uxa-btn primary full" onClick={run} disabled={busy || !input.trim()}>
            {busy ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} Generate
          </button>
          {output && <div className="uxa-ai-output">{output}</div>}
        </div>
      )}
    </>
  );
}

/* ============================== EXPORT CENTER ============================== */

const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF Report", icon: FileText, desc: "Print-ready styled report", tag: "Save as PDF via print" },
  { id: "xlsx", label: "Microsoft Excel", icon: FileSpreadsheet, desc: "Multi-sheet workbook (.xlsx)", tag: "Real .xlsx file" },
  { id: "csv", label: "CSV", icon: Braces, desc: "Raw issue data (.csv)", tag: "Real .csv file" },
  { id: "docx", label: "Microsoft Word", icon: FileType2, desc: "Formatted document (.doc)", tag: "Opens in Word" },
  { id: "pptx", label: "PowerPoint", icon: Presentation, desc: "Slide deck (HTML)", tag: "Open or print to slides" },
  { id: "json", label: "JSON", icon: Braces, desc: "Structured raw data (.json)", tag: "Real .json file" },
];

const PDF_TEMPLATES = [
  { id: "executive", label: "Executive Summary", desc: "High-level stats & top risks, 2-3 pages", color: "#3B5BDB" },
  { id: "detailed", label: "Detailed UX Audit", desc: "Full screen-by-screen findings", color: "#14B8A6" },
  { id: "client", label: "Client Presentation", desc: "Polished, narrative, brand-forward", color: "#D97706" },
  { id: "management", label: "Management Report", desc: "Prioritized risk & effort view", color: "#7C3AED" },
  { id: "developer", label: "Developer Handoff", desc: "Issue + recommendation + prompt per row", color: "#0891B2" },
  { id: "accessibility", label: "Accessibility Report", desc: "WCAG-focused issue subset", color: "#DC2626" },
];

const INCLUDE_FIELDS = [
  { id: "screenDetails", label: "Screen Details" },
  { id: "screenMetadata", label: "Screen Metadata" },
  { id: "uxIssues", label: "UX Issues" },
  { id: "uiIssues", label: "UI Issues" },
  { id: "recommendations", label: "Recommendations" },
  { id: "aiPrompts", label: "AI Design Prompts" },
  { id: "severity", label: "Severity" },
  { id: "area", label: "Area" },
  { id: "estimatedTime", label: "Estimated Time" },
  { id: "screenshots", label: "Screenshots" },
  { id: "annotatedImages", label: "Annotated Images" },
  { id: "summaryDashboard", label: "Summary Dashboard" },
  { id: "chartsGraphs", label: "Charts & Graphs" },
  { id: "auditStatistics", label: "Audit Statistics" },
  { id: "projectInfo", label: "Project Information" },
  { id: "auditTimeline", label: "Audit Timeline" },
];

const DEFAULT_INCLUDE = INCLUDE_FIELDS.reduce((acc, f) => {
  acc[f.id] = !["screenshots", "annotatedImages"].includes(f.id);
  return acc;
}, {});

const PROGRESS_STEPS = ["Collecting Screens", "Formatting Data", "Generating Charts", "Embedding Images", "Finalizing Report"];

function ExportCenter({ ctx, projects, screensFlat, issuesFlat, severities, areas, screenTypes, stats, onClose, showToast }) {
  const lockedProject = ctx.projectId ? projects.find((p) => p.id === ctx.projectId) : null;

  const [step, setStep] = useState("config");
  const [formats, setFormats] = useState(new Set(["pdf"]));
  const [scope, setScope] = useState(ctx.scope || "allProjects");
  const [selModules, setSelModules] = useState(new Set());
  const [selScreens, setSelScreens] = useState(new Set(ctx.screenId ? [ctx.screenId] : []));
  const [selIssues, setSelIssues] = useState(new Set());
  const [template, setTemplate] = useState("detailed");
  const [include, setInclude] = useState(DEFAULT_INCLUDE);
  const [filters, setFilters] = useState({
    projectId: ctx.projectId || "all",
    moduleId: "all",
    screenId: ctx.screenId || "all",
    auditType: ctx.presetFilters?.typeFilter && ctx.presetFilters.typeFilter !== "all" ? ctx.presetFilters.typeFilter : "all",
    severity: ctx.presetFilters?.sevFilter && ctx.presetFilters.sevFilter !== "all" ? ctx.presetFilters.sevFilter : "all",
    area: "all", dateFrom: "", dateTo: "", status: "all",
  });
  const [branding, setBranding] = useState({
    companyLogo: null, clientLogo: null,
    projectName: lockedProject?.name || "All Projects",
    clientName: lockedProject?.client || "",
    reportTitle: "UX Audit Report",
    preparedBy: "", reviewer: "", reportDate: new Date().toISOString().slice(0, 10),
    confidential: true, footerText: "Prepared with Auditlane", pageNumbers: true,
  });
  const [progress, setProgress] = useState({ pct: 0, label: "" });
  const [results, setResults] = useState([]);

  const scopedProjects = filters.projectId === "all" ? projects : projects.filter((p) => p.id === filters.projectId);

  const matched = useMemo(() => {
    let issues = issuesFlat;
    if (filters.projectId !== "all") issues = issues.filter((i) => i.projectId === filters.projectId);
    if (scope === "selectedModules" && selModules.size) issues = issues.filter((i) => selModules.has(i.moduleId));
    if (scope === "selectedScreens" && selScreens.size) issues = issues.filter((i) => selScreens.has(i.screenId));
    if (scope === "currentScreen" && ctx.screenId) issues = issues.filter((i) => i.screenId === ctx.screenId);
    if (scope === "selectedIssues" && selIssues.size) issues = issues.filter((i) => selIssues.has(`${i.projectId}-${i.id}`));
    if (filters.moduleId !== "all") issues = issues.filter((i) => i.moduleId === filters.moduleId);
    if (filters.screenId !== "all") issues = issues.filter((i) => i.screenId === filters.screenId);
    if (filters.auditType !== "all") issues = issues.filter((i) => i.auditType === filters.auditType);
    if (filters.severity !== "all") issues = issues.filter((i) => i.severity === filters.severity);
    if (filters.area !== "all") issues = issues.filter((i) => i.area === filters.area);
    if (filters.status !== "all") issues = issues.filter((i) => (i.status || "Open") === filters.status);
    if (filters.dateFrom) issues = issues.filter((i) => new Date(i.createdAt) >= new Date(filters.dateFrom));
    if (filters.dateTo) issues = issues.filter((i) => new Date(i.createdAt) <= new Date(filters.dateTo + "T23:59:59"));
    const screenIds = new Set(issues.map((i) => i.screenId));
    let screens = screensFlat.filter((s) => (filters.projectId === "all" || s.projectId === filters.projectId));
    if (scope === "currentScreen" && ctx.screenId) screens = screens.filter((s) => s.id === ctx.screenId);
    else if (scope === "selectedScreens" && selScreens.size) screens = screens.filter((s) => selScreens.has(s.id));
    else if (scope === "selectedModules" && selModules.size) screens = screens.filter((s) => selModules.has(s.moduleId));
    return { issues, screens, screenIds };
  }, [issuesFlat, screensFlat, scope, filters, selModules, selScreens, selIssues, ctx.screenId]);

  function toggleFormat(id) {
    setFormats((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleInclude(id) { setInclude((prev) => ({ ...prev, [id]: !prev[id] })); }
  function toggleSet(setter, id) {
    setter((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleLogoUpload(key, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBranding((b) => ({ ...b, [key]: reader.result }));
    reader.readAsDataURL(file);
  }

  async function startExport() {
    if (formats.size === 0) return;
    setStep("progress");
    setProgress({ pct: 0, label: PROGRESS_STEPS[0] });
    const model = buildReportModel(matched, scopedProjects, stats, severities, branding, template, include);
    const built = [];
    for (const fmt of formats) {
      if (fmt === "csv") built.push(buildCSVFile(matched, include, branding));
      if (fmt === "json") built.push(buildJSONFile(model, include));
      if (fmt === "xlsx") built.push(buildXLSXFile(matched, severities, include, branding));
      if (fmt === "pdf") built.push(buildPDFFile(model, include, severities, template));
      if (fmt === "docx") built.push(buildDOCXFile(model, include, severities, template));
      if (fmt === "pptx") built.push(buildPPTXFile(model, include, severities));
    }
    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 260 + Math.random() * 180));
      setProgress({ pct: Math.round(((i + 1) / PROGRESS_STEPS.length) * 100), label: PROGRESS_STEPS[i] });
    }
    setResults(built);
    setStep("complete");
  }

  function download(file) {
    const a = document.createElement("a");
    a.href = file.url; a.download = file.filename; a.click();
  }
  function openFile(file) {
    if (file.format === "pdf") { printHTML(file.html); return; }
    window.open(file.url, "_blank");
  }
  async function copyLink(file) {
    try { await navigator.clipboard.writeText(file.url); showToast("Link copied (valid for this browser session)"); }
    catch (e) { showToast("Could not copy link"); }
  }
  function emailReport(file) {
    const subject = encodeURIComponent(`${branding.reportTitle} — ${branding.projectName}`);
    const body = encodeURIComponent(`Hi,\n\nSharing the ${branding.reportTitle} for ${branding.projectName}.\nPlease find it attached — download it from Auditlane and attach the file (${file.filename}) manually, since browsers can't auto-attach files to emails.\n\nBest,\n${branding.preparedBy || ""}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  return (
    <div className="uxa-modal-overlay top" onClick={step === "config" ? onClose : undefined}>
      <div className="uxa-export-modal" onClick={(e) => e.stopPropagation()}>
        {step === "config" && (
          <>
            <div className="uxa-export-head">
              <div><h2>Export Center</h2><p>Generate a client-ready report from your audit data</p></div>
              <button onClick={onClose}><X size={18} /></button>
            </div>
            <div className="uxa-export-body">
              <div className="uxa-export-main">

                <ExportSection title="1 · Export format" sub="Select one or more output formats">
                  <div className="uxa-format-grid">
                    {EXPORT_FORMATS.map((f) => (
                      <button key={f.id} className={`uxa-format-card ${formats.has(f.id) ? "active" : ""}`} onClick={() => toggleFormat(f.id)}>
                        <div className="uxa-format-check">{formats.has(f.id) ? <CheckSquare size={15} /> : <Square size={15} />}</div>
                        <f.icon size={20} />
                        <strong>{f.label}</strong>
                        <span>{f.desc}</span>
                        <em>{f.tag}</em>
                      </button>
                    ))}
                  </div>
                </ExportSection>

                <ExportSection title="2 · Export scope">
                  <div className="uxa-scope-row">
                    {[
                      { id: "allProjects", label: "All Projects" },
                      { id: "entireProject", label: "Entire Project" },
                      { id: "selectedModules", label: "Selected Modules" },
                      { id: "selectedScreens", label: "Selected Screens" },
                      { id: "selectedIssues", label: "Selected Issues" },
                      { id: "currentScreen", label: "Only Current Screen" },
                      { id: "filteredResults", label: "Only Filtered Results" },
                    ].map((s) => (
                      <button key={s.id} className={`uxa-chip ${scope === s.id ? "active" : ""}`} onClick={() => setScope(s.id)}>{s.label}</button>
                    ))}
                  </div>
                  {scope === "selectedModules" && (
                    <div className="uxa-picker-list">
                      {scopedProjects.flatMap((p) => p.modules).map((m) => (
                        <label key={m.id} className="uxa-checkbox"><input type="checkbox" checked={selModules.has(m.id)} onChange={() => toggleSet(setSelModules, m.id)} /> {m.name}</label>
                      ))}
                    </div>
                  )}
                  {scope === "selectedScreens" && (
                    <div className="uxa-picker-list">
                      {screensFlat.filter((s) => filters.projectId === "all" || s.projectId === filters.projectId).map((s) => (
                        <label key={s.id} className="uxa-checkbox"><input type="checkbox" checked={selScreens.has(s.id)} onChange={() => toggleSet(setSelScreens, s.id)} /> {s.projectName} / {s.name}</label>
                      ))}
                    </div>
                  )}
                  {scope === "selectedIssues" && (
                    <div className="uxa-picker-list">
                      {issuesFlat.filter((i) => filters.projectId === "all" || i.projectId === filters.projectId).map((i) => (
                        <label key={`${i.projectId}-${i.id}`} className="uxa-checkbox"><input type="checkbox" checked={selIssues.has(`${i.projectId}-${i.id}`)} onChange={() => toggleSet(setSelIssues, `${i.projectId}-${i.id}`)} /> <span className="uxa-mono">{i.id}</span> {i.summary.slice(0, 40)}</label>
                      ))}
                    </div>
                  )}
                </ExportSection>

                <ExportSection title="3 · Include data">
                  <div className="uxa-include-grid">
                    {INCLUDE_FIELDS.map((f) => (
                      <label key={f.id} className="uxa-checkbox"><input type="checkbox" checked={include[f.id]} onChange={() => toggleInclude(f.id)} /> {f.label}</label>
                    ))}
                  </div>
                </ExportSection>

                <ExportSection title="4 · Filters" sub={`${matched.issues.length} issue${matched.issues.length === 1 ? "" : "s"} · ${matched.screens.length} screen${matched.screens.length === 1 ? "" : "s"} match`}>
                  <div className="uxa-filter-grid">
                    <select value={filters.projectId} onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))} disabled={!!lockedProject}>
                      <option value="all">All projects</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={filters.moduleId} onChange={(e) => setFilters((f) => ({ ...f, moduleId: e.target.value }))}>
                      <option value="all">All modules</option>
                      {scopedProjects.flatMap((p) => p.modules).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select value={filters.screenId} onChange={(e) => setFilters((f) => ({ ...f, screenId: e.target.value }))}>
                      <option value="all">All screens</option>
                      {screensFlat.filter((s) => filters.projectId === "all" || s.projectId === filters.projectId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={filters.auditType} onChange={(e) => setFilters((f) => ({ ...f, auditType: e.target.value }))}>
                      <option value="all">UX + UI</option><option value="UX">UX only</option><option value="UI">UI only</option>
                    </select>
                    <select value={filters.severity} onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}>
                      <option value="all">All severities</option>
                      {severities.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                    </select>
                    <select value={filters.area} onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}>
                      <option value="all">All areas</option>
                      {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                      <option value="all">All statuses</option>
                      <option>Open</option><option>In Review</option><option>Resolved</option><option>Won't Fix</option>
                    </select>
                    <div className="uxa-date-range">
                      <CalendarRange size={13} />
                      <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
                      <span>–</span>
                      <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
                    </div>
                    <select disabled title="Coming soon"><option>Assignee (coming soon)</option></select>
                  </div>
                </ExportSection>

                {formats.has("pdf") || formats.has("docx") || formats.has("pptx") ? (
                  <ExportSection title="5 · Report template">
                    <div className="uxa-template-grid">
                      {PDF_TEMPLATES.map((t) => (
                        <button key={t.id} className={`uxa-template-card ${template === t.id ? "active" : ""}`} onClick={() => setTemplate(t.id)}>
                          <div className="uxa-template-swatch" style={{ background: t.color }} />
                          <strong>{t.label}</strong>
                          <span>{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </ExportSection>
                ) : null}

                <ExportSection title="6 · Branding">
                  <div className="uxa-branding-grid">
                    <div className="uxa-form-field">
                      <label>Report title</label>
                      <input value={branding.reportTitle} onChange={(e) => setBranding((b) => ({ ...b, reportTitle: e.target.value }))} />
                    </div>
                    <div className="uxa-form-field">
                      <label>Project name</label>
                      <input value={branding.projectName} onChange={(e) => setBranding((b) => ({ ...b, projectName: e.target.value }))} />
                    </div>
                    <div className="uxa-form-field">
                      <label>Client name</label>
                      <input value={branding.clientName} onChange={(e) => setBranding((b) => ({ ...b, clientName: e.target.value }))} />
                    </div>
                    <div className="uxa-form-field">
                      <label>Report date</label>
                      <input type="date" value={branding.reportDate} onChange={(e) => setBranding((b) => ({ ...b, reportDate: e.target.value }))} />
                    </div>
                    <div className="uxa-form-field">
                      <label>Prepared by</label>
                      <input value={branding.preparedBy} onChange={(e) => setBranding((b) => ({ ...b, preparedBy: e.target.value }))} placeholder="Your name" />
                    </div>
                    <div className="uxa-form-field">
                      <label>Reviewer</label>
                      <input value={branding.reviewer} onChange={(e) => setBranding((b) => ({ ...b, reviewer: e.target.value }))} />
                    </div>
                    <div className="uxa-form-field">
                      <label>Company logo</label>
                      <label className="uxa-upload-zone small"><Building2 size={14} /> {branding.companyLogo ? "Logo added" : "Upload"} <input type="file" accept="image/*" hidden onChange={(e) => handleLogoUpload("companyLogo", e.target.files[0])} /></label>
                    </div>
                    <div className="uxa-form-field">
                      <label>Client logo</label>
                      <label className="uxa-upload-zone small"><ImageIcon size={14} /> {branding.clientLogo ? "Logo added" : "Upload"} <input type="file" accept="image/*" hidden onChange={(e) => handleLogoUpload("clientLogo", e.target.files[0])} /></label>
                    </div>
                    <div className="uxa-form-field">
                      <label>Footer text</label>
                      <input value={branding.footerText} onChange={(e) => setBranding((b) => ({ ...b, footerText: e.target.value }))} />
                    </div>
                    <div className="uxa-form-field">
                      <label className="uxa-checkbox"><input type="checkbox" checked={branding.confidential} onChange={(e) => setBranding((b) => ({ ...b, confidential: e.target.checked }))} /> Confidential watermark</label>
                    </div>
                    <div className="uxa-form-field">
                      <label className="uxa-checkbox"><input type="checkbox" checked={branding.pageNumbers} onChange={(e) => setBranding((b) => ({ ...b, pageNumbers: e.target.checked }))} /> Page numbers</label>
                    </div>
                  </div>
                </ExportSection>
              </div>

              <div className="uxa-export-preview">
                <div className="uxa-preview-label"><Info size={12} /> Live cover preview</div>
                <PDFPreview branding={branding} template={template} matched={matched} stats={stats} />
                <div className="uxa-preview-meta">
                  <span>{matched.issues.length} issues</span><span>·</span><span>{matched.screens.length} screens</span><span>·</span><span>{PDF_TEMPLATES.find((t) => t.id === template)?.label}</span>
                </div>
              </div>
            </div>
            <div className="uxa-export-footer">
              <span className="uxa-text-muted">{formats.size} format{formats.size === 1 ? "" : "s"} selected</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="uxa-btn" onClick={onClose}>Cancel</button>
                <button className="uxa-btn primary" disabled={formats.size === 0} onClick={startExport}><Download size={14} /> Generate export</button>
              </div>
            </div>
          </>
        )}

        {step === "progress" && (
          <div className="uxa-export-progress">
            <Loader2 size={30} className="spin" />
            <h3>Preparing report…</h3>
            <div className="uxa-progress-track big"><div className="uxa-progress-fill" style={{ width: `${progress.pct}%` }} /></div>
            <p>{progress.pct}%</p>
            <ul>
              {PROGRESS_STEPS.map((s) => (
                <li key={s} className={PROGRESS_STEPS.indexOf(s) <= PROGRESS_STEPS.indexOf(progress.label) ? "done" : ""}>
                  {PROGRESS_STEPS.indexOf(s) < PROGRESS_STEPS.indexOf(progress.label) || (PROGRESS_STEPS.indexOf(s) === PROGRESS_STEPS.indexOf(progress.label) && progress.pct === 100) ? <Check size={13} /> : <Loader2 size={13} className="spin" />} {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === "complete" && (
          <div className="uxa-export-complete">
            <div className="uxa-complete-icon"><CheckCircle2 size={30} /></div>
            <h3>Export complete</h3>
            <p>{results.length} file{results.length === 1 ? "" : "s"} generated for {branding.projectName}</p>
            <div className="uxa-result-list">
              {results.map((r) => (
                <div className="uxa-result-row" key={r.format}>
                  <div className="uxa-result-info"><strong>{r.filename}</strong><span>{r.sizeLabel}</span></div>
                  <div className="uxa-result-actions">
                    <button className="uxa-btn tiny" onClick={() => openFile(r)}><ExternalLink size={12} /> Open</button>
                    <button className="uxa-btn tiny" onClick={() => copyLink(r)}><Link2 size={12} /> Copy link</button>
                    <button className="uxa-btn tiny" onClick={() => emailReport(r)}><Mail size={12} /> Email</button>
                    <button className="uxa-btn tiny primary" onClick={() => download(r)}><Download size={12} /> Download</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="uxa-complete-actions">
              <button className="uxa-btn" onClick={() => setStep("config")}><RotateCcw size={13} /> Export again</button>
              <button className="uxa-btn primary" onClick={onClose}><Check size={13} /> Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportSection({ title, sub, children }) {
  return (
    <div className="uxa-export-section">
      <div className="uxa-export-section-head"><h4>{title}</h4>{sub && <span>{sub}</span>}</div>
      {children}
    </div>
  );
}

function PDFPreview({ branding, template, matched, stats }) {
  const tpl = PDF_TEMPLATES.find((t) => t.id === template);
  return (
    <div className="uxa-cover-mock" style={{ "--tcolor": tpl?.color || "#3B5BDB" }}>
      {branding.confidential && <div className="uxa-cover-watermark">CONFIDENTIAL</div>}
      <div className="uxa-cover-bar" />
      <div className="uxa-cover-logos">
        {branding.companyLogo && <img src={branding.companyLogo} alt="" />}
        {branding.clientLogo && <img src={branding.clientLogo} alt="" />}
      </div>
      <div className="uxa-cover-tag">{tpl?.label}</div>
      <h2>{branding.reportTitle}</h2>
      <p>{branding.projectName}{branding.clientName ? ` · ${branding.clientName}` : ""}</p>
      <div className="uxa-cover-stats">
        <div><strong>{matched.screens.length}</strong><span>Screens</span></div>
        <div><strong>{matched.issues.length}</strong><span>Issues</span></div>
        <div><strong>{stats.estHours}h</strong><span>Est. effort</span></div>
      </div>
      <div className="uxa-cover-foot">
        <span>{branding.preparedBy ? `Prepared by ${branding.preparedBy}` : "Prepared by —"}</span>
        <span>{branding.reportDate}</span>
      </div>
    </div>
  );
}

/* ---- report model + file builders ---- */

function buildReportModel(matched, scopedProjects, stats, severities, branding, template, include) {
  const bySev = severities.map((sv) => ({ ...sv, count: matched.issues.filter((i) => i.severity === sv.id).length }));
  const byModule = {};
  matched.issues.forEach((i) => { byModule[i.moduleName] = (byModule[i.moduleName] || 0) + 1; });
  const screensById = {};
  matched.screens.forEach((s) => { screensById[s.id] = { ...s, issues: matched.issues.filter((i) => i.screenId === s.id) }; });
  return {
    branding, template, generatedAt: new Date().toISOString(),
    projects: scopedProjects.map((p) => p.name),
    screens: Object.values(screensById),
    issues: matched.issues,
    bySev, byModule,
    critical: bySev.find((s) => s.id === "critical")?.count || 0,
    high: bySev.find((s) => s.id === "high")?.count || 0,
    totalIssues: matched.issues.length,
    totalScreens: matched.screens.length,
    estHours: stats.estHours,
  };
}

function fileMeta(blob, ext, title) {
  const url = URL.createObjectURL(blob);
  const kb = (blob.size / 1024).toFixed(1);
  return { url, sizeLabel: `${kb} KB`, filename: `${(title || "audit-report").replace(/[^a-z0-9\-_]+/gi, "-")}.${ext}` };
}

function buildCSVFile(matched, include, branding) {
  const cols = [
    ["id", "ID", true], ["projectName", "Project", true], ["moduleName", "Module", include.screenDetails],
    ["screenName", "Screen", include.screenDetails], ["auditType", "Audit Type", true],
    ["area", "Area", include.area], ["summary", "Issue Summary", true],
    ["severity", "Severity", include.severity], ["recommendation", "Recommendation", include.recommendations],
    ["aiPrompt", "AI Design Prompt", include.aiPrompts], ["status", "Status", true],
  ].filter((c) => c[2]);
  const rows = matched.issues.map((i) => cols.map(([key]) => i[key] ?? ""));
  const csv = [cols.map((c) => c[1]), ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  return { format: "csv", ...fileMeta(blob, "csv", branding.reportTitle) };
}

function buildJSONFile(model, include) {
  const payload = {
    meta: { title: model.branding.reportTitle, project: model.branding.projectName, client: model.branding.clientName, preparedBy: model.branding.preparedBy, reportDate: model.branding.reportDate, generatedAt: model.generatedAt },
    ...(include.auditStatistics ? { statistics: { totalIssues: model.totalIssues, totalScreens: model.totalScreens, estHours: model.estHours, bySeverity: model.bySev, byModule: model.byModule } } : {}),
    screens: model.screens.map((s) => ({
      name: s.name, type: s.type, module: s.moduleName, project: s.projectName,
      ...(include.estimatedTime ? { estimatedMinutes: s.issues.length } : {}),
      issues: s.issues.map((i) => ({
        id: i.id, auditType: i.auditType,
        ...(include.area ? { area: i.area } : {}),
        summary: i.summary,
        ...(include.severity ? { severity: i.severity } : {}),
        ...(include.recommendations ? { recommendation: i.recommendation } : {}),
        ...(include.aiPrompts ? { aiPrompt: i.aiPrompt } : {}),
        status: i.status,
      })),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return { format: "json", ...fileMeta(blob, "json", model.branding.reportTitle) };
}

function buildXLSXFile(matched, severities, include, branding) {
  const wb = XLSX.utils.book_new();

  function addSheet(name, aoa) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colCount = aoa[0]?.length || 1;
    ws["!cols"] = Array.from({ length: colCount }, (_, ci) => ({
      wch: Math.min(50, Math.max(10, ...aoa.map((row) => String(row[ci] ?? "").length))),
    }));
    ws["!views"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" }];
    if (aoa.length > 1) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }

  addSheet("Dashboard", [
    ["Metric", "Value"],
    ["Report Title", branding.reportTitle], ["Project", branding.projectName], ["Client", branding.clientName],
    ["Report Date", branding.reportDate], ["Total Issues", matched.issues.length], ["Total Screens", matched.screens.length],
  ]);

  addSheet("Screen Summary", [
    ["Screen", "Module", "Project", "Type", "UX Issues", "UI Issues", "Status"],
    ...matched.screens.map((s) => {
      const si = matched.issues.filter((i) => i.screenId === s.id);
      return [s.name, s.moduleName, s.projectName, s.type, si.filter((i) => i.auditType === "UX").length, si.filter((i) => i.auditType === "UI").length, s.status];
    }),
  ]);

  if (include.uxIssues) {
    addSheet("UX Issues", [
      ["ID", "Screen", "Area", "Summary", "Severity", "Status"],
      ...matched.issues.filter((i) => i.auditType === "UX").map((i) => [i.id, i.screenName, i.area, i.summary, `${severityMeta(i.severity, severities).icon} ${severityMeta(i.severity, severities).label}`, i.status]),
    ]);
  }
  if (include.uiIssues) {
    addSheet("UI Issues", [
      ["ID", "Screen", "Area", "Summary", "Severity", "Status"],
      ...matched.issues.filter((i) => i.auditType === "UI").map((i) => [i.id, i.screenName, i.area, i.summary, `${severityMeta(i.severity, severities).icon} ${severityMeta(i.severity, severities).label}`, i.status]),
    ]);
  }
  if (include.recommendations) {
    addSheet("Recommendations", [["ID", "Screen", "Recommendation"], ...matched.issues.map((i) => [i.id, i.screenName, i.recommendation || ""])]);
  }
  if (include.aiPrompts) {
    addSheet("AI Prompts", [["ID", "Screen", "AI Design Prompt"], ...matched.issues.map((i) => [i.id, i.screenName, i.aiPrompt || ""])]);
  }
  addSheet("Configuration", [["Severity", "Priority", "Color"], ...severities.map((s) => [s.label, s.priority, s.color])]);
  addSheet("Statistics", [
    ["Severity", "Count"], ...severities.map((s) => [s.label, matched.issues.filter((i) => i.severity === s.id).length]),
  ]);

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  return { format: "xlsx", ...fileMeta(blob, "xlsx", branding.reportTitle) };
}

function svgBarChart(data, w = 480, h = 160) {
  const max = Math.max(1, ...data.map((d) => d.count ?? d.value ?? 0));
  const bw = w / data.length - 12;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    ${data.map((d, i) => {
      const val = d.count ?? d.value ?? 0;
      const bh = (val / max) * (h - 30);
      const x = i * (w / data.length) + 6;
      return `<rect x="${x}" y="${h - 20 - bh}" width="${bw}" height="${bh}" fill="${d.color || "#3B5BDB"}" rx="4"/>
        <text x="${x + bw / 2}" y="${h - 6}" font-size="9" text-anchor="middle" fill="#64748B">${(d.label || d.name || "").slice(0, 10)}</text>
        <text x="${x + bw / 2}" y="${h - 24 - bh}" font-size="10" text-anchor="middle" fill="#0F172A" font-weight="700">${val}</text>`;
    }).join("")}
  </svg>`;
}

function reportStylesBlock(brandColor) {
  return `<style>
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; color: #0F172A; margin: 0; }
    .page { padding: 48px; page-break-after: always; position: relative; min-height: 700px; }
    .page:last-child { page-break-after: auto; }
    h1 { font-size: 30px; margin: 0 0 6px; }
    h2 { font-size: 20px; margin: 0 0 14px; border-bottom: 2px solid ${brandColor}; padding-bottom: 8px; }
    h3 { font-size: 15px; margin: 18px 0 8px; }
    p { line-height: 1.5; font-size: 13px; }
    .cover { background: linear-gradient(160deg, ${brandColor} 0%, #0F172A 100%); color: white; display: flex; flex-direction: column; justify-content: center; height: 700px; }
    .cover .tag { text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; opacity: 0.8; margin-bottom: 14px; }
    .cover h1 { font-size: 36px; }
    .cover .meta { margin-top: 40px; font-size: 12px; opacity: 0.85; }
    .watermark { position: absolute; top: 45%; left: 10%; font-size: 64px; color: rgba(220,38,38,0.12); transform: rotate(-25deg); font-weight: 800; pointer-events: none; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin: 10px 0 20px; }
    th { text-align: left; background: #F1F5F9; padding: 7px 8px; font-size: 10px; text-transform: uppercase; color: #64748B; }
    td { padding: 7px 8px; border-bottom: 1px solid #E5E9F0; }
    .sev { padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; color: white; display: inline-block; }
    .stat-row { display: flex; gap: 14px; margin: 16px 0; }
    .stat-box { flex: 1; border: 1px solid #E5E9F0; border-radius: 10px; padding: 12px; text-align: center; }
    .stat-box strong { display: block; font-size: 20px; }
    .stat-box span { font-size: 10.5px; color: #64748B; }
    .issue-card { border: 1px solid #E5E9F0; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
    .issue-card .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .issue-card .idtag { font-family: monospace; font-size: 11px; color: #64748B; }
    .prompt-box { background: #F8FAFC; border-radius: 8px; padding: 8px 10px; font-family: monospace; font-size: 10.5px; margin-top: 6px; white-space: pre-wrap; }
    .footer { position: absolute; bottom: 20px; left: 48px; right: 48px; display: flex; justify-content: space-between; font-size: 9.5px; color: #94A3B8; border-top: 1px solid #E5E9F0; padding-top: 8px; }
    @media print { .page { page-break-after: always; } }
  </style>`;
}

function buildPDFFile(model, include, severities, template) {
  const b = model.branding;
  const tpl = PDF_TEMPLATES.find((t) => t.id === template);
  const pages = [];

  pages.push(`<div class="page cover">
    ${b.confidential ? `<div class="watermark">CONFIDENTIAL</div>` : ""}
    <div class="tag">${tpl?.label || "UX Audit Report"}</div>
    <h1>${escapeHTML(b.reportTitle)}</h1>
    <p style="font-size:16px;opacity:0.9">${escapeHTML(b.projectName)}${b.clientName ? " · " + escapeHTML(b.clientName) : ""}</p>
    <div class="meta">Prepared by ${escapeHTML(b.preparedBy || "—")} · Reviewed by ${escapeHTML(b.reviewer || "—")} · ${b.reportDate}</div>
  </div>`);

  pages.push(`<div class="page">
    ${b.confidential ? `<div class="watermark">CONFIDENTIAL</div>` : ""}
    <h2>Table of Contents</h2>
    <p>1. Executive Summary</p><p>2. Audit Statistics</p><p>3. Severity Breakdown</p>
    <p>4. Screen-by-Screen Findings</p><p>5. Recommendations &amp; AI Design Prompts</p><p>6. Appendix</p>
  </div>`);

  if (include.summaryDashboard || include.auditStatistics) {
    pages.push(`<div class="page">
      ${b.confidential ? `<div class="watermark">CONFIDENTIAL</div>` : ""}
      <h2>Executive Summary</h2>
      <p>This report covers ${model.totalScreens} screen(s) and ${model.totalIssues} logged issue(s) across ${model.projects.join(", ")}. Estimated remediation planning effort: ${model.estHours} hours.</p>
      <div class="stat-row">
        <div class="stat-box"><strong>${model.totalScreens}</strong><span>Screens audited</span></div>
        <div class="stat-box"><strong>${model.totalIssues}</strong><span>Total issues</span></div>
        <div class="stat-box"><strong>${model.critical}</strong><span>Critical</span></div>
        <div class="stat-box"><strong>${model.high}</strong><span>High</span></div>
      </div>
      ${include.chartsGraphs ? `<h3>Issues by severity</h3>${svgBarChart(model.bySev.map((s) => ({ label: s.label, count: s.count, color: s.color })))}` : ""}
      ${include.chartsGraphs ? `<h3>Issues by module</h3>${svgBarChart(Object.entries(model.byModule).map(([name, value]) => ({ label: name, value, color: tpl?.color })))}` : ""}
      <div class="footer"><span>${escapeHTML(b.footerText)}</span>${b.pageNumbers ? "<span>Page 3</span>" : ""}</div>
    </div>`);
  }

  const screenPages = model.screens.map((s, idx) => `<div class="page">
    ${b.confidential ? `<div class="watermark">CONFIDENTIAL</div>` : ""}
    <h2>${escapeHTML(s.moduleName)} / ${escapeHTML(s.name)}</h2>
    ${include.screenMetadata ? `<p><strong>Type:</strong> ${s.type} &nbsp; <strong>Audit types:</strong> ${(s.auditTypes || []).join(", ")} &nbsp; <strong>Date:</strong> ${s.auditDate || "—"}</p>` : ""}
    ${s.issues.map((i) => {
      const sev = severityMeta(i.severity, severities);
      return `<div class="issue-card">
        <div class="head"><span class="idtag">${i.id}</span><span class="sev" style="background:${sev.color}">${sev.icon} ${sev.label}</span></div>
        ${include.area ? `<p><strong>Area:</strong> ${escapeHTML(i.area)}</p>` : ""}
        <p>${escapeHTML(i.summary)}</p>
        ${include.recommendations && i.recommendation ? `<p><strong>Recommendation:</strong> ${escapeHTML(i.recommendation)}</p>` : ""}
        ${include.aiPrompts && i.aiPrompt ? `<div class="prompt-box">${escapeHTML(i.aiPrompt)}</div>` : ""}
      </div>`;
    }).join("") || "<p style='color:#94A3B8'>No issues logged for this screen.</p>"}
    <div class="footer"><span>${escapeHTML(b.footerText)}</span>${b.pageNumbers ? `<span>Page ${4 + idx}</span>` : ""}</div>
  </div>`).join("");
  pages.push(screenPages);

  pages.push(`<div class="page">
    ${b.confidential ? `<div class="watermark">CONFIDENTIAL</div>` : ""}
    <h2>Appendix</h2>
    <p>Severity legend:</p>
    <table><thead><tr><th>Severity</th><th>Definition</th></tr></thead><tbody>
      ${severities.map((s) => `<tr><td><span class="sev" style="background:${s.color}">${s.icon} ${s.label}</span></td><td>Priority ${s.priority}</td></tr>`).join("")}
    </tbody></table>
    <div class="footer"><span>${escapeHTML(b.footerText)}</span></div>
  </div>`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHTML(b.reportTitle)}</title>${reportStylesBlock(tpl?.color || "#3B5BDB")}</head><body>${pages.join("")}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  return { format: "pdf", html, ...fileMeta(blob, "html", b.reportTitle) };
}

function buildDOCXFile(model, include, severities, template) {
  const pdfLike = buildPDFFile(model, include, severities, template);
  const wordHeader = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--></head>`;
  const html = pdfLike.html.replace("<!DOCTYPE html><html><head><meta charset=\"utf-8\">", wordHeader.replace("<head>", "<head><meta charset=\"utf-8\">"));
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  return { format: "docx", ...fileMeta(blob, "doc", model.branding.reportTitle) };
}

function buildPPTXFile(model, include, severities) {
  const b = model.branding;
  const slideStyle = `<style>
    * { box-sizing: border-box; } body { margin: 0; font-family: Inter, Arial, sans-serif; }
    .slide { width: 1280px; height: 720px; padding: 60px; position: relative; page-break-after: always; overflow: hidden; }
    .slide.dark { background: #0F172A; color: white; }
    .slide.light { background: white; color: #0F172A; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 13px; opacity: 0.6; margin-bottom: 10px; }
    .slide h1 { font-size: 44px; margin: 0 0 10px; }
    .slide h2 { font-size: 30px; margin: 0 0 24px; }
    .grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 30px; }
    .box { border: 1px solid rgba(148,163,184,0.4); border-radius: 12px; padding: 18px; text-align: center; }
    .box strong { font-size: 30px; display: block; }
    .box span { font-size: 12px; opacity: 0.7; }
    ul { font-size: 16px; line-height: 1.7; }
    .pagenum { position: absolute; bottom: 24px; right: 40px; font-size: 12px; opacity: 0.5; }
  </style>`;
  const bySevRows = model.bySev.map((s) => `<li><span style="color:${s.color};font-weight:700">${s.icon} ${s.label}</span> — ${s.count}</li>`).join("");
  const moduleRows = Object.entries(model.byModule).map(([n, v]) => `<li>${escapeHTML(n)} — ${v} issue${v === 1 ? "" : "s"}</li>`).join("");
  const criticalCards = model.issues.filter((i) => i.severity === "critical").slice(0, 5).map((i) => `<li><strong>${i.id}</strong> — ${escapeHTML(i.summary)}</li>`).join("") || "<li>No critical issues found.</li>";
  const highCards = model.issues.filter((i) => i.severity === "high").slice(0, 6).map((i) => `<li><strong>${i.id}</strong> — ${escapeHTML(i.summary)}</li>`).join("") || "<li>No high priority issues found.</li>";
  const recCards = model.issues.filter((i) => i.recommendation).slice(0, 6).map((i) => `<li><strong>${i.id}</strong> — ${escapeHTML(i.recommendation)}</li>`).join("");
  const screenList = model.screens.slice(0, 8).map((s) => `<li>${escapeHTML(s.moduleName)} / ${escapeHTML(s.name)} — ${s.issues.length} issue${s.issues.length === 1 ? "" : "s"}</li>`).join("");

  const slides = [
    `<div class="slide dark"><div class="eyebrow">${PDF_TEMPLATES.find(t=>t.id===model.template)?.label || "UX Audit"}</div><h1>${escapeHTML(b.reportTitle)}</h1><p style="font-size:20px;opacity:0.85">${escapeHTML(b.projectName)}${b.clientName ? " · " + escapeHTML(b.clientName) : ""}</p><p style="opacity:0.6;margin-top:60px">${escapeHTML(b.preparedBy || "")} · ${b.reportDate}</p></div>`,
    `<div class="slide light"><div class="eyebrow">Project Overview</div><h2>${escapeHTML(b.projectName)}</h2><ul><li>Client: ${escapeHTML(b.clientName || "—")}</li><li>Screens audited: ${model.totalScreens}</li><li>Modules covered: ${Object.keys(model.byModule).length}</li><li>Estimated effort: ${model.estHours} hours</li></ul><div class="pagenum">2</div></div>`,
    `<div class="slide dark"><div class="eyebrow">Audit Summary</div><h2>Findings at a glance</h2><div class="grid4"><div class="box"><strong>${model.totalScreens}</strong><span>Screens</span></div><div class="box"><strong>${model.totalIssues}</strong><span>Issues</span></div><div class="box"><strong>${model.critical}</strong><span>Critical</span></div><div class="box"><strong>${model.high}</strong><span>High</span></div></div><div class="pagenum">3</div></div>`,
    `<div class="slide light"><div class="eyebrow">Severity Distribution</div><h2>Issues by severity</h2><ul>${bySevRows}</ul><div class="pagenum">4</div></div>`,
    `<div class="slide dark"><div class="eyebrow">Module Summary</div><h2>Issues by module</h2><ul>${moduleRows}</ul><div class="pagenum">5</div></div>`,
    `<div class="slide light"><div class="eyebrow">Screen-by-Screen</div><h2>Findings by screen</h2><ul>${screenList}</ul><div class="pagenum">6</div></div>`,
    `<div class="slide dark"><div class="eyebrow">Critical Issues</div><h2>Requires immediate attention</h2><ul>${criticalCards}</ul><div class="pagenum">7</div></div>`,
    `<div class="slide light"><div class="eyebrow">High Priority Issues</div><h2>Address in next sprint</h2><ul>${highCards}</ul><div class="pagenum">8</div></div>`,
    `<div class="slide dark"><div class="eyebrow">Recommendations</div><h2>Suggested improvements</h2><ul>${recCards || "<li>Add recommendations to issues to populate this slide.</li>"}</ul><div class="pagenum">9</div></div>`,
    `<div class="slide light"><div class="eyebrow">Next Steps</div><h2>Where to go from here</h2><ul><li>Triage and assign critical &amp; high severity issues</li><li>Review AI-generated design prompts for quick redesign iteration</li><li>Re-audit affected screens after fixes ship</li><li>Track progress in Auditlane</li></ul><div class="pagenum">10</div></div>`,
  ];
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHTML(b.reportTitle)}</title>${slideStyle}</head><body>${slides.join("")}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  return { format: "pptx", html, ...fileMeta(blob, "html", `${b.reportTitle}-slides`) };
}

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function printHTML(html) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

/* ============================== STYLES ============================== */

function StyleSheet() {
  return (
    <style>{`
      .uxa-root {
        --primary: #3B5BDB; --primary-dark: #2B3FA0; --primary-soft: #EBF0FF;
        --accent: #14B8A6;
        --bg: #F8FAFC; --surface: #FFFFFF; --border: #E5E9F0;
        --text: #0F172A; --text-muted: #64748B; --text-faint: #94A3B8;
        --radius: 12px; --radius-sm: 8px;
        --shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text); background: var(--bg);
        width: 100%; height: 100vh; overflow: hidden; position: relative;
        font-size: 13.5px; line-height: 1.45;
      }
      .uxa-root.dark {
        --bg: #0B1220; --surface: #121B2E; --border: #23304A;
        --text: #E7ECF5; --text-muted: #9AA7BD; --text-faint: #6B7A96;
        --primary-soft: #182647;
        --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35);
      }
      .uxa-root * { box-sizing: border-box; }
      .uxa-root button { font-family: inherit; cursor: pointer; }
      .uxa-root input, .uxa-root select, .uxa-root textarea { font-family: inherit; font-size: 13px; color: var(--text); }
      .uxa-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; font-size: 12px; }
      .spin { animation: uxa-spin 0.9s linear infinite; }
      @keyframes uxa-spin { to { transform: rotate(360deg); } }

      .uxa-shell { display: flex; height: 100%; }

      /* Sidebar */
      .uxa-sidebar { width: 216px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px 12px; }
      .uxa-brand { display: flex; align-items: center; gap: 8px; padding: 4px 8px 20px; font-weight: 700; font-size: 15px; letter-spacing: -0.01em; }
      .uxa-brand-mark { width: 26px; height: 26px; border-radius: 8px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; }
      .uxa-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
      .uxa-nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-sm); border: none; background: transparent; color: var(--text-muted); text-align: left; font-size: 13px; font-weight: 500; transition: background 0.15s, color 0.15s; }
      .uxa-nav-item:hover { background: var(--primary-soft); color: var(--text); }
      .uxa-nav-item.active { background: var(--primary); color: white; }
      .uxa-sidebar-footer { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--border); }
      .uxa-cmd-btn, .uxa-theme-btn { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text-muted); font-size: 12px; }
      .uxa-cmd-btn kbd { margin-left: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-size: 10px; }

      .uxa-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      .uxa-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; border-bottom: 1px solid var(--border); background: var(--surface); }
      .uxa-topbar h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
      .uxa-topbar p { font-size: 12px; color: var(--text-muted); margin: 2px 0 0; }
      .uxa-topbar-actions { display: flex; align-items: center; gap: 10px; }
      .uxa-search-pill { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg); color: var(--text-faint); font-size: 12px; min-width: 260px; }
      .uxa-search-pill kbd { margin-left: auto; font-size: 10px; border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; }
      .uxa-content { flex: 1; overflow-y: auto; padding: 22px 28px 60px; }

      .uxa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 12.5px; font-weight: 500; transition: all 0.15s; }
      .uxa-btn:hover { border-color: var(--primary); color: var(--primary); }
      .uxa-btn.primary { background: var(--primary); border-color: var(--primary); color: white; }
      .uxa-btn.primary:hover { background: var(--primary-dark); color: white; }
      .uxa-btn.ai { background: var(--primary-soft); border-color: transparent; color: var(--primary); }
      .uxa-btn.tiny { padding: 4px 8px; font-size: 11px; }
      .uxa-btn.full { width: 100%; justify-content: center; }
      .uxa-btn:disabled { opacity: 0.45; cursor: not-allowed; }

      /* Cards / panels */
      .uxa-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); margin-bottom: 16px; }
      .uxa-panel h3 { font-size: 13px; font-weight: 700; margin: 0 0 12px; }
      .uxa-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .uxa-panel.span2 { grid-column: span 2; }

      .uxa-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 18px; }
      .uxa-stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); position: relative; }
      .uxa-stat-icon { width: 26px; height: 26px; border-radius: 7px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
      .uxa-stat-card.critical .uxa-stat-icon { background: #FEE2E2; color: #DC2626; }
      .uxa-stat-card.high .uxa-stat-icon { background: #FFEDD5; color: #EA580C; }
      .uxa-stat-card.medium .uxa-stat-icon { background: #FEF3C7; color: #D97706; }
      .uxa-stat-card.low .uxa-stat-icon { background: #DCFCE7; color: #16A34A; }
      .uxa-stat-value { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
      .uxa-stat-label { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

      .uxa-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
      .uxa-dash-grid > :nth-child(3) { grid-column: span 2; }
      .uxa-dash-grid2 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; }

      .uxa-timeline { list-style: none; margin: 0; padding: 0; }
      .uxa-timeline li { display: flex; gap: 10px; padding: 0 0 16px 4px; position: relative; }
      .uxa-timeline li:not(:last-child)::before { content: ''; position: absolute; left: 7px; top: 14px; bottom: -2px; width: 1px; background: var(--border); }
      .uxa-timeline-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-top: 4px; flex-shrink: 0; }
      .uxa-timeline p { margin: 0; font-size: 12.5px; }
      .uxa-timeline span { font-size: 11px; color: var(--text-faint); }

      .uxa-quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .uxa-progress-row { display: flex; align-items: center; gap: 10px; }
      .uxa-progress-track { flex: 1; height: 6px; border-radius: 4px; background: var(--border); overflow: hidden; }
      .uxa-progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: 4px; transition: width 0.4s; }

      /* Tables */
      .uxa-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .uxa-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-faint); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); }
      .uxa-table td { padding: 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
      .uxa-table tr:last-child td { border-bottom: none; }
      .uxa-row-click { cursor: pointer; }
      .uxa-row-click:hover td { background: var(--primary-soft); }
      .uxa-cell-strong { font-weight: 600; }
      .uxa-cell-truncate { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .uxa-text-muted { color: var(--text-muted); }
      .uxa-empty { text-align: center; color: var(--text-faint); padding: 30px !important; }
      .uxa-row-actions { display: flex; gap: 4px; }
      .uxa-row-actions button { border: none; background: transparent; color: var(--text-faint); padding: 5px; border-radius: 6px; }
      .uxa-row-actions button:hover { background: var(--primary-soft); color: var(--primary); }

      .uxa-pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--primary-soft); color: var(--primary); }
      .uxa-pill.status-Draft { background: #F1F5F9; color: #64748B; }
      .uxa-pill.status-InProgress { background: #DBEAFE; color: #2563EB; }
      .uxa-pill.status-Open { background: #FEF3C7; color: #B45309; }
      .uxa-pill.status-InReview { background: #E0E7FF; color: #4338CA; }
      .uxa-pill.status-Resolved { background: #DCFCE7; color: #15803D; }
      .uxa-pill.status-active { background: #DCFCE7; color: #15803D; }
      .uxa-pill.status-disabled { background: #F1F5F9; color: #94A3B8; }
      .uxa-sev-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--sev) 14%, transparent); color: var(--sev); }

      .uxa-inline-search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 7px 10px; background: var(--bg); color: var(--text-faint); min-width: 220px; }
      .uxa-inline-search input { border: none; outline: none; background: transparent; flex: 1; color: var(--text); }

      /* Forms */
      .uxa-form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
      .uxa-form-field label { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
      .uxa-form-field input, .uxa-form-field select, .uxa-form-field textarea {
        border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; background: var(--bg); outline: none; transition: border-color 0.15s;
      }
      .uxa-form-field input:focus, .uxa-form-field select:focus, .uxa-form-field textarea:focus { border-color: var(--primary); }
      .uxa-form-field input.readonly, .readonly-pill { background: var(--bg); color: var(--text-muted); }
      .readonly-pill { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: var(--radius-sm); border: 1px dashed var(--border); font-size: 12.5px; }
      .uxa-field-label-row { display: flex; align-items: center; justify-content: space-between; }
      .uxa-checkbox-row { display: flex; gap: 14px; align-items: center; }
      .uxa-checkbox { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
      .uxa-chip { border: 1px solid var(--border); background: var(--bg); border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: var(--text-muted); }
      .uxa-chip.active { background: var(--primary); border-color: var(--primary); color: white; }
      .uxa-chip.removable { display: inline-flex; align-items: center; gap: 6px; }
      .uxa-chip.removable button { border: none; background: transparent; color: inherit; display: flex; }
      .uxa-chip-cloud { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
      .uxa-inline-form { display: flex; gap: 8px; }
      .uxa-inline-form input { flex: 1; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; background: var(--bg); }
      .uxa-upload-zone { display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px dashed var(--border); border-radius: var(--radius-sm); padding: 16px; color: var(--text-faint); background: var(--bg); width: 100%; }

      .uxa-settings-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
      .uxa-settings-tabs button { padding: 8px 14px; border: none; background: transparent; font-size: 12.5px; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; }
      .uxa-settings-tabs button.active { color: var(--primary); border-color: var(--primary); }

      /* Workspace */
      .uxa-workspace { display: grid; grid-template-columns: 240px 1fr; gap: 14px; height: 100%; }
      .uxa-tree { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; height: fit-content; box-shadow: var(--shadow); }
      .uxa-tree-head { display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-faint); padding: 4px 6px 8px; }
      .uxa-tree-head button { border: none; background: var(--bg); border-radius: 6px; padding: 3px; color: var(--text-muted); }
      .uxa-tree-mod-row { width: 100%; display: flex; align-items: center; gap: 6px; padding: 7px 6px; border: none; background: transparent; font-size: 12.5px; font-weight: 600; border-radius: 6px; }
      .uxa-tree-mod-row:hover { background: var(--primary-soft); }
      .uxa-tree-count { margin-left: auto; font-size: 10.5px; color: var(--text-faint); background: var(--bg); border-radius: 999px; padding: 1px 6px; }
      .uxa-tree-screens { display: flex; flex-direction: column; gap: 1px; padding-left: 20px; margin-bottom: 4px; }
      .uxa-tree-screen { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border: none; background: transparent; border-radius: 6px; font-size: 12px; color: var(--text-muted); text-align: left; }
      .uxa-tree-screen:hover { background: var(--bg); color: var(--text); }
      .uxa-tree-screen.active { background: var(--primary); color: white; }
      .uxa-tree-badge { margin-left: auto; font-size: 10px; background: var(--bg); color: var(--text-muted); border-radius: 999px; padding: 1px 6px; }
      .uxa-tree-screen.active .uxa-tree-badge { background: rgba(255,255,255,0.25); color: white; }
      .uxa-tree-add-screen { display: flex; align-items: center; gap: 5px; padding: 5px 8px; border: none; background: transparent; font-size: 11.5px; color: var(--text-faint); }
      .uxa-tree-add-screen:hover { color: var(--primary); }
      .uxa-tree-add { padding: 6px; }
      .uxa-tree-add input, .uxa-tree-add select { width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; background: var(--bg); margin-bottom: 4px; font-size: 12px; }
      .uxa-tree-add.nested { padding-left: 20px; }

      .uxa-screenpane { display: grid; grid-template-columns: 1fr 220px; gap: 14px; align-items: start; }
      .uxa-screenpane-main { min-width: 0; }
      .uxa-screen-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
      .uxa-summary-panel { position: sticky; top: 0; }
      .uxa-summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding: 5px 0; }
      .uxa-summary-row strong { font-weight: 700; }
      .uxa-summary-divider { height: 1px; background: var(--border); margin: 8px 0; }

      .uxa-issue-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
      .uxa-issue-toolbar select { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 7px 10px; background: var(--bg); font-size: 12px; }
      .uxa-spacer { flex: 1; }

      .uxa-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 20px; color: var(--text-faint); gap: 6px; }
      .uxa-empty-state h3 { color: var(--text); margin: 6px 0 0; }
      .uxa-empty-project-list { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; justify-content: center; }

      /* Modals / drawer */
      .uxa-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 60; }
      .uxa-modal-overlay.top { align-items: flex-start; padding-top: 90px; }
      .uxa-modal { background: var(--surface); border-radius: var(--radius); padding: 20px; width: 380px; box-shadow: var(--shadow); }
      .uxa-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
      .uxa-modal-head button { border: none; background: transparent; color: var(--text-faint); }
      .uxa-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }

      .uxa-drawer-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.4); display: flex; justify-content: flex-end; z-index: 60; }
      .uxa-drawer { width: 440px; max-width: 92vw; background: var(--surface); height: 100%; display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(0,0,0,0.12); animation: uxa-slide 0.2s ease; }
      @keyframes uxa-slide { from { transform: translateX(20px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
      .uxa-drawer-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 1px solid var(--border); }
      .uxa-drawer-head h3 { margin: 2px 0 0; font-size: 15px; }
      .uxa-drawer-id { color: var(--text-faint); }
      .uxa-drawer-head button { border: none; background: transparent; color: var(--text-faint); }
      .uxa-drawer-body { padding: 18px 20px; overflow-y: auto; flex: 1; }
      .uxa-drawer-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border); }
      .uxa-sev-select-row { display: flex; gap: 8px; }
      .uxa-sev-select-row select { flex: 1; }

      /* Command palette */
      .uxa-command { width: 560px; max-width: 90vw; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
      .uxa-command-input { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border); color: var(--text-faint); }
      .uxa-command-input input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; color: var(--text); }
      .uxa-command-results { max-height: 400px; overflow-y: auto; padding: 8px; }
      .uxa-command-group { margin-bottom: 6px; }
      .uxa-command-group > span { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); padding: 6px 10px 2px; }
      .uxa-command-group button { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: none; background: transparent; border-radius: 8px; font-size: 13px; text-align: left; }
      .uxa-command-group button:hover { background: var(--primary-soft); color: var(--primary); }
      .uxa-command-sub { margin-left: auto; font-size: 11px; color: var(--text-faint); }

      /* AI assistant fab */
      .uxa-fab { position: fixed; bottom: 24px; right: 24px; width: 50px; height: 50px; border-radius: 50%; border: none; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(59,91,219,0.4); z-index: 55; }
      .uxa-ai-panel { position: fixed; bottom: 86px; right: 24px; width: 320px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px; z-index: 55; }
      .uxa-ai-head { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 13px; margin-bottom: 10px; }
      .uxa-ai-head span { display: flex; align-items: center; gap: 6px; }
      .uxa-ai-head button { border: none; background: transparent; color: var(--text-faint); }
      .uxa-ai-modes { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
      .uxa-ai-modes button { font-size: 11px; padding: 5px 9px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg); color: var(--text-muted); }
      .uxa-ai-modes button.active { background: var(--primary); border-color: var(--primary); color: white; }
      .uxa-ai-panel textarea { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; background: var(--bg); margin-bottom: 8px; outline: none; resize: vertical; }
      .uxa-ai-output { margin-top: 10px; padding: 10px; background: var(--primary-soft); border-radius: var(--radius-sm); font-size: 12.5px; color: var(--text); white-space: pre-wrap; max-height: 200px; overflow-y: auto; }

      .uxa-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--text); color: var(--bg); padding: 9px 16px; border-radius: 999px; font-size: 12.5px; display: flex; align-items: center; gap: 6px; z-index: 80; box-shadow: var(--shadow); }

      /* Auth */
      .uxa-auth-loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--primary); }
      .uxa-login-wrap { display: flex; align-items: center; justify-content: center; height: 100vh; }
      .uxa-login-card { width: 340px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 28px 26px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
      .uxa-brand-mark.lg { width: 42px; height: 42px; border-radius: 12px; margin-bottom: 6px; }
      .uxa-login-card h2 { font-size: 17px; margin: 4px 0 0; }
      .uxa-login-card p { font-size: 12px; color: var(--text-muted); margin: 0 0 18px; }
      .uxa-login-card .uxa-form-field { width: 100%; text-align: left; }
      .uxa-password-row { display: flex; align-items: center; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); }
      .uxa-password-row input { border: none; background: transparent; flex: 1; }
      .uxa-password-row button { border: none; background: transparent; color: var(--text-faint); padding: 0 10px; }
      .uxa-login-error { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #DC2626; background: #FEE2E2; border-radius: var(--radius-sm); padding: 8px 10px; margin-bottom: 12px; width: 100%; }
      .uxa-login-card .uxa-btn.full { margin-top: 4px; }
      .uxa-user-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--bg); border: 1px solid var(--border); font-size: 12px; font-weight: 600; }
      .uxa-user-avatar { width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
      .uxa-user-row span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .uxa-user-row button { border: none; background: transparent; color: var(--text-faint); display: flex; }
      .uxa-user-row button:hover { color: #DC2626; }

      /* Export Center */
      .uxa-export-modal { width: 980px; max-width: 94vw; max-height: 88vh; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; }
      .uxa-export-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid var(--border); }
      .uxa-export-head h2 { margin: 0; font-size: 17px; }
      .uxa-export-head p { margin: 3px 0 0; font-size: 12px; color: var(--text-muted); }
      .uxa-export-head button { border: none; background: transparent; color: var(--text-faint); }
      .uxa-export-body { display: grid; grid-template-columns: 1fr 260px; gap: 0; overflow: hidden; flex: 1; min-height: 0; }
      .uxa-export-main { overflow-y: auto; padding: 18px 24px; border-right: 1px solid var(--border); }
      .uxa-export-preview { padding: 18px; overflow-y: auto; background: var(--bg); }
      .uxa-export-section { margin-bottom: 22px; }
      .uxa-export-section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
      .uxa-export-section-head h4 { margin: 0; font-size: 12.5px; font-weight: 700; }
      .uxa-export-section-head span { font-size: 11px; color: var(--primary); font-weight: 600; }

      .uxa-format-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .uxa-format-card { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); text-align: left; }
      .uxa-format-card strong { font-size: 12.5px; margin-top: 4px; }
      .uxa-format-card span { font-size: 10.5px; color: var(--text-muted); }
      .uxa-format-card em { font-size: 9.5px; font-style: normal; color: var(--text-faint); background: var(--surface); border-radius: 4px; padding: 1px 5px; margin-top: 2px; }
      .uxa-format-card.active { border-color: var(--primary); background: var(--primary-soft); }
      .uxa-format-check { position: absolute; top: 10px; right: 10px; color: var(--primary); }

      .uxa-scope-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
      .uxa-picker-list { max-height: 140px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; background: var(--bg); }

      .uxa-include-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 14px; }
      .uxa-filter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .uxa-filter-grid select, .uxa-filter-grid input { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 7px 9px; background: var(--bg); font-size: 12px; width: 100%; }
      .uxa-date-range { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px 8px; background: var(--bg); color: var(--text-faint); }
      .uxa-date-range input { border: none; background: transparent; padding: 4px; width: auto; flex: 1; }

      .uxa-template-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .uxa-template-card { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); text-align: left; }
      .uxa-template-card strong { font-size: 12px; }
      .uxa-template-card span { font-size: 10.5px; color: var(--text-muted); }
      .uxa-template-card.active { border-color: var(--primary); background: var(--primary-soft); }
      .uxa-template-swatch { width: 100%; height: 6px; border-radius: 4px; }

      .uxa-branding-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 14px; }
      .uxa-branding-grid .uxa-form-field { margin-bottom: 0; }
      .uxa-upload-zone.small { display: inline-flex; width: auto; padding: 8px 10px; font-size: 11.5px; gap: 6px; cursor: pointer; }

      .uxa-preview-label { display: flex; align-items: center; gap: 5px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); margin-bottom: 10px; }
      .uxa-preview-meta { display: flex; gap: 6px; justify-content: center; font-size: 10.5px; color: var(--text-muted); margin-top: 10px; }
      .uxa-cover-mock { position: relative; background: linear-gradient(160deg, var(--tcolor) 0%, #0F172A 100%); color: white; border-radius: var(--radius-sm); padding: 20px 16px; overflow: hidden; min-height: 260px; display: flex; flex-direction: column; box-shadow: var(--shadow); }
      .uxa-cover-watermark { position: absolute; top: 40%; left: 6%; font-size: 26px; font-weight: 800; color: rgba(255,255,255,0.12); transform: rotate(-25deg); }
      .uxa-cover-bar { width: 34px; height: 4px; background: rgba(255,255,255,0.6); border-radius: 4px; margin-bottom: 12px; }
      .uxa-cover-logos { display: flex; gap: 8px; margin-bottom: 8px; }
      .uxa-cover-logos img { height: 20px; max-width: 60px; object-fit: contain; background: white; border-radius: 4px; padding: 2px; }
      .uxa-cover-tag { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.75; margin-bottom: 6px; }
      .uxa-cover-mock h2 { font-size: 17px; margin: 0 0 4px; }
      .uxa-cover-mock p { font-size: 11px; opacity: 0.85; margin: 0; }
      .uxa-cover-stats { display: flex; gap: 8px; margin-top: auto; padding-top: 16px; }
      .uxa-cover-stats div { flex: 1; text-align: center; background: rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 4px; }
      .uxa-cover-stats strong { display: block; font-size: 15px; }
      .uxa-cover-stats span { font-size: 8.5px; opacity: 0.8; }
      .uxa-cover-foot { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.7; margin-top: 10px; }

      .uxa-export-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid var(--border); }

      .uxa-export-progress { padding: 60px 40px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
      .uxa-export-progress h3 { margin: 6px 0 0; }
      .uxa-export-progress p { margin: 0; font-weight: 700; color: var(--primary); }
      .uxa-progress-track.big { width: 320px; height: 8px; margin-top: 6px; }
      .uxa-export-progress ul { list-style: none; padding: 0; margin: 20px 0 0; text-align: left; width: 280px; }
      .uxa-export-progress li { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-faint); padding: 5px 0; }
      .uxa-export-progress li.done { color: var(--text); }
      .uxa-export-progress li.done svg { color: var(--accent); }

      .uxa-export-complete { padding: 40px; display: flex; flex-direction: column; align-items: center; text-align: center; }
      .uxa-complete-icon { width: 54px; height: 54px; border-radius: 50%; background: #DCFCE7; color: #15803D; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
      .uxa-export-complete h3 { margin: 4px 0; }
      .uxa-export-complete > p { margin: 0 0 20px; color: var(--text-muted); font-size: 12.5px; }
      .uxa-result-list { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
      .uxa-result-row { display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; background: var(--bg); text-align: left; }
      .uxa-result-info { display: flex; flex-direction: column; }
      .uxa-result-info strong { font-size: 12.5px; }
      .uxa-result-info span { font-size: 10.5px; color: var(--text-faint); }
      .uxa-result-actions { display: flex; gap: 6px; }
      .uxa-complete-actions { display: flex; gap: 8px; }

      @media (max-width: 900px) {
        .uxa-sidebar { display: none; }
        .uxa-workspace, .uxa-screenpane, .uxa-dash-grid, .uxa-dash-grid2, .uxa-screen-meta-grid { grid-template-columns: 1fr !important; }
        .uxa-panel.span2 { grid-column: span 1; }
        .uxa-export-body { grid-template-columns: 1fr; }
        .uxa-export-preview { border-top: 1px solid var(--border); }
        .uxa-format-grid, .uxa-include-grid, .uxa-filter-grid, .uxa-template-grid, .uxa-branding-grid { grid-template-columns: 1fr 1fr; }
      }
    `}</style>
  );
}
