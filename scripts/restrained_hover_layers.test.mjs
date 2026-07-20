import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const studio = readFileSync("app/app/studio.css", "utf8");
const settings = readFileSync("app/settings/settings.css", "utf8");
const templates = readFileSync("app/templates/templates.css", "utf8");

const combined = `${globals}\n${studio}\n${settings}`;

test("shared cards avoid a generic hover-gradient paint layer", () => {
  assert.doesNotMatch(combined, /\.templates-page-card::before,[\s\S]*?linear-gradient\(145deg/);
  assert.doesNotMatch(combined, /\.price-card:hover::before/);
  assert.doesNotMatch(combined, /\.settings-section:focus-within::before/);
  assert.doesNotMatch(combined, /\.studio-card:hover::before/);
});

test("route styles do not duplicate the shared card positioning contract", () => {
  assert.doesNotMatch(studio, /\.template-card,\s*\n\.templates-page-card,[\s\S]*?isolation:\s*isolate/);
  assert.doesNotMatch(settings, /\.template-card,\s*\n\.templates-page-card,[\s\S]*?isolation:\s*isolate/);
  assert.match(globals, /\.template-card,\s*\n\.templates-page-card,[\s\S]*?isolation:\s*isolate/);
});

test("focused interaction feedback remains on the affected marketing surfaces", () => {
  assert.match(globals, /\.step:hover\s*\{[^}]*transform:\s*translateY\(-4px\)/s);
  assert.match(globals, /\.feature-card:hover\s*\{[^}]*transform:\s*translateY\(-4px\)/s);
  assert.match(templates, /\.templates-page-card\.selected\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px/s);
});
