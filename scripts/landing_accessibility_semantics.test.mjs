import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landing = readFileSync("app/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("landing preview artwork stays concise for assistive technology", () => {
  assert.match(
    landing,
    /className="hero-stage"\s*role="img"\s*aria-label="Layered resume previews showing structure, keyword, and export guidance"/s,
  );
  assert.match(landing, /className="template-thumb" aria-hidden="true"/);
  assert.match(landing, /className="cta-visual" aria-hidden="true"/);
});

test("landing card groups expose a logical heading hierarchy", () => {
  assert.match(landing, /<h3 className="step-title">\{title\}<\/h3>/);
  assert.doesNotMatch(landing, /<h4 className="step-title">/);
  assert.match(
    landing,
    /<article className="template-card" aria-labelledby=\{`landing-template-\$\{template\.slug\}`\}/,
  );
  assert.match(
    landing,
    /<h3 className="template-name" id=\{`landing-template-\$\{template\.slug\}`\}>\{template\.name\}<\/h3>/,
  );
  assert.match(landing, /<article className="price-card" aria-labelledby="studio-plan-title">/);
  assert.match(landing, /<h3 className="price-name" id="studio-plan-title">Studio<\/h3>/);
  assert.match(landing, /<article className="price-card featured" aria-labelledby="premium-plan-title">/);
  assert.match(landing, /<h3 className="price-name" id="premium-plan-title">Premium<\/h3>/);
});

test("semantic headings preserve the approved visual sizing", () => {
  assert.match(stylesheet, /\.template-name\s*\{(?=[^}]*margin:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.price-name\s*\{(?=[^}]*margin:\s*0)(?=[^}]*font-size:\s*inherit)[^}]*\}/s);
});
