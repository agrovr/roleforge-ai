import type { SupportRequestStatus } from "./supportRequests";

export type SupportBulkTarget = { id: string; version: string };
export type SupportBulkSaved = { id: string; status: SupportRequestStatus; updatedAt: string };
export type SupportBulkResult = { saved: SupportBulkSaved[]; failed: Array<{ id: string; error: string }>; error?: string };
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validSupportBulkTargets(value: unknown): value is SupportBulkTarget[] {
  if (!Array.isArray(value) || !value.length || value.length > 40) return false;
  const ids = new Set<string>();
  return value.every((target) => {
    if (!target || typeof target.id !== "string" || !ID_PATTERN.test(target.id) || ids.has(target.id) || typeof target.version !== "string" || target.version.length > 80 || !Number.isFinite(Date.parse(target.version))) return false;
    ids.add(target.id); return true;
  });
}
export async function applySupportBulk(targets: SupportBulkTarget[], update: (target: SupportBulkTarget) => Promise<SupportBulkSaved | null>): Promise<SupportBulkResult> {
  const result: SupportBulkResult = { saved: [], failed: [] };
  for (const target of targets) {
    try {
      const saved = await update(target);
      if (saved) result.saved.push(saved);
      else result.failed.push({ id: target.id, error: "Changed in another tab or no longer available. Refresh before retrying." });
    } catch {
      result.failed.push({ id: target.id, error: "Could not confirm this update. Refresh to check its current status before retrying." });
    }
  }
  return result;
}
