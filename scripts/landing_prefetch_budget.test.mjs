import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landing = readFileSync("app/page.tsx", "utf8");
const header = readFileSync("app/components/SiteHeader.tsx", "utf8");
const footer = readFileSync("app/components/SiteFooter.tsx", "utf8");
const brand = readFileSync("app/components/Brand.tsx", "utf8");
const studioDemo = readFileSync("app/components/LandingStudioDemo.tsx", "utf8");

test("landing links avoid background route churn while scrolling", () => {
  assert.match(landing, /function Link\(\{ prefetch = false, \.\.\.props \}: ComponentProps<typeof NextLink>\)/);
  assert.match(landing, /return <NextLink \{\.\.\.props\} prefetch=\{prefetch\} \/>/);
  assert.match(header, /"Templates", "\/templates"/);
  assert.doesNotMatch(header, /<Link(?![^>]*prefetch=\{false\})[^>]*>/);
  assert.doesNotMatch(footer, /<Link(?![^>]*prefetch=\{false\})[^>]*>/);
  assert.equal((landing.match(/\sprefetch>/g) || []).length, 0, "landing navigation should not preload route-owned CSS");
});

test("shared landing artwork and demo actions do not prefetch hidden or protected routes", () => {
  assert.match(brand, /href=\{href\} prefetch=\{false\}/);
  assert.match(brand, /label = "RoleForge AI home"/);
  assert.match(brand, /aria-label=\{label\}/);
  assert.equal((studioDemo.match(/prefetch=\{false\}/g) || []).length, 4);
  assert.doesNotMatch(studioDemo, /<Link(?![^>]*prefetch=\{false\})[^>]*>/);
});
