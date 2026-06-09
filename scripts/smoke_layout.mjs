#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { cookieHeaderFromSession } from "./smoke_frontend.mjs";

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";
const VIEWPORTS = [390, 640, 768, 900, 1024, 1180, 1366, 1440, 1500, 1712];
const NARROW_DESKTOP_VIEWPORTS = [390, 430];
const PUBLIC_THEMES = ["light", "dark"];
const PAGE_CHECKS = [
  {
    path: "/",
    name: "landing",
    anchorClearanceChecks: [
      { anchor: "#final-cta", selector: ".cta-band h2", guard: ".nav", minGap: 18 },
      { anchor: ".cta-band", selector: ".cta-band h2", guard: ".nav", minGap: 18, minWidth: 981 },
    ],
    noOverlapPairs: [
      [".hero-copy", ".hero-stage"],
      [".hero-copy", ".hero-stage .resume-card-front"],
      [".cta-band > div:first-child", ".cta-visual"],
    ],
    containedSelectors: [
      { container: ".hero-stage", selector: ".hero-stage .resume-card", tolerance: 8 },
      { container: ".hero-stage", selector: ".hero-badge", tolerance: 8 },
      { container: ".dash-mock", selector: ".dash-mock .btn", tolerance: 4 },
      { container: "closest:.dash-stat", selector: ".dash-mock .dash-stat-label", tolerance: 4 },
      { container: "closest:.dash-stat", selector: ".dash-mock .dash-stat-value", tolerance: 4 },
      { container: "closest:.dash-stat", selector: ".dash-mock .dash-stat-delta", tolerance: 4 },
      { container: "closest:.cta-visual", selector: ".cta-visual .resume-card", tolerance: 2 },
      { container: ".cta-band", selector: ".cta-visual .resume-card", tolerance: 8 },
      { container: ".cta-band", selector: ".cta-band > div:first-child", tolerance: 4 },
      { container: ".cta-band", selector: ".cta-band h2", tolerance: 4 },
      { container: ".cta-band", selector: ".cta-band .cta-cluster", tolerance: 4 },
      { container: "closest:.faq-item", selector: ".faq-question-text", tolerance: 4 },
      { container: "closest:.faq-item.open", selector: ".faq-item.open .faq-a", tolerance: 4 },
    ],
    maxHeightChecks: [
      { selector: ".cta-band", maxHeight: 720, minWidth: 1181, maxWidth: 1440 },
    ],
    selectors: [
      ".nav",
      ".hero",
      ".hero-copy",
      ".hero-stage",
      ".steps",
      ".dash-mock",
      ".pricing-grid",
      ".faq-grid",
      ".faq-item",
      ".cta-band",
      ".cta-band h2",
      ".cta-band .cta-cluster",
      ".footer-inner",
    ],
    textFitSelectors: [
      ".hero .h1",
      ".hero-trust",
      ".hero-sub",
      ".dash-main-head .btn",
      ".dash-mock .dash-stat-label",
      ".dash-stat-value",
      ".dash-mock .dash-stat-delta",
      ".dash-main-head .btn",
      ".dash-resume-actions .btn",
      ".price-card .btn",
      ".faq-question-text",
      ".faq-item.open .faq-a",
      ".cta-band h2",
      ".cta-band p",
      ".cta-band .btn",
    ],
  },
  {
    path: "/templates",
    name: "templates",
    selectors: [".public-page-topbar", ".templates-page-hero", ".templates-hero-preview", ".templates-page-actions", ".templates-selection-status", ".templates-decision-guide", ".templates-page-grid"],
    textFitSelectors: [
      ".public-page-topbar .brand-name",
      ".public-page-topbar .btn",
      ".templates-page-hero h1",
      ".templates-page-hero p",
      ".templates-hero-preview-head span",
      ".templates-hero-preview-head strong",
      ".templates-page-actions .primary-button",
      ".templates-page-actions .ghost-button",
      ".templates-selection-status strong",
      ".templates-selection-status .btn",
      ".templates-decision-head h2",
      ".templates-decision-head p",
      ".templates-guide-card strong",
      ".templates-guide-card small",
      ".templates-guide-option span",
      ".templates-guide-option small",
      ".templates-page-card-copy p",
      ".template-card-actions .btn",
    ],
    containedSelectors: [
      { container: ".templates-page-shell", selector: ".public-page-topbar", tolerance: 4 },
      { container: ".public-page-topbar", selector: ".public-page-topbar .brand", tolerance: 4 },
      { container: ".public-page-topbar", selector: ".public-page-topbar .settings-page-actions", tolerance: 4 },
      { container: ".templates-page-shell", selector: ".templates-page-hero", tolerance: 4 },
      { container: ".templates-page-hero", selector: ".templates-hero-preview", tolerance: 4 },
      { container: ".templates-hero-preview", selector: ".templates-hero-thumb", tolerance: 4 },
      { container: ".templates-hero-thumb", selector: ".templates-hero-thumb .r-doc", tolerance: 4 },
      { container: ".templates-page-shell", selector: ".templates-selection-status", tolerance: 4 },
      { container: ".templates-page-shell", selector: ".templates-decision-guide", tolerance: 4 },
      { container: ".templates-page-shell", selector: ".templates-page-grid", tolerance: 4 },
      { container: "closest:.templates-guide-card", selector: ".templates-guide-card strong", tolerance: 4 },
      { container: "closest:.templates-guide-card", selector: ".templates-guide-card small", tolerance: 4 },
      { container: "closest:.templates-guide-option", selector: ".templates-guide-option span", tolerance: 4 },
      { container: "closest:.templates-guide-option", selector: ".templates-guide-option small", tolerance: 4 },
      { container: "closest:.template-thumb", selector: ".templates-page-card .template-thumb .r-doc", tolerance: 4 },
    ],
  },
  {
    path: "/login?next=%2Fapp&account=signin-required",
    name: "login",
    selectors: [".login-nav", ".login-panel", ".login-copy", ".login-card", ".studio-oauth-button"],
    textFitSelectors: [
      ".login-copy h1",
      ".login-copy p",
      ".login-benefits span",
      ".login-preview-top strong",
      ".login-preview-sheet strong",
      ".login-status",
      ".login-card-head h2",
      ".login-card-head p",
      ".login-session-strip span",
      ".studio-oauth-button",
      ".studio-account-submit",
    ],
    containedSelectors: [
      { container: ".login-shell", selector: ".login-panel", tolerance: 4 },
      { container: ".login-panel", selector: ".login-card", tolerance: 4 },
      { container: ".login-panel", selector: ".login-copy", tolerance: 4 },
      { container: "closest:.login-card", selector: ".login-status", tolerance: 4 },
    ],
  },
  {
    path: "/help",
    name: "help",
    selectors: [".legal-shell", ".legal-topbar", ".legal-hero", ".help-signal-strip", ".help-action-routes", ".help-quick-grid", ".legal-grid", ".legal-card", ".legal-footer-card"],
    textFitSelectors: [
      ".legal-hero h1",
      ".legal-hero p",
      ".legal-hero-card span",
      ".help-signal-card strong",
      ".help-signal-card p",
      ".help-action-head h2",
      ".help-action-head p",
      ".help-action-card strong",
      ".help-action-card p",
      ".help-action-card small",
      ".help-action-buttons .btn",
      ".help-quick-link strong",
      ".help-quick-link small",
      ".legal-card h2",
      ".legal-card p",
      ".legal-footer-card strong",
      ".legal-footer-actions .btn",
    ],
    containedSelectors: [
      { container: ".legal-shell", selector: ".legal-hero", tolerance: 4 },
      { container: ".legal-shell", selector: ".help-signal-strip", tolerance: 4 },
      { container: ".legal-shell", selector: ".help-action-routes", tolerance: 4 },
      { container: ".legal-shell", selector: ".help-quick-grid", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-grid", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-footer-card", tolerance: 4 },
      { container: "closest:.help-action-card", selector: ".help-action-card strong", tolerance: 4 },
      { container: "closest:.help-action-card", selector: ".help-action-card p", tolerance: 4 },
      { container: "closest:.help-action-card", selector: ".help-action-card small", tolerance: 4 },
      { container: "closest:.help-action-card", selector: ".help-action-buttons", tolerance: 4 },
      { container: "closest:.help-quick-link", selector: ".help-quick-link strong", tolerance: 4 },
      { container: "closest:.legal-card", selector: ".legal-card h2", tolerance: 4 },
      { container: "closest:.legal-card", selector: ".legal-card p", tolerance: 4 },
    ],
  },
  {
    path: "/support",
    name: "support",
    selectors: [
      ".legal-shell",
      ".legal-topbar",
      ".legal-hero",
      ".support-routing-strip",
      ".support-routing-step",
      ".support-layout",
      ".support-guide-card",
      ".support-triage-card",
      ".support-triage-item",
      ".support-request-card",
      ".support-packet-card",
      ".support-packet-item",
      ".support-response-card",
      ".support-response-item",
      ".legal-footer-card",
    ],
    textFitSelectors: [
      ".legal-hero h1",
      ".legal-hero p",
      ".legal-hero-card span",
      ".support-routing-head strong",
      ".support-routing-head p",
      ".support-routing-step strong",
      ".support-routing-step p",
      ".support-guide-card strong",
      ".support-guide-card p",
      ".support-triage-head strong",
      ".support-triage-item strong",
      ".support-triage-item p",
      ".support-triage-item small",
      ".support-request-head strong",
      ".support-request-head p",
      ".support-packet-head strong",
      ".support-packet-head p",
      ".support-packet-item small",
      ".support-packet-item strong",
      ".support-packet-item p",
      ".support-response-head strong",
      ".support-response-head p",
      ".support-response-item small",
      ".support-form label span",
      ".support-form input",
      ".support-form select",
      ".support-form textarea",
      ".support-submit",
      ".legal-footer-card strong",
      ".legal-footer-actions .btn",
    ],
    containedSelectors: [
      { container: ".legal-shell", selector: ".legal-hero", tolerance: 4 },
      { container: ".legal-shell", selector: ".support-routing-strip", tolerance: 4 },
      { container: ".legal-shell", selector: ".support-layout", tolerance: 4 },
      { container: "closest:.support-routing-step", selector: ".support-routing-step strong", tolerance: 4 },
      { container: "closest:.support-routing-step", selector: ".support-routing-step p", tolerance: 4 },
      { container: ".support-layout", selector: ".support-request-card", tolerance: 4 },
      { container: "closest:.support-guide-card", selector: ".support-guide-card strong", tolerance: 4 },
      { container: "closest:.support-guide-card", selector: ".support-guide-card p", tolerance: 4 },
      { container: "closest:.support-triage-item", selector: ".support-triage-item strong", tolerance: 4 },
      { container: "closest:.support-triage-item", selector: ".support-triage-item p", tolerance: 4 },
      { container: "closest:.support-triage-item", selector: ".support-triage-item small", tolerance: 4 },
      { container: "closest:.support-request-card", selector: ".support-request-head strong", tolerance: 4 },
      { container: "closest:.support-request-card", selector: ".support-packet-card", tolerance: 4 },
      { container: "closest:.support-packet-item", selector: ".support-packet-item strong", tolerance: 4 },
      { container: "closest:.support-packet-item", selector: ".support-packet-item p", tolerance: 4 },
      { container: "closest:.support-request-card", selector: ".support-response-card", tolerance: 4 },
      { container: "closest:.support-response-item", selector: ".support-response-item small", tolerance: 4 },
      { container: "closest:.support-request-card", selector: ".support-form input", tolerance: 4 },
      { container: "closest:.support-request-card", selector: ".support-form textarea", tolerance: 4 },
    ],
  },
  {
    path: "/status",
    name: "status",
    selectors: [".legal-shell", ".legal-topbar", ".legal-hero", ".status-grid", ".status-card", ".status-diagnostics", ".status-incident-card", ".status-diagnostic-card", ".legal-footer-card"],
    textFitSelectors: [
      ".legal-hero h1",
      ".legal-hero p",
      ".legal-hero-card span",
      ".status-card span",
      ".status-card strong",
      ".status-card p",
      ".status-incident-card strong",
      ".status-incident-card p",
      ".status-diagnostic-card span",
      ".status-diagnostic-card strong",
      ".status-diagnostic-card small",
      ".legal-footer-card strong",
      ".legal-footer-actions .btn",
    ],
    containedSelectors: [
      { container: ".legal-shell", selector: ".legal-hero", tolerance: 4 },
      { container: ".legal-shell", selector: ".status-grid", tolerance: 4 },
      { container: ".legal-shell", selector: ".status-diagnostics", tolerance: 4 },
      { container: "closest:.status-incident-card", selector: ".status-incident-card strong", tolerance: 4 },
      { container: "closest:.status-incident-card", selector: ".status-incident-card p", tolerance: 4 },
      { container: "closest:.status-diagnostic-card", selector: ".status-diagnostic-card strong", tolerance: 4 },
      { container: "closest:.status-diagnostic-card", selector: ".status-diagnostic-card small", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-footer-card", tolerance: 4 },
      { container: "closest:.status-card", selector: ".status-card strong", tolerance: 4 },
      { container: "closest:.status-card", selector: ".status-card p", tolerance: 4 },
    ],
  },
  {
    path: "/updates",
    name: "updates",
    selectors: [".legal-shell", ".legal-topbar", ".legal-hero", ".updates-signal-grid", ".updates-signal-card", ".updates-timeline", ".updates-card", ".legal-footer-card"],
    textFitSelectors: [
      ".legal-hero h1",
      ".legal-hero p",
      ".legal-hero-card span",
      ".updates-signal-card small",
      ".updates-signal-card strong",
      ".updates-signal-card p",
      ".updates-card-meta time",
      ".updates-card-meta span",
      ".updates-card h2",
      ".updates-card p",
      ".updates-card li",
      ".legal-footer-card strong",
      ".legal-footer-actions .btn",
    ],
    containedSelectors: [
      { container: ".legal-shell", selector: ".legal-hero", tolerance: 4 },
      { container: ".legal-shell", selector: ".updates-signal-grid", tolerance: 4 },
      { container: ".legal-shell", selector: ".updates-timeline", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-footer-card", tolerance: 4 },
      { container: "closest:.updates-card", selector: ".updates-card h2", tolerance: 4 },
      { container: "closest:.updates-card", selector: ".updates-card p", tolerance: 4 },
      { container: "closest:.updates-card", selector: ".updates-card li", tolerance: 4 },
    ],
  },
  {
    path: "/privacy",
    name: "privacy",
    selectors: [".legal-shell", ".legal-topbar", ".legal-hero", ".legal-hero-meta", ".legal-grid", ".legal-card", ".legal-footer-card"],
    textFitSelectors: [
      ".legal-hero h1",
      ".legal-hero p",
      ".legal-hero-meta span",
      ".legal-hero-card span",
      ".legal-card h2",
      ".legal-card p",
      ".legal-footer-card strong",
      ".legal-footer-actions .btn",
    ],
    containedSelectors: [
      { container: ".legal-shell", selector: ".legal-hero", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-grid", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-footer-card", tolerance: 4 },
      { container: "closest:.legal-card", selector: ".legal-card h2", tolerance: 4 },
      { container: "closest:.legal-card", selector: ".legal-card p", tolerance: 4 },
    ],
  },
  {
    path: "/terms",
    name: "terms",
    selectors: [".legal-shell", ".legal-topbar", ".legal-hero", ".legal-hero-meta", ".legal-grid", ".legal-card", ".legal-footer-card"],
    textFitSelectors: [
      ".legal-hero h1",
      ".legal-hero p",
      ".legal-hero-meta span",
      ".legal-hero-card span",
      ".legal-card h2",
      ".legal-card p",
      ".legal-footer-card strong",
      ".legal-footer-actions .btn",
    ],
    containedSelectors: [
      { container: ".legal-shell", selector: ".legal-hero", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-grid", tolerance: 4 },
      { container: ".legal-shell", selector: ".legal-footer-card", tolerance: 4 },
      { container: "closest:.legal-card", selector: ".legal-card h2", tolerance: 4 },
      { container: "closest:.legal-card", selector: ".legal-card p", tolerance: 4 },
    ],
  },
  {
    path: "/missing-layout-smoke",
    name: "not-found",
    selectors: [".not-found-shell", ".legal-topbar", ".not-found-hero", ".not-found-docket", ".not-found-recovery", ".not-found-recovery-card"],
    textFitSelectors: [
      ".not-found-copy h1",
      ".not-found-copy p",
      ".not-found-actions .btn",
      ".not-found-code",
      ".not-found-docket-footer span",
      ".not-found-docket-footer strong",
      ".not-found-recovery-card strong",
      ".not-found-recovery-card small",
    ],
    containedSelectors: [
      { container: ".not-found-shell", selector: ".not-found-hero", tolerance: 4 },
      { container: ".not-found-shell", selector: ".not-found-recovery", tolerance: 4 },
      { container: ".not-found-docket", selector: ".not-found-code", tolerance: 4 },
      { container: "closest:.not-found-recovery-card", selector: ".not-found-recovery-card strong", tolerance: 4 },
      { container: "closest:.not-found-recovery-card", selector: ".not-found-recovery-card small", tolerance: 4 },
    ],
  },
  {
    path: "/app",
    name: "signed-in studio",
    requiresAuth: true,
    noOverlapPairs: [
      [".rf-studio-rail", ".rf-studio-main"],
    ],
    selectors: [
      ".rf-studio-page",
      ".rf-studio-topbar",
      ".rf-studio-layout",
      ".rf-studio-rail",
      ".rf-studio-main",
      ".rf-studio-hero",
      ".studio-hero-actions",
      ".export-format-strip",
      ".export-readiness-panel",
      ".export-readiness-item",
      ".rf-workflow-panel",
      ".rf-intake-grid",
      ".rf-live-card",
      ".studio-tabs-mini",
      ".rf-preview-wrap",
    ],
    textFitSelectors: [
      ".rf-studio-topbar .primary-button",
      ".rf-studio-topbar .ghost-button",
      ".rf-studio-rail .rail-item",
      ".rf-rail-upgrade .primary-button",
      ".rf-studio-hero h1",
      ".studio-hero-actions .primary-button",
      ".studio-hero-actions .ghost-button",
      ".studio-run-next-action strong",
      ".studio-run-next-action small",
      ".export-format-chip",
      ".export-format-chip small",
      ".export-readiness-copy span",
      ".export-readiness-copy strong",
      ".export-readiness-copy small",
      ".export-readiness-action",
      ".studio-tabs-mini button",
      ".preview-tab-state",
      ".rf-preview-status span",
      ".rf-intake-card-header",
      ".rf-file-drop strong",
      ".history-actions .ghost-button",
      ".history-export-actions .btn",
    ],
    containedSelectors: [
      { container: "closest:.rf-studio-stat", selector: ".rf-studio-stat-row", tolerance: 4 },
      { container: "closest:.rf-studio-stat", selector: ".rf-studio-stat p", tolerance: 4 },
      { container: "closest:.studio-run-next-action", selector: ".studio-run-next-action strong", tolerance: 4 },
      { container: "closest:.studio-run-next-action", selector: ".studio-run-next-action small", tolerance: 4 },
      { container: "closest:.export-readiness-item", selector: ".export-readiness-copy span", tolerance: 4 },
      { container: "closest:.export-readiness-item", selector: ".export-readiness-copy strong", tolerance: 4 },
      { container: "closest:.export-readiness-item", selector: ".export-readiness-copy small", tolerance: 4 },
      { container: "closest:.rf-intake-card", selector: ".rf-file-drop", tolerance: 4 },
      { container: "closest:.rf-preview-wrap", selector: ".rf-preview-status", tolerance: 4 },
    ],
  },
  {
    path: "/settings",
    name: "signed-in settings",
    requiresAuth: true,
    noOverlapPairs: [
      [".settings-page-nav", ".settings-page-main"],
    ],
    selectors: [
      ".settings-page-shell",
      ".settings-page-topbar",
      ".settings-page-layout",
      ".settings-page-nav",
      ".settings-page-main",
      ".settings-page-hero",
      ".settings-section",
      ".settings-metric-row",
      ".settings-export-list",
      ".settings-billing-head",
      ".settings-plan-access",
      ".settings-plan-access-item",
    ],
    textFitSelectors: [
      ".settings-page-actions .btn",
      ".settings-page-nav a",
      ".settings-status-pill",
      ".settings-plan-includes span",
      ".settings-profile-row span",
      ".settings-metric strong",
      ".settings-metric span",
      ".settings-project-pipeline-item span",
      ".settings-project-pipeline-item strong",
      ".settings-project-pipeline-item small",
      ".settings-project-item strong",
      ".settings-project-item span",
      ".settings-project-item small",
      ".settings-project-operations a",
      ".settings-project-operations span",
      ".settings-project-stage-controls button",
      ".settings-project-kit-head span",
      ".settings-project-kit-head small",
      ".settings-project-kit-item",
      ".settings-profile-actions .primary-button",
      ".settings-profile-actions .ghost-button",
      ".settings-export-item span",
      ".settings-export-item small",
      ".settings-export-actions .btn",
      ".settings-billing-head .ghost-button",
      ".settings-plan-active-card .settings-inline-link",
      ".settings-plan-access-head strong",
      ".settings-plan-access-head small",
      ".settings-plan-access-item span",
      ".settings-plan-access-item strong",
      ".settings-plan-access-item small",
      ".settings-section-copy h2",
    ],
    containedSelectors: [
      { container: "closest:.settings-metric", selector: ".settings-metric strong", tolerance: 4 },
      { container: "closest:.settings-metric", selector: ".settings-metric span", tolerance: 4 },
      { container: "closest:.settings-project-pipeline-item", selector: ".settings-project-pipeline-item span", tolerance: 4 },
      { container: "closest:.settings-project-pipeline-item", selector: ".settings-project-pipeline-item strong", tolerance: 4 },
      { container: "closest:.settings-project-pipeline-item", selector: ".settings-project-pipeline-item small", tolerance: 4 },
      { container: "closest:.settings-project-item", selector: ".settings-project-summary", tolerance: 4 },
      { container: "closest:.settings-project-summary", selector: ".settings-project-operations", tolerance: 4 },
      { container: "closest:.settings-project-item", selector: ".settings-project-controls", tolerance: 4 },
      { container: "closest:.settings-project-controls", selector: ".settings-project-stage-controls", tolerance: 4 },
      { container: "closest:.settings-project-controls", selector: ".settings-project-kit", tolerance: 4 },
      { container: "closest:.settings-project-kit", selector: ".settings-project-kit-grid", tolerance: 4 },
      { container: "closest:.settings-project-kit", selector: ".settings-project-kit-item", tolerance: 4 },
      { container: "closest:.settings-price-card", selector: ".settings-price-card .primary-button", tolerance: 4 },
      { container: "closest:.settings-plan-active-card", selector: ".settings-plan-active-card .settings-inline-link", tolerance: 4 },
      { container: "closest:.settings-plan-access-item", selector: ".settings-plan-access-item span", tolerance: 4 },
      { container: "closest:.settings-plan-access-item", selector: ".settings-plan-access-item strong", tolerance: 4 },
      { container: "closest:.settings-plan-access-item", selector: ".settings-plan-access-item small", tolerance: 4 },
    ],
  },
];

function normalizeBaseUrl(value) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(raw)) throw new Error(`Invalid base URL: ${raw}`);
  return raw;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function skip(message) {
  console.log(`SKIP ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function parseCsv(value, optionName) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) throw new Error(`${optionName} requires at least one value`);
  return items;
}

function parseWidthList(value, optionName) {
  return parseCsv(value, optionName).map((item) => {
    const width = Number.parseInt(item, 10);
    if (!Number.isFinite(width) || width < 320 || width > 4000) {
      throw new Error(`${optionName} contains an invalid viewport width: ${item}`);
    }
    return width;
  });
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equalsIndex = arg.indexOf("=");
    const name = equalsIndex >= 0 ? arg.slice(0, equalsIndex) : arg;
    const inlineValue = equalsIndex >= 0 ? arg.slice(equalsIndex + 1) : undefined;

    if (name === "--require-chrome") {
      options.requireChrome = true;
      continue;
    }

    if (name === "--require-signed-in-layout") {
      options.requireSignedInLayout = true;
      continue;
    }

    if (name === "--base-url" || name === "--site-url") {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
      options.baseUrl = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }

    if (name === "--chrome-path") {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
      options.chromePath = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }

    if (name === "--page" || name === "--pages") {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a comma-separated page name list`);
      options.pages = parseCsv(value, name).map((page) => page.toLowerCase());
      if (inlineValue === undefined) index += 1;
      continue;
    }

    if (name === "--width" || name === "--widths" || name === "--viewport") {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a comma-separated viewport width list`);
      options.widths = parseWidthList(value, name);
      if (inlineValue === undefined) index += 1;
      continue;
    }

    if (name === "--narrow-desktop-width" || name === "--narrow-desktop-widths") {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a comma-separated viewport width list`);
      options.narrowDesktopWidths = parseWidthList(value, name);
      if (inlineValue === undefined) index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function chromeCandidates(explicitPath) {
  const windowsCandidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const pathCandidates = [
    explicitPath,
    process.env.CHROME_PATH,
    process.env.GOOGLE_CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
  ].filter(Boolean);
  const commandCandidates = [
    "google-chrome",
    "google-chrome-stable",
    "chromium-browser",
    "chromium",
  ];

  return process.platform === "win32"
    ? [...pathCandidates, ...windowsCandidates, ...commandCandidates]
    : [...pathCandidates, ...commandCandidates, ...windowsCandidates];
}

function findChrome(explicitPath) {
  for (const candidate of chromeCandidates(explicitPath)) {
    if (candidate.includes("\\") || candidate.includes("/")) {
      if (existsSync(candidate)) return candidate;
      continue;
    }

    return candidate;
  }

  return "";
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === "object" && address?.port) resolve(address.port);
        else reject(new Error("Could not reserve a Chrome debug port"));
      });
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readBooleanEnv(name) {
  return ["1", "true", "yes"].includes((process.env[name] || "").trim().toLowerCase());
}

function firstNonEmptyEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

async function signInSmokeAccount() {
  const cookieFromEnv = process.env.ROLEFORGE_SMOKE_COOKIE?.trim();
  if (cookieFromEnv) return { cookie: cookieFromEnv, source: "ROLEFORGE_SMOKE_COOKIE" };

  const supabaseUrl = firstNonEmptyEnv("ROLEFORGE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = firstNonEmptyEnv(
    "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  const email = firstNonEmptyEnv("ROLEFORGE_SMOKE_EMAIL");
  const password = firstNonEmptyEnv("ROLEFORGE_SMOKE_PASSWORD");

  if (!email && !password) return null;
  if (!email || !password) throw new Error("ROLEFORGE_SMOKE_EMAIL and ROLEFORGE_SMOKE_PASSWORD must be configured together");
  if (!supabaseUrl) throw new Error("ROLEFORGE_SUPABASE_URL is required for signed-in layout smoke");
  if (!supabaseKey) throw new Error("ROLEFORGE_SUPABASE_PUBLISHABLE_KEY is required for signed-in layout smoke");

  const authUrl = new URL("/auth/v1/token", supabaseUrl);
  authUrl.searchParams.set("grant_type", "password");
  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "User-Agent": "RoleForge rendered layout smoke",
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase smoke sign-in failed with ${response.status}: ${text.slice(0, 160)}`);

  return { cookie: cookieHeaderFromSession(supabaseUrl, JSON.parse(text)), source: "ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD" };
}

async function fetchJsonWithRetry(url, attempts = 90) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError || "no response");
  throw new Error(`Could not fetch ${url} after ${attempts} attempts: ${reason}`);
}

async function openCdpPage(port, baseUrl) {
  const tabs = await fetchJsonWithRetry(`http://127.0.0.1:${port}/json`);
  const page = tabs.find((tab) => tab.type === "page") || tabs.find((tab) => tab.webSocketDebuggerUrl);
  if (!page?.webSocketDebuggerUrl) throw new Error("Chrome did not expose a page websocket");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  function send(method, params = {}) {
    const callId = ++id;
    socket.send(JSON.stringify({ id: callId, method, params }));
    return new Promise((resolve) => pending.set(callId, resolve));
  }

  await send("Page.enable");
  await send("Network.enable");
  await send("Runtime.enable");
  await send("Emulation.setScrollbarsHidden", { hidden: true });
  await send("Page.navigate", { url: `${baseUrl}/` });
  await delay(1000);

  return { send, close: () => socket.close() };
}

async function evaluateLayout(send, baseUrl, page, width, cookie, options = {}) {
  await send("Network.setExtraHTTPHeaders", { headers: cookie ? { Cookie: cookie } : {} });
  const themes = page.requiresAuth ? ["account"] : PUBLIC_THEMES;
  const reports = [];
  const viewportMode = options.viewportMode || "responsive";
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: options.mobile ?? width < 700,
  });

  for (const theme of themes) {
    const url = new URL(`${baseUrl}${page.path}`);
    if (theme !== "account") url.searchParams.set("theme", theme);
    await send("Page.navigate", { url: url.toString() });
    await delay(page.requiresAuth ? 3200 : 1800);

    const expression = `(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const selectors = ${JSON.stringify(page.selectors)};
    const textFitSelectors = ${JSON.stringify(page.textFitSelectors || [])};
    const noOverlapPairs = ${JSON.stringify(page.noOverlapPairs || [])};
    const containedSelectors = ${JSON.stringify(page.containedSelectors || [])};
    const anchorClearanceChecks = ${JSON.stringify(page.anchorClearanceChecks || [])};
    const maxHeightChecks = ${JSON.stringify(page.maxHeightChecks || [])};
    const failures = [];
    const viewportWidth = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - viewportWidth;

    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (!elements.length) {
        failures.push({ selector, reason: "missing" });
        continue;
      }

      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          failures.push({ selector, index, reason: "empty", width: rect.width, height: rect.height });
          return;
        }

        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          failures.push({
            selector,
            index,
            reason: "viewport-overflow",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            viewport: window.innerWidth,
            text: element.textContent.trim().slice(0, 80),
          });
        }
      });
    }

    for (const selector of textFitSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") return;

        const inlineOverflow = element.scrollWidth - element.clientWidth;
        const blockOverflow = element.scrollHeight - element.clientHeight;
        const clipped = style.overflow === "hidden" || style.overflowX === "hidden" || style.overflowY === "hidden";
        if (inlineOverflow > 3 || (clipped && blockOverflow > 3)) {
          failures.push({
            selector,
            index,
            reason: "text-clipped",
            inlineOverflow: Math.round(inlineOverflow),
            blockOverflow: Math.round(blockOverflow),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: element.textContent.trim().replace(/\\s+/g, " ").slice(0, 80),
          });
        }

        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          failures.push({
            selector,
            index,
            reason: "text-viewport-clipped",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            viewport: window.innerWidth,
            text: element.textContent.trim().replace(/\\s+/g, " ").slice(0, 80),
          });
        }
      });
    }

    for (const [leftSelector, rightSelector] of noOverlapPairs) {
      const left = document.querySelector(leftSelector);
      const right = document.querySelector(rightSelector);
      if (!left || !right) continue;

      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      const visible = leftRect.width > 0 && leftRect.height > 0 && rightRect.width > 0 && rightRect.height > 0;
      const verticalOverlap = Math.max(0, Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top));
      const horizontalOverlap = Math.max(0, Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left));
      if (visible && verticalOverlap > 20 && horizontalOverlap > 2) {
        failures.push({
          selector: leftSelector + " / " + rightSelector,
          reason: "overlap",
          horizontalOverlap: Math.round(horizontalOverlap),
          verticalOverlap: Math.round(verticalOverlap),
          leftRight: Math.round(leftRect.right),
          rightLeft: Math.round(rightRect.left),
        });
      }
    }

    for (const rule of containedSelectors) {
      const closestSelector = typeof rule.container === "string" && rule.container.startsWith("closest:")
        ? rule.container.slice("closest:".length)
        : "";
      const staticContainer = closestSelector ? null : document.querySelector(rule.container);
      if (!closestSelector && !staticContainer) continue;

      const tolerance = Number(rule.tolerance || 0);
      const elements = Array.from(document.querySelectorAll(rule.selector));
      elements.forEach((element, index) => {
        const container = closestSelector ? element.closest(closestSelector) : staticContainer;
        if (!container) {
          failures.push({
            selector: rule.selector,
            container: rule.container,
            index,
            reason: "container-missing",
            text: element.textContent.trim().replace(/\\s+/g, " ").slice(0, 80),
          });
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const outside =
          rect.left < containerRect.left - tolerance ||
          rect.right > containerRect.right + tolerance ||
          rect.top < containerRect.top - tolerance ||
          rect.bottom > containerRect.bottom + tolerance;
        if (outside) {
          failures.push({
            selector: rule.selector,
            container: rule.container,
            index,
            reason: "contained-overflow",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            containerLeft: Math.round(containerRect.left),
            containerRight: Math.round(containerRect.right),
            containerTop: Math.round(containerRect.top),
            containerBottom: Math.round(containerRect.bottom),
          });
        }
      });
    }

    for (const rule of anchorClearanceChecks) {
      if (rule.minWidth && window.innerWidth < Number(rule.minWidth)) continue;
      if (rule.maxWidth && window.innerWidth > Number(rule.maxWidth)) continue;
      const anchor = document.querySelector(rule.anchor);
      const target = document.querySelector(rule.selector);
      const guard = document.querySelector(rule.guard || ".nav");
      if (!anchor || !target || !guard) {
        failures.push({
          selector: rule.selector,
          anchor: rule.anchor,
          reason: "anchor-clearance-missing",
          anchorFound: Boolean(anchor),
          targetFound: Boolean(target),
          guardFound: Boolean(guard),
        });
        continue;
      }

      anchor.scrollIntoView({ block: "start", inline: "nearest" });
      const targetRect = target.getBoundingClientRect();
      const guardRect = guard.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const anchorStyle = window.getComputedStyle(anchor);
      const minGap = Number(rule.minGap || 0);
      const requiredTop = guardRect.bottom + minGap;
      if (targetRect.top < requiredTop) {
        failures.push({
          selector: rule.selector,
          anchor: rule.anchor,
          reason: "anchor-covered-by-sticky-guard",
          top: Math.round(targetRect.top),
          requiredTop: Math.round(requiredTop),
          guardBottom: Math.round(guardRect.bottom),
          anchorTop: Math.round(anchorRect.top),
          anchorWidth: Math.round(anchorRect.width),
          anchorPaddingTop: anchorStyle.paddingTop,
          anchorPaddingBlockStart: anchorStyle.paddingBlockStart,
          minGap,
          text: target.textContent.trim().replace(/\\s+/g, " ").slice(0, 80),
        });
      }
    }

    for (const rule of maxHeightChecks) {
      if (rule.minWidth && window.innerWidth < Number(rule.minWidth)) continue;
      if (rule.maxWidth && window.innerWidth > Number(rule.maxWidth)) continue;
      const element = document.querySelector(rule.selector);
      if (!element) {
        failures.push({ selector: rule.selector, reason: "max-height-missing" });
        continue;
      }

      const rect = element.getBoundingClientRect();
      const maxHeight = Number(rule.maxHeight || 0);
      if (rect.height > maxHeight) {
        failures.push({
          selector: rule.selector,
          reason: "too-tall-at-desktop-zoom",
          height: Math.round(rect.height),
          maxHeight,
          viewport: window.innerWidth,
        });
      }
    }

    return JSON.stringify({
      page: ${JSON.stringify(page.name)},
      theme: ${JSON.stringify(theme)},
      viewportMode: ${JSON.stringify(viewportMode)},
      width: window.innerWidth,
      overflow,
      failures,
    });
  })()`;

    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (result.error) throw new Error(result.error.message);
    if (result.result.exceptionDetails) {
      throw new Error(
        result.result.exceptionDetails.exception?.description ||
          result.result.exceptionDetails.exception?.value ||
          result.result.exceptionDetails.text ||
          "Rendered layout evaluation failed",
      );
    }
    reports.push(JSON.parse(result.result.result.value));
  }
  return reports;
}

async function evaluatePreviewTabs(send, baseUrl, cookie) {
  if (!cookie) return [];

  await send("Network.setExtraHTTPHeaders", { headers: { Cookie: cookie } });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `${baseUrl}/app` });
  await delay(3200);

  const expression = `(async () => {
    const checks = [
      { mode: "tailored", id: "preview-tab-tailored", labels: ["Draft", "Keywords", "Export"] },
      { mode: "original", id: "preview-tab-original", labels: ["Source", "File", "State"] },
      { mode: "diff", id: "preview-tab-diff", labels: ["Original", "Tailored", "Notes"] },
    ];
    const failures = [];

    for (const check of checks) {
      const button = document.getElementById(check.id);
      if (!button) {
        failures.push({ selector: "#" + check.id, reason: "missing" });
        continue;
      }

      button.click();
      await new Promise((resolve) => setTimeout(resolve, 250));

      const panel = document.getElementById("preview-panel");
      if (!panel) {
        failures.push({ selector: "#preview-panel", reason: "missing" });
        continue;
      }

      if (panel.getAttribute("data-preview-mode") !== check.mode) {
        failures.push({
          selector: "#preview-panel",
          reason: "preview-mode-not-restored",
          expected: check.mode,
          actual: panel.getAttribute("data-preview-mode"),
        });
      }

      if (panel.getAttribute("aria-labelledby") !== check.id) {
        failures.push({
          selector: "#preview-panel",
          reason: "tabpanel-label-mismatch",
          expected: check.id,
          actual: panel.getAttribute("aria-labelledby"),
        });
      }

      if (button.getAttribute("aria-selected") !== "true") {
        failures.push({ selector: "#" + check.id, reason: "tab-not-selected" });
      }

      const labels = Array.from(panel.querySelectorAll(".rf-preview-status strong"))
        .map((element) => element.textContent.trim())
        .filter(Boolean);
      for (const label of check.labels) {
        if (!labels.includes(label)) {
          failures.push({
            selector: "#preview-panel",
            reason: "status-label-missing",
            mode: check.mode,
            label,
            labels,
          });
        }
      }
    }

    return JSON.stringify({
      page: "signed-in studio preview tabs",
      theme: "account",
      width: window.innerWidth,
      failures,
    });
  })()`;

  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.error) throw new Error(result.error.message);
  if (result.result.exceptionDetails) {
    throw new Error(result.result.exceptionDetails.text || "Preview tab interaction evaluation failed");
  }
  return [JSON.parse(result.result.result.value)];
}

async function evaluateHistoryRestore(send, baseUrl, cookie) {
  if (!cookie) return [];

  const smokeRunId = `roleforge-layout-history-${Date.now()}`;
  const smokeFilename = "roleforge-layout-smoke.pdf";
  const smokeTarget = "RoleForge layout smoke restore target";

  await send("Network.setExtraHTTPHeaders", { headers: { Cookie: cookie } });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `${baseUrl}/app` });
  await delay(3200);

  const seedExpression = `(() => {
    try {
    const run = {
      id: ${JSON.stringify(smokeRunId)},
      createdAt: "2026-05-30T12:00:00.000Z",
      filename: ${JSON.stringify(smokeFilename)},
      mode: "balanced",
      score: 91,
      downloadUrl: "/api/workflow/download/roleforge-layout-smoke.pdf",
      downloadFormat: "pdf",
      downloads: { pdf: "/api/workflow/download/roleforge-layout-smoke.pdf" },
      roleHint: ${JSON.stringify(smokeTarget)},
      saved: false,
      source: "local",
      snapshot: {
        sourcePreviewText: "RoleForge layout smoke original resume source.",
        jdText: ${JSON.stringify(smokeTarget)},
        inputMode: "text",
        tailoringMode: "balanced",
        downloadUrl: "/api/workflow/download/roleforge-layout-smoke.pdf",
        downloadFormat: "pdf",
        downloads: { pdf: "/api/workflow/download/roleforge-layout-smoke.pdf" },
        templateSlug: "classic",
        templateName: "Classic",
        uploadMeta: {
          resume_id: ${JSON.stringify(smokeRunId)},
          filename: ${JSON.stringify(smokeFilename)},
          format: "pdf",
          character_count: 48,
          text_preview: "RoleForge layout smoke original resume source.",
          text_preview_truncated: false
        },
        result: {
          run_id: ${JSON.stringify(smokeRunId)},
          tailored_text: "RoleForge smoke tailored draft restored into the studio.",
          tailoring_mode: "balanced",
          score_summary: { fit_after: 91, ats_after: 93, fit_delta: 12, issues_resolved: 2 },
          change_log: [
            "Layout smoke restored a saved run",
            "Layout smoke improved keyword coverage"
          ],
          suggestions: ["Review the restored draft before exporting"],
          ats_before: { issues: [] },
          ats_after: { issues: [] }
        }
      }
    };
    localStorage.setItem("resume-tailor-history-v1", JSON.stringify([run]));
    localStorage.setItem("roleforge-synced-history-v1", JSON.stringify([]));
    return localStorage.getItem("resume-tailor-history-v1");
    } catch (error) {
      console.warn("RoleForge layout smoke history seed failed", error);
      return "";
    }
  })()`;
  const seedResult = await send("Runtime.evaluate", { expression: seedExpression, returnByValue: true });
  if (seedResult.error) throw new Error(seedResult.error.message);
  if (seedResult.result.exceptionDetails) {
    throw new Error(seedResult.result.exceptionDetails.text || "History seed evaluation failed");
  }
  const seededHistory = seedResult.result.result.value || "";
  if (!seededHistory.includes(smokeFilename)) {
    throw new Error(`History seed did not persist before reload: ${String(seededHistory).slice(0, 180)}`);
  }

  const historyUrl = new URL(`${baseUrl}/app`);
  historyUrl.searchParams.set("layoutSmokeHistory", smokeRunId);
  historyUrl.hash = "history";
  await send("Page.navigate", { url: historyUrl.toString() });
  await delay(1600);

  const expression = `(async () => {
    const failures = [];
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\\s+/g, " ").trim() || "";
    const smokeFilename = ${JSON.stringify(smokeFilename)};
    const smokeTarget = ${JSON.stringify(smokeTarget)};
    const waitFor = async (selector, timeout = 9000) => {
      const deadline = performance.now() + timeout;
      let element = document.querySelector(selector);
      while (!element && performance.now() < deadline) {
        await wait(125);
        element = document.querySelector(selector);
      }
      return element;
    };
    const waitForText = async (needle, timeout = 9000) => {
      const deadline = performance.now() + timeout;
      while (performance.now() < deadline) {
        if ((document.body.textContent || "").includes(needle)) return true;
        await wait(125);
      }
      return false;
    };

    const appShell = await waitFor(".rf-studio-page");
    if (!appShell) {
      failures.push({
        selector: ".rf-studio-page",
        reason: "signed-in-app-not-rendered",
        href: location.href,
        readyState: document.readyState,
        text: (document.body.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 220),
      });
      return JSON.stringify({
        page: "signed-in history restore",
        theme: "account",
        width: window.innerWidth,
        failures,
      });
    }

    const historyPanel = await waitFor(".studio-history-panel");
    if (!historyPanel) failures.push({ selector: ".studio-history-panel", reason: "missing" });

    if (!(await waitForText(smokeFilename))) {
      failures.push({
        selector: ".history-project-list",
        reason: "seeded-run-missing",
        href: location.href,
        storage: localStorage.getItem("resume-tailor-history-v1")?.slice(0, 180) || "",
        text: (document.body.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 220),
      });
    }

    await waitFor(".history-action-details");
    const detailsButton = Array.from(document.querySelectorAll(".history-action-details"))
      .find((button) => button.getAttribute("aria-label")?.includes(smokeFilename));
    if (!detailsButton) {
      failures.push({
        selector: ".history-action-details",
        reason: "missing",
        actions: Array.from(document.querySelectorAll(".history-actions button, .history-actions a"))
          .map((button) => button.textContent.trim().replace(/\\s+/g, " "))
          .slice(0, 8),
      });
    } else {
      detailsButton.click();
      await wait(450);
      const detailPanel = document.querySelector(".history-detail-panel");
      if (!detailPanel) failures.push({ selector: ".history-detail-panel", reason: "missing-after-details-click" });
      else if (!detailPanel.textContent.includes(smokeTarget)) {
        failures.push({ selector: ".history-detail-panel", reason: "wrong-detail-content", text: detailPanel.textContent.slice(0, 180) });
      }
    }

    const restoreButton = Array.from(document.querySelectorAll(".history-action-restore"))
      .find((button) => button.getAttribute("aria-label")?.includes(smokeFilename));
    if (!restoreButton) {
      failures.push({
        selector: ".history-action-restore",
        reason: "missing",
        actions: Array.from(document.querySelectorAll(".history-actions button, .history-actions a"))
          .map((button) => button.textContent.trim().replace(/\\s+/g, " "))
          .slice(0, 8),
      });
    } else if (restoreButton.disabled) {
      failures.push({ selector: ".history-action-restore", reason: "disabled" });
    } else {
      restoreButton.click();
      await waitForText("Saved run restored", 6000);
      const heroTitle = document.querySelector(".rf-studio-hero h1");
      const previewPanel = document.getElementById("preview-panel");
      if (!heroTitle?.getAttribute("title")?.includes("roleforge-layout-smoke")) {
        failures.push({ selector: ".rf-studio-hero h1", reason: "restore-did-not-update-title", text: heroTitle?.textContent || "" });
      }
      if (!text(".rf-studio-hero").includes("Saved run restored")) {
        failures.push({ selector: ".rf-studio-hero", reason: "restore-detail-missing", text: text(".rf-studio-hero") });
      }
      if (previewPanel?.getAttribute("data-preview-mode") !== "tailored") {
        failures.push({ selector: "#preview-panel", reason: "restore-did-not-open-tailored-preview", actual: previewPanel?.getAttribute("data-preview-mode") || "(missing)" });
      }
      if (!document.body.textContent.includes("RoleForge smoke tailored draft restored into the studio.")) {
        failures.push({ selector: "#preview-panel", reason: "restored-tailored-text-missing" });
      }

      const suggestionsPanel = document.querySelector("#suggestions");
      if (!suggestionsPanel) {
        failures.push({ selector: "#suggestions", reason: "missing" });
      } else {
        const suggestionCards = Array.from(suggestionsPanel.querySelectorAll(".suggestion"));
        if (suggestionCards.length < 3) {
          failures.push({ selector: "#suggestions .suggestion", reason: "seeded-suggestions-missing", count: suggestionCards.length });
        }

        if (!suggestionsPanel.textContent.includes("0/3 reviewed")) {
          failures.push({ selector: ".suggestion-review-status", reason: "initial-review-summary-missing", text: suggestionsPanel.textContent.slice(0, 220) });
        }

        const firstReviewedButton = suggestionCards[0]?.querySelector(".suggestion-decision-button.reviewed");
        if (!firstReviewedButton) {
          failures.push({ selector: ".suggestion-decision-button.reviewed", reason: "missing" });
        } else {
          firstReviewedButton.click();
          await wait(250);
          if (!suggestionsPanel.textContent.includes("1/3 reviewed")) {
            failures.push({ selector: ".suggestion-review-status", reason: "reviewed-summary-not-updated", text: suggestionsPanel.textContent.slice(0, 220) });
          }
          if (!suggestionCards[0]?.classList.contains("reviewed")) {
            failures.push({ selector: "#suggestions .suggestion:first-child", reason: "reviewed-card-state-missing" });
          }
        }

        const secondEditButton = suggestionCards[1]?.querySelector(".suggestion-decision-button.edit");
        if (!secondEditButton) {
          failures.push({ selector: ".suggestion-decision-button.edit", reason: "missing" });
        } else {
          secondEditButton.click();
          await wait(250);
          if (!suggestionsPanel.textContent.includes("1/3 reviewed · 1 to edit")) {
            failures.push({ selector: ".suggestion-review-status", reason: "edit-summary-not-updated", text: suggestionsPanel.textContent.slice(0, 220) });
          }
          if (!suggestionCards[1]?.classList.contains("edit")) {
            failures.push({ selector: "#suggestions .suggestion:nth-child(2)", reason: "edit-card-state-missing" });
          }
        }

        const viewChangesButton = Array.from(suggestionCards[0]?.querySelectorAll("button") || [])
          .find((button) => button.textContent.includes("View changes"));
        if (!viewChangesButton) {
          failures.push({ selector: "#suggestions button", reason: "view-changes-button-missing" });
        } else {
          viewChangesButton.click();
          await wait(450);
          const previewPanelAfterSuggestionClick = document.getElementById("preview-panel");
          if (previewPanelAfterSuggestionClick?.getAttribute("data-preview-mode") !== "diff") {
            failures.push({
              selector: "#preview-panel",
              reason: "suggestion-view-changes-did-not-open-diff",
              actual: previewPanelAfterSuggestionClick?.getAttribute("data-preview-mode") || "(missing)",
            });
          }
        }

        const newResumeButton = Array.from(document.querySelectorAll("button"))
          .find((button) => button.textContent.replace(/\\s+/g, " ").trim().includes("New resume"));
        if (!newResumeButton) {
          failures.push({ selector: "button", reason: "new-resume-button-missing" });
        } else {
          newResumeButton.click();
          await waitForText("Suggestions are waiting", 6000);
          if (document.querySelector("#suggestions .suggestion.reviewed, #suggestions .suggestion.edit")) {
            failures.push({ selector: "#suggestions .suggestion", reason: "review-state-carried-into-new-resume" });
          }
          if (!document.querySelector("#suggestions .empty-state")) {
            failures.push({ selector: "#suggestions .empty-state", reason: "new-resume-suggestions-empty-state-missing" });
          }
        }
      }
    }

    return JSON.stringify({
      page: "signed-in history restore",
      theme: "account",
      width: window.innerWidth,
      failures,
    });
  })()`;

  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.error) throw new Error(result.error.message);
  if (result.result.exceptionDetails) {
    throw new Error(result.result.exceptionDetails.text || "History restore interaction evaluation failed");
  }
  return [JSON.parse(result.result.result.value)];
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const baseUrl = normalizeBaseUrl(args.baseUrl || process.env.ROLEFORGE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
  const chromePath = findChrome(args.chromePath);
  const pageFilters = new Set(args.pages || []);
  const pageChecks = pageFilters.size
    ? PAGE_CHECKS.filter((pageCheck) => pageFilters.has(pageCheck.name.toLowerCase()) || pageFilters.has(pageCheck.path.toLowerCase()))
    : PAGE_CHECKS;
  if (!pageChecks.length) {
    throw new Error(`No layout smoke pages matched: ${Array.from(pageFilters).join(", ")}`);
  }
  const viewportWidths = args.widths || VIEWPORTS;
  const narrowDesktopWidths = args.narrowDesktopWidths || NARROW_DESKTOP_VIEWPORTS;
  const requireSignedInLayout = args.requireSignedInLayout ?? readBooleanEnv("ROLEFORGE_REQUIRE_SIGNED_IN_LAYOUT_SMOKE");
  const signedInSession = await signInSmokeAccount();
  if (signedInSession) pass(`signed-in layout smoke configured with ${signedInSession.source}`);
  else if (requireSignedInLayout) throw new Error("Signed-in layout smoke requires ROLEFORGE_SMOKE_COOKIE or ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD");
  else skip("signed-in layout smoke skipped because smoke account credentials are not configured");

  const userDataDir = mkdtempSync(join(tmpdir(), "roleforge-layout-smoke-"));
  const port = await freePort();
  let chrome = null;

  try {
    chrome = spawn(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--hide-scrollbars",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      "--window-size=1712,1200",
      `--user-data-dir=${userDataDir}`,
      `${baseUrl}/`,
    ], { stdio: "ignore" });

    chrome.on("error", (error) => {
      if (args.requireChrome) fail(`Chrome could not start: ${error.message}`);
    });

    const page = await openCdpPage(port, baseUrl);
    try {
      const reports = [];
      for (const pageCheck of pageChecks) {
        if (pageCheck.requiresAuth && !signedInSession?.cookie) continue;
        for (const width of viewportWidths) {
          console.log(`CHECK ${pageCheck.name} width=${width}`);
          reports.push(
            ...(await evaluateLayout(page.send, baseUrl, pageCheck, width, pageCheck.requiresAuth ? signedInSession.cookie : "")),
          );
        }
        if (!pageCheck.requiresAuth) {
          for (const width of narrowDesktopWidths) {
            console.log(`CHECK ${pageCheck.name} narrow-desktop width=${width}`);
            reports.push(
              ...(await evaluateLayout(page.send, baseUrl, pageCheck, width, "", { mobile: false, viewportMode: "narrow-desktop" })),
            );
          }
        }
      }
      const interactionReports = signedInSession?.cookie
        ? [
            ...(await evaluatePreviewTabs(page.send, baseUrl, signedInSession.cookie)),
            ...(await evaluateHistoryRestore(page.send, baseUrl, signedInSession.cookie)),
          ]
        : [];

      const failures = [...reports, ...interactionReports].flatMap((report) => {
        const pageFailures = [...report.failures];
        if (report.overflow > 1) {
          pageFailures.unshift({ reason: "document-overflow", overflow: report.overflow });
        }
        return pageFailures.map((failure) => ({
          ...failure,
          page: report.page,
          theme: report.theme,
          viewportMode: report.viewportMode,
          viewportWidth: report.width,
        }));
      });

      if (failures.length) {
        throw new Error(`Rendered layout smoke found ${failures.length} issue(s): ${JSON.stringify(failures.slice(0, 8))}`);
      }

      const checkedPageCount = new Set(reports.map((report) => report.page)).size;
      const interactionLabel = interactionReports.length ? " with preview tab interactions" : "";
      pass(`rendered layout smoke passed ${checkedPageCount} pages across ${viewportWidths.length} responsive widths and ${narrowDesktopWidths.length} narrow desktop widths${interactionLabel}`);
    } finally {
      page.close();
    }
  } catch (error) {
    if (!args.requireChrome && /spawn|fetch failed|ECONNREFUSED|ENOENT/i.test(error instanceof Error ? error.message : String(error))) {
      skip(`rendered layout smoke skipped because Chrome was unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    if (chrome && !chrome.killed) chrome.kill();
    await delay(500);
    try {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 });
    } catch (error) {
      skip(`Chrome profile cleanup skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

await main();
