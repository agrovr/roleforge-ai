import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SupportForm } from "../app/support/SupportForm.tsx";
import { parseSupportRequestPrefill, SUPPORT_REQUEST_CATEGORIES } from "../app/lib/supportRequests.ts";

import { stylesFor } from "./style_sources.mjs";

const supportPage = readFileSync("app/support/page.tsx", "utf8");
const supportForm = readFileSync("app/support/SupportForm.tsx", "utf8");
const supportRoute = readFileSync("app/api/support-requests/route.ts", "utf8");
const supportLib = readFileSync("app/lib/supportRequests.ts", "utf8");
const supportNotifications = readFileSync("app/lib/supportNotifications.ts", "utf8");
const supportReferenceCopyButton = readFileSync("app/components/SupportReferenceCopyButton.tsx", "utf8");
const supportMigration = readFileSync("supabase/migrations/20260602013000_support_requests.sql", "utf8");
const supportPrivacyMigration = readFileSync("supabase/migrations/20260606043000_support_requests_privacy_category.sql", "utf8");
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
const stylesheet = stylesFor("public-pages.css", "support/support.css", "settings/settings.css");
const smokeFrontend = readFileSync("scripts/smoke_frontend.mjs", "utf8");
const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("support page provides signed-in account-linked request flow", () => {
  assert.match(supportPage, /<SupportForm prefill=\{prefill\}/);
  assert.match(supportForm, /supportRequestFieldErrors\(values\)/);
  assert.match(supportForm, /aria-invalid=/);
  assert.match(supportForm, /role="alert"/);
  assert.match(supportPage, /title: "Support"/);
  assert.match(supportPage, /canonical: "\/support"/);
  assert.match(supportPage, /account, billing, privacy, export/);
  assert.match(supportPage, /Send a request with real context/);
  assert.match(supportPage, /Signed-in requests are saved to your account/);
  assert.match(supportPage, /Each request gets an RF reference/);
  assert.doesNotMatch(supportPage, /support-category-row|Prefill request/);
  assert.match(supportPage, /isSupportAdminUser\(user\)/);
  assert.match(supportPage, /supportAdmin \?/);
  assert.match(supportPage, /Operator inbox is available for this account/);
  assert.match(supportPage, /href="\/admin\/support"/);
  assert.match(supportPage, /latestSupportRequest/);
  assert.match(supportPage, /supportRequestPacket/);
  assert.match(supportPage, /Support request packet/);
  assert.match(supportPage, /What gets attached/);
  assert.match(supportPage, /Account email/);
  assert.match(supportPage, /Request history/);
  assert.match(supportPage, /Page context/);
  assert.match(supportPage, /Private data/);
  assert.match(supportPage, /Do not paste card numbers, passwords, or secret keys/);
  assert.match(supportPage, /request\.statusLabel/);
  assert.match(supportForm, /action="\/api\/support-requests"/);
  assert.match(supportPage, /loadSupportRequests\(supabase,\s*user\.id,\s*\{ limit: 5 \}\)/);
  assert.match(supportPage, /parseSupportRequestPrefill/);
  assert.match(supportPage, /support-prefill-note/);
  assert.match(supportPage, /supportRequestReference\(reference\)/);
  assert.match(supportPage, /Recent requests/);
  assert.match(supportPage, /support-history-list/);
  assert.match(supportPage, /request\.referenceLabel/);
  assert.match(supportPage, /SupportReferenceCopyButton/);
  assert.match(supportPage, /referenceLabel=\{request\.referenceLabel\}/);
  assert.match(supportPage, /referenceLabel" in notice/);
  assert.match(supportPage, /SupportReferenceCopyButton referenceLabel=\{notice\.referenceLabel\}/);
  assert.match(supportPage, /support-notice-content/);
  assert.match(supportPage, /support-status-badge/);
  assert.match(supportPage, /<SupportForm prefill=\{prefill\}[\s\S]*?<aside className="support-context"/);
  assert.match(supportForm, /name="category"/);
  assert.match(supportForm, /name="subject"/);
  assert.match(supportForm, /name="message"/);
  assert.match(supportForm, /name="contextUrl"/);
  assert.match(supportPage, /Sign in for support/);
  assert.match(supportPage, /Never paste full payment card details or private credentials/);
});

test("each prefilled topic has its own guidance and preserves the incoming request details", () => {
  const hints = new Set();
  for (const category of SUPPORT_REQUEST_CATEGORIES) {
    const prefill = parseSupportRequestPrefill({ category, subject: "Help with this page", contextUrl: "/settings" });
    const html = renderToStaticMarkup(createElement(SupportForm, { prefill }));
    assert.ok(html.includes(`value="${category}" selected=""`));
    assert.ok(html.includes('value="Help with this page"'));
    assert.ok(html.includes('value="/settings"'));
    assert.ok(html.includes('aria-describedby="support-topic-hint"'));
    const hint = html.match(/<small id="support-topic-hint">([^<]+)<\/small>/)?.[1];
    assert.ok(hint);
    hints.add(hint);
  }
  assert.equal(hints.size, SUPPORT_REQUEST_CATEGORIES.length);
});

test("support request route requires auth, validates input, and saves through Supabase", () => {
  assert.match(supportRoute, /createRoleForgeRouteClient/);
  assert.match(supportRoute, /auth\.getUser\(\)/);
  assert.match(supportRoute, /login\?next=\/support&account=signin-required/);
  assert.match(supportRoute, /parseSupportRequestInput/);
  assert.match(supportRoute, /saveSupportRequest/);
  assert.match(supportRoute, /notifySupportRequestCreated/);
  assert.match(supportRoute, /supportRequestReference/);
  assert.match(supportRoute, /withAccountDatabase/);
  assert.match(supportRoute, /supportRedirect\(request,\s*"sent",\s*saved\.id\)/);
  assert.match(supportRoute, /url\.searchParams\.set\("ref",\s*supportRequestReference\(reference\)\)/);
  assert.match(supportRoute, /supportRedirect\(request, "invalid"\)/);
  assert.match(supportRoute, /supportRedirect\(request, "unavailable"\)/);
  assert.match(supportNotifications, /ROLEFORGE_SUPPORT_WEBHOOK_URL/);
  assert.match(supportNotifications, /ROLEFORGE_SUPPORT_WEBHOOK_SECRET/);
  assert.match(supportNotifications, /event: "support_request\.created"/);
  assert.match(supportNotifications, /x-roleforge-support-secret/);
  assert.match(supportNotifications, /status: "skipped"/);
  assert.match(supportNotifications, /status: "failed"/);
});

test("support requests have protected Supabase ownership policies", () => {
  assert.match(supportMigration, /create table if not exists public\.support_requests/);
  assert.match(supportMigration, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(supportMigration, /support_requests_category_check/);
  assert.match(supportPrivacyMigration, /drop constraint if exists support_requests_category_check/);
  assert.match(supportPrivacyMigration, /'privacy'/);
  assert.match(supportMigration, /alter table public\.support_requests enable row level security/);
  assert.match(supportMigration, /support_requests_select_own/);
  assert.match(supportMigration, /support_requests_insert_own/);
  assert.match(supportMigration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(supportMigration, /revoke all on table public\.support_requests from anon/);
  assert.match(supportMigration, /grant select, insert on table public\.support_requests to authenticated/);
  assert.match(supportLib, /SUPPORT_REQUEST_CATEGORIES/);
  assert.match(supportLib, /loadSupportRequests/);
  assert.match(supportLib, /supportRequestReference/);
  assert.match(supportLib, /supportStatusLabel/);
});

test("settings exposes account support request history", () => {
  assert.match(settingsPage, /countRows\(supabase,\s*"support_requests",\s*user\.id\)/);
  assert.match(settingsPage, /loadSupportRequests\(supabase,\s*user\.id,\s*\{ limit: 4 \}\)/);
  assert.match(settingsPage, /supportRequestHref/);
  assert.match(settingsPage, /Billing or Premium access/);
  assert.match(settingsPage, /Privacy or data request/);
  assert.match(settingsPage, /Workflow or export issue/);
  assert.match(settingsPage, /supportRequestCountLabel/);
  assert.match(settingsPage, /supportOverviewCaption/);
  assert.match(settingsPage, /Support history/);
  assert.match(settingsPage, /id="support"/);
  assert.match(settingsPage, /Support requests/);
  assert.match(settingsPage, /settings-support-list/);
  assert.match(settingsPage, /settings-account-support-recent/);
  assert.match(settingsPage, /Recent support/);
  assert.match(settingsPage, /isSupportAdminUser\(user\)/);
  assert.match(settingsPage, /supportAdmin \?/);
  assert.match(settingsPage, /Open support inbox/);
  assert.match(settingsPage, /href="\/admin\/support"/);
  assert.match(settingsPage, /request\.referenceLabel/);
  assert.match(settingsPage, /SupportReferenceCopyButton/);
  assert.match(settingsPage, /referenceLabel=\{request\.referenceLabel\}/);
  assert.match(settingsPage, /support-status-badge/);
  assert.match(settingsPage, /Open support/);
  assert.match(settingsPage, /href="#support"/);
  assert.match(settingsPage, /account exports as safe references/);
});

test("support page is discoverable across public and account surfaces", () => {
  for (const source of [landingPage, helpPage, statusPage, updatesPage, studioPage, settingsPage, templatesPage, legalPage]) {
    assert.match(source, /href="\/support"/);
  }
  assert.match(robotsRoute, /"\/support"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/support`/);
  assert.match(smokeFrontend, /sitemap\.text\.includes\(`\$\{canonicalUrl\}\/support`\)/);
  assert.match(smokeLayout, /path: "\/support"/);
  assert.match(smokeLayout, /\.support-packet-card/);
});

test("contextual support links prefill workflow, export, and billing details", () => {
  assert.match(studioPage, /premiumExportSupportHref/);
  assert.match(studioPage, /workflowSupportHref/);
  assert.match(studioPage, /Contact support/);
  assert.match(studioPage, /contextUrl:\s*workflowError\?\.requestId \?\? "\/app"/);
  assert.match(settingsPage, /billingSupportHref/);
  assert.match(settingsPage, /contextUrl:\s*"\/settings#billing"/);
  assert.match(helpPage, /supportRequestHref\(\{[\s\S]*?category:\s*"workflow"[\s\S]*?Workflow or export issue/);
  assert.match(helpPage, /Privacy, data, or deletion question/);
  assert.match(helpPage, /supportRequestHref\(\{[\s\S]*?category:\s*"privacy"[\s\S]*?Privacy or data request/);
});

test("support request references can be copied without exposing raw ids", () => {
  assert.match(supportReferenceCopyButton, /"use client"/);
  assert.match(supportReferenceCopyButton, /writeClipboardText\(referenceLabel\)/);
  assert.match(supportReferenceCopyButton, /Copy support reference \$\{referenceLabel\}/);
  assert.match(supportReferenceCopyButton, /Copy ref/);
  assert.match(supportReferenceCopyButton, /Copied/);
  assert.match(supportReferenceCopyButton, /Copy failed/);
  assert.doesNotMatch(supportReferenceCopyButton, /request\.id/);
});

test("support page has overflow-safe responsive form layout", () => {
  assert.match(stylesheet, /\.support-layout\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(260px,\s*0\.72fr\)\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-routing-strip\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.48fr\)\s+minmax\(0,\s*1fr\))[^}]*\}/s);
  assert.match(stylesheet, /\.support-admin-entry\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*42px\s+minmax\(0,\s*1fr\)\s+auto)[^}]*\}/s);
  assert.match(stylesheet, /\.support-admin-entry\s+\.btn\s*\{(?=[^}]*grid-column:\s*1\s*\/\s*-1)(?=[^}]*width:\s*100%)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-support-actions\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s);
  assert.match(stylesheet, /\.support-routing-steps\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.support-guide-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*42px\s+minmax\(0,\s*1fr\))[^}]*\}/s);
  assert.match(stylesheet, /\.support-guide-card:hover,\s*\.support-guide-card:focus-visible\s*\{(?=[^}]*border-color:)(?=[^}]*transform:\s*translateY\(-1px\))[^}]*\}/s);
  assert.match(stylesheet, /\.support-guide-card\s+small\s*\{(?=[^}]*grid-area:\s*action)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.support-triage-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*12px)[^}]*\}/s);
  assert.match(stylesheet, /\.support-triage-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*32px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-triage-item\s+div,\s*\.support-triage-item\s+strong,\s*\.support-triage-item\s+p,\s*\.support-triage-item\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.support-request-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*16px)[^}]*\}/s);
  assert.match(stylesheet, /\.support-prefill-note\s*\{(?=[^}]*border-color:)(?=[^}]*background:)[^}]*\}/s);
  assert.match(stylesheet, /\.support-notice-content\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-packet-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*12px)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.support-packet-list\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-packet-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*32px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.support-packet-item\s+div,\s*\.support-packet-item\s+small,\s*\.support-packet-item\s+strong,\s*\.support-packet-item\s+p\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.support-packet-item\.good/);
  assert.match(stylesheet, /\.support-packet-item\.warn/);
  assert.match(stylesheet, /\.support-response-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*12px)[^}]*\}/s);
  assert.match(stylesheet, /\.support-after-submit-list\s*\{(?=[^}]*display:\s*grid)(?=[^}]*list-style:\s*none)[^}]*\}/s);
  assert.match(stylesheet, /\.support-after-submit-list\s+li\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*16px\s+minmax\(0,\s*1fr\))(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.support-response-list\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-response-item\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s);
  assert.match(stylesheet, /\.support-form\s+input,\s*\.support-form\s+select,\s*\.support-form\s+textarea\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-history-item,\s*\.settings-support-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-history-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*justify-items:\s*end)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.support-status-badge\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.support-reference-copy\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.support-layout\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.support-packet-list\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.support-response-list\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.support-history-item,\s*\.settings-support-item\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.support-history-actions\s*\{[^}]*justify-items:\s*start/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-request-card/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-triage-card/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-packet-card/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-packet-item\.good/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-packet-item\.warn/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-response-card/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-after-submit-list li/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-reference-copy/);
});
