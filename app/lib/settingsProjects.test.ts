import assert from "node:assert/strict";
import test from "node:test";

import type { ExportEntitlement } from "./exportFormats";
import { savedRunCanRestore, savedRunTemplateName, settingsProjectSummaries } from "./settingsProjects";
import type { SavedHistoryItem } from "./supabase/savedProjects";

const freeEntitlement: ExportEntitlement = {
  plan: "free",
  exportFormats: {
    pdf: true,
    docx: false,
    txt: false,
  },
};

function savedRun(overrides: Partial<SavedHistoryItem> = {}): SavedHistoryItem {
  return {
    id: "local-1",
    accountRunId: "run-1",
    projectId: "project-1",
    projectTitle: "Senior PM application",
    createdAt: "2026-05-15T20:00:00.000Z",
    filename: "resume.pdf",
    mode: "balanced",
    score: 72,
    downloadUrl: "/api/workflow/download/resume.pdf",
    downloadFormat: "pdf",
    roleHint: "Senior product manager",
    saved: true,
    source: "account",
    ...overrides,
  };
}

test("groups settings saved projects by project with a restore link", () => {
  const summaries = settingsProjectSummaries([
    savedRun({
      id: "older",
      accountRunId: "run-older",
      createdAt: "2026-05-14T20:00:00.000Z",
      score: 64,
      snapshot: { result: { tailored_text: "Older tailored draft" }, templateSlug: "engineer" },
    }),
    savedRun({
      id: "latest",
      accountRunId: "run-latest",
      createdAt: "2026-05-15T20:00:00.000Z",
      score: 86,
      downloadUrl: "/api/workflow/download/latest.pdf",
      downloads: {
        pdf: "/api/workflow/download/latest.pdf",
        docx: "/api/workflow/download/latest.docx",
      },
      snapshot: {
        result: {
          tailored_text: "Latest tailored draft",
          cover_letter: "Dear team, focused letter.",
          interview_prep: [{ question: "Why this role?" }],
        },
        templateSlug: "engineer",
      },
    }),
  ], freeEntitlement);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].title, "Senior PM application");
  assert.match(summaries[0].detail, /2 versions/);
  assert.match(summaries[0].detail, /best 86\/100/);
  assert.match(summaries[0].detail, /cover letter 4 words/);
  assert.match(summaries[0].detail, /1 interview question/);
  assert.match(summaries[0].detail, /Engineer/);
  assert.equal(summaries[0].href, "/app?historyRun=run-latest&historyAction=restore#history");
  assert.equal(summaries[0].projectId, "project-1");
  assert.deepEqual(summaries[0].downloads, [{ format: "pdf", label: "PDF", url: "/api/workflow/download/latest.pdf" }]);
  assert.equal(summaries[0].actionLabel, "Restore");
  assert.equal(summaries[0].stageStatus, "exported");
  assert.equal(summaries[0].stageLabel, "Ready");
});

test("settings saved project downloads respect premium export entitlement", () => {
  const summaries = settingsProjectSummaries([
    savedRun({
      downloads: {
        pdf: "/api/workflow/download/latest.pdf",
        docx: "/api/workflow/download/latest.docx",
        txt: "/api/workflow/download/latest.txt",
      },
    }),
  ], {
    plan: "premium",
    exportFormats: {
      pdf: true,
      docx: true,
      txt: true,
    },
  });

  assert.deepEqual(
    summaries[0].downloads.map((download) => download.label),
    ["PDF", "DOCX", "TXT"],
  );
});

test("uses project status when a settings project cannot be restored", () => {
  const summaries = settingsProjectSummaries([
    savedRun({
      accountRunId: "download-run",
      snapshot: undefined,
    }),
  ], freeEntitlement);

  assert.equal(summaries[0].href, "/app?historyRun=download-run#history");
  assert.equal(summaries[0].actionLabel, "Download ready");
  assert.match(summaries[0].actionDetail, /download-ready/);
});

test("reads settings restore and template metadata from saved run snapshots", () => {
  assert.equal(savedRunCanRestore({ snapshot: { result: { tailored_text: "Draft" } } }), true);
  assert.equal(savedRunCanRestore({ snapshot: { result: { tailored_text: "   " } } }), false);
  assert.equal(savedRunTemplateName({ snapshot: { templateName: "Custom direction" } }), "Custom direction");
  assert.equal(savedRunTemplateName({ snapshot: { templateSlug: "compact" } }), "Compact");
});
