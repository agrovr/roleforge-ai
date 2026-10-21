import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PREMIUM_PRICE } from "../app/lib/billing/stripe.ts";
import { FREE_ENTITLEMENT } from "../app/lib/entitlements.ts";

// tsx uses the classic JSX runtime outside Next's compiler.
globalThis.React = React;
const { PricingPlans } = await import("../app/pricing/PricingPlans.tsx");
const base = { prices: PREMIUM_PRICE, freeRunLimit: FREE_ENTITLEMENT.monthlyRunLimit, signedIn: false, premiumActive: false, premiumEnding: false, checkoutReady: true, initialInterval: "month", studioHref: "/login?next=/app" };
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(PricingPlans, { ...base, ...overrides }));

test("pricing preserves the selected billing interval through sign-in", () => {
  const html = render({ initialInterval: "year" });
  assert.ok(html.includes(`/login?next=${encodeURIComponent("/pricing?interval=year")}`));
  assert.match(html, /\$72 billed once a year/);
  assert.match(html, /\$6<\/strong>/);
  assert.match(html, /Save 33%/);
  assert.doesNotMatch(html, /action="\/api\/billing\/checkout"/);
});

test("ready signed-in checkout posts the exact selected interval", () => {
  for (const interval of ["month", "year"]) {
    const html = render({ signedIn: true, initialInterval: interval });
    assert.match(html, /<form action="\/api\/billing\/checkout" method="post">/);
    assert.ok(html.includes(`name="interval" value="${interval}"`));
  }
});

test("unavailable checkout never offers a purchase for either auth state", () => {
  for (const signedIn of [false, true]) {
    const html = render({ signedIn, checkoutReady: false });
    assert.match(html, /Premium checkout is currently unavailable/);
    assert.match(html, /Use free studio/);
    assert.doesNotMatch(html, /action="\/api\/billing\/checkout"|Sign in to upgrade/);
  }
});

test("active and canceling Premium use account management instead of duplicate checkout", () => {
  for (const premiumEnding of [false, true]) {
    const html = render({ signedIn: true, premiumActive: true, premiumEnding, checkoutReady: false });
    assert.match(html, /href="\/settings#billing"[^>]*>Manage Premium/);
    assert.doesNotMatch(html, /action="\/api\/billing\/checkout"|Premium checkout is currently unavailable/);
    if (premiumEnding) assert.match(html, /Active until period end/);
  }
});

test("price display and savings derive from supplied server prices", () => {
  const html = render({ prices: { monthly: 1200, yearly: 10800, currency: "usd" }, initialInterval: "year", freeRunLimit: 7 });
  assert.match(html, /Save 25%/);
  assert.match(html, /\$108 billed once a year/);
  assert.match(html, /\$9<\/strong>/);
  assert.match(html, /7 tailoring runs each month/);
});
