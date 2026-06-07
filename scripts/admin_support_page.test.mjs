import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/admin/support/page.tsx", "utf8");
const actionRoute = readFileSync("app/admin/support/actions/route.ts", "utf8");
const replyRoute = readFileSync("app/admin/support/reply/route.ts", "utf8");
const supportAdmin = readFileSync("app/lib/supportAdmin.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");
const notifications = readFileSync("app/lib/supportNotifications.ts", "utf8");

test("admin support inbox is protected by signed-in admin email allow-list", () => {
  assert.match(supportAdmin, /ROLEFORGE_ADMIN_EMAILS/);
  assert.match(page, /isSupportAdminUser\(user\)/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /createRoleForgeServiceClient/);
  assert.match(page, /loadAdminSupportRequests/);
});

test("admin support inbox shows non-secret operator setup readiness", () => {
  assert.match(page, /supportOperatorReadiness/);
  assert.match(page, /Support operations setup/);
  assert.match(page, /ROLEFORGE_ADMIN_EMAILS controls who can open this inbox/);
  assert.match(page, /SUPABASE_SERVICE_ROLE_KEY lets the inbox review and update all support requests/);
  assert.match(page, /Resend can email new requests to your support inbox/);
  assert.match(page, /Replies send from the configured support sender so your private admin email stays hidden/);
  assert.match(page, /An HTTPS webhook can forward requests to Slack, Zapier, Make/);
  assert.match(page, /admin-support-readiness-card/);
  assert.doesNotMatch(page, /re_do_not_print|service_role_do_not_print/);
});

test("admin support inbox is discoverable only for support admins", () => {
  const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
  const supportPage = readFileSync("app/support/page.tsx", "utf8");
  assert.match(settingsPage, /isSupportAdminUser\(user\)/);
  assert.match(settingsPage, /supportAdmin \?/);
  assert.match(settingsPage, /href="\/admin\/support"/);
  assert.match(supportPage, /isSupportAdminUser\(user\)/);
  assert.match(supportPage, /supportAdmin \?/);
  assert.match(supportPage, /Operator inbox is available for this account/);
  assert.match(supportPage, /href="\/admin\/support"/);
});

test("admin support inbox supports mobile triage without terminal commands", () => {
  assert.doesNotMatch(page, /mailto:/);
  assert.match(page, /action="\/admin\/support\/reply"/);
  assert.match(page, /Customer-safe reply/);
  assert.match(page, /Sent from the configured support sender, not your private Gmail/);
  assert.match(page, /Customer replies are paused until a verified support sender is configured/);
  assert.match(page, /SupportStatusForm/);
  assert.match(page, /status="reviewing"/);
  assert.match(page, /status="closed"/);
  assert.match(page, /Open|Reviewing|Closed|All/);
  assert.match(page, /update the status from any browser/);
  assert.match(page, /No terminal needed/);
  assert.match(page, /Handle requests from this page/);
  assert.match(page, /Recommended: send a customer-safe reply, mark reviewing while you investigate, then close after the customer has an answer/);
  assert.match(stylesheet, /\.admin-support-actions,\s*\.admin-support-actions form,\s*\.admin-support-reply-footer > div,\s*\.admin-support-action\s*\{[^}]*width:\s*100%/s);
  assert.match(stylesheet, /\.admin-support-playbook\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.92fr\)\s+minmax\(300px,\s*1fr\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-playbook ol\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-next-step\s*\{(?=[^}]*display:\s*flex)(?=[^}]*align-items:\s*flex-start)[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-reply-form\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*10px)[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-reply-footer\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto)[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-readiness\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-readiness-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\))[^}]*\}/s);
});

test("admin support status route validates admin and request status", () => {
  assert.match(actionRoute, /isSupportAdminUser\(user\)/);
  assert.match(actionRoute, /SUPPORT_REQUEST_ID_PATTERN/);
  assert.match(actionRoute, /parseAdminSupportStatus/);
  assert.match(actionRoute, /updateAdminSupportRequestStatus/);
  assert.match(actionRoute, /createRoleForgeServiceClient/);
});

test("admin support reply route sends from RoleForge and never exposes the admin inbox", () => {
  assert.match(replyRoute, /isSupportAdminUser\(user\)/);
  assert.match(replyRoute, /loadAdminSupportRequest/);
  assert.match(replyRoute, /sendSupportReplyEmail/);
  assert.match(replyRoute, /updateAdminSupportRequestStatus/);
  assert.match(replyRoute, /reply-sent/);
  assert.match(replyRoute, /reply-unavailable/);
  assert.doesNotMatch(replyRoute, /ROLEFORGE_SUPPORT_EMAIL_TO/);
  assert.doesNotMatch(replyRoute, /user\.email/);
});

test("support email alerts point operators to the web inbox", () => {
  assert.match(notifications, /\/admin\/support/);
  assert.match(notifications, /Mark the request reviewing or closed from the web inbox/);
  assert.doesNotMatch(notifications, /npm run support:status -- --reference/);
});
