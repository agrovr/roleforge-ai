import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landing = readFileSync("app/page.tsx", "utf8");
const brand = readFileSync("app/components/Brand.tsx", "utf8");
const studioDemo = readFileSync("app/components/LandingStudioDemo.tsx", "utf8");

test("landing links avoid background route churn while scrolling", () => {
  assert.match(landing, /function Link\(\{ prefetch = false, \.\.\.props \}: ComponentProps<typeof NextLink>\)/);
  assert.match(landing, /return <NextLink \{\.\.\.props\} prefetch=\{prefetch\} \/>/);
  assert.match(landing, /href="\/templates">Templates<\/Link>/);
  assert.equal((landing.match(/\sprefetch>/g) || []).length, 0, "landing navigation should not preload route-owned CSS");
});

test("shared landing artwork and demo actions do not prefetch hidden or protected routes", () => {
  assert.match(brand, /href=\{href\} aria-label=\{label\} prefetch=\{false\}/);
  assert.equal((studioDemo.match(/prefetch=\{false\}/g) || []).length, 4);
  assert.doesNotMatch(studioDemo, /<Link(?![^>]*prefetch=\{false\})[^>]*>/);
});
