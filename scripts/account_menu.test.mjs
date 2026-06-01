import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const globalsCss = readFileSync("app/globals.css", "utf8");

test("studio account menu acts as a workspace command center", () => {
  assert.match(studioPage, /studio-account-identity/);
  assert.match(studioPage, /studio-account-insights/);
  assert.match(studioPage, /Account status summary/);
  assert.match(studioPage, /href="\/templates"/);
  assert.match(studioPage, /href="\/settings#billing"/);
  assert.match(studioPage, /Saved projects/);
  assert.match(studioPage, /DOCX and TXT/);
});

test("account menu layout has responsive status cards", () => {
  assert.match(globalsCss, /\.studio-account-insights\s*\{/);
  assert.match(globalsCss, /@container studio-account-popover \(max-width: 360px\)/);
  assert.match(globalsCss, /html\[data-theme="dark"\] \.studio-account-insights a/);
});

test("settings topbar exposes account, project, usage, and billing controls", () => {
  assert.match(settingsPage, /settings-account-menu/);
  assert.match(settingsPage, /aria-label="Open account menu"/);
  assert.match(settingsPage, /href="#projects"/);
  assert.match(settingsPage, /href="#usage"/);
  assert.match(settingsPage, /href="#billing"/);
  assert.match(settingsPage, /href="\/app#history"/);
  assert.match(settingsPage, /action="\/auth\/signout"/);
});
