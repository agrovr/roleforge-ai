import type { ExportEntitlement } from "./exportFormats";
import { groupHistoryItems, historyGeneratedAssetSummary, historyGroupStatus, type HistoryItem } from "./history";
import { getResumeTemplate, isResumeTemplateSlug } from "./resumeTemplates";
import { savedRunHistoryHref } from "./savedRunLinks";
import type { SavedHistoryItem } from "./supabase/savedProjects";

export type SettingsProjectSummary = {
  key: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  actionDetail: string;
};

export function formatSettingsSavedRunDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function savedRunCanRestore(run: { snapshot?: Record<string, unknown> }) {
  const result = run.snapshot?.result;
  if (!result || typeof result !== "object") return false;
  const tailoredText = (result as { tailored_text?: unknown }).tailored_text;
  return typeof tailoredText === "string" && Boolean(tailoredText.trim());
}

export function savedRunTemplateName(run: { snapshot?: Record<string, unknown> }) {
  if (typeof run.snapshot?.templateName === "string" && run.snapshot.templateName.trim()) {
    return run.snapshot.templateName;
  }

  const templateSlug = run.snapshot?.templateSlug;
  if (typeof templateSlug === "string" && isResumeTemplateSlug(templateSlug)) {
    return getResumeTemplate(templateSlug).name;
  }

  return "";
}

export function settingsProjectSummaries(
  runs: SavedHistoryItem[],
  entitlement: ExportEntitlement,
  limit = 3,
): SettingsProjectSummary[] {
  const syncedIds = runs.flatMap((run) => [run.id, run.accountRunId].filter(Boolean) as string[]);
  return groupHistoryItems(runs as HistoryItem[], syncedIds).slice(0, limit).map((group) => {
    const restoreRun = group.items.find(savedRunCanRestore);
    const linkRun = restoreRun ?? group.latest;
    const status = historyGroupStatus(group, entitlement);
    const templateName = savedRunTemplateName(group.latest);
    const assetSummary = historyGeneratedAssetSummary(group.latest);
    const versionLabel = `${group.items.length} ${group.items.length === 1 ? "version" : "versions"}`;
    const detail = [
      group.target,
      versionLabel,
      `best ${group.bestScore}/100`,
      assetSummary,
      `latest ${formatSettingsSavedRunDate(group.latest.createdAt)}`,
      templateName,
    ].filter(Boolean).join(" · ");

    return {
      key: group.key,
      title: group.title,
      detail,
      href: savedRunHistoryHref(linkRun, { restore: Boolean(restoreRun) }),
      actionLabel: restoreRun ? "Restore" : status.label,
      actionDetail: status.detail,
    };
  });
}
