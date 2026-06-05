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
  assert.match(settingsProjects, /kitItems/);
  assert.match(settingsProjects, /kitSummary/);
  assert.match(settingsProjects, /historyGeneratedAssetCounts/);
  assert.match(settingsProjects, /label:\s*"Cover letter"/);
  assert.match(settingsProjects, /label:\s*"Interview prep"/);
  assert.match(settingsProjects, /label:\s*"Follow-up"/);
  assert.match(settingsPage, /settings-project-kit/);
  assert.match(settingsPage, /Application kit/);
  assert.match(settingsPage, /project\.kitItems\.map/);
  assert.match(settingsPage, /project\.kitSummary/);
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

test("settings saved project empty state guides the first signed-in run", () => {
  assert.match(settingsPage, /settings-project-empty settings-project-onboarding/);
  assert.match(settingsPage, /aria-label="Start your first saved project"/);
  assert.match(settingsPage, /Complete a signed-in Tailor run/);
  assert.match(settingsPage, /Upload a resume/);
  assert.match(settingsPage, /Add a role target/);
  assert.match(settingsPage, /Run Tailor/);
  assert.match(settingsPage, /href="\/app"/);
  assert.match(settingsPage, /href="\/templates"/);
  assert.match(settingsPage, /href="\/help"/);
  assert.match(stylesheet, /\.settings-project-onboarding\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*14px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-onboarding-steps\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-onboarding-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*142px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-onboarding-actions\s+\.primary-button,\s*\.settings-project-onboarding-actions\s+\.ghost-button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-project-onboarding-steps\s+span\s*\{(?=[^}]*background:\s*rgba\(222,\s*162,\s*79,\s*0\.16\))(?=[^}]*color:\s*#f3c16d)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.settings-project-onboarding-steps,\s*\.settings-project-onboarding-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

test("settings saved project stage controls are compact and overflow-safe", () => {
  assert.match(stylesheet, /\.settings-project-list\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /#projects\.settings-section\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\))(?=[^}]*container:\s*settings-project-card\s*\/\s*inline-size)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-summary,\s*\.settings-project-controls\s*\{(?=[^}]*display:\s*grid)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-controls\s*\{(?=[^}]*justify-self:\s*stretch)(?=[^}]*inline-size:\s*100%)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*236px\),\s*1fr\)\))(?=[^}]*max-width:\s*100%)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-form,\s*\.settings-project-kit,\s*\.settings-project-delete\s*\{(?=[^}]*grid-column:\s*1\s*\/\s*-1)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-item\s+small\s*\{(?=[^}]*justify-self:\s*start)(?=[^}]*max-width:\s*100%)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-form\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*104px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(72px,\s*auto\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename-row\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*white-space:\s*nowrap)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-downloads\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-downloads\s+\.btn\s*\{(?=[^}]*width:\s*auto)(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)(?=[^}]*white-space:\s*nowrap)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-kit\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-kit-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*132px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-kit-item\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-project-kit/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-project-kit-item\.ready/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-project-kit-item\.locked/);
  assert.match(stylesheet, /\.settings-project-delete\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(84px,\s*auto\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete-row\s+button\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*white-space:\s*nowrap)[^}]*\}/s);
  assert.match(stylesheet, /@container\s+settings-project-card\s+\(max-width:\s*680px\)\s*\{[\s\S]*?\.settings-project-stage-controls,\s*\.settings-project-kit-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*112px\),\s*1fr\)\)/s);
  assert.match(stylesheet, /@container\s+settings-section\s+\(max-width:\s*720px\)\s*\{[\s\S]*?\.settings-project-item\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.settings-project-item\s*\{[^}]*grid-template-columns:\s*1fr/s);
});
