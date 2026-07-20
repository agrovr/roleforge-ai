import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

test("frontend CI cancels superseded runs for the same ref", () => {
  assert.match(
    workflow,
    /concurrency:\s*\n\s*group:\s*frontend-ci-\$\{\{\s*github\.ref\s*\}\}\s*\n\s*cancel-in-progress:\s*true/,
  );
});

test("frontend CI keeps deployment and production verification blocking", () => {
  assert.match(workflow, /- name:\s*Wait for Vercel deployment/);
  assert.match(workflow, /- name:\s*Smoke production shell/);
  assert.match(workflow, /- name:\s*Smoke rendered production layout/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
