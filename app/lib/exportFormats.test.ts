import assert from "node:assert/strict";
import test from "node:test";

import { customerExportFormats, exportDownloadReadyForSelection, exportFormatAllowed, type ExportEntitlement } from "./exportFormats";

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

test("keeps free accounts on PDF-only exports", () => {
  const formats = customerExportFormats(undefined, freeEntitlement);

  assert.equal(formats.find((format) => format.format === "pdf")?.enabled, true);
  assert.equal(formats.find((format) => format.format === "docx")?.enabled, false);
  assert.equal(formats.find((format) => format.format === "txt")?.enabled, false);
});

test("enables premium export formats from entitlement", () => {
  const formats = customerExportFormats(undefined, premiumEntitlement);

  assert.equal(formats.find((format) => format.format === "pdf")?.enabled, true);
  assert.equal(formats.find((format) => format.format === "pdf")?.reason, "Included");
  assert.equal(formats.find((format) => format.format === "docx")?.enabled, true);
  assert.equal(formats.find((format) => format.format === "txt")?.enabled, true);
});

test("uses the backend PDF capability but keeps premium formats account-gated", () => {
  const formats = customerExportFormats([
    { format: "pdf", label: "PDF", enabled: false, plan: "free", reason: "Temporarily unavailable" },
    { format: "docx", label: "DOCX", enabled: true, plan: "premium" },
    { format: "txt", label: "TXT", enabled: true, plan: "premium" },
  ], freeEntitlement);

  assert.equal(formats.find((format) => format.format === "pdf")?.enabled, false);
  assert.equal(formats.find((format) => format.format === "pdf")?.reason, "Temporarily unavailable");
  assert.equal(formats.find((format) => format.format === "docx")?.enabled, false);
  assert.equal(formats.find((format) => format.format === "txt")?.enabled, false);
});

test("checks individual download eligibility", () => {
  assert.equal(exportFormatAllowed("pdf", freeEntitlement), true);
  assert.equal(exportFormatAllowed("docx", freeEntitlement), false);
  assert.equal(exportFormatAllowed("txt", premiumEntitlement), true);
});

test("marks downloads ready only for the selected export format", () => {
  assert.equal(
    exportDownloadReadyForSelection({
      downloadFormat: "pdf",
      downloadState: "ready",
      downloadUrl: "/api/workflow/download/run.pdf",
      selectedFormat: "pdf",
      entitlement: freeEntitlement,
    }),
    true,
  );

  assert.equal(
    exportDownloadReadyForSelection({
      downloadFormat: "pdf",
      downloadState: "ready",
      downloadUrl: "/api/workflow/download/run.pdf",
      selectedFormat: "docx",
      entitlement: premiumEntitlement,
    }),
    false,
  );
});

test("keeps premium downloads gated even if a stale link exists", () => {
  assert.equal(
    exportDownloadReadyForSelection({
      downloadFormat: "docx",
      downloadState: "ready",
      downloadUrl: "/api/workflow/download/run.docx",
      selectedFormat: "docx",
      entitlement: freeEntitlement,
    }),
    false,
  );
});
