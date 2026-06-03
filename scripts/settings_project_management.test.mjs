import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const settingsProjects = readFileSync("app/lib/settingsProjects.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("settings saved projects expose account-owned stage updates", () => {
  assert.match(settingsProjects, /projectId:\s*group\.accountItem\?\.projectId/);
  assert.match(settingsProjects, /stageStatus:\s*stage\.status/);
  assert.match(settingsPage, /updateSettingsProjectStatusAction/);
  assert.match(settingsPage, /updateSavedProjectStatus\(supabase,\s*projectId,\s*status,\s*user\.id\)/);
  assert.match(settingsPage, /APPLICATION_STATUS_OPTIONS\.map/);
  assert.match(settingsPage, /settingsStageLabel\(option\.status,\s*option\.label\)/);
  assert.match(settingsPage, /name="projectId"/);
  assert.match(settingsPage, /name="status"/);
  assert.match(settingsPage, /project\.downloads\.map/);
  assert.match(settingsPage, /settings-project-downloads/);
  assert.match(settingsPage, /renameSettingsProjectAction/);
  assert.match(settingsPage, /renameSavedProject\(supabase,\s*projectId,\s*title,\s*user\.id\)/);
  assert.match(settingsPage, /settings-project-rename/);
  assert.match(settingsPage, /name="title"/);
  assert.match(settingsPage, /project-renamed/);
  assert.match(settingsPage, /deleteSettingsProjectAction/);
  assert.match(settingsPage, /settings-project-delete/);
  assert.match(settingsPage, /name="confirmDelete"/);
  assert.match(settingsPage, /project-deleted/);
  assert.match(settingsPage, /account=project-stage-saved#projects/);
});

test("settings saved project cards keep history links separate from stage forms", () => {
  assert.match(settingsPage, /<article\s+className="settings-project-item"/);
  assert.match(settingsPage, /className="settings-project-summary"/);
  assert.match(settingsPage, /className="settings-project-controls"/);
  assert.match(settingsPage, /<Link href=\{project\.href\}/);
  assert.match(settingsPage, /className="settings-project-stage-form"/);
  assert.doesNotMatch(settingsPage, /<Link[^>]*className="settings-project-item"/);
});

test("settings saved project stage controls are compact and overflow-safe", () => {
  assert.match(stylesheet, /\.settings-project-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(220px,\s*0\.95fr\)\s+minmax\(360px,\s*1\.35fr\))(?=[^}]*gap:\s*16px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-summary,\s*\.settings-project-controls\s*\{(?=[^}]*display:\s*grid)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-item\s+small\s*\{(?=[^}]*justify-self:\s*start)(?=[^}]*max-width:\s*100%)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-form\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*white-space:\s*nowrap)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+78px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename-row\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*white-space:\s*nowrap)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-downloads\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-downloads\s+\.btn\s*\{(?=[^}]*width:\s*auto)(?=[^}]*min-width:\s*0)(?=[^}]*white-space:\s*nowrap)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+96px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete-row\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*white-space:\s*nowrap)[^}]*\}/s);
  assert.match(stylesheet, /@container\s+settings-section\s+\(max-width:\s*720px\)\s*\{[\s\S]*?\.settings-project-stage-controls\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.settings-project-item\s*\{[^}]*grid-template-columns:\s*1fr/s);
});
