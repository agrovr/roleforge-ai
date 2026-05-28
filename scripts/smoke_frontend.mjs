#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";
const DEFAULT_BACKEND_URL = "https://roleforge-api-224015900616.us-central1.run.app";
const SUPABASE_COOKIE_CHUNK_SIZE = 3180;
const SMOKE_RESUME_TEXT = [
  "Avery Stone",
  "Product Operations Manager",
  "avery@example.com",
  "",
  "Professional Summary",
  "Product operations lead with experience organizing launch plans, improving handoffs, and turning stakeholder notes into clear execution steps.",
  "",
  "Experience",
  "Project Lead, Operations",
  "- Coordinated roadmap reviews across product, design, and engineering.",
  "- Improved launch readiness with clearer risks, owners, and next steps.",
].join("\n");
const SMOKE_TAILORED_TEXT = [
  "Avery Stone",
  "Product Operations Manager",
  "avery@example.com",
  "",
  "Professional Summary",
  "Product operations lead with launch planning, stakeholder communication, and execution-readiness experience.",
  "",
  "Experience",
  "Project Lead, Operations",
  "- Coordinated roadmap reviews across product, design, and engineering teams.",
  "- Improved launch readiness with clearer risks, owners, and next steps.",
  "",
  "Skills",
  "Roadmapping, Launch Planning, Stakeholder Communication",
].join("\n");

function normalizeBaseUrl(value) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(raw)) throw new Error(`Invalid base URL: ${raw}`);
  return raw;
}

export function parseSmokeArgs(argv) {
  const options = {};
  const aliases = {
    "--base-url": "baseUrl",
    "--site-url": "baseUrl",
    "--backend-url": "backendUrl",
    "--canonical-url": "canonicalUrl",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equalsIndex = arg.indexOf("=");
    const name = equalsIndex >= 0 ? arg.slice(0, equalsIndex) : arg;
    const inlineValue = equalsIndex >= 0 ? arg.slice(equalsIndex + 1) : undefined;

    if (name === "--require-signed-in-smoke") {
      options.requireSignedInSmoke = true;
      continue;
    }

    if (name === "--expect-premium-access") {
      options.expectPremiumAccess = true;
      continue;
    }

    if (name === "--require-backend-workflow-smoke") {
      options.requireBackendWorkflowSmoke = true;
      continue;
    }

    const key = aliases[name];
    if (!key) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value`);
    }

    options[key] = value;
    if (inlineValue === undefined) index += 1;
  }

  return options;
}

function isLocalBaseUrl(baseUrl) {
  const hostname = new URL(baseUrl).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
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

  if (!email && !password) return null;
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
  return {
    accessToken: payload.access_token,
    cookie: cookieHeaderFromSession(supabaseUrl, payload),
  };
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

async function requestBackend(backendUrl, path, options = {}) {
  return requestAbsolute(`${backendUrl}${path}`, options);
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

  requireCondition(/\.templates-page-hero\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*container:\s*templates-hero\s*\/\s*inline-size)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "templates hero was missing overflow-safe container sizing");
  requireCondition(/\.templates-page-hero\s*>\s*\*\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "templates hero children can still force horizontal overflow");
  requireCondition(/\.templates-page-actions\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s.test(stylesheetText), "templates hero actions can still crowd the hero");
  requireCondition(/\.templates-page-actions\s+\.primary-button,\s*\.templates-page-actions\s+\.ghost-button\s*\{(?=[^}]*flex:\s*(?:1\s+1\s+)?150px)(?=[^}]*min-width:\s*min\(100%,\s*150px\))(?=[^}]*line-height:\s*1\.12)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "templates hero buttons can still render cramped labels");
  requireCondition(/\.templates-selection-status\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "templates selected-status row can still overflow");
  requireCondition(/\.templates-selection-status\s+strong\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "templates selected label can still overflow");
  requireCondition(/\.templates-page-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*260px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "templates cards can still shrink below a comfortable width");
  requireCondition(/\.templates-page-card\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)(?=[^}]*container:\s*template-page-card\s*\/\s*inline-size)[^}]*\}/s.test(stylesheetText), "templates cards were missing container overflow safeguards");
  requireCondition(/\.template-title-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content)(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "template card title rows can still squeeze names and tags");
  requireCondition(/\.template-name\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "template names can still overflow their cards");
  requireCondition(/\.template-tag\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*line-height:\s*1\.16)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "template tags can still render cramped");
  requireCondition(/@container\s+template-page-card\s*\(max-width:\s*310px\)\s*\{[^}]*\.template-title-row\s*\{[^}]*grid-template-columns:\s*1fr/s.test(stylesheetText), "template card titles are missing compact stacking");
  requireCondition(/\.template-card-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*128px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "template card actions can still bunch together");
  requireCondition(/\.template-card-actions\s+\.btn,\s*\.template-card-actions\s+button\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*line-height:\s*1\.12)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "template card action buttons can still render cramped labels");
  pass("templates page includes overflow-safe cards and actions");

  requireCondition(/\.steps,\s*\.features-grid\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "landing step and feature grids were missing overflow-safe containers");
  requireCondition(/\.feature-card,\s*\.step\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "landing step and feature cards can still overflow their grid tracks");
  requireCondition(/\.feature-card\s*\{(?=[^}]*container:\s*feature-card\s*\/\s*inline-size)[^}]*\}/s.test(stylesheetText), "feature cards were missing container sizing");
  requireCondition(/\.step\s+\.step-title,\s*\.step\s+h4,\s*\.step\s+h3,\s*\.feature-card\s+h3,\s*\.feature-card\s+h4\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "landing card headings can still render cramped text");
  requireCondition(/\.feature-card-list\s+li\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*line-height:\s*1\.35)[^}]*\}/s.test(stylesheetText), "feature list rows can still squeeze card text");
  requireCondition(/\.feature-card-list\s+li\s+span:last-child\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "feature list labels can still overflow cards");
  requireCondition(/@media\s*\(max-width:\s*1180px\)\s*\{[^}]*\.steps,\s*\.features-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s.test(stylesheetText), "landing step and feature grids can still stay cramped before mobile");
  pass("landing step and feature cards include overflow-safe layout rules");

  requireCondition(stylesheetText.includes(".dash-stat-value"), "landing dashboard stat styles were missing");
  requireCondition(/\.dash-mock\s*\{(?=[^}]*container-type:\s*inline-size)[^}]*\}/s.test(stylesheetText), "landing dashboard mock was missing container sizing");
  requireCondition(/\.dash-main\s*\{(?=[^}]*container:\s*dash-main\s*\/\s*inline-size)[^}]*\}/s.test(stylesheetText), "landing dashboard main column was missing named container sizing");
  requireCondition(/\.dash-stats\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*210px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "landing dashboard stats can still squeeze cards at desktop widths");
  requireCondition(/@container\s+dash-main\s*\(max-width:\s*1260px\)\s*\{[^}]*\.dash-stats\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s.test(stylesheetText), "landing dashboard stats do not collapse to two columns before cramped widths");
  requireCondition(/@container\s+dash-main\s*\(max-width:\s*460px\)\s*\{[^}]*\.dash-stats\s*\{[^}]*grid-template-columns:\s*1fr/s.test(stylesheetText), "landing dashboard stats do not collapse to one column on narrow widths");
  requireCondition(/\.dash-stat-value\s*\{(?=[^}]*font-size:\s*clamp\(1\.36rem,\s*4\.2cqi,\s*1\.72rem\))(?=[^}]*hyphens:\s*auto)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "landing dashboard stat values are not using overflow-safe fitted type");
  requireCondition(/\.dash-stat-value\s*\{(?=[^}]*font-size:\s*clamp\(1\.18rem,\s*5\.8cqi,\s*1\.58rem\))(?=[^}]*line-height:\s*1\.04)(?=[^}]*hyphens:\s*none)(?=[^}]*word-break:\s*normal)[^}]*\}/s.test(stylesheetText), "landing dashboard stat values are missing the final fitted-type override");
  requireCondition(/@container\s+dash-stat\s*\(max-width:\s*310px\)\s*\{[^}]*\.dash-stat-value\s*\{[^}]*font-size:\s*clamp\(1\.26rem,\s*7\.6cqi,\s*1\.56rem\)/s.test(stylesheetText), "landing dashboard stat values are missing fitted type for medium cards");
  requireCondition(/@container\s+dash-stat\s*\(max-width:\s*250px\)\s*\{[^}]*\.dash-stat-value\s*\{[^}]*font-size:\s*clamp\(1\.18rem,\s*9\.5cqi,\s*1\.4rem\)/s.test(stylesheetText), "landing dashboard stat values are missing fitted type for compact cards");
  requireCondition(/@container\s+dash-stat\s*\(max-width:\s*210px\)\s*\{[^}]*\.dash-stat-value\s*\{[^}]*font-size:\s*clamp\(1\.08rem,\s*9cqi,\s*1\.25rem\)/s.test(stylesheetText), "landing dashboard stat values are missing fitted type for cramped cards");
  requireCondition(/@media\s*\(max-width:\s*1500px\)\s*\{[^}]*\.dash-stats\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s.test(stylesheetText), "landing dashboard stats are missing viewport fallback columns");
  requireCondition(/\.dash-stat-delta\s*\{(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "landing dashboard stat captions can still force card overflow");
  requireCondition(/min-block-size:\s*clamp\(118px,\s*14cqi,\s*138px\)/.test(stylesheetText), "landing dashboard stats were missing stable card height");
  requireCondition(
    /\.dash-mock-url\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)(?=[^}]*text-overflow:\s*ellipsis)[^}]*\}/s.test(stylesheetText),
    "landing dashboard URL bar can still overflow on narrow screens",
  );
  requireCondition(
    /\.dash-main-head\s+\.btn-sm\s*\{(?=[^}]*min-width:\s*min\(100%,\s*150px\))(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText),
    "landing dashboard CTA can still render cramped in the studio mock",
  );
  requireCondition(/\.dash-resume-card\s*\{(?=[^}]*container:\s*dash-resume-card\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "landing dashboard resume card can still overflow");
  requireCondition(/\.dash-resume-title\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "landing dashboard resume title can still render cramped");
  requireCondition(/\.dash-resume-meta\s+span\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "landing dashboard resume metadata can still overflow");
  requireCondition(/\.dash-resume-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*112px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "landing dashboard resume actions can still bunch together");
  requireCondition(/\.dash-resume-actions\s+\.btn\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*min-height:\s*38px)(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "landing dashboard resume action labels can still render cramped");
  requireCondition(/@container\s+dash-resume-card\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.dash-resume-card\s*\{[^}]*grid-template-columns:\s*1fr/s.test(stylesheetText), "landing dashboard resume card is missing compact container stacking");
  pass("landing dashboard stat cards include overflow-safe styles");

  requireCondition(stylesheetText.includes(".nav-cta-short"), "landing mobile nav compact CTA styles were missing");
  requireCondition(/\.nav-link-secondary,\s*\.nav-link-account,\s*\.nav-divider\s*\{\s*display:\s*none/.test(stylesheetText), "landing mobile nav still exposes full navigation links");
  requireCondition(/\.nav\s+\.btn-brand\s*\{[^}]*min-width:\s*0/.test(stylesheetText), "landing mobile nav CTA can still force header overflow");
  requireCondition(/@media\s*\(max-width:\s*355px\)/.test(stylesheetText), "landing nav was missing narrow-phone overflow protection");
  requireCondition(!home.text.includes("The&nbsp;resume&nbsp;that"), "landing hero headline still prevents narrow-phone wrapping");
  pass("landing mobile nav includes compact one-row styles");

  requireCondition(/\.hero\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*overflow-x:\s*clip)[^}]*\}/s.test(stylesheetText), "landing hero can still create horizontal overflow");
  requireCondition(/\.hero\s*>\s*\*\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "landing hero children can still force page overflow");
  requireCondition(/\.hero-copy\s*\{(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText), "landing hero copy can still exceed its grid column");
  requireCondition(/\.hero-stage\s*\{(?=[^}]*justify-self:\s*end)(?=[^}]*width:\s*min\(100%,\s*640px\))(?=[^}]*max-width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)(?=[^}]*isolation:\s*isolate)[^}]*\}/s.test(stylesheetText), "landing hero visual stack can still spill out of the viewport");
  requireCondition(/\.b-score\s*\{(?=[^}]*right:\s*0)[^}]*\}/s.test(stylesheetText) && /\.b-keyword\s*\{(?=[^}]*right:\s*0)[^}]*\}/s.test(stylesheetText), "landing hero floating badges can still extend beyond the visual stage");
  requireCondition(/@media\s*\(max-width:\s*1180px\)[\s\S]*?\.hero-stage\s*\{(?=[^}]*justify-self:\s*center)(?=[^}]*width:\s*min\(100%,\s*680px\))(?=[^}]*height:\s*clamp\(500px,\s*56vw,\s*560px\))(?=[^}]*overflow:\s*hidden)[^}]*\}/.test(stylesheetText), "landing hero tablet visual stage is missing containment");
  requireCondition(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.hero-stage\s*\{(?=[^}]*width:\s*min\(100%,\s*560px\))(?=[^}]*height:\s*clamp\(460px,\s*92vw,\s*520px\))[^}]*\}/.test(stylesheetText), "landing hero mobile visual stage is missing fitted sizing");
  pass("landing hero includes overflow-safe visual stage guards");

  requireCondition(/\.cta-band\s*\{(?=[^}]*container:\s*cta-band\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*width:\s*100%)(?=[^}]*margin-left:\s*0)(?=[^}]*isolation:\s*isolate)[^}]*\}/s.test(stylesheetText), "landing final CTA can still overflow its container");
  requireCondition(/\.cta-band\s*>\s*\*\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "landing final CTA children can still force overflow");
  requireCondition(/\.cta-section\s+\.section-inner\s*\{(?=[^}]*width:\s*min\(100%\s*,\s*1320px\))[^}]*\}/s.test(stylesheetText), "landing final CTA section still uses unsafe full-bleed padding math");
  requireCondition(/\.cta-band\s+\.btn\s*\{(?=[^}]*flex:\s*(?:1\s+1\s+)?184px)(?=[^}]*min-width:\s*min\(100%,\s*164px\))(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "landing final CTA buttons can still render cramped labels");
  requireCondition(/\.cta-visual\s*\{(?=[^}]*(?:justify-self:\s*end|place-self:\s*center\s+end))(?=[^}]*width:\s*min\(100%\s*,\s*560px\))(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "landing final CTA visual can still spill out");
  requireCondition(/@container\s+cta-band\s*\(max-width:\s*980px\)\s*\{[\s\S]*?\.cta-band\s*\{(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*padding:\s*clamp\(28px,\s*5cqi,\s*48px\))[^}]*\}/s.test(stylesheetText), "landing final CTA is missing container-based tablet stacking");
  requireCondition(/@container\s+cta-band\s*\(max-width:\s*980px\)\s*\{[\s\S]*?\.cta-visual\s+\.resume-card\s*\{(?=[^}]*left:\s*50%)(?=[^}]*transform:\s*translate(?:X)?\(-26%\)\s*rotate\(5deg\))[^}]*\}/s.test(stylesheetText), "landing final CTA front resume art can still clip on tablet widths");
  requireCondition(/@container\s+cta-band\s*\(max-width:\s*980px\)\s*\{[\s\S]*?\.cta-visual\s+\.resume-card\.back\s*\{(?=[^}]*left:\s*50%)(?=[^}]*transform:\s*translate(?:X)?\(-82%\)\s*rotate\(-8deg\))[^}]*\}/s.test(stylesheetText), "landing final CTA back resume art can still clip on tablet widths");
  requireCondition(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.cta-band\s*\{(?=[^}]*width:\s*min\(100%,\s*(?:calc\()?100vw\s*-\s*32px\)?\))(?=[^}]*margin-left:\s*0)(?=[^}]*padding:\s*44px\s+28px)[^}]*\}/.test(stylesheetText), "landing final CTA is missing tablet containment");
  requireCondition(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.cta-band\s+\.cta-cluster\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)[^}]*\}/.test(stylesheetText), "landing final CTA buttons are missing narrow stacking");
  requireCondition(/\.footer-inner\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "footer columns can still force overflow");
  requireCondition(/\.footer-tag,\s*\.footer-col\s+a,\s*\.footer-col\s+span,\s*\.footer-meta\s+span\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "footer copy can still overflow narrow columns");
  pass("landing final CTA and footer include overflow-safe layout guards");

  requireCondition(/@media\s*\(max-width:\s*1040px\)[\s\S]*?\.login-panel\s*\{[^}]*grid-template-columns:\s*1fr/.test(stylesheetText), "login page can still stay cramped at tablet widths");
  requireCondition(/\.login-shell\s*\{(?=[^}]*overflow-x:\s*clip)[^}]*\}/s.test(stylesheetText), "login page can still create horizontal overflow");
  requireCondition(/\.login-nav\s+\.brand\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "login nav brand can still force the home action off-screen");
  requireCondition(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-nav-actions\s+\.btn-sm\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*padding-inline:\s*12px)[^}]*\}/.test(stylesheetText), "login mobile nav actions can still overflow");
  requireCondition(/@media\s*\(max-width:\s*520px\)\s*\{[^}]*\.login-nav-actions\s+\.btn-sm\s*\{[^}]*display:\s*none/s.test(stylesheetText), "login narrow-phone nav still keeps too many actions visible");
  requireCondition(/\.login-panel\s*>\s*\*\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "login panel children can still force horizontal overflow");
  requireCondition(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-panel\s*\{(?=[^}]*width:\s*100%)(?=[^}]*max-width:\s*100%)(?=[^}]*overflow:\s*hidden)[^}]*\}/.test(stylesheetText), "login mobile panel can still exceed the viewport");
  requireCondition(/\.login-copy\s+p\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s.test(stylesheetText), "login intro copy can still overflow narrow screens");
  requireCondition(/\.login-benefits\s+span\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*align-items:\s*flex-start)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "login benefit rows can still clip on mobile");
  requireCondition(/\.login-studio-preview\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*min\(650px,\s*100%\))[^}]*\}/s.test(stylesheetText), "login studio preview can still exceed the viewport");
  requireCondition(/\.login-preview-top\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s.test(stylesheetText), "login preview header can still squeeze labels");
  requireCondition(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-preview-top\s*\{(?=[^}]*flex-direction:\s*column)[^}]*\}/.test(stylesheetText), "login mobile preview header can still crowd its title");
  requireCondition(/\.login-preview-sheet\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*130px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "login preview sheet can still shrink into cramped columns");
  requireCondition(/\.login-status\s*\{(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText) && /\.login-status\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "login status pill can still force card overflow");
  requireCondition(/\.login-session-strip\s+span\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-align:\s*center)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "login session chips can still render cramped labels");
  requireCondition(/\.studio-oauth-button\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText) && /\.studio-oauth-button\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "login OAuth button can still render cramped labels");
  pass("login page includes mobile overflow and auth control safeguards");

  requireCondition(/\.pricing-grid\.two\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(min\(100%,\s*360px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "pricing cards can still shrink below comfortable desktop widths");
  requireCondition(/\.price-card\s*\{(?=[^}]*container:\s*price-card\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "pricing cards were missing container overflow safeguards");
  requireCondition(/\.price-amount\s+\.v\s*\{(?=[^}]*font-size:\s*clamp\(2\.35rem,\s*15cqi,\s*3\.25rem\))(?=[^}]*line-height:\s*1)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "pricing amounts can still clip or overflow");
  requireCondition(/@container\s+price-card\s*\(max-width:\s*340px\)\s*\{[^}]*\.price-amount\s+\.v\s*\{[^}]*font-size:\s*clamp\(2rem,\s*14cqi,\s*2\.45rem\)/s.test(stylesheetText), "pricing amounts are missing fitted type for compact cards");
  requireCondition(/\.price-list\s+li\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*line-height:\s*1\.35)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "pricing feature rows can still squeeze card text");
  requireCondition(/\.price-card\s+\.btn,\s*\.price-card\s+button\s*\{(?=[^}]*width:\s*100%)(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "pricing CTA buttons can still render cramped labels");
  pass("pricing cards include overflow-safe typography and actions");

  requireCondition(/\.settings-section-panel\s*\{(?=[^}]*container-type:\s*inline-size)[^}]*\}/s.test(stylesheetText), "settings panels were missing container sizing");
  requireCondition(/\.settings-page-hero,\s*\.settings-section\s*\{(?=[^}]*container:\s*settings-section\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "settings sections can still overflow their page grid");
  requireCondition(/\.settings-page-actions\s*\{(?=[^}]*justify-content:\s*flex-end)(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s.test(stylesheetText), "settings topbar actions can still crowd the brand");
  requireCondition(/\.settings-page-actions\s+\.btn\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "settings topbar action labels can still clip");
  requireCondition(/@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.settings-page-nav\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*overflow:\s*visible)[^}]*\}[\s\S]*?\.settings-page-nav\s+a\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/.test(stylesheetText), "settings narrow-phone nav can still squeeze or clip labels");
  requireCondition(/\.settings-metric\s*\{(?=[^}]*container-type:\s*inline-size)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "settings metric cards can still overflow their panel");
  requireCondition(/\.settings-metric\s+strong\s*\{(?=[^}]*font-size:\s*clamp\(1\.32rem,\s*13cqi,\s*1\.7rem\))(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings metric display text is not using fitted container-aware type");
  requireCondition(/\.settings-status-pill\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings status pills can still force narrow layout overflow");
  requireCondition(/\.settings-plan-includes\s+span\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings plan chips can still force narrow layout overflow");
  pass("settings cards include overflow-safe plan and metric styles");

  requireCondition(
    /\.primary-button,\s*\.ghost-button\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*padding:\s*12px\s+20px)(?=[^}]*text-align:\s*center)[^}]*\}/s.test(stylesheetText),
    "primary and ghost buttons can still render cramped labels",
  );
  requireCondition(
    /\.primary-button\s+svg,\s*\.ghost-button\s+svg\s*\{(?=[^}]*(?:flex:\s*0\s+0\s+auto|flex:\s*none))[^}]*\}/s.test(stylesheetText),
    "button icons can still squeeze action labels",
  );
  requireCondition(
    /\.settings-profile-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*158px\),\s*1fr\)\))(?=[^}]*width:\s*min\(100%,\s*460px\))[^}]*\}/s.test(stylesheetText),
    "settings profile actions can still crowd or over-expand adjacent buttons",
  );
  requireCondition(
    /\.settings-profile-actions\s+form\s*\{(?=[^}]*display:\s*flex)(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText),
    "settings sign-out form can still stay narrower than its paired action",
  );
  requireCondition(
    /\.settings-profile-actions\s+\.primary-button,\s*\.settings-profile-actions\s+\.ghost-button\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*min-height:\s*48px)(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText),
    "settings account action buttons can still render cramped labels",
  );
  requireCondition(
    /\.settings-billing-head\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(min\(100%,\s*170px\),\s*auto\))(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText),
    "settings billing header can still squeeze billing actions",
  );
  requireCondition(
    /\.settings-billing-head\s+form\s*\{(?=[^}]*display:\s*flex)(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText),
    "settings billing form can still collapse the manage billing button",
  );
  requireCondition(
    /\.settings-billing-head\s+\.ghost-button\s*\{(?=[^}]*min-width:\s*min\(100%,\s*170px\))(?=[^}]*min-height:\s*48px)(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)(?=[^}]*width:\s*100%)[^}]*\}/s.test(stylesheetText),
    "settings billing action button can still render cramped labels",
  );
  requireCondition(
    /\.settings-plan-active-card\s+\.settings-inline-link\s*\{(?=[^}]*flex:\s*0\s+(?:1\s+)?170px)(?=[^}]*min-width:\s*min\(100%,\s*150px\))(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText),
    "settings active plan studio link can still collapse into cramped text",
  );
  requireCondition(
    /@container\s*\(max-width:\s*430px\)\s*\{[\s\S]*?\.settings-profile-actions,\s*\.settings-billing-head,\s*\.settings-export-actions\s*\{[^}]*grid-template-columns:\s*1fr/s.test(stylesheetText),
    "settings controls are missing compact container stacking",
  );
  pass("settings action buttons include spacing and wrap safeguards");

  requireCondition(/\.settings-export-item\s*\{(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "settings export rows can still force panel overflow");
  requireCondition(/\.settings-export-item\s+span\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*line-height:\s*1\.18)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "settings export labels can still render cramped");
  requireCondition(/\.settings-export-item\s+small\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*line-height:\s*1\.18)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "settings export descriptions can still squeeze rows");
  requireCondition(
    /\.settings-project-item\s+small\s*\{(?=[^}]*(?:flex:\s*0\s+1\s+auto|flex:\s*0\s+auto))(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText) &&
      /\.settings-project-item\s+small\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText),
    "settings saved-project status pills can still squeeze or overflow",
  );
  requireCondition(/\.settings-price-card\s*\{(?=[^}]*container:\s*settings-price-card\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "settings price cards were missing container sizing");
  requireCondition(/\.settings-price-card\s+strong\s*\{(?=[^}]*font-size:\s*clamp\(2\.05rem,\s*19cqi,\s*2\.58rem\))(?=[^}]*line-height:\s*1)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings price values can still clip or overflow");
  requireCondition(/\.settings-price-card\s+\.primary-button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*min-height:\s*48px)(?=[^}]*line-height:\s*1\.12)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "settings price buttons can still render cramped labels");
  requireCondition(/@container\s+settings-price-card\s*\(max-width:\s*220px\)\s*\{[^}]*\.settings-price-card\s+strong\s*\{[^}]*font-size:\s*clamp\(1\.78rem,\s*18cqi,\s*2\.08rem\)/s.test(stylesheetText), "settings price values are missing fitted type for compact cards");
  requireCondition(/\.settings-export-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(min\(100%,\s*150px\),\s*auto\))[^}]*\}/s.test(stylesheetText), "settings export template action can still squeeze its link");
  requireCondition(/\.settings-usage-card\s*\{(?=[^}]*container:\s*settings-usage-card\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "settings usage card was missing container sizing");
  requireCondition(/\.settings-usage-card\s+strong\s*\{(?=[^}]*font-size:\s*clamp\(2rem,\s*14cqi,\s*2\.55rem\))(?=[^}]*line-height:\s*1)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings usage headline can still clip or overflow");
  requireCondition(/@container\s+settings-usage-card\s*\(max-width:\s*300px\)\s*\{[^}]*\.settings-usage-card\s+strong\s*\{[^}]*font-size:\s*clamp\(1\.62rem,\s*13cqi,\s*2rem\)/s.test(stylesheetText), "settings usage headline is missing fitted type for compact cards");
  requireCondition(/\.settings-plan-active-card\s*\{(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "settings active plan card can still force panel overflow");
  requireCondition(/\.settings-plan-active-card\s+strong\s*\{(?=[^}]*font-size:\s*clamp\(1\.82rem,\s*8cqi,\s*2\.3rem\))(?=[^}]*line-height:\s*1)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "settings active plan headline can still clip or overflow");
  pass("settings export and billing cards include overflow-safe typography");

  requireCondition(
    /\.rf-studio-hero\s+h1\s*\{(?=[^}]*display:\s*-webkit-box)(?=[^}]*-webkit-line-clamp:\s*2)(?=[^}]*white-space:\s*normal)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText),
    "studio hero title can still collapse into a clipped one-line label",
  );
  requireCondition(
    /\.studio-top-button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*justify-content:\s*center)[^}]*\}/s.test(stylesheetText),
    "studio top action buttons can still force header overflow",
  );
  requireCondition(
    /@media\s*\(max-width:\s*720px\)[\s\S]*?\.studio-top-button\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-align:\s*center)[^}]*\}/.test(stylesheetText),
    "studio top action buttons can still overflow on mobile",
  );
  requireCondition(
    /\.studio-hero-actions\s+\.ghost-button,\s*\.studio-hero-actions\s+\.primary-button\s*\{(?=[^}]*min-width:\s*min\(100%,\s*128px\))(?=[^}]*line-height:\s*1\.12)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText),
    "studio hero action buttons can still overflow at tablet widths",
  );
  requireCondition(
    /@media\s*\(max-width:\s*720px\)[\s\S]*?\.studio-hero-actions\s+\.ghost-button,\s*\.studio-hero-actions\s+\.primary-button\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*line-height:\s*1\.12)[^}]*\}/.test(stylesheetText),
    "studio hero action buttons can still overflow on mobile",
  );
  pass("studio action buttons include narrow-width wrapping safeguards");

  requireCondition(/\.studio-account-popover\s*\{(?=[^}]*container:\s*studio-account-popover\s*\/\s*inline-size)(?=[^}]*max-height:\s*calc\(100dvh\s*-\s*96px\))(?=[^}]*overflow-y:\s*auto)[^}]*\}/s.test(stylesheetText), "studio account popover can still overflow the viewport");
  requireCondition(/\.studio-account-popover\s*>\s*strong\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "studio account heading can still overflow");
  requireCondition(/\.studio-account-popover\s*>\s*\.studio-account-email\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-overflow:\s*initial)[^}]*\}/s.test(stylesheetText), "studio account email can still clip awkwardly");
  requireCondition(/\.studio-account-shortcuts\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*132px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "studio account shortcuts can still squeeze together");
  requireCondition(
    /\.studio-account-shortcuts\s+a,\s*\.studio-account-shortcuts\s+button\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText) &&
      /\.studio-account-shortcuts\s+a,\s*\.studio-account-shortcuts\s+button\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText),
    "studio account shortcut labels can still render cramped",
  );
  requireCondition(/\.studio-account-summary\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "studio account summary cards can still overflow");
  requireCondition(/\.studio-account-summary\s+span\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "studio account summary titles can still overflow");
  requireCondition(
    /@media\s*\((?:max-width:\s*720px|width<=720px)\)[\s\S]*?\.studio-account-popover\s*\{(?=[^}]*right:\s*auto)(?=[^}]*left:\s*0)(?=[^}]*width:\s*min\(340px,\s*(?:calc\()?100vw\s*-\s*44px\)?\))[^}]*\}/.test(stylesheetText),
    "studio account popover can still anchor off-screen on mobile",
  );
  pass("studio account popover includes compact overflow safeguards");

  requireCondition(/\.export-format-chip\s*\{(?=[^}]*justify-content:\s*center)(?=[^}]*min-width:\s*min\(100%,\s*92px\))(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText), "studio export format chips can still collapse too narrow");
  requireCondition(/\.export-format-chip\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-align:\s*center)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "studio export format chip labels can still render cramped");
  requireCondition(/\.export-format-chip\s+small\s*\{(?=[^}]*line-height:\s*1\.1)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "studio export format chip subtitles can still squeeze chips");
  requireCondition(/\.studio-template-preference\s+small\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "studio template preference status can still force cramped pills");
  pass("studio export chips and template preference include wrapping safeguards");

  requireCondition(/\.studio-tabs-mini\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText), "studio preview tabs can still force card overflow");
  requireCondition(/\.rf-live-card\s+\.studio-tabs-mini\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(68px,\s*1fr\)\))(?=[^}]*width:\s*min\(100%,\s*330px\))[^}]*\}/s.test(stylesheetText), "live preview tab rail can still render too wide");
  requireCondition(/\.rf-live-card\s+\.studio-tabs-mini\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*line-height:\s*1)(?=[^}]*text-align:\s*center)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "live preview tab labels can still render cramped");
  requireCondition(/\.rf-live-card\s+\.studio-tabs-mini\s+button\s+span,\s*\.rf-live-card\s+\.studio-tabs-mini\s+button\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "live preview tab text can still overflow");
  requireCondition(/\.rf-preview-wrap\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*calc\(100%\s*-\s*44px\))[^}]*\}/s.test(stylesheetText), "live preview wrapper can still overflow its card");
  requireCondition(/\.rf-preview-status\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*160px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "live preview status chips can still stay cramped");
  requireCondition(/\.rf-preview-status\s+span,\s*\.rf-preview-alert\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "live preview status text can still overflow");
  requireCondition(/\.rf-preview-empty-steps\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*150px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "live preview empty steps can still squeeze narrow cards");
  requireCondition(/\.rf-diff-readiness\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*150px\),\s*1fr\)\))[^}]*\}/s.test(stylesheetText), "live preview diff readiness chips can still squeeze narrow cards");
  pass("live preview tabs and status chips include wrapping safeguards");

  requireCondition(/\.suggestion\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "suggestion cards can still overflow their column");
  requireCondition(/\.suggestion-head\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s.test(stylesheetText), "suggestion headers can still squeeze long badges");
  requireCondition(/\.suggestion-tag\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "suggestion tags can still clip long labels");
  requireCondition(/\.suggestion-actions\s+\.btn\s*\{(?=[^}]*flex:\s*(?:1\s+1\s+)?132px)(?=[^}]*min-width:\s*min\(100%,\s*124px\))(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "suggestion action buttons can still render cramped labels");
  requireCondition(/\.studio-jd\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "job target card can still overflow with long targets");
  requireCondition(/\.studio-jd-meta\s+span\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "job target metadata can still squeeze long labels");
  requireCondition(/\.pill,\s*\.mini-keyword,\s*\.kw\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "keyword pills can still force row overflow");
  requireCondition(/\.ats-item\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "ATS cards can still overflow with long issue text");
  requireCondition(/\.generated-summary\s+span\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "generated asset summary pills can still render cramped");
  requireCondition(/\.generated-card\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "generated asset cards can still overflow their grid");
  requireCondition(/\.generated-head\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "generated asset headers can still clip long labels");
  requireCondition(/\.generated-action-note\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "generated empty action notes can still force card overflow");
  pass("studio suggestion, target, ATS, and generated asset cards include overflow safeguards");

  requireCondition(/\.rf-studio-stat\s*\{(?=[^}]*container:\s*rf-studio-stat\s*\/\s*inline-size)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "studio metric cards were missing container sizing");
  requireCondition(/\.rf-studio-stat-row\s*\{(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*font-size:\s*clamp\(1\.62rem,\s*17cqi,\s*2\.18rem\))(?=[^}]*line-height:\s*1\.02)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "studio metric values can still overflow or clip");
  requireCondition(/\.rf-studio-stat-row\s+small\s*\{(?=[^}]*line-height:\s*1\.15)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s.test(stylesheetText), "studio metric units can still squeeze value rows");
  requireCondition(/@container\s+rf-studio-stat\s*\(max-width:\s*220px\)\s*\{[^}]*\.rf-studio-stat-row\s*\{[^}]*font-size:\s*clamp\(1\.42rem,\s*16cqi,\s*1\.72rem\)/s.test(stylesheetText), "studio metric values are missing fitted type for compact cards");
  pass("studio metric cards include fitted overflow-safe typography");

  requireCondition(/\.quick-grid,\s*\.metric-grid,\s*\.studio-stats\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "legacy quick and metric grids can still squeeze card tracks");
  requireCondition(/\.quick-card,\s*\.metric,\s*\.studio-stat\s*\{(?=[^}]*container:\s*compact-card\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "legacy quick and metric cards can still overflow");
  requireCondition(/\.drop-title,\s*\.quick-card\s+strong,\s*\.change-item\s+strong,\s*\.issue-card\s+strong,\s*\.summary-strip\s+strong,\s*\.empty-state\s+strong\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "legacy card headings can still overflow or clip");
  requireCondition(/\.drop-hint,\s*\.field-hint,\s*\.quick-card\s+span,\s*\.issue-card\s+p,\s*\.change-item\s+p,\s*\.summary-strip\s+p,\s*\.empty-state\s+p\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s.test(stylesheetText), "legacy card copy can still overflow narrow cards");
  requireCondition(/\.metric-value\s*\{(?=[^}]*font-size:\s*clamp\(1\.25rem,\s*12cqi,\s*1\.55rem\))(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "legacy metric values are missing fitted type");
  requireCondition(/\.stage-chip\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "legacy stage chips can still render cramped labels");
  requireCondition(
    /\.generated-copy-state\s*\{[^}]*max-width:\s*100%[^}]*\}/s.test(stylesheetText) &&
      /\.generated-copy-state\s*\{[^}]*white-space:\s*normal[^}]*\}/s.test(stylesheetText) &&
      /\.generated-copy-state\s*\{[^}]*text-wrap:\s*balance[^}]*\}/s.test(stylesheetText),
    "legacy generated status chip can still force row overflow",
  );
  requireCondition(/\.warning-list\s+span\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s.test(stylesheetText), "legacy warning rows can still overflow cards");
  pass("legacy studio cards and status chips include overflow-safe safeguards");

  requireCondition(/\.rf-intake-card-header\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "workflow intake card headers can still clip narrow labels");
  requireCondition(/\.rf-intake-card\s*\{(?=[^}]*container:\s*rf-intake-card\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s.test(stylesheetText), "workflow intake cards were missing container overflow safeguards");
  requireCondition(/\.rf-intake-next\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "workflow intake next badge can still overflow its header");
  requireCondition(/\.rf-intake-grid\s+\.rf-file-copy\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*245px)[^}]*\}/s.test(stylesheetText), "workflow file copy can still force upload card overflow");
  requireCondition(/\.rf-intake-grid\s+\.rf-file-copy\s+strong\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "workflow uploaded filenames can still overflow");
  requireCondition(/\.rf-intake-grid\s+\.rf-file-action\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s.test(stylesheetText), "workflow file action button can still render cramped");
  requireCondition(/\.rf-intake-grid\s+\.rf-target-segment\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(min\(100%,\s*118px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "workflow target segment can still squeeze its tabs");
  requireCondition(/\.rf-intake-grid\s+\.mode-segment\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*86px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s.test(stylesheetText), "workflow mode segment can still squeeze mode labels");
  requireCondition(/\.mode-segment\s+button\s*\{(?=[^}]*line-height:\s*1\.08)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "base workflow mode buttons can still override wrapping with nowrap");
  requireCondition(!/\.mode-segment\s+button\s*\{[^}]*white-space:\s*nowrap\s*!important[^}]*\}/s.test(stylesheetText), "workflow mode buttons still use nowrap important");
  requireCondition(/\.rf-intake-grid\s+\.rf-target-segment\s+button,\s*\.rf-intake-grid\s+\.mode-segment\s+button\s*\{(?=[^}]*line-height:\s*1\.08)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-align:\s*center)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "workflow segmented buttons can still render clipped labels");
  requireCondition(/@container\s+rf-intake-card\s*\(max-width:\s*310px\)\s*\{[^}]*\.rf-intake-grid\s+\.rf-target-segment,\s*\.rf-intake-grid\s+\.mode-segment\s*\{[^}]*grid-template-columns:\s*1fr/s.test(stylesheetText), "workflow segmented controls are missing compact stacking");
  pass("studio workflow intake cards include long-label safeguards");

  requireCondition(/\.history-filter-bar\s*\{(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText), "history filters can still force panel overflow");
  requireCondition(/\.history-filter-bar\s+button\s*\{(?=[^}]*line-height:\s*1\.08)(?=[^}]*text-align:\s*center)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "history filter labels can still render cramped");
  requireCondition(/\.history-sync-badge\s*\{(?=[^}]*justify-content:\s*center)(?=[^}]*max-width:\s*100%)[^}]*\}/s.test(stylesheetText), "history badges can still force narrow row overflow");
  requireCondition(/\.history-sync-badge\s*\{(?=[^}]*line-height:\s*1\.12)(?=[^}]*text-align:\s*center)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "history badge labels can still render cramped");
  requireCondition(/\.history-actions\s+\.ghost-button\s*\{(?=[^}]*max-width:\s*100%)(?=[^}]*min-height:\s*40px)(?=[^}]*padding:\s*8px\s+12px)(?=[^}]*line-height:\s*1\.12)(?=[^}]*white-space:\s*normal)[^}]*\}/s.test(stylesheetText), "history action buttons can still render cramped labels");
  requireCondition(/\.history-action-download\s*\{(?=[^}]*min-width:\s*min\(100%,\s*132px\))[^}]*\}/s.test(stylesheetText), "history download action can still force row overflow");
  pass("history controls include label wrapping safeguards");

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

async function checkCrawlerMetadata(baseUrl, canonicalUrl = baseUrl) {
  const robots = await request(baseUrl, "/robots.txt", { redirect: "follow" });
  requireCondition(robots.response.ok, `robots.txt returned ${robots.response.status}`);
  requireCondition(robots.text.includes("Sitemap:") && robots.text.includes("/sitemap.xml"), "robots.txt did not reference sitemap.xml");
  requireCondition(robots.text.includes("Disallow: /app"), "robots.txt did not block the protected studio route");
  requireCondition(robots.text.includes("Disallow: /api/"), "robots.txt did not block API routes");

  const sitemap = await request(baseUrl, "/sitemap.xml", { redirect: "follow" });
  requireCondition(sitemap.response.ok, `sitemap.xml returned ${sitemap.response.status}`);
  requireCondition(sitemap.text.includes(`${canonicalUrl}/`) || sitemap.text.includes(`${canonicalUrl}</loc>`), "sitemap.xml did not include the home page");
  requireCondition(sitemap.text.includes(`${canonicalUrl}/templates`), "sitemap.xml did not include templates");
  requireCondition(!sitemap.text.includes(`${canonicalUrl}/app`), "sitemap.xml included the protected studio route");
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

export async function checkSignedInBackendWorkflowBridge(baseUrl, backendUrl, cookie, accessToken, options = {}) {
  const requireBackendWorkflowSmoke = Boolean(options.requireBackendWorkflowSmoke);

  if (!accessToken) {
    requireCondition(
      !requireBackendWorkflowSmoke,
      "Backend workflow smoke requires ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD or ROLEFORGE_SMOKE_ACCESS_TOKEN",
    );
    skip("backend workflow smoke skipped because no smoke access token is available");
    return cookie;
  }

  let signedInCookie = cookie;
  let createdProjectId = "";
  let pendingError = null;

  const uploadForm = new FormData();
  uploadForm.set("file", new Blob([SMOKE_RESUME_TEXT], { type: "text/plain" }), "roleforge-smoke-resume.txt");

  const upload = await requestBackend(backendUrl, "/upload", {
    method: "POST",
    body: uploadForm,
    redirect: "follow",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  requireCondition(upload.response.ok, `backend smoke upload returned ${upload.response.status}: ${upload.text.slice(0, 160)}`);
  const uploadPayload = JSON.parse(upload.text);
  requireCondition(uploadPayload.resume_id, "backend smoke upload did not return a resume id");
  requireCondition(uploadPayload.format === "txt", `backend smoke upload did not detect TXT: ${upload.text.slice(0, 160)}`);
  requireCondition(uploadPayload.text_preview?.includes("Avery Stone"), "backend smoke upload preview did not include resume text");

  const exportPayload = {
    title: "RoleForge Smoke Resume",
    filename: "roleforge-smoke-tailored-resume-engineer.pdf",
    content: SMOKE_TAILORED_TEXT,
    format: "pdf",
    template: "engineer",
  };
  const exported = await requestBackend(backendUrl, "/export", {
    method: "POST",
    redirect: "follow",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(exportPayload),
  });
  requireCondition(exported.response.ok, `backend smoke export returned ${exported.response.status}: ${exported.text.slice(0, 160)}`);
  const exportedPayload = JSON.parse(exported.text);
  const downloadFilename = exportedPayload.download_filename || exportedPayload.filename;
  requireCondition(
    typeof downloadFilename === "string" && downloadFilename.endsWith(".pdf"),
    `backend smoke export did not return a PDF filename: ${exported.text.slice(0, 160)}`,
  );

  const downloadUrl = `/api/workflow/download/${encodeURIComponent(downloadFilename)}`;
  const proxiedHead = await request(baseUrl, downloadUrl, { method: "HEAD", cookie: signedInCookie, redirect: "follow" });
  signedInCookie = mergeSetCookieHeaders(signedInCookie, proxiedHead.response);
  requireCondition(proxiedHead.response.ok, `frontend workflow download HEAD returned ${proxiedHead.response.status}`);
  requireCondition(
    (proxiedHead.response.headers.get("content-type") || "").startsWith("application/pdf"),
    `frontend workflow download HEAD was not PDF: ${proxiedHead.response.headers.get("content-type") || "(missing)"}`,
  );

  const proxiedDownload = await request(baseUrl, downloadUrl, { cookie: signedInCookie, redirect: "follow" });
  signedInCookie = mergeSetCookieHeaders(signedInCookie, proxiedDownload.response);
  requireCondition(proxiedDownload.response.ok, `frontend workflow download returned ${proxiedDownload.response.status}`);
  requireCondition(
    (proxiedDownload.response.headers.get("content-type") || "").startsWith("application/pdf"),
    `frontend workflow download was not PDF: ${proxiedDownload.response.headers.get("content-type") || "(missing)"}`,
  );
  requireCondition(proxiedDownload.text.startsWith("%PDF"), "frontend workflow download did not return PDF bytes");

  const smokeRun = buildSmokeSavedRunPayload({
    id: `roleforge-smoke-workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    filename: uploadPayload.filename || "roleforge-smoke-resume.txt",
    sourceResumeName: uploadPayload.filename || "roleforge-smoke-resume.txt",
    jobTarget: "RoleForge backend workflow smoke target",
    roleHint: "RoleForge backend workflow smoke target",
    score: 90,
    atsScore: 92,
    downloadUrl,
    downloadFilename,
    downloadFormat: "pdf",
    payload: {
      studioSnapshot: {
        sourcePreviewText: uploadPayload.text_preview || SMOKE_RESUME_TEXT,
        jdText: "RoleForge backend workflow smoke target",
        inputMode: "text",
        tailoringMode: "balanced",
        downloadUrl,
        downloadFormat: "pdf",
        downloads: { pdf: downloadUrl },
        templateSlug: "engineer",
        templateName: "Engineer",
        uploadMeta: {
          resume_id: uploadPayload.resume_id,
          filename: uploadPayload.filename || "roleforge-smoke-resume.txt",
          format: uploadPayload.format || "txt",
          character_count: uploadPayload.character_count || SMOKE_RESUME_TEXT.length,
          text_preview: uploadPayload.text_preview || SMOKE_RESUME_TEXT,
          text_preview_truncated: uploadPayload.text_preview_truncated === true,
        },
        result: {
          run_id: `roleforge-smoke-workflow-${downloadFilename}`,
          tailored_text: SMOKE_TAILORED_TEXT,
          change_log: ["Smoke backend upload, export, protected download, and saved-project bridge"],
          suggestions: [],
          ats_before: { issues: [] },
          ats_after: { issues: [] },
        },
      },
    },
  });

  try {
    const created = await request(baseUrl, "/api/saved-runs", {
      cookie: signedInCookie,
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smokeRun),
    });
    signedInCookie = mergeSetCookieHeaders(signedInCookie, created.response);
    requireCondition(created.response.ok, `backend workflow saved project create returned ${created.response.status}: ${created.text.slice(0, 160)}`);
    const createdPayload = JSON.parse(created.text);
    createdProjectId = createdPayload.projectId;
    requireCondition(createdProjectId, "backend workflow saved project create did not return a project id");

    const listed = await request(baseUrl, "/api/saved-runs", { cookie: signedInCookie, redirect: "follow" });
    signedInCookie = mergeSetCookieHeaders(signedInCookie, listed.response);
    requireCondition(listed.response.ok, `backend workflow saved project list returned ${listed.response.status}`);
    const listedPayload = JSON.parse(listed.text);
    const createdRun = listedPayload.runs?.find((run) => run.id === smokeRun.id || run.projectId === createdProjectId);
    requireCondition(createdRun, "backend workflow saved project list did not include the smoke run");
    requireCondition(createdRun.downloadUrl === downloadUrl, "backend workflow saved project did not preserve the protected download URL");
    requireCondition(createdRun.snapshot?.result?.tailored_text === SMOKE_TAILORED_TEXT, "backend workflow saved project did not preserve the restorable tailored draft");
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
        requireCondition(deleted.response.ok, `backend workflow saved project delete returned ${deleted.response.status}: ${deleted.text.slice(0, 160)}`);
      } catch (cleanupError) {
        if (!pendingError) pendingError = cleanupError;
        else console.error(`Backend workflow saved project cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
    }
  }

  if (pendingError) throw pendingError;

  pass("signed-in backend workflow supports upload, PDF export, protected download proxy, and saved-project restore data");
  return signedInCookie;
}

async function checkSignedInStatus(baseUrl, cookie, options) {
  const { accessToken, backendUrl, cookieSource, expectPremiumAccess, requireBackendWorkflowSmoke, requireSignedInSmoke } = options;

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
  const appPath = new URL(app.response.url || `${baseUrl}/app`).pathname;
  requireCondition(appPath === "/app", `signed-in studio ended at ${appPath} instead of /app`);
  requireCondition(app.text.includes("RoleForge AI"), "signed-in studio did not render the RoleForge shell");
  pass("signed-in account can access the protected studio route");

  const savedRuns = await request(baseUrl, "/api/saved-runs", { cookie: signedInCookie, redirect: "follow" });
  signedInCookie = mergeSetCookieHeaders(signedInCookie, savedRuns.response);
  requireCondition(savedRuns.response.ok, `signed-in saved projects returned ${savedRuns.response.status}`);
  const savedRunsPayload = JSON.parse(savedRuns.text);
  requireCondition(Array.isArray(savedRunsPayload.runs), "signed-in saved projects did not return a runs array");
  pass("signed-in saved projects API returns account runs");

  signedInCookie = await checkSignedInSavedProjectRoundTrip(baseUrl, signedInCookie);
  signedInCookie = await checkSignedInBackendWorkflowBridge(baseUrl, backendUrl, signedInCookie, accessToken, {
    requireBackendWorkflowSmoke,
  });

  const settings = await request(baseUrl, "/settings", { cookie: signedInCookie, redirect: "follow" });
  requireCondition(settings.response.ok, `signed-in settings returned ${settings.response.status}`);
  requireCondition(settings.text.includes("Settings"), "signed-in settings did not render the settings page");
  requireCondition(settings.text.includes("Current plan"), "signed-in settings did not render account plan details");
  pass("signed-in settings renders account plan details");
}

async function main(argv = process.argv.slice(2)) {
  const args = parseSmokeArgs(argv);
  const baseUrl = normalizeBaseUrl(args.baseUrl || process.env.ROLEFORGE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
  const backendUrl = normalizeBaseUrl(args.backendUrl || process.env.ROLEFORGE_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL);
  const canonicalUrl = normalizeBaseUrl(
    args.canonicalUrl
    || process.env.ROLEFORGE_CANONICAL_URL
    || (isLocalBaseUrl(baseUrl) ? process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL : baseUrl),
  );
  const cookieFromEnv = process.env.ROLEFORGE_SMOKE_COOKIE?.trim();
  const tokenFromEnv = process.env.ROLEFORGE_SMOKE_ACCESS_TOKEN?.trim();
  const smokeAccount = cookieFromEnv ? null : await signInSmokeAccount();
  const cookieFromSmokeAccount = smokeAccount?.cookie || "";
  const cookie = cookieFromEnv || cookieFromSmokeAccount;
  const accessToken = tokenFromEnv || smokeAccount?.accessToken || "";
  const cookieSource = cookieFromEnv ? "ROLEFORGE_SMOKE_COOKIE" : cookieFromSmokeAccount ? "ROLEFORGE_SMOKE_EMAIL/ROLEFORGE_SMOKE_PASSWORD" : "";
  const requireSignedInSmoke = args.requireSignedInSmoke ?? readBooleanEnv("ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE");
  const expectPremiumAccess = args.expectPremiumAccess ?? readBooleanEnv("ROLEFORGE_EXPECT_PREMIUM_ACCESS");
  const requireBackendWorkflowSmoke = args.requireBackendWorkflowSmoke ?? readBooleanEnv("ROLEFORGE_REQUIRE_BACKEND_WORKFLOW_SMOKE");

  try {
    await checkPublicShell(baseUrl);
    await checkAnonymousAuthStatus(baseUrl);
    await checkAnonymousGate(baseUrl);
    await checkAnonymousAccountDataGate(baseUrl);
    await checkAnonymousBillingGate(baseUrl);
    await checkBillingWebhookGate(baseUrl);
    await checkCrawlerMetadata(baseUrl, canonicalUrl);
    await checkBackendCapabilities(backendUrl);
    await checkSignedInStatus(baseUrl, cookie, {
      accessToken,
      backendUrl,
      cookieSource,
      expectPremiumAccess,
      requireBackendWorkflowSmoke,
      requireSignedInSmoke,
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
