#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";
const DEFAULT_BACKEND_URL = "https://roleforge-api-224015900616.us-central1.run.app";
const SUPABASE_COOKIE_CHUNK_SIZE = 3180;

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

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    body: options.body,
    redirect: options.redirect || "manual",
    headers: {
      "User-Agent": "RoleForge frontend smoke",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return { response, text };
}

function firstNonEmptyEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function supabaseStorageKey(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split(".")[0];
  if (!projectRef) throw new Error(`Could not derive Supabase project ref from ${supabaseUrl}`);
  return `sb-${projectRef}-auth-token`;
}

export function createCookieChunks(key, value) {
  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= SUPABASE_COOKIE_CHUNK_SIZE) return [{ name: key, value }];

  const chunks = [];
  let remaining = encodedValue;
  while (remaining.length > 0) {
    let encodedChunkHead = remaining.slice(0, SUPABASE_COOKIE_CHUNK_SIZE);
    const lastEscapePos = encodedChunkHead.lastIndexOf("%");
    if (lastEscapePos > SUPABASE_COOKIE_CHUNK_SIZE - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos);
    }

    let valueHead = "";
    while (encodedChunkHead.length > 0) {
      try {
        valueHead = decodeURIComponent(encodedChunkHead);
        break;
      } catch (error) {
        if (error instanceof URIError && encodedChunkHead.at(-3) === "%" && encodedChunkHead.length > 3) {
          encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3);
          continue;
        }
        throw error;
      }
    }

    chunks.push(valueHead);
    remaining = remaining.slice(encodedChunkHead.length);
  }

  return chunks.map((chunk, index) => ({ name: `${key}.${index}`, value: chunk }));
}

export function cookieHeaderFromSession(supabaseUrl, session) {
  requireCondition(session?.access_token, "Supabase smoke sign-in did not return an access token");
  requireCondition(session?.refresh_token, "Supabase smoke sign-in did not return a refresh token");
  requireCondition(session?.user?.id, "Supabase smoke sign-in did not return a user");

  const key = supabaseStorageKey(supabaseUrl);
  const encoded = `base64-${base64UrlEncode(JSON.stringify(session))}`;
  return createCookieChunks(key, encoded).map(({ name, value }) => `${name}=${value}`).join("; ");
}

async function signInSmokeAccount() {
  const supabaseUrl = firstNonEmptyEnv("ROLEFORGE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = firstNonEmptyEnv(
    "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  const email = firstNonEmptyEnv("ROLEFORGE_SMOKE_EMAIL");
  const password = firstNonEmptyEnv("ROLEFORGE_SMOKE_PASSWORD");

  if (!email && !password) return "";
  requireCondition(email && password, "ROLEFORGE_SMOKE_EMAIL and ROLEFORGE_SMOKE_PASSWORD must be configured together");
  requireCondition(supabaseUrl, "ROLEFORGE_SUPABASE_URL is required for smoke account sign-in");
  requireCondition(supabaseKey, "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY is required for smoke account sign-in");

  const authUrl = new URL("/auth/v1/token", supabaseUrl);
  authUrl.searchParams.set("grant_type", "password");
  const result = await fetch(authUrl, {
    method: "POST",
    headers: {
      "User-Agent": "RoleForge frontend smoke",
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ email, password }),
  });
  const text = await result.text();
  requireCondition(result.ok, `Supabase smoke sign-in failed with ${result.status}: ${text.slice(0, 160)}`);

  const payload = JSON.parse(text);
  return cookieHeaderFromSession(supabaseUrl, payload);
}

export function parseCookieHeader(cookie) {
  const jar = new Map();
  for (const part of (cookie || "").split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    jar.set(trimmed.slice(0, separatorIndex), trimmed.slice(separatorIndex + 1));
  }
  return jar;
}

export function cookieHeaderFromJar(jar) {
  return Array.from(jar.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}

export function mergeSetCookieHeaders(cookie, response) {
  const getSetCookie = response.headers.getSetCookie;
  const headers = typeof getSetCookie === "function" ? getSetCookie.call(response.headers) : [];
  const fallback = response.headers.get("set-cookie");
  if (!headers.length && !fallback) return cookie;

  const jar = parseCookieHeader(cookie);
  for (const header of headers.length ? headers : [fallback]) {
    const firstPart = header.split(";")[0]?.trim();
    if (!firstPart) continue;
    const separatorIndex = firstPart.indexOf("=");
    if (separatorIndex <= 0) continue;
    const name = firstPart.slice(0, separatorIndex);
    const value = firstPart.slice(separatorIndex + 1);
    if (!value || /max-age=0/i.test(header)) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }

  return cookieHeaderFromJar(jar);
}

async function requestAbsolute(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    redirect: options.redirect || "manual",
    headers: {
      "User-Agent": "RoleForge frontend smoke",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return { response, text };
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireHeader(response, name, expected) {
  const value = response.headers.get(name) || "";
  if (expected instanceof RegExp) {
    requireCondition(expected.test(value), `${name} header was unexpected: ${value || "(missing)"}`);
    return;
  }

  requireCondition(value.toLowerCase() === expected.toLowerCase(), `${name} header was unexpected: ${value || "(missing)"}`);
}

function readBooleanEnv(name) {
  return ["1", "true", "yes"].includes((process.env[name] || "").trim().toLowerCase());
}

export function buildSmokeSavedRunPayload(overrides = {}) {
  const now = overrides.createdAt || new Date().toISOString();
  const uniqueSuffix = overrides.id || `roleforge-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: uniqueSuffix,
    createdAt: now,
    filename: "roleforge-smoke-resume.pdf",
    sourceResumeName: "roleforge-smoke-resume.pdf",
    jobTarget: "RoleForge smoke saved-project target",
    roleHint: "RoleForge smoke saved-project target",
    mode: "balanced",
    score: 88,
    atsScore: 91,
    keywordMatchCount: 5,
    readTimeSeconds: 42,
    downloadUrl: "/api/workflow/download/roleforge-smoke-tailored-resume.pdf",
    downloadFormat: "pdf",
    downloadFilename: "roleforge-smoke-tailored-resume.pdf",
    payload: {
      studioSnapshot: {
        sourcePreviewText: "Smoke source resume text",
        jdText: "RoleForge smoke saved-project target",
        inputMode: "text",
        tailoringMode: "balanced",
        downloadUrl: "/api/workflow/download/roleforge-smoke-tailored-resume.pdf",
        downloadFormat: "pdf",
        downloads: {
          pdf: "/api/workflow/download/roleforge-smoke-tailored-resume.pdf",
        },
        templateSlug: "classic",
        templateName: "Classic",
        uploadMeta: {
          resume_id: "roleforge-smoke-resume",
          filename: "roleforge-smoke-resume.pdf",
          format: "pdf",
          character_count: 24,
          text_preview: "Smoke source resume text",
        },
        result: {
          tailored_text: "Smoke tailored draft",
          change_log: ["Smoke saved-project roundtrip"],
          suggestions: [],
          ats_before: { issues: [] },
          ats_after: { issues: [] },
        },
      },
    },
    ...overrides,
  };
}

async function checkPublicShell(baseUrl) {
  const home = await request(baseUrl, "/", { redirect: "follow" });
  requireCondition(home.response.ok, `home returned ${home.response.status}`);
  requireCondition(home.text.includes("RoleForge AI"), "home did not include RoleForge AI brand copy");
  requireCondition(home.text.includes("/app"), "home did not include a studio route");
  pass("home page renders the RoleForge shell");

  requireHeader(home.response, "strict-transport-security", /^max-age=63072000; includeSubDomains; preload$/i);
  requireHeader(home.response, "x-content-type-options", "nosniff");
  requireHeader(home.response, "x-frame-options", "DENY");
  requireHeader(home.response, "referrer-policy", "strict-origin-when-cross-origin");
  requireHeader(home.response, "permissions-policy", /camera=\(\), microphone=\(\), geolocation=\(\)/i);
  pass("home page includes production security headers");

  const login = await request(baseUrl, "/login?next=%2Fapp&account=signin-required", { redirect: "follow" });
  requireCondition(login.response.ok, `login returned ${login.response.status}`);
  requireCondition(
    login.text.includes("Sign in to start tailoring resumes"),
    "login did not include the protected-studio sign-in copy",
  );
  pass("login page explains protected studio access");

  const templates = await request(baseUrl, "/templates", {
    redirect: "follow",
    cookie: "roleforge-template=engineer",
  });
  requireCondition(templates.response.ok, `templates returned ${templates.response.status}`);
  requireCondition(
    /Selected direction[\s\S]*?<strong>Engineer<\/strong>/.test(templates.text),
    "templates page did not render the cookie-selected resume direction",
  );
  pass("templates page respects the saved template direction");

  const stylesheetPaths = Array.from(home.text.matchAll(/href="([^"]+\.css[^"]*)"/g))
    .map((match) => match[1])
    .filter((path) => path.startsWith("/_next/static/"));
  requireCondition(stylesheetPaths.length > 0, "home did not include Next.js stylesheets");

  const stylesheetText = (
    await Promise.all(stylesheetPaths.map(async (path) => {
      const stylesheet = await requestAbsolute(new URL(path, baseUrl).toString(), { redirect: "follow" });
      requireCondition(stylesheet.response.ok, `stylesheet ${path} returned ${stylesheet.response.status}`);
      return stylesheet.text;
    }))
  ).join("\n");

  requireCondition(stylesheetText.includes(".dash-stat-value"), "landing dashboard stat styles were missing");
  requireCondition(/\.dash-mock\s*\{(?=[^}]*container-type:\s*inline-size)[^}]*\}/s.test(stylesheetText), "landing dashboard mock was missing container sizing");
  requireCondition(/\.dash-main\s*\{(?=[^}]*container:\s*dash-main\s*\/\s*inline-size)[^}]*\}/s.test(stylesheetText), "landing dashboard main column was missing named container sizing");
  requireCondition(/\.dash-stats\s*\{(?=[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "landing dashboard stats are missing stable desktop columns");
  requireCondition(/@container\s+dash-main\s*\(max-width:\s*1080px\)\s*\{[^}]*\.dash-stats\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s.test(stylesheetText), "landing dashboard stats do not collapse to two columns before cramped widths");
  requireCondition(/@container\s+dash-main\s*\(max-width:\s*460px\)\s*\{[^}]*\.dash-stats\s*\{[^}]*grid-template-columns:\s*1fr/s.test(stylesheetText), "landing dashboard stats do not collapse to one column on narrow widths");
  requireCondition(/\.dash-stat-value\s*\{(?=[^}]*font-size:\s*clamp\(1\.72rem,\s*7cqi,\s*2\.42rem\))(?=[^}]*overflow-wrap:\s*normal)(?=[^}]*word-break:\s*keep-all)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "landing dashboard stat values are not using overflow-safe fitted type");
  requireCondition(/@container\s+dash-stat\s*\(max-width:\s*250px\)\s*\{[^}]*\.dash-stat-value\s*\{[^}]*font-size:\s*clamp\(1\.55rem,\s*12cqi,\s*2rem\)/s.test(stylesheetText), "landing dashboard stat values are missing fitted type for compact cards");
  requireCondition(/@container\s+dash-stat\s*\(max-width:\s*210px\)\s*\{[^}]*\.dash-stat-value\s*\{[^}]*font-size:\s*clamp\(1\.38rem,\s*12cqi,\s*1\.72rem\)/s.test(stylesheetText), "landing dashboard stat values are missing fitted type for cramped cards");
  requireCondition(/\.dash-stat-delta\s*\{(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "landing dashboard stat captions can still force card overflow");
  requireCondition(/min-block-size:\s*clamp\(126px,\s*16cqi,\s*146px\)/.test(stylesheetText), "landing dashboard stats were missing stable card height");
  requireCondition(
    /\.dash-mock-url\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)(?=[^}]*text-overflow:\s*ellipsis)[^}]*\}/s.test(stylesheetText),
    "landing dashboard URL bar can still overflow on narrow screens",
  );
  pass("landing dashboard stat cards include overflow-safe styles");

  requireCondition(stylesheetText.includes(".nav-cta-short"), "landing mobile nav compact CTA styles were missing");
  requireCondition(/\.nav-link-secondary,\s*\.nav-link-account,\s*\.nav-divider\s*\{\s*display:\s*none/.test(stylesheetText), "landing mobile nav still exposes full navigation links");
  requireCondition(/\.nav\s+\.btn-brand\s*\{[^}]*min-width:\s*0/.test(stylesheetText), "landing mobile nav CTA can still force header overflow");
  requireCondition(/@media\s*\(max-width:\s*355px\)/.test(stylesheetText), "landing nav was missing narrow-phone overflow protection");
  requireCondition(!home.text.includes("The&nbsp;resume&nbsp;that"), "landing hero headline still prevents narrow-phone wrapping");
  pass("landing mobile nav includes compact one-row styles");

  requireCondition(/@media\s*\(max-width:\s*1040px\)[\s\S]*?\.login-panel\s*\{[^}]*grid-template-columns:\s*1fr/.test(stylesheetText), "login page can still stay cramped at tablet widths");
  pass("login page includes tablet-width stack protection");

  requireCondition(/\.settings-section-panel\s*\{(?=[^}]*container-type:\s*inline-size)[^}]*\}/s.test(stylesheetText), "settings panels were missing container sizing");
  requireCondition(/\.settings-metric\s*\{(?=[^}]*container-type:\s*inline-size)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "settings metric cards can still overflow their panel");
  requireCondition(/\.settings-metric\s+strong\s*\{(?=[^}]*font-size:\s*clamp\(1\.32rem,\s*13cqi,\s*1\.7rem\))(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings metric display text is not using balanced container-aware type");
  requireCondition(/\.settings-status-pill\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings status pills can still force narrow layout overflow");
  requireCondition(/\.settings-plan-includes\s+span\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings plan chips can still force narrow layout overflow");
  pass("settings cards include overflow-safe plan and metric styles");

  requireCondition(
    /\.studio-top-button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*justify-content:\s*center)[^}]*\}/s.test(stylesheetText),
    "studio top action buttons can still force header overflow",
  );
  requireCondition(
    /@media\s*\(max-width:\s*720px\)[\s\S]*?\.studio-top-button\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-align:\s*center)[^}]*\}/.test(stylesheetText),
    "studio top action buttons can still overflow on mobile",
  );
  requireCondition(
    /@media\s*\(max-width:\s*720px\)[\s\S]*?\.studio-hero-actions\s+\.ghost-button,\s*\.studio-hero-actions\s+\.primary-button\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*line-height:\s*1\.12)[^}]*\}/.test(stylesheetText),
    "studio hero action buttons can still overflow on mobile",
  );
  pass("studio action buttons include narrow-width wrapping safeguards");

  requireCondition(/\.faq-q\s*\{[^}]*min-height:\s*44px/.test(stylesheetText), "FAQ rows are missing comfortable touch targets");
  requireCondition(/\.login-nav-actions\s+\.btn-sm\s*\{[^}]*min-height:\s*44px/.test(stylesheetText), "login nav actions are missing comfortable touch targets");
  pass("public interactive elements include touch-target polish");
}

async function checkAnonymousGate(baseUrl) {
  const app = await request(baseUrl, "/app");
  requireCondition([301, 302, 303, 307, 308].includes(app.response.status), `anonymous /app returned ${app.response.status}`);
  const location = app.response.headers.get("location") || "";
  requireCondition(
    location.includes("/login") && location.includes("account=signin-required"),
    `anonymous /app redirected to unexpected location: ${location}`,
  );
  pass("anonymous studio access redirects to sign-in");
}

async function checkAnonymousAccountDataGate(baseUrl) {
  const settings = await request(baseUrl, "/settings");
  requireCondition([301, 302, 303, 307, 308].includes(settings.response.status), `anonymous /settings returned ${settings.response.status}`);
  const settingsLocation = settings.response.headers.get("location") || "";
  requireCondition(
    settingsLocation.includes("/login") && settingsLocation.includes("next=/settings") && settingsLocation.includes("account=signin-required"),
    `anonymous /settings redirected to unexpected location: ${settingsLocation}`,
  );

  const protectedRoutes = [
    ["saved runs list", "GET", "/api/saved-runs", {}],
    ["saved runs save", "POST", "/api/saved-runs", {
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }],
    ["saved runs rename", "PATCH", "/api/saved-runs/smoke-project", {
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }],
    ["saved runs delete", "DELETE", "/api/saved-runs/smoke-project", {}],
    ["workflow download", "GET", "/api/workflow/download/smoke.pdf", {}],
    ["workflow download head", "HEAD", "/api/workflow/download/smoke.pdf", {}],
  ];

  for (const [name, method, path, options] of protectedRoutes) {
    const result = await request(baseUrl, path, { method, ...options });
    requireCondition(result.response.status === 401, `anonymous ${name} returned ${result.response.status}`);
    if (method !== "HEAD") {
      requireCondition(result.text.includes("Sign in again"), `anonymous ${name} returned unexpected body: ${result.text.slice(0, 120)}`);
    }
  }

  pass("anonymous settings, saved projects, and downloads require sign-in");
}

async function checkAnonymousBillingGate(baseUrl) {
  const protectedRoutes = [
    ["checkout", {
      body: new URLSearchParams({ interval: "month" }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }],
    ["portal", {}],
  ];

  for (const [path, options] of protectedRoutes) {
    const result = await request(baseUrl, `/api/billing/${path}`, {
      method: "POST",
      ...options,
    });
    requireCondition([301, 302, 303, 307, 308].includes(result.response.status), `anonymous billing ${path} returned ${result.response.status}`);
    const location = result.response.headers.get("location") || "";
    requireCondition(
      location.includes("/login") && location.includes("next=/settings") && location.includes("account=signin-required"),
      `anonymous billing ${path} redirected to unexpected location: ${location}`,
    );
  }

  pass("anonymous billing routes redirect to sign-in");
}

async function checkBillingWebhookGate(baseUrl) {
  const result = await request(baseUrl, "/api/billing/webhook", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
  });

  requireCondition(result.response.status === 400, `unsigned Stripe webhook returned ${result.response.status}`);
  requireCondition(
    result.text.includes("Missing Stripe signature"),
    `unsigned Stripe webhook returned unexpected body: ${result.text.slice(0, 120)}`,
  );
  pass("unsigned Stripe webhook requests fail closed");
}

async function checkAnonymousAuthStatus(baseUrl) {
  const status = await request(baseUrl, "/api/auth/status", { redirect: "follow" });
  requireCondition(status.response.ok, `anonymous auth status returned ${status.response.status}`);

  const payload = JSON.parse(status.text);
  requireCondition(payload.configured === true, "anonymous auth status did not report configured auth");
  requireCondition(payload.enabled === true, "anonymous auth status did not report enabled auth");
  requireCondition(payload.provider === "supabase", `anonymous auth status reported unexpected provider: ${payload.provider}`);
  requireCondition(payload.user === null, "anonymous auth status unexpectedly included a signed-in user");
  requireCondition(payload.entitlement?.plan === "free", "anonymous auth status did not include the free fallback plan");
  requireCondition(
    typeof payload.next === "string" && /sign-in|sign in/i.test(payload.next),
    "anonymous auth status did not include user-facing sign-in guidance",
  );
  pass("anonymous auth status reports configured Supabase auth");
}

async function checkCrawlerMetadata(baseUrl) {
  const robots = await request(baseUrl, "/robots.txt", { redirect: "follow" });
  requireCondition(robots.response.ok, `robots.txt returned ${robots.response.status}`);
  requireCondition(robots.text.includes("Sitemap:") && robots.text.includes("/sitemap.xml"), "robots.txt did not reference sitemap.xml");
  requireCondition(robots.text.includes("Disallow: /app"), "robots.txt did not block the protected studio route");
  requireCondition(robots.text.includes("Disallow: /api/"), "robots.txt did not block API routes");

  const sitemap = await request(baseUrl, "/sitemap.xml", { redirect: "follow" });
  requireCondition(sitemap.response.ok, `sitemap.xml returned ${sitemap.response.status}`);
  requireCondition(sitemap.text.includes(`${baseUrl}/`) || sitemap.text.includes(`${baseUrl}</loc>`), "sitemap.xml did not include the home page");
  requireCondition(sitemap.text.includes(`${baseUrl}/templates`), "sitemap.xml did not include templates");
  requireCondition(!sitemap.text.includes(`${baseUrl}/app`), "sitemap.xml included the protected studio route");
  pass("crawler metadata exposes public pages and excludes protected routes");
}

async function checkBackendCapabilities(backendUrl) {
  const capabilities = await request(backendUrl, "/capabilities", { redirect: "follow" });
  requireCondition(capabilities.response.ok, `backend capabilities returned ${capabilities.response.status}`);
  const payload = JSON.parse(capabilities.text);
  const uploadFormats = Object.fromEntries((payload.upload_formats || []).map((item) => [item.format, item]));
  const exportFormats = Object.fromEntries((payload.export_formats || []).map((item) => [item.format, item]));
  const exportTemplates = Object.fromEntries((payload.export_templates || []).map((item) => [item.template, item]));

  for (const format of ["docx", "pdf", "txt"]) {
    requireCondition(uploadFormats[format]?.enabled === true, `backend upload format ${format} is not enabled`);
  }

  requireCondition(exportFormats.pdf?.enabled === true, "backend PDF export is not enabled");
  requireCondition(exportFormats.pdf?.plan === "free", "backend PDF export is not marked free");

  for (const format of ["docx", "txt"]) {
    requireCondition(exportFormats[format]?.plan === "premium", `backend ${format.toUpperCase()} export is not marked premium`);
  }

  for (const template of ["classic", "modern", "editorial", "compact", "executive", "engineer"]) {
    requireCondition(exportTemplates[template]?.label, `backend export template ${template} is not advertised`);
  }

  pass("backend capabilities match the frontend workflow contract");
}

async function checkSignedInSavedProjectRoundTrip(baseUrl, cookie) {
  let signedInCookie = cookie;
  let createdProjectId = "";
  let pendingError = null;
  const smokeRun = buildSmokeSavedRunPayload();
  const smokeTitle = `RoleForge smoke saved project ${smokeRun.id.slice(-8)}`;

  try {
    const created = await request(baseUrl, "/api/saved-runs", {
      cookie: signedInCookie,
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smokeRun),
    });
    signedInCookie = mergeSetCookieHeaders(signedInCookie, created.response);
    requireCondition(created.response.ok, `signed-in saved project create returned ${created.response.status}: ${created.text.slice(0, 160)}`);

    const createdPayload = JSON.parse(created.text);
    requireCondition(createdPayload.projectId, "signed-in saved project create did not return a project id");
    requireCondition(createdPayload.runId, "signed-in saved project create did not return a run id");
    createdProjectId = createdPayload.projectId;

    const renamed = await request(baseUrl, `/api/saved-runs/${encodeURIComponent(createdProjectId)}`, {
      cookie: signedInCookie,
      method: "PATCH",
      redirect: "follow",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: smokeTitle }),
    });
    signedInCookie = mergeSetCookieHeaders(signedInCookie, renamed.response);
    requireCondition(renamed.response.ok, `signed-in saved project rename returned ${renamed.response.status}: ${renamed.text.slice(0, 160)}`);
    requireCondition(JSON.parse(renamed.text).title === smokeTitle, "signed-in saved project rename did not return the saved title");

    const listed = await request(baseUrl, "/api/saved-runs", { cookie: signedInCookie, redirect: "follow" });
    signedInCookie = mergeSetCookieHeaders(signedInCookie, listed.response);
    requireCondition(listed.response.ok, `signed-in saved project list after create returned ${listed.response.status}`);
    const listedPayload = JSON.parse(listed.text);
    const createdRun = listedPayload.runs?.find((run) => run.id === smokeRun.id || run.projectId === createdProjectId);
    requireCondition(createdRun, "signed-in saved project list did not include the smoke run after create");
    requireCondition(createdRun.projectTitle === smokeTitle, "signed-in saved project list did not include the renamed title");
    requireCondition(createdRun.snapshot?.result?.tailored_text === "Smoke tailored draft", "signed-in saved project list did not preserve the restorable snapshot");
  } catch (error) {
    pendingError = error;
  } finally {
    if (createdProjectId) {
      try {
        const deleted = await request(baseUrl, `/api/saved-runs/${encodeURIComponent(createdProjectId)}`, {
          cookie: signedInCookie,
          method: "DELETE",
          redirect: "follow",
        });
        signedInCookie = mergeSetCookieHeaders(signedInCookie, deleted.response);
        requireCondition(deleted.response.ok, `signed-in saved project delete returned ${deleted.response.status}: ${deleted.text.slice(0, 160)}`);

        const listedAfterDelete = await request(baseUrl, "/api/saved-runs", { cookie: signedInCookie, redirect: "follow" });
        signedInCookie = mergeSetCookieHeaders(signedInCookie, listedAfterDelete.response);
        requireCondition(listedAfterDelete.response.ok, `signed-in saved project list after delete returned ${listedAfterDelete.response.status}`);
        const listedAfterDeletePayload = JSON.parse(listedAfterDelete.text);
        const leftoverRun = listedAfterDeletePayload.runs?.find((run) => run.id === smokeRun.id || run.projectId === createdProjectId);
        requireCondition(!leftoverRun, "signed-in saved project delete left the smoke run visible");
      } catch (cleanupError) {
        if (!pendingError) {
          pendingError = cleanupError;
        } else {
          console.error(`Signed-in saved project cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
      }
    }
  }

  if (pendingError) throw pendingError;

  pass("signed-in saved projects support create, rename, delete, and cleanup");
  return signedInCookie;
}

async function checkSignedInStatus(baseUrl, cookie, options) {
  const { cookieSource, expectPremiumAccess, requireSignedInSmoke } = options;

  if (!cookie) {
    requireCondition(!requireSignedInSmoke, "ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE requires ROLEFORGE_SMOKE_COOKIE or a dedicated ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD account");
    requireCondition(!expectPremiumAccess, "ROLEFORGE_EXPECT_PREMIUM_ACCESS requires ROLEFORGE_SMOKE_COOKIE or a dedicated ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD account");
    skip("signed-in smoke skipped because ROLEFORGE_SMOKE_COOKIE or ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD is not configured");
    return;
  }

  pass(`signed-in smoke configured with ${cookieSource}`);

  let signedInCookie = cookie;
  const status = await request(baseUrl, "/api/auth/status", { cookie: signedInCookie, redirect: "follow" });
  signedInCookie = mergeSetCookieHeaders(signedInCookie, status.response);
  requireCondition(status.response.ok, `auth status returned ${status.response.status}`);
  const payload = JSON.parse(status.text);
  requireCondition(payload.configured === true && payload.enabled === true, "auth status did not report enabled Supabase auth");
  requireCondition(payload.user?.id, "auth status did not include a signed-in user");
  requireCondition(payload.entitlement?.plan, "auth status did not include an account plan");

  if (expectPremiumAccess) {
    requireCondition(payload.entitlement.plan === "premium", `signed-in smoke expected premium plan, got ${payload.entitlement.plan}`);
    requireCondition(payload.entitlement.billingStatus === "active" || payload.entitlement.billingStatus === "trialing", `signed-in smoke expected active premium billing, got ${payload.entitlement.billingStatus}`);
    requireCondition(payload.entitlement.exportFormats?.docx === true, "signed-in premium smoke did not include DOCX export access");
    requireCondition(payload.entitlement.exportFormats?.txt === true, "signed-in premium smoke did not include TXT export access");
    pass("signed-in auth status confirms premium export access");
  }

  pass("signed-in auth status returns account and plan state");

  const app = await request(baseUrl, "/app", { cookie: signedInCookie, redirect: "follow" });
  signedInCookie = mergeSetCookieHeaders(signedInCookie, app.response);
  requireCondition(app.response.ok, `signed-in studio returned ${app.response.status}`);
  requireCondition(app.text.includes("RoleForge AI"), "signed-in studio did not render the RoleForge shell");
  requireCondition(app.text.includes("Resume studio"), "signed-in studio did not render the workspace");
  pass("signed-in studio renders the workspace shell");

  const savedRuns = await request(baseUrl, "/api/saved-runs", { cookie: signedInCookie, redirect: "follow" });
  signedInCookie = mergeSetCookieHeaders(signedInCookie, savedRuns.response);
  requireCondition(savedRuns.response.ok, `signed-in saved projects returned ${savedRuns.response.status}`);
  const savedRunsPayload = JSON.parse(savedRuns.text);
  requireCondition(Array.isArray(savedRunsPayload.runs), "signed-in saved projects did not return a runs array");
  pass("signed-in saved projects API returns account runs");

  signedInCookie = await checkSignedInSavedProjectRoundTrip(baseUrl, signedInCookie);

  const settings = await request(baseUrl, "/settings", { cookie: signedInCookie, redirect: "follow" });
  requireCondition(settings.response.ok, `signed-in settings returned ${settings.response.status}`);
  requireCondition(settings.text.includes("Settings"), "signed-in settings did not render the settings page");
  requireCondition(settings.text.includes("Current plan"), "signed-in settings did not render account plan details");
  pass("signed-in settings renders account plan details");
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.ROLEFORGE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
  const backendUrl = normalizeBaseUrl(process.env.ROLEFORGE_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL);
  const cookieFromEnv = process.env.ROLEFORGE_SMOKE_COOKIE?.trim();
  const cookieFromSmokeAccount = cookieFromEnv ? "" : await signInSmokeAccount();
  const cookie = cookieFromEnv || cookieFromSmokeAccount;
  const cookieSource = cookieFromEnv ? "ROLEFORGE_SMOKE_COOKIE" : cookieFromSmokeAccount ? "ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD" : "";
  const requireSignedInSmoke = readBooleanEnv("ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE");
  const expectPremiumAccess = readBooleanEnv("ROLEFORGE_EXPECT_PREMIUM_ACCESS");

  try {
    await checkPublicShell(baseUrl);
    await checkAnonymousAuthStatus(baseUrl);
    await checkAnonymousGate(baseUrl);
    await checkAnonymousAccountDataGate(baseUrl);
    await checkAnonymousBillingGate(baseUrl);
    await checkBillingWebhookGate(baseUrl);
    await checkCrawlerMetadata(baseUrl);
    await checkBackendCapabilities(backendUrl);
    await checkSignedInStatus(baseUrl, cookie, { cookieSource, expectPremiumAccess, requireSignedInSmoke });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
