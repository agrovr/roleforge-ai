import assert from "node:assert/strict";
import test from "node:test";

import { savedRunHistoryHref } from "./savedRunLinks";

test("builds a history selection link for saved runs", () => {
  assert.equal(savedRunHistoryHref({ id: "local-run-1" }), "/app?historyRun=local-run-1#history");
});

test("uses the account run id when available", () => {
  assert.equal(
    savedRunHistoryHref({ id: "browser-run-1", accountRunId: "account-run-1" }),
    "/app?historyRun=account-run-1#history",
  );
});

test("adds restore intent for restorable settings cards", () => {
  assert.equal(
    savedRunHistoryHref({ id: "browser run", accountRunId: "account/run" }, { restore: true }),
    "/app?historyRun=account%2Frun&historyAction=restore#history",
  );
});
