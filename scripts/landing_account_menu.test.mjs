import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("landing nav exposes a signed-in account menu from real account data", () => {
  assert.match(landingPage, /import \{ AccountAvatar \}/);
  assert.match(landingPage, /accountDisplayName\(user,\s*profile\?\.displayName\)/);
  assert.match(landingPage, /accountAvatarUrl\(user\)/);
  assert.match(landingPage, /loadAccountProfile\(supabase,\s*user\.id\)/);
  assert.match(landingPage, /className="landing-account-menu"/);
  assert.match(landingPage, /data-account-menu="true"/);
  assert.match(landingPage, /aria-label="Open account menu"/);
  assert.match(landingPage, /aria-label="Landing account summary"/);
  assert.match(landingPage, /href="\/settings#billing"/);
  assert.match(landingPage, /href="\/status"/);
  assert.match(landingPage, /href="\/updates"/);
  assert.match(landingPage, /href="\/support"/);
  assert.match(landingPage, /href="\/api\/account\/export"/);
  assert.match(landingPage, /Recommended account actions/);
  assert.match(landingPage, /landingBillingAction/);
  assert.match(landingPage, /Resume work/);
  assert.match(landingPage, /Manage billing/);
  assert.match(landingPage, /View Premium/);
  assert.match(landingPage, /Billing status/);
  assert.match(landingPage, /Saved projects/);
  assert.match(landingPage, /Export account record/);
  assert.match(landingPage, /href="\/settings#support"/);
  assert.match(landingPage, /Support history/);
  assert.match(landingPage, /System status/);
  assert.match(landingPage, /Updates/);
  assert.match(landingPage, /Contact support/);
  assert.match(landingPage, /action="\/auth\/signout"/);
});

test("landing account menu stays compact in the nav", () => {
  assert.match(stylesheet, /\.landing-account-menu\s*\{(?=[^}]*position:\s*relative)(?=[^}]*display:\s*inline-flex)[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-button\s*\{(?=[^}]*width:\s*42px)(?=[^}]*height:\s*42px)[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-popover\s*\{(?=[^}]*width:\s*min\(430px,\s*calc\(100vw\s*-\s*36px\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-insights\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(stylesheet, /\.studio-account-next-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.studio-account-next-actions\s+a\s*\{(?=[^}]*min-height:\s*42px)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.landing-account-popover\s*\{(?=[^}]*right:\s*0)(?=[^}]*width:\s*min\(360px,\s*calc\(100vw\s*-\s*24px\)\))[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.landing-account-popover\s*\{(?=[^}]*right:\s*-12px)(?=[^}]*width:\s*min\(340px,\s*calc\(100vw\s*-\s*18px\)\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.landing-account-button/);
});

test("landing pricing explains billing management before checkout", () => {
  assert.match(landingPage, /pricing-clarity-grid/);
  assert.match(landingPage, /aria-label="Billing clarity"/);
  assert.match(landingPage, /Manage in Settings/);
  assert.match(landingPage, /Stripe billing opens from Settings for invoices, payment methods, and plan changes\./);
  assert.match(landingPage, /Cancel through billing/);
  assert.match(landingPage, /Premium access stays active through the paid period\./);
  assert.match(landingPage, /Billing support/);
  assert.match(landingPage, /contextUrl:\s*"\/#pricing"/);
  assert.match(landingPage, /Can I cancel Premium\?/);
  assert.match(landingPage, /Premium access remains active until that period ends\./);
  assert.match(stylesheet, /\.pricing-clarity-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.pricing-clarity-grid\s+a\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.pricing-clarity-grid\s+strong,\s*\.pricing-clarity-grid\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.pricing-clarity-grid a/);
});

test("landing pricing status pills stay readable on dark featured cards", () => {
  assert.match(landingPage, /const freeStatusTone = signedIn && !premiumActive \? "current" : "starter";/);
  assert.match(landingPage, /const premiumStatusTone = premiumActive \? "current" : premiumPaused \? "paused" : "upgrade";/);
  assert.match(landingPage, /className=\{`price-status \$\{premiumStatusTone\}`\}/);
  assert.match(stylesheet, /\.price-card\.featured\s+\.price-status\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.42\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*color:\s*#fff7e9)[^}]*\}/s);
  assert.match(stylesheet, /\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*250,\s*240,\s*0\.98\))(?=[^}]*background:\s*linear-gradient\(135deg,\s*#fffaf0\s*0%,\s*#ffd276\s*100%\))(?=[^}]*color:\s*#140a02)[^}]*\}/s);
  assert.match(stylesheet, /\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*#fffaf0)(?=[^}]*background:\s*linear-gradient\(135deg,\s*#fffdf8\s*0%,\s*#ffd276\s*100%\))(?=[^}]*color:\s*#0f0802)(?=[^}]*0 0 0 1px rgba\(8,\s*12,\s*24,\s*0\.3\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*250,\s*240,\s*0\.98\))(?=[^}]*background:\s*linear-gradient\(135deg,\s*#fffdf8\s*0%,\s*#ffd276\s*100%\))(?=[^}]*color:\s*#0f0802)(?=[^}]*0 0 0 1px rgba\(8,\s*12,\s*24,\s*0\.3\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*#fffaf0)(?=[^}]*background:\s*linear-gradient\(135deg,\s*#fffdf8\s*0%,\s*#ffd276\s*100%\))(?=[^}]*color:\s*#0b0601)(?=[^}]*0 0 0 1px rgba\(8,\s*12,\s*24,\s*0\.34\))[^}]*\}/s);
});
