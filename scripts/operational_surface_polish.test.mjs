import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("operational polish gives saved work and document rows scannable rails", () => {
  assert.match(globals, /\/\* Operational surface finish: saved work, document rows, and support triage\. \*\//);
  assert.match(globals, /\.settings-project-list,\s*\.settings-document-list,\s*\.admin-support-list\s*\{(?=[^}]*--ops-rail:\s*linear-gradient\(180deg,\s*var\(--accent\),\s*var\(--brand\),\s*var\(--sky\)\))[^}]*\}/s);
  assert.match(globals, /\.settings-project-item,\s*\.settings-document-item,\s*\.studio-account-recent-link,\s*\.admin-support-meta div\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.settings-project-item::after,\s*\.settings-document-item::after,\s*\.studio-account-recent-link::after\s*\{(?=[^}]*width:\s*3px)(?=[^}]*background:\s*var\(--ops-rail\))[^}]*\}/s);
});

test("operational polish refines controls and support metadata without changing structure", () => {
  assert.match(globals, /\.settings-project-controls\s*\{(?=[^}]*border-radius:\s*12px)(?=[^}]*padding:\s*12px)[^}]*\}/s);
  assert.match(globals, /\.settings-project-stage-controls button::after\s*\{/);
  assert.match(globals, /\.settings-document-item:hover,\s*\.settings-document-item:focus-within\s*\{(?=[^}]*transform:\s*translateY\(-1px\))[^}]*\}/s);
  assert.match(globals, /\.admin-support-meta div::before\s*\{(?=[^}]*height:\s*2px)(?=[^}]*linear-gradient\(90deg,\s*transparent)[^}]*\}/s);
  assert.match(globals, /\.admin-support-status\s*\{(?=[^}]*letter-spacing:\s*0\.04em)(?=[^}]*text-transform:\s*uppercase)[^}]*\}/s);
});

test("operational polish keeps dark mode and reduced motion covered", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.settings-project-list,\s*html\[data-theme="dark"\]\s+\.settings-document-list,\s*html\[data-theme="dark"\]\s+\.admin-support-list\s*\{(?=[^}]*--ops-rail:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.settings-project-item,\s*html\[data-theme="dark"\]\s+\.settings-document-item,\s*html\[data-theme="dark"\]\s+\.studio-account-recent-link\s*\{/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.admin-support-meta div::before\s*\{/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*\.settings-document-item,\s*[\s\S]*\.admin-support-card\s*\{[\s\S]*transition:\s*none/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*\.settings-document-item:hover,[\s\S]*\.admin-support-card:focus-within\s*\{[\s\S]*transform:\s*none/);
});
