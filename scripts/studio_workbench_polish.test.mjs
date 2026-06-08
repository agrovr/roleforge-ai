import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const sectionStart = globals.indexOf("/* Studio workbench polish:");
assert.notEqual(sectionStart, -1, "studio workbench polish section is missing");
const section = globals.slice(sectionStart);

test("studio workbench polish defines shared rail and glint tokens", () => {
  assert.match(section, /\.rf-workflow-panel,\s*\.rf-intake-grid,\s*\.rf-live-card,\s*\.suggestion-list,\s*\.ats-list,\s*\.generated-grid\s*\{(?=[^}]*--studio-workbench-rail:\s*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*--studio-workbench-glint:)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.rf-workflow-panel,\s*html\[data-theme="dark"\]\s+\.rf-intake-grid,\s*html\[data-theme="dark"\]\s+\.rf-live-card,\s*html\[data-theme="dark"\]\s+\.suggestion-list,\s*html\[data-theme="dark"\]\s+\.ats-list,\s*html\[data-theme="dark"\]\s+\.generated-grid\s*\{(?=[^}]*--studio-workbench-rail:\s*linear-gradient\(180deg,\s*#f3c16d,\s*#8fdac8,\s*#b9c7ff\))[^}]*\}/s);
});

test("studio workbench cards get rails, glints, and tactile hover states", () => {
  assert.match(section, /\.rf-intake-card,\s*\.rf-file-drop,\s*\.rf-target-editor,\s*\.rf-run-controls,\s*\.rf-preview-wrap,\s*\.suggestion,\s*\.ats-item,\s*\.generated-card\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(section, /\.rf-intake-card::after,\s*\.suggestion::after,\s*\.ats-item::after,\s*\.generated-card::after\s*\{(?=[^}]*background:\s*var\(--studio-workbench-rail\))(?=[^}]*opacity:\s*0\.58)[^}]*\}/s);
  assert.match(section, /\.rf-file-drop::before,\s*\.rf-target-editor::before,\s*\.rf-run-controls::before,\s*\.rf-preview-wrap::before,\s*\.suggestion::before,\s*\.ats-item::before,\s*\.generated-card::before\s*\{(?=[^}]*background:\s*var\(--studio-workbench-glint\))(?=[^}]*height:\s*1px)[^}]*\}/s);
  assert.match(section, /\.rf-intake-card:hover,\s*\.rf-intake-card:focus-within\s*\{(?=[^}]*transform:\s*translateY\(-2px\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.suggestion:hover,\s*\.suggestion:focus-within,\s*\.ats-item:hover,\s*\.generated-card:hover,\s*\.generated-card:focus-within\s*\{(?=[^}]*transform:\s*translateY\(-2px\))(?=[^}]*border-color:)[^}]*\}/s);
});

test("studio workbench polish has dark surfaces and reduced-motion safety", () => {
  assert.match(section, /html\[data-theme="dark"\]\s+\.rf-preview-wrap\s*\{(?=[^}]*radial-gradient\(circle at 100% 0%)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.suggestion,\s*html\[data-theme="dark"\]\s+\.ats-item,\s*html\[data-theme="dark"\]\s+\.generated-card\s*\{(?=[^}]*radial-gradient\(circle at 100% 0%)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.rf-intake-card,\s*\.rf-file-drop,\s*\.rf-target-editor,\s*\.rf-run-controls,\s*\.rf-preview-wrap,\s*\.suggestion,\s*\.ats-item,\s*\.generated-card,[\s\S]*?transition:\s*none;[\s\S]*?\.rf-intake-card:hover,[\s\S]*?\.generated-card:focus-within\s*\{[^}]*transform:\s*none;[\s\S]*?\}/s);
});
