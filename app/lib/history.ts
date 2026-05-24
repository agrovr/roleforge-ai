import { exportFormatAllowed, type ExportEntitlement, type ExportFormat } from "./exportFormats";

export type HistoryDownloads = Partial<Record<ExportFormat, string>>;

export type HistorySnapshot = {
  result?: {
    tailored_text?: string;
  } | null;
  downloadUrl?: string;
  downloadFormat?: ExportFormat;
  downloads?: HistoryDownloads;
};

export type HistoryItem<TSnapshot extends HistorySnapshot = HistorySnapshot> = {
  id: string;
  accountRunId?: string;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
  filename: string;
  mode: "conservative" | "balanced" | "aggressive";
  score: number;
  downloadUrl: string;
  downloadFormat?: ExportFormat;
  downloads?: HistoryDownloads;
  roleHint: string;
  saved?: boolean;
  source?: "local" | "account";
  snapshot?: TSnapshot;
};

export type HistoryGroup<TSnapshot extends HistorySnapshot = HistorySnapshot> = {
  key: string;
  title: string;
  target: string;
  latest: HistoryItem<TSnapshot>;
  accountItem?: HistoryItem<TSnapshot>;
  items: HistoryItem<TSnapshot>[];
  accountCount: number;
  localCount: number;
  restorableCount: number;
  downloadableCount: number;
  bestScore: number;
};

export type HistoryAvailabilityStatus = {
  label: string;
  detail: string;
  tone: "restore" | "download" | "legacy";
};

export type HistoryRunActionCopy = {
  downloadFallbackLabel: string;
  downloadFallbackTitle: string;
  exportHeading: string;
  blockedExportTitle: string;
};

export const EXPORT_FORMAT_ORDER: ExportFormat[] = ["pdf", "docx", "txt"];

export function hasRestorableSnapshot(item: HistoryItem) {
  return Boolean(item.snapshot?.result?.tailored_text?.trim());
}

export function validHistoryDownloadUrl(url?: string | null) {
  return Boolean(url && url !== "#");
}

export function historyDownloads(item: HistoryItem): HistoryDownloads {
  const downloads: HistoryDownloads = {};
  const addReadyDownloads = (nextDownloads?: HistoryDownloads) => {
    EXPORT_FORMAT_ORDER.forEach((format) => {
      const url = nextDownloads?.[format];
      if (validHistoryDownloadUrl(url)) downloads[format] = url;
    });
  };

  addReadyDownloads(item.snapshot?.downloads);
  addReadyDownloads(item.downloads);

  const latestFormat = item.downloadFormat ?? item.snapshot?.downloadFormat ?? "pdf";
  const latestUrl = item.downloadUrl || item.snapshot?.downloadUrl;

  if (validHistoryDownloadUrl(latestUrl)) {
    downloads[latestFormat] = latestUrl;
  }

  return EXPORT_FORMAT_ORDER.reduce<HistoryDownloads>((readyDownloads, format) => {
    const url = downloads[format];
    if (validHistoryDownloadUrl(url)) readyDownloads[format] = url;
    return readyDownloads;
  }, {});
}

export function historyDownloadEntries(item: HistoryItem, entitlement?: ExportEntitlement | null) {
  const downloads = historyDownloads(item);
  return EXPORT_FORMAT_ORDER.flatMap((format) => {
    const url = downloads[format];
    return url && exportFormatAllowed(format, entitlement) ? [{ format, url }] : [];
  });
}

export function primaryHistoryDownload(item: HistoryItem, entitlement?: ExportEntitlement | null) {
  const downloads = historyDownloadEntries(item, entitlement);
  const latestFormat = item.downloadFormat ?? item.snapshot?.downloadFormat ?? "pdf";
  return downloads.find((download) => download.format === latestFormat) ?? downloads[0] ?? null;
}

export function restoredHistoryDownloadSelection(item: HistoryItem, entitlement?: ExportEntitlement | null) {
  const download = primaryHistoryDownload(item, entitlement);
  if (download) return { format: download.format, url: download.url };

  const savedFormat = item.snapshot?.downloadFormat ?? item.downloadFormat ?? "pdf";
  const fallbackFormat = exportFormatAllowed(savedFormat, entitlement) ? savedFormat : "pdf";
  return { format: fallbackFormat, url: null };
}

export function isAccountHistoryItem(item: HistoryItem, syncedIds: string[] = []) {
  return Boolean(item.saved || item.source === "account" || syncedIds.includes(item.id) || (item.accountRunId && syncedIds.includes(item.accountRunId)));
}

export function historyStatusLabel(item: HistoryItem, syncedIds: string[] = []) {
  return isAccountHistoryItem(item, syncedIds) ? "Saved to account" : "This browser";
}

export function historyProjectTitle(item: HistoryItem, syncedIds: string[] = []) {
  if (isAccountHistoryItem(item, syncedIds)) {
    return item.projectTitle || item.roleHint || item.filename;
  }
  return item.filename;
}

export function historyProjectDetail(item: HistoryItem, syncedIds: string[] = []) {
  if (isAccountHistoryItem(item, syncedIds)) {
    return item.filename === historyProjectTitle(item, syncedIds) ? item.roleHint : item.filename;
  }
  return item.roleHint;
}

export function historySortValue(item: HistoryItem) {
  const value = new Date(item.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function historyGroupKey(item: HistoryItem, syncedIds: string[] = []) {
  if (isAccountHistoryItem(item, syncedIds) && item.projectId) return `account:${item.projectId}`;
  const filename = item.filename.replace(/\s+/g, " ").trim().toLowerCase();
  const target = item.roleHint.replace(/\s+/g, " ").trim().toLowerCase();
  return `local:${filename}:${target}`;
}

export function historyStorageLabel(group: HistoryGroup) {
  if (group.accountCount && group.localCount) return "Account + browser";
  if (group.accountCount) return "Account";
  return "This browser";
}

function historyGroupAvailabilityCounts(group: HistoryGroup) {
  return group.items.reduce(
    (counts, item) => {
      if (hasRestorableSnapshot(item)) counts.restorable += 1;
      else if (Object.keys(historyDownloads(item)).length) counts.downloadOnly += 1;
      else counts.needsReExport += 1;
      return counts;
    },
    { restorable: 0, downloadOnly: 0, needsReExport: 0 },
  );
}

export function historyGroupSummary(group: HistoryGroup) {
  const runLabel = `${group.items.length} run${group.items.length === 1 ? "" : "s"}`;
  const counts = historyGroupAvailabilityCounts(group);
  const restoreParts = [
    counts.restorable ? `${counts.restorable} restore-ready` : "",
    counts.downloadOnly ? `${counts.downloadOnly} download-ready` : "",
    counts.needsReExport ? `${counts.needsReExport} needs re-export` : "",
  ].filter(Boolean);
  const restoreLabel = restoreParts.join(" · ");
  return `${runLabel} · best ${group.bestScore}/100 · ${restoreLabel}`;
}

export function historyRunStatus(item: HistoryItem, entitlement?: ExportEntitlement | null): HistoryAvailabilityStatus {
  const restorable = hasRestorableSnapshot(item);
  const downloadCount = historyDownloadEntries(item, entitlement).length;
  const downloadLabel = `${downloadCount} download${downloadCount === 1 ? "" : "s"} ready`;

  if (restorable && downloadCount) {
    return {
      label: "Restore + download",
      detail: `Opens in studio with ${downloadLabel}`,
      tone: "restore",
    };
  }

  if (restorable) {
    return {
      label: "Restore ready",
      detail: "Opens in studio; export again for a file",
      tone: "restore",
    };
  }

  if (downloadCount) {
    return {
      label: "Download only",
      detail: `Older saved run with ${downloadLabel}`,
      tone: "download",
    };
  }

  return {
    label: "Needs re-export",
    detail: "Run Tailor again to create a fresh export",
    tone: "legacy",
  };
}

export function historyGroupStatus(group: HistoryGroup): HistoryAvailabilityStatus {
  const counts = historyGroupAvailabilityCounts(group);
  const parts = [
    counts.restorable ? `${counts.restorable} restore-ready` : "",
    counts.downloadOnly ? `${counts.downloadOnly} download-ready` : "",
    counts.needsReExport ? `${counts.needsReExport} needs re-export` : "",
  ].filter(Boolean);
  const detail = parts.join(" · ");

  if (counts.restorable && counts.downloadOnly) {
    return { label: "Restore + download", detail, tone: "restore" };
  }

  if (counts.restorable) {
    return { label: "Restore ready", detail, tone: "restore" };
  }

  if (counts.downloadOnly) {
    return { label: "Download ready", detail, tone: "download" };
  }

  return { label: "Needs re-export", detail, tone: "legacy" };
}

export function historyRunActionCopy(
  item: HistoryItem,
  formatLabel: string,
  entitlement?: ExportEntitlement | null,
): HistoryRunActionCopy {
  const restorable = hasRestorableSnapshot(item);
  const hasAllowedDownload = historyDownloadEntries(item, entitlement).length > 0;

  if (restorable) {
    return {
      downloadFallbackLabel: `Export ${formatLabel} first`,
      downloadFallbackTitle: `Create a fresh ${formatLabel} from the saved tailored resume.`,
      exportHeading: "Create a fresh file from the saved tailored resume",
      blockedExportTitle: "",
    };
  }

  if (hasAllowedDownload) {
    return {
      downloadFallbackLabel: `Download ${formatLabel}`,
      downloadFallbackTitle: `Download the saved ${formatLabel} export.`,
      exportHeading: "Only the saved download link is available",
      blockedExportTitle: "This older saved run cannot be re-exported because the tailored draft was not saved.",
    };
  }

  return {
    downloadFallbackLabel: "Run Tailor again",
    downloadFallbackTitle: "Run Tailor again to create a fresh export.",
    exportHeading: "Run Tailor again to create a fresh export",
    blockedExportTitle: "This older saved run cannot be re-exported because the tailored draft was not saved.",
  };
}

export function historyVersionLabel(total: number, index: number) {
  if (total <= 1) return "Latest run";
  const versionNumber = Math.max(total - index, 1);
  return index === 0 ? `Version ${versionNumber} · Latest` : `Version ${versionNumber}`;
}

export function syncableLocalHistoryItems<TSnapshot extends HistorySnapshot>(
  items: HistoryItem<TSnapshot>[],
  syncedIds: string[] = [],
) {
  return items.filter((item) => !isAccountHistoryItem(item, syncedIds) && hasRestorableSnapshot(item));
}

export function formatHistoryTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent run";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function groupHistoryItems<TSnapshot extends HistorySnapshot>(
  items: HistoryItem<TSnapshot>[],
  syncedIds: string[] = [],
): HistoryGroup<TSnapshot>[] {
  const groups = new Map<string, HistoryItem<TSnapshot>[]>();

  items.forEach((item) => {
    const key = historyGroupKey(item, syncedIds);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  });

  return [...groups.entries()]
    .map(([key, groupItems]) => {
      const sorted = [...groupItems].sort((a, b) => historySortValue(b) - historySortValue(a));
      const latest = sorted[0];
      const accountItems = sorted.filter((item) => isAccountHistoryItem(item, syncedIds));
      const accountItem = accountItems[0];
      const titleSource = accountItem ?? latest;
      const targetSource = latest.roleHint ? latest : titleSource;

      return {
        key,
        title: historyProjectTitle(titleSource, syncedIds),
        target: historyProjectDetail(targetSource, syncedIds),
        latest,
        accountItem,
        items: sorted,
        accountCount: accountItems.length,
        localCount: sorted.length - accountItems.length,
        restorableCount: sorted.filter(hasRestorableSnapshot).length,
        downloadableCount: sorted.filter((item) => Object.keys(historyDownloads(item)).length > 0).length,
        bestScore: Math.max(...sorted.map((item) => item.score || 0)),
      };
    })
    .sort((a, b) => historySortValue(b.latest) - historySortValue(a.latest))
    .slice(0, 12);
}

export function mergeHistory<TSnapshot extends HistorySnapshot>(
  localItems: HistoryItem<TSnapshot>[],
  savedItems: HistoryItem<TSnapshot>[],
) {
  const merged = new Map<string, HistoryItem<TSnapshot>>();

  [...savedItems, ...localItems].forEach((item) => {
    const existing = merged.get(item.id);
    merged.set(
      item.id,
      existing
        ? {
            ...item,
            accountRunId: existing.accountRunId ?? item.accountRunId,
            projectId: existing.projectId ?? item.projectId,
            projectTitle: existing.projectTitle ?? item.projectTitle,
            saved: Boolean(existing.saved || item.saved),
            source: existing.source === "account" || item.source === "account" ? "account" : "local",
            downloadUrl: validHistoryDownloadUrl(existing.downloadUrl) ? existing.downloadUrl : item.downloadUrl,
            downloadFormat: existing.downloadFormat ?? item.downloadFormat,
            snapshot: existing.snapshot ?? item.snapshot,
            downloads: { ...historyDownloads(item), ...historyDownloads(existing) },
          }
        : item,
    );
  });

  return [...merged.values()]
    .sort((a, b) => historySortValue(b) - historySortValue(a))
    .slice(0, 12);
}
