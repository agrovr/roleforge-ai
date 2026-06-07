import assert from "node:assert/strict";
import test from "node:test";

import {
  isSupportAdminUser,
  parseAdminSupportStatus,
  parseSupportAdminEmails,
  supportOperatorReadiness,
} from "./supportAdmin";

test("parses support admin email allow lists safely", () => {
  assert.deepEqual(parseSupportAdminEmails("Owner@Example.com, support@example.com; bad"), [
    "owner@example.com",
    "support@example.com",
  ]);
  assert.deepEqual(parseSupportAdminEmails(""), []);
});

test("allows only configured support admin users", () => {
  const env = { ROLEFORGE_ADMIN_EMAILS: "owner@example.com, support@example.com" };
  assert.equal(isSupportAdminUser({ email: "Owner@Example.com" }, env), true);
  assert.equal(isSupportAdminUser({ email: "customer@example.com" }, env), false);
  assert.equal(isSupportAdminUser({ email: undefined }, env), false);
});

test("parses admin support statuses fail-closed", () => {
  assert.equal(parseAdminSupportStatus("open"), "open");
  assert.equal(parseAdminSupportStatus("reviewing"), "reviewing");
  assert.equal(parseAdminSupportStatus("closed"), "closed");
  assert.equal(parseAdminSupportStatus("deleted"), null);
});

test("summarizes support operator readiness without exposing secret values", () => {
  assert.deepEqual(supportOperatorReadiness({}), {
    adminAccessReady: false,
    customerReplyReady: false,
    emailAlertsReady: false,
    webhookReady: false,
    serviceRoleReady: false,
  });

  assert.deepEqual(
    supportOperatorReadiness({
      ROLEFORGE_ADMIN_EMAILS: "owner@example.com",
      RESEND_API_KEY: "re_do_not_print",
      ROLEFORGE_SUPPORT_EMAIL_TO: "RoleForge Ops <support@example.com>",
      ROLEFORGE_SUPPORT_EMAIL_FROM: "RoleForge Support <support@roleforgeai.com>",
      ROLEFORGE_SUPPORT_WEBHOOK_URL: "https://hooks.example.com/roleforge",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_do_not_print",
    }),
    {
      adminAccessReady: true,
      customerReplyReady: true,
      emailAlertsReady: true,
      webhookReady: true,
      serviceRoleReady: true,
    },
  );
});
