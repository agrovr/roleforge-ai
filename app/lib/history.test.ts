import assert from "node:assert/strict";
import test from "node:test";

import {
  groupHistoryItems,
  historyDownloadEntries,
  historyDownloads,
  historyGroupSummary,
  historyGroupStatus,
  historyRunActionCopy,
  historyRunStatus,
  historyStorageLabel,
  historyVersionLabel,
  mergeHistory,
  primaryHistoryDownload,
  restoredHistoryDownloadSelection,
  syncableLocalHistoryItems,
  type HistoryItem,
} from "./history";
import type { ExportEntitlement } from "./exportFormats";

const freeEntitlement: ExportEntitlement = {
  plan: "free",
  exportFormats: {
    pdf: true,
    docx: false,
    txt: false,
  },
};

const premiumEntitlement: ExportEntitlement = {
  plan: "premium",
  exportFormats: {
    pdf: true,
    docx: true,
    txt: true,
  },
};

function historyItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: "local-1",
    createdAt: "2026-05-15T20:00:00.000Z",
    filename: "resume.pdf",
    mode: "balanced",
    score: 72,
    downloadUrl: "https://downloads.example/resume.pdf",
    downloadFormat: "pdf",
    roleHint: "Product manager",
    ...overrides,
  };
}

test("normalizes ready history downloads and filters placeholder URLs", () => {
  const item = historyItem({
    downloadUrl: "#",
    downloads: {
      pdf: "https://downloads.example/current.pdf",
      docx: "#",
      txt: "https://downloads.example/current.txt",
    },
    snapshot: {
      downloads: {
        pdf: "https://downloads.example/old.pdf",
        docx: "https://downloads.example/old.docx",
      },
    },
  });

  assert.deepEqual(historyDownloads(item), {
    pdf: "https://downloads.example/current.pdf",
    docx: "https://downloads.example/old.docx",
    txt: "https://downloads.example/current.txt",
  });
});

test("filters premium history downloads for free accounts", () => {
  const item = historyItem({
    downloadFormat: "docx",
    downloadUrl: "https://downloads.example/resume.docx",
    downloads: {
      pdf: "https://downloads.example/resume.pdf",
      txt: "https://downloads.example/resume.txt",
    },
  });

  assert.deepEqual(historyDownloadEntries(item, freeEntitlement), [
    { format: "pdf", url: "https://downloads.example/resume.pdf" },
  ]);
  assert.deepEqual(historyDownloadEntries(item, premiumEntitlement), [
    { format: "pdf", url: "https://downloads.example/resume.pdf" },
    { format: "docx", url: "https://downloads.example/resume.docx" },
    { format: "txt", url: "https://downloads.example/resume.txt" },
  ]);
});

test("falls back to an allowed primary download when the latest format is locked", () => {
  const item = historyItem({
    downloadFormat: "docx",
    downloadUrl: "https://downloads.example/resume.docx",
    downloads: {
      pdf: "https://downloads.example/resume.pdf",
    },
  });

  assert.deepEqual(primaryHistoryDownload(item, freeEntitlement), {
    format: "pdf",
    url: "https://downloads.example/resume.pdf",
  });
  assert.deepEqual(primaryHistoryDownload(item, premiumEntitlement), {
    format: "docx",
    url: "https://downloads.example/resume.docx",
  });
});

test("selects an allowed download when restoring a premium-format saved run on free access", () => {
  const item = historyItem({
    downloadFormat: "docx",
    downloadUrl: "https://downloads.example/resume.docx",
    downloads: {
      pdf: "https://downloads.example/resume.pdf",
    },
    snapshot: {
      result: { tailored_text: "Saved tailored draft" },
      downloadFormat: "docx",
      downloadUrl: "https://downloads.example/resume.docx",
      downloads: {
        pdf: "https://downloads.example/resume.pdf",
        docx: "https://downloads.example/resume.docx",
      },
    },
  });

  assert.deepEqual(restoredHistoryDownloadSelection(item, freeEntitlement), {
    format: "pdf",
    url: "https://downloads.example/resume.pdf",
  });
  assert.deepEqual(restoredHistoryDownloadSelection(item, premiumEntitlement), {
    format: "docx",
    url: "https://downloads.example/resume.docx",
  });
});

test("falls back to PDF when restoring a locked premium run without an allowed download", () => {
  const item = historyItem({
    downloadFormat: "txt",
    downloadUrl: "https://downloads.example/resume.txt",
    snapshot: {
      result: { tailored_text: "Saved tailored draft" },
      downloadFormat: "txt",
      downloadUrl: "https://downloads.example/resume.txt",
    },
  });

  assert.deepEqual(restoredHistoryDownloadSelection(item, freeEntitlement), {
    format: "pdf",
    url: null,
  });
});

test("groups local and account history into clear project summaries", () => {
  const groups = groupHistoryItems([
    historyItem({
      id: "older-local",
      createdAt: "2026-05-15T18:00:00.000Z",
      score: 65,
      snapshot: { result: { tailored_text: "Older tailored draft" } },
    }),
    historyItem({
      id: "latest-local",
      createdAt: "2026-05-15T21:00:00.000Z",
      score: 82,
      snapshot: { result: { tailored_text: "Latest tailored draft" } },
    }),
    historyItem({
      id: "account-1",
      projectId: "project-1",
      projectTitle: "Senior PM application",
      source: "account",
      saved: true,
      filename: "senior-pm.pdf",
      roleHint: "Senior product manager",
      createdAt: "2026-05-16T12:00:00.000Z",
      score: 90,
      snapshot: { result: { tailored_text: "Saved tailored draft" } },
    }),
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, "account:project-1");
  assert.equal(groups[0].title, "Senior PM application");
  assert.equal(historyStorageLabel(groups[0]), "Account");
  assert.equal(groups[1].items.length, 2);
  assert.equal(groups[1].bestScore, 82);
  assert.equal(historyGroupSummary(groups[1]), "2 runs · best 82/100 · 2 restore-ready");
});

test("labels saved run availability for restore, download, and re-export states", () => {
  assert.deepEqual(historyRunStatus(historyItem({
    snapshot: { result: { tailored_text: "Tailored draft" } },
  })), {
    label: "Restore + download",
    detail: "Opens in studio with 1 download ready",
    tone: "restore",
  });

  assert.deepEqual(historyRunStatus(historyItem({
    downloadUrl: "#",
    downloads: {},
    snapshot: { result: { tailored_text: "Tailored draft" } },
  })), {
    label: "Restore ready",
    detail: "Opens in studio; export again for a file",
    tone: "restore",
  });

  assert.deepEqual(historyRunStatus(historyItem({
    snapshot: undefined,
  })), {
    label: "Download only",
    detail: "Older saved run with 1 download ready",
    tone: "download",
  });

  assert.deepEqual(historyRunStatus(historyItem({
    downloadUrl: "#",
    downloads: {},
    snapshot: undefined,
  })), {
    label: "Needs re-export",
    detail: "Run Tailor again to create a fresh export",
    tone: "legacy",
  });
});

test("summarizes saved project availability across grouped versions", () => {
  const groups = groupHistoryItems([
    historyItem({
      id: "download-only",
      createdAt: "2026-05-15T20:00:00.000Z",
      snapshot: undefined,
    }),
    historyItem({
      id: "needs-export",
      createdAt: "2026-05-15T19:00:00.000Z",
      downloadUrl: "#",
      downloads: {},
      snapshot: undefined,
    }),
  ]);

  assert.equal(historyGroupSummary(groups[0]), "2 runs · best 72/100 · 1 download-ready · 1 needs re-export");
  assert.deepEqual(historyGroupStatus(groups[0]), {
    label: "Download ready",
    detail: "1 download-ready · 1 needs re-export",
    tone: "download",
  });
});

test("guides saved-run download and export actions by availability", () => {
  assert.deepEqual(historyRunActionCopy(historyItem({
    downloadUrl: "#",
    downloads: {},
    snapshot: { result: { tailored_text: "Tailored draft" } },
  }), "PDF"), {
    downloadFallbackLabel: "Export PDF first",
    downloadFallbackTitle: "Create a fresh PDF from the saved tailored resume.",
    exportHeading: "Create a fresh file from the saved tailored resume",
    blockedExportTitle: "",
  });

  assert.deepEqual(historyRunActionCopy(historyItem({
    snapshot: undefined,
  }), "PDF"), {
    downloadFallbackLabel: "Download PDF",
    downloadFallbackTitle: "Download the saved PDF export.",
    exportHeading: "Only the saved download link is available",
    blockedExportTitle: "This older saved run cannot be re-exported because the tailored draft was not saved.",
  });

  assert.deepEqual(historyRunActionCopy(historyItem({
    downloadUrl: "#",
    downloads: {},
    snapshot: undefined,
  }), "PDF"), {
    downloadFallbackLabel: "Run Tailor again",
    downloadFallbackTitle: "Run Tailor again to create a fresh export.",
    exportHeading: "Run Tailor again to create a fresh export",
    blockedExportTitle: "This older saved run cannot be re-exported because the tailored draft was not saved.",
  });
});

test("merges account metadata into matching local history", () => {
  const local = historyItem({
    id: "shared-id",
    downloadUrl: "https://downloads.example/local.pdf",
    downloads: {
      txt: "https://downloads.example/local.txt",
    },
    snapshot: { result: { tailored_text: "Local tailored draft" } },
  });
  const saved = historyItem({
    id: "shared-id",
    accountRunId: "run-1",
    projectId: "project-1",
    projectTitle: "Account project",
    source: "account",
    saved: true,
    downloadFormat: "docx",
    downloadUrl: "https://downloads.example/account.docx",
    downloads: {
      pdf: "https://downloads.example/account.pdf",
    },
  });

  const [merged] = mergeHistory([local], [saved]);

  assert.equal(merged.source, "account");
  assert.equal(merged.accountRunId, "run-1");
  assert.equal(merged.projectTitle, "Account project");
  assert.deepEqual(merged.downloads, {
    pdf: "https://downloads.example/account.pdf",
    txt: "https://downloads.example/local.txt",
    docx: "https://downloads.example/account.docx",
  });
  assert.equal(merged.snapshot?.result?.tailored_text, "Local tailored draft");
});

test("selects only restorable local runs for account backfill", () => {
  const syncable = historyItem({
    id: "syncable-local",
    snapshot: { result: { tailored_text: "Local tailored draft" } },
  });
  const downloadOnly = historyItem({
    id: "download-only",
    snapshot: undefined,
  });
  const alreadySaved = historyItem({
    id: "already-saved",
    saved: true,
    source: "account",
    snapshot: { result: { tailored_text: "Account tailored draft" } },
  });
  const syncedById = historyItem({
    id: "synced-by-id",
    snapshot: { result: { tailored_text: "Already synced tailored draft" } },
  });

  assert.deepEqual(syncableLocalHistoryItems([syncable, downloadOnly, alreadySaved, syncedById], ["synced-by-id"]), [syncable]);
});

test("labels history versions from newest to oldest", () => {
  assert.equal(historyVersionLabel(1, 0), "Latest run");
  assert.equal(historyVersionLabel(4, 0), "Version 4 · Latest");
  assert.equal(historyVersionLabel(4, 2), "Version 2");
});
