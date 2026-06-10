import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("landing nav uses a compact floating dock instead of a full-width box", () => {
  assert.match(globals, /\.nav\s*\{(?=[^}]*padding-block:\s*10px)(?=[^}]*border-bottom:\s*0)(?=[^}]*backdrop-filter:\s*saturate\(130%\)\s+blur\(8px\))[^}]*\}/s);
  assert.match(globals, /\.nav-inner\s*\{(?=[^}]*width:\s*min\(1280px,\s*calc\(100%\s*-\s*clamp\(28px,\s*5vw,\s*96px\)\)\))(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*24px)(?=[^}]*backdrop-filter:\s*blur\(18px\)\s+saturate\(1\.08\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.nav-inner::before\s*\{(?=[^}]*inset-inline:\s*clamp\(154px,\s*22vw,\s*320px\)\s+clamp\(162px,\s*20vw,\s*360px\))(?=[^}]*height:\s*1px)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(globals, /\.nav::after\s*\{(?=[^}]*inset-inline:\s*max\(18px,\s*calc\(\(100%\s*-\s*1280px\)\s*\/\s*2\s*\+\s*18px\)\))(?=[^}]*opacity:\s*0\.36)[^}]*\}/s);
});

test("landing nav dock has dark-mode and responsive shape polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.nav-inner\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.nav-inner::before\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*opacity:\s*0\.78)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*min\(760px,\s*calc\(100%\s*-\s*24px\)\))(?=[^}]*border-radius:\s*22px)[^}]*\}[\s\S]*?\.nav-inner::before\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*min\(100%\s*-\s*18px,\s*620px\))(?=[^}]*border-radius:\s*20px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*355px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*calc\(100%\s*-\s*12px\))(?=[^}]*border-radius:\s*18px)[^}]*\}/s);
});
