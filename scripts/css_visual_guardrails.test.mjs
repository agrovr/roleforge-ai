import assert from "node:assert/strict";
import test from "node:test";

import { allPublicStyles as css } from "./style_sources.mjs";

test("keeps visual fit guardrails consolidated", () => {
  const canonicalMarkers = css.match(/Visual fit guardrails: the canonical layer/g) ?? [];
  assert.equal(canonicalMarkers.length, 1);

  const legacyMarkers = [
    "Responsive guardrails for the editorial UI",
    "Visual QA guardrails:",
    "Signed-in workspace repair:",
    "Layout fit repair:",
    "May 29 visual QA:",
    "May 30 composition lock:",
    "Final product fit guard:",
    "Final design fit sweep:",
    "Screenshot repair:",
    "May 30 visual fit lock:",
    "May 30 follow-up:",
  ];

  for (const marker of legacyMarkers) {
    assert.equal(css.includes(marker), false, `${marker} should be folded into the canonical guardrail layer`);
  }
});

test("visual fit guardrails still cover public and signed-in surfaces", () => {
  const guardrailStart = css.indexOf("Visual fit guardrails: the canonical layer");
  assert.notEqual(guardrailStart, -1);

  const guardrailCss = css.slice(guardrailStart);
  for (const selector of [
    ".hero",
    ".hero-stage",
    ".dash-mock .dash-stat-value",
    ".cta-band",
    ".rf-studio-topbar",
    ".history-actions",
    ".settings-profile-actions",
    ".settings-billing-head",
    ".templates-page-actions",
    ".login-panel",
  ]) {
    assert.match(guardrailCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
