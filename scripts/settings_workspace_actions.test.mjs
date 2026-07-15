import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");

test("settings page exposes top-level workspace quick actions", () => {
  assert.match(settingsPage, /settings-workspace-actions/);
  assert.match(settingsPage, /aria-label="Workspace quick actions"/);
  assert.match(settingsPage, /href="\/app"/);
  assert.match(settingsPage, /Start a resume/);
  assert.match(settingsPage, /href="#projects"/);
  assert.match(settingsPage, /Review projects/);
  assert.match(settingsPage, /href="\/api\/account\/export"/);
  assert.match(settingsPage, /Export account/);
  assert.match(settingsPage, /href="#billing"/);
  assert.match(settingsPage, /Plan and billing/);
});

test("settings workspace quick actions are compact and overflow-safe", () => {
  assert.match(stylesheet, /\.settings-workspace-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*178px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-workspace-action\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-workspace-action\s+strong\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-workspace-action\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\] \.settings-workspace-action/);
});
