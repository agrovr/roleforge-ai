import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accountStatusClient = readFileSync("app/lib/accountStatusClient.ts", "utf8");
const accountStatusRoute = readFileSync("app/api/auth/status/route.ts", "utf8");
const landingPage = readFileSync("app/page.tsx", "utf8");
const proxy = readFileSync("proxy.ts", "utf8");
const studioPage = readFileSync("app/app/page.tsx", "utf8");
const templatesPage = readFileSync("app/templates/page.tsx", "utf8");

test("account status reads are shared briefly without making private responses cacheable", () => {
  assert.match(accountStatusClient, /ACCOUNT_STATUS_CACHE_TTL_MS = 30_000/);
  assert.match(accountStatusClient, /pendingStatusRequest/);
  assert.match(accountStatusClient, /cache:\s*"no-store"/);
  assert.match(accountStatusClient, /credentials:\s*"same-origin"/);
  assert.match(accountStatusRoute, /Cache-Control", "private, no-store"/);
  assert.doesNotMatch(accountStatusRoute, /reconcileUserSubscriptionEntitlement/);
});

test("Studio uses the shared status loader and forces refreshes after account mutations", () => {
  assert.match(studioPage, /import \{ loadAccountStatus \} from "\.\.\/lib\/accountStatusClient"/);
  assert.match(studioPage, /loadAccountStatus<AccountStatus>\(\{ force \}\)/);
  assert.match(studioPage, /refreshAccountStatus\(undefined, true\)/);
});

test("protected route checks preserve Supabase private response headers", () => {
  assert.match(proxy, /supabase\.auth\.getClaims\(\)/);
  assert.doesNotMatch(proxy, /supabase\.auth\.getUser\(\)/);
  assert.match(proxy, /setAll\(cookiesToSet, headersToSet\)/);
  assert.match(proxy, /Object\.entries\(headersToSet \?\? \{\}\)/);
  assert.match(proxy, /response\.headers\.set\(name, value\)/);
});

test("public landing and templates use verified claims without a remote auth user lookup", () => {
  assert.match(landingPage, /supabase\.auth\.getClaims\(\)/);
  assert.doesNotMatch(landingPage, /supabase\.auth\.getUser\(\)/);
  assert.match(landingPage, /const \[entitlement, profile\] = user && supabase[\s\S]*?await Promise\.all\(\[/);
  assert.match(templatesPage, /supabase\.auth\.getClaims\(\)/);
  assert.doesNotMatch(templatesPage, /supabase\.auth\.getUser\(\)/);
  assert.match(templatesPage, /const \[authResult, cookieStore\] = await Promise\.all\(\[/);
});
