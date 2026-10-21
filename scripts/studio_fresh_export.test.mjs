import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const studioPage = readFileSync(new URL("../app/app/page.tsx", import.meta.url), "utf8");

test("fresh exports become downloadable without a redundant HEAD request", () => {
  assert.match(
    studioPage,
    /type DownloadVerification = "fresh" \| "verify";/,
  );
  assert.match(
    studioPage,
    /if \(downloadVerification === "fresh"\) \{[\s\S]*?readyDownloadStatus\(downloadFormat\)[\s\S]*?return;\s*\}[\s\S]*?fetch\(downloadUrl, \{\s*method: "HEAD"/,
  );
  assert.match(
    studioPage,
    /async function exportResume\([\s\S]*?setDownloadVerification\("fresh"\);[\s\S]*?readyDownloadStatus\(format\)/,
  );
});

test("restored downloads still use protected link verification", () => {
  assert.match(
    studioPage,
    /const restoreHistoryItem = useCallback\([\s\S]*?setDownloadVerification\("verify"\);[\s\S]*?setDownloadUrl\(/,
  );
  assert.match(
    studioPage,
    /const normalizedDownloadUrl = normalizeWorkflowDownloadUrl\(restoredDownloadUrl\);[\s\S]*?setDownloadVerification\("verify"\);[\s\S]*?setDownloadUrl\(normalizedDownloadUrl\)/,
  );
});
