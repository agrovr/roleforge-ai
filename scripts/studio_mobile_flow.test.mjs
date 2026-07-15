import assert from "node:assert/strict";
import test from "node:test";
import { allStudioStyles } from "./style_sources.mjs";

const stylesheet = allStudioStyles;

test("mobile studio keeps section navigation compact and horizontally available", () => {
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.rf-studio-rail\s*\{(?=[^}]*min-height:\s*auto)(?=[^}]*flex-direction:\s*row)(?=[^}]*overflow-x:\s*auto)(?=[^}]*scroll-snap-type:\s*inline\s+proximity)[^}]*\}/s,
  );
  assert.match(stylesheet, /\.rf-studio-rail\s+\.rail-section-title,\s*\.rf-studio-rail\s+\.rail-divider\s*\{[^}]*display:\s*none/s);
  assert.match(
    stylesheet,
    /\.rf-studio-rail\s+\.rail-item\s*\{(?=[^}]*flex:\s*0\s+0\s+auto)(?=[^}]*min-height:\s*44px)(?=[^}]*scroll-snap-align:\s*start)[^}]*\}/s,
  );
  assert.match(stylesheet, /\.rf-studio-rail\s+\.rf-rail-upgrade\s+p\s*\{[^}]*display:\s*none/s);
});

test("mobile studio export controls stack without stretching the template selector", () => {
  assert.match(
    stylesheet,
    /\.studio-hero-actions\s+\.export-format-strip,\s*\.studio-hero-actions\s+\.export-status-note,\s*\.studio-hero-actions\s+\.studio-run-next-action,\s*\.studio-hero-actions\s+\.studio-template-preference,\s*\.studio-hero-actions\s+\.export-readiness-panel\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s,
  );
  assert.match(
    stylesheet,
    /\.studio-hero-actions\s+\.studio-template-preference\s*\{(?=[^}]*align-self:\s*start)(?=[^}]*max-width:\s*none)(?=[^}]*border-radius:\s*14px)[^}]*\}/s,
  );
});
