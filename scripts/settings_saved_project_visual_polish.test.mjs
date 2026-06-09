import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync("app/globals.css", "utf8");

test("settings saved project workspace has a clearer visual hierarchy", () => {
  assert.match(stylesheet, /\/\*\s*Saved-project workspace finish: clearer hierarchy for dense project controls\.\s*\*\//);
  assert.match(stylesheet, /\.settings-project-list\s*\{(?=[^}]*gap:\s*clamp\(10px,\s*1\.5vw,\s*14px\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-pipeline\s*\{(?=[^}]*gap:\s*10px)(?=[^}]*margin-bottom:\s*4px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-pipeline-item\s*\{(?=[^}]*border-radius:\s*14px)(?=[^}]*background-size:\s*28px 28px,\s*auto)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-item\s*\{(?=[^}]*border-color:\s*color-mix\(in srgb,\s*var\(--brand\)\s*16%,\s*var\(--line\)\))(?=[^}]*border-radius:\s*16px)(?=[^}]*background-size:\s*30px 30px,\s*auto)(?=[^}]*padding:\s*clamp\(14px,\s*1\.6vw,\s*18px\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-item:hover,\s*\.settings-project-item:focus-within\s*\{(?=[^}]*border-color:\s*color-mix\(in srgb,\s*var\(--brand-dark\)\s*36%,\s*var\(--line\)\))(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("settings saved project controls read as a compact workspace instead of loose pills", () => {
  assert.match(stylesheet, /\.settings-project-title-block\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*6px)(?=[^}]*padding-inline-start:\s*4px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-title-block\s+strong\s*\{(?=[^}]*font-size:\s*clamp\(1\.02rem,\s*2vw,\s*1\.16rem\))(?=[^}]*line-height:\s*1\.13)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-operations\s+a,\s*\.settings-project-operations\s+span\s*\{(?=[^}]*justify-content:\s*flex-start)(?=[^}]*min-height:\s*40px)(?=[^}]*border-radius:\s*12px)(?=[^}]*text-align:\s*left)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-controls\s*\{(?=[^}]*gap:\s*12px)(?=[^}]*border-radius:\s*14px)(?=[^}]*background-size:\s*26px 26px,\s*auto)(?=[^}]*box-shadow:\s*inset 0 1px 0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s*\{(?=[^}]*gap:\s*6px)(?=[^}]*padding:\s*4px)(?=[^}]*border-radius:\s*16px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s+button\s*\{(?=[^}]*border-radius:\s*12px)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-stage-controls\s+button\.active,\s*\.settings-project-stage-controls\s+button:disabled\s*\{(?=[^}]*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--brand-soft\)\s*58%,\s*var\(--surface\)\))(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("settings saved project kit and destructive controls stay polished in dark mode", () => {
  assert.match(stylesheet, /\.settings-project-rename\s+label\s*>\s*span,\s*\.settings-project-delete\s+label\s*>\s*span\s*\{(?=[^}]*letter-spacing:\s*0\.03em)(?=[^}]*text-transform:\s*uppercase)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-rename-row\s+input,\s*\.settings-project-delete-row\s+input,\s*\.settings-project-rename-row\s+button,\s*\.settings-project-delete-row\s+button,\s*\.settings-project-downloads\s+\.btn\s*\{(?=[^}]*border-radius:\s*12px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-kit\s*\{(?=[^}]*gap:\s*10px)(?=[^}]*border-radius:\s*14px)(?=[^}]*box-shadow:\s*inset 0 1px 0)(?=[^}]*padding:\s*12px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-kit-item\s*\{(?=[^}]*justify-content:\s*flex-start)(?=[^}]*border-radius:\s*12px)(?=[^}]*text-align:\s*left)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-project-delete\s+summary\s*\{(?=[^}]*padding-inline:\s*10px)(?=[^}]*border:\s*1px solid color-mix\(in srgb,\s*var\(--danger\)\s*20%,\s*transparent\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-project-pipeline-item,\s*html\[data-theme="dark"\]\s+\.settings-project-item\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*linear-gradient\(90deg,\s*rgba\(255,\s*247,\s*233,\s*0\.04\)\s*1px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-project-item\s+small\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.22\))(?=[^}]*color:\s*#f5d69a)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-project-kit-item\.ready\s*\{(?=[^}]*color:\s*#a6efb8)[^}]*\}/s);
});
