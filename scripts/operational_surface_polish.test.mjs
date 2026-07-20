import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");
const adminStyles = readFileSync("app/admin/support/admin-support.css", "utf8");

test("operational polish keeps saved work and document rows scannable without decorative rails", () => {
  assert.match(globals, /\/\* Operational surface finish: saved work, document rows, and support triage\. \*\//);
  assert.match(globals, /\.settings-project-item,\s*\.settings-document-item,\s*\.studio-account-recent-link\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--surface\) 92%, var\(--surface-warm\)\)[^}]*\}/s);
  assert.doesNotMatch(globals, /--ops-rail/);
  assert.doesNotMatch(globals, /\.settings-project-item::after/);
  assert.doesNotMatch(globals, /\.settings-document-item::after/);
  assert.doesNotMatch(globals, /\.studio-account-recent-link::after/);
});

test("operational polish no longer decorates support metadata as nested cards", () => {
  assert.match(globals, /\.settings-project-controls\s*\{(?=[^}]*border-radius:\s*12px)(?=[^}]*padding:\s*12px)[^}]*\}/s);
  assert.match(globals, /\.settings-project-stage-controls button::after\s*\{/);
  assert.match(globals, /\.settings-document-item:hover,\s*\.settings-document-item:focus-within\s*\{(?=[^}]*transform:\s*translateY\(-1px\))[^}]*\}/s);
  assert.match(adminStyles, /\.admin-support-meta div\s*\{(?=[^}]*border-top:\s*1px)(?=[^}]*background:\s*transparent)[^}]*\}/s);
  assert.doesNotMatch(adminStyles, /\.admin-support-meta div::before/);
  assert.match(adminStyles, /\.admin-support-status\s*\{(?=[^}]*letter-spacing:\s*0\.045em)(?=[^}]*text-transform:\s*uppercase)[^}]*\}/s);
});

test("saved-work operational polish keeps dark mode and reduced motion covered", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.settings-project-item,\s*html\[data-theme="dark"\]\s+\.settings-document-item,\s*html\[data-theme="dark"\]\s+\.studio-account-recent-link\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--surface\) 92%, var\(--bg\)\)[^}]*\}/s);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*\.settings-document-item,\s*[\s\S]*\.studio-account-recent-link\s*\{[\s\S]*transition:\s*none/);
});
