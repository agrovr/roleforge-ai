import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("landing nav uses a compact floating dock instead of a full-width box", () => {
  assert.match(globals, /\.nav\s*\{(?=[^}]*padding-block:\s*12px)(?=[^}]*border-bottom:\s*0)(?=[^}]*backdrop-filter:\s*saturate\(130%\)\s+blur\(8px\))[^}]*\}/s);
  assert.match(globals, /\.nav-inner\s*\{(?=[^}]*width:\s*min\(1120px,\s*calc\(100%\s*-\s*clamp\(32px,\s*8vw,\s*120px\)\)\))(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*999px)(?=[^}]*backdrop-filter:\s*blur\(18px\)\s+saturate\(1\.08\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.nav-inner::before\s*\{(?=[^}]*inset-inline:\s*clamp\(152px,\s*20vw,\s*292px\)\s+clamp\(176px,\s*22vw,\s*330px\))(?=[^}]*height:\s*1px)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(globals, /\.nav::after\s*\{(?=[^}]*inset-inline:\s*max\(24px,\s*calc\(\(100%\s*-\s*1120px\)\s*\/\s*2\s*\+\s*28px\)\))(?=[^}]*opacity:\s*0\.36)[^}]*\}/s);
  assert.match(globals, /\.hero\s*\{(?=[^}]*margin:\s*clamp\(18px,\s*2\.2vw,\s*38px\)\s+auto\s+0)[^}]*\}/s);
});

test("landing nav dock has dark-mode and responsive shape polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.nav-inner\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.nav-inner::before\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*opacity:\s*0\.78)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*min\(760px,\s*calc\(100%\s*-\s*24px\)\))(?=[^}]*border-radius:\s*22px)[^}]*\}[\s\S]*?\.nav-inner::before\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*min\(100%\s*-\s*18px,\s*620px\))(?=[^}]*border-radius:\s*20px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*355px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*calc\(100%\s*-\s*12px\))(?=[^}]*border-radius:\s*18px)[^}]*\}/s);
});
