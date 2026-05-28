#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { cookieHeaderFromSession } from "./smoke_frontend.mjs";

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";
const VIEWPORTS = [390, 768, 1024, 1366, 1712];
const PUBLIC_THEMES = ["light", "dark"];
const PAGE_CHECKS = [
  {
    path: "/",
    name: "landing",
    noOverlapPairs: [
      [".hero-copy", ".hero-stage"],
      [".cta-band > div:first-child", ".cta-visual"],
    ],
    selectors: [
      ".nav",
      ".hero",
      ".hero-copy",
      ".hero-stage",
      ".steps",
      ".dash-mock",
      ".pricing-grid",
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
      ".dash-stat-value",
      ".price-card .btn",
      ".cta-band h2",
      ".cta-band p",
      ".cta-band .btn",
    ],
  },
  {
    path: "/templates",
    name: "templates",
    selectors: [".templates-page-hero", ".templates-page-actions", ".templates-selection-status", ".templates-page-grid"],
  },
  {
    path: "/login?next=%2Fapp&account=signin-required",
    name: "login",
    selectors: [".login-nav", ".login-panel", ".login-copy", ".login-card", ".studio-oauth-button"],
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
      ".export-format-chip",
      ".export-format-chip small",
      ".studio-tabs-mini button",
      ".preview-tab-state",
      ".rf-preview-status span",
      ".rf-intake-card-header",
      ".rf-file-drop strong",
      ".history-actions .ghost-button",
      ".history-export-actions .btn",
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
    ],
    textFitSelectors: [
      ".settings-page-actions .btn",
      ".settings-page-nav a",
      ".settings-status-pill",
      ".settings-plan-includes span",
      ".settings-profile-row span",
      ".settings-metric strong",
      ".settings-metric span",
      ".settings-project-item small",
      ".settings-profile-actions .primary-button",
      ".settings-profile-actions .ghost-button",
      ".settings-export-item span",
      ".settings-export-item small",
      ".settings-export-actions .btn",
      ".settings-billing-head .ghost-button",
      ".settings-plan-active-card .settings-inline-link",
      ".settings-section-copy h2",
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

async function fetchJsonWithRetry(url, attempts = 30) {
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
  throw lastError || new Error(`Could not fetch ${url}`);
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

async function evaluateLayout(send, baseUrl, page, width, cookie) {
  await send("Network.setExtraHTTPHeaders", { headers: cookie ? { Cookie: cookie } : {} });
  const themes = page.requiresAuth ? ["account"] : PUBLIC_THEMES;
  const reports = [];
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });

  for (const theme of themes) {
    const url = new URL(`${baseUrl}${page.path}`);
    if (theme !== "account") url.searchParams.set("theme", theme);
    await send("Page.navigate", { url: url.toString() });
    await delay(1800);

    const expression = `(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const selectors = ${JSON.stringify(page.selectors)};
    const textFitSelectors = ${JSON.stringify(page.textFitSelectors || [])};
    const noOverlapPairs = ${JSON.stringify(page.noOverlapPairs || [])};
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

    return JSON.stringify({
      page: ${JSON.stringify(page.name)},
      theme: ${JSON.stringify(theme)},
      width: window.innerWidth,
      overflow,
      failures,
    });
  })()`;

    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (result.error) throw new Error(result.error.message);
    if (result.result.exceptionDetails) {
      throw new Error(result.result.exceptionDetails.text || "Rendered layout evaluation failed");
    }
    reports.push(JSON.parse(result.result.result.value));
  }
  return reports;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const baseUrl = normalizeBaseUrl(args.baseUrl || process.env.ROLEFORGE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
  const chromePath = findChrome(args.chromePath);
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
      for (const pageCheck of PAGE_CHECKS) {
        if (pageCheck.requiresAuth && !signedInSession?.cookie) continue;
        for (const width of VIEWPORTS) {
          reports.push(
            ...(await evaluateLayout(page.send, baseUrl, pageCheck, width, pageCheck.requiresAuth ? signedInSession.cookie : "")),
          );
        }
      }

      const failures = reports.flatMap((report) => {
        const pageFailures = [...report.failures];
        if (report.overflow > 1) {
          pageFailures.unshift({ reason: "document-overflow", overflow: report.overflow });
        }
        return pageFailures.map((failure) => ({ ...failure, page: report.page, theme: report.theme, width: report.width }));
      });

      if (failures.length) {
        throw new Error(`Rendered layout smoke found ${failures.length} issue(s): ${JSON.stringify(failures.slice(0, 8))}`);
      }

      const checkedPageCount = new Set(reports.map((report) => report.page)).size;
      pass(`rendered layout smoke passed ${checkedPageCount} pages across ${VIEWPORTS.length} viewport widths`);
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
    await delay(300);
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

await main();
