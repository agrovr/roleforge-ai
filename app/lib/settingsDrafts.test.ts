import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettingsChange, persistSettingsChanges, settingsChanges } from "./settingsDrafts";

test("manual reversal removes a settings draft without an undo history", () => {
  const baseline = { displayName: "Avery", productUpdates: false };
  assert.equal(settingsChanges(baseline, { ...baseline, productUpdates: true }).length, 1);
  assert.deepEqual(settingsChanges(baseline, { ...baseline }), []);
});

test("partial settings saves retain successes and independent failures", async () => {
  const calls: string[] = [];
  const result = await persistSettingsChanges([
    { key: "displayName", value: "  Avery   Stone " },
    { key: "project:owned-project:status", value: "archived" },
    { key: "productUpdates", value: true },
  ], async ({ key }) => { calls.push(key); if (key.includes("project:")) throw new Error("Project no longer available."); });
  assert.equal(calls.length, 3);
  assert.deepEqual(result.saved, [{ key: "displayName", value: "Avery Stone" }, { key: "productUpdates", value: true }]);
  assert.equal(result.errors["project:owned-project:status"], "Project no longer available.");
});

test("invalid settings values never reach persistence", async () => {
  let writes = 0;
  const result = await persistSettingsChanges([
    { key: "email", value: "changed@example.test" },
    { key: "productUpdates", value: "true" },
    { key: "template", value: "unsupported" },
    { key: "project:p:title", value: "   " },
    { key: "project:p:status", value: "unknown" },
    { key: "displayName", value: "x".repeat(81) },
  ], async () => { writes++; });
  assert.equal(writes, 0);
  assert.equal(Object.keys(result.errors).length, 6);
});

test("saving one field advances only its baseline and preserves other drafts", async () => {
  const baseline = { displayName: "Avery", template: "classic" };
  const draft = { displayName: "Avery Stone", template: "modern" };
  const result = await persistSettingsChanges(settingsChanges(baseline, draft).filter(({ key }) => key === "displayName"), async () => {});
  const saved = Object.fromEntries(result.saved.map(({ key, value }) => [key, value]));
  assert.deepEqual(settingsChanges({ ...baseline, ...saved }, draft), [{ key: "template", value: "modern" }]);
});

test("project titles normalize whitespace and supported stage values survive", () => {
  assert.deepEqual(normalizeSettingsChange({ key: "project:abc:title", value: "  Product  engineer " }), { key: "project:abc:title", value: "Product engineer" });
  assert.deepEqual(normalizeSettingsChange({ key: "project:abc:status", value: "exported" }), { key: "project:abc:status", value: "exported" });
});
