import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("app/layout.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("the root layout only preloads brand-critical font families", () => {
  assert.match(layout, /import \{ Fraunces, Inter \} from "next\/font\/google";/);
  assert.doesNotMatch(layout, /JetBrains_Mono|font-jetbrains-mono|jetBrainsMono/);
  assert.match(layout, /className=\{`\$\{fraunces\.variable\} \$\{inter\.variable\}`\}/);
});

test("utility labels use the local monospace stack without another font request", () => {
  assert.match(globals, /--font-mono:\s*ui-monospace,\s*"SFMono-Regular",\s*Menlo,\s*Monaco,\s*Consolas,\s*"Liberation Mono",\s*monospace;/);
  assert.doesNotMatch(globals, /--font-jetbrains-mono/);
});
