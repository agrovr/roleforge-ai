import { isSourcePreviewSample } from "./previewResume";

export type PreviewMode = "tailored" | "original" | "diff";
export type PreviewUploadState = "idle" | "reading" | "ready" | "error";
export type WorkflowStage = "idle" | "uploading" | "tailoring" | "exporting" | "ready" | "error";

export type PreviewStatusItem = {
  label: string;
  value: string;
};

export type PreviewPanelInput = {
  mode: PreviewMode;
  stage: WorkflowStage;
  uploadState: PreviewUploadState;
  sourceText?: string;
  tailoredText?: string;
  sourceCharacterCount?: number;
  sourcePreviewTruncated?: boolean;
  uploadFilename?: string;
  selectedTemplateName: string;
  selectedDownloadFormat: string;
  downloadReady: boolean;
  restoredRunOpen: boolean;
  keywordTotal: number;
  presentKeywordCount: number;
  changeLogCount: number;
};

export type PreviewPanelState = {
  hasSourcePreview: boolean;
  hasTailoredPreview: boolean;
  restoredSourceMissing: boolean;
  sourcePreviewSample: boolean;
  sourcePreviewUnavailable: boolean;
  sourceLineCount: number;
  tailoredLineCount: number;
  tabState: Record<PreviewMode, string>;
  title: string;
  statusItems: PreviewStatusItem[];
};

function countReadableLines(text?: string) {
  return (text ?? "").split(/\r?\n/).filter((line) => line.trim()).length;
}

function plural(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

export function previewStatusTone(value: string, options: { uploadState: PreviewUploadState; mode: PreviewMode; index: number }) {
  const normalized = value.toLowerCase();
  return (options.uploadState === "error" && options.mode === "original" && options.index === 0) ||
    normalized.includes("waiting") ||
    normalized.includes("pending") ||
    normalized.includes("unavailable") ||
    normalized.includes("not saved") ||
    normalized.includes("was not saved") ||
    normalized.includes("needs another try") ||
    normalized.includes("upload a resume") ||
    normalized.includes("appear after a run") ||
    normalized.includes("run tailor")
    ? "warn"
    : "";
}

export function derivePreviewPanelState(input: PreviewPanelInput): PreviewPanelState {
  const sourceLineCount = countReadableLines(input.sourceText);
  const tailoredLineCount = countReadableLines(input.tailoredText);
  const hasSourcePreview = Boolean(input.sourceText?.trim());
  const hasTailoredPreview = Boolean(input.tailoredText?.trim());
  const restoredSourceMissing = input.restoredRunOpen && hasTailoredPreview && !hasSourcePreview;
  const sourcePreviewUnavailable = Boolean(input.uploadFilename && input.uploadState === "ready" && !hasSourcePreview);
  const sourcePreviewSample = isSourcePreviewSample(
    input.sourceText,
    input.sourceCharacterCount,
    input.sourcePreviewTruncated,
  );

  const tabState = {
    tailored: hasTailoredPreview ? "Ready" : input.stage === "tailoring" ? "Running" : "Waiting",
    original: hasSourcePreview
      ? sourcePreviewSample
        ? "Sample"
        : "Ready"
      : input.uploadState === "reading"
        ? "Reading"
        : sourcePreviewUnavailable || restoredSourceMissing
          ? "Unavailable"
          : "Waiting",
    diff:
      hasSourcePreview && hasTailoredPreview
        ? "Ready"
        : hasTailoredPreview
          ? "Partial"
          : "Waiting",
  } satisfies Record<PreviewMode, string>;

  const title =
    input.mode === "original"
      ? sourcePreviewUnavailable
        ? "Original resume · preview unavailable"
        : restoredSourceMissing
          ? "Original resume · source not saved"
        : sourcePreviewSample
          ? "Original resume · source sample"
          : "Original resume · before tailoring"
      : input.mode === "diff"
        ? "Change notes · before export"
        : hasTailoredPreview
          ? "Tailored resume · AI edits applied"
          : "Tailored resume · waiting for run";

  const statusItems =
    input.mode === "original"
      ? [
          {
            label: "Source",
            value: hasSourcePreview
              ? `${plural(sourceLineCount || 1, "source line")} ${sourcePreviewSample ? "shown from sample" : "extracted"}`
              : input.uploadState === "reading"
                ? "Reading source document"
                : input.uploadState === "error"
                  ? "Source preview needs another try"
                  : sourcePreviewUnavailable
                    ? "Source preview unavailable"
                    : restoredSourceMissing
                      ? "Original source was not saved"
                    : "Upload a resume to see the original",
          },
          { label: "File", value: input.uploadFilename ?? "No source file selected" },
          { label: "State", value: input.restoredRunOpen ? (hasSourcePreview ? "Restored run source" : "Tailored draft restored") : "Before AI edits" },
        ]
      : input.mode === "diff"
        ? [
            { label: "Original", value: hasSourcePreview ? "Original side ready" : restoredSourceMissing ? "Original side not saved" : "Original side waiting" },
            { label: "Tailored", value: hasTailoredPreview ? "Tailored side ready" : "Tailored side waiting" },
            { label: "Notes", value: input.changeLogCount ? plural(input.changeLogCount, "change note") : "Change notes appear after a run" },
          ]
        : [
            {
              label: "Draft",
              value: hasTailoredPreview
                ? `${plural(tailoredLineCount || 1, "tailored line")} generated`
                : input.stage === "tailoring"
                  ? "Tailored draft is generating"
                  : "Run Tailor to generate a draft",
            },
            {
              label: "Keywords",
              value: input.keywordTotal
                ? `${input.presentKeywordCount}/${input.keywordTotal} keywords matched`
                : "Run needed for keyword match",
            },
            {
              label: "Export",
              value: input.restoredRunOpen
                ? `${input.selectedTemplateName} saved run open`
                : input.downloadReady
                  ? `${input.selectedTemplateName} ${input.selectedDownloadFormat.toUpperCase()} ready`
                  : `${input.selectedTemplateName} direction selected`,
            },
          ];

  return {
    hasSourcePreview,
    hasTailoredPreview,
    restoredSourceMissing,
    sourcePreviewSample,
    sourcePreviewUnavailable,
    sourceLineCount,
    tailoredLineCount,
    tabState,
    title,
    statusItems,
  };
}
