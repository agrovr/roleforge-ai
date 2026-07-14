import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("fine-detail polish styles native scrollbars and keyboard hints", () => {
  assert.match(globals, /html\s*\{[\s\S]*?scrollbar-color:/);
  assert.match(globals, /\*::-webkit-scrollbar-thumb\s*\{/);
  assert.match(globals, /\*::-webkit-scrollbar-thumb:hover\s*\{/);
  assert.match(globals, /kbd\s*\{[\s\S]*?font-family:\s*var\(--font-mono\)/);
  assert.match(globals, /html\[data-theme="dark"\]\s+kbd\s*\{/);
});

test("fine-detail polish adds compact token highlights without changing structure", () => {
  assert.match(globals, /\.badge,[\s\S]*?\.mock-status[\s\S]*?\)\s*\{/);
  assert.match(globals, /\.badge,[\s\S]*?\.mock-status[\s\S]*?\)::after\s*\{/);
  assert.match(globals, /\.status-dot,\s*\.settings-billing-timeline-icon,\s*\.settings-plan-access-icon,\s*\.settings-activity-icon,\s*\.settings-account-health-icon/);
});

test("fine-detail polish covers form autofill and keeps the native cursor", () => {
  assert.match(globals, /:-webkit-autofill\s*\{/);
  assert.match(globals, /accent-color:\s*var\(--brand-dark\)/);
  assert.match(globals, /@keyframes\s+rf-token-breathe/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*rf-token-breathe[\s\S]*animation:\s*none/);
  assert.doesNotMatch(globals, /cursor:\s*none/);
});
