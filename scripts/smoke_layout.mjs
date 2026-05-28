#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";
const VIEWPORTS = [390, 768, 1024, 1366, 1712];
const PAGE_CHECKS = [
  {
    path: "/",
    name: "landing",
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
  await send("Runtime.enable");
  await send("Emulation.setScrollbarsHidden", { hidden: true });
  await send("Page.navigate", { url: `${baseUrl}/` });
  await delay(1000);

  return { send, close: () => socket.close() };
}

async function evaluateLayout(send, baseUrl, page, width) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send("Page.navigate", { url: `${baseUrl}${page.path}` });
  await delay(1800);

  const expression = `(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const selectors = ${JSON.stringify(page.selectors)};
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

    return JSON.stringify({
      page: ${JSON.stringify(page.name)},
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
  return JSON.parse(result.result.result.value);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const baseUrl = normalizeBaseUrl(args.baseUrl || process.env.ROLEFORGE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
  const chromePath = findChrome(args.chromePath);
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
        for (const width of VIEWPORTS) {
          const report = await evaluateLayout(page.send, baseUrl, pageCheck, width);
          reports.push(report);
        }
      }

      const failures = reports.flatMap((report) => {
        const pageFailures = [...report.failures];
        if (report.overflow > 1) {
          pageFailures.unshift({ reason: "document-overflow", overflow: report.overflow });
        }
        return pageFailures.map((failure) => ({ ...failure, page: report.page, width: report.width }));
      });

      if (failures.length) {
        throw new Error(`Rendered layout smoke found ${failures.length} issue(s): ${JSON.stringify(failures.slice(0, 8))}`);
      }

      pass(`rendered layout smoke passed ${PAGE_CHECKS.length} pages across ${VIEWPORTS.length} viewport widths`);
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
