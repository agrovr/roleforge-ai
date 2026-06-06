import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const settingsNav = readFileSync("app/settings/SettingsSectionNav.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");
const icons = readFileSync("app/components/RoleForgeIcons.tsx", "utf8");

function sectionIdsFromPage(source) {
  return [...source.matchAll(/<section\s+className="settings-section"\s+id="([^"]+)"/g)].map((match) => match[1]);
}

function sectionIdsFromNav(source) {
  return [...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"[^"]+",\s*icon:\s*"[^"]+",\s*keywords:\s*"[^"]+"\s*\}/g)].map((match) => match[1]);
}

test("settings section nav mirrors the settings page sections", () => {
  assert.deepEqual(sectionIdsFromNav(settingsNav), sectionIdsFromPage(settingsPage));
});

test("settings section nav can filter by common account tasks", () => {
  assert.match(settingsNav, /const \[query,\s*setQuery\] = useState\(""\)/);
  assert.match(settingsNav, /const searchInputRef = useRef<HTMLInputElement \| null>\(null\)/);
  assert.match(settingsNav, /type="search"/);
  assert.match(settingsNav, /ref=\{searchInputRef\}/);
  assert.match(settingsNav, /onKeyDown=\{onSearchKeyDown\}/);
  assert.match(settingsNav, /placeholder="Billing, exports, saved projects\.\.\."/);
  assert.match(settingsNav, /settings-section-search/);
  assert.match(settingsNav, /settings-section-clear/);
  assert.match(settingsNav, /aria-label="Clear settings search"/);
  assert.match(settingsNav, /RoleForgeIcon name="x"/);
  assert.match(settingsNav, /const resultLabel = normalizedQuery/);
  assert.match(settingsNav, /role="status">\{resultLabel\}/);
  assert.match(settingsNav, /function clearSettingsSearch/);
  assert.match(settingsNav, /setQuery\(""\)/);
  assert.match(settingsNav, /function onSearchKeyDown/);
  assert.match(settingsNav, /event\.key !== "Escape" \|\| !query/);
  assert.match(settingsNav, /document\.addEventListener\("keydown",\s*onDocumentKeyDown\)/);
  assert.match(settingsNav, /document\.removeEventListener\("keydown",\s*onDocumentKeyDown\)/);
  assert.match(settingsNav, /event\.key !== "\/"/);
  assert.match(settingsNav, /event\.metaKey \|\| event\.ctrlKey \|\| event\.altKey/);
  assert.match(settingsNav, /target\.isContentEditable \|\| tagName === "input" \|\| tagName === "textarea" \|\| tagName === "select"/);
  assert.match(settingsNav, /input\.focus\(\)/);
  assert.match(settingsNav, /input\.select\(\)/);
  assert.match(settingsNav, /settings-section-list/);
  assert.match(settingsNav, /visibleSections\.map/);
  assert.match(settingsNav, /No settings match\./);
  assert.match(settingsNav, /keywords:\s*"premium stripe checkout portal plan invoices cancel"/);
  assert.match(settingsNav, /keywords:\s*"pdf docx txt downloads formats premium"/);
  assert.match(settingsNav, /keywords:\s*"privacy terms export data delete account record personal information communication preferences"/);
  assert.match(settingsNav, /keywords:\s*"template resume direction default style communication email product updates notices"/);
  assert.match(settingsNav, /keywords:\s*"history restore rename remove applications"/);
  assert.match(settingsNav, /visibleSections\.findIndex/);
  assert.match(icons, /\|\s*"search"/);
});

test("settings section nav exits task-filter mode on normal section selection", () => {
  assert.match(settingsNav, /const selectSection = useCallback/);
  assert.match(settingsNav, /if \(query\) setQuery\(""\)/);
  assert.match(settingsNav, /selectSection\(section\.id\)/);
  assert.doesNotMatch(settingsNav, /onClick=\{\(event\) => \{\s*event\.preventDefault\(\);\s*navigateToSection\(section\.id\);/s);
});

test("settings section nav exposes common task shortcuts", () => {
  assert.match(settingsNav, /settingsTaskShortcuts/);
  assert.match(settingsNav, /aria-label="Common account tasks"/);
  assert.match(settingsNav, /Cancel Premium/);
  assert.match(settingsNav, /query:\s*"cancel premium"/);
  assert.match(settingsNav, /sectionId:\s*"billing"/);
  assert.match(settingsNav, /Export data/);
  assert.match(settingsNav, /query:\s*"account export"/);
  assert.match(settingsNav, /sectionId:\s*"data-privacy"/);
  assert.match(settingsNav, /Email preferences/);
  assert.match(settingsNav, /query:\s*"product updates"/);
  assert.match(settingsNav, /sectionId:\s*"preferences"/);
  assert.match(settingsNav, /targetId:\s*"communication-preferences"/);
  assert.match(settingsNav, /Support history/);
  assert.match(settingsNav, /query:\s*"support request"/);
  assert.match(settingsNav, /Restore projects/);
  assert.match(settingsNav, /query:\s*"restore saved projects"/);
  assert.match(settingsNav, /setQuery\(task\.query\)/);
  assert.match(settingsNav, /href=\{`#\$\{task\.targetId \?\? task\.sectionId\}`\}/);
  assert.match(settingsNav, /navigateToSection\(task\.sectionId,\s*"smooth",\s*task\.targetId\)/);
});

test("settings section nav keeps child hash targets tied to their parent section", () => {
  assert.match(settingsNav, /const navigateToSection = useCallback\(\(sectionId: SettingsSectionId,\s*behavior: ScrollBehavior = "smooth",\s*targetId: string = sectionId\)/);
  assert.match(settingsNav, /window\.history\.pushState\(null,\s*"",\s*`#\$\{targetId\}`\)/);
  assert.match(settingsNav, /document\.getElementById\(targetId\)\?\.scrollIntoView\(\{ behavior,\s*block:\s*"start" \}\)/);
  assert.match(settingsNav, /const hashChild = hash \? document\.getElementById\(hash\) : null/);
  assert.match(settingsNav, /hashChild\?\.closest\("\.settings-section"\)/);
  assert.match(settingsNav, /setActiveSection\(hashChildSectionId\)/);
});

test("settings section search stays compact across breakpoints", () => {
  assert.match(stylesheet, /\.settings-section-search\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-section-search\s*>\s*div\s*\{(?=[^}]*grid-template-columns:\s*18px\s+minmax\(0,\s*1fr\)\s+auto)(?=[^}]*min-height:\s*40px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-section-search\s+input\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*background:\s*transparent)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-section-clear\s*\{(?=[^}]*width:\s*28px)(?=[^}]*height:\s*28px)(?=[^}]*place-items:\s*center)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-section-result\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-task-shortcuts\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-task-shortcuts\s+a\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-section-list\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.settings-section-list\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.settings-section-list\s+a\s*\{(?=[^}]*flex:\s*initial)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.settings-page-nav\s*\{[^}]*grid-template-columns:\s*1fr[^}]*\}[\s\S]*?\.settings-section-list\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*132px\),\s*1fr\)\)/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.settings-section-list\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-section-search\s*>\s*div/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-section-result/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-section-clear/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-task-shortcuts\s+a/);
});
