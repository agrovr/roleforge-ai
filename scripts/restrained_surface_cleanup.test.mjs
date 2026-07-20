import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const settingsStyles = readFileSync("app/settings/settings.css", "utf8");

test("saved work rows use quiet surfaces without decorative side rails", () => {
  for (const stylesheet of [globals, settingsStyles]) {
    assert.doesNotMatch(stylesheet, /\.settings-project-item::after/);
    assert.doesNotMatch(stylesheet, /\.settings-document-item::after/);
    assert.doesNotMatch(stylesheet, /\.studio-account-recent-link::after/);
    assert.doesNotMatch(stylesheet, /--ops-rail/);
    assert.match(stylesheet, /\.settings-project-item,\s*\.settings-document-item,\s*\.studio-account-recent-link\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--surface\) 92%, var\(--surface-warm\)\)[^}]*\}/s);
  }
});

test("settings template previews keep one uniform outline", () => {
  const previewBlock = settingsStyles.match(/\.settings-template-thumb\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(previewBlock, /border:\s*1px solid var\(--line\)/);
  assert.doesNotMatch(previewBlock, /border-top:/);
});
