import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-smoke.yml", "utf8");

test("production smoke workflow installs dependencies before running live checks", () => {
  assert.match(workflow, /uses:\s*actions\/checkout@v6/);
  assert.match(workflow, /uses:\s*actions\/setup-node@v6[\s\S]*node-version:\s*22[\s\S]*cache:\s*npm/);
  assert.match(workflow, /- name:\s*Install dependencies\s*\n\s*run:\s*npm ci/);
  assert.match(workflow, /Install dependencies[\s\S]*Smoke live frontend/);
  assert.match(workflow, /Install dependencies[\s\S]*Smoke rendered live layout/);
});

test("production smoke workflow still requires signed-in frontend and rendered layout checks", () => {
  assert.match(workflow, /node scripts\/smoke_frontend\.mjs --require-signed-in-smoke --require-backend-workflow-smoke/);
  assert.match(workflow, /node scripts\/smoke_layout\.mjs --require-chrome --require-signed-in-layout/);
  assert.match(workflow, /ROLEFORGE_SMOKE_EMAIL:\s*\$\{\{\s*secrets\.ROLEFORGE_SMOKE_EMAIL\s*\}\}/);
  assert.match(workflow, /ROLEFORGE_SMOKE_PASSWORD:\s*\$\{\{\s*secrets\.ROLEFORGE_SMOKE_PASSWORD\s*\}\}/);
});
