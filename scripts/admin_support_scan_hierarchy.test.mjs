import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/admin/support/page.tsx", "utf8");
const stylesheet = readFileSync("app/admin/support/admin-support.css", "utf8");

test("admin request identity and queue status share one scan row", () => {
  assert.match(page, /className="admin-support-card-heading"[\s\S]*?admin-support-reference[\s\S]*?admin-support-status/s);
  assert.match(stylesheet, /\.admin-support-card-heading\s*\{(?=[^}]*display:\s*flex)(?=[^}]*justify-content:\s*space-between)(?=[^}]*gap:\s*12px)[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-reference\s*\{(?=[^}]*margin-bottom:\s*0)[^}]*\}/s);
});

test("queue filter counts stay compact without nested count pills", () => {
  assert.match(stylesheet, /\.admin-support-filter a strong\s*\{(?=[^}]*border-inline-start:\s*1px)(?=[^}]*background:\s*transparent)[^}]*\}/s);
  assert.doesNotMatch(stylesheet, /\.admin-support-filter a strong\s*\{[^}]*border-radius:\s*999px/s);
});

test("mobile queue actions use available width without stacking every status control", () => {
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.admin-support-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(120px,\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.admin-support-actions-label\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*\}/s);
});
