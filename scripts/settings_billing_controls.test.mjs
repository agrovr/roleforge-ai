import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("settings billing action distinguishes active portals from inactive billing state", () => {
  assert.match(settingsPage, /portalReady\s*\?\s*\(/);
  assert.match(settingsPage, /action="\/api\/billing\/portal"/);
  assert.match(settingsPage, /inactiveBillingActionLabel\s*=\s*premiumActive\s*\?\s*"Billing unavailable right now"\s*:\s*"Billing opens after checkout"/);
  assert.match(settingsPage, /\{inactiveBillingActionLabel\}/);
  assert.match(settingsPage, /aria-disabled="true"/);
  assert.match(settingsPage, /Billing management is unavailable right now\./);
  assert.match(settingsPage, /Start Premium to open billing management\./);
  assert.doesNotMatch(settingsPage, /No billing portal yet/);
  assert.doesNotMatch(settingsPage, /type="submit"\s+disabled=\{!portalReady\}/);
});

test("inactive settings billing action does not animate like a clickable control", () => {
  assert.match(stylesheet, /\.settings-disabled-action\s*\{[^}]*cursor:\s*default[^}]*opacity:\s*0\.78[^}]*\}/s);
  assert.match(stylesheet, /\.settings-disabled-action:hover\s*\{[^}]*transform:\s*none[^}]*\}/s);
});
