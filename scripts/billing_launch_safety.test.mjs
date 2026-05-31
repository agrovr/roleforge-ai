import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const authStatusRoute = readFileSync("app/api/auth/status/route.ts", "utf8");
const checkoutRoute = readFileSync("app/api/billing/checkout/route.ts", "utf8");
const portalRoute = readFileSync("app/api/billing/portal/route.ts", "utf8");
const webhookRoute = readFileSync("app/api/billing/webhook/route.ts", "utf8");

test("production billing routes fail closed unless live billing is ready", () => {
  assert.match(checkoutRoute, /billingReadiness\(billingConfig/);
  assert.match(checkoutRoute, /!billingReady\.checkoutReady/);
  assert.match(portalRoute, /!billingConfig\.liveModeReady/);
});

test("Stripe session creation failures return to Settings instead of API errors", () => {
  assert.match(checkoutRoute, /try\s*{\s*[\s\S]*stripe\.checkout\.sessions\.create/);
  assert.match(checkoutRoute, /Checkout session creation failed/);
  assert.match(checkoutRoute, /Checkout session creation returned no URL/);
  assert.doesNotMatch(checkoutRoute, /NextResponse\.json\(\s*{\s*error:\s*"Billing is temporarily unavailable/);
  assert.doesNotMatch(portalRoute, /NextResponse\.json\(\s*{\s*error:\s*"Billing is temporarily unavailable/);
  assert.match(portalRoute, /try\s*{\s*[\s\S]*stripe\.billingPortal\.sessions\.create/);
  assert.match(portalRoute, /Billing portal session creation failed/);
  assert.match(checkoutRoute, /\/settings\?billing=temporarily-unavailable#billing/);
  assert.match(portalRoute, /\/settings\?billing=temporarily-unavailable#billing/);
});

test("billing webhooks use checkout ownership fallback and ignore unrelated subscription events", () => {
  assert.match(webhookRoute, /checkoutSessionUserId\(session\)/);
  assert.match(webhookRoute, /subscriptionSupabaseUserId\(subscription\)/);
  assert.match(webhookRoute, /Ignoring Stripe subscription/);
  assert.match(webhookRoute, /syncSubscriptionEntitlement\(subscription,\s*{\s*supabaseUserId:\s*userId\s*}\)/);
});

test("direct checkout navigation redirects to the billing UI instead of rendering an API error", () => {
  assert.match(checkoutRoute, /export async function GET\(request: Request\)/);
  assert.match(checkoutRoute, /\/settings#billing/);
  assert.match(checkoutRoute, /\/login\?next=\/settings&account=signin-required/);
});

test("direct billing portal navigation redirects to the billing UI instead of rendering an API error", () => {
  assert.match(portalRoute, /export async function GET\(request: Request\)/);
  assert.match(portalRoute, /\/settings#billing/);
  assert.match(portalRoute, /\/login\?next=\/settings&account=signin-required/);
});

test("settings billing actions submit with POST instead of opening API routes as pages", () => {
  assert.match(settingsPage, /<form action="\/api\/billing\/checkout" method="post">/);
  assert.match(settingsPage, /<form action="\/api\/billing\/portal" method="post">/);
});

test("checkout sessions allow promotion codes for launch testing and controlled discounts", () => {
  assert.match(checkoutRoute, /allow_promotion_codes:\s*true/);
});

test("public and signed-in shells expose billing readiness before promising upgrades", () => {
  assert.match(authStatusRoute, /billingReadiness\(getStripeBillingConfig\(\)/);
  assert.match(authStatusRoute, /\bbilling,\s*\n/);
  assert.match(landingPage, /checkoutReady:\s*boolean/);
  assert.match(landingPage, /premiumPaused\s*=\s*!premiumActive\s*&&\s*!checkoutReady/);
  assert.match(landingPage, /Premium billing is paused for launch/);
  assert.match(landingPage, /Use free studio/);
});
