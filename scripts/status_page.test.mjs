import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const statusPage = readFileSync("app/status/page.tsx", "utf8");
const landingPage = readFileSync("app/page.tsx", "utf8");
const studioPage = readFileSync("app/app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const legalPage = readFileSync("app/components/LegalPage.tsx", "utf8");
const robotsRoute = readFileSync("app/robots.ts", "utf8");
const sitemapRoute = readFileSync("app/sitemap.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");
const smokeFrontend = readFileSync("scripts/smoke_frontend.mjs", "utf8");
const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("status page uses live deployment readiness sources", () => {
  assert.match(statusPage, /export const dynamic = "force-dynamic"/);
  assert.match(statusPage, /title: "System Status"/);
  assert.match(statusPage, /canonical: "\/status"/);
  assert.match(statusPage, /getSupabaseConfig\(\)/);
  assert.match(statusPage, /billingReadiness\(getStripeBillingConfig\(\)/);
  assert.match(statusPage, /process\.env\.NEXT_PUBLIC_BACKEND_URL/);
  assert.match(statusPage, /fetch\(`\$\{baseUrl\}\/capabilities`/);
  assert.match(statusPage, /cache: "no-store"/);
  assert.match(statusPage, /normalizeWorkflowCapabilities/);
});

test("status page covers account, workflow, export, and billing surfaces", () => {
  assert.match(statusPage, /Account access/);
  assert.match(statusPage, /Resume workflow/);
  assert.match(statusPage, /Exports/);
  assert.match(statusPage, /Premium billing/);
  assert.match(statusPage, /Free PDF workflow can remain available/);
  assert.match(statusPage, /System status/);
  assert.match(statusPage, /href="\/templates"/);
  assert.match(statusPage, /href="\/support"/);
  assert.match(statusPage, /href="\/updates"/);
  assert.doesNotMatch(statusPage, /backend missing/i);
  assert.doesNotMatch(statusPage, /Supabase configuration missing/i);
  assert.doesNotMatch(statusPage, /STRIPE_SECRET_KEY/);
});

test("status page is discoverable from public and signed-in navigation", () => {
  assert.match(landingPage, /href="\/status"/);
  assert.match(studioPage, /href="\/status"/);
  assert.match(settingsPage, /href="\/status"/);
  assert.match(templatesPage, /href="\/status"/);
  assert.match(legalPage, /href="\/status"/);
  assert.match(robotsRoute, /"\/status"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/status`/);
  assert.match(smokeFrontend, /sitemap\.text\.includes\(`\$\{canonicalUrl\}\/status`\)/);
  assert.match(smokeLayout, /path: "\/status"/);
  assert.match(robotsRoute, /"\/updates"/);
  assert.match(robotsRoute, /"\/support"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/updates`/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/support`/);
  assert.match(smokeFrontend, /sitemap\.text\.includes\(`\$\{canonicalUrl\}\/updates`\)/);
  assert.match(smokeLayout, /path: "\/updates"/);
});

test("status page has overflow-safe responsive cards", () => {
  assert.match(stylesheet, /\.status-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(min\(100%,\s*230px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.status-card\s*\{(?=[^}]*container:\s*status-card\s*\/\s*inline-size)(?=[^}]*grid-template-columns:\s*42px\s+minmax\(0,\s*1fr\))(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.status-card\s+strong\s*\{(?=[^}]*font-size:\s*clamp\(1\.52rem,\s*11cqi,\s*2rem\))(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.status-card\s+p\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s);
  assert.match(stylesheet, /@container\s+status-card\s+\(max-width:\s*250px\)/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.status-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.status-card/);
});
