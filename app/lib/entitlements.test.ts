import assert from "node:assert/strict";
import test from "node:test";

import { entitlementFromRow } from "./entitlements";

test("does not expose stale premium features when billing is inactive", () => {
  const entitlement = entitlementFromRow({
    plan: "premium",
    billing_status: "canceled",
    current_period_end: "2026-06-18T00:35:07.000Z",
    cancel_at_period_end: false,
    cancel_at: "2026-06-18T00:35:07.000Z",
    canceled_at: "2026-05-20T00:00:00.000Z",
    features: {
      export_pdf: true,
      export_docx: true,
      export_txt: true,
      project_storage: true,
      monthly_run_limit: null,
    },
  });

  assert.deepEqual(entitlement.exportFormats, { pdf: true, docx: false, txt: false });
  assert.equal(entitlement.plan, "free");
  assert.equal(entitlement.monthlyRunLimit, 5);
});

test("keeps active premium feature overrides explicit", () => {
  const entitlement = entitlementFromRow({
    plan: "premium",
    billing_status: "active",
    current_period_end: "2026-06-18T00:35:07.000Z",
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    features: {
      export_pdf: true,
      export_docx: true,
      export_txt: false,
      project_storage: true,
      monthly_run_limit: null,
    },
  });

  assert.deepEqual(entitlement.exportFormats, { pdf: true, docx: true, txt: false });
  assert.equal(entitlement.plan, "premium");
  assert.equal(entitlement.monthlyRunLimit, null);
});

test("keeps active premium runs unlimited even with stale feature limits", () => {
  const entitlement = entitlementFromRow({
    plan: "premium",
    billing_status: "trialing",
    current_period_end: "2026-06-18T00:35:07.000Z",
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    features: {
      export_pdf: true,
      export_docx: true,
      export_txt: true,
      project_storage: true,
      monthly_run_limit: 5,
    },
  });

  assert.equal(entitlement.plan, "premium");
  assert.equal(entitlement.monthlyRunLimit, null);
  assert.deepEqual(entitlement.exportFormats, { pdf: true, docx: true, txt: true });
});
