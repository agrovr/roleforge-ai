import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const settingsNav = readFileSync("app/settings/SettingsSectionNav.tsx", "utf8");

function sectionIdsFromPage(source) {
  return [...source.matchAll(/<section\s+className="settings-section"\s+id="([^"]+)"/g)].map((match) => match[1]);
}

function sectionIdsFromNav(source) {
  return [...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"[^"]+",\s*icon:\s*"[^"]+"\s*\}/g)].map((match) => match[1]);
}

test("settings section nav mirrors the settings page sections", () => {
  assert.deepEqual(sectionIdsFromNav(settingsNav), sectionIdsFromPage(settingsPage));
});
