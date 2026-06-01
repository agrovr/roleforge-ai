import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("app/layout.tsx", "utf8");
const pointerEffects = readFileSync("app/components/PointerEffects.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("global pointer experience is mounted once in the app shell", () => {
  assert.match(layout, /import \{ PointerEffects \}/);
  assert.match(layout, /<PointerEffects \/>/);
});

test("custom cursor stays responsive and accessibility-aware", () => {
  assert.match(pointerEffects, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(pointerEffects, /prefers-reduced-motion: reduce/);
  assert.match(pointerEffects, /isEditableTarget/);
  assert.match(pointerEffects, /rf-native-context/);
  assert.match(globals, /html\.rf-custom-pointer input/);
  assert.match(globals, /\.rf-cursor-ring/);
  assert.match(globals, /\.rf-cursor-dot/);
});

test("context menu supports keyboard and native-menu escape hatches", () => {
  assert.match(pointerEffects, /document\.addEventListener\("contextmenu"/);
  assert.match(pointerEffects, /event\.shiftKey \|\| event\.ctrlKey \|\| event\.metaKey \|\| event\.altKey/);
  assert.match(pointerEffects, /role="menu"/);
  assert.match(pointerEffects, /role="menuitem"/);
  assert.match(pointerEffects, /ArrowDown/);
  assert.match(pointerEffects, /ArrowUp/);
  assert.match(pointerEffects, /Escape/);
  assert.match(pointerEffects, /clampMenuPosition/);
  assert.match(globals, /\.rf-context-menu/);
  assert.match(pointerEffects, /Hold Shift while right-clicking/);
});
