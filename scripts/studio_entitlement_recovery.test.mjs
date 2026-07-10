import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const workflowErrors = readFileSync("app/lib/workflowErrors.ts", "utf8");

test("studio treats entitlement verification as a recoverable export outage", () => {
  assert.match(workflowErrors, /case\s+"entitlement_verification_failed":[\s\S]*?Your plan was not changed/);
  assert.match(studioPage, /workflowError\?\.code\s*===\s*"entitlement_verification_failed"[\s\S]*?Premium access could not be verified/);
  assert.match(studioPage, /Your plan and tailored draft are unchanged\. Wait a moment, then retry this export\./);
});

test("entitlement recovery retries export instead of rerunning tailoring", () => {
  assert.match(
    studioPage,
    /onClick=\{workflowError\.code\s*===\s*"entitlement_verification_failed"\s*\?\s*\(\)\s*=>\s*void\s+onExportSelectedFormat\(\)\s*:\s*onRun\}/,
  );
  assert.match(studioPage, /Retry \$\{selectedFormatLabel\} export/);
});
