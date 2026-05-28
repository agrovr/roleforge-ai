import assert from "node:assert/strict";
import test from "node:test";

import { derivePreviewPanelState, previewStatusTone, type PreviewPanelInput } from "./previewPanel";

function previewInput(overrides: Partial<PreviewPanelInput> = {}): PreviewPanelInput {
  return {
    mode: "tailored",
    stage: "idle",
    uploadState: "idle",
    sourceText: "",
    tailoredText: "",
    selectedTemplateName: "Classic",
    selectedDownloadFormat: "pdf",
    downloadReady: false,
    restoredRunOpen: false,
    keywordTotal: 0,
    presentKeywordCount: 0,
    changeLogCount: 0,
    ...overrides,
  };
}

test("keeps the initial tailored preview honest before a run", () => {
  const state = derivePreviewPanelState(previewInput());

  assert.deepEqual(state.tabState, {
    tailored: "Waiting",
    original: "Waiting",
    diff: "Waiting",
  });
  assert.equal(state.title, "Tailored resume · waiting for run");
  assert.equal(state.statusItems[0].value, "Run Tailor to generate a draft");
});

test("marks uploaded source as original-ready without marking tailored ready", () => {
  const state = derivePreviewPanelState(previewInput({
    mode: "original",
    uploadState: "ready",
    uploadFilename: "resume.pdf",
    sourceText: ["Jordan Lee", "Operations associate", "Supported planning work."].join("\n"),
  }));

  assert.equal(state.tabState.original, "Ready");
  assert.equal(state.tabState.tailored, "Waiting");
  assert.equal(state.tabState.diff, "Waiting");
  assert.equal(state.title, "Original resume · before tailoring");
  assert.equal(state.statusItems[0].value, "3 source lines extracted");
});

test("labels source samples distinctly from complete original previews", () => {
  const state = derivePreviewPanelState(previewInput({
    mode: "original",
    uploadState: "ready",
    uploadFilename: "resume.pdf",
    sourceText: "Jordan Lee",
    sourceCharacterCount: 25000,
    sourcePreviewTruncated: true,
  }));

  assert.equal(state.tabState.original, "Sample");
  assert.equal(state.title, "Original resume · source sample");
  assert.equal(state.statusItems[0].value, "1 source line shown from sample");
});

test("marks completed runs ready across tailored, original, and changes", () => {
  const state = derivePreviewPanelState(previewInput({
    mode: "diff",
    uploadState: "ready",
    sourceText: "Jordan Lee\nProject coordinator",
    tailoredText: "Jordan Lee\nProduct operations manager",
    keywordTotal: 5,
    presentKeywordCount: 4,
    changeLogCount: 2,
    downloadReady: true,
  }));

  assert.deepEqual(state.tabState, {
    tailored: "Ready",
    original: "Ready",
    diff: "Ready",
  });
  assert.equal(state.title, "Change notes · before export");
  assert.equal(state.statusItems[0].value, "Original side ready");
  assert.equal(state.statusItems[1].value, "Tailored side ready");
  assert.equal(state.statusItems[2].value, "2 change notes");
});

test("keeps restored tailored runs partial when original source was not saved", () => {
  const originalState = derivePreviewPanelState(previewInput({
    mode: "original",
    uploadState: "idle",
    uploadFilename: "resume.pdf",
    tailoredText: "Saved tailored draft",
    restoredRunOpen: true,
  }));
  const diffState = derivePreviewPanelState(previewInput({
    mode: "diff",
    uploadState: "idle",
    uploadFilename: "resume.pdf",
    tailoredText: "Saved tailored draft",
    restoredRunOpen: true,
  }));

  assert.equal(originalState.tabState.original, "Unavailable");
  assert.equal(originalState.tabState.diff, "Partial");
  assert.equal(originalState.title, "Original resume · source not saved");
  assert.equal(originalState.statusItems[0].value, "Original source was not saved");
  assert.equal(diffState.statusItems[0].value, "Original side not saved");
});

test("distinguishes upload extraction gaps from restored source gaps", () => {
  const state = derivePreviewPanelState(previewInput({
    mode: "original",
    uploadState: "ready",
    uploadFilename: "resume.pdf",
  }));

  assert.equal(state.tabState.original, "Unavailable");
  assert.equal(state.title, "Original resume · preview unavailable");
  assert.equal(state.statusItems[0].value, "Source preview unavailable");
});

test("uses warning tone for waiting and unavailable preview statuses", () => {
  assert.equal(previewStatusTone("Original side waiting", { uploadState: "idle", mode: "diff", index: 0 }), "warn");
  assert.equal(previewStatusTone("Source preview unavailable", { uploadState: "ready", mode: "original", index: 0 }), "warn");
  assert.equal(previewStatusTone("Tailored side ready", { uploadState: "ready", mode: "diff", index: 1 }), "");
});
