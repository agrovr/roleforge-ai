import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");

test("settings commerce finish keeps billing and export surfaces polished", () => {
  assert.match(settingsPage, /settings-section-panel settings-export-list/);
  assert.match(settingsPage, /settings-section-panel settings-billing-panel/);
  assert.match(settingsPage, /settings-document-hub/);
  assert.match(stylesheet, /\/\* Settings commerce finish: billing trust rails and export document clarity\. \*\//);
  assert.match(stylesheet, /\.settings-billing-panel,\s*\.settings-export-list,\s*\.settings-document-hub\s*\{(?=[^}]*--settings-commerce-rail:\s*linear-gradient\(90deg)(?=[^}]*--settings-commerce-glint:\s*linear-gradient\(112deg)(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-billing-panel::before,\s*\.settings-export-list::before,\s*\.settings-document-hub::before\s*\{(?=[^}]*height:\s*3px)(?=[^}]*background:\s*var\(--settings-commerce-rail\))(?=[^}]*opacity:\s*0\.62)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-billing-panel::after,\s*\.settings-export-list::after,\s*\.settings-document-hub::after\s*\{(?=[^}]*z-index:\s*-1)(?=[^}]*radial-gradient\(circle at 96% 8%)[^}]*\}/s);
});

test("settings commerce finish adds document and export affordances", () => {
  assert.match(stylesheet, /\.settings-billing-alert::before\s*\{(?=[^}]*width:\s*4px)(?=[^}]*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-export-item\s*\{(?=[^}]*position:\s*relative)(?=[^}]*transition:\s*border-color 160ms ease,\s*box-shadow 160ms ease,\s*transform 160ms ease)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-export-item::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*linear-gradient\(180deg,\s*var\(--good\),\s*var\(--sky\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-export-item::after\s*\{(?=[^}]*background:\s*var\(--settings-commerce-glint\))(?=[^}]*transform:\s*translateX\(-56%\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-format\s*\{(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-format\.docx\s*\{(?=[^}]*var\(--sky-soft\))(?=[^}]*color:)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-format\.txt\s*\{(?=[^}]*var\(--accent-soft\))(?=[^}]*color:)[^}]*\}/s);
});

test("settings commerce finish covers billing controls dark mode and reduced motion", () => {
  assert.match(stylesheet, /\.settings-billing-control-list\s*\{(?=[^}]*border-block-color:\s*color-mix\(in srgb,\s*var\(--brand\) 18%,\s*var\(--line\)\))(?=[^}]*background:)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-billing-control-item > span,\s*\.settings-plan-access-icon,\s*\.settings-billing-timeline-icon\s*\{(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-billing-panel,\s*html\[data-theme="dark"\]\s+\.settings-export-list,\s*html\[data-theme="dark"\]\s+\.settings-document-hub\s*\{(?=[^}]*--settings-commerce-rail:)(?=[^}]*--settings-commerce-glint:)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-document-format\.docx\s*\{(?=[^}]*#b9cdf7)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-document-format\.txt\s*\{(?=[^}]*#f3c16d)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.settings-export-item\s*\{[\s\S]*?transition:\s*none;[\s\S]*?\.settings-export-item:hover,[\s\S]*?\.settings-export-item:focus-within\s*\{[\s\S]*?transform:\s*none;/s);
});
