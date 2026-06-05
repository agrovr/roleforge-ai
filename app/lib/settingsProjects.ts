import type { ExportEntitlement } from "./exportFormats";
import { applicationStatusCopy, type ApplicationStatus } from "./applicationStatus";
import {
  groupHistoryItems,
  historyDownloadEntries,
  historyGeneratedAssetCounts,
  historyGeneratedAssetSummary,
  historyGroupStatus,
  lockedHistoryDownloadFormats,
  type HistoryItem,
} from "./history";
import { getResumeTemplate, isResumeTemplateSlug } from "./resumeTemplates";
import { savedRunHistoryHref } from "./savedRunLinks";
import type { SavedHistoryItem } from "./supabase/savedProjects";

export type SettingsProjectSummary = {
  key: string;
  title: string;
  detail: string;
  href: string;
  projectId: string;
  downloads: Array<{
    format: string;
    label: string;
    url: string;
  }>;
  actionLabel: string;
  actionDetail: string;
  stageStatus: ApplicationStatus;
  stageLabel: string;
  stageDetail: string;
  kitItems: Array<{
    label: string;
    status: "ready" | "missing" | "locked";
    detail: string;
  }>;
  kitSummary: string;
};
export type SettingsDocumentSummary = {
  key: string;
  title: string;
  detail: string;
  format: string;
  label: string;
  url: string;
  projectHref: string;
};
export type SettingsDocumentCounts = {
  ready: number;
  locked: number;
};
export type SettingsProjectStageSummary = {
  status: ApplicationStatus;
  label: string;
  count: number;
  detail: string;
  tone: "ready" | "muted";
};

const SETTINGS_PROJECT_PIPELINE_STATUSES: ApplicationStatus[] = ["tailored", "exported", "active", "archived"];

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
    const { coverLetterWords, interviewQuestions } = historyGeneratedAssetCounts(group.latest);
    const stage = applicationStatusCopy(group.accountItem?.applicationStatus ?? group.latest.applicationStatus);
    const downloadRun = group.items.find((item) => historyDownloadEntries(item, entitlement).length) ?? group.latest;
    const downloads = historyDownloadEntries(downloadRun, entitlement).map((download) => ({
      format: download.format,
      label: download.format.toUpperCase(),
      url: download.url,
    }));
    const premiumFormatsUnlocked = Boolean(entitlement.exportFormats.docx || entitlement.exportFormats.txt);
    const kitItems: SettingsProjectSummary["kitItems"] = [
      {
        label: "Tailored resume",
        status: restoreRun ? "ready" : "missing",
        detail: restoreRun ? "Ready to restore in History." : "Reopen the run or create a new tailored draft.",
      },
      {
        label: "Exports",
        status: downloads.length ? "ready" : premiumFormatsUnlocked ? "missing" : "locked",
        detail: downloads.length
          ? `${downloads.map((download) => download.label).join(", ")} ready`
          : premiumFormatsUnlocked
            ? "No export download is attached yet."
            : "PDF export is included; DOCX and TXT require Premium.",
      },
      {
        label: "Cover letter",
        status: coverLetterWords ? "ready" : "missing",
        detail: coverLetterWords ? `${coverLetterWords} words generated.` : "Generate a cover letter from this run before applying.",
      },
      {
        label: "Interview prep",
        status: interviewQuestions ? "ready" : "missing",
        detail: interviewQuestions ? `${interviewQuestions} question${interviewQuestions === 1 ? "" : "s"} ready.` : "Generate interview notes after the tailored draft is ready.",
      },
      {
        label: "Follow-up",
        status: stage.status === "active" ? "ready" : "missing",
        detail: stage.status === "active" ? "Marked for follow-up." : "Move the project to Follow-up when outreach is next.",
      },
    ];
    const readyKitCount = kitItems.filter((item) => item.status === "ready").length;
    const kitSummary = `${readyKitCount}/${kitItems.length} application kit items ready`;
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
      projectId: group.accountItem?.projectId ?? group.latest.projectId ?? "",
      downloads,
      actionLabel: restoreRun ? "Restore" : status.label,
      actionDetail: status.detail,
      stageStatus: stage.status,
      stageLabel: stage.label,
      stageDetail: stage.detail,
      kitItems,
      kitSummary,
    };
  });
}

export function settingsProjectStageSummaries(projects: SettingsProjectSummary[]): SettingsProjectStageSummary[] {
  return SETTINGS_PROJECT_PIPELINE_STATUSES.map((status) => {
    const copy = applicationStatusCopy(status);
    const count = projects.filter((project) => project.stageStatus === status).length;
    const projectWord = count === 1 ? "project" : "projects";

    return {
      status,
      label: settingsProjectStageShortLabel(status, copy.label),
      count,
      detail: count ? `${count} ${projectWord} ${settingsProjectStageVerb(status)}.` : copy.detail,
      tone: count ? "ready" : "muted",
    };
  });
}

function settingsProjectStageShortLabel(status: ApplicationStatus, fallback: string) {
  if (status === "exported") return "Ready";
  if (status === "active") return "Follow-up";
  if (status === "archived") return "Archived";
  if (status === "tailored") return "Tailored";
  return fallback;
}

function settingsProjectStageVerb(status: ApplicationStatus) {
  if (status === "exported") return "ready to use";
  if (status === "active") return "in follow-up";
  if (status === "archived") return "archived";
  if (status === "tailored") return "being prepared";
  return "saved";
}

export function settingsDocumentCounts(
  runs: SavedHistoryItem[],
  entitlement: ExportEntitlement,
): SettingsDocumentCounts {
  return runs.reduce<SettingsDocumentCounts>((counts, run) => {
    counts.ready += historyDownloadEntries(run as HistoryItem, entitlement).length;
    counts.locked += lockedHistoryDownloadFormats(run as HistoryItem, entitlement).length;
    return counts;
  }, { ready: 0, locked: 0 });
}

export function settingsDocumentSummaries(
  runs: SavedHistoryItem[],
  entitlement: ExportEntitlement,
  limit = 6,
): SettingsDocumentSummary[] {
  const seen = new Set<string>();
  const documents: SettingsDocumentSummary[] = [];

  for (const run of runs) {
    const entries = historyDownloadEntries(run as HistoryItem, entitlement);
    const templateName = savedRunTemplateName(run);
    const createdLabel = formatSettingsSavedRunDate(run.createdAt);
    const projectHref = savedRunHistoryHref(run, { restore: savedRunCanRestore(run) });
    const detail = [
      run.filename,
      createdLabel ? `created ${createdLabel}` : "",
      templateName,
    ].filter(Boolean).join(" · ");

    for (const entry of entries) {
      const key = `${entry.format}:${entry.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      documents.push({
        key,
        title: run.projectTitle || run.roleHint || "Saved export",
        detail,
        format: entry.format,
        label: entry.format.toUpperCase(),
        url: entry.url,
        projectHref,
      });
      if (documents.length >= limit) return documents;
    }
  }

  return documents;
}
