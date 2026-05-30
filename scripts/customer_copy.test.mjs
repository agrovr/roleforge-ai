import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const customerFacingExtensions = new Set([".tsx"]);
const bannedCopyPatterns = [
  /\bBackend missing\b/i,
  /\bBackend URL missing\b/i,
  /\bResume pending\b/i,
  /\bSupabase configuration\b/i,
  /\bcoming soon\b/i,
  /\bnot live yet\b/i,
  /\bwait on Stripe\b/i,
];

function extensionFor(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index) : "";
}

function walkFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...walkFiles(path));
    } else if (customerFacingExtensions.has(extensionFor(path))) {
      files.push(path);
    }
  }
  return files;
}

test("customer-facing pages avoid setup-shaped or stale product copy", () => {
  const offenders = [];

  for (const file of walkFiles("app")) {
    const source = readFileSync(file, "utf8");
    for (const pattern of bannedCopyPatterns) {
      if (pattern.test(source)) {
        offenders.push(`${file}: ${pattern}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});
