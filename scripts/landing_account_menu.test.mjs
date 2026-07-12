import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("landing nav exposes a signed-in account menu from real account data", () => {
  assert.match(landingPage, /import \{ AccountAvatar \}/);
  assert.match(landingPage, /accountDisplayName\(user,\s*profile\?\.displayName\)/);
  assert.match(landingPage, /accountReference\(user\.id\)/);
  assert.match(landingPage, /isSupportAdminUser\(user\)/);
  assert.match(landingPage, /supportAdmin/);
  assert.match(landingPage, /accountAvatarUrl\(user\)/);
  assert.match(landingPage, /loadAccountProfile\(supabase,\s*user\.id\)/);
  assert.match(landingPage, /className="landing-account-menu"/);
  assert.match(landingPage, /data-account-menu="true"/);
  assert.match(landingPage, /aria-label="Open account menu"/);
  assert.match(landingPage, /aria-haspopup="menu"/);
  assert.match(landingPage, /aria-expanded="false"/);
  assert.match(landingPage, /accountReferenceLabel/);
  assert.match(landingPage, /Account ref \{accountReferenceLabel\}/);
  assert.match(landingPage, /className="studio-account-reference"/);
  assert.match(landingPage, /className="studio-account-reference-copy"/);
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
  assert.match(landingPage, /href="\/admin\/support"/);
  assert.match(landingPage, /Support inbox/);
  assert.match(landingPage, /action="\/auth\/signout"/);
});

test("landing account menu stays compact in the nav", () => {
  assert.match(stylesheet, /\.landing-account-menu\s*\{(?=[^}]*position:\s*relative)(?=[^}]*display:\s*inline-flex)[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-button\s*\{(?=[^}]*width:\s*42px)(?=[^}]*height:\s*42px)[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-popover\s*\{(?=[^}]*width:\s*min\(430px,\s*calc\(100vw\s*-\s*36px\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.studio-account-reference\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s);
  assert.match(stylesheet, /\.studio-account-reference-copy\s*\{(?=[^}]*min-height:\s*26px)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-insights\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(stylesheet, /\.studio-account-next-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.studio-account-next-actions\s+a\s*\{(?=[^}]*min-height:\s*42px)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.landing-account-popover\s*\{(?=[^}]*right:\s*0)(?=[^}]*left:\s*auto)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.landing-account-popover::before\s*\{(?=[^}]*right:\s*18px)(?=[^}]*left:\s*auto)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.landing-account-popover\s*\{(?=[^}]*right:\s*0)(?=[^}]*width:\s*min\(360px,\s*calc\(100vw\s*-\s*24px\)\))[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.landing-account-popover\s*\{(?=[^}]*right:\s*-12px)(?=[^}]*width:\s*min\(340px,\s*calc\(100vw\s*-\s*18px\)\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.landing-account-button/);
});

test("landing pricing explains billing management before checkout", () => {
  assert.match(landingPage, /Everything in Studio/);
  assert.match(landingPage, /PDF, DOCX, and TXT exports/);
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

test("landing pricing presents real plan state as quiet metadata", () => {
  assert.match(landingPage, /const freeStatus = signedIn && !premiumActive \? "Current plan" : "Free plan";/);
  assert.match(landingPage, /premiumPaused[\s\S]*?"Unavailable"[\s\S]*?signedIn[\s\S]*?"Available"[\s\S]*?"Premium plan"/);
  assert.match(landingPage, /const freeStatusTone = signedIn && !premiumActive \? "current" : "starter";/);
  assert.match(landingPage, /const premiumStatusTone = premiumActive \? "current" : premiumPaused \? "paused" : "upgrade";/);
  assert.match(landingPage, /className=\{`price-status \$\{premiumStatusTone\}`\}/);
  assert.match(stylesheet, /\.pricing-grid\.two\s+\.price-status\s*\{(?=[^}]*min-height:\s*0)(?=[^}]*justify-content:\s*flex-end)(?=[^}]*padding:\s*2px 0)(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*letter-spacing:\s*0\.08em)[^}]*\}/s);
  assert.match(stylesheet, /\.pricing-grid\.two\s+\.price-status::before,[\s\S]*?\.pricing-grid\.two\s+\.price-card\.featured\s+\.price-status\.current::before\s*\{[^}]*content:\s*none[^}]*\}/s);
  assert.match(stylesheet, /\.pricing-grid\.two\s+\.price-card\.featured\s+\.price-status,[\s\S]*?\.pricing-grid\.two\s+\.price-card\.featured\s+\.price-status\.paused\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*color:\s*#f5d69a)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.pricing-grid\.two\s+\.price-card\.featured\s+\.price-status,[\s\S]*?\.price-status\.current\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*color:\s*#f5d69a)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
});

test("landing footer reads as a complete product footer", () => {
  assert.match(landingPage, /const currentYear = new Date\(\)\.getFullYear\(\);/);
  assert.match(landingPage, /className="footer-brand-block"/);
  assert.match(landingPage, /A focused resume tailoring workspace/);
  assert.match(landingPage, /Stripe-backed Premium billing/);
  assert.match(landingPage, /Protected studio/);
  assert.match(landingPage, /Premium DOCX\/TXT/);
  assert.match(landingPage, /Account exports/);
  assert.match(landingPage, /Payments by Stripe/);
  assert.match(landingPage, /Google sign-in supported/);
  assert.match(landingPage, /className="footer-meta-links"/);
  assert.match(landingPage, /<h3>Account<\/h3>/);
  assert.match(landingPage, /<h3>Legal<\/h3>/);
  assert.match(landingPage, /href="\/settings#billing"/);
  assert.match(landingPage, /&copy; \{currentYear\} RoleForge AI\. All rights reserved\./);
  assert.match(stylesheet, /\.footer-inner\s*\{(?=[^}]*grid-template-columns:\s*minmax\(300px,\s*1\.35fr\)\s+repeat\(4,\s*minmax\(122px,\s*0\.56fr\)\))(?=[^}]*align-items:\s*start)[^}]*\}/s);
  assert.match(stylesheet, /\.footer-brand-block\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*16px)(?=[^}]*max-width:\s*560px)[^}]*\}/s);
  assert.match(stylesheet, /\.footer-product-note\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*gap:\s*9px)[^}]*\}/s);
  assert.match(stylesheet, /\.footer-product-note\s+span,\s*\.footer-trust-row\s+span\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*font-weight:\s*760)[^}]*\}/s);
  assert.match(stylesheet, /\.footer-col\s+a,\s*\.footer-col\s+span\s*\{(?=[^}]*min-height:\s*30px)(?=[^}]*font-size:\s*0\.96rem)[^}]*\}/s);
  assert.match(stylesheet, /\.footer-meta-links\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s);
  assert.match(stylesheet, /\.footer-meta\s*\{(?=[^}]*justify-content:\s*space-between)(?=[^}]*align-items:\s*center)(?=[^}]*border-top:\s*1px solid var\(--line\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.footer-product-note span/);
});
