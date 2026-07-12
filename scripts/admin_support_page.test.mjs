import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/admin/support/page.tsx", "utf8");
const loadingPage = readFileSync("app/admin/support/loading.tsx", "utf8");
const submitButton = readFileSync("app/admin/support/SupportSubmitButton.tsx", "utf8");
const actionRoute = readFileSync("app/admin/support/actions/route.ts", "utf8");
const replyRoute = readFileSync("app/admin/support/reply/route.ts", "utf8");
const supportAdmin = readFileSync("app/lib/supportAdmin.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");
const notifications = readFileSync("app/lib/supportNotifications.ts", "utf8");

test("admin support inbox is protected and reads real queue data", () => {
  assert.match(supportAdmin, /ROLEFORGE_ADMIN_EMAILS/);
  assert.match(page, /isSupportAdminUser\(user\)/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /createRoleForgeServiceClient/);
  assert.match(page, /loadAdminSupportRequests/);
  assert.match(page, /loadAdminSupportSummary/);
  assert.match(supportAdmin, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(supportAdmin, /Promise\.all\(\[[\s\S]*countAdminSupportRequests\(client, "open"\)[\s\S]*countAdminSupportRequests\(client, "reviewing"\)[\s\S]*countAdminSupportRequests\(client, "closed"\)/s);
});

test("admin support setup stays available without burying the queue", () => {
  assert.match(page, /<details className="admin-support-setup" open=\{!serviceClient \|\| loadError \|\| requiredSetupCount > 0\}>/);
  assert.match(page, /Operations setup/);
  assert.match(page, /Required systems ready/);
  assert.match(page, /ROLEFORGE_ADMIN_EMAILS controls who can open this inbox/);
  assert.match(page, /SUPABASE_SERVICE_ROLE_KEY lets the inbox review and update all support requests/);
  assert.match(page, /Replies send from the configured support sender so your private admin email stays hidden/);
  assert.match(page, /className="admin-support-setup-body"/);
  assert.match(stylesheet, /\.admin-support-setup\s*\{(?=[^}]*overflow:\s*hidden)(?=[^}]*border-radius:\s*14px)[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-setup > summary\s*\{(?=[^}]*min-height:\s*52px)(?=[^}]*cursor:\s*pointer)[^}]*\}/s);
});

test("admin command bar and request cards use restrained operator surfaces", () => {
  assert.match(page, /className="admin-support-commandbar"/);
  assert.match(stylesheet, /\.admin-support-commandbar\s*\{(?=[^}]*padding:\s*7px 8px)(?=[^}]*border-radius:\s*22px)(?=[^}]*backdrop-filter:\s*blur\(16px\) saturate\(1\.04\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-commandbar::before\s*\{[^}]*content:\s*none/s);
  assert.match(stylesheet, /\.admin-support-commandbar \.brand,\s*\.admin-support-commandbar nav\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-card,\s*\.admin-support-empty\s*\{(?=[^}]*background:\s*var\(--surface\))(?=[^}]*box-shadow:\s*0 18px 44px -40px)[^}]*\}/s);
  assert.doesNotMatch(stylesheet, /\.admin-support-card::before/);
  assert.doesNotMatch(stylesheet, /\.admin-support-card::after/);
  assert.doesNotMatch(stylesheet, /\.admin-support-meta div::before/);
});

test("admin request cards separate case context from the response workbench", () => {
  assert.match(page, /className="admin-support-card" data-status=\{request\.status\} aria-labelledby=/);
  assert.match(page, /className="admin-support-card-body"/);
  assert.match(page, /className="admin-support-case"/);
  assert.match(page, /className="admin-support-workbench"/);
  assert.match(page, /Customer request/);
  assert.match(page, /Response workspace/);
  assert.match(stylesheet, /\.admin-support-card-body\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.9fr\) minmax\(420px,\s*1\.1fr\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-workbench\s*\{(?=[^}]*padding:\s*14px)(?=[^}]*border-radius:\s*16px)(?=[^}]*background:)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*940px\)\s*\{[\s\S]*?\.admin-support-card-body,[\s\S]*?\.admin-support-loading-columns\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test("admin support exposes honest loading and database failure states", () => {
  assert.match(page, /let loadError = false/);
  assert.match(page, /catch \(error\) \{[\s\S]*?loadError = true;[\s\S]*?Admin support inbox load failed/s);
  assert.match(page, /Could not load this queue/);
  assert.match(page, /Existing requests remain unchanged/);
  assert.match(loadingPage, /aria-busy="true"/);
  assert.match(loadingPage, /Loading operator inbox…/);
  assert.match(loadingPage, /admin-support-loading-columns/);
  assert.match(stylesheet, /@keyframes\s+admin-support-loading-pulse/);
});

test("admin queue filters show aggregate counts and preserve the current view", () => {
  assert.match(page, /const filterCounts =/);
  assert.match(page, /aria-current=\{status === item \? "page" : undefined\}/);
  assert.match(page, /<strong>\{filterCounts\[item\]\}<\/strong>/);
  assert.match(page, /name="returnStatus" value=\{status\}/);
  assert.match(actionRoute, /normalizedReturnStatus/);
  assert.match(replyRoute, /normalizedReturnStatus/);
  assert.match(stylesheet, /\.admin-support-filter\s*\{(?=[^}]*overflow-x:\s*auto)(?=[^}]*padding:\s*4px)[^}]*\}/s);
});

test("admin support actions expose pending, stale, and mobile-safe states", () => {
  assert.match(submitButton, /useFormStatus\(\)/);
  assert.match(submitButton, /data\?\.get\(name\) === value/);
  assert.match(submitButton, /aria-busy=\{activeSubmission\}/);
  assert.match(submitButton, /disabled=\{disabled \|\| pending\}/);
  assert.match(page, /pendingLabel="Sending…"/);
  assert.match(page, /pendingLabel="Sending and closing…"/);
  assert.match(page, /pendingLabel="Updating…"/);
  assert.match(page, /className="admin-support-action primary"[\s\S]*?label="Send reply"/s);
  assert.match(stylesheet, /\.admin-support-action\.primary\s*\{(?=[^}]*border-color:\s*var\(--ink-0\))(?=[^}]*background:\s*var\(--ink-0\))(?=[^}]*color:\s*var\(--surface\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-action\.primary:not\(:disabled\):hover,\s*\.admin-support-action\.primary:not\(:disabled\):focus-visible\s*\{(?=[^}]*background:\s*color-mix\(in srgb, var\(--ink-0\) 88%, var\(--brand\)\))(?=[^}]*color:\s*var\(--surface\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-action:not\(\.primary\):hover,\s*\.admin-support-action:not\(\.primary\):focus-visible\s*\{(?=[^}]*background:\s*color-mix\(in srgb, var\(--accent-soft\) 50%, var\(--surface\)\))(?=[^}]*color:\s*var\(--ink-0\))[^}]*\}/s);
  assert.doesNotMatch(stylesheet, /\.admin-support-action\.primary,\s*\.admin-support-action:hover/);
  assert.match(page, /name="version" value=\{request\.updatedAt\}/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.admin-support-commandbar nav\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.admin-support-action\.is-pending svg\s*\{[^}]*animation:\s*none/s);
});

test("admin support status updates fail closed on stale forms", () => {
  assert.match(actionRoute, /isSupportAdminUser\(user\)/);
  assert.match(actionRoute, /SUPPORT_REQUEST_ID_PATTERN/);
  assert.match(actionRoute, /expectedUpdatedAt:\s*version/);
  assert.match(actionRoute, /updated \? "updated" : "stale"/);
  assert.match(supportAdmin, /\.eq\("updated_at", options\.expectedUpdatedAt\)/);
  assert.match(supportAdmin, /\.maybeSingle\(\)/);
});

test("customer replies are idempotent and never expose the admin inbox", () => {
  assert.match(replyRoute, /isSupportAdminUser\(user\)/);
  assert.match(replyRoute, /supportRequest\.updatedAt !== version/);
  assert.match(replyRoute, /buildSupportReplyIdempotencyKey/);
  assert.match(replyRoute, /reply-sent-status-stale/);
  assert.match(notifications, /headers\["Idempotency-Key"\] = normalizedIdempotencyKey/);
  assert.match(notifications, /createHash\("sha256"\)/);
  assert.doesNotMatch(replyRoute, /ROLEFORGE_SUPPORT_EMAIL_TO/);
  assert.doesNotMatch(replyRoute, /user\.email/);
  assert.doesNotMatch(notifications, /reply_to/);
  assert.match(notifications, /Reply only from the web inbox so the configured RoleForge support sender is used/);
});

test("support email alerts still point operators to the real web inbox", () => {
  assert.match(notifications, /\/admin\/support/);
  assert.match(notifications, /Mark the request reviewing or closed from the web inbox/);
  assert.doesNotMatch(notifications, /npm run support:status -- --reference/);
});
