import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/page.tsx", "utf8");
const authStatusRoute = readFileSync("app/api/auth/status/route.ts", "utf8");
const checkoutRoute = readFileSync("app/api/billing/checkout/route.ts", "utf8");
const portalRoute = readFileSync("app/api/billing/portal/route.ts", "utf8");

test("production billing routes fail closed unless live billing is ready", () => {
  assert.match(checkoutRoute, /billingReadiness\(billingConfig/);
  assert.match(checkoutRoute, /!billingReady\.checkoutReady/);
  assert.match(portalRoute, /!billingConfig\.liveModeReady/);
});

test("public and signed-in shells expose billing readiness before promising upgrades", () => {
  assert.match(authStatusRoute, /billingReadiness\(getStripeBillingConfig\(\)/);
  assert.match(authStatusRoute, /\bbilling,\s*\n/);
  assert.match(landingPage, /checkoutReady:\s*boolean/);
  assert.match(landingPage, /premiumPaused\s*=\s*!premiumActive\s*&&\s*!checkoutReady/);
  assert.match(landingPage, /Premium billing is paused for launch/);
  assert.match(landingPage, /Use free studio/);
});
