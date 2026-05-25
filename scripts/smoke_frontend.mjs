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

async function checkPublicShell(baseUrl) {
  const home = await request(baseUrl, "/", { redirect: "follow" });
  requireCondition(home.response.ok, `home returned ${home.response.status}`);
  requireCondition(home.text.includes("RoleForge AI"), "home did not include RoleForge AI brand copy");
  requireCondition(home.text.includes("/app"), "home did not include a studio route");
  pass("home page renders the RoleForge shell");

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
    await checkAnonymousGate(baseUrl);
    await checkSignedInStatus(baseUrl, cookie);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

await main();
