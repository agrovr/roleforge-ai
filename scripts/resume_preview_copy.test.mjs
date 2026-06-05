import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resumePreview = readFileSync("app/components/ResumePreview.tsx", "utf8");
const resumeTemplates = readFileSync("app/lib/resumeTemplates.ts", "utf8");
const landingPage = readFileSync("app/page.tsx", "utf8");
const previewSources = [resumePreview, resumeTemplates, landingPage].join("\n");

test("public resume previews avoid generic placeholder contact data", () => {
  assert.doesNotMatch(previewSources, /email@example\.com/);
  assert.doesNotMatch(previewSources, /portfolio\.example/);
  assert.doesNotMatch(previewSources, /linkedin\.com\/in\/example/);
  assert.doesNotMatch(previewSources, /\b555\s+0100\b/);
  assert.match(previewSources, /candidate@preview\.test/);
  assert.match(previewSources, /portfolio\.preview\.test/);
});

test("public template preview names are deliberate sample identities", () => {
  for (const staleName of ["Sarah Chen", "Marcus Reed", "Priya Patel", "Alex Kim", "Daniel Cole", "Jen Park"]) {
    assert.doesNotMatch(previewSources, new RegExp(staleName));
  }

  for (const previewName of ["Avery Stone", "Noor Vale", "Mina Okafor", "Iris Calder", "Rafael Ko", "Elena Voss"]) {
    assert.match(previewSources, new RegExp(previewName));
  }
});
