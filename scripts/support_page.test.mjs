import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const supportPage = readFileSync("app/support/page.tsx", "utf8");
const supportRoute = readFileSync("app/api/support-requests/route.ts", "utf8");
const supportLib = readFileSync("app/lib/supportRequests.ts", "utf8");
const supportMigration = readFileSync("supabase/migrations/20260602013000_support_requests.sql", "utf8");
const landingPage = readFileSync("app/page.tsx", "utf8");
const helpPage = readFileSync("app/help/page.tsx", "utf8");
const statusPage = readFileSync("app/status/page.tsx", "utf8");
const updatesPage = readFileSync("app/updates/page.tsx", "utf8");
const studioPage = readFileSync("app/app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const legalPage = readFileSync("app/components/LegalPage.tsx", "utf8");
const robotsRoute = readFileSync("app/robots.ts", "utf8");
const sitemapRoute = readFileSync("app/sitemap.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");
const smokeFrontend = readFileSync("scripts/smoke_frontend.mjs", "utf8");
const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("support page provides signed-in account-linked request flow", () => {
  assert.match(supportPage, /title: "Support"/);
  assert.match(supportPage, /canonical: "\/support"/);
  assert.match(supportPage, /Get help with your workflow/);
  assert.match(supportPage, /Signed-in requests are saved to your account/);
  assert.match(supportPage, /action="\/api\/support-requests"/);
  assert.match(supportPage, /loadSupportRequests\(supabase,\s*user\.id,\s*\{ limit: 5 \}\)/);
  assert.match(supportPage, /parseSupportRequestPrefill/);
  assert.match(supportPage, /defaultValue=\{prefill\.category\}/);
  assert.match(supportPage, /defaultValue=\{prefill\.subject\}/);
  assert.match(supportPage, /defaultValue=\{prefill\.contextUrl \?\? ""\}/);
  assert.match(supportPage, /support-prefill-note/);
  assert.match(supportPage, /Recent requests/);
  assert.match(supportPage, /support-history-list/);
  assert.match(supportPage, /support-status-badge/);
  assert.match(supportPage, /name="category"/);
  assert.match(supportPage, /name="subject"/);
  assert.match(supportPage, /name="message"/);
  assert.match(supportPage, /name="contextUrl"/);
  assert.match(supportPage, /Sign in for support/);
  assert.match(supportPage, /Never paste full payment card details or private credentials/);
});

test("support request route requires auth, validates input, and saves through Supabase", () => {
  assert.match(supportRoute, /createRoleForgeRouteClient/);
  assert.match(supportRoute, /auth\.getUser\(\)/);
  assert.match(supportRoute, /login\?next=\/support&account=signin-required/);
  assert.match(supportRoute, /parseSupportRequestInput/);
  assert.match(supportRoute, /saveSupportRequest/);
  assert.match(supportRoute, /withAccountDatabase/);
  assert.match(supportRoute, /supportRedirect\(request, "sent"\)/);
  assert.match(supportRoute, /supportRedirect\(request, "invalid"\)/);
  assert.match(supportRoute, /supportRedirect\(request, "unavailable"\)/);
});

test("support requests have protected Supabase ownership policies", () => {
  assert.match(supportMigration, /create table if not exists public\.support_requests/);
  assert.match(supportMigration, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(supportMigration, /support_requests_category_check/);
  assert.match(supportMigration, /alter table public\.support_requests enable row level security/);
  assert.match(supportMigration, /support_requests_select_own/);
  assert.match(supportMigration, /support_requests_insert_own/);
  assert.match(supportMigration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(supportMigration, /revoke all on table public\.support_requests from anon/);
  assert.match(supportMigration, /grant select, insert on table public\.support_requests to authenticated/);
  assert.match(supportLib, /SUPPORT_REQUEST_CATEGORIES/);
  assert.match(supportLib, /loadSupportRequests/);
  assert.match(supportLib, /supportStatusLabel/);
});

test("settings exposes account support request history", () => {
  assert.match(settingsPage, /loadSupportRequests\(supabase,\s*user\.id,\s*\{ limit: 4 \}\)/);
  assert.match(settingsPage, /supportRequestHref/);
  assert.match(settingsPage, /Billing or Premium access/);
  assert.match(settingsPage, /Workflow or export issue/);
  assert.match(settingsPage, /id="support"/);
  assert.match(settingsPage, /Support requests/);
  assert.match(settingsPage, /settings-support-list/);
  assert.match(settingsPage, /support-status-badge/);
  assert.match(settingsPage, /Open support/);
  assert.match(settingsPage, /href="#support"/);
});

test("support page is discoverable across public and account surfaces", () => {
  for (const source of [landingPage, helpPage, statusPage, updatesPage, studioPage, settingsPage, templatesPage, legalPage]) {
    assert.match(source, /href="\/support"/);
  }
  assert.match(robotsRoute, /"\/support"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/support`/);
  assert.match(smokeFrontend, /sitemap\.text\.includes\(`\$\{canonicalUrl\}\/support`\)/);
  assert.match(smokeLayout, /path: "\/support"/);
});

test("contextual support links prefill workflow, export, and billing details", () => {
  assert.match(studioPage, /premiumExportSupportHref/);
  assert.match(studioPage, /workflowSupportHref/);
  assert.match(studioPage, /Contact support/);
  assert.match(studioPage, /contextUrl:\s*workflowError\?\.requestId \?\? "\/app"/);
  assert.match(settingsPage, /billingSupportHref/);
  assert.match(settingsPage, /contextUrl:\s*"\/settings#billing"/);
  assert.match(helpPage, /supportRequestHref\(\{[\s\S]*?category:\s*"workflow"[\s\S]*?Workflow or export issue/);
});

test("support page has overflow-safe responsive form layout", () => {
  assert.match(stylesheet, /\.support-layout\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(260px,\s*0\.72fr\)\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-guide-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*42px\s+minmax\(0,\s*1fr\))[^}]*\}/s);
  assert.match(stylesheet, /\.support-request-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*16px)[^}]*\}/s);
  assert.match(stylesheet, /\.support-prefill-note\s*\{(?=[^}]*border-color:)(?=[^}]*background:)[^}]*\}/s);
  assert.match(stylesheet, /\.support-form\s+input,\s*\.support-form\s+select,\s*\.support-form\s+textarea\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-history-item,\s*\.settings-support-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-status-badge\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.support-layout\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.support-history-item,\s*\.settings-support-item\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-request-card/);
});
