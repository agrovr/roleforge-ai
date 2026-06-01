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
  assert.match(settingsPage, /<Link href=\{project\.href\}/);
  assert.match(settingsPage, /className="settings-project-stage-form"/);
  assert.doesNotMatch(settingsPage, /<Link[^>]*className="settings-project-item"/);
});

test("settings saved project stage controls are compact and overflow-safe", () => {
  assert.match(stylesheet, /\.settings-project-stage-form\s*\{(?=[^}]*flex:\s*1\s+1\s+100%)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*92px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename\s*\{(?=[^}]*flex:\s*1\s+1\s+100%)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(min\(100%,\s*112px\),\s*auto\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename-row\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-downloads\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*92px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-downloads\s+\.btn\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete\s*\{(?=[^}]*flex:\s*1\s+1\s+100%)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(min\(100%,\s*120px\),\s*auto\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete-row\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
});
