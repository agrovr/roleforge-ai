import { isApplicationStatus } from "./applicationStatus";
import { isResumeTemplateSlug } from "./resumeTemplates";

export type SettingsValue = string | boolean;
export type SettingsChange = { key: string; value: SettingsValue };
export type SettingsSaveResult = { saved: SettingsChange[]; errors: Record<string, string> };
export type SettingsField = { key: string; label: string; value: SettingsValue };

export function normalizeSettingsChange(input: unknown): SettingsChange {
  if (!input || typeof input !== "object") throw new Error("Invalid settings change.");
  const { key, value } = input as SettingsChange;
  if (key === "productUpdates" && typeof value === "boolean") return { key, value };
  if (typeof key !== "string" || typeof value !== "string") throw new Error("Invalid settings value.");
  if (key === "template" && isResumeTemplateSlug(value)) return { key, value };
  if (key === "displayName") {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean.length <= 80) return { key, value: clean };
    throw new Error("Use a display name of 80 characters or fewer.");
  }
  const project = /^project:([^:]{1,120}):(title|status)$/.exec(key);
  if (project?.[2] === "status" && isApplicationStatus(value)) return { key, value };
  if (project?.[2] === "title") {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean && clean.length <= 120) return { key, value: clean };
    throw new Error("Use a project name between 1 and 120 characters.");
  }
  throw new Error("Choose a supported setting value.");
}

// Independent writes deliberately retain successful results when another field fails.
export async function persistSettingsChanges(
  changes: SettingsChange[],
  write: (change: SettingsChange) => Promise<void>,
): Promise<SettingsSaveResult> {
  const result: SettingsSaveResult = { saved: [], errors: {} };
  for (const input of changes) {
    try {
      const change = normalizeSettingsChange(input);
      await write(change);
      result.saved.push(change);
    } catch (error) {
      result.errors[input.key] = error instanceof Error ? error.message : "Could not finish saving. Please retry.";
    }
  }
  return result;
}

export function settingsChanges(baseline: Record<string, SettingsValue>, draft: Record<string, SettingsValue>) {
  return Object.keys(baseline).filter((key) => baseline[key] !== draft[key]).map((key) => ({ key, value: draft[key] }));
}
