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
  CalendarRange, UserCircle2, Image as ImageIcon, ArrowLeft, Info, LogOut, Lock, Eye, EyeOff, Upload, FileUp, ListChecks, Users2, KeyRound, ShieldAlert, Bell, CreditCard, Package, TrendingDown, Gem, PauseCircle, PlayCircle, ReceiptText, Gift,
  LayoutTemplate, Star, Copy, Archive, History, Gauge, Tag, FileJson, ChevronUp, Layers3, Contact2
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts";
import * as XLSX from "xlsx";
import Papa from "papaparse";

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

/* ---- Audit Templates: checklist item helper + built-in template library ---- */
const TEMPLATE_CATEGORIES = ["UX", "UI", "Accessibility", "Mobile", "Web", "SaaS", "Ecommerce", "Healthcare", "Banking", "Dashboard", "AI Products"];
const GATED_FEATURES = [
  { id: "audit_templates", label: "Audit Templates", description: "Checklist library, custom template builder, and AI-scored audit runs." },
];

const SCORING_MODELS = [
  { id: "percentage", label: "Percentage" },
  { id: "five_star", label: "5-Star" },
  { id: "numeric", label: "Numeric" },
  { id: "weighted", label: "Weighted" },
  { id: "pass_fail", label: "Pass/Fail" },
  { id: "maturity", label: "Maturity Score" },
  { id: "ux_health", label: "UX Health Score" },
  { id: "overall_experience", label: "Overall Experience Score" },
];

function ci(title, description, category, area, severity, weightage, opts = {}) {
  return {
    id: uid("chk"), title, description, category, area, severity, weightage,
    required: opts.required !== false,
    expectedResult: opts.expectedResult || "",
    examples: opts.examples || "",
    bestPractice: opts.bestPractice || "",
    referenceLink: opts.referenceLink || "",
    aiPrompt: opts.aiPrompt || `Evaluate "${title}" for this screen. Explain what a failure looks like and suggest a concrete fix.`,
    evaluationType: opts.evaluationType || "pass_fail",
  };
}

function tpl(fields) {
  return {
    id: uid("tpl"), version: 1, status: "published", isBuiltIn: true,
    createdBy: "System", createdAt: Date.now(), updatedAt: Date.now(),
    usageCount: 0, favorite: false, references: [], aiRecommendationsEnabled: true,
    versionHistory: [],
    ...fields,
    estimatedMinutes: fields.checklist.length * 8,
  };
}

function buildDefaultTemplates() {
  return [
    tpl({
      name: "Heuristic Evaluation", category: "UX", industry: ["SaaS", "Web", "Dashboard"], difficulty: "Intermediate",
      scoringModel: "weighted",
      description: "Evaluate usability against Nielsen's 10 usability heuristics.",
      purpose: "Surface systemic usability problems by checking the interface against widely-accepted heuristics rather than personal opinion.",
      checklist: [
        ci("Visibility of system status", "The system keeps users informed about what's happening through timely, appropriate feedback.", "Feedback", "Notifications", "medium", 6, { bestPractice: "Show loading states, progress indicators, and confirmation messages for every action." }),
        ci("Match between system and the real world", "The system speaks the users' language with familiar words, phrases, and concepts.", "Content", "Content", "medium", 5, { bestPractice: "Follow real-world conventions so information appears in a natural, logical order." }),
        ci("User control and freedom", "Users can easily undo/redo and exit unwanted states via a clearly marked 'emergency exit'.", "Interaction", "Navigation", "high", 6, { bestPractice: "Support undo, cancel, and back navigation at every step of a flow." }),
        ci("Consistency and standards", "Words, situations, and actions mean the same thing throughout the product and follow platform conventions.", "Consistency", "Consistency", "medium", 5, { bestPractice: "Reuse the same component and terminology for the same concept everywhere." }),
        ci("Error prevention", "Careful design prevents problems before they occur, or checks for them and offers a confirmation.", "Error Handling", "Forms", "high", 7, { bestPractice: "Use constraints, confirmations, and inline validation to prevent errors before submit." }),
        ci("Recognition rather than recall", "Minimize memory load by making objects, actions, and options visible.", "Content", "Navigation", "medium", 5, { bestPractice: "Surface options and instructions rather than requiring users to remember them." }),
        ci("Flexibility and efficiency of use", "Accelerators for experts (shortcuts, saved views) coexist with a simple path for novices.", "Interaction", "Micro Interactions", "low", 3, { bestPractice: "Offer shortcuts, bulk actions, or customization for repeat users without cluttering the default view." }),
        ci("Aesthetic and minimalist design", "Interfaces don't contain irrelevant or rarely-needed information that competes with what matters.", "Visual Hierarchy", "Layout", "medium", 4, { bestPractice: "Remove or de-emphasize elements that don't support the primary task on this screen." }),
        ci("Help users recognize, diagnose, and recover from errors", "Error messages are expressed in plain language, precisely indicate the problem, and suggest a solution.", "Error Handling", "Error Handling", "high", 6, { bestPractice: "Write error messages that explain what went wrong and exactly how to fix it." }),
        ci("Help and documentation", "Any necessary help is easy to search, focused on the user's task, and lists concrete steps.", "Content", "Onboarding", "low", 3, { bestPractice: "Provide contextual help near the point of confusion rather than a single long manual." }),
      ],
    }),

    tpl({
      name: "Cognitive Walkthrough", category: "UX", industry: ["SaaS", "Web"], difficulty: "Intermediate",
      scoringModel: "pass_fail",
      description: "Evaluate how well a first-time user can complete a task step by step.",
      purpose: "Walk through a task as a new user would, checking at each step whether the right action is obvious and achievable.",
      checklist: [
        ci("Is the next action obvious?", "A first-time user can identify what to do next without guidance.", "Navigation", "Navigation", "high", 7, { evaluationType: "both" }),
        ci("Is the goal clear at this step?", "The user understands what they're trying to accomplish before acting.", "Content", "Onboarding", "high", 6, { evaluationType: "both" }),
        ci("Is feedback immediate after the action?", "The interface confirms the action was registered right away.", "Feedback", "Notifications", "medium", 5, { evaluationType: "both" }),
        ci("Can users recover from a wrong turn?", "A user who takes an unintended path can get back on track easily.", "Interaction", "Navigation", "high", 6, { evaluationType: "both" }),
        ci("Are labels understandable to a newcomer?", "Button and field labels use plain, task-oriented language, not internal jargon.", "Content", "Buttons", "medium", 5, { evaluationType: "both" }),
        ci("Are the correct actions discoverable?", "The control needed for this step is visible without hunting through menus.", "Visual Hierarchy", "Buttons", "high", 6, { evaluationType: "both" }),
      ],
    }),

    tpl({
      name: "Task Flow Audit", category: "UX", industry: ["SaaS", "Web", "Ecommerce"], difficulty: "Intermediate",
      scoringModel: "numeric",
      description: "Evaluate an end-to-end user journey for friction, dead ends, and unnecessary steps.",
      purpose: "Map a real user journey and quantify where it creates friction so the flow can be simplified.",
      checklist: [
        ci("Number of steps is minimized", "The flow doesn't ask for more steps than the task genuinely requires.", "Layout", "Navigation", "medium", 6, { evaluationType: "numeric" }),
        ci("No unnecessary friction points", "Each step adds clear value; there's no busywork or redundant confirmation.", "Interaction", "Interaction", "high", 7, { evaluationType: "numeric" }),
        ci("No dead ends", "Every screen offers a way forward, back, or out — none leave the user stuck.", "Navigation", "Navigation", "critical", 8, { evaluationType: "numeric" }),
        ci("No decision overload", "Users aren't asked to make too many choices at once at any single step.", "Layout", "Forms", "medium", 5, { evaluationType: "numeric" }),
        ci("No redundant screens", "No screen simply repeats information already shown without adding value.", "Content", "Layout", "low", 4, { evaluationType: "numeric" }),
        ci("Completion rate is healthy", "Most users who start the flow are able to finish it.", "Feedback", "Empty State", "high", 7, { evaluationType: "numeric" }),
        ci("Navigation is efficient", "Users can move forward and backward through the flow without confusion.", "Navigation", "Navigation", "medium", 5, { evaluationType: "numeric" }),
      ],
    }),

    tpl({
      name: "Accessibility Audit (WCAG)", category: "Accessibility", industry: ["Web", "Healthcare", "Banking", "SaaS"], difficulty: "Advanced",
      scoringModel: "percentage",
      description: "Evaluate conformance with WCAG's four principles: Perceivable, Operable, Understandable, Robust.",
      purpose: "Identify accessibility barriers so the product is usable by people with a wide range of abilities, and reduce legal/compliance risk.",
      checklist: [
        ci("Color contrast meets minimum ratios", "Text and meaningful graphics have sufficient contrast against their background.", "Color", "Accessibility", "high", 7, { referenceLink: "WCAG 1.4.3 Contrast (Minimum)", bestPractice: "Body text should meet at least 4.5:1 contrast; large text at least 3:1." }),
        ci("Text can be resized without loss of content", "Users can zoom or increase text size up to 200% without breaking layout or losing information.", "Typography", "Accessibility", "medium", 5, { referenceLink: "WCAG 1.4.4 Resize Text" }),
        ci("Images have appropriate alt text", "Meaningful images have descriptive alt text; decorative images are marked as such.", "Content", "Accessibility", "high", 6, { referenceLink: "WCAG 1.1.1 Non-text Content" }),
        ci("All functionality is keyboard-operable", "Every interactive element can be reached and used with a keyboard alone.", "Interaction", "Accessibility", "critical", 8, { referenceLink: "WCAG 2.1.1 Keyboard" }),
        ci("Focus states are clearly visible", "A visible focus indicator shows which element currently has keyboard focus.", "Interaction", "Accessibility", "high", 6, { referenceLink: "WCAG 2.4.7 Focus Visible" }),
        ci("Touch targets are large enough", "Interactive elements are large enough and spaced apart to tap accurately.", "Buttons", "Accessibility", "medium", 5, { referenceLink: "WCAG 2.5.8 Target Size (Minimum)" }),
        ci("Error messages are understandable", "Errors are described in text (not color alone) and suggest how to fix them.", "Error Handling", "Accessibility", "high", 6, { referenceLink: "WCAG 3.3.1 Error Identification" }),
        ci("Labels are programmatically associated", "Form fields have properly associated, descriptive labels.", "Forms", "Accessibility", "high", 6, { referenceLink: "WCAG 3.3.2 Labels or Instructions" }),
        ci("Screen readers can navigate the content", "Content is announced in a logical order with correct roles and states.", "Content", "Accessibility", "critical", 7, { referenceLink: "WCAG 4.1.2 Name, Role, Value" }),
        ci("Semantic HTML is used correctly", "Headings, lists, landmarks, and buttons use appropriate native/semantic markup.", "Consistency", "Accessibility", "medium", 5, { referenceLink: "WCAG 1.3.1 Info and Relationships" }),
      ],
    }),

    tpl({
      name: "Visual Design Audit", category: "UI", industry: ["Web", "SaaS", "Ecommerce"], difficulty: "Beginner",
      scoringModel: "five_star",
      description: "Evaluate the visual quality, consistency, and polish of the interface.",
      purpose: "Catch inconsistencies and rough edges in typography, color, spacing, and hierarchy before they reach users.",
      checklist: [
        ci("Typography is consistent and legible", "Font sizes, weights, and line-height form a clear, readable type scale.", "Typography", "Typography", "medium", 5, { evaluationType: "rating" }),
        ci("Color palette is applied consistently", "Colors are used purposefully and match the defined palette.", "Color", "Color", "medium", 5, { evaluationType: "rating" }),
        ci("Spacing follows a consistent scale", "Padding and margins follow a defined spacing system rather than arbitrary values.", "Spacing", "Spacing", "medium", 5, { evaluationType: "rating" }),
        ci("Elements align to a grid", "Components line up cleanly along consistent grid lines.", "Layout", "Layout", "low", 4, { evaluationType: "rating" }),
        ci("Icons are visually consistent", "Icons share a consistent style, weight, and size.", "Icons", "Icons", "low", 3, { evaluationType: "rating" }),
        ci("Visual hierarchy guides the eye correctly", "Size, weight, and color draw attention to what matters most first.", "Visual Hierarchy", "Visual Hierarchy", "high", 6, { evaluationType: "rating" }),
        ci("White space is used effectively", "Whitespace groups related content and gives the layout room to breathe.", "Spacing", "Layout", "low", 4, { evaluationType: "rating" }),
        ci("Branding is applied consistently", "Logo, color, and tone are consistent with brand guidelines.", "Consistency", "Consistency", "medium", 4, { evaluationType: "rating" }),
        ci("Components look and behave consistently", "The same component looks and behaves the same everywhere it appears.", "Consistency", "Cards", "medium", 5, { evaluationType: "rating" }),
        ci("Shadows are used purposefully", "Shadows communicate elevation consistently rather than being decorative noise.", "Layout", "Cards", "low", 3, { evaluationType: "rating" }),
        ci("Elevation communicates layering clearly", "Overlapping surfaces (modals, dropdowns, cards) have a clear, consistent elevation order.", "Layout", "Cards", "low", 3, { evaluationType: "rating" }),
        ci("Borders are used consistently", "Border weight, radius, and color are consistent across similar components.", "Consistency", "Cards", "low", 3, { evaluationType: "rating" }),
      ],
    }),

    tpl({
      name: "Design System Compliance Audit", category: "UI", industry: ["SaaS", "Web"], difficulty: "Intermediate",
      scoringModel: "weighted",
      description: "Evaluate how closely the interface follows the established design system.",
      purpose: "Catch drift between the design system and shipped UI before it compounds into inconsistency.",
      checklist: [
        ci("Buttons use system components", "Buttons use the design system's variants rather than one-off styles.", "Buttons", "Consistency", "medium", 6),
        ci("Inputs use system components", "Form inputs match the design system's states (default, focus, error, disabled).", "Inputs", "Forms", "medium", 6),
        ci("Cards use system components", "Card layouts, padding, and elevation match the system's card component.", "Cards", "Consistency", "low", 4),
        ci("Dialogs/modals use system components", "Modals follow the system's structure for header, body, and actions.", "Cards", "Consistency", "medium", 5),
        ci("Colors use design tokens", "Colors are pulled from tokens rather than hard-coded hex values.", "Color", "Consistency", "high", 7),
        ci("Spacing and sizing use tokens", "Spacing values map to the system's spacing scale/tokens.", "Spacing", "Consistency", "medium", 6),
        ci("Components match the library, not custom variants", "No unofficial one-off variants of existing system components exist.", "Consistency", "Consistency", "high", 7),
        ci("Icons come from the shared icon set", "Icons are pulled from the system's icon library, not mixed sources.", "Icons", "Icons", "low", 3),
        ci("Layout follows system grid/containers", "Page layout uses the system's grid and container conventions.", "Layout", "Layout", "medium", 5),
        ci("Typography uses system type styles", "Text uses defined type styles rather than ad hoc font sizes/weights.", "Typography", "Typography", "medium", 5),
      ],
    }),

    tpl({
      name: "Mobile UX Audit", category: "Mobile", industry: ["Mobile", "Ecommerce", "SaaS"], difficulty: "Intermediate",
      scoringModel: "percentage",
      description: "Evaluate the mobile-specific usability of an app or responsive site.",
      purpose: "Check that the experience works naturally with touch, one-handed use, and mobile constraints.",
      checklist: [
        ci("Primary actions are within thumb reach", "Key actions sit in the easy-to-reach zone for one-handed phone use.", "Layout", "Buttons", "medium", 6),
        ci("Gestures are supported where expected", "Common gestures (swipe, pull-to-refresh) work where users expect them.", "Interaction", "Micro Interactions", "medium", 5),
        ci("Navigation is optimized for mobile", "Navigation collapses sensibly and doesn't require excessive scrolling or tapping.", "Navigation", "Navigation", "high", 6),
        ci("Touch targets are large enough", "Buttons and links are large enough to tap accurately without mis-taps.", "Buttons", "Accessibility", "high", 6),
        ci("Performance feels fast", "Screens and interactions respond without noticeable lag on typical devices.", "Performance", "Performance", "high", 7),
        ci("Loading states are handled gracefully", "Slow content shows a skeleton/spinner rather than a blank or frozen screen.", "Loading State", "Loading State", "medium", 5),
        ci("On-screen keyboard interactions work well", "The keyboard doesn't obscure the field being edited or break the layout.", "Forms", "Inputs", "medium", 5),
        ci("Mobile accessibility is supported", "VoiceOver/TalkBack and dynamic type work correctly.", "Accessibility", "Accessibility", "high", 6),
        ci("Orientation changes are handled", "Rotating the device doesn't break layout or lose user input.", "Responsive", "Layout", "low", 3),
        ci("Layout responds well across mobile screen sizes", "The UI adapts cleanly across small and large phone screens.", "Responsive", "Layout", "medium", 5),
      ],
    }),

    tpl({
      name: "Responsive Design Audit", category: "Web", industry: ["Web", "SaaS", "Ecommerce"], difficulty: "Intermediate",
      scoringModel: "percentage",
      description: "Evaluate how the layout adapts across desktop, tablet, and mobile, in both orientations.",
      purpose: "Confirm the interface holds up cleanly at every common breakpoint and orientation, not just the design file's canvas size.",
      checklist: [
        ci("Breakpoints transition cleanly", "Layout changes smoothly at each breakpoint without awkward in-between states.", "Responsive", "Layout", "medium", 6),
        ci("Typography scales appropriately", "Font sizes adjust sensibly across screen sizes for readability.", "Typography", "Responsive", "medium", 5),
        ci("Images scale and crop appropriately", "Images resize without distortion, pixelation, or overflow.", "Content", "Responsive", "medium", 5),
        ci("No unexpected layout shifts", "Content doesn't jump or reflow unexpectedly as it loads or resizes.", "Layout", "Performance", "high", 6),
        ci("No horizontal overflow", "Content never forces unwanted horizontal scrolling on any breakpoint.", "Layout", "Responsive", "high", 6),
        ci("Navigation adapts per breakpoint", "Navigation reorganizes appropriately (e.g. collapses to a menu) per screen size.", "Navigation", "Responsive", "medium", 5),
      ],
    }),

    tpl({
      name: "Forms Usability Audit", category: "UX", industry: ["SaaS", "Ecommerce", "Banking"], difficulty: "Beginner",
      scoringModel: "weighted",
      description: "Evaluate the usability of a form from labeling through confirmation.",
      purpose: "Reduce abandonment and errors by checking every stage of filling out and submitting a form.",
      checklist: [
        ci("Labels are clear and always visible", "Every field has a persistent, descriptive label (not placeholder-only).", "Forms", "Forms", "high", 6),
        ci("Validation is timely and specific", "Validation runs at a sensible time and explains exactly what to fix.", "Forms", "Error Handling", "high", 7),
        ci("Inline errors appear next to the field", "Errors are shown directly next to the relevant field, not just in a banner.", "Error Handling", "Forms", "high", 6),
        ci("Autocomplete is enabled where useful", "Fields like name, address, and email support browser autofill.", "Forms", "Inputs", "low", 3),
        ci("Required fields are clearly marked", "Required vs. optional fields are visually distinguished.", "Forms", "Forms", "medium", 5),
        ci("Keyboard use is fully supported", "The form can be completed and submitted using only the keyboard.", "Interaction", "Accessibility", "medium", 5),
        ci("Tab order is logical", "Tabbing through fields follows the visual reading order.", "Interaction", "Forms", "medium", 5),
        ci("Input masks match expected formats", "Fields like phone/date guide the expected format without being rigid.", "Inputs", "Forms", "low", 3),
        ci("Confirmation messages appear after submit", "Users get clear confirmation that their submission succeeded.", "Feedback", "Notifications", "medium", 5),
      ],
    }),

    tpl({
      name: "Dashboard Usability Audit", category: "Dashboard", industry: ["Dashboard", "SaaS", "Banking"], difficulty: "Intermediate",
      scoringModel: "weighted",
      description: "Evaluate how well a data dashboard communicates information and supports decisions.",
      purpose: "Check that the most important information is easy to find, understand, and act on.",
      checklist: [
        ci("Information hierarchy highlights what matters", "The most important metrics are the most visually prominent.", "Visual Hierarchy", "Charts", "high", 7),
        ci("Charts are easy to read and appropriate to the data", "Chart types match the data being shown and aren't misleading.", "Charts", "Charts", "high", 6),
        ci("KPIs are clearly labeled with context", "Key metrics include labels, units, and comparison context (e.g. vs. last period).", "Content", "Charts", "high", 6),
        ci("Filters are easy to find and use", "Filtering the data is discoverable and doesn't require guesswork.", "Filters", "Filters", "medium", 5),
        ci("Search works where the dashboard has lists/tables", "Users can search or find relevant rows quickly.", "Search", "Search", "medium", 4),
        ci("Data tables are scannable", "Tables use alignment, spacing, and sorting to stay readable at scale.", "Tables", "Tables", "medium", 5),
        ci("Drill-down is available for detail", "Users can go from a summary view into the underlying detail.", "Interaction", "Charts", "medium", 5),
        ci("Empty states are handled gracefully", "Widgets with no data explain why and what to do next.", "Empty State", "Empty State", "low", 4),
        ci("Loading states avoid a jarring first paint", "Data widgets show skeletons/placeholders rather than popping in abruptly.", "Loading State", "Loading State", "low", 3),
      ],
    }),

    tpl({
      name: "E-commerce UX Audit", category: "Ecommerce", industry: ["Ecommerce"], difficulty: "Intermediate",
      scoringModel: "percentage",
      description: "Evaluate the full shopping journey from browsing to order confirmation.",
      purpose: "Identify friction anywhere along the path to purchase, where small issues have an outsized revenue impact.",
      checklist: [
        ci("Product listings are scannable and informative", "Listing pages show enough information to compare products at a glance.", "Cards", "Content", "medium", 5),
        ci("Filters help narrow results effectively", "Filters cover the attributes shoppers actually care about.", "Filters", "Filters", "medium", 5),
        ci("Search returns relevant results", "Product search handles typos and synonyms reasonably well.", "Search", "Search", "high", 6),
        ci("Product pages answer key purchase questions", "Product pages show price, availability, specs, and images clearly.", "Content", "Cards", "high", 7),
        ci("Reviews are visible and credible", "Customer reviews are easy to find and appear genuine.", "Content", "Content", "low", 3),
        ci("Wishlist/save-for-later works smoothly", "Users can save an item and find it again easily.", "Interaction", "Cards", "low", 3),
        ci("Cart is easy to review and edit", "Users can change quantity or remove items without confusion.", "Interaction", "Forms", "high", 6),
        ci("Checkout has minimal unnecessary steps", "Checkout doesn't ask for more than needed to complete the purchase.", "Layout", "Forms", "critical", 8),
        ci("Payment options are clear and trustworthy", "Payment methods and security cues are clear and reassuring.", "Forms", "Feedback", "high", 7),
        ci("Order confirmation is clear and complete", "Confirmation shows order details and next steps (shipping, receipt).", "Feedback", "Notifications", "medium", 5),
      ],
    }),

    tpl({
      name: "SaaS Product Audit", category: "SaaS", industry: ["SaaS"], difficulty: "Advanced",
      scoringModel: "overall_experience",
      description: "Evaluate the core product experience of a SaaS application end to end.",
      purpose: "Check the moments that most affect activation and retention: onboarding, navigation, and day-to-day usability.",
      checklist: [
        ci("Onboarding gets users to value quickly", "New users reach a meaningful first success without unnecessary setup.", "Onboarding", "Onboarding", "critical", 8),
        ci("Navigation reflects the product's mental model", "Primary navigation matches how users think about the product, not the org chart.", "Navigation", "Navigation", "high", 7),
        ci("Key features are discoverable", "Valuable features aren't hidden behind menus users never open.", "Navigation", "Micro Interactions", "high", 6),
        ci("Pricing/plan information is clear in-app", "Users can see what plan they're on and what upgrading unlocks.", "Content", "Content", "medium", 4),
        ci("Settings are organized logically", "Settings are grouped in a way users can predict.", "Layout", "Consistency", "medium", 5),
        ci("Notifications are useful, not noisy", "Notifications are relevant and don't overwhelm the user.", "Notifications", "Notifications", "medium", 5),
        ci("Permissions/roles are understandable", "Users understand what their role can and can't do.", "Content", "Forms", "medium", 5),
        ci("Dashboards surface what matters to the user's goal", "The default dashboard view is relevant to the user's role.", "Dashboard", "Charts", "high", 6),
        ci("Product tours are helpful, not intrusive", "In-product guidance helps without blocking the user's own exploration.", "Onboarding", "Onboarding", "low", 3),
        ci("Help center is easy to reach and useful", "Users can find help without leaving their task entirely.", "Content", "Onboarding", "low", 3),
      ],
    }),

    tpl({
      name: "AI Product UX Audit", category: "AI Products", industry: ["AI Products", "SaaS"], difficulty: "Advanced",
      scoringModel: "ux_health",
      description: "Evaluate the UX of an AI-powered feature or product, including trust and explainability.",
      purpose: "AI interfaces introduce unique UX risks (uncertainty, hallucination, trust) that classic heuristics don't fully cover.",
      checklist: [
        ci("Prompt/input interface is clear", "Users understand what kind of input the AI expects and how to phrase it.", "Forms", "Content", "high", 6),
        ci("Response quality is consistently useful", "AI output is relevant and useful for the stated task most of the time.", "Content", "Feedback", "critical", 8),
        ci("Confidence is communicated appropriately", "The interface signals when the AI is uncertain rather than presenting everything with false confidence.", "Feedback", "Content", "high", 7),
        ci("Loading/generation state is clear", "Users understand the system is working and roughly how long it may take.", "Loading State", "Loading State", "medium", 5),
        ci("Responses are explainable", "Users can understand roughly why the AI produced this output.", "Content", "Content", "high", 6),
        ci("Regeneration/retry is easy", "Users can easily ask for another attempt if the first response isn't right.", "Interaction", "Micro Interactions", "medium", 5),
        ci("Conversation/session history is preserved sensibly", "Prior context is retained where it should be, and clearable where it shouldn't.", "Content", "Content", "medium", 5),
        ci("Privacy handling is clear", "Users understand what happens to the data/content they share with the AI.", "Content", "Content", "high", 7),
        ci("Feedback mechanism exists (thumbs up/down etc.)", "Users have a lightweight way to signal whether a response was good.", "Interaction", "Feedback", "medium", 4),
        ci("Hallucination risk is mitigated in the UI", "The interface encourages verification rather than blind trust for high-stakes output.", "Content", "Feedback", "critical", 8),
      ],
    }),

    tpl({
      name: "Healthcare UX Audit", category: "Healthcare", industry: ["Healthcare"], difficulty: "Advanced",
      scoringModel: "ux_health",
      description: "Evaluate a clinical or patient-facing product for safety, clarity, and accessibility.",
      purpose: "Healthcare interfaces carry real safety and compliance stakes — this audit weighs those risks explicitly.",
      checklist: [
        ci("Interface is accessible to patients with disabilities", "Meets baseline accessibility for a patient population with varied abilities.", "Accessibility", "Accessibility", "critical", 8),
        ci("Fits real clinical workflow", "The tool matches how clinicians actually work, not an idealized workflow.", "Interaction", "Navigation", "high", 7),
        ci("Design actively prevents patient-safety errors", "Look-alike drugs/values, unit mismatches, and similar risks are designed against.", "Error Handling", "Forms", "critical", 9),
        ci("Errors are prevented, not just caught", "Constraints and confirmations stop dangerous input before submission.", "Error Handling", "Forms", "critical", 8),
        ci("Medical terminology is used correctly and consistently", "Clinical language is accurate and consistent throughout.", "Content", "Content", "high", 6),
        ci("HIPAA-relevant data handling is visibly respected", "The UI reflects appropriate handling of protected health information.", "Content", "Content", "high", 7),
        ci("Critical alerts are impossible to miss", "Urgent alerts stand out clearly from routine notifications.", "Notifications", "Notifications", "critical", 8),
        ci("Forms match clinical documentation needs", "Forms capture what's clinically required without unnecessary burden.", "Forms", "Forms", "medium", 5),
        ci("Patient records are easy to review accurately", "Records are laid out to minimize misreading critical values.", "Tables", "Content", "high", 7),
      ],
    }),

    tpl({
      name: "UX Writing Audit", category: "UX", industry: ["SaaS", "Web", "Ecommerce"], difficulty: "Beginner",
      scoringModel: "five_star",
      description: "Evaluate the clarity, tone, and consistency of the product's in-app copy.",
      purpose: "Good UX writing quietly prevents confusion — this audit checks whether the words are pulling their weight.",
      checklist: [
        ci("Labels are clear and action-oriented", "Button and field labels say exactly what will happen.", "Buttons", "Content", "medium", 5, { evaluationType: "rating" }),
        ci("Button copy describes the specific action", "Buttons avoid vague labels like 'Submit' or 'OK' where a specific verb would help.", "Buttons", "Content", "medium", 5, { evaluationType: "rating" }),
        ci("Headings are descriptive and scannable", "Headings let users understand a section without reading all the body copy.", "Content", "Typography", "medium", 4, { evaluationType: "rating" }),
        ci("Error messages are human and actionable", "Errors explain the problem and the fix in plain language.", "Error Handling", "Content", "high", 6, { evaluationType: "rating" }),
        ci("Success messages confirm what happened", "Success copy confirms specifically what just occurred.", "Feedback", "Content", "low", 3, { evaluationType: "rating" }),
        ci("Empty states guide the next action", "Empty states explain what's missing and what to do about it.", "Empty State", "Content", "medium", 4, { evaluationType: "rating" }),
        ci("Microcopy reduces hesitation at decision points", "Small helper text near risky actions clarifies consequences.", "Content", "Micro Interactions", "low", 3, { evaluationType: "rating" }),
        ci("Tone is consistent with the brand", "Copy tone doesn't swing between formal and casual unpredictably.", "Content", "Consistency", "low", 3, { evaluationType: "rating" }),
        ci("Terminology is consistent throughout", "The same concept is called the same thing everywhere in the product.", "Consistency", "Content", "medium", 5, { evaluationType: "rating" }),
      ],
    }),
  ];
}

const DEFAULT_TEMPLATES = buildDefaultTemplates();

/* ---- Audit Templates: scoring engine (all 8 models from the spec) ---- */
const SEVERITY_PENALTY = { critical: 25, high: 15, medium: 8, low: 3 };

function scoreForModel(model, items, results) {
  const evaluated = items.filter((it) => results[it.id] && results[it.id].status && results[it.id].status !== "na");
  const passItems = evaluated.filter((it) => results[it.id].status === "pass");
  const failItems = evaluated.filter((it) => results[it.id].status === "fail");
  const ratedItems = items.filter((it) => results[it.id] && typeof results[it.id].rating === "number");
  const numericItems = items.filter((it) => results[it.id] && typeof results[it.id].numericValue === "number");

  switch (model) {
    case "percentage": {
      const pct = evaluated.length ? Math.round((passItems.length / evaluated.length) * 100) : 0;
      return { value: pct, display: `${pct}%`, max: 100 };
    }
    case "five_star": {
      const avg = ratedItems.length ? ratedItems.reduce((s, it) => s + results[it.id].rating, 0) / ratedItems.length : 0;
      return { value: avg, display: `${avg.toFixed(1)} / 5`, max: 5 };
    }
    case "numeric": {
      const sum = numericItems.reduce((s, it) => s + results[it.id].numericValue, 0);
      return { value: sum, display: `${sum} / ${items.length * 10}`, max: items.length * 10 };
    }
    case "weighted": {
      const totalWeight = evaluated.reduce((s, it) => s + (it.weightage || 1), 0);
      const passWeight = passItems.reduce((s, it) => s + (it.weightage || 1), 0);
      const pct = totalWeight ? Math.round((passWeight / totalWeight) * 100) : 0;
      return { value: pct, display: `${pct}% (weighted)`, max: 100 };
    }
    case "pass_fail": {
      const requiredFails = failItems.filter((it) => it.required);
      const pass = requiredFails.length === 0 && evaluated.length > 0;
      return { value: pass ? 1 : 0, display: evaluated.length === 0 ? "Not evaluated" : (pass ? "Pass" : "Fail"), max: 1 };
    }
    case "maturity": {
      const pct = evaluated.length ? (passItems.length / evaluated.length) * 100 : 0;
      const level = pct >= 80 ? "Optimized" : pct >= 60 ? "Managed" : pct >= 40 ? "Defined" : pct >= 20 ? "Developing" : "Initial";
      return { value: pct, display: level, max: 100 };
    }
    case "ux_health": {
      const penalty = failItems.reduce((s, it) => s + (SEVERITY_PENALTY[results[it.id].severity || it.severity] || 5), 0);
      const health = Math.max(0, 100 - penalty);
      return { value: health, display: `${health} / 100`, max: 100 };
    }
    case "overall_experience": {
      const pct = evaluated.length ? (passItems.length / evaluated.length) * 100 : 0;
      const penalty = failItems.reduce((s, it) => s + (SEVERITY_PENALTY[results[it.id].severity || it.severity] || 5), 0);
      const health = Math.max(0, 100 - penalty);
      const starPct = ratedItems.length ? (ratedItems.reduce((s, it) => s + results[it.id].rating, 0) / ratedItems.length / 5) * 100 : pct;
      const composite = Math.round((pct + health + starPct) / 3);
      return { value: composite, display: `${composite} / 100`, max: 100 };
    }
    default:
      return { value: 0, display: "—", max: 100 };
  }
}

function computeAuditScores(templates, run) {
  const results = run.results || {};
  const allItems = templates.flatMap((t) => t.checklist.map((it) => ({ ...it, __templateId: t.id, __templateName: t.name })));
  const byTemplate = templates.map((t) => ({
    templateId: t.id, templateName: t.name, model: t.scoringModel,
    ...scoreForModel(t.scoringModel, t.checklist, results),
  }));
  const primaryModel = templates[0]?.scoringModel || "percentage";
  const overall = scoreForModel(primaryModel, allItems, results);
  const allModels = SCORING_MODELS.map((m) => ({ ...m, ...scoreForModel(m.id, allItems, results) }));
  const byCategory = {};
  allItems.forEach((it) => {
    const cat = it.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, pass: 0 };
    const r = results[it.id];
    if (r && r.status && r.status !== "na") {
      byCategory[cat].total++;
      if (r.status === "pass") byCategory[cat].pass++;
    }
  });
  const categoryScores = Object.entries(byCategory).map(([category, v]) => ({
    category, percentage: v.total ? Math.round((v.pass / v.total) * 100) : 0, evaluated: v.total,
  }));
  return { overall: { model: primaryModel, ...overall }, byTemplate, allModels, byCategory: categoryScores };
}

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
    const res = await fetch("/api/state");
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
    const res = await fetch("/api/state", {
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

function AppShell({ username, onLogout, isAdmin, seedDemo }) {
  const [theme, setTheme] = useState("dark");
  const [projects, setProjects] = useState(() => (seedDemo ? makeSeedProjects() : []));
  const [screenTypes, setScreenTypes] = useState(SCREEN_TYPE_DEFAULTS);
  const [areas, setAreas] = useState(AREA_DEFAULTS);
  const [severities, setSeverities] = useState(SEVERITY_DEFAULTS);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [auditRuns, setAuditRuns] = useState([]);
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
  const [editingProject, setEditingProject] = useState(null);
  const [exportCtx, setExportCtx] = useState(null);
  const openExport = useCallback((ctx) => setExportCtx(ctx), []);
  const [billingSummary, setBillingSummary] = useState(null); // { status, trialDaysRemaining, packageName, featureFlags } | null
  const [billingChecked, setBillingChecked] = useState(false); // true once we've asked the backend (or confirmed there isn't one)

  useEffect(() => {
    if (isAdmin) { setBillingChecked(true); return; }
    (async () => {
      try {
        const res = await fetch("/api/subscription");
        if (!res.ok) { setBillingChecked(true); return; }
        const data = await res.json();
        if (data.isAdminAccount) { setBillingChecked(true); return; }
        setBillingSummary({
          status: data.subscription?.status || null,
          trialDaysRemaining: data.trialDaysRemaining,
          packageName: data.package?.name || null,
          featureFlags: data.package?.feature_flags || {},
        });
      } catch (e) { /* no backend — treat as unrestricted (e.g. Claude artifact preview) */ }
      setBillingChecked(true);
    })();
  }, [isAdmin]);

  // Audit Templates is a premium feature: the admin account and any account
  // on a package with feature_flags.audit_templates=true get it. If there's
  // no backend at all (billingSummary never populates), default to open so
  // this still works as a standalone Claude artifact preview.
  const hasTemplatesAccess = isAdmin || !billingSummary || !!billingSummary.featureFlags?.audit_templates;

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
          if (parsed.templates) setTemplates(parsed.templates);
          if (parsed.auditRuns) setAuditRuns(parsed.auditRuns);
          if (parsed.theme) setTheme(parsed.theme);
        }
      } catch (e) { /* no saved state yet */ }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveAppState({ projects, screenTypes, areas, severities, templates, auditRuns, theme });
    }, 500);
    return () => clearTimeout(t);
  }, [projects, screenTypes, areas, severities, templates, auditRuns, theme, loaded]);

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

  function createProject(name, client, status) {
    const p = { id: uid("proj"), name, client, status: status || "Draft", updatedAt: Date.now(), modules: [{ id: uid("mod"), name: "General", screens: [] }] };
    setProjects((prev) => [p, ...prev]);
    logActivity(`Project ${name} created`);
    showToast("Project created", "check");
    setNewProjectOpen(false);
    openProject(p.id);
  }

  function editProject(projectId, patch) {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...patch, updatedAt: Date.now() } : p)));
    logActivity(`Project "${patch.name || ""}" updated`);
    showToast("Project updated", "check");
    setEditingProject(null);
  }

  function deleteProject(projectId) {
    const p = projects.find((pp) => pp.id === projectId);
    setProjects((prev) => prev.filter((pp) => pp.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setActiveScreenId(null);
      setView("projects");
    }
    logActivity(`Project "${p?.name || ""}" deleted`);
    showToast("Project deleted");
  }

  function addModule(projectId, name) {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, modules: [...p.modules, { id: uid("mod"), name, screens: [] }] } : p)));
  }
  function renameModule(projectId, moduleId, name) {
    setProjects((prev) => prev.map((p) => (p.id !== projectId ? p : {
      ...p, modules: p.modules.map((m) => (m.id === moduleId ? { ...m, name } : m)),
    })));
    showToast("Module renamed", "check");
  }
  function deleteModule(projectId, moduleId) {
    setProjects((prev) => prev.map((p) => (p.id !== projectId ? p : {
      ...p, modules: p.modules.filter((m) => m.id !== moduleId),
    })));
    setActiveScreenId((cur) => {
      const p = projects.find((pp) => pp.id === projectId);
      const mod = p?.modules.find((m) => m.id === moduleId);
      return mod?.screens.some((s) => s.id === cur) ? null : cur;
    });
    showToast("Module deleted");
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
  function deleteScreen(projectId, moduleId, screenId) {
    setProjects((prev) => prev.map((p) => (p.id !== projectId ? p : {
      ...p, modules: p.modules.map((m) => (m.id !== moduleId ? m : { ...m, screens: m.screens.filter((s) => s.id !== screenId) })),
    })));
    setActiveScreenId((cur) => (cur === screenId ? null : cur));
    showToast("Screen deleted");
  }
  function importIntoProject(projectId, parsedModules, options) {
    let addedModules = 0, addedScreens = 0, skipped = 0;
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const modules = p.modules.map((m) => ({ ...m, screens: [...m.screens] }));
      parsedModules.forEach((pm) => {
        let target = modules.find((m) => m.name.trim().toLowerCase() === pm.name.trim().toLowerCase());
        if (!target) {
          target = { id: uid("mod"), name: pm.name, screens: [] };
          modules.push(target);
          addedModules++;
        }
        pm.screens.forEach((ps) => {
          const dup = options?.skipDuplicates && target.screens.some((s) => s.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
          if (dup) { skipped++; return; }
          target.screens.push(mkScreen(ps.name, ps.type || "Screen", ["UX", "UI"], []));
          addedScreens++;
        });
      });
      return { ...p, modules };
    }));
    logActivity(`Imported ${addedScreens} screen(s) across ${addedModules} new module(s)`);
    showToast(`Imported ${addedScreens} screen${addedScreens === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}`, "check");
  }

  /* ---- Audit Templates ---- */
  const [activeRunId, setActiveRunId] = useState(null);

  function createTemplate(fields) {
    const t = tpl({
      ...fields, isBuiltIn: false, createdBy: username || "You", status: "draft",
      checklist: (fields.checklist || []).map((c) => ({ ...c, id: c.id || uid("chk") })),
    });
    setTemplates((prev) => [t, ...prev]);
    showToast("Template created", "check");
    return t.id;
  }
  function updateTemplateFields(id, patch) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)));
  }
  function duplicateTemplate(id) {
    setTemplates((prev) => {
      const src = prev.find((t) => t.id === id);
      if (!src) return prev;
      const copy = {
        ...src, id: uid("tpl"), name: `${src.name} (Copy)`, isBuiltIn: false, status: "draft",
        version: 1, versionHistory: [], usageCount: 0, favorite: false,
        createdBy: username || "You", createdAt: Date.now(), updatedAt: Date.now(),
        checklist: src.checklist.map((c) => ({ ...c, id: uid("chk") })),
      };
      showToast("Template duplicated", "check");
      return [copy, ...prev];
    });
  }
  function archiveTemplate(id) { updateTemplateFields(id, { status: "archived" }); showToast("Template archived"); }
  function unarchiveTemplate(id) { updateTemplateFields(id, { status: "draft" }); showToast("Template restored"); }
  function deleteTemplate(id) {
    const t = templates.find((x) => x.id === id);
    if (t?.isBuiltIn) { showToast("Built-in templates can only be archived, not deleted"); return; }
    if (!window.confirm(`Delete "${t?.name}"? This can't be undone.`)) return;
    setTemplates((prev) => prev.filter((x) => x.id !== id));
    showToast("Template deleted");
  }
  function toggleFavoriteTemplate(id) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t)));
  }
  function publishTemplate(id, note) {
    setTemplates((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const snapshot = { name: t.name, description: t.description, checklist: t.checklist, scoringModel: t.scoringModel };
      const nextVersion = (t.version || 1) + 1;
      return {
        ...t, status: "published", version: nextVersion,
        versionHistory: [{ version: t.version, snapshot, publishedAt: Date.now(), note: note || "Published" }, ...(t.versionHistory || [])],
        updatedAt: Date.now(),
      };
    }));
    showToast("Template published", "check");
  }
  function restoreTemplateVersion(id, historyEntry) {
    setTemplates((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const nextVersion = (t.version || 1) + 1;
      return {
        ...t, ...historyEntry.snapshot, version: nextVersion, updatedAt: Date.now(),
        versionHistory: [{ version: t.version, snapshot: { name: t.name, description: t.description, checklist: t.checklist, scoringModel: t.scoringModel }, publishedAt: Date.now(), note: `Restored from v${historyEntry.version}` }, ...(t.versionHistory || [])],
      };
    }));
    showToast(`Restored v${historyEntry.version}`, "check");
  }
  function importTemplate(parsed) {
    const t = tpl({
      name: (parsed.name || "Imported Template") + " (Imported)", category: parsed.category || "UX",
      industry: parsed.industry || [], difficulty: parsed.difficulty || "Intermediate",
      scoringModel: parsed.scoringModel || "percentage", description: parsed.description || "",
      purpose: parsed.purpose || "", isBuiltIn: false, status: "draft", createdBy: username || "You",
      checklist: (parsed.checklist || []).map((c) => ({ ...c, id: uid("chk") })),
    });
    setTemplates((prev) => [t, ...prev]);
    showToast("Template imported", "check");
    return t.id;
  }

  function startAuditRun({ templateIds, targetType, targetId, targetLabel }) {
    const run = {
      id: uid("run"), templateIds, targetType, targetId, targetLabel,
      status: "in_progress", startedAt: Date.now(), completedAt: null, results: {},
    };
    setAuditRuns((prev) => [run, ...prev]);
    setTemplates((prev) => prev.map((t) => (templateIds.includes(t.id) ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t)));
    setActiveRunId(run.id);
    logActivity(`Started audit run against ${targetLabel}`);
  }
  function updateRunResult(runId, itemId, patch) {
    setAuditRuns((prev) => prev.map((r) => (r.id !== runId ? r : { ...r, results: { ...r.results, [itemId]: { ...r.results[itemId], ...patch } } })));
  }
  function completeRun(runId) {
    setAuditRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: "completed", completedAt: Date.now() } : r)));
    showToast("Audit completed", "check");
  }
  function deleteRun(runId) {
    if (!window.confirm("Delete this audit run? This can't be undone.")) return;
    setAuditRuns((prev) => prev.filter((r) => r.id !== runId));
    if (activeRunId === runId) setActiveRunId(null);
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
        <Sidebar view={view} setView={setView} theme={theme} setTheme={setTheme} setCommandOpen={setCommandOpen} username={username} onLogout={onLogout} isAdmin={isAdmin} />
        <div className="uxa-main">
          <TopBar
            view={view}
            activeProject={activeProject}
            setCommandOpen={setCommandOpen}
            onNewProject={() => setNewProjectOpen(true)}
            isAdmin={isAdmin}
          />
          <div className="uxa-content">
            {billingSummary && view !== "billing" && (billingSummary.status === "expired" || (billingSummary.status === "trial" && billingSummary.trialDaysRemaining <= 3)) && (
              <div className={`uxa-trial-banner ${billingSummary.status === "expired" ? "expired" : ""}`}>
                <Gift size={15} />
                <span>
                  {billingSummary.status === "expired"
                    ? "Your free trial has ended. Upgrade to keep using Annotex without interruption."
                    : `Your free trial ends in ${billingSummary.trialDaysRemaining} day${billingSummary.trialDaysRemaining === 1 ? "" : "s"}.`}
                </span>
                <button onClick={() => setView("billing")}>View Billing</button>
              </div>
            )}
            {view === "dashboard" && (
              <Dashboard stats={dashStats} severities={severities} activity={activity} projects={projects}
                onOpenProject={openProject} onNewProject={() => setNewProjectOpen(true)}
                onQuickAudit={() => { const p = projects[0]; if (p) openProject(p.id); }}
                onExport={() => openExport({ scope: "allProjects" })} />
            )}
            {view === "projects" && (
              <ProjectsView projects={projects} onOpen={openProject} onNew={() => setNewProjectOpen(true)}
                onEdit={(p) => setEditingProject(p)} onDelete={deleteProject} />
            )}
            {view === "workspace" && (
              <AuditWorkspace
                project={activeProject} projects={projects}
                activeScreenId={activeScreenId} setActiveScreenId={setActiveScreenId}
                screenTypes={screenTypes} areas={areas} severities={severities}
                updateScreen={updateScreen} addModule={addModule} addScreen={addScreen}
                renameModule={renameModule} deleteModule={deleteModule} deleteScreen={deleteScreen}
                importIntoProject={importIntoProject}
                onOpenIssuePanel={(mode, screenId, issue) => setIssuePanel({ mode, screenId, issue })}
                onDeleteIssue={deleteIssue}
                onPickProject={(id) => openProject(id)}
                showToast={showToast}
                onExportProject={(projectId) => openExport({ scope: "entireProject", projectId })}
                onExportScreen={(projectId, screenId) => openExport({ scope: "currentScreen", projectId, screenId })}
                onExportIssueList={(projectId, screenId, filters) => openExport({ scope: "currentScreen", projectId, screenId, presetFilters: filters })}
              />
            )}
            {view === "templates" && (
              !hasTemplatesAccess ? (
                <TemplatesLockedView onGoToBilling={() => setView("billing")} />
              ) : activeRunId ? (
                <AuditRunView
                  run={auditRuns.find((r) => r.id === activeRunId)}
                  templates={templates}
                  severities={severities}
                  onUpdateResult={updateRunResult}
                  onComplete={completeRun}
                  onExit={() => setActiveRunId(null)}
                  onCreateIssue={(mode, screenId, issue) => setIssuePanel({ mode, screenId, issue })}
                  projects={projects}
                  showToast={showToast}
                />
              ) : (
                <TemplatesView
                  templates={templates} projects={projects} auditRuns={auditRuns}
                  onCreate={createTemplate} onUpdate={updateTemplateFields} onDuplicate={duplicateTemplate}
                  onArchive={archiveTemplate} onUnarchive={unarchiveTemplate} onDelete={deleteTemplate}
                  onToggleFavorite={toggleFavoriteTemplate} onPublish={publishTemplate}
                  onRestoreVersion={restoreTemplateVersion} onImport={importTemplate}
                  onStartRun={startAuditRun} onOpenRun={(id) => setActiveRunId(id)} onDeleteRun={deleteRun}
                  showToast={showToast}
                />
              )
            )}
            {view === "settings" && (
              <SettingsView screenTypes={screenTypes} setScreenTypes={setScreenTypes} areas={areas} setAreas={setAreas} severities={severities} setSeverities={setSeverities} showToast={showToast} />
            )}
            {view === "reports" && (
              <ReportsView projects={projects} issuesFlat={issuesFlat} screensFlat={screensFlat} severities={severities} showToast={showToast}
                onExport={(filters) => openExport({ scope: "filteredResults", presetFilters: filters })} />
            )}
            {view === "users" && isAdmin && (
              <UsersView showToast={showToast} />
            )}
            {view === "billing" && !isAdmin && (
              <BillingView showToast={showToast} />
            )}
            {view === "packages" && isAdmin && (
              <PackagesAdminView showToast={showToast} />
            )}
            {view === "admin-subscriptions" && isAdmin && (
              <AdminSubscriptionsView showToast={showToast} />
            )}
            {view === "leads" && isAdmin && (
              <LeadsAdminView showToast={showToast} />
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

      {editingProject && (
        <NewProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onCreate={(name, client, status) => editProject(editingProject.id, { name, client, status })}
        />
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
  const [authState, setAuthState] = useState("checking"); // checking | landing | login | register | authenticated
  const [username, setUsername] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [noBackend, setNoBackend] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUsername(data.username);
            setIsAdmin(!!data.isAdmin);
            setAuthState("authenticated");
          } else {
            setAuthState("landing");
          }
        } else {
          // /api/auth exists but errored unexpectedly — don't lock the user out
          setNoBackend(true);
          setAuthState("authenticated");
        }
      } catch (e) {
        // No backend at all (e.g. previewing this file as a standalone Claude
        // artifact) — skip the login gate rather than dead-ending the app.
        setNoBackend(true);
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
        setIsAdmin(!!data.isAdmin);
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

  async function register(u, p) {
    setAuthError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setUsername(data.username);
        setIsAdmin(false);
        setAuthState("authenticated");
        return true;
      }
      setAuthError(data.error || "Could not create that account.");
      return false;
    } catch (e) {
      setAuthError("Could not reach the server. Is the backend running?");
      return false;
    }
  }

  async function logout() {
    try { await fetch("/api/auth", { method: "DELETE" }); } catch (e) { /* ignore */ }
    setUsername(null);
    setIsAdmin(false);
    setAuthState("landing");
  }

  if (authState === "checking") {
    return (
      <div className="uxa-root dark">
        <StyleSheet />
        <div className="uxa-auth-loading"><Loader2 size={22} className="spin" /></div>
      </div>
    );
  }

  if (authState === "landing") {
    return (
      <div className="uxa-root dark">
        <StyleSheet />
        <LandingPage onSignIn={() => { setAuthError(""); setAuthState("login"); }} onGetStarted={() => { setAuthError(""); setAuthState("register"); }} />
      </div>
    );
  }

  if (authState === "login" || authState === "register") {
    return (
      <div className="uxa-root dark">
        <StyleSheet />
        {authState === "login" ? (
          <LoginScreen onLogin={login} error={authError} onSwitch={() => { setAuthError(""); setAuthState("register"); }} onBack={() => { setAuthError(""); setAuthState("landing"); }} />
        ) : (
          <RegisterScreen onRegister={register} error={authError} onSwitch={() => { setAuthError(""); setAuthState("login"); }} onBack={() => { setAuthError(""); setAuthState("landing"); }} />
        )}
      </div>
    );
  }

  return <AppShell username={username} isAdmin={isAdmin} onLogout={username ? logout : null} seedDemo={noBackend} />;
}

const FALLBACK_PACKAGES = [
  { id: "fallback-trial", name: "Free Trial", description: "Try the full audit workflow before you buy.", price: 0, yearly_price: null, is_trial: true, is_enterprise: false, trial_days: 15, features: ["Full audit workspace", "AI-assisted recommendations", "Export Center (all formats)", "Up to 2 projects"] },
  { id: "fallback-individual", name: "Individual", description: "For freelance and independent UX auditors.", price: 19, yearly_price: 190, is_trial: false, is_enterprise: false, features: ["Unlimited projects", "AI-assisted recommendations", "Export Center (all formats)", "Priority support"] },
  { id: "fallback-enterprise", name: "Team / Enterprise", description: "For agencies and organizations auditing at scale.", price: 0, yearly_price: null, is_trial: false, is_enterprise: true, features: ["Everything in Individual", "Multiple team members", "Custom feature allocation", "Dedicated support"] },
];

const LANDING_FEATURES = [
  { icon: ClipboardList, title: "Structured Audit Workspace", desc: "Organize findings by project, module, and screen — with per-screen severity, recommendations, and estimated effort built in." },
  { icon: Sparkles, title: "AI-Assisted Recommendations", desc: "Generate recommendations, redesign prompts, and severity suggestions for any issue in one click." },
  { icon: FileBarChart, title: "Client-Ready Export Center", desc: "Produce PDF, Excel, CSV, Word, PowerPoint, and JSON reports scoped to a project, screen, or filtered view." },
  { icon: Upload, title: "Bulk Import", desc: "Paste an outline or upload a CSV to populate modules and screens in seconds instead of clicking through forms." },
  { icon: Users2, title: "Private Multi-User Accounts", desc: "Every account gets its own fully isolated set of projects — nobody sees anyone else's audit data." },
  { icon: ReceiptText, title: "Built-in Plan Management", desc: "Free trial, paid, and enterprise tiers with admin tools for assigning plans, tracking payments, and reporting." },
];

function LandingPage({ onSignIn, onGetStarted }) {
  const [packages, setPackages] = useState(null);
  const [cycle, setCycle] = useState("monthly");
  const [leadModal, setLeadModal] = useState(null); // { interestedPackage } | null

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/packages");
        if (res.ok) {
          const data = await res.json();
          setPackages(data.packages && data.packages.length ? data.packages.sort((a, b) => a.display_order - b.display_order) : FALLBACK_PACKAGES);
        } else {
          setPackages(FALLBACK_PACKAGES);
        }
      } catch (e) {
        setPackages(FALLBACK_PACKAGES);
      }
    })();
  }, []);

  return (
    <div className="uxa-landing">
      <nav className="uxa-landing-nav">
        <div className="uxa-brand"><div className="uxa-brand-mark"><Layers size={16} strokeWidth={2.5} /></div><span>Annotex</span></div>
        <div className="uxa-landing-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setLeadModal({ interestedPackage: "" }); }}>Talk to sales</a>
        </div>
        <div className="uxa-landing-nav-actions">
          <button className="uxa-btn" onClick={onSignIn}>Sign in</button>
          <button className="uxa-btn primary" onClick={onGetStarted}>Start free trial</button>
        </div>
      </nav>

      <header className="uxa-landing-hero">
        <div className="uxa-landing-tag"><Gift size={13} /> 15-day free trial · no credit card required</div>
        <h1>Run UX audits your clients actually read.</h1>
        <p>Annotex is a structured audit workspace for UX designers and consultants — log findings screen by screen, get AI-assisted recommendations, and ship a polished client report in minutes.</p>
        <div className="uxa-landing-hero-actions">
          <button className="uxa-btn primary lg" onClick={onGetStarted}><Sparkles size={15} /> Start free trial</button>
          <button className="uxa-btn lg" onClick={onSignIn}>Sign in</button>
        </div>
      </header>

      <section className="uxa-landing-section" id="features">
        <div className="uxa-landing-section-head"><h2>Everything an audit needs, in one place</h2></div>
        <div className="uxa-landing-features-grid">
          {LANDING_FEATURES.map((f) => (
            <div className="uxa-landing-feature-card" key={f.title}>
              <div className="uxa-stat-icon"><f.icon size={17} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="uxa-landing-section" id="pricing">
        <div className="uxa-landing-section-head">
          <h2>Simple, transparent pricing</h2>
          {packages && (
            <div className="uxa-cycle-toggle">
              <button className={cycle === "monthly" ? "active" : ""} onClick={() => setCycle("monthly")}>Monthly</button>
              <button className={cycle === "yearly" ? "active" : ""} onClick={() => setCycle("yearly")}>Yearly</button>
            </div>
          )}
        </div>
        {!packages ? (
          <div className="uxa-empty-state"><Loader2 size={20} className="spin" /></div>
        ) : (
          <div className="uxa-plans-grid">
            {packages.map((p) => {
              const price = cycle === "yearly" && p.yearly_price != null ? p.yearly_price : p.price;
              return (
                <div key={p.id} className={`uxa-plan-card ${p.is_enterprise ? "enterprise" : ""}`}>
                  {p.is_enterprise ? <Gem size={18} /> : p.is_trial ? <Gift size={18} /> : <CreditCard size={18} />}
                  <h4>{p.name}</h4>
                  <p>{p.description}</p>
                  {p.is_enterprise ? (
                    <div className="uxa-plan-price">Custom pricing</div>
                  ) : p.is_trial ? (
                    <div className="uxa-plan-price">Free for {p.trial_days} days</div>
                  ) : (
                    <div className="uxa-plan-price">${price}<span>/{cycle === "yearly" ? "yr" : "mo"}</span></div>
                  )}
                  <ul className="uxa-plan-features">
                    {(p.features || []).map((f, i) => <li key={i}><Check size={12} /> {f}</li>)}
                  </ul>
                  {p.is_enterprise ? (
                    <button className="uxa-btn primary full" onClick={() => setLeadModal({ interestedPackage: p.name })}>Contact Sales</button>
                  ) : (
                    <button className="uxa-btn primary full" onClick={onGetStarted}>{p.is_trial ? "Start free trial" : "Get started"}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="uxa-landing-footer">
        <div className="uxa-brand"><div className="uxa-brand-mark"><Layers size={14} strokeWidth={2.5} /></div><span>Annotex</span></div>
        <span>© {new Date().getFullYear()} Annotex. All rights reserved.</span>
      </footer>

      {leadModal && (
        <LeadCaptureModal
          interestedPackage={leadModal.interestedPackage}
          packages={packages}
          onClose={() => setLeadModal(null)}
        />
      )}
    </div>
  );
}

function LeadCaptureModal({ interestedPackage, packages, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [pkg, setPkg] = useState(interestedPackage || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message, interestedPackage: pkg || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not send that — try again."); setBusy(false); return; }
      setDone(true);
    } catch (e) { setError("Could not reach the server."); setBusy(false); }
  }

  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <div className="uxa-modal-head"><h3>Thanks — we got it</h3><button onClick={onClose}><X size={16} /></button></div>
            <p className="uxa-text-muted">Someone from our team will follow up with you shortly.</p>
            <div className="uxa-modal-actions"><button className="uxa-btn primary" onClick={onClose}>Close</button></div>
          </>
        ) : (
          <>
            <div className="uxa-modal-head"><h3>Talk to us</h3><button onClick={onClose}><X size={16} /></button></div>
            <div className="uxa-form-field"><label>Name *</label><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="uxa-form-field"><label>Work email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="uxa-form-field"><label>Company</label><input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            {packages && (
              <div className="uxa-form-field"><label>Interested in</label>
                <select value={pkg} onChange={(e) => setPkg(e.target.value)}>
                  <option value="">Not sure yet</option>
                  {packages.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="uxa-form-field"><label>Message</label><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Team size, use case, timeline…" /></div>
            {error && <div className="uxa-login-error"><Info size={13} /> {error}</div>}
            <div className="uxa-modal-actions">
              <button className="uxa-btn" onClick={onClose}>Cancel</button>
              <button className="uxa-btn primary" disabled={busy} onClick={submit}>{busy ? <Loader2 size={14} className="spin" /> : <Contact2 size={14} />} Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, error, onSwitch, onBack }) {
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
        {onBack && <button type="button" className="uxa-auth-back" onClick={onBack}><ArrowLeft size={13} /> Back to home</button>}
        <div className="uxa-brand-mark lg"><Layers size={20} strokeWidth={2.5} /></div>
        <h2>Sign in to Annotex</h2>
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

        <button type="button" className="uxa-auth-switch" onClick={onSwitch}>
          Don't have an account? <span>Create one</span>
        </button>
      </form>
    </div>
  );
}

function RegisterScreen({ onRegister, error, onSwitch, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    if (!username.trim() || !password) return;
    if (password.length < 8) { setLocalError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setLocalError("Passwords don't match."); return; }
    setBusy(true);
    await onRegister(username.trim(), password);
    setBusy(false);
  }

  return (
    <div className="uxa-login-wrap">
      <form className="uxa-login-card" onSubmit={handleSubmit}>
        {onBack && <button type="button" className="uxa-auth-back" onClick={onBack}><ArrowLeft size={13} /> Back to home</button>}
        <div className="uxa-brand-mark lg"><Layers size={20} strokeWidth={2.5} /></div>
        <h2>Create your Annotex account</h2>
        <p>Your projects stay private to your login</p>

        <div className="uxa-form-field">
          <label>Username</label>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3-32 characters" autoComplete="username" />
        </div>
        <div className="uxa-form-field">
          <label>Password</label>
          <div className="uxa-password-row">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
        </div>
        <div className="uxa-form-field">
          <label>Confirm password</label>
          <input type={showPassword ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
        </div>

        {(localError || error) && <div className="uxa-login-error"><Lock size={13} /> {localError || error}</div>}

        <button className="uxa-btn primary full" type="submit" disabled={busy || !username.trim() || !password || !confirm}>
          {busy ? <Loader2 size={14} className="spin" /> : <UserCircle2 size={14} />} Create account
        </button>

        <button type="button" className="uxa-auth-switch" onClick={onSwitch}>
          Already have an account? <span>Sign in</span>
        </button>
      </form>
    </div>
  );
}

/* ============================== SIDEBAR / TOPBAR ============================== */

function Sidebar({ view, setView, theme, setTheme, setCommandOpen, username, onLogout, isAdmin }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "templates", label: "Audit Templates", icon: LayoutTemplate },
    { id: "workspace", label: "Audit Workspace", icon: ClipboardList },
    { id: "reports", label: "Reports", icon: FileBarChart },
    ...(!isAdmin ? [{ id: "billing", label: "Billing", icon: CreditCard }] : []),
    { id: "settings", label: "Settings", icon: SettingsIcon },
    ...(isAdmin ? [
      { id: "users", label: "Users", icon: Users2 },
      { id: "packages", label: "Packages", icon: Package },
      { id: "admin-subscriptions", label: "Subscriptions", icon: ReceiptText },
      { id: "leads", label: "Leads", icon: Contact2 },
    ] : []),
  ];
  return (
    <aside className="uxa-sidebar">
      <div className="uxa-brand">
        <div className="uxa-brand-mark"><Layers size={16} strokeWidth={2.5} /></div>
        <span>Annotex</span>
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
            <span>{username}{isAdmin ? <em className="uxa-admin-badge">Admin</em> : null}</span>
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

function TopBar({ view, activeProject, setCommandOpen, onNewProject, isAdmin }) {
  const titles = {
    dashboard: "Dashboard", projects: "Projects", workspace: activeProject ? activeProject.name : "Audit Workspace",
    settings: "Settings", reports: "Reports", users: "Users", billing: "Billing",
    packages: "Packages", "admin-subscriptions": "Subscriptions", templates: "Audit Templates", leads: "Leads",
  };
  const subtitles = {
    dashboard: "Audit program overview across all projects", projects: "All client audit engagements",
    workspace: activeProject ? `${activeProject.client} · ${activeProject.status}` : "Select a project to begin",
    settings: "Configure master data used across audits", reports: "Generate and export audit reports",
    users: "Manage registered accounts (admin only)",
    billing: "Your plan, usage, and payment history",
    packages: "Configure subscription packages (admin only)",
    "admin-subscriptions": "Manage every user's subscription and view analytics (admin only)",
    templates: "Standardized checklists for consistent, repeatable UX reviews",
    leads: "Contacts and demo requests from the landing page (admin only)",
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
        {!isAdmin && <NotificationBell />}
        <button className="uxa-btn primary" onClick={onNewProject}><Plus size={14} /> New Project</button>
      </div>
    </header>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) { /* no backend — bell just stays quiet */ }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }); } catch (e) { /* ignore */ }
  }

  if (!loaded || (notifications.length === 0 && !open)) {
    // Still show the bell (so users can open it later) once we know the backend exists.
  }

  return (
    <div className="uxa-notif-wrap">
      <button className="uxa-notif-bell" onClick={() => { setOpen((v) => !v); if (!open) load(); }}>
        <Bell size={16} />
        {unreadCount > 0 && <span className="uxa-notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="uxa-notif-panel">
          <div className="uxa-notif-head">
            <span>Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="uxa-notif-list">
            {notifications.length === 0 && <div className="uxa-empty" style={{ padding: "24px 10px" }}>No notifications yet.</div>}
            {notifications.map((n) => (
              <div key={n.id} className={`uxa-notif-item ${n.read ? "" : "unread"}`}>
                <p>{n.message}</p>
                <span>{relTime(new Date(n.created_at).getTime())}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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

function ProjectsView({ projects, onOpen, onNew, onEdit, onDelete }) {
  const [q, setQ] = useState("");
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.client.toLowerCase().includes(q.toLowerCase()));

  function handleEdit(e, p) { e.stopPropagation(); onEdit(p); }
  function handleDelete(e, p) {
    e.stopPropagation();
    const screens = p.modules.flatMap((m) => m.screens);
    const issues = screens.flatMap((s) => s.issues);
    const msg = `Delete "${p.name}"? This permanently removes its ${p.modules.length} module(s), ${screens.length} screen(s), and ${issues.length} issue(s). This can't be undone.`;
    if (window.confirm(msg)) onDelete(p.id);
  }

  return (
    <div className="uxa-panel">
      <div className="uxa-panel-head">
        <div className="uxa-inline-search"><Search size={14} /><input placeholder="Filter projects…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="uxa-btn primary" onClick={onNew}><Plus size={14} /> New Project</button>
      </div>
      <table className="uxa-table">
        <thead>
          <tr>
            <th>Project Name</th><th>Client</th><th>Status</th><th>Total Screens</th><th>Total Issues</th><th>Last Updated</th><th></th>
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
                <td className="uxa-row-actions">
                  <button title="Edit project" onClick={(e) => handleEdit(e, p)}><Pencil size={13} /></button>
                  <button title="Delete project" onClick={(e) => handleDelete(e, p)}><Trash2 size={13} /></button>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && <tr><td colSpan={7} className="uxa-empty">No projects match "{q}".</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function NewProjectModal({ project, onClose, onCreate }) {
  const isEdit = !!project;
  const [name, setName] = useState(project?.name || "");
  const [client, setClient] = useState(project?.client || "");
  const [status, setStatus] = useState(project?.status || "Draft");
  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>{isEdit ? "Edit project" : "New project"}</h3><button onClick={onClose}><X size={16} /></button></div>
        <div className="uxa-form-field">
          <label>Project name *</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Onboarding Audit" />
        </div>
        <div className="uxa-form-field">
          <label>Client</label>
          <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Acme Corp" />
        </div>
        <div className="uxa-form-field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Draft</option><option>In Progress</option><option>Completed</option><option>Archived</option>
          </select>
        </div>
        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn primary" disabled={!name.trim()} onClick={() => onCreate(name.trim(), client.trim() || "—", status)}>{isEdit ? "Save changes" : "Create project"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== AUDIT WORKSPACE ============================== */

function AuditWorkspace({ project, projects, activeScreenId, setActiveScreenId, screenTypes, areas, severities, updateScreen, addModule, addScreen, renameModule, deleteModule, deleteScreen, importIntoProject, onOpenIssuePanel, onDeleteIssue, onPickProject, showToast, onExportProject, onExportScreen, onExportIssueList }) {
  const [expanded, setExpanded] = useState(() => new Set(project?.modules?.map((m) => m.id) || []));
  const [addingModule, setAddingModule] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [addingScreenTo, setAddingScreenTo] = useState(null);
  const [screenName, setScreenName] = useState("");
  const [screenType, setScreenType] = useState(screenTypes[0]?.name || "Screen");
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editModuleValue, setEditModuleValue] = useState("");
  const [editingScreenId, setEditingScreenId] = useState(null);
  const [editScreenValue, setEditScreenValue] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

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
  function startEditModule(m) { setEditingModuleId(m.id); setEditModuleValue(m.name); }
  function commitEditModule(m) {
    if (editModuleValue.trim() && editModuleValue.trim() !== m.name) renameModule(project.id, m.id, editModuleValue.trim());
    setEditingModuleId(null);
  }
  function confirmDeleteModule(m) {
    const msg = m.screens.length ? `Delete "${m.name}" and its ${m.screens.length} screen(s)? This can't be undone.` : `Delete "${m.name}"?`;
    if (window.confirm(msg)) deleteModule(project.id, m.id);
  }
  function startEditScreen(s) { setEditingScreenId(s.id); setEditScreenValue(s.name); }
  function commitEditScreen(s) {
    if (editScreenValue.trim() && editScreenValue.trim() !== s.name) updateScreen(s.id, { name: editScreenValue.trim() });
    setEditingScreenId(null);
  }
  function confirmDeleteScreen(m, s) {
    if (window.confirm(`Delete screen "${s.name}"? Its ${s.issues.length} logged issue(s) will be removed too.`)) deleteScreen(project.id, m.id, s.id);
  }

  return (
    <>
      <ProjectSummaryPanel project={project} screenTypes={screenTypes} severities={severities} open={summaryOpen} setOpen={setSummaryOpen} />
      <div className="uxa-workspace">
      <aside className="uxa-tree">
        <div className="uxa-tree-head">
          <span>Modules</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button title="Import modules/screens" onClick={() => setImportOpen(true)}><Upload size={13} /></button>
            <button title="Export project" onClick={() => onExportProject(project.id)}><Download size={13} /></button>
            <button title="Add module" onClick={() => setAddingModule((v) => !v)}><Plus size={13} /></button>
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
              {editingModuleId === m.id ? (
                <div className="uxa-tree-edit-row">
                  <input autoFocus value={editModuleValue} onChange={(e) => setEditModuleValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEditModule(m); if (e.key === "Escape") setEditingModuleId(null); }}
                    onBlur={() => commitEditModule(m)} />
                </div>
              ) : (
                <div className="uxa-tree-mod-row-wrap">
                  <button className="uxa-tree-mod-row" onClick={() => toggleMod(m.id)}>
                    {expanded.has(m.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{m.name}</span>
                    <span className="uxa-tree-count">{m.screens.length}</span>
                  </button>
                  <div className="uxa-tree-row-actions">
                    <button title="Rename module" onClick={() => startEditModule(m)}><Pencil size={11} /></button>
                    <button title="Delete module" onClick={() => confirmDeleteModule(m)}><Trash2 size={11} /></button>
                  </div>
                </div>
              )}
              {expanded.has(m.id) && (
                <div className="uxa-tree-screens">
                  {m.screens.map((s) => (
                    editingScreenId === s.id ? (
                      <div className="uxa-tree-edit-row nested" key={s.id}>
                        <input autoFocus value={editScreenValue} onChange={(e) => setEditScreenValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEditScreen(s); if (e.key === "Escape") setEditingScreenId(null); }}
                          onBlur={() => commitEditScreen(s)} />
                      </div>
                    ) : (
                      <div className="uxa-tree-screen-row-wrap" key={s.id}>
                        <button className={`uxa-tree-screen ${activeScreenId === s.id ? "active" : ""}`} onClick={() => setActiveScreenId(s.id)}>
                          {s.type === "screen" ? <Monitor size={13} /> : <Smartphone size={13} />}
                          <span>{s.name}</span>
                          {s.issues.length > 0 && <span className="uxa-tree-badge">{s.issues.length}</span>}
                        </button>
                        <div className="uxa-tree-row-actions">
                          <button title="Rename screen" onClick={() => startEditScreen(s)}><Pencil size={11} /></button>
                          <button title="Delete screen" onClick={() => confirmDeleteScreen(m, s)}><Trash2 size={11} /></button>
                        </div>
                      </div>
                    )
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

      {importOpen && (
        <ImportCenter
          project={project} screenTypes={screenTypes}
          onClose={() => setImportOpen(false)}
          onImport={(parsed, options) => { importIntoProject(project.id, parsed, options); setImportOpen(false); }}
        />
      )}
      </div>
    </>
  );
}

function ProjectSummaryPanel({ project, screenTypes, severities, open, setOpen }) {
  const screens = project.modules.flatMap((m) => m.screens);
  const issues = screens.flatMap((s) => s.issues);
  const uxIssues = issues.filter((i) => i.auditType === "UX").length;
  const uiIssues = issues.filter((i) => i.auditType === "UI").length;
  const completed = screens.filter((s) => s.issues.length > 0).length;
  const progress = screens.length ? Math.round((completed / screens.length) * 100) : 0;
  const totalMinutes = screens.reduce((sum, s) => sum + estimateMinutes(s.type, screenTypes), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="uxa-panel uxa-project-summary">
      <button className="uxa-project-summary-head" onClick={() => setOpen((v) => !v)}>
        <div className="uxa-project-summary-title">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <h3>Project Summary</h3>
        </div>
        <div className="uxa-project-summary-glance">
          <span><Clock size={12} /> {totalHours}h estimated</span>
          <span>{screens.length} screens</span>
          <span>{issues.length} issues</span>
          <span>{progress}% complete</span>
        </div>
      </button>
      {open && (
        <div className="uxa-project-summary-body">
          <div className="uxa-project-summary-details">
            <div><span>Client</span><strong>{project.client}</strong></div>
            <div><span>Status</span><strong>{project.status}</strong></div>
            <div><span>Last updated</span><strong>{relTime(project.updatedAt)}</strong></div>
            <div><span>Modules</span><strong>{project.modules.length}</strong></div>
          </div>
          <div className="uxa-project-stats">
            <div><strong>{screens.length}</strong><span>Screens</span></div>
            <div><strong>{issues.length}</strong><span>Total issues</span></div>
            <div><strong>{uxIssues}</strong><span>UX issues</span></div>
            <div><strong>{uiIssues}</strong><span>UI issues</span></div>
            <div><strong>{totalHours}h</strong><span>Est. hours</span></div>
          </div>
          <div className="uxa-summary-row-group">
            {severities.map((sv) => (
              <div className="uxa-summary-row" key={sv.id}>
                <span>{sv.icon} {sv.label}</span>
                <strong>{issues.filter((i) => i.severity === sv.id).length}</strong>
              </div>
            ))}
          </div>
          <div className="uxa-progress-row" style={{ marginTop: 4 }}>
            <div className="uxa-progress-track"><div className="uxa-progress-fill" style={{ width: `${progress}%` }} /></div>
            <span>{progress}% ({completed}/{screens.length} screens)</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== IMPORT CENTER ============================== */

function parseOutlineText(text) {
  const lines = text.split("\n");
  const modules = [];
  let current = null;
  lines.forEach((raw) => {
    if (!raw.trim()) return;
    const isIndented = /^[\s\t]/.test(raw) && raw.trim() !== raw;
    const line = raw.trim();
    const typeMatch = line.match(/\(([^)]+)\)\s*$/);
    const type = typeMatch ? typeMatch[1].trim() : null;
    const name = typeMatch ? line.slice(0, typeMatch.index).trim() : line;
    if (!name) return;
    if (isIndented && current) {
      current.screens.push({ name, type });
    } else {
      current = { name, screens: [] };
      modules.push(current);
    }
  });
  return modules;
}

function parseCSVText(text) {
  const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
  const rows = result.data || [];
  const byModule = new Map();
  rows.forEach((row) => {
    const keys = Object.keys(row).reduce((acc, k) => { acc[k.trim().toLowerCase()] = row[k]; return acc; }, {});
    const moduleName = (keys.module || keys["module name"] || "General").trim();
    const screenName = (keys.screen || keys["screen name"] || "").trim();
    const type = (keys.type || keys["screen type"] || "").trim();
    if (!screenName) return;
    if (!byModule.has(moduleName)) byModule.set(moduleName, []);
    byModule.get(moduleName).push({ name: screenName, type: type || null });
  });
  return Array.from(byModule.entries()).map(([name, screens]) => ({ name, screens }));
}

function ImportCenter({ project, screenTypes, onClose, onImport }) {
  const [mode, setMode] = useState("outline");
  const [outlineText, setOutlineText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState("");

  const parsed = useMemo(() => {
    try {
      const raw = mode === "outline" ? parseOutlineText(outlineText) : parseCSVText(csvText);
      return raw.map((m) => ({
        ...m,
        screens: m.screens.map((s) => ({
          name: s.name,
          type: screenTypes.find((t) => t.name.toLowerCase() === (s.type || "").toLowerCase())?.name || "Screen",
        })),
      })).filter((m) => m.screens.length > 0 || m.name);
    } catch (e) {
      return [];
    }
  }, [mode, outlineText, csvText, screenTypes]);

  const totalScreens = parsed.reduce((sum, m) => sum + m.screens.length, 0);

  function handleCSVUpload(file) {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  return (
    <div className="uxa-modal-overlay top" onClick={onClose}>
      <div className="uxa-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-export-head">
          <div><h2>Import into {project.name}</h2><p>Bulk-add modules and screens from text or a CSV file</p></div>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="uxa-import-body">
          <div className="uxa-import-main">
            <div className="uxa-settings-tabs">
              <button className={mode === "outline" ? "active" : ""} onClick={() => setMode("outline")}>Paste outline</button>
              <button className={mode === "csv" ? "active" : ""} onClick={() => setMode("csv")}>Upload CSV</button>
            </div>

            {mode === "outline" ? (
              <>
                <p className="uxa-import-hint">
                  One module per unindented line, screens indented underneath. Optionally add a type in parentheses (matches your Settings → Screen types; defaults to "Screen").
                </p>
                <textarea
                  className="uxa-import-textarea"
                  rows={12}
                  placeholder={"Authentication\n  Login (Screen)\n  Register (Screen)\n  Forgot Password (Popup)\nDashboard\n  Overview (Screen)"}
                  value={outlineText}
                  onChange={(e) => setOutlineText(e.target.value)}
                />
              </>
            ) : (
              <>
                <p className="uxa-import-hint">CSV with columns: <strong>Module, Screen, Type</strong> (Type is optional). Export a spreadsheet from Excel/Sheets as CSV, or paste the raw text below.</p>
                <label className="uxa-upload-zone">
                  <FileUp size={16} /> {csvFileName || "Choose a .csv file"}
                  <input type="file" accept=".csv,text/csv" hidden onChange={(e) => handleCSVUpload(e.target.files[0])} />
                </label>
                <textarea
                  className="uxa-import-textarea"
                  rows={8}
                  placeholder={"Module,Screen,Type\nAuthentication,Login,Screen\nAuthentication,Forgot Password,Popup"}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </>
            )}

            <label className="uxa-checkbox" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              Skip screens that already exist in the target module (matched by name)
            </label>
            {error && <div className="uxa-login-error" style={{ marginTop: 10 }}><Info size={13} /> {error}</div>}
          </div>

          <div className="uxa-import-preview">
            <div className="uxa-preview-label"><ListChecks size={12} /> Preview</div>
            {parsed.length === 0 ? (
              <div className="uxa-empty" style={{ padding: "30px 10px" }}>Nothing parsed yet — paste text or upload a CSV.</div>
            ) : (
              <div className="uxa-import-preview-list">
                {parsed.map((m, i) => (
                  <div className="uxa-import-preview-mod" key={i}>
                    <strong>{m.name}</strong>
                    <ul>
                      {m.screens.map((s, j) => <li key={j}>{s.name} <span>{s.type}</span></li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div className="uxa-preview-meta">
              <span>{parsed.length} module{parsed.length === 1 ? "" : "s"}</span><span>·</span><span>{totalScreens} screen{totalScreens === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>

        <div className="uxa-export-footer">
          <span className="uxa-text-muted">Existing modules with matching names will be merged, not duplicated.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="uxa-btn" onClick={onClose}>Cancel</button>
            <button className="uxa-btn primary" disabled={totalScreens === 0} onClick={() => onImport(parsed, { skipDuplicates })}>
              <Upload size={14} /> Import {totalScreens || ""} screen{totalScreens === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </div>
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

/* ============================== USERS (ADMIN) ============================== */

function UsersView({ showToast }) {
  const [users, setUsers] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState(null); // user object
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not load users."); setUsers([]); return; }
      setUsers(data.users || []);
    } catch (e) {
      setError("Could not reach the server.");
      setUsers([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteUser(u) {
    if (!window.confirm(`Delete account "${u.username}"? This permanently removes their login and all of their saved audit data. This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(u.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Could not delete user"); return; }
      showToast(`Deleted ${u.username}`, "check");
      load();
    } catch (e) { showToast("Could not reach the server"); }
  }

  const filtered = (users || []).filter((u) => u.username.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="uxa-panel">
      <div className="uxa-panel-head">
        <div className="uxa-inline-search"><Search size={14} /><input placeholder="Filter users…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <span className="uxa-text-muted">{users ? `${users.length} registered account${users.length === 1 ? "" : "s"}` : ""}</span>
      </div>

      {error && <div className="uxa-login-error" style={{ marginBottom: 12 }}><ShieldAlert size={13} /> {error}</div>}

      <table className="uxa-table">
        <thead><tr><th>Username</th><th>Created</th><th>Has data</th><th></th></tr></thead>
        <tbody>
          {users === null && <tr><td colSpan={4} className="uxa-empty"><Loader2 size={16} className="spin" /></td></tr>}
          {users !== null && filtered.map((u) => (
            <tr key={u.id}>
              <td className="uxa-cell-strong">{u.username}</td>
              <td className="uxa-text-muted">{relTime(new Date(u.createdAt).getTime())}</td>
              <td>{u.hasData ? <span className="uxa-pill status-active">Yes</span> : <span className="uxa-pill status-disabled">No</span>}</td>
              <td className="uxa-row-actions">
                <button title="Reset password" onClick={() => setResetTarget(u)}><KeyRound size={13} /></button>
                <button title="Delete account" onClick={() => deleteUser(u)}><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}
          {users !== null && filtered.length === 0 && <tr><td colSpan={4} className="uxa-empty">No registered accounts{q ? ` match "${q}"` : " yet"}.</td></tr>}
        </tbody>
      </table>

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={(msg) => { setResetTarget(null); showToast(msg, "check"); }}
        />
      )}
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not reset password."); setBusy(false); return; }
      onDone(`Password reset for ${user.username}`);
    } catch (e) {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>Reset password for {user.username}</h3><button onClick={onClose}><X size={16} /></button></div>
        <div className="uxa-form-field">
          <label>New password</label>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div className="uxa-form-field">
          <label>Confirm new password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
        </div>
        {error && <div className="uxa-login-error"><Lock size={13} /> {error}</div>}
        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn primary" disabled={busy || !password || !confirm} onClick={submit}>
            {busy ? <Loader2 size={14} className="spin" /> : <KeyRound size={14} />} Reset password
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== BILLING (USER-FACING) ============================== */

function BillingView({ showToast }) {
  const [data, setData] = useState(null); // subscription view
  const [packages, setPackages] = useState(null);
  const [cycle, setCycle] = useState("monthly");
  const [busy, setBusy] = useState("");
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [subRes, pkgRes] = await Promise.all([fetch("/api/subscription"), fetch("/api/packages")]);
      if (subRes.ok) setData(await subRes.json());
      if (pkgRes.ok) { const pd = await pkgRes.json(); setPackages((pd.packages || []).sort((a, b) => a.display_order - b.display_order)); }
    } catch (e) { setError("Could not reach the server."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(action, params = {}) {
    setBusy(action + (params.packageId || ""));
    setError("");
    try {
      const res = await fetch("/api/subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Something went wrong."); setBusy(""); return; }
      showToast("Done", "check");
      await load();
    } catch (e) { setError("Could not reach the server."); }
    setBusy("");
  }

  if (!data || !packages) {
    return <div className="uxa-panel uxa-empty-state"><Loader2 size={22} className="spin" /></div>;
  }
  if (data.isAdminAccount) {
    return <div className="uxa-panel uxa-empty-state"><ShieldAlert size={24} /><h3>Admin accounts aren't billed</h3><p>Billing applies to registered user accounts only.</p></div>;
  }

  const sub = data.subscription;
  const pkg = data.package;
  const daysLeft = sub?.status === "trial" ? data.trialDaysRemaining : (sub?.current_period_end ? daysUntilClient(sub.current_period_end) : null);

  return (
    <div>
      <div className="uxa-panel uxa-current-plan">
        <div>
          <div className="uxa-current-plan-label">Current plan</div>
          <h2>{pkg ? pkg.name : "No plan assigned"}</h2>
          <div className="uxa-current-plan-meta">
            <span className={`uxa-pill status-${(sub?.status || "").replace(/^./, (c) => c.toUpperCase())}`}>{sub?.status || "none"}</span>
            {sub?.status === "trial" && daysLeft !== null && <span>{daysLeft} day{daysLeft === 1 ? "" : "s"} left in trial</span>}
            {sub?.status === "active" && sub?.current_period_end && <span>Renews {new Date(sub.current_period_end).toLocaleDateString()}</span>}
            {sub?.cancel_at_period_end && <span className="uxa-text-warn">Cancels at period end</span>}
          </div>
        </div>
        <div className="uxa-current-plan-actions">
          {sub?.cancel_at_period_end ? (
            <button className="uxa-btn" disabled={busy === "reactivate"} onClick={() => act("reactivate")}><PlayCircle size={14} /> Reactivate</button>
          ) : (
            sub?.status !== "expired" && sub?.status !== "cancelled" && pkg && !pkg.is_trial && (
              <button className="uxa-btn" disabled={busy === "cancel"} onClick={() => { if (window.confirm("Cancel your subscription at the end of the current billing period?")) act("cancel"); }}><PauseCircle size={14} /> Cancel</button>
            )
          )}
          {sub?.status === "trial" && (
            <button className="uxa-btn" disabled={busy === "cancel"} onClick={() => { if (window.confirm("End your trial now?")) act("cancel"); }}>End trial</button>
          )}
        </div>
      </div>

      {error && <div className="uxa-login-error" style={{ marginBottom: 16 }}><Info size={13} /> {error}</div>}

      <div className="uxa-panel">
        <div className="uxa-panel-head">
          <h3 style={{ margin: 0 }}>Available packages</h3>
          <div className="uxa-cycle-toggle">
            <button className={cycle === "monthly" ? "active" : ""} onClick={() => setCycle("monthly")}>Monthly</button>
            <button className={cycle === "yearly" ? "active" : ""} onClick={() => setCycle("yearly")}>Yearly</button>
          </div>
        </div>
        <div className="uxa-plans-grid">
          {packages.map((p) => {
            const isCurrent = pkg?.id === p.id && sub?.status !== "expired" && sub?.status !== "cancelled";
            const price = cycle === "yearly" && p.yearly_price != null ? p.yearly_price : p.price;
            return (
              <div key={p.id} className={`uxa-plan-card ${isCurrent ? "current" : ""} ${p.is_enterprise ? "enterprise" : ""}`}>
                {p.is_enterprise ? <Gem size={18} /> : p.is_trial ? <Gift size={18} /> : <CreditCard size={18} />}
                <h4>{p.name}</h4>
                <p>{p.description}</p>
                {p.is_enterprise ? (
                  <div className="uxa-plan-price">Custom pricing</div>
                ) : p.is_trial ? (
                  <div className="uxa-plan-price">Free for {p.trial_days} days</div>
                ) : (
                  <div className="uxa-plan-price">${price}<span>/{cycle === "yearly" ? "yr" : "mo"}</span></div>
                )}
                <ul className="uxa-plan-features">
                  {(p.features || []).map((f, i) => <li key={i}><Check size={12} /> {f}</li>)}
                </ul>
                {isCurrent ? (
                  <button className="uxa-btn full" disabled>Current plan</button>
                ) : p.is_enterprise ? (
                  <button className="uxa-btn primary full" onClick={() => setEnterpriseOpen(p.id)}>Contact Sales</button>
                ) : p.is_trial ? (
                  <button className="uxa-btn full" disabled title="Trials can't be self-selected">Not available</button>
                ) : (
                  <button className="uxa-btn primary full" disabled={busy === "change_plan" + p.id} onClick={() => act("change_plan", { packageId: p.id, billingCycle: cycle })}>
                    {busy === "change_plan" + p.id ? <Loader2 size={13} className="spin" /> : <TrendingDown size={13} style={{ transform: "rotate(180deg)" }} />} Choose plan
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="uxa-dash-grid2">
        <div className="uxa-panel">
          <h3>Payment history</h3>
          <table className="uxa-table">
            <thead><tr><th>Date</th><th>Amount</th><th>Cycle</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td className="uxa-text-muted">{relTime(new Date(p.created_at).getTime())}</td>
                  <td>${p.amount}</td>
                  <td>{p.billing_cycle || "—"}</td>
                  <td><span className={`uxa-pill status-${p.status === "paid" ? "active" : p.status === "failed" ? "Draft" : "Open"}`}>{p.status}</span></td>
                  <td className="uxa-cell-truncate" title={p.notes}>{p.notes}</td>
                </tr>
              ))}
              {data.payments.length === 0 && <tr><td colSpan={5} className="uxa-empty">No payments recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="uxa-panel">
          <h3>Subscription history</h3>
          <ul className="uxa-timeline">
            {data.history.map((h) => (
              <li key={h.id}>
                <span className="uxa-timeline-dot" />
                <div><p>{h.notes || h.action}</p><span>{relTime(new Date(h.created_at).getTime())} · {h.actor}</span></div>
              </li>
            ))}
            {data.history.length === 0 && <div className="uxa-empty">No history yet.</div>}
          </ul>
        </div>
      </div>

      {enterpriseOpen && (
        <EnterpriseRequestModal
          packageId={enterpriseOpen}
          onClose={() => setEnterpriseOpen(false)}
          onSubmit={async (message) => { await act("request_enterprise", { packageId: enterpriseOpen, message }); setEnterpriseOpen(false); }}
        />
      )}
    </div>
  );
}

function daysUntilClient(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function EnterpriseRequestModal({ onClose, onSubmit }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>Contact Sales</h3><button onClick={onClose}><X size={16} /></button></div>
        <div className="uxa-form-field">
          <label>Tell us about your team (optional)</label>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Team size, use case, timeline…" />
        </div>
        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn primary" disabled={busy} onClick={async () => { setBusy(true); await onSubmit(message); }}>
            {busy ? <Loader2 size={14} className="spin" /> : <Gem size={14} />} Send request
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== PACKAGES (ADMIN) ============================== */

function PackagesAdminView({ showToast }) {
  const [packages, setPackages] = useState(null);
  const [editing, setEditing] = useState(null); // package object | "new" | null

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/packages");
      const data = await res.json();
      setPackages((data.packages || []).sort((a, b) => a.display_order - b.display_order));
    } catch (e) { setPackages([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      const res = await fetch(`/api/packages?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Could not delete"); return; }
      showToast("Package deleted", "check");
      load();
    } catch (e) { showToast("Could not reach the server"); }
  }

  if (!packages) return <div className="uxa-panel uxa-empty-state"><Loader2 size={22} className="spin" /></div>;

  return (
    <div className="uxa-panel">
      <div className="uxa-panel-head">
        <span className="uxa-text-muted">{packages.length} package{packages.length === 1 ? "" : "s"}</span>
        <button className="uxa-btn primary" onClick={() => setEditing("new")}><Plus size={14} /> New Package</button>
      </div>
      <table className="uxa-table">
        <thead><tr><th>Name</th><th>Type</th><th>Price</th><th>Default</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {packages.map((p) => (
            <tr key={p.id}>
              <td className="uxa-cell-strong">{p.name}</td>
              <td>{p.is_enterprise ? "Enterprise" : p.is_trial ? "Trial" : "Paid"}</td>
              <td>{p.is_enterprise ? "Custom" : p.is_trial ? `${p.trial_days}d free` : `$${p.price}/mo${p.yearly_price != null ? ` · $${p.yearly_price}/yr` : ""}`}</td>
              <td>{p.is_default ? <Check size={14} /> : "—"}</td>
              <td><span className={`uxa-pill ${p.status === "active" ? "status-active" : "status-disabled"}`}>{p.status}</span></td>
              <td className="uxa-row-actions">
                <button title="Edit" onClick={() => setEditing(p)}><Pencil size={13} /></button>
                <button title="Delete" onClick={() => remove(p)}><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <PackageEditModal
          pkg={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); showToast("Package saved", "check"); }}
        />
      )}
    </div>
  );
}

function PackageEditModal({ pkg, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: pkg?.name || "", description: pkg?.description || "",
    price: pkg?.price ?? 0, yearly_price: pkg?.yearly_price ?? "",
    billing_cycle: pkg?.billing_cycle || "monthly",
    features: (pkg?.features || []).join("\n"),
    user_limit: pkg?.user_limit ?? "", storage_limit: pkg?.storage_limit || "",
    is_trial: pkg?.is_trial || false, is_enterprise: pkg?.is_enterprise || false,
    is_default: pkg?.is_default || false, trial_days: pkg?.trial_days ?? 15,
    status: pkg?.status || "active", display_order: pkg?.display_order ?? 0,
    feature_flags: pkg?.feature_flags || {},
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }
  function toggleFeatureFlag(id) { setForm((f) => ({ ...f, feature_flags: { ...f.feature_flags, [id]: !f.feature_flags[id] } })); }

  async function save() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setBusy(true); setError("");
    const body = {
      ...(pkg ? { id: pkg.id } : {}),
      name: form.name.trim(), description: form.description,
      price: Number(form.price) || 0,
      yearly_price: form.yearly_price === "" ? null : Number(form.yearly_price),
      billing_cycle: form.billing_cycle,
      features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      user_limit: form.user_limit === "" ? null : Number(form.user_limit),
      storage_limit: form.storage_limit || null,
      is_trial: form.is_trial, is_enterprise: form.is_enterprise, is_default: form.is_default,
      trial_days: Number(form.trial_days) || 15, status: form.status, display_order: Number(form.display_order) || 0,
      feature_flags: form.feature_flags,
    };
    try {
      const res = await fetch("/api/packages", {
        method: pkg ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not save."); setBusy(false); return; }
      onSaved();
    } catch (e) { setError("Could not reach the server."); setBusy(false); }
  }

  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>{pkg ? "Edit package" : "New package"}</h3><button onClick={onClose}><X size={16} /></button></div>
        <div className="uxa-branding-grid">
          <div className="uxa-form-field"><label>Package name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="uxa-form-field"><label>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select>
          </div>
          <div className="uxa-form-field"><label>Display order</label><input type="number" value={form.display_order} onChange={(e) => set("display_order", e.target.value)} /></div>
          <div className="uxa-form-field" style={{ gridColumn: "span 3" }}><label>Description</label><input value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="uxa-form-field"><label>Monthly price ($)</label><input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} disabled={form.is_enterprise} /></div>
          <div className="uxa-form-field"><label>Yearly price ($, optional)</label><input type="number" value={form.yearly_price} onChange={(e) => set("yearly_price", e.target.value)} disabled={form.is_enterprise} /></div>
          <div className="uxa-form-field"><label>User limit (blank = unlimited)</label><input type="number" value={form.user_limit} onChange={(e) => set("user_limit", e.target.value)} /></div>
          <div className="uxa-form-field" style={{ gridColumn: "span 3" }}><label>Features (one per line)</label>
            <textarea rows={4} className="uxa-import-textarea" value={form.features} onChange={(e) => set("features", e.target.value)} />
          </div>
          <div className="uxa-form-field"><label className="uxa-checkbox"><input type="checkbox" checked={form.is_trial} onChange={(e) => set("is_trial", e.target.checked)} /> Is trial package</label></div>
          <div className="uxa-form-field"><label className="uxa-checkbox"><input type="checkbox" checked={form.is_enterprise} onChange={(e) => set("is_enterprise", e.target.checked)} /> Is enterprise package</label></div>
          <div className="uxa-form-field"><label className="uxa-checkbox"><input type="checkbox" checked={form.is_default} onChange={(e) => set("is_default", e.target.checked)} /> Default for new signups</label></div>
          {form.is_trial && (
            <div className="uxa-form-field"><label>Trial days</label><input type="number" value={form.trial_days} onChange={(e) => set("trial_days", e.target.value)} /></div>
          )}
          <div className="uxa-form-field" style={{ gridColumn: "span 3" }}>
            <label>Gated features</label>
            <div className="uxa-gated-features">
              {GATED_FEATURES.map((f) => (
                <label key={f.id} className="uxa-gated-feature-row">
                  <input type="checkbox" checked={!!form.feature_flags[f.id]} onChange={() => toggleFeatureFlag(f.id)} />
                  <div><strong>{f.label}</strong><span>{f.description}</span></div>
                </label>
              ))}
            </div>
          </div>
        </div>
        {error && <div className="uxa-login-error" style={{ marginTop: 8 }}><Info size={13} /> {error}</div>}
        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save package</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== SUBSCRIPTIONS (ADMIN) ============================== */

function AdminSubscriptionsView({ showToast }) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="uxa-panel">
      <div className="uxa-settings-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
        <button className={tab === "subscriptions" ? "active" : ""} onClick={() => setTab("subscriptions")}>All Subscriptions</button>
        <button className={tab === "sales" ? "active" : ""} onClick={() => setTab("sales")}>Sales Requests</button>
      </div>
      {tab === "overview" && <SubscriptionOverviewTab />}
      {tab === "subscriptions" && <AllSubscriptionsTab showToast={showToast} />}
      {tab === "sales" && <SalesRequestsTab showToast={showToast} />}
    </div>
  );
}

function SubscriptionOverviewTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    (async () => {
      try { const res = await fetch("/api/admin/analytics"); if (res.ok) setStats(await res.json()); } catch (e) { /* ignore */ }
    })();
  }, []);
  if (!stats) return <div className="uxa-empty-state"><Loader2 size={20} className="spin" /></div>;

  const cards = [
    { label: "Total Trial Users", value: stats.totalTrialUsers },
    { label: "Active Paid Users", value: stats.activePaidUsers },
    { label: "Trial → Paid Conversion", value: `${stats.conversionRate}%` },
    { label: "Monthly Revenue", value: `$${stats.monthlyRevenue}` },
    { label: "Annual Revenue", value: `$${stats.annualRevenue}` },
    { label: "Total Registered Users", value: stats.totalUsers },
  ];

  return (
    <div>
      <div className="uxa-cards-grid">
        {cards.map((c) => (
          <div className="uxa-stat-card" key={c.label}>
            <div className="uxa-stat-icon"><TrendingUp size={16} /></div>
            <div className="uxa-stat-value">{c.value}</div>
            <div className="uxa-stat-label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="uxa-dash-grid2">
        <div className="uxa-panel">
          <h3>Package-wise subscribers</h3>
          <table className="uxa-table">
            <thead><tr><th>Package</th><th>Subscribers</th></tr></thead>
            <tbody>
              {stats.packageWiseCounts.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.count}</td></tr>)}
              {stats.packageWiseCounts.length === 0 && <tr><td colSpan={2} className="uxa-empty">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="uxa-panel">
          <h3>Expiring within 7 days</h3>
          <table className="uxa-table">
            <thead><tr><th>User</th><th>Package</th><th>Expires</th></tr></thead>
            <tbody>
              {stats.expiringSubscriptions.map((s, i) => <tr key={i}><td>{s.username}</td><td>{s.package || "—"}</td><td className="uxa-text-muted">{new Date(s.expiresAt).toLocaleDateString()}</td></tr>)}
              {stats.expiringSubscriptions.length === 0 && <tr><td colSpan={3} className="uxa-empty">Nothing expiring soon.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="uxa-dash-grid2">
        <div className="uxa-panel">
          <h3>Recently upgraded</h3>
          <ul className="uxa-timeline">
            {stats.recentlyUpgraded.map((c, i) => <li key={i}><span className="uxa-timeline-dot" /><div><p>{c.username} → {c.toPackage}</p><span>{relTime(new Date(c.createdAt).getTime())}</span></div></li>)}
            {stats.recentlyUpgraded.length === 0 && <div className="uxa-empty">No recent upgrades.</div>}
          </ul>
        </div>
        <div className="uxa-panel">
          <h3>Recently downgraded</h3>
          <ul className="uxa-timeline">
            {stats.recentlyDowngraded.map((c, i) => <li key={i}><span className="uxa-timeline-dot" /><div><p>{c.username} → {c.toPackage}</p><span>{relTime(new Date(c.createdAt).getTime())}</span></div></li>)}
            {stats.recentlyDowngraded.length === 0 && <div className="uxa-empty">No recent downgrades.</div>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AllSubscriptionsTab({ showToast }) {
  const [rows, setRows] = useState(null);
  const [manageUser, setManageUser] = useState(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try { const res = await fetch("/api/admin/subscriptions"); if (res.ok) { const d = await res.json(); setRows(d.users || []); } } catch (e) { setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!rows) return <div className="uxa-empty-state"><Loader2 size={20} className="spin" /></div>;
  const filtered = rows.filter((r) => r.username.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="uxa-inline-search" style={{ marginBottom: 12 }}><Search size={14} /><input placeholder="Filter users…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <table className="uxa-table">
        <thead><tr><th>User</th><th>Package</th><th>Status</th><th>Trial/Renewal</th><th></th></tr></thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td className="uxa-cell-strong">{r.username}</td>
              <td>{r.package?.name || "—"}</td>
              <td><span className={`uxa-pill status-${(r.subscription?.status || "").replace(/^./, (c) => c.toUpperCase())}`}>{r.subscription?.status || "none"}</span></td>
              <td className="uxa-text-muted">
                {r.subscription?.status === "trial" ? `${r.trialDaysRemaining}d left` : r.subscription?.current_period_end ? new Date(r.subscription.current_period_end).toLocaleDateString() : "—"}
              </td>
              <td className="uxa-row-actions"><button className="uxa-btn tiny" onClick={() => setManageUser(r)}>Manage</button></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={5} className="uxa-empty">No users match.</td></tr>}
        </tbody>
      </table>

      {manageUser && (
        <ManageSubscriptionModal
          user={manageUser}
          onClose={() => setManageUser(null)}
          onChanged={() => { load(); showToast("Updated", "check"); }}
        />
      )}
    </div>
  );
}

function ManageSubscriptionModal({ user, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [packages, setPackages] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [assignPkg, setAssignPkg] = useState("");
  const [assignCycle, setAssignCycle] = useState("monthly");
  const [payAmount, setPayAmount] = useState("");
  const [payStatus, setPayStatus] = useState("paid");
  const [payNotes, setPayNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const [dRes, pRes] = await Promise.all([fetch(`/api/admin/subscriptions?userId=${encodeURIComponent(user.id)}`), fetch("/api/packages")]);
      if (dRes.ok) setDetail(await dRes.json());
      if (pRes.ok) { const pd = await pRes.json(); setPackages((pd.packages || []).sort((a, b) => a.display_order - b.display_order)); }
    } catch (e) { setError("Could not reach the server."); }
  }, [user.id]);
  useEffect(() => { load(); }, [load]);

  async function act(action, params = {}) {
    setBusy(action); setError("");
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action, ...params }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Something went wrong."); setBusy(""); return; }
      await load();
      onChanged();
    } catch (e) { setError("Could not reach the server."); }
    setBusy("");
  }

  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>Manage {user.username}</h3><button onClick={onClose}><X size={16} /></button></div>

        {!detail ? <Loader2 size={18} className="spin" /> : (
          <>
            <div className="uxa-current-plan-meta" style={{ marginBottom: 14 }}>
              <span className={`uxa-pill status-${(detail.subscription?.status || "").replace(/^./, (c) => c.toUpperCase())}`}>{detail.subscription?.status || "none"}</span>
              <span>{detail.package?.name || "No package"}</span>
              {detail.subscription?.trial_ends_at && <span>Trial ends {new Date(detail.subscription.trial_ends_at).toLocaleDateString()}</span>}
              {detail.subscription?.current_period_end && <span>Renews {new Date(detail.subscription.current_period_end).toLocaleDateString()}</span>}
            </div>

            <div className="uxa-admin-actions-grid">
              <div className="uxa-form-field">
                <label>Assign / change package</label>
                <div className="uxa-inline-form">
                  <select value={assignPkg} onChange={(e) => setAssignPkg(e.target.value)}>
                    <option value="">Select package…</option>
                    {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={assignCycle} onChange={(e) => setAssignCycle(e.target.value)}>
                    <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                  </select>
                  <button className="uxa-btn primary tiny" disabled={!assignPkg || busy} onClick={() => act("assign_package", { packageId: assignPkg, billingCycle: assignCycle })}>Assign</button>
                </div>
              </div>

              <div className="uxa-form-field">
                <label>Trial</label>
                <div className="uxa-inline-form">
                  <button className="uxa-btn tiny" disabled={busy} onClick={() => act("extend_trial", { days: 7 })}>+7 days</button>
                  <button className="uxa-btn tiny" disabled={busy} onClick={() => act("extend_trial", { days: 14 })}>+14 days</button>
                  <button className="uxa-btn tiny" disabled={busy} onClick={() => { if (window.confirm("End this user's trial immediately?")) act("end_trial"); }}>End trial now</button>
                </div>
              </div>

              <div className="uxa-form-field">
                <label>Subscription status</label>
                <div className="uxa-inline-form">
                  <button className="uxa-btn tiny" disabled={busy} onClick={() => act("activate")}><PlayCircle size={12} /> Activate</button>
                  <button className="uxa-btn tiny" disabled={busy} onClick={() => { if (window.confirm("Deactivate this user's subscription?")) act("deactivate"); }}><PauseCircle size={12} /> Deactivate</button>
                  <button className="uxa-btn tiny" disabled={busy} onClick={() => act("extend_subscription", { days: 30 })}>Extend +30 days</button>
                </div>
              </div>

              <div className="uxa-form-field">
                <label>Record a payment</label>
                <div className="uxa-inline-form">
                  <input type="number" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ width: 90 }} />
                  <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                    <option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option>
                  </select>
                  <input placeholder="Notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
                  <button className="uxa-btn tiny primary" disabled={!payAmount || busy} onClick={() => act("record_payment", { amount: payAmount, status: payStatus, notes: payNotes })}>Record</button>
                </div>
              </div>
            </div>

            {error && <div className="uxa-login-error" style={{ marginTop: 10 }}><Info size={13} /> {error}</div>}

            <div className="uxa-dash-grid2" style={{ marginTop: 16 }}>
              <div>
                <h4 style={{ fontSize: 12, marginBottom: 8 }}>Payments</h4>
                <table className="uxa-table">
                  <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {detail.payments.map((p) => <tr key={p.id}><td className="uxa-text-muted">{relTime(new Date(p.created_at).getTime())}</td><td>${p.amount}</td><td>{p.status}</td></tr>)}
                    {detail.payments.length === 0 && <tr><td colSpan={3} className="uxa-empty">None yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 style={{ fontSize: 12, marginBottom: 8 }}>History</h4>
                <ul className="uxa-timeline">
                  {detail.history.map((h) => <li key={h.id}><span className="uxa-timeline-dot" /><div><p>{h.notes || h.action}</p><span>{relTime(new Date(h.created_at).getTime())}</span></div></li>)}
                  {detail.history.length === 0 && <div className="uxa-empty">None yet.</div>}
                </ul>
              </div>
            </div>
          </>
        )}

        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function SalesRequestsTab({ showToast }) {
  const [requests, setRequests] = useState(null);

  const load = useCallback(async () => {
    try { const res = await fetch("/api/admin/sales-requests"); if (res.ok) { const d = await res.json(); setRequests(d.requests || []); } } catch (e) { setRequests([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    try {
      const res = await fetch("/api/admin/sales-requests", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (!res.ok) { showToast("Could not update"); return; }
      showToast("Updated", "check");
      load();
    } catch (e) { showToast("Could not reach the server"); }
  }

  if (!requests) return <div className="uxa-empty-state"><Loader2 size={20} className="spin" /></div>;

  return (
    <table className="uxa-table">
      <thead><tr><th>User</th><th>Package</th><th>Message</th><th>Status</th><th>Received</th></tr></thead>
      <tbody>
        {requests.map((r) => (
          <tr key={r.id}>
            <td className="uxa-cell-strong">{r.username}</td>
            <td>{r.package || "—"}</td>
            <td className="uxa-cell-truncate" title={r.message}>{r.message || "—"}</td>
            <td>
              <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)}>
                <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
              </select>
            </td>
            <td className="uxa-text-muted">{relTime(new Date(r.createdAt).getTime())}</td>
          </tr>
        ))}
        {requests.length === 0 && <tr><td colSpan={5} className="uxa-empty">No requests yet.</td></tr>}
      </tbody>
    </table>
  );
}

/* ============================== LEADS (LANDING PAGE CRM) ============================== */

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "closed"];

function LeadsAdminView({ showToast }) {
  const [leads, setLeads] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingNotes, setEditingNotes] = useState(null); // lead object

  const load = useCallback(async () => {
    try { const res = await fetch("/api/leads"); if (res.ok) { const d = await res.json(); setLeads(d.leads || []); } } catch (e) { setLeads([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (!res.ok) { showToast("Could not update"); load(); return; }
    } catch (e) { showToast("Could not reach the server"); load(); }
  }

  if (!leads) return <div className="uxa-panel uxa-empty-state"><Loader2 size={20} className="spin" /></div>;

  const counts = LEAD_STATUSES.reduce((acc, s) => { acc[s] = leads.filter((l) => l.status === s).length; return acc; }, {});
  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (q && !l.name.toLowerCase().includes(q.toLowerCase()) && !l.email.toLowerCase().includes(q.toLowerCase()) && !(l.company || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="uxa-panel">
      <div className="uxa-cards-grid" style={{ marginBottom: 16 }}>
        {LEAD_STATUSES.map((s) => (
          <button key={s} className={`uxa-stat-card uxa-lead-stat-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
            <div className="uxa-stat-value">{counts[s]}</div>
            <div className="uxa-stat-label">{s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </button>
        ))}
      </div>

      <div className="uxa-panel-head">
        <div className="uxa-inline-search"><Search size={14} /><input placeholder="Search leads…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <span className="uxa-text-muted">{filtered.length} of {leads.length} leads</span>
      </div>

      <table className="uxa-table">
        <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Interested in</th><th>Message</th><th>Status</th><th>Received</th><th></th></tr></thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id}>
              <td className="uxa-cell-strong">{l.name}</td>
              <td>{l.email}</td>
              <td>{l.company || "—"}</td>
              <td>{l.interested_package || "—"}</td>
              <td className="uxa-cell-truncate" title={l.message}>{l.message || "—"}</td>
              <td>
                <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)}>
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </td>
              <td className="uxa-text-muted">{relTime(new Date(l.created_at).getTime())}</td>
              <td className="uxa-row-actions"><button title="Notes" onClick={() => setEditingNotes(l)}><Pencil size={13} /></button></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={8} className="uxa-empty">No leads match.</td></tr>}
        </tbody>
      </table>

      {editingNotes && (
        <LeadNotesModal lead={editingNotes} onClose={() => setEditingNotes(null)} onSaved={(notes) => { setLeads((prev) => prev.map((l) => (l.id === editingNotes.id ? { ...l, notes } : l))); setEditingNotes(null); showToast("Notes saved", "check"); }} />
      )}
    </div>
  );
}

function LeadNotesModal({ lead, onClose, onSaved }) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, notes }) });
      if (res.ok) onSaved(notes);
    } catch (e) { /* ignore */ }
    setBusy(false);
  }
  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>Notes — {lead.name}</h3><button onClick={onClose}><X size={16} /></button></div>
        <div className="uxa-form-field"><textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Follow-up notes…" /></div>
        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== AUDIT TEMPLATES ============================== */

function TemplatesLockedView({ onGoToBilling }) {
  return (
    <div className="uxa-panel uxa-locked-feature">
      <div className="uxa-locked-icon"><Lock size={22} /></div>
      <h3>Audit Templates is a premium feature</h3>
      <p>Upgrade to Individual or Enterprise to unlock the checklist builder, all 15 built-in templates, and AI-assisted scoring.</p>
      <button className="uxa-btn primary" onClick={onGoToBilling}><CreditCard size={14} /> View plans</button>
    </div>
  );
}

function TemplatesView({ templates, projects, auditRuns, onCreate, onUpdate, onDuplicate, onArchive, onUnarchive, onDelete, onToggleFavorite, onPublish, onRestoreVersion, onImport, onStartRun, onOpenRun, onDeleteRun, showToast }) {
  const [tab, setTab] = useState("library");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [preview, setPreview] = useState(null);
  const [builder, setBuilder] = useState(null); // template | "new" | null
  const [versionsFor, setVersionsFor] = useState(null);
  const [assignFor, setAssignFor] = useState(null); // array of template ids
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef(null);

  const filtered = templates.filter((t) => {
    if (!showArchived && t.status === "archived") return false;
    if (category !== "all" && t.category !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        onImport(parsed);
      } catch (e) { showToast("Could not parse that file — expected a template JSON export."); }
    };
    reader.readAsText(file);
    setImportOpen(false);
  }

  return (
    <div>
      <div className="uxa-settings-tabs">
        <button className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}>Library</button>
        <button className={tab === "analytics" ? "active" : ""} onClick={() => setTab("analytics")}>Analytics</button>
      </div>

      {tab === "library" && (
        <>
          <div className="uxa-panel-head" style={{ marginBottom: 12 }}>
            <div className="uxa-inline-search"><Search size={14} /><input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <label className="uxa-checkbox"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived</label>
              <button className="uxa-btn" onClick={() => fileInputRef.current?.click()}><Upload size={14} /> Import</button>
              <input ref={fileInputRef} type="file" accept=".json" hidden onChange={(e) => handleImportFile(e.target.files[0])} />
              <button className="uxa-btn primary" onClick={() => setBuilder("new")}><Plus size={14} /> New Template</button>
            </div>
          </div>
          <div className="uxa-scope-row" style={{ marginBottom: 16 }}>
            <button className={`uxa-chip ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}>All</button>
            {TEMPLATE_CATEGORIES.map((c) => <button key={c} className={`uxa-chip ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>)}
          </div>

          <div className="uxa-templates-grid">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id} template={t}
                onPreview={() => setPreview(t)}
                onDuplicate={() => onDuplicate(t.id)}
                onEdit={() => setBuilder(t)}
                onArchive={() => onArchive(t.id)}
                onUnarchive={() => onUnarchive(t.id)}
                onDelete={() => onDelete(t.id)}
                onToggleFavorite={() => onToggleFavorite(t.id)}
                onUse={() => setAssignFor([t.id])}
                onVersions={() => setVersionsFor(t)}
              />
            ))}
            {filtered.length === 0 && <div className="uxa-empty" style={{ gridColumn: "1 / -1" }}>No templates match your filters.</div>}
          </div>

          <div className="uxa-panel" style={{ marginTop: 20 }}>
            <div className="uxa-panel-head"><h3 style={{ margin: 0 }}>Recent audit runs</h3></div>
            <table className="uxa-table">
              <thead><tr><th>Target</th><th>Templates</th><th>Status</th><th>Started</th><th></th></tr></thead>
              <tbody>
                {auditRuns.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td className="uxa-cell-strong">{r.targetLabel}</td>
                    <td>{r.templateIds.map((id) => templates.find((t) => t.id === id)?.name).filter(Boolean).join(" + ")}</td>
                    <td><span className={`uxa-pill ${r.status === "completed" ? "status-active" : "status-InProgress"}`}>{r.status === "completed" ? "Completed" : "In Progress"}</span></td>
                    <td className="uxa-text-muted">{relTime(r.startedAt)}</td>
                    <td className="uxa-row-actions">
                      <button className="uxa-btn tiny" onClick={() => onOpenRun(r.id)}>Open</button>
                      <button onClick={() => onDeleteRun(r.id)}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
                {auditRuns.length === 0 && <tr><td colSpan={5} className="uxa-empty">No audits run yet — pick a template and hit "Use Template".</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "analytics" && <TemplateAnalyticsTab templates={templates} auditRuns={auditRuns} />}

      {preview && (
        <TemplateDetailModal template={preview} onClose={() => setPreview(null)}
          onEdit={() => { setBuilder(preview); setPreview(null); }}
          onDuplicate={() => { onDuplicate(preview.id); setPreview(null); }}
          onUse={() => { setAssignFor([preview.id]); setPreview(null); }}
        />
      )}
      {builder && (
        <TemplateBuilderModal
          template={builder === "new" ? null : builder}
          onClose={() => setBuilder(null)}
          onCreate={(fields) => { onCreate(fields); setBuilder(null); }}
          onSave={(id, patch) => { onUpdate(id, patch); setBuilder(null); }}
          onPublish={(id, note) => { onPublish(id, note); setBuilder(null); }}
        />
      )}
      {versionsFor && (
        <TemplateVersionsModal template={versionsFor} onClose={() => setVersionsFor(null)} onRestore={(entry) => { onRestoreVersion(versionsFor.id, entry); setVersionsFor(null); }} />
      )}
      {assignFor && (
        <AssignTemplateModal
          templates={templates} preselected={assignFor} projects={projects}
          onClose={() => setAssignFor(null)}
          onStart={(payload) => { onStartRun(payload); setAssignFor(null); }}
        />
      )}
    </div>
  );
}

function TemplateCard({ template: t, onPreview, onDuplicate, onEdit, onArchive, onUnarchive, onDelete, onToggleFavorite, onUse, onVersions }) {
  return (
    <div className={`uxa-template-card-full ${t.status === "archived" ? "archived" : ""}`}>
      <div className="uxa-template-card-top">
        <span className="uxa-chip">{t.category}</span>
        <button className={`uxa-fav-btn ${t.favorite ? "active" : ""}`} onClick={onToggleFavorite}><Star size={14} fill={t.favorite ? "currentColor" : "none"} /></button>
      </div>
      <h4>{t.name}</h4>
      <p>{t.description}</p>
      <div className="uxa-template-meta-grid">
        <span><ListChecks size={11} /> {t.checklist.length} items</span>
        <span><Clock size={11} /> {formatMinutes(t.estimatedMinutes)}</span>
        <span><Gauge size={11} /> {t.difficulty}</span>
        <span><History size={11} /> v{t.version}</span>
      </div>
      <div className="uxa-template-industries">
        {(t.industry || []).slice(0, 3).map((ind) => <span key={ind} className="uxa-chip tiny">{ind}</span>)}
      </div>
      <div className="uxa-template-footer">
        <span className="uxa-text-muted">By {t.createdBy} · {relTime(t.updatedAt)}</span>
        <span className={`uxa-pill ${t.status === "published" ? "status-active" : t.status === "archived" ? "status-disabled" : "status-Draft"}`}>{t.status}</span>
      </div>
      <div className="uxa-template-usage"><TrendingUp size={11} /> Used {t.usageCount || 0} time{t.usageCount === 1 ? "" : "s"}</div>
      <div className="uxa-template-actions">
        <button title="Preview" onClick={onPreview}><Eye size={13} /></button>
        <button title="Duplicate" onClick={onDuplicate}><Copy size={13} /></button>
        {!t.isBuiltIn && <button title="Edit" onClick={onEdit}><Pencil size={13} /></button>}
        <button title="Version history" onClick={onVersions}><History size={13} /></button>
        {t.status === "archived" ? (
          <button title="Restore" onClick={onUnarchive}><RotateCcw size={13} /></button>
        ) : (
          <button title="Archive" onClick={onArchive}><Archive size={13} /></button>
        )}
        {!t.isBuiltIn && <button title="Delete" onClick={onDelete}><Trash2 size={13} /></button>}
        <button className="uxa-btn tiny primary" style={{ marginLeft: "auto" }} onClick={onUse}>Use Template</button>
      </div>
    </div>
  );
}

function TemplateDetailModal({ template: t, onClose, onEdit, onDuplicate, onUse }) {
  return (
    <div className="uxa-modal-overlay top" onClick={onClose}>
      <div className="uxa-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>{t.name}</h3><button onClick={onClose}><X size={16} /></button></div>
        <p className="uxa-text-muted" style={{ marginTop: -6 }}>{t.description}</p>
        <div className="uxa-template-meta-grid" style={{ marginBottom: 14 }}>
          <span><Tag size={11} /> {t.category}</span>
          <span><ListChecks size={11} /> {t.checklist.length} items</span>
          <span><Clock size={11} /> {formatMinutes(t.estimatedMinutes)}</span>
          <span><Gauge size={11} /> {t.difficulty}</span>
          <span><Layers3 size={11} /> {SCORING_MODELS.find((m) => m.id === t.scoringModel)?.label}</span>
        </div>
        <h4 style={{ fontSize: 12.5 }}>Purpose</h4>
        <p style={{ fontSize: 12.5 }}>{t.purpose}</p>
        <h4 style={{ fontSize: 12.5, marginTop: 14 }}>Checklist ({t.checklist.length})</h4>
        <div className="uxa-checklist-preview">
          {t.checklist.map((c) => (
            <div className="uxa-checklist-preview-item" key={c.id}>
              <div className="uxa-checklist-preview-head"><strong>{c.title}</strong><span className="uxa-chip tiny">{c.category}</span></div>
              <p>{c.description}</p>
              {c.bestPractice && <p className="uxa-text-muted"><em>Best practice:</em> {c.bestPractice}</p>}
              {c.referenceLink && <p className="uxa-text-muted">Reference: {c.referenceLink}</p>}
            </div>
          ))}
        </div>
        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Close</button>
          <button className="uxa-btn" onClick={onDuplicate}><Copy size={13} /> Duplicate</button>
          {!t.isBuiltIn && <button className="uxa-btn" onClick={onEdit}><Pencil size={13} /> Edit</button>}
          <button className="uxa-btn primary" onClick={onUse}>Use Template</button>
        </div>
      </div>
    </div>
  );
}

function TemplateVersionsModal({ template: t, onClose, onRestore }) {
  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>Version history — {t.name}</h3><button onClick={onClose}><X size={16} /></button></div>
        <p className="uxa-text-muted" style={{ marginTop: -6 }}>Current version: v{t.version}</p>
        <ul className="uxa-timeline">
          {(t.versionHistory || []).map((h, i) => (
            <li key={i}>
              <span className="uxa-timeline-dot" />
              <div>
                <p>v{h.version} — {h.note}</p>
                <span>{relTime(h.publishedAt)}</span>
                <button className="uxa-btn tiny" style={{ marginLeft: 10 }} onClick={() => onRestore(h)}>Restore</button>
              </div>
            </li>
          ))}
          {(!t.versionHistory || t.versionHistory.length === 0) && <div className="uxa-empty">No published versions yet.</div>}
        </ul>
      </div>
    </div>
  );
}

function TemplateAnalyticsTab({ templates, auditRuns }) {
  const mostUsed = [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 6);
  const completed = auditRuns.filter((r) => r.status === "completed");
  const completionRate = auditRuns.length ? Math.round((completed.length / auditRuns.length) * 100) : 0;

  const avgScores = templates.map((t) => {
    const runs = auditRuns.filter((r) => r.templateIds.includes(t.id) && r.status === "completed");
    if (!runs.length) return null;
    const scores = runs.map((r) => computeAuditScores([t], r).overall.value);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return { name: t.name, avg: Math.round(avg), runs: runs.length };
  }).filter(Boolean).sort((a, b) => b.avg - a.avg);

  const categoryTally = {};
  templates.forEach((t) => t.checklist.forEach((c) => { categoryTally[c.category] = (categoryTally[c.category] || 0) + 1; }));
  const topCategories = Object.entries(categoryTally).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div>
      <div className="uxa-cards-grid">
        <div className="uxa-stat-card"><div className="uxa-stat-icon"><LayoutTemplate size={16} /></div><div className="uxa-stat-value">{templates.length}</div><div className="uxa-stat-label">Total Templates</div></div>
        <div className="uxa-stat-card"><div className="uxa-stat-icon"><PlayCircle size={16} /></div><div className="uxa-stat-value">{auditRuns.length}</div><div className="uxa-stat-label">Audit Runs</div></div>
        <div className="uxa-stat-card"><div className="uxa-stat-icon"><CheckCircle2 size={16} /></div><div className="uxa-stat-value">{completionRate}%</div><div className="uxa-stat-label">Completion Rate</div></div>
        <div className="uxa-stat-card"><div className="uxa-stat-icon"><Gauge size={16} /></div><div className="uxa-stat-value">{avgScores.length ? Math.round(avgScores.reduce((s, a) => s + a.avg, 0) / avgScores.length) : 0}</div><div className="uxa-stat-label">Average Score</div></div>
      </div>
      <div className="uxa-dash-grid2">
        <div className="uxa-panel">
          <h3>Most used templates</h3>
          <table className="uxa-table">
            <thead><tr><th>Template</th><th>Uses</th></tr></thead>
            <tbody>{mostUsed.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.usageCount || 0}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="uxa-panel">
          <h3>Template effectiveness (avg score)</h3>
          <table className="uxa-table">
            <thead><tr><th>Template</th><th>Avg score</th><th>Runs</th></tr></thead>
            <tbody>
              {avgScores.map((a) => <tr key={a.name}><td>{a.name}</td><td>{a.avg}</td><td>{a.runs}</td></tr>)}
              {avgScores.length === 0 && <tr><td colSpan={3} className="uxa-empty">Complete an audit to see effectiveness data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="uxa-panel">
        <h3>Checklist coverage by category</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topCategories.map(([name, value]) => ({ name, value }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#3B5BDB" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function blankChecklistItem() {
  return { id: uid("chk"), title: "", description: "", category: "Content", area: "Content", severity: "medium", weightage: 5, required: true, expectedResult: "", examples: "", bestPractice: "", referenceLink: "", aiPrompt: "", evaluationType: "pass_fail" };
}

function TemplateBuilderModal({ template, onClose, onCreate, onSave, onPublish }) {
  const isEdit = !!template;
  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState(template?.category || TEMPLATE_CATEGORIES[0]);
  const [description, setDescription] = useState(template?.description || "");
  const [purpose, setPurpose] = useState(template?.purpose || "");
  const [industry, setIndustry] = useState(template?.industry || []);
  const [difficulty, setDifficulty] = useState(template?.difficulty || "Intermediate");
  const [scoringModel, setScoringModel] = useState(template?.scoringModel || "percentage");
  const [checklist, setChecklist] = useState(template?.checklist?.length ? template.checklist : [blankChecklistItem()]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [publishNote, setPublishNote] = useState("");
  const [error, setError] = useState("");

  function toggleIndustry(i) { setIndustry((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])); }
  function toggleExpand(id) { setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function updateItem(id, patch) { setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))); }
  function removeItem(id) { setChecklist((prev) => prev.filter((c) => c.id !== id)); }
  function addItem() { const item = blankChecklistItem(); setChecklist((prev) => [...prev, item]); setExpanded((prev) => new Set([...prev, item.id])); }
  function moveItem(idx, dir) {
    setChecklist((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function buildFields() {
    return { name: name.trim(), category, description, purpose, industry, difficulty, scoringModel, checklist };
  }

  function handleSave() {
    if (!name.trim()) { setError("Template name is required."); return; }
    if (checklist.length === 0) { setError("Add at least one checklist item."); return; }
    setError("");
    if (isEdit) onSave(template.id, buildFields());
    else onCreate(buildFields());
  }
  function handlePublish() {
    if (!name.trim()) { setError("Template name is required."); return; }
    setError("");
    if (isEdit) { onSave(template.id, buildFields()); onPublish(template.id, publishNote); }
    else onCreate({ ...buildFields(), status: "published" });
  }

  return (
    <div className="uxa-modal-overlay top" onClick={onClose}>
      <div className="uxa-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-export-head">
          <div><h2>{isEdit ? `Edit ${template.name}` : "New Audit Template"}</h2><p>Define what should be reviewed and how it's scored</p></div>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="uxa-import-body">
          <div className="uxa-import-main">
            <div className="uxa-branding-grid">
              <div className="uxa-form-field"><label>Template name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="uxa-form-field"><label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>{TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </div>
              <div className="uxa-form-field"><label>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
              </div>
              <div className="uxa-form-field" style={{ gridColumn: "span 3" }}><label>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="uxa-form-field" style={{ gridColumn: "span 3" }}><label>Purpose</label><textarea rows={2} className="uxa-import-textarea" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
              <div className="uxa-form-field" style={{ gridColumn: "span 2" }}><label>Industry / product type</label>
                <div className="uxa-chip-cloud">{TEMPLATE_CATEGORIES.map((c) => <button key={c} type="button" className={`uxa-chip tiny ${industry.includes(c) ? "active" : ""}`} onClick={() => toggleIndustry(c)}>{c}</button>)}</div>
              </div>
              <div className="uxa-form-field"><label>Scoring model</label>
                <select value={scoringModel} onChange={(e) => setScoringModel(e.target.value)}>{SCORING_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
              </div>
            </div>

            <div className="uxa-panel-head" style={{ marginTop: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13 }}>Checklist ({checklist.length} items)</h3>
              <button className="uxa-btn tiny" onClick={addItem}><Plus size={12} /> Add item</button>
            </div>

            <div className="uxa-checklist-builder">
              {checklist.map((c, idx) => (
                <div className="uxa-checklist-item-editor" key={c.id}>
                  <div className="uxa-checklist-item-row" onClick={() => toggleExpand(c.id)}>
                    {expanded.has(c.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span className="uxa-cell-strong">{c.title || "Untitled item"}</span>
                    <span className="uxa-chip tiny">{c.category}</span>
                    <div className="uxa-tree-row-actions" style={{ opacity: 1, marginLeft: "auto" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => moveItem(idx, -1)}><ChevronUp size={12} /></button>
                      <button onClick={() => moveItem(idx, 1)}><ChevronDown size={12} /></button>
                      <button onClick={() => removeItem(c.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {expanded.has(c.id) && (
                    <div className="uxa-checklist-item-fields">
                      <div className="uxa-form-field"><label>Title</label><input value={c.title} onChange={(e) => updateItem(c.id, { title: e.target.value })} /></div>
                      <div className="uxa-form-field"><label>Category</label><input value={c.category} onChange={(e) => updateItem(c.id, { category: e.target.value })} /></div>
                      <div className="uxa-form-field"><label>Area</label><input value={c.area} onChange={(e) => updateItem(c.id, { area: e.target.value })} /></div>
                      <div className="uxa-form-field" style={{ gridColumn: "span 3" }}><label>Description</label><textarea rows={2} className="uxa-import-textarea" value={c.description} onChange={(e) => updateItem(c.id, { description: e.target.value })} /></div>
                      <div className="uxa-form-field"><label>Default severity</label>
                        <select value={c.severity} onChange={(e) => updateItem(c.id, { severity: e.target.value })}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                      </div>
                      <div className="uxa-form-field"><label>Weightage (1-10)</label><input type="number" min="1" max="10" value={c.weightage} onChange={(e) => updateItem(c.id, { weightage: Number(e.target.value) })} /></div>
                      <div className="uxa-form-field"><label>Evaluation type</label>
                        <select value={c.evaluationType} onChange={(e) => updateItem(c.id, { evaluationType: e.target.value })}><option value="pass_fail">Pass/Fail</option><option value="rating">Star rating</option><option value="both">Both</option><option value="numeric">Numeric</option></select>
                      </div>
                      <div className="uxa-form-field"><label className="uxa-checkbox"><input type="checkbox" checked={c.required} onChange={(e) => updateItem(c.id, { required: e.target.checked })} /> Required item</label></div>
                      <div className="uxa-form-field" style={{ gridColumn: "span 2" }}><label>Expected result</label><input value={c.expectedResult} onChange={(e) => updateItem(c.id, { expectedResult: e.target.value })} /></div>
                      <div className="uxa-form-field" style={{ gridColumn: "span 3" }}><label>Best practice</label><input value={c.bestPractice} onChange={(e) => updateItem(c.id, { bestPractice: e.target.value })} /></div>
                      <div className="uxa-form-field" style={{ gridColumn: "span 2" }}><label>Examples</label><input value={c.examples} onChange={(e) => updateItem(c.id, { examples: e.target.value })} /></div>
                      <div className="uxa-form-field"><label>Reference link</label><input value={c.referenceLink} onChange={(e) => updateItem(c.id, { referenceLink: e.target.value })} /></div>
                      <div className="uxa-form-field" style={{ gridColumn: "span 3" }}><label>AI prompt (used for AI Assist on this item)</label><input value={c.aiPrompt} onChange={(e) => updateItem(c.id, { aiPrompt: e.target.value })} /></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="uxa-export-preview">
            <div className="uxa-preview-label"><Info size={12} /> Publish</div>
            <p className="uxa-text-muted" style={{ fontSize: 11.5 }}>Save as draft to keep iterating, or publish to snapshot this as a new version teams can rely on.</p>
            <div className="uxa-form-field"><label>Publish note (optional)</label><input value={publishNote} onChange={(e) => setPublishNote(e.target.value)} placeholder="What changed?" /></div>
            {isEdit && <p className="uxa-text-muted" style={{ fontSize: 11 }}>Current version: v{template.version} · {template.status}</p>}
          </div>
        </div>
        {error && <div className="uxa-login-error" style={{ margin: "0 24px" }}><Info size={13} /> {error}</div>}
        <div className="uxa-export-footer">
          <span className="uxa-text-muted">{checklist.length} checklist item{checklist.length === 1 ? "" : "s"}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="uxa-btn" onClick={onClose}>Cancel</button>
            <button className="uxa-btn" onClick={handleSave}><Save size={13} /> Save draft</button>
            <button className="uxa-btn primary" onClick={handlePublish}><CheckCircle2 size={13} /> Publish</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignTemplateModal({ templates, preselected, projects, onClose, onStart }) {
  const [selectedIds, setSelectedIds] = useState(new Set(preselected));
  const [targetType, setTargetType] = useState("project");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [moduleId, setModuleId] = useState("");
  const [screenId, setScreenId] = useState("");

  const project = projects.find((p) => p.id === projectId);
  const modules = project?.modules || [];
  const mod = modules.find((m) => m.id === moduleId);
  const screens = mod?.screens || [];

  function toggle(id) { setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function start() {
    let targetId = "all", targetLabel = "Entire Organization (all projects)";
    if (targetType === "project") { targetId = project?.id; targetLabel = project?.name || "Project"; }
    if (targetType === "module") { targetId = mod?.id; targetLabel = `${project?.name || ""} / ${mod?.name || "Module"}`; }
    if (targetType === "screen") { const s = screens.find((x) => x.id === screenId); targetId = s?.id; targetLabel = `${project?.name || ""} / ${mod?.name || ""} / ${s?.name || "Screen"}`; }
    if (!targetId) return;
    onStart({ templateIds: [...selectedIds], targetType, targetId, targetLabel });
  }

  return (
    <div className="uxa-modal-overlay" onClick={onClose}>
      <div className="uxa-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="uxa-modal-head"><h3>Start an audit</h3><button onClick={onClose}><X size={16} /></button></div>

        <div className="uxa-form-field">
          <label>Templates (combine more than one if you like)</label>
          <div className="uxa-picker-list">
            {templates.filter((t) => t.status !== "archived").map((t) => (
              <label key={t.id} className="uxa-checkbox"><input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggle(t.id)} /> {t.name} <span className="uxa-text-muted">({t.checklist.length} items)</span></label>
            ))}
          </div>
        </div>

        <div className="uxa-form-field">
          <label>Assign to</label>
          <div className="uxa-scope-row">
            {["project", "module", "screen", "organization"].map((tt) => (
              <button key={tt} className={`uxa-chip ${targetType === tt ? "active" : ""}`} onClick={() => setTargetType(tt)}>{tt === "organization" ? "Entire Organization" : tt.charAt(0).toUpperCase() + tt.slice(1)}</button>
            ))}
          </div>
          {targetType === "screen" && <p className="uxa-text-muted" style={{ fontSize: 11, marginTop: 6 }}>"Screen" covers any screen type — popups, slide-outs, modals, drawers, and wizards included.</p>}
        </div>

        {targetType !== "organization" && (
          <div className="uxa-filter-grid">
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setModuleId(""); setScreenId(""); }}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {(targetType === "module" || targetType === "screen") && (
              <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setScreenId(""); }}>
                <option value="">Select module…</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            {targetType === "screen" && (
              <select value={screenId} onChange={(e) => setScreenId(e.target.value)}>
                <option value="">Select screen…</option>
                {screens.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            )}
          </div>
        )}

        <div className="uxa-modal-actions">
          <button className="uxa-btn" onClick={onClose}>Cancel</button>
          <button className="uxa-btn primary" disabled={selectedIds.size === 0} onClick={start}><PlayCircle size={14} /> Start audit</button>
        </div>
      </div>
    </div>
  );
}

function AuditRunView({ run, templates, severities, onUpdateResult, onComplete, onExit, onCreateIssue, projects, showToast }) {
  const runTemplates = useMemo(() => templates.filter((t) => run && run.templateIds.includes(t.id)), [templates, run]);
  const scores = useMemo(() => (run ? computeAuditScores(runTemplates, run) : null), [runTemplates, run]);
  const [showAllModels, setShowAllModels] = useState(false);

  if (!run) return <div className="uxa-panel uxa-empty-state"><h3>Audit run not found</h3><button className="uxa-btn" onClick={onExit}>Back to templates</button></div>;

  const allItems = runTemplates.flatMap((t) => t.checklist.map((c) => ({ ...c, __templateName: t.name })));
  const grouped = {};
  allItems.forEach((it) => { const cat = it.category || "Other"; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(it); });

  return (
    <div>
      <div className="uxa-panel uxa-run-header">
        <div>
          <button className="uxa-auth-back" style={{ marginBottom: 6 }} onClick={onExit}><ArrowLeft size={13} /> Back to templates</button>
          <h2 style={{ margin: "2px 0 4px", fontSize: 18 }}>{run.targetLabel}</h2>
          <p className="uxa-text-muted" style={{ margin: 0, fontSize: 12 }}>{runTemplates.map((t) => t.name).join(" + ")} · {allItems.length} checklist items</p>
        </div>
        {run.status === "in_progress" ? (
          <button className="uxa-btn primary" onClick={() => onComplete(run.id)}><CheckCircle2 size={14} /> Mark complete</button>
        ) : (
          <span className="uxa-pill status-active">Completed</span>
        )}
      </div>

      <div className="uxa-run-grid">
        <div className="uxa-run-main">
          {Object.entries(grouped).map(([cat, items]) => (
            <div className="uxa-panel" key={cat}>
              <h3>{cat}</h3>
              {items.map((item) => (
                <ChecklistItemRow key={item.id} item={item} run={run} severities={severities}
                  onUpdateResult={(patch) => onUpdateResult(run.id, item.id, patch)}
                  onCreateIssue={run.targetType === "screen" ? onCreateIssue : null}
                  targetScreenId={run.targetType === "screen" ? run.targetId : null}
                />
              ))}
            </div>
          ))}
        </div>

        <aside className="uxa-panel uxa-run-scores">
          <h3>Score</h3>
          <div className="uxa-run-score-hero">
            <div className="uxa-run-score-value">{scores.overall.display}</div>
            <span className="uxa-text-muted">{SCORING_MODELS.find((m) => m.id === scores.overall.model)?.label}</span>
          </div>
          {scores.byTemplate.length > 1 && (
            <div className="uxa-summary-row-group" style={{ marginTop: 10 }}>
              {scores.byTemplate.map((t) => (
                <div className="uxa-summary-row" key={t.templateId}><span>{t.templateName}</span><strong>{t.display}</strong></div>
              ))}
            </div>
          )}
          <button className="uxa-btn tiny" style={{ marginTop: 10 }} onClick={() => setShowAllModels((v) => !v)}>{showAllModels ? "Hide" : "Show"} all scoring models</button>
          {showAllModels && (
            <div className="uxa-summary-row-group" style={{ marginTop: 8 }}>
              {scores.allModels.map((m) => <div className="uxa-summary-row" key={m.id}><span>{m.label}</span><strong>{m.display}</strong></div>)}
            </div>
          )}
          <div className="uxa-summary-divider" />
          <h4 style={{ fontSize: 11.5, textTransform: "uppercase", color: "var(--text-faint)", margin: "0 0 8px" }}>By category</h4>
          {scores.byCategory.map((c) => (
            <div className="uxa-summary-row" key={c.category}><span>{c.category}</span><strong>{c.evaluated ? `${c.percentage}%` : "—"}</strong></div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function ChecklistItemRow({ item, run, severities, onUpdateResult, onCreateIssue, targetScreenId }) {
  const result = run.results[item.id] || {};
  const [notes, setNotes] = useState(result.notes || "");
  const [aiBusy, setAiBusy] = useState("");
  const [aiOutput, setAiOutput] = useState(null); // { label, text }

  function setStatus(status) { onUpdateResult({ status, severity: status === "fail" ? (result.severity || item.severity) : result.severity }); }
  function commitNotes() { if (notes !== result.notes) onUpdateResult({ notes }); }

  const AI_ACTIONS = [
    { id: "explain", label: "Explain", prompt: () => `Explain what "${item.title}" means for this screen and what a failure looks like in 2-3 sentences.` },
    { id: "recommend", label: "Recommend", prompt: () => `Issue: ${item.title} — ${item.description}\nWrite a specific, actionable recommendation to fix this. 1-3 sentences.` },
    { id: "severity", label: "Severity", prompt: () => `Issue: ${item.title} — ${item.description}\nClassify severity as exactly one word: critical, high, medium, or low.` },
    { id: "bestpractice", label: "Best Practice", prompt: () => `Give 2-3 concise UX best practices relevant to "${item.title}" in the context of ${item.category}.` },
    { id: "redesign", label: "Redesign Prompt", prompt: () => `Write a single AI image/design generation prompt that could redesign this element to fix: ${item.title} — ${item.description}. One paragraph, concrete visual details.` },
    { id: "effort", label: "Est. Effort", prompt: () => `Issue: ${item.title}\nEstimate the engineering/design effort to fix this as one of: Small (< 1 day), Medium (1-3 days), Large (1+ week). Respond with just the label and one sentence why.` },
    { id: "acceptance", label: "Acceptance Criteria", prompt: () => `Write 2-4 bullet-point acceptance criteria for a ticket that fixes: ${item.title} — ${item.description}` },
  ];

  async function runAI(action) {
    setAiBusy(action.id);
    try {
      const text = await callClaude(action.prompt(), item.aiPrompt || undefined);
      setAiOutput({ label: action.label, text });
      if (action.id === "severity") {
        const found = severities.find((s) => text.toLowerCase().includes(s.id));
        if (found) onUpdateResult({ severity: found.id });
      }
      if (action.id === "recommend") onUpdateResult({ recommendation: text });
    } catch (e) { setAiOutput({ label: action.label, text: "Could not reach the AI service." }); }
    setAiBusy("");
  }

  return (
    <div className="uxa-checklist-run-item">
      <div className="uxa-checklist-run-head">
        <div>
          <strong>{item.title}</strong>
          {item.required && <span className="uxa-chip tiny">Required</span>}
        </div>
        <span className="uxa-text-muted" style={{ fontSize: 10.5 }}>Weight {item.weightage}</span>
      </div>
      <p className="uxa-text-muted" style={{ fontSize: 12 }}>{item.description}</p>
      {item.bestPractice && <p style={{ fontSize: 11.5 }}><em>Best practice:</em> {item.bestPractice}</p>}
      {item.referenceLink && <p className="uxa-text-muted" style={{ fontSize: 11 }}>Ref: {item.referenceLink}</p>}

      <div className="uxa-checklist-run-controls">
        {(item.evaluationType === "pass_fail" || item.evaluationType === "both") && (
          <div className="uxa-passfail-row">
            <button className={`uxa-chip ${result.status === "pass" ? "active" : ""}`} onClick={() => setStatus("pass")}><Check size={12} /> Pass</button>
            <button className={`uxa-chip ${result.status === "fail" ? "active" : ""}`} onClick={() => setStatus("fail")}><X size={12} /> Fail</button>
            <button className={`uxa-chip ${result.status === "na" ? "active" : ""}`} onClick={() => setStatus("na")}>N/A</button>
          </div>
        )}
        {(item.evaluationType === "rating" || item.evaluationType === "both") && (
          <div className="uxa-star-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => onUpdateResult({ rating: n, status: result.status || "pass" })}><Star size={16} fill={result.rating >= n ? "currentColor" : "none"} /></button>
            ))}
          </div>
        )}
        {item.evaluationType === "numeric" && (
          <input type="number" min="0" max="10" className="uxa-numeric-input" placeholder="0-10" value={result.numericValue ?? ""} onChange={(e) => onUpdateResult({ numericValue: Number(e.target.value), status: "pass" })} />
        )}
        {result.status === "fail" && (
          <select value={result.severity || item.severity} onChange={(e) => onUpdateResult({ severity: e.target.value })}>
            {severities.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          </select>
        )}
      </div>

      <textarea className="uxa-import-textarea" rows={2} placeholder="Notes…" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={commitNotes} style={{ marginTop: 8 }} />

      <div className="uxa-ai-actions-row">
        {AI_ACTIONS.map((a) => (
          <button key={a.id} className="uxa-btn ai tiny" disabled={!!aiBusy} onClick={() => runAI(a)}>
            {aiBusy === a.id ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />} {a.label}
          </button>
        ))}
        {onCreateIssue && result.status === "fail" && (
          <button className="uxa-btn tiny primary" onClick={() => onCreateIssue("new", targetScreenId, null)}><Plus size={11} /> Create Issue</button>
        )}
      </div>
      {aiOutput && <div className="uxa-ai-output">{aiOutput.text}</div>}
    </div>
  );
}

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
    confidential: true, footerText: "Prepared with Annotex", pageNumbers: true,
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
    const model = buildReportModel(matched, scopedProjects, stats, severities, branding, template, include, screenTypes);
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
    const body = encodeURIComponent(`Hi,\n\nSharing the ${branding.reportTitle} for ${branding.projectName}.\nPlease find it attached — download it from Annotex and attach the file (${file.filename}) manually, since browsers can't auto-attach files to emails.\n\nBest,\n${branding.preparedBy || ""}`);
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
                <PDFPreview branding={branding} template={template} matched={matched} stats={stats} screenTypes={screenTypes} />
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

function PDFPreview({ branding, template, matched, stats, screenTypes }) {
  const scopedHours = ((matched.screens.reduce((sum, s) => sum + estimateMinutes(s.type, screenTypes || []), 0)) / 60).toFixed(1);
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
        <div><strong>{scopedHours}h</strong><span>Est. effort</span></div>
      </div>
      <div className="uxa-cover-foot">
        <span>{branding.preparedBy ? `Prepared by ${branding.preparedBy}` : "Prepared by —"}</span>
        <span>{branding.reportDate}</span>
      </div>
    </div>
  );
}

/* ---- report model + file builders ---- */

function buildReportModel(matched, scopedProjects, stats, severities, branding, template, include, screenTypes) {
  const bySev = severities.map((sv) => ({ ...sv, count: matched.issues.filter((i) => i.severity === sv.id).length }));
  const byModule = {};
  matched.issues.forEach((i) => { byModule[i.moduleName] = (byModule[i.moduleName] || 0) + 1; });
  const screensById = {};
  matched.screens.forEach((s) => { screensById[s.id] = { ...s, issues: matched.issues.filter((i) => i.screenId === s.id) }; });
  const scopedMinutes = matched.screens.reduce((sum, s) => sum + estimateMinutes(s.type, screenTypes || []), 0);
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
    estHours: (scopedMinutes / 60).toFixed(1),
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
    `<div class="slide light"><div class="eyebrow">Next Steps</div><h2>Where to go from here</h2><ul><li>Triage and assign critical &amp; high severity issues</li><li>Review AI-generated design prompts for quick redesign iteration</li><li>Re-audit affected screens after fixes ship</li><li>Track progress in Annotex</li></ul><div class="pagenum">10</div></div>`,
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
      .uxa-pill.status-Completed { background: #DCFCE7; color: #15803D; }
      .uxa-pill.status-Archived { background: #F1F5F9; color: #94A3B8; }
      .uxa-pill.status-Trial { background: #E0E7FF; color: #4338CA; }
      .uxa-pill.status-Active { background: #DCFCE7; color: #15803D; }
      .uxa-pill.status-Expired { background: #FEE2E2; color: #B91C1C; }
      .uxa-pill.status-Cancelled { background: #F1F5F9; color: #64748B; }
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
      .uxa-project-summary { padding: 0; overflow: hidden; }
      .uxa-project-summary-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border: none; background: transparent; text-align: left; flex-wrap: wrap; }
      .uxa-project-summary-title { display: flex; align-items: center; gap: 6px; }
      .uxa-project-summary-title h3 { margin: 0; }
      .uxa-project-summary-glance { display: flex; gap: 14px; font-size: 11.5px; color: var(--text-muted); }
      .uxa-project-summary-glance span { display: flex; align-items: center; gap: 4px; }
      .uxa-project-summary-body { padding: 0 18px 18px; border-top: 1px solid var(--border); padding-top: 14px; }
      .uxa-project-summary-details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
      .uxa-project-summary-details > div { display: flex; flex-direction: column; gap: 2px; }
      .uxa-project-summary-details span { font-size: 10.5px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.03em; }
      .uxa-project-summary-details strong { font-size: 13px; }
      .uxa-project-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px; }
      .uxa-project-stats > div { text-align: center; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 6px; }
      .uxa-project-stats strong { display: block; font-size: 18px; }
      .uxa-project-stats span { font-size: 10px; color: var(--text-muted); }
      .uxa-summary-row-group { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 16px; margin-bottom: 6px; }
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
      .uxa-tree-mod-row-wrap { display: flex; align-items: center; }
      .uxa-tree-mod-row-wrap .uxa-tree-mod-row { flex: 1; }
      .uxa-tree-screen-row-wrap { display: flex; align-items: center; }
      .uxa-tree-screen-row-wrap .uxa-tree-screen { flex: 1; }
      .uxa-tree-row-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.1s; flex-shrink: 0; padding-right: 2px; }
      .uxa-tree-mod-row-wrap:hover .uxa-tree-row-actions, .uxa-tree-screen-row-wrap:hover .uxa-tree-row-actions { opacity: 1; }
      .uxa-tree-row-actions button { border: none; background: transparent; color: var(--text-faint); padding: 4px; border-radius: 5px; display: flex; }
      .uxa-tree-row-actions button:hover { background: var(--bg); color: var(--primary); }
      .uxa-tree-edit-row input { width: 100%; border: 1px solid var(--primary); border-radius: 6px; padding: 6px 8px; background: var(--bg); font-size: 12.5px; font-weight: 600; }
      .uxa-tree-edit-row.nested { padding-left: 20px; }
      .uxa-tree-edit-row.nested input { font-weight: 400; font-size: 12px; }

      /* Import Center */
      .uxa-import-modal { width: 860px; max-width: 94vw; max-height: 88vh; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; }
      .uxa-import-body { display: grid; grid-template-columns: 1fr 260px; gap: 0; overflow: hidden; flex: 1; min-height: 0; }
      .uxa-import-main { overflow-y: auto; padding: 18px 24px; border-right: 1px solid var(--border); }
      .uxa-import-preview { padding: 18px; overflow-y: auto; background: var(--bg); }
      .uxa-import-hint { font-size: 11.5px; color: var(--text-muted); margin: 10px 0; line-height: 1.5; }
      .uxa-import-textarea { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; background: var(--bg); font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; resize: vertical; margin-top: 8px; }
      .uxa-import-preview-list { display: flex; flex-direction: column; gap: 10px; max-height: 360px; overflow-y: auto; }
      .uxa-import-preview-mod { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; background: var(--surface); }
      .uxa-import-preview-mod strong { font-size: 12px; }
      .uxa-import-preview-mod ul { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
      .uxa-import-preview-mod li { font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; }
      .uxa-import-preview-mod li span { color: var(--text-faint); font-size: 10px; }

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

      /* Notifications */
      .uxa-notif-wrap { position: relative; }
      .uxa-notif-bell { position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); }
      .uxa-notif-bell:hover { color: var(--primary); border-color: var(--primary); }
      .uxa-notif-dot { position: absolute; top: -5px; right: -5px; background: #DC2626; color: white; font-size: 9px; font-weight: 700; border-radius: 999px; min-width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
      .uxa-notif-panel { position: absolute; top: 42px; right: 0; width: 320px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); z-index: 70; overflow: hidden; }
      .uxa-notif-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 700; }
      .uxa-notif-head button { border: none; background: transparent; color: var(--primary); font-size: 11px; font-weight: 600; }
      .uxa-notif-list { max-height: 320px; overflow-y: auto; }
      .uxa-notif-item { padding: 10px 14px; border-bottom: 1px solid var(--border); }
      .uxa-notif-item:last-child { border-bottom: none; }
      .uxa-notif-item.unread { background: var(--primary-soft); }
      .uxa-notif-item p { margin: 0 0 3px; font-size: 12px; }
      .uxa-notif-item span { font-size: 10.5px; color: var(--text-faint); }

      /* Trial banner */
      .uxa-trial-banner { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: var(--radius-sm); background: var(--primary-soft); color: var(--primary); font-size: 12.5px; margin-bottom: 16px; }
      .uxa-trial-banner.expired { background: #FEE2E2; color: #B91C1C; }
      .uxa-trial-banner span { flex: 1; }
      .uxa-trial-banner button { border: 1px solid currentColor; background: transparent; color: inherit; border-radius: 999px; padding: 4px 12px; font-size: 11.5px; font-weight: 600; }

      /* Billing */
      .uxa-current-plan { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
      .uxa-current-plan-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); }
      .uxa-current-plan h2 { margin: 2px 0 6px; font-size: 20px; }
      .uxa-current-plan-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-muted); }
      .uxa-current-plan-meta .uxa-text-warn { color: #D97706; font-weight: 600; }
      .uxa-current-plan-actions { display: flex; gap: 8px; }
      .uxa-cycle-toggle { display: flex; border: 1px solid var(--border); border-radius: 999px; padding: 2px; }
      .uxa-cycle-toggle button { border: none; background: transparent; padding: 5px 14px; border-radius: 999px; font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
      .uxa-cycle-toggle button.active { background: var(--primary); color: white; }
      .uxa-plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
      .uxa-plan-card { border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; background: var(--bg); display: flex; flex-direction: column; gap: 8px; }
      .uxa-plan-card.current { border-color: var(--primary); background: var(--primary-soft); }
      .uxa-plan-card.enterprise { border-color: #7C3AED; }
      .uxa-plan-card h4 { margin: 4px 0 0; font-size: 15px; }
      .uxa-plan-card p { font-size: 11.5px; color: var(--text-muted); margin: 0; min-height: 32px; }
      .uxa-plan-price { font-size: 22px; font-weight: 800; }
      .uxa-plan-price span { font-size: 12px; font-weight: 500; color: var(--text-muted); }
      .uxa-plan-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; flex: 1; }
      .uxa-plan-features li { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-muted); }
      .uxa-plan-features li svg { color: var(--accent); flex-shrink: 0; }

      /* Admin subscription management */
      .uxa-admin-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .uxa-admin-actions-grid .uxa-inline-form { flex-wrap: wrap; }
      .uxa-modal.wide { width: 640px; max-width: 94vw; max-height: 88vh; overflow-y: auto; }

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
      .uxa-auth-switch { border: none; background: transparent; color: var(--text-muted); font-size: 11.5px; margin-top: 12px; }
      .uxa-auth-back { align-self: flex-start; display: flex; align-items: center; gap: 5px; border: none; background: transparent; color: var(--text-faint); font-size: 11.5px; margin-bottom: 10px; }
      .uxa-auth-back:hover { color: var(--primary); }

      /* Landing page */
      .uxa-landing { height: 100%; overflow-y: auto; color: var(--text); }
      .uxa-landing-nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 40px; position: sticky; top: 0; background: var(--bg); border-bottom: 1px solid var(--border); z-index: 20; }
      .uxa-landing-nav-links { display: flex; gap: 24px; }
      .uxa-landing-nav-links a { color: var(--text-muted); font-size: 13px; font-weight: 500; text-decoration: none; }
      .uxa-landing-nav-links a:hover { color: var(--primary); }
      .uxa-landing-nav-actions { display: flex; gap: 10px; }
      .uxa-landing-hero { max-width: 720px; margin: 0 auto; padding: 90px 24px 60px; text-align: center; }
      .uxa-landing-tag { display: inline-flex; align-items: center; gap: 6px; background: var(--primary-soft); color: var(--primary); font-size: 11.5px; font-weight: 600; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
      .uxa-landing-hero h1 { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 16px; line-height: 1.15; }
      .uxa-landing-hero p { font-size: 15px; color: var(--text-muted); line-height: 1.6; margin: 0 0 28px; }
      .uxa-landing-hero-actions { display: flex; justify-content: center; gap: 12px; }
      .uxa-btn.lg { padding: 11px 20px; font-size: 13.5px; }
      .uxa-landing-section { max-width: 1080px; margin: 0 auto; padding: 50px 24px; }
      .uxa-landing-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
      .uxa-landing-section-head h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
      .uxa-landing-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .uxa-landing-feature-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); }
      .uxa-landing-feature-card h3 { font-size: 14px; margin: 12px 0 6px; }
      .uxa-landing-feature-card p { font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }
      .uxa-landing-footer { display: flex; align-items: center; justify-content: space-between; max-width: 1080px; margin: 20px auto 0; padding: 24px; border-top: 1px solid var(--border); font-size: 12px; color: var(--text-faint); }
      @media (max-width: 720px) {
        .uxa-landing-nav { padding: 14px 18px; flex-wrap: wrap; gap: 10px; }
        .uxa-landing-nav-links { display: none; }
        .uxa-landing-hero h1 { font-size: 28px; }
        .uxa-landing-hero-actions { flex-direction: column; }
      }
      .uxa-auth-switch span { color: var(--primary); font-weight: 600; }
      .uxa-admin-badge { font-style: normal; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--primary); background: var(--primary-soft); border-radius: 4px; padding: 1px 5px; margin-left: 6px; }
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

      /* Audit Templates */
      .uxa-chip.tiny { padding: 3px 9px; font-size: 10.5px; }
      .uxa-templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      .uxa-template-card-full { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 8px; }
      .uxa-template-card-full.archived { opacity: 0.6; }
      .uxa-template-card-top { display: flex; justify-content: space-between; align-items: center; }
      .uxa-template-card-full h4 { margin: 0; font-size: 14.5px; }
      .uxa-template-card-full p { margin: 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.4; min-height: 32px; }
      .uxa-fav-btn { border: none; background: transparent; color: var(--text-faint); display: flex; }
      .uxa-fav-btn.active { color: #F59E0B; }
      .uxa-template-meta-grid { display: flex; flex-wrap: wrap; gap: 10px; font-size: 10.5px; color: var(--text-muted); }
      .uxa-template-meta-grid span { display: flex; align-items: center; gap: 4px; }
      .uxa-template-industries { display: flex; flex-wrap: wrap; gap: 4px; }
      .uxa-template-footer { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; margin-top: 4px; }
      .uxa-template-usage { font-size: 10.5px; color: var(--text-faint); display: flex; align-items: center; gap: 4px; }
      .uxa-template-actions { display: flex; gap: 3px; align-items: center; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 4px; }
      .uxa-template-actions button:not(.uxa-btn) { border: none; background: transparent; color: var(--text-faint); padding: 5px; border-radius: 6px; display: flex; }
      .uxa-template-actions button:not(.uxa-btn):hover { background: var(--bg); color: var(--primary); }

      .uxa-checklist-preview { display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; }
      .uxa-checklist-preview-item { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; background: var(--bg); }
      .uxa-checklist-preview-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .uxa-checklist-preview-item p { margin: 2px 0; font-size: 11.5px; }

      .uxa-checklist-builder { display: flex; flex-direction: column; gap: 8px; }
      .uxa-checklist-item-editor { border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); overflow: hidden; }
      .uxa-checklist-item-row { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; }
      .uxa-checklist-item-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 12px 14px; }
      .uxa-checklist-item-fields .uxa-form-field { margin-bottom: 0; }

      .uxa-run-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
      .uxa-run-grid { display: grid; grid-template-columns: 1fr 260px; gap: 14px; align-items: start; }
      .uxa-run-scores { position: sticky; top: 0; }
      .uxa-run-score-hero { text-align: center; padding: 14px 0; }
      .uxa-run-score-value { font-size: 30px; font-weight: 800; }
      .uxa-checklist-run-item { border-bottom: 1px solid var(--border); padding: 14px 0; }
      .uxa-checklist-run-item:last-child { border-bottom: none; }
      .uxa-checklist-run-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .uxa-checklist-run-head > div { display: flex; align-items: center; gap: 8px; }
      .uxa-checklist-run-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
      .uxa-passfail-row { display: flex; gap: 6px; }
      .uxa-star-row { display: flex; gap: 2px; }
      .uxa-star-row button { border: none; background: transparent; color: #F59E0B; display: flex; padding: 2px; }
      .uxa-numeric-input { width: 70px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 8px; background: var(--bg); }
      .uxa-ai-actions-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

      /* Premium gating + CRM */
      .uxa-locked-feature { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 20px; gap: 8px; }
      .uxa-locked-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
      .uxa-locked-feature h3 { margin: 0; }
      .uxa-locked-feature p { color: var(--text-muted); font-size: 12.5px; max-width: 360px; margin: 0 0 10px; }
      .uxa-gated-features { display: flex; flex-direction: column; gap: 8px; }
      .uxa-gated-feature-row { display: flex; align-items: flex-start; gap: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; background: var(--bg); cursor: pointer; }
      .uxa-gated-feature-row input { margin-top: 3px; }
      .uxa-gated-feature-row strong { display: block; font-size: 12.5px; }
      .uxa-gated-feature-row span { font-size: 11px; color: var(--text-muted); }
      .uxa-lead-stat-btn { border: 1px solid var(--border); cursor: pointer; text-align: left; }
      .uxa-lead-stat-btn.active { border-color: var(--primary); background: var(--primary-soft); }

      @media (max-width: 900px) {
        .uxa-sidebar { display: none; }
        .uxa-workspace, .uxa-screenpane, .uxa-dash-grid, .uxa-dash-grid2, .uxa-screen-meta-grid, .uxa-run-grid { grid-template-columns: 1fr !important; }
        .uxa-panel.span2 { grid-column: span 1; }
        .uxa-export-body { grid-template-columns: 1fr; }
        .uxa-export-preview { border-top: 1px solid var(--border); }
        .uxa-format-grid, .uxa-include-grid, .uxa-filter-grid, .uxa-template-grid, .uxa-branding-grid { grid-template-columns: 1fr 1fr; }
      }
    `}</style>
  );
}
