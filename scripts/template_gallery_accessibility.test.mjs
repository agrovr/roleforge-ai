import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { stylesFor } from "./style_sources.mjs";

const templateLibrary = readFileSync("app/templates/TemplateLibrary.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const templateStyles = stylesFor("templates/templates.css");

test("template previews expose concise identities instead of sample resume content", () => {
  assert.match(
    templateLibrary,
    /className="templates-hero-preview" aria-label=\{`\$\{selectedTemplate\.name\} template preview`\}/,
  );
  assert.match(
    templateLibrary,
    /className="template-thumb templates-hero-thumb" key=\{selectedTemplate\.slug\} aria-hidden="true"/,
  );
  assert.match(templateLibrary, /<div className="template-thumb" aria-hidden="true">/);
});

test("every template card and action has a template-specific accessible name", () => {
  assert.match(templateLibrary, /aria-labelledby=\{`template-\$\{template\.slug\}-title`\}/);
  assert.match(
    templateLibrary,
    /<h3 className="template-name" id=\{`template-\$\{template\.slug\}-title`\}>\{template\.name\}<\/h3>/,
  );
  assert.match(
    templateLibrary,
    /aria-label=\{selected \? `\$\{template\.name\} template selected` : `Select \$\{template\.name\} template`\}/,
  );
  assert.match(templateLibrary, /aria-label=\{`Open \$\{template\.name\} in Studio`\}/);
});

test("semantic template headings retain the existing visual reset", () => {
  assert.match(globals, /\.template-name\s*\{(?=[^}]*margin:\s*0)(?=[^}]*font-weight:\s*800)[^}]*\}/s);
  assert.match(templateStyles, /\.templates-page-card \.template-name\s*\{[^}]*font-size:\s*1rem;[^}]*\}/s);
});
