import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("app/components/LandingAnchorSync.tsx", "utf8");
const bootstrap = readFileSync("app/components/LandingAnchorBootstrap.tsx", "utf8");
const landing = readFileSync("app/page.tsx", "utf8");

test("landing anchors realign after hydration and late font layout", () => {
  assert.match(component, /^"use client";/);
  assert.match(component, /new Set\(\[[\s\S]*?"how"[\s\S]*?"pricing"[\s\S]*?"final-cta"[\s\S]*?\]\)/);
  assert.match(component, /requestAnimationFrame\([\s\S]*?requestAnimationFrame\(run\)/);
  assert.match(component, /setTimeout\(run, 320\)/);
  assert.match(component, /document\.fonts\?\.ready\.then\(run\)/);
  assert.match(component, /new ResizeObserver\(run\)/);
  assert.match(component, /resizeObserver\.observe\(shell\)/);
  assert.match(component, /resizeObserver\?\.disconnect\(\)/);
  assert.match(component, /setTimeout\([\s\S]*?1800\)/);
  assert.match(component, /root\.style\.scrollBehavior = "auto";[\s\S]*?scrollIntoView\(\{ behavior: "auto", block: "start", inline: "nearest" \}\);[\s\S]*?root\.style\.scrollBehavior = previousScrollBehavior;/);
  assert.match(component, /addEventListener\("hashchange", alignToHash\)/);
  assert.match(component, /removeEventListener\("hashchange", alignToHash\)/);
});

test("landing mounts the anchor synchronizer once at the page shell", () => {
  assert.match(landing, /import \{ LandingAnchorSync \} from "\.\/components\/LandingAnchorSync";/);
  assert.equal((landing.match(/<LandingAnchorSync \/>/g) || []).length, 1);
});

test("landing emits an early anchor bootstrap after the target sections", () => {
  assert.match(bootstrap, /new Set\(\["how", "studio", "templates", "features", "pricing", "faq", "final-cta"\]\)/);
  assert.match(bootstrap, /requestAnimationFrame\(\(\) => window\.requestAnimationFrame\(align\)\)/);
  assert.match(bootstrap, /addEventListener\("load", align, \{ once: true \}\)/);
  assert.match(bootstrap, /root\.style\.scrollBehavior = "auto";[\s\S]*?scrollIntoView\(\{ behavior: "auto", block: "start", inline: "nearest" \}\);[\s\S]*?root\.style\.scrollBehavior = previousScrollBehavior;/);
  assert.match(landing, /import \{ LandingAnchorBootstrap \} from "\.\/components\/LandingAnchorBootstrap";/);
  assert.match(landing, /<Footer \/>[\s\S]*?<LandingAnchorBootstrap \/>/);
});
