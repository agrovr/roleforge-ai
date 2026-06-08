import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("global interaction polish gives keyboard users a consistent focus ring", () => {
  assert.match(globals, /:where\(a,\s*button,\s*summary,\s*input,\s*textarea,\s*select,\s*\[role="button"\],\s*\[tabindex\]\):focus-visible\s*\{/);
  assert.match(globals, /outline:\s*3px solid color-mix\(in srgb,\s*var\(--brand\) 30%,\s*transparent\)/);
  assert.match(globals, /html\[data-theme="dark"\]\s+:where\(a,\s*button,\s*summary,\s*input,\s*textarea,\s*select,\s*\[role="button"\],\s*\[tabindex\]\):focus-visible/);
});

test("global interaction polish makes controls tactile without animating disabled actions", () => {
  assert.match(globals, /\.primary-button,[\s\S]*?\.admin-support-action[\s\S]*?\):not\(:disabled\):not\(\.disabled\):not\(\.settings-disabled-action\)/);
  assert.match(globals, /transform:\s*translateY\(-2px\)/);
  assert.match(globals, /transform:\s*translateY\(0\) scale\(0\.985\)/);
});

test("global interaction polish upgrades form fields and anchor jumps safely", () => {
  assert.match(globals, /\.support-form input,[\s\S]*?\.admin-support-reply-form textarea[\s\S]*?background-image:/);
  assert.match(globals, /\.rf-target-editor textarea,[\s\S]*?\.admin-support-reply-form textarea[\s\S]*?\):focus\s*\{/);
  assert.match(globals, /\.settings-section,[\s\S]*?\.admin-support-card[\s\S]*?\):target\s*\{/);
  assert.match(globals, /@keyframes\s+rf-target-pulse/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*:target[\s\S]*animation:\s*none/);
});
