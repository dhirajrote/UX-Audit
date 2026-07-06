// /api/_seedData.js
// Builds the starter app_state given to every newly REGISTERED account (not
// the admin account, which keeps whatever it already has under id 'admin').
// Kept as plain data here (no React/JSX) since serverless functions run in
// plain Node, separate from the src/App.jsx bundle.

import crypto from "node:crypto";

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
}

export const DEFAULT_SCREEN_TYPES = [
  { id: "screen", name: "Screen", minutes: 60, status: "active" },
  { id: "popup", name: "Popup", minutes: 30, status: "active" },
  { id: "slideout", name: "Slide Out", minutes: 30, status: "active" },
  { id: "bottomsheet", name: "Bottom Sheet", minutes: 30, status: "active" },
  { id: "wizard", name: "Wizard", minutes: 45, status: "active" },
  { id: "modal", name: "Modal", minutes: 20, status: "active" },
  { id: "drawer", name: "Drawer", minutes: 30, status: "active" },
];

export const DEFAULT_AREAS = [
  "Navigation", "Information Architecture", "Visual Hierarchy", "Accessibility",
  "Forms", "Buttons", "Inputs", "Icons", "Typography", "Spacing", "Consistency",
  "Color", "Interaction", "Feedback", "Layout", "Performance", "Content",
  "Search", "Filters", "Tables", "Cards", "Charts", "Error Handling",
  "Notifications", "Loading State", "Empty State", "Micro Interactions",
  "Onboarding", "Responsive", "Others",
];

export const DEFAULT_SEVERITIES = [
  { id: "critical", label: "Critical", color: "#DC2626", priority: 1, icon: "🔴" },
  { id: "high", label: "High", color: "#EA580C", priority: 2, icon: "🟠" },
  { id: "medium", label: "Medium", color: "#D97706", priority: 3, icon: "🟡" },
  { id: "low", label: "Low", color: "#16A34A", priority: 4, icon: "🟢" },
];

function mkIssue(auditType, n, area, summary, severity, recommendation, aiPrompt, status) {
  return {
    id: `${auditType}-${String(n).padStart(3, "0")}`,
    auditType, area, summary, severity, recommendation, aiPrompt, status,
    createdAt: Date.now(),
  };
}

function mkScreen(name, type, auditTypes, issues) {
  return {
    id: uid("scr"),
    name, type, auditTypes,
    auditDate: new Date().toISOString().slice(0, 10),
    status: issues.length ? "In Progress" : "Not Started",
    issues,
  };
}

export function buildSampleProjects() {
  const project1 = {
    id: uid("proj"),
    name: "Sample Project — E-Commerce Checkout",
    client: "Demo Client",
    status: "In Progress",
    updatedAt: Date.now(),
    modules: [
      {
        id: uid("mod"),
        name: "Checkout Flow",
        screens: [
          mkScreen("Cart", "screen", ["UX", "UI"], [
            mkIssue("UX", 1, "Forms", "Quantity stepper has no minimum-value guard, letting the count go to zero without removing the item.", "medium", "Disable the decrement button at quantity 1, or prompt to remove the item instead.", "Redesign a cart line-item row with a quantity stepper that disables the minus button at 1 and shows a clear 'Remove' link instead. Clean e-commerce UI, modern blue accent, 12px rounded corners.", "Open"),
          ]),
          mkScreen("Payment", "screen", ["UX", "UI"], [
            mkIssue("UI", 1, "Buttons", "The 'Place order' button and 'Apply coupon' button use the same visual weight, creating hesitation at checkout.", "high", "Make 'Place order' the single dominant solid-fill CTA; demote 'Apply coupon' to a text link.", "", "Open"),
          ]),
        ],
      },
    ],
  };

  const project2 = {
    id: uid("proj"),
    name: "Sample Project — Mobile Onboarding",
    client: "Demo Client",
    status: "Draft",
    updatedAt: Date.now(),
    modules: [
      {
        id: uid("mod"),
        name: "Onboarding",
        screens: [
          mkScreen("Welcome", "screen", ["UX", "UI"], []),
          mkScreen("Permissions", "popup", ["UX"], [
            mkIssue("UX", 2, "Onboarding", "Location and notification permissions are both requested on first launch, before the user has seen any value from the app.", "high", "Delay permission prompts until the specific moment they're needed (e.g. ask for location only when the user opens the store locator).", "", "Open"),
          ]),
        ],
      },
    ],
  };

  return [project1, project2];
}

export function buildInitialState() {
  return {
    projects: buildSampleProjects(),
    screenTypes: DEFAULT_SCREEN_TYPES,
    areas: DEFAULT_AREAS,
    severities: DEFAULT_SEVERITIES,
    theme: "dark",
  };
}
