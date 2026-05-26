import assert from "node:assert/strict";
import { test } from "node:test";

import { REPOS, evaluateRepoReadiness } from "./check_smoke_readiness.mjs";

const frontendConfig = REPOS.find((repo) => repo.label === "Frontend");
const backendConfig = REPOS.find((repo) => repo.label === "Backend");

test("accepts preferred frontend smoke account readiness", () => {
  const findings = evaluateRepoReadiness(frontendConfig, {
    variables: ["ROLEFORGE_SUPABASE_URL", "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY", "ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE"],
    variableValues: { ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE: "true" },
    secrets: ["ROLEFORGE_SMOKE_EMAIL", "ROLEFORGE_SMOKE_PASSWORD"],
  });

  assert.equal(findings.every((finding) => finding.ok), true);
  assert.equal(findings.some((finding) => finding.level === "warn"), false);
});

test("accepts backend fallback token but warns to prefer smoke account credentials", () => {
  const findings = evaluateRepoReadiness(backendConfig, {
    variables: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SMOKE_REQUIRE_SIGNED_IN_SMOKE"],
    variableValues: { SMOKE_REQUIRE_SIGNED_IN_SMOKE: "true" },
    secrets: ["SMOKE_AUTH_TOKEN"],
  });

  assert.equal(findings.filter((finding) => !finding.ok).length, 0);
  assert.equal(findings.some((finding) => finding.level === "warn"), true);
});

test("reports missing signed-in smoke credentials and gate variables", () => {
  const findings = evaluateRepoReadiness(frontendConfig, {
    variables: ["ROLEFORGE_SUPABASE_URL", "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY"],
    variableValues: {},
    secrets: [],
  });

  assert.deepEqual(
    findings.filter((finding) => !finding.ok).map((finding) => finding.message),
    [
      "Frontend signed-in smoke credentials missing (ROLEFORGE_SMOKE_EMAIL + ROLEFORGE_SMOKE_PASSWORD or ROLEFORGE_SMOKE_COOKIE)",
      "Frontend variable ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE must be true after credentials are configured",
    ],
  );
});
