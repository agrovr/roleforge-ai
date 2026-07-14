import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("app/layout.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const accountMenuBehavior = readFileSync("app/components/AccountMenuBehavior.tsx", "utf8");
const sitePolish = readFileSync("app/components/SitePolish.tsx", "utf8");

test("the app shell preserves native browser pointer and keyboard behavior", () => {
  assert.doesNotMatch(layout, /PointerEffects/);
  assert.doesNotMatch(`${accountMenuBehavior}\n${sitePolish}`, /contextmenu/);
  assert.doesNotMatch(`${accountMenuBehavior}\n${sitePolish}`, /event\.key\.toLowerCase\(\) === "k"/);
});

test("native cursor styling stays fast and accessible", () => {
  assert.doesNotMatch(globals, /cursor:\s*none/);
  assert.doesNotMatch(globals, /\.rf-cursor-ring/);
  assert.doesNotMatch(globals, /\.rf-cursor-dot/);
  assert.doesNotMatch(globals, /\.pointer-glow/);
});

test("the retired custom context menu leaves no global styles or keyframes", () => {
  assert.doesNotMatch(globals, /\.rf-context-menu/);
  assert.doesNotMatch(globals, /@keyframes\s+rf-menu-in/);
});

test("shared runtime listeners remain scoped to real account-menu behavior", () => {
  assert.match(accountMenuBehavior, /details\[data-account-menu\]/);
  assert.doesNotMatch(accountMenuBehavior, /window\.addEventListener\("scroll"/);
  assert.doesNotMatch(accountMenuBehavior, /window\.addEventListener\("resize"/);
});
