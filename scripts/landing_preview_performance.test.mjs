import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const preview = readFileSync("app/components/ResumePreview.tsx", "utf8");

test("background resume sheets use the compact decorative preview path", () => {
  assert.match(preview, /detail\?: "full" \| "decorative"/);
  assert.match(preview, /detail === "decorative" \? decorativeSectionsFor\(sections\) : sections/);
  assert.match(preview, /aria-hidden=\{detail === "decorative" \? true : undefined\}/);

  const decorativeCalls = page.match(/<ResumePreview detail="decorative"/g) ?? [];
  assert.equal(decorativeCalls.length, 3);
  assert.match(page, /resume-card resume-card-back-l[\s\S]*?<ResumePreview detail="decorative"/);
  assert.match(page, /resume-card resume-card-back-r[\s\S]*?<ResumePreview detail="decorative"/);
  assert.match(page, /resume-card back"><ResumePreview detail="decorative"/);
});

test("front-facing, template, and studio previews remain fully detailed", () => {
  assert.match(page, /resume-card resume-card-front[\s\S]*?<ResumePreview variant="essential" highlight \/>/);
  assert.match(page, /resumePreview=\{<ResumePreview highlight \/>\}/);
  assert.match(page, /<ResumePreview variant=\{template\.variant\} name=\{template\.previewName\} role=\{template\.previewRole\} \/>/);
});
