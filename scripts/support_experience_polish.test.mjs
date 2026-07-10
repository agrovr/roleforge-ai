import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("customer support experience keeps its traceable request surfaces", () => {
  assert.match(globals, /\/\* Support experience polish: traceable request cards and operator queue depth\. \*\//);
  assert.match(globals, /\.support-shell\s*\{(?=[^}]*--support-experience-rail:\s*linear-gradient\(180deg,\s*var\(--sky\),\s*var\(--brand\),\s*var\(--accent\)\))(?=[^}]*--support-experience-glass:)[^}]*\}/s);
  assert.match(globals, /\.support-routing-strip,\s*\.support-admin-entry,\s*\.support-guide-card,\s*\.support-triage-card,\s*\.support-request-card,\s*\.support-packet-card,\s*\.support-response-card,\s*\.support-history-item,\s*\.settings-support-item\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.support-routing-strip,\s*\.support-admin-entry,\s*\.support-guide-card,\s*\.support-triage-card,\s*\.support-request-card,\s*\.support-packet-card,\s*\.support-response-card,\s*\.support-history-item,\s*\.settings-support-item\s*\{(?=[^}]*radial-gradient\(circle at 96% 4%)(?=[^}]*var\(--support-experience-glass\))(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("customer support rails do not spill into the operator inbox", () => {
  assert.match(globals, /\.support-routing-strip::after,\s*\.support-admin-entry::after,\s*\.support-guide-card::after,\s*\.support-request-card::after,\s*\.support-packet-card::after,\s*\.support-response-card::after,\s*\.support-history-item::after,\s*\.settings-support-item::after\s*\{(?=[^}]*width:\s*3px)(?=[^}]*background:\s*var\(--support-experience-rail\))[^}]*\}/s);
  assert.doesNotMatch(globals, /\.admin-support-playbook::before/);
  assert.doesNotMatch(globals, /\.admin-support-readiness-card::before/);
  assert.doesNotMatch(globals, /\.admin-support-empty::before/);
  assert.match(globals, /\.support-status-badge,\s*\.admin-support-status,\s*\.admin-support-reference,\s*\.support-reference-copy\s*\{(?=[^}]*letter-spacing:\s*0\.045em)(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("customer support polish keeps dark mode and reduced motion coverage", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.support-shell\s*\{(?=[^}]*--support-experience-rail:)(?=[^}]*--support-experience-glass:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.support-routing-strip,\s*html\[data-theme="dark"\]\s+\.support-admin-entry,\s*html\[data-theme="dark"\]\s+\.support-guide-card,\s*html\[data-theme="dark"\]\s+\.support-triage-card,\s*html\[data-theme="dark"\]\s+\.support-request-card,\s*html\[data-theme="dark"\]\s+\.support-packet-card,\s*html\[data-theme="dark"\]\s+\.support-response-card,\s*html\[data-theme="dark"\]\s+\.support-history-item,\s*html\[data-theme="dark"\]\s+\.settings-support-item\s*\{(?=[^}]*rgba\(16,\s*22,\s*37,\s*0\.86\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.support-request-card,[\s\S]*?\.settings-support-item\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});
