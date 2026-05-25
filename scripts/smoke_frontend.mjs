#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";

function normalizeBaseUrl(value) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(raw)) throw new Error(`Invalid base URL: ${raw}`);
  return raw;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
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

async function checkSignedInStatus(baseUrl, cookie) {
  if (!cookie) {
    pass("signed-in smoke skipped because ROLEFORGE_SMOKE_COOKIE is not configured");
    return;
  }

  const status = await request(baseUrl, "/api/auth/status", { cookie, redirect: "follow" });
  requireCondition(status.response.ok, `auth status returned ${status.response.status}`);
  const payload = JSON.parse(status.text);
  requireCondition(payload.configured === true && payload.enabled === true, "auth status did not report enabled Supabase auth");
  requireCondition(payload.user?.id, "auth status did not include a signed-in user");
  requireCondition(payload.entitlement?.plan, "auth status did not include an account plan");
  pass("signed-in auth status returns account and plan state");

  const app = await request(baseUrl, "/app", { cookie, redirect: "follow" });
  requireCondition(app.response.ok, `signed-in studio returned ${app.response.status}`);
  requireCondition(app.text.includes("RoleForge AI"), "signed-in studio did not render the RoleForge shell");
  requireCondition(app.text.includes("Resume studio"), "signed-in studio did not render the workspace");
  pass("signed-in studio renders the workspace shell");

  const settings = await request(baseUrl, "/settings", { cookie, redirect: "follow" });
  requireCondition(settings.response.ok, `signed-in settings returned ${settings.response.status}`);
  requireCondition(settings.text.includes("Settings"), "signed-in settings did not render the settings page");
  requireCondition(settings.text.includes("Current plan"), "signed-in settings did not render account plan details");
  pass("signed-in settings renders account plan details");
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.ROLEFORGE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
  const cookie = process.env.ROLEFORGE_SMOKE_COOKIE?.trim();

  try {
    await checkPublicShell(baseUrl);
    await checkAnonymousAuthStatus(baseUrl);
    await checkAnonymousGate(baseUrl);
    await checkCrawlerMetadata(baseUrl);
    await checkSignedInStatus(baseUrl, cookie);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

await main();
