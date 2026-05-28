"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { writeClipboardText } from "../lib/clipboard";
import { downloadStatusFromHead } from "../lib/downloadStatus";
import { normalizeWorkflowDownloadUrl, workflowDownloadUrl } from "../lib/downloadUrls";
import { FREE_ENTITLEMENT, type AccountEntitlement } from "../lib/entitlements";
import {
  customerExportFormats,
  exportDownloadReadyForSelection,
  exportFormatAllowed,
  selectedExportStatusMessage,
  type ExportCapability,
  type ExportFormat,
} from "../lib/exportFormats";
import { buildWorkflowExportPayload } from "../lib/exportPayload";
import { formatInterviewPrepForClipboard } from "../lib/generatedAssets";
import {
  derivePreviewPanelState,
  previewStatusTone,
  type PreviewMode,
} from "../lib/previewPanel";
import {
  RESUME_TEMPLATE_COOKIE,
  RESUME_TEMPLATE_STORAGE_KEY,
  getResumeTemplate,
  isResumeTemplateSlug,
  type ResumeTemplateSlug,
} from "../lib/resumeTemplates";
import { parseTargetUrl } from "../lib/targetLabel";
import {
  formatHistoryTimestamp,
  groupHistoryItems,
  historyGroupKey,
  hasRestorableSnapshot,
  historyDownloadEntries,
  historyDownloads,
  historyGroupSummary,
  historyGroupStatus,
  historyProjectTitle,
  historyRunActionCopy,
  historyRunStatus,
  historyStatusLabel,
  historyStorageLabel,
  historyVersionLabel,
  isAccountHistoryItem,
  mergeHistory,
  primaryHistoryDownload,
  restoredHistoryDownloadSelection,
  syncableLocalHistoryItems,
  type HistoryDownloads,
  type HistoryItem as BaseHistoryItem,
} from "../lib/history";
import {
  buildPlainResumePreview,
  buildResumeEntries,
  cleanBulletLine,
  isSourcePreviewSample,
  isBulletLine,
  isStructuredResumeSection,
  parseResumeText,
  type ParsedResumeSection,
  type PlainResumeLine,
} from "../lib/previewResume";
import { createRoleForgeBrowserClient } from "../lib/supabase/client";
import { deleteSavedProject, loadSavedRuns, renameSavedProject, saveCompletedRun } from "../lib/supabase/savedProjectClient";
import { tailorActionState } from "../lib/tailorAction";
import { monthlyRunAllowanceSentence, runWord } from "../lib/usage";
import {
  DEFAULT_UPLOAD_FORMATS,
  normalizeWorkflowCapabilities,
  type UploadFormat,
  type WorkflowCapabilities,
} from "../lib/workflowCapabilities";
import { readApiError, workflowErrorFromCaught, type WorkflowErrorState } from "../lib/workflowErrors";

type AtsIssue = { severity: string; issue: string; fix: string };
type AtsReport = { issues: AtsIssue[] };

type FitScore = {
  score: number;
  top_keywords: string[];
  present: string[];
  missing: string[];
  coverage_ratio?: number;
  heading_bonus?: number;
  note?: string;
};

type TailoringMode = "conservative" | "balanced" | "aggressive";
type GapAnalysis = {
  matched_requirements: string[];
  partial_matches: string[];
  missing_requirements: string[];
  evidence_to_add: string[];
  cautions: string[];
};
type InterviewItem = { question: string; answer_bullets: string[] };
type ScoreSummary = {
  fit_before: number;
  fit_after: number;
  fit_delta: number;
  ats_before: number;
  ats_after: number;
  ats_delta: number;
  issues_before: number;
  issues_after: number;
  issues_resolved: number;
  added_keywords: string[];
  remaining_missing_keywords: string[];
};
type TailorResult = {
  run_id?: string;
  generated_at?: string;
  tailoring_mode?: TailoringMode;
  tailored_text: string;
  change_log: string[];
  suggestions: string[];
  gap_analysis?: GapAnalysis;
  cover_letter?: string;
  interview_prep?: InterviewItem[];
  recruiter_summary?: string;
  ats_before: AtsReport;
  ats_after: AtsReport;
  fit_score?: FitScore;
  fit_score_after?: FitScore;
  score_summary?: ScoreSummary;
  warnings?: string[];
  request_id?: string;
};

type UploadResponse = {
  resume_id: string;
  filename: string;
  format?: UploadFormat;
  character_count?: number;
  text_preview?: string;
  text_preview_truncated?: boolean;
};
type ExportResponse = { saved_to: string; download_filename: string };
type Stage = "idle" | "uploading" | "tailoring" | "exporting" | "ready" | "error";
type InputMode = "text" | "url";
type HistoryFilter = "all" | "account" | "local";
type PreviewUploadState = "idle" | "reading" | "ready" | "error";
type DownloadState = "idle" | "checking" | "ready" | "expired";
type ReviewTab = "score" | "gap" | "ats" | "resume" | "cover" | "interview" | "changes" | "history";
type SavedRunSnapshot = {
  result: TailorResult;
  sourcePreviewText?: string;
  uploadMeta?: UploadResponse | null;
  jdText?: string;
  jdUrl?: string;
  companyUrl?: string;
  inputMode?: InputMode;
  tailoringMode?: TailoringMode;
  downloadUrl?: string;
  downloadFormat?: ExportFormat;
  downloads?: HistoryDownloads;
  templateSlug?: ResumeTemplateSlug;
  templateName?: string;
};
type HistoryItem = BaseHistoryItem<SavedRunSnapshot>;
type AccountUser = { id: string; email?: string; name?: string };
type AccountUsage = {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  monthlyRuns: number;
  monthlyRunLimit: number | null;
  remainingRuns: number | null;
  runLimited: boolean;
};
type AccountStatus = {
  configured: boolean;
  enabled: boolean;
  provider: "supabase";
  user: AccountUser | null;
  entitlement?: AccountEntitlement;
  usage?: AccountUsage | null;
  next: string;
};
type ExportNotice = { format: ExportFormat; label: string };
type StudioSuggestion = { label: string; meta: string; before?: string; after: string; tone?: "good" | "warn" | "neutral" };

const HISTORY_KEY = "resume-tailor-history-v1";
const SYNCED_HISTORY_KEY = "roleforge-synced-history-v1";
function Pill({ text, kind }: { text: string; kind: "good" | "bad" }) {
  return <span className={`pill ${kind}`}>{text}</span>;
}

function StudioMetric({
  label,
  value,
  unit,
  detail,
  progress,
  tone = "brand",
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  progress: number;
  tone?: "brand" | "good" | "accent" | "sky";
}) {
  return (
    <article className="rf-studio-stat">
      <div className="rf-studio-stat-label">{label}</div>
      <div className="rf-studio-stat-row">
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </div>
      <div className="rf-studio-stat-track">
        <div className={`rf-studio-stat-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      <p>{detail}</p>
    </article>
  );
}

function fileUploadKey(file: File | null) {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : "";
}

function saveResumeTemplatePreference(slug: ResumeTemplateSlug) {
  window.localStorage.setItem(RESUME_TEMPLATE_STORAGE_KEY, slug);
  document.cookie = `${RESUME_TEMPLATE_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function countReadableWords(text?: string) {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function PlainResumeDocument({
  text,
  keywords,
  mode,
  filename,
  uploadFormat,
  characterCount,
  sourcePreviewTruncated,
}: {
  text?: string;
  keywords: string[];
  mode: PreviewMode;
  filename?: string;
  uploadFormat?: UploadFormat;
  characterCount?: number;
  sourcePreviewTruncated?: boolean;
}) {
  const preview = buildPlainResumePreview(text);
  const lines = preview.lines;
  const documentName = filename ? filename.replace(/\.(docx|pdf|txt)$/i, "") : mode === "original" ? "Original resume" : "Generated draft";
  const sourceSample = mode === "original" && isSourcePreviewSample(text, characterCount, sourcePreviewTruncated);
  const cappedDetail = preview.capped
    ? `Showing the first ${lines.length} preview lines from ${preview.renderedLineCount.toLocaleString()} readable lines.`
    : "";
  const meta = [
    uploadFormat
      ? `${uploadFormat.toUpperCase()} ${sourceSample ? "source sample" : "source"}`
      : mode === "original"
        ? sourceSample
          ? "Source sample"
          : "Source preview"
        : "Generated resume",
    characterCount ? `${characterCount.toLocaleString()} characters processed` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="rf-resume-paper rf-resume-paper-plain">
      <div className="rf-resume-head">
        <h3>{documentName}</h3>
        <p>{mode === "original" ? "Before tailoring" : "Role-targeted draft"}</p>
        {meta ? <span>{meta}</span> : null}
      </div>
      <section>
        <h4>{mode === "original" ? (sourceSample ? "Source sample" : "Source text") : "Generated content"}</h4>
        {lines.length ? (
          <div className="rf-resume-plain-lines">
            {lines.map((line, index) => {
              if (line.kind === "heading") {
                return <h5 key={`plain-${index}`}>{line.text}</h5>;
              }
              if (line.kind === "bullet") {
                return (
                  <p className="plain-bullet" key={`plain-${index}`}>
                    <HighlightedText text={line.text} keywords={mode === "original" ? [] : keywords} />
                  </p>
                );
              }
              return (
                <p key={`plain-${index}`}>
                  <HighlightedText text={line.text} keywords={mode === "original" ? [] : keywords} />
                </p>
              );
            })}
          </div>
        ) : (
          <p>{mode === "original" ? "Upload a resume to preview extracted source text." : "Run the workflow to render the generated draft here."}</p>
        )}
        {cappedDetail ? <p className="rf-preview-crop-note">{cappedDetail}</p> : null}
      </section>
    </div>
  );
}

function PreviewLineList({
  lines,
  keywords,
  empty,
  cappedDetail,
}: {
  lines: PlainResumeLine[];
  keywords: string[];
  empty: string;
  cappedDetail?: string;
}) {
  if (!lines.length) return <p className="rf-diff-empty">{empty}</p>;

  return (
    <>
      <div className="rf-diff-lines">
        {lines.map((line, index) => {
          if (line.kind === "heading") return <h5 key={`diff-line-${index}`}>{line.text}</h5>;
          if (line.kind === "bullet") {
            return (
              <p className="plain-bullet" key={`diff-line-${index}`}>
                <HighlightedText text={line.text} keywords={keywords} />
              </p>
            );
          }
          return (
            <p key={`diff-line-${index}`}>
              <HighlightedText text={line.text} keywords={keywords} />
            </p>
          );
        })}
      </div>
      {cappedDetail ? <p className="rf-preview-crop-note">{cappedDetail}</p> : null}
    </>
  );
}

function DiffResumeDocument({
  sourceText,
  tailoredText,
  keywords,
  changeLog,
  filename,
}: {
  sourceText?: string;
  tailoredText?: string;
  keywords: string[];
  changeLog?: string[];
  filename?: string;
}) {
  const beforePreview = buildPlainResumePreview(sourceText);
  const afterPreview = buildPlainResumePreview(tailoredText);
  const beforeLines = beforePreview.lines;
  const afterLines = afterPreview.lines;
  const documentName = filename ? filename.replace(/\.(docx|pdf|txt)$/i, "") : "Resume";
  const hasBefore = Boolean(sourceText?.trim());
  const hasAfter = Boolean(tailoredText?.trim());
  const missingSavedSource = hasAfter && !hasBefore;
  const comparisonStatus = hasBefore && hasAfter
    ? "Ready to compare"
    : hasBefore
      ? "Waiting for tailored draft"
      : missingSavedSource
        ? "Original source not saved"
        : "Waiting for both sides";
  const comparisonHelp = hasBefore && hasAfter
    ? "Review what changed before exporting the finished draft."
    : hasBefore
      ? "Run Tailor to generate the after side for this comparison."
      : hasAfter
        ? "The tailored draft is ready, but this run does not include saved source text for the before side."
        : "Upload a resume and complete a tailor run to compare the original with the finished draft.";

  return (
    <div className="rf-resume-paper rf-resume-paper-diff">
      <div className="rf-resume-head">
        <h3>Change review</h3>
        <p>{documentName}</p>
        <span>{comparisonHelp}</span>
      </div>
      <div className="rf-diff-readiness" aria-label="Comparison readiness">
        <span className={hasBefore ? "" : "waiting"}>
          <strong>Original</strong>
          {hasBefore ? "Ready" : missingSavedSource ? "Not saved" : "Waiting"}
        </span>
        <span className={hasAfter ? "" : "waiting"}>
          <strong>Tailored</strong>
          {hasAfter ? "Ready" : "Waiting"}
        </span>
        <span className={hasBefore && hasAfter ? "" : "waiting"}>
          <strong>Compare</strong>
          {comparisonStatus}
        </span>
      </div>
      <section>
        <h4>Generated change notes</h4>
        {changeLog?.length ? (
          <ul className="rf-resume-change-list">
            {changeLog.slice(0, 8).map((change, index) => (
              <li key={`preview-change-${index}`}>{change}</li>
            ))}
          </ul>
        ) : (
          <p>Change notes appear here after a completed tailoring run.</p>
        )}
      </section>
      <div className="rf-diff-grid" aria-label="Original and tailored resume comparison">
        <article className="rf-diff-column before">
          <div className="rf-diff-kicker">Original</div>
          <PreviewLineList
            lines={beforeLines}
            keywords={[]}
            empty={missingSavedSource ? "Original source text was not saved for this run." : "Upload a resume, or restore a run with saved source text, to show the before state."}
            cappedDetail={
              beforePreview.capped
                ? `Showing the first ${beforeLines.length} preview lines from ${beforePreview.renderedLineCount.toLocaleString()} readable lines.`
                : undefined
            }
          />
        </article>
        <article className="rf-diff-column after">
          <div className="rf-diff-kicker">Tailored</div>
          <PreviewLineList
            lines={afterLines}
            keywords={keywords}
            empty="Run Tailor, or restore a restorable saved run, to show the after state."
            cappedDetail={
              afterPreview.capped
                ? `Showing the first ${afterLines.length} preview lines from ${afterPreview.renderedLineCount.toLocaleString()} readable lines.`
                : undefined
            }
          />
        </article>
      </div>
    </div>
  );
}

function PreviewEmptyDocument({
  mode,
  filename,
  uploadFormat,
  characterCount,
  hasSourceText,
  sourcePreviewUnavailable,
  hasTarget,
  stage,
  restored,
}: {
  mode: PreviewMode;
  filename?: string;
  uploadFormat?: UploadFormat;
  characterCount?: number;
  hasSourceText: boolean;
  sourcePreviewUnavailable: boolean;
  hasTarget: boolean;
  stage: Stage;
  restored: boolean;
}) {
  const documentName =
    filename?.replace(/\.(docx|pdf|txt)$/i, "") ||
    (mode === "tailored" ? "Tailored draft" : "Original resume");
  const isWorking = stage === "uploading" || stage === "tailoring" || stage === "exporting";
  const statusLine = characterCount
    ? `${characterCount.toLocaleString()} characters processed`
    : uploadFormat
      ? `${uploadFormat.toUpperCase()} upload`
      : "Resume preview";
  const title = mode === "tailored" ? "Tailored preview" : "Original preview";
  const description =
    mode === "tailored"
      ? isWorking
        ? "The tailored draft is being generated now. This view will update as soon as the run completes."
        : hasSourceText
          ? "The original resume is ready. Run Tailor to generate the AI-edited draft for this tab."
          : restored
            ? "This saved run can be restored, but it does not include enough tailored text for a studio preview."
            : "Upload a resume and add a job target, then run Tailor to preview the edited draft."
      : stage === "uploading"
        ? "The source document is being read now. The original preview will appear here when extraction finishes."
        : sourcePreviewUnavailable
          ? "The resume uploaded, but the original text preview was not returned. You can still run Tailor and review the generated draft after completion."
        : restored
          ? "This restored run did not save source preview text, so only the tailored draft can be reviewed."
          : "Upload a resume to show the source text extracted from the document.";
  const steps =
    mode === "tailored"
      ? [
          { label: "Resume", value: hasSourceText || filename ? "Ready" : "Waiting" },
          { label: "Job target", value: hasTarget ? "Ready" : "Waiting" },
          { label: "Tailor run", value: isWorking ? "Running" : "Needed" },
        ]
      : [
          { label: "Source file", value: filename ? "Selected" : "Waiting" },
          { label: "Extraction", value: stage === "uploading" ? "Reading" : hasSourceText ? "Ready" : sourcePreviewUnavailable ? "Unavailable" : "Needed" },
          { label: "AI edits", value: "Not applied" },
        ];

  return (
    <div className="rf-resume-paper rf-resume-paper-empty">
      <div className="rf-resume-head">
        <h3>{documentName}</h3>
        <p>{statusLine}</p>
        <span>{title}</span>
      </div>
      <section>
        <h4>{title}</h4>
        <p>{description}</p>
        <div className="rf-preview-empty-steps" aria-label={`${title} readiness`}>
          {steps.map((step) => (
            <span className={/waiting|needed|unavailable/i.test(step.value) ? "waiting" : ""} key={`${step.label}-${step.value}`}>
              <strong>{step.label}</strong>
              {step.value}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  const terms = Array.from(
    new Set(keywords.map((keyword) => keyword.trim()).filter((keyword) => keyword.length >= 3)),
  ).slice(0, 18);
  if (!terms.length) return <>{text}</>;

  const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(matcher);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = terms.some((term) => term.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <mark key={`${part}-${index}`} className="good">
            {part}
          </mark>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        );
      })}
    </>
  );
}

function ResumeSection({ section, keywords }: { section: ParsedResumeSection; keywords: string[] }) {
  const isSkills = /skills/i.test(section.title);
  const structuredEntries = isStructuredResumeSection(section.title) ? buildResumeEntries(section.lines) : [];
  const skills = section.lines
    .flatMap((line) => line.split(/[,;|]/))
    .map((skill) => cleanBulletLine(skill).trim())
    .filter(Boolean);
  const bulletLines = section.lines.filter(isBulletLine);
  const paragraphLines = section.lines.filter((line) => !isBulletLine(line));

  return (
    <section>
      <h4>{section.title}</h4>
      {isSkills && skills.length > 1 ? (
        <div className="rf-resume-keywords">
          {skills.slice(0, 12).map((skill) => (
            <span key={`${section.title}-${skill}`}>{skill}</span>
          ))}
        </div>
      ) : structuredEntries.length ? (
        <div className="rf-resume-entries">
          {structuredEntries.map((entry, entryIndex) => (
            <div className="rf-resume-entry" key={`${section.title}-entry-${entryIndex}`}>
              <div className="rf-resume-role">
                <div>
                  <strong>
                    <HighlightedText text={entry.title} keywords={keywords} />
                  </strong>
                  {entry.meta ? (
                    <em>
                      <HighlightedText text={entry.meta} keywords={keywords} />
                    </em>
                  ) : null}
                </div>
                {entry.date ? <span>{entry.date}</span> : null}
              </div>
              {entry.details.map((line, index) => (
                <p className="rf-resume-detail" key={`${section.title}-entry-${entryIndex}-detail-${index}`}>
                  <HighlightedText text={line} keywords={keywords} />
                </p>
              ))}
              {entry.bullets.length ? (
                <ul>
                  {entry.bullets.map((line, index) => (
                    <li key={`${section.title}-entry-${entryIndex}-li-${index}`}>
                      <HighlightedText text={line} keywords={keywords} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <>
          {paragraphLines.map((line, index) => (
            <p key={`${section.title}-p-${index}`}>
              <HighlightedText text={line} keywords={keywords} />
            </p>
          ))}
          {bulletLines.length ? (
            <ul>
              {bulletLines.map((line, index) => (
                <li key={`${section.title}-li-${index}`}>
                  <HighlightedText text={cleanBulletLine(line)} keywords={keywords} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}

function MiniResumeDocument({
  text,
  sourceText,
  keywords,
  mode,
  filename,
  uploadFormat,
  characterCount,
  sourcePreviewTruncated,
  changeLog,
  hasTarget,
  sourcePreviewUnavailable,
  stage,
  restored,
}: {
  text?: string;
  sourceText?: string;
  keywords: string[];
  mode: PreviewMode;
  filename?: string;
  uploadFormat?: UploadFormat;
  characterCount?: number;
  sourcePreviewTruncated?: boolean;
  changeLog?: string[];
  hasTarget: boolean;
  sourcePreviewUnavailable: boolean;
  stage: Stage;
  restored: boolean;
}) {
  const hasText = Boolean(text?.trim());
  const hasSourceText = Boolean(sourceText?.trim());

  if (mode === "original" && hasText) {
    return (
      <PlainResumeDocument
        text={text}
        keywords={[]}
        mode={mode}
        filename={filename}
        uploadFormat={uploadFormat}
        characterCount={characterCount}
        sourcePreviewTruncated={sourcePreviewTruncated}
      />
    );
  }

  if (mode === "diff") {
    return (
      <DiffResumeDocument
        sourceText={sourceText}
        tailoredText={text}
        keywords={keywords}
        changeLog={changeLog}
        filename={filename}
      />
    );
  }

  const parsed = parseResumeText(text);

  if (!hasText) {
    return (
      <PreviewEmptyDocument
        mode={mode}
        filename={filename}
        uploadFormat={uploadFormat}
        characterCount={characterCount}
        hasSourceText={hasSourceText}
        sourcePreviewUnavailable={sourcePreviewUnavailable}
        hasTarget={hasTarget}
        stage={stage}
        restored={restored}
      />
    );
  }

  if (parsed) {
    return (
      <div className="rf-resume-paper">
        <div className="rf-resume-head">
          <h3>{parsed.name}</h3>
          <p>{parsed.role}</p>
          {parsed.contact ? <span>{parsed.contact}</span> : null}
        </div>
        {parsed.sections.map((section) => (
          <ResumeSection key={section.title} section={section} keywords={keywords} />
        ))}
      </div>
    );
  }

  return <PlainResumeDocument text={text} keywords={keywords} mode={mode} filename={filename} uploadFormat={uploadFormat} characterCount={characterCount} sourcePreviewTruncated={sourcePreviewTruncated} />;
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 12)));
}

function loadSyncedHistoryIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SYNCED_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveSyncedHistoryIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNCED_HISTORY_KEY, JSON.stringify([...new Set(ids)].slice(0, 40)));
}

function numberDetail(details: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = details?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringDetail(details: Record<string, unknown> | null | undefined, key: string): string {
  const value = details?.[key];
  return typeof value === "string" ? value : "";
}

function formatResetDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function scrollDocumentTo(top: number, behavior: ScrollBehavior) {
  const nextTop = Math.max(0, top);
  const fallback = () => {
    if (document.scrollingElement) document.scrollingElement.scrollTop = nextTop;
    document.documentElement.scrollTop = nextTop;
    document.body.scrollTop = nextTop;
  };

  if (document.scrollingElement && typeof document.scrollingElement.scrollTo === "function") {
    document.scrollingElement.scrollTo({ top: nextTop, behavior });
  } else if (typeof window.scrollTo === "function") {
    window.scrollTo({ top: nextTop, behavior });
  } else {
    fallback();
  }

  if (behavior !== "auto") {
    window.setTimeout(() => {
      if (Math.abs(window.scrollY - nextTop) > 48) fallback();
    }, 180);
  }
}

function formatDelta(value: number | undefined) {
  if (!value) return "0";
  return value > 0 ? `+${value}` : `${value}`;
}

function compactLabel(value: string, maxLength = 46) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function accountInitials(user: AccountUser | null) {
  const label = user?.name || user?.email || "RF";
  const parts = label
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  return (parts[0]?.[0] ?? "R").toUpperCase() + (parts[1]?.[0] ?? "F").toUpperCase();
}

function accountNoticeLabel(value: string, detail = "") {
  const safeDetail = detail.replace(/\+/g, " ").trim();

  switch (value) {
    case "check-email":
      return "Check your email for the secure sign-in link.";
    case "connected":
      return "You are signed in. Saved project sync is active.";
    case "signed-out":
      return "You are signed out.";
    case "account-not-configured":
      return "Sign-in is temporarily unavailable.";
    case "signin-error":
      if (safeDetail) return `Sign-in could not finish: ${safeDetail}`;
      return "Sign-in could not start. Check the email and try again.";
    default:
      return "";
  }
}

function StudioAccountGate({ state }: { state: "loading" | "required" }) {
  const isLoading = state === "loading";

  return (
    <main className="login-shell studio-auth-shell">
      <header className="login-nav studio-auth-nav">
        <Brand href="/" label="RoleForge AI home" />
        <div className="login-nav-actions">
          <ThemeToggle />
          <Link className="btn btn-soft btn-sm" href="/">Home</Link>
        </div>
      </header>

      <section className="login-panel studio-auth-panel" aria-labelledby="studio-auth-title">
        <div className="login-copy studio-auth-copy">
          <div className="eyebrow">Protected studio</div>
          <h1 id="studio-auth-title" className="display">
            {isLoading ? "Opening your workspace." : "Sign in to open RoleForge AI."}
          </h1>
          <p>
            {isLoading
              ? "Checking your account before the resume tools load."
              : "The studio stays behind your account so saved projects, exports, and usage stay connected."}
          </p>
          <div className="login-benefits" aria-label="Protected workspace benefits">
            <span><RoleForgeIcon name="lock" size={14} /> Studio tools stay account protected</span>
            <span><RoleForgeIcon name="chart" size={14} /> Saved projects reopen cleanly</span>
            <span><RoleForgeIcon name="download" size={14} /> Exports stay tied to completed runs</span>
          </div>
        </div>

        <div className="login-card studio-auth-card">
          <div className="login-card-head">
            <span className={`login-status ${isLoading ? "neutral" : "info"}`}>
              {isLoading ? "Checking session" : "Account required"}
            </span>
            <h2>{isLoading ? "Almost there" : "Continue to the studio"}</h2>
            <p>
              {isLoading
                ? "Your workspace will open as soon as your session is ready."
                : "Use Google or email sign-in, then you will land back in the resume studio."}
            </p>
          </div>
          <div className="studio-auth-preview" aria-label="Protected studio state">
            <span><RoleForgeIcon name="file" size={15} /> Resume workflow</span>
            <strong>{isLoading ? "Preparing workspace" : "Sign in required"}</strong>
          </div>
          {isLoading ? (
            <div className="studio-auth-progress" aria-hidden="true" />
          ) : (
            <div className="studio-auth-actions">
              <Link className="primary-button studio-account-submit" href="/login?next=%2Fapp&account=signin-required">
                Sign in
              </Link>
              <Link className="ghost-button" href="/">
                Back home
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  const baseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL;
    return value && value.trim() ? value.trim() : "";
  }, []);
  const supabaseClient = useMemo(() => createRoleForgeBrowserClient(), []);

  const [file, setFile] = useState<File | null>(null);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [tailoringMode, setTailoringMode] = useState<TailoringMode>("balanced");
  const [jdUrl, setJdUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("score");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("tailored");
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [accountNotice, setAccountNotice] = useState("");
  const [copyState, setCopyState] = useState("");
  const [assetCopyState, setAssetCopyState] = useState("");
  const [error, setError] = useState("");
  const [workflowError, setWorkflowError] = useState<WorkflowErrorState | null>(null);
  const [exportNotice, setExportNotice] = useState<ExportNotice | null>(null);

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadResponse | null>(null);
  const [uploadFileKey, setUploadFileKey] = useState("");
  const [previewUploadState, setPreviewUploadState] = useState<PreviewUploadState>("idle");
  const [previewUploadError, setPreviewUploadError] = useState("");
  const [sourcePreviewText, setSourcePreviewText] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<ExportFormat>("pdf");
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>("pdf");
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<ResumeTemplateSlug>("classic");
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historySyncState, setHistorySyncState] = useState<"local" | "loading" | "synced" | "saving" | "error">("local");
  const [historySyncMessage, setHistorySyncMessage] = useState("Local browser history");
  const [syncedHistoryIds, setSyncedHistoryIds] = useState<string[]>([]);
  const [restoredHistoryId, setRestoredHistoryId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historyScrollRequest, setHistoryScrollRequest] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyExportRequest, setHistoryExportRequest] = useState<{ id: string; format: ExportFormat } | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState("");
  const [expandedHistoryGroupKey, setExpandedHistoryGroupKey] = useState<string | null>(null);
  const [projectActionId, setProjectActionId] = useState<string | null>(null);
  const [projectActionMessage, setProjectActionMessage] = useState("");
  const [confirmingClearHistory, setConfirmingClearHistory] = useState(false);
  const [confirmingDeleteProjectId, setConfirmingDeleteProjectId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<WorkflowCapabilities | null>(null);
  const editorSectionRef = useRef<HTMLElement | null>(null);
  const historySectionRef = useRef<HTMLElement | null>(null);
  const historyDetailRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const handledHistoryRunRef = useRef("");

  const accountUser = accountStatus?.user ?? null;
  const accountReady = Boolean(accountStatus?.configured && accountStatus.enabled);
  const signedIn = Boolean(accountUser);
  const usageLimited = Boolean(accountStatus?.usage?.runLimited);
  const limitError = workflowError?.code === "plan_limit_reached";
  const limitReached = usageLimited || limitError;
  const usage = accountStatus?.usage ?? null;
  const errorLimit = numberDetail(workflowError?.details, "monthly_limit");
  const errorRuns = numberDetail(workflowError?.details, "monthly_runs");
  const monthlyRunLimit = usage ? usage.monthlyRunLimit : errorLimit ?? FREE_ENTITLEMENT.monthlyRunLimit;
  const monthlyRuns = usage?.monthlyRuns ?? errorRuns ?? monthlyRunLimit;
  const resetAt = usage?.currentPeriodEnd || stringDetail(workflowError?.details, "reset_at");
  const resetLabel = formatResetDate(resetAt);
  const usageLabel = typeof monthlyRunLimit === "number" ? `${monthlyRuns}/${monthlyRunLimit} ${runWord(monthlyRuns)} used` : "Premium runs are unlimited";

  const workflowHeaders = useCallback(async (extra: Record<string, string> = {}) => {
    if (!supabaseClient) return extra;

    const { data, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw new Error("We could not confirm your session. Try again in a moment.");

    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in to use the resume workflow.");

    return { ...extra, Authorization: `Bearer ${token}` };
  }, [supabaseClient]);

  const refreshAccountStatus = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/auth/status", {
      credentials: "include",
      signal,
    });
    if (!response.ok) throw new Error("Account status failed");
    const data = (await response.json()) as AccountStatus;
    setAccountStatus(data);
    return data;
  }, []);

  useEffect(() => {
    setHistory(loadHistory());
    setSyncedHistoryIds(loadSyncedHistoryIds());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTemplate = params.get("template");
    const storedTemplate = window.localStorage.getItem(RESUME_TEMPLATE_STORAGE_KEY);
    const nextTemplate = isResumeTemplateSlug(requestedTemplate)
      ? requestedTemplate
      : isResumeTemplateSlug(storedTemplate)
        ? storedTemplate
        : "classic";

    if (isResumeTemplateSlug(requestedTemplate)) saveResumeTemplatePreference(requestedTemplate);

    const frame = window.requestAnimationFrame(() => setSelectedTemplateSlug(nextTemplate));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!accountPanelOpen) return;

    const closeFromOutside = (event: PointerEvent) => {
      if (accountMenuRef.current?.contains(event.target as Node)) return;
      setAccountPanelOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountPanelOpen(false);
    };

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [accountPanelOpen]);

  const refreshSavedRuns = useCallback(async (options: { quiet?: boolean } = {}) => {
    if (!signedIn) {
      setHistorySyncState("local");
      setHistorySyncMessage("Sign in to sync completed runs");
      return;
    }

    if (!accountReady) {
      setHistorySyncState("error");
      setHistorySyncMessage("Saved projects are reconnecting. Browser history still works.");
      return;
    }

    setHistorySyncState("loading");
    if (!options.quiet) setHistorySyncMessage("Loading saved projects...");

    try {
      const savedRuns = await loadSavedRuns();
      const savedHistory = savedRuns.map((run) => ({
        ...run,
        source: "account" as const,
        snapshot: run.snapshot as SavedRunSnapshot | undefined,
      }));

      setHistory((current) => {
        const merged = mergeHistory(current.length ? current : loadHistory(), savedHistory);
        saveHistory(merged);
        return merged;
      });

      const savedIds = savedRuns.flatMap((run) => [run.id, run.accountRunId].filter(Boolean) as string[]);
      setSyncedHistoryIds(savedIds);
      saveSyncedHistoryIds(savedIds);
      setHistorySyncState("synced");
      setHistorySyncMessage(
        savedRuns.length
          ? `${savedRuns.length} saved project${savedRuns.length === 1 ? "" : "s"} ready to restore`
          : "Signed in. Completed runs will save here.",
      );
    } catch (caught) {
      setHistorySyncState("error");
      setHistorySyncMessage(
        caught instanceof Error && /sign in/i.test(caught.message)
          ? "Sign in again to load saved projects."
          : "Saved projects are taking a moment to load. Browser history still works.",
      );
    }
  }, [accountReady, signedIn]);

  useEffect(() => {
    void refreshSavedRuns();
  }, [refreshSavedRuns]);

  const scrollToHistoryPanel = useCallback((behavior: ScrollBehavior = "smooth") => {
    let attempts = 0;
    const scrollWhenReady = () => {
      const target = historySectionRef.current;
      if (target) {
        const marginTop = window.matchMedia("(max-width: 1180px)").matches ? 24 : 128;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - marginTop;
        scrollDocumentTo(targetTop, attempts === 0 ? behavior : "auto");
      }

      attempts += 1;
      if (attempts <= 8) {
        window.setTimeout(scrollWhenReady, 80);
      }
    };

    window.setTimeout(scrollWhenReady, 30);
  }, []);

  const scrollToHistoryDetails = useCallback((behavior: ScrollBehavior = "smooth") => {
    let attempts = 0;
    const scrollWhenReady = () => {
      const target = historyDetailRef.current;
      if (target) {
        const compact = window.matchMedia("(max-width: 900px)").matches;
        const viewportOffset = compact ? 24 : Math.max(96, (window.innerHeight - target.offsetHeight) / 2);
        const targetTop = target.getBoundingClientRect().top + window.scrollY - viewportOffset;
        scrollDocumentTo(targetTop, attempts === 0 ? behavior : "auto");
        target.focus({ preventScroll: true });
      }

      attempts += 1;
      if (attempts <= 6) {
        window.setTimeout(scrollWhenReady, 70);
      }
    };

    window.setTimeout(scrollWhenReady, 30);
  }, []);

  const openHistoryPanel = useCallback(() => {
    setActiveTab("history");
    setAccountPanelOpen(false);
    setHistoryScrollRequest((request) => request + 1);
    window.setTimeout(() => scrollToHistoryPanel("auto"), 0);
  }, [scrollToHistoryPanel]);

  useEffect(() => {
    if (activeTab !== "history" || historyScrollRequest === 0) return;
    scrollToHistoryPanel("auto");
  }, [activeTab, historyScrollRequest, scrollToHistoryPanel]);

  function openHistoryDetails(entry: HistoryItem) {
    setSelectedHistoryId(entry.id);
    setAccountPanelOpen(false);
    setProjectActionMessage("");
    scrollToHistoryDetails();
  }

  function closeHistoryDetails() {
    setSelectedHistoryId(null);
    setProjectActionMessage("");
  }

  function startNewResume() {
    setFile(null);
    setFileInputVersion((version) => version + 1);
    setResumeId(null);
    setUploadMeta(null);
    setUploadFileKey("");
    setPreviewUploadState("idle");
    setPreviewUploadError("");
    setSourcePreviewText("");
    setResult(null);
    setDownloadUrl(null);
    setDownloadFormat("pdf");
    setSelectedExportFormat("pdf");
    setDownloadState("idle");
    setDownloadMessage("");
    setJdUrl("");
    setJdText("");
    setCompanyUrl("");
    setInputMode("text");
    setTailoringMode("balanced");
    setStage("idle");
    setError("");
    setWorkflowError(null);
    setExportNotice(null);
    setCopyState("New resume ready");
    setAssetCopyState("");
    setRestoredHistoryId(null);
    setSelectedHistoryId(null);
    setHistoryExportRequest(null);
    setAccountPanelOpen(false);
    setPreviewMode("original");
    setActiveTab("score");

    window.setTimeout(() => {
      document.getElementById("input")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 30);
  }

  const openGeneratedAsset = useCallback((asset: "cover" | "interview", options: { behavior?: ScrollBehavior; updateHash?: boolean } = {}) => {
    const targetId = asset === "cover" ? "cover-letter" : "interview-prep";
    const nextHash = `#${targetId}`;
    setActiveTab(asset);

    if (options.updateHash !== false && window.location.hash !== nextHash) {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }

    let attempts = 0;
    const scrollWhenReady = () => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: attempts === 0 ? options.behavior ?? "smooth" : "auto",
        block: "start",
      });

      attempts += 1;
      if (attempts <= 8) {
        window.setTimeout(scrollWhenReady, 80);
      }
    };

    window.setTimeout(scrollWhenReady, 30);
  }, []);

  const openPreviewMode = useCallback((mode: PreviewMode, options: { behavior?: ScrollBehavior; updateHash?: boolean } = {}) => {
    const nextHash =
      mode === "original"
        ? "#preview-original"
        : mode === "diff"
          ? "#preview-changes"
          : "#preview-tailored";
    setPreviewMode(mode);
    setActiveTab(mode === "diff" ? "changes" : "resume");

    if (options.updateHash !== false && window.location.hash !== nextHash) {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }

    let attempts = 0;
    const scrollWhenReady = () => {
      document.getElementById("preview")?.scrollIntoView({
        behavior: attempts === 0 ? options.behavior ?? "smooth" : "auto",
        block: "start",
      });

      attempts += 1;
      if (attempts <= 8) {
        window.setTimeout(scrollWhenReady, 80);
      }
    };

    window.setTimeout(scrollWhenReady, 30);
  }, []);

  const movePreviewTab = useCallback((mode: PreviewMode) => {
    openPreviewMode(mode, { behavior: "auto" });
    window.setTimeout(() => {
      document.getElementById(`preview-tab-${mode}`)?.focus({ preventScroll: true });
    }, 40);
  }, [openPreviewMode]);

  const openAccountSummaryLink = useCallback((event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setAccountPanelOpen(false);

    if (href !== "/app#history") return;

    event.preventDefault();
    if (window.location.hash !== "#history") {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#history`);
    }
    openHistoryPanel();
  }, [openHistoryPanel]);

  function onPreviewTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const modes: PreviewMode[] = ["tailored", "original", "diff"];
    const currentIndex = modes.indexOf(previewMode);
    const keyActions: Record<string, PreviewMode> = {
      ArrowRight: modes[(currentIndex + 1) % modes.length],
      ArrowDown: modes[(currentIndex + 1) % modes.length],
      ArrowLeft: modes[(currentIndex - 1 + modes.length) % modes.length],
      ArrowUp: modes[(currentIndex - 1 + modes.length) % modes.length],
      Home: modes[0],
      End: modes[modes.length - 1],
    };
    const nextMode = keyActions[event.key];
    if (!nextMode) return;
    event.preventDefault();
    movePreviewTab(nextMode);
  }

  useEffect(() => {
    function openHashTarget() {
      if (window.location.hash === "#history") {
        openHistoryPanel();
        return;
      }
      if (window.location.hash === "#cover-letter") {
        openGeneratedAsset("cover", { behavior: "auto", updateHash: false });
        return;
      }
      if (window.location.hash === "#interview-prep") {
        openGeneratedAsset("interview", { behavior: "auto", updateHash: false });
        return;
      }
      if (window.location.hash === "#preview-tailored") {
        openPreviewMode("tailored", { behavior: "auto", updateHash: false });
        return;
      }
      if (window.location.hash === "#preview-original") {
        openPreviewMode("original", { behavior: "auto", updateHash: false });
        return;
      }
      if (window.location.hash === "#preview-changes") {
        openPreviewMode("diff", { behavior: "auto", updateHash: false });
      }
    }

    openHashTarget();
    window.addEventListener("hashchange", openHashTarget);

    return () => window.removeEventListener("hashchange", openHashTarget);
  }, [openGeneratedAsset, openHistoryPanel, openPreviewMode]);

  function clearHistoryHash() {
    if (!["#history", "#cover-letter", "#interview-prep", "#preview-tailored", "#preview-original", "#preview-changes"].includes(window.location.hash)) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  function scrollToStudioEditor(behavior: ScrollBehavior = "smooth") {
    clearHistoryHash();

    let attempts = 0;
    const scrollWhenReady = () => {
      const target = editorSectionRef.current;
      if (target) {
        target.scrollIntoView({ behavior: attempts === 0 ? behavior : "auto", block: "start" });
        target.focus({ preventScroll: true });
      }

      attempts += 1;
      if (attempts <= 8) {
        window.setTimeout(scrollWhenReady, 80);
      }
    };

    window.setTimeout(scrollWhenReady, 30);
  }

  useEffect(() => {
    const controller = new AbortController();

    refreshAccountStatus(controller.signal)
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") {
          setAccountStatus({
            configured: true,
            enabled: false,
            provider: "supabase",
            user: null,
            next: "Account access could not be confirmed.",
          });
        }
      });

    return () => controller.abort();
  }, [refreshAccountStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const account = params.get("account");
    const notice = accountNoticeLabel(account ?? "", params.get("auth_error") ?? "");

    if (notice) {
      setAccountNotice(notice);
      setAccountPanelOpen(true);
      params.delete("account");
      params.delete("auth_error");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    } else if (account === "signin") {
      setAccountPanelOpen(true);
      params.delete("account");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    if (!baseUrl) {
      setCapabilities(null);
      return;
    }

    const controller = new AbortController();
    fetch(`${baseUrl}/capabilities`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Capability check failed");
        return normalizeWorkflowCapabilities(await response.json());
      })
      .then((data) => setCapabilities(data))
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") setCapabilities(null);
      });

    return () => controller.abort();
  }, [baseUrl]);

  useEffect(() => {
    const currentFileKey = fileUploadKey(file);

    if (!file) {
      if (restoredHistoryId) return;
      setResumeId(null);
      setUploadMeta(null);
      setUploadFileKey("");
      setPreviewUploadState("idle");
      setPreviewUploadError("");
      setSourcePreviewText("");
      setResult(null);
      setDownloadUrl(null);
      setDownloadFormat("pdf");
      setSelectedExportFormat("pdf");
      setDownloadState("idle");
      setDownloadMessage("");
      return;
    }

    const controller = new AbortController();

    setResumeId(null);
    setUploadMeta(null);
    setUploadFileKey(currentFileKey);
    setPreviewUploadState(baseUrl ? "reading" : "idle");
    setPreviewUploadError("");
    setSourcePreviewText("");
    setResult(null);
    setDownloadUrl(null);
    setDownloadFormat("pdf");
    setSelectedExportFormat("pdf");
    setStage("idle");
    setError("");
    setWorkflowError(null);
    setExportNotice(null);
    setCopyState("");
    setPreviewMode("original");
    setRestoredHistoryId(null);

    if (/\.txt$/i.test(file.name)) {
      file.text()
        .then((value) => {
          if (!controller.signal.aborted) setSourcePreviewText(value.slice(0, 30000));
        })
        .catch(() => {
          if (!controller.signal.aborted) setSourcePreviewText("");
        });
    }

    if (!baseUrl) return () => controller.abort();

    const form = new FormData();
    form.append("file", file);

    workflowHeaders()
      .then((headers) => fetch(`${baseUrl}/upload`, { method: "POST", body: form, headers, signal: controller.signal }))
      .then(async (response) => {
        if (!response.ok) throw await readApiError(response, "Could not read this resume yet.");
        return (await response.json()) as UploadResponse;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setResumeId(data.resume_id);
        setUploadMeta(data);
        setUploadFileKey(currentFileKey);
        if (typeof data.text_preview === "string") setSourcePreviewText(data.text_preview);
        setPreviewUploadState("ready");
      })
      .catch((caught) => {
        if ((caught as Error).name === "AbortError") return;
        setPreviewUploadState("error");
        setPreviewUploadError(caught instanceof Error ? caught.message : "Could not read this resume yet.");
      });

    return () => {
      controller.abort();
    };
  }, [baseUrl, file, restoredHistoryId, workflowHeaders]);

  useEffect(() => {
    if (!downloadUrl) {
      setDownloadState("idle");
      setDownloadMessage("");
      return;
    }

    if (!exportFormatAllowed(downloadFormat, accountStatus?.entitlement)) {
      setDownloadState("expired");
      setDownloadMessage(`${downloadFormat.toUpperCase()} export requires Premium. Switch to PDF or upgrade to download this format.`);
      return;
    }

    const controller = new AbortController();
    setDownloadState("checking");
    setDownloadMessage(`Checking ${downloadFormat.toUpperCase()} download...`);

    fetch(downloadUrl, {
      method: "HEAD",
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        const status = downloadStatusFromHead(downloadFormat, response.status);
        setDownloadState(status.state);
        setDownloadMessage(status.message);
      })
      .catch((caught) => {
        if ((caught as Error).name === "AbortError") return;
        setDownloadState("expired");
        setDownloadMessage(`This ${downloadFormat.toUpperCase()} link could not be checked. Run the export again if the download does not open.`);
      });

    return () => controller.abort();
  }, [accountStatus?.entitlement, downloadFormat, downloadUrl]);

  const hasTarget = Boolean(jdUrl.trim() || jdText.trim());
  const readyItems = [Boolean(baseUrl), Boolean(file), hasTarget];
  const readiness = Math.round((readyItems.filter(Boolean).length / readyItems.length) * 100);
  const tailorAction = tailorActionState({
    accountConfigured: Boolean(accountStatus?.configured),
    signedIn,
    limitReached,
    busy,
    readingResume: previewUploadState === "reading",
    restoredWithoutFile: Boolean(result && !file),
    hasResult: Boolean(result),
    hasFile: Boolean(file),
    hasTarget,
    backendReady: Boolean(baseUrl),
  });
  const canRun = tailorAction.canRun;

  const score = result?.score_summary?.fit_after ?? result?.fit_score_after?.score ?? result?.fit_score?.score ?? 0;
  const presentKeywords = result?.fit_score_after?.present ?? result?.fit_score?.present ?? [];
  const missingKeywords = result?.fit_score_after?.missing ?? result?.fit_score?.missing ?? [];
  const atsIssues = result?.ats_after?.issues ?? [];
  const gapEvidence = result?.gap_analysis?.evidence_to_add ?? [];
  const interviewPrep = result?.interview_prep ?? [];
  const warnings = result?.warnings ?? [];

  async function upload(): Promise<UploadResponse> {
    if (!baseUrl) throw new Error("Resume tailoring is temporarily unavailable. Try again shortly.");
    if (!file) throw new Error("Select a resume file first.");
    const currentFileKey = fileUploadKey(file);

    if (resumeId && uploadMeta && uploadFileKey === currentFileKey) {
      return uploadMeta;
    }

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form, headers: await workflowHeaders() });
    if (!response.ok) throw await readApiError(response, "The resume could not be uploaded. Try another file or try again.");

    const data = (await response.json()) as UploadResponse;
    setResumeId(data.resume_id);
    setUploadMeta(data);
    setUploadFileKey(currentFileKey);
    setPreviewUploadState("ready");
    setPreviewUploadError("");
    if (typeof data.text_preview === "string") setSourcePreviewText(data.text_preview);
    return data;
  }

  async function tailor(resume_id: string): Promise<TailorResult> {
    if (!baseUrl) throw new Error("Resume tailoring is temporarily unavailable. Try again shortly.");

    const isHttp = (value: string) => /^https?:\/\//i.test(value.trim());
    const payload: {
      resume_id: string;
      jd_url?: string;
      jd_text?: string;
      company_url?: string;
      tailoring_mode: TailoringMode;
    } = { resume_id, tailoring_mode: tailoringMode };

    if (jdUrl.trim() && isHttp(jdUrl)) payload.jd_url = jdUrl.trim();
    if (jdText.trim()) payload.jd_text = jdText.trim();
    if (companyUrl.trim() && isHttp(companyUrl)) payload.company_url = companyUrl.trim();

    const response = await fetch(`${baseUrl}/tailor`, {
      method: "POST",
      headers: await workflowHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw await readApiError(response, "The tailored draft could not be created. Try again in a moment.");

    const data = (await response.json()) as TailorResult;
    setResult(data);
    return data;
  }

  async function exportResume(
    tailoredText: string,
    format: ExportFormat = "pdf",
    options: { templateSlug?: ResumeTemplateSlug; updateActiveDownload?: boolean } = {},
  ): Promise<string> {
    if (!baseUrl) throw new Error("Export is temporarily unavailable. Try again shortly.");
    const requestedTemplateSlug = options.templateSlug ?? selectedTemplateSlug;
    const advertisedTemplates = capabilities?.export_templates ?? [];
    const templateSlug =
      advertisedTemplates.length && !advertisedTemplates.some((template) => template.template === requestedTemplateSlug)
        ? "classic"
        : requestedTemplateSlug;

    const response = await fetch(`${baseUrl}/export`, {
      method: "POST",
      headers: await workflowHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(buildWorkflowExportPayload(tailoredText, format, templateSlug)),
    });
    if (!response.ok) throw await readApiError(response, "The export could not be created. Try again in a moment.");

    const data = (await response.json()) as ExportResponse;
    const url = workflowDownloadUrl(data.download_filename);
    if (options.updateActiveDownload ?? true) {
      setDownloadUrl(url);
      setDownloadFormat(format);
      setDownloadState("checking");
      setDownloadMessage(`Checking ${format.toUpperCase()} download...`);
    }
    return url;
  }

  async function syncCompletedRun(
    item: HistoryItem,
    output: TailorResult,
    url: string,
    options: { countUsage?: boolean; preserveSuccessOnFailure?: boolean; successMessage?: string } = {},
  ) {
    if (!signedIn || !accountReady) {
      setHistorySyncState("local");
      setHistorySyncMessage(signedIn ? "Saved projects are reconnecting. Browser history still works." : "Sign in to sync completed runs");
      return false;
    }

    const outputPresent = output.fit_score_after?.present ?? output.fit_score?.present ?? [];
    const outputReadSeconds = output.tailored_text
      ? Math.max(20, Math.round((output.tailored_text.split(/\s+/).length / 220) * 60))
      : undefined;

    if (!options.preserveSuccessOnFailure) {
      setHistorySyncState("saving");
      setHistorySyncMessage("Saving completed run...");
    }

    try {
      const savedRun = await saveCompletedRun({
        ...item,
        sourceResumeName: item.filename,
        jobTarget: item.snapshot?.jdText?.trim() || item.snapshot?.jdUrl?.trim() || jdText.trim() || jdUrl.trim() || item.roleHint,
        companyUrl: item.snapshot?.companyUrl?.trim() || companyUrl.trim() || undefined,
        atsScore: output.score_summary?.ats_after,
        keywordMatchCount: outputPresent.length,
        readTimeSeconds: outputReadSeconds,
        downloadFilename: url.split("/").pop(),
        payload: {
          studioSnapshot: item.snapshot,
          runId: output.run_id,
          generatedAt: output.generated_at,
          warnings: output.warnings ?? [],
          suggestions: output.suggestions ?? [],
          changeLog: output.change_log ?? [],
        },
      });

      setSyncedHistoryIds((currentIds) => {
        const nextIds = [item.id, savedRun.runId, ...currentIds.filter((id) => id !== item.id && id !== savedRun.runId)].slice(0, 40);
        saveSyncedHistoryIds(nextIds);
        return nextIds;
      });
      setHistory((current) => {
        const next = current.map((entry) =>
          entry.id === item.id
            ? { ...entry, accountRunId: savedRun.runId, projectId: savedRun.projectId, projectTitle: item.roleHint, saved: true, source: "account" as const }
            : entry,
        );
        saveHistory(next);
        return next;
      });
      setHistorySyncState("synced");
      setHistorySyncMessage(
        options.successMessage ??
          (options.countUsage === false ? `${item.downloadFormat?.toUpperCase() ?? "Export"} saved to this project` : "Saved to your account and ready to restore"),
      );
      if (options.countUsage === false) return true;

      const refreshed = await refreshAccountStatus()
        .then(() => true)
        .catch(() => false);

      if (refreshed) return true;

      setAccountStatus((current) => {
        if (!current?.usage) return current;
        const monthlyRuns = current.usage.monthlyRuns + 1;
        const remainingRuns =
          typeof current.usage.monthlyRunLimit === "number"
            ? Math.max(0, current.usage.monthlyRunLimit - monthlyRuns)
            : null;

        return {
          ...current,
          usage: {
            ...current.usage,
            monthlyRuns,
            remainingRuns,
            runLimited: typeof current.usage.monthlyRunLimit === "number" && monthlyRuns >= current.usage.monthlyRunLimit,
          },
        };
      });
      return true;
    } catch {
      if (options.preserveSuccessOnFailure) {
        setHistorySyncState(isAccountHistoryItem(item, syncedHistoryIds) ? "synced" : "local");
        return false;
      }
      setHistorySyncState("error");
      setHistorySyncMessage("This run could not save to your account yet. It is still saved in this browser.");
      return false;
    }
  }

  async function syncLocalHistoryToAccount() {
    if (!signedIn || !accountReady) {
      setHistorySyncState("error");
      setHistorySyncMessage(signedIn ? "Saved projects are reconnecting. Browser history still works." : "Sign in to sync browser runs.");
      return;
    }

    const syncableItems = syncableLocalHistoryItems(history, syncedHistoryIds);
    if (!syncableItems.length) {
      setHistorySyncState("synced");
      setHistorySyncMessage("No restore-ready browser runs need account sync.");
      return;
    }

    setHistorySyncState("saving");
    setHistorySyncMessage(`Saving ${syncableItems.length} browser run${syncableItems.length === 1 ? "" : "s"} to your account...`);

    let savedCount = 0;
    for (const item of syncableItems) {
      const output = item.snapshot?.result;
      if (!output?.tailored_text?.trim()) continue;

      const download = primaryHistoryDownload(item, accountStatus?.entitlement);
      const url = normalizeWorkflowDownloadUrl(download?.url || item.downloadUrl || item.snapshot?.downloadUrl || "#");
      const saved = await syncCompletedRun(item, output, url, {
        countUsage: false,
        preserveSuccessOnFailure: true,
      });
      if (saved) savedCount += 1;
    }

    if (savedCount) {
      await refreshSavedRuns({ quiet: true });
      setHistorySyncState("synced");
      setHistorySyncMessage(`${savedCount} browser run${savedCount === 1 ? "" : "s"} saved to your account.`);
      return;
    }

    setHistorySyncState("error");
    setHistorySyncMessage("Browser runs could not sync. They are still saved in this browser.");
  }

  function updateCurrentHistoryExport(url: string, format: ExportFormat) {
    let updatedItem: HistoryItem | null = null;

    const nextHistory = history.map((entry) => {
      if (!historyEntryIsOpenInStudio(entry)) return entry;

      const nextDownloads = { ...historyDownloads(entry), [format]: url };
      const nextSnapshot = entry.snapshot
        ? { ...entry.snapshot, downloadUrl: url, downloadFormat: format, downloads: nextDownloads }
        : entry.snapshot;
      const nextEntry = { ...entry, downloadUrl: url, downloadFormat: format, downloads: nextDownloads, snapshot: nextSnapshot };
      updatedItem = nextEntry;
      return nextEntry;
    });

    if (updatedItem) {
      setHistory(nextHistory);
      saveHistory(nextHistory);
    }

    return updatedItem;
  }

  function historyEntryIsOpenInStudio(entry: HistoryItem) {
    const matchIds = new Set([restoredHistoryId, result?.run_id, resumeId, uploadMeta?.resume_id].filter(Boolean) as string[]);
    const snapshotRunId = entry.snapshot?.result?.run_id;
    const snapshotResumeId = entry.snapshot?.uploadMeta?.resume_id;

    return (
      matchIds.has(entry.id) ||
      Boolean(entry.accountRunId && matchIds.has(entry.accountRunId)) ||
      Boolean(snapshotRunId && matchIds.has(snapshotRunId)) ||
      Boolean(snapshotResumeId && matchIds.has(snapshotResumeId))
    );
  }

  function updateHistoryEntryExport(entry: HistoryItem, url: string, format: ExportFormat) {
    let updatedItem: HistoryItem | null = null;

    const nextHistory = history.map((candidate) => {
      if (candidate.id !== entry.id) return candidate;

      const nextDownloads = { ...historyDownloads(candidate), [format]: url };
      const nextSnapshot = candidate.snapshot
        ? { ...candidate.snapshot, downloadUrl: url, downloadFormat: format, downloads: nextDownloads }
        : candidate.snapshot;
      const nextEntry = { ...candidate, downloadUrl: url, downloadFormat: format, downloads: nextDownloads, snapshot: nextSnapshot };
      updatedItem = nextEntry;
      return nextEntry;
    });

    setHistory(nextHistory);
    saveHistory(nextHistory);
    return updatedItem;
  }

  async function exportHistoryItem(entry: HistoryItem, format: ExportFormat) {
    const tailoredText = entry.snapshot?.result?.tailored_text?.trim();
    const label = format.toUpperCase();

    if (!tailoredText) {
      setHistorySyncState("error");
      setHistorySyncMessage("This saved run can be downloaded, but it cannot be reopened in the studio.");
      return;
    }

    if (!exportFormatAllowed(format, accountStatus?.entitlement)) {
      setExportNotice({ format, label });
      setHistorySyncState("local");
      setHistorySyncMessage(`${label} exports unlock with Premium. PDF is still available.`);
      return;
    }

    setHistoryExportRequest({ id: entry.id, format });
    setHistorySyncState("saving");
    setHistorySyncMessage(`Creating ${label} export...`);
    setError("");
    setWorkflowError(null);
    setExportNotice(null);

    try {
      const updatesActiveStudioDownload = historyEntryIsOpenInStudio(entry);
      const url = await exportResume(tailoredText, format, {
        templateSlug: isResumeTemplateSlug(entry.snapshot?.templateSlug) ? entry.snapshot.templateSlug : selectedTemplateSlug,
        updateActiveDownload: updatesActiveStudioDownload,
      });
      const updatedItem = updateHistoryEntryExport(entry, url, format);
      setSelectedHistoryId(entry.id);
      if (updatesActiveStudioDownload) {
        setDownloadFormat(format);
        setSelectedExportFormat(format);
      }
      setCopyState(`${label} export ready`);
      setHistorySyncState(isAccountHistoryItem(entry, syncedHistoryIds) ? "synced" : "local");
      setHistorySyncMessage(`${label} export ready for ${entry.filename}`);

      if (updatedItem && entry.snapshot?.result) {
        void syncCompletedRun(updatedItem, entry.snapshot.result, url, { countUsage: false, preserveSuccessOnFailure: true });
      }
    } catch (caught) {
      const nextError = workflowErrorFromCaught(caught, "The export could not be created. Try again in a moment.");
      if (nextError.code === "premium_required") {
        setExportNotice({ format, label });
        setHistorySyncState("local");
        setHistorySyncMessage(`${label} exports unlock with Premium. PDF is still available.`);
      } else {
        setHistorySyncState("error");
        setHistorySyncMessage(`${label} export could not be created. Try again in a moment.`);
      }
    } finally {
      setHistoryExportRequest(null);
    }
  }

  function buildRunSnapshot(output: TailorResult, uploadData: UploadResponse, url: string, format: ExportFormat = "pdf"): SavedRunSnapshot {
    return {
      result: output,
      sourcePreviewText: typeof uploadData.text_preview === "string" ? uploadData.text_preview : sourcePreviewText,
      uploadMeta: uploadData,
      jdText,
      jdUrl,
      companyUrl,
      inputMode,
      tailoringMode: output.tailoring_mode ?? tailoringMode,
      downloadUrl: url,
      downloadFormat: format,
      downloads: { [format]: url },
      templateSlug: selectedTemplateSlug,
      templateName: getResumeTemplate(selectedTemplateSlug).name,
    };
  }

  const restoreHistoryItem = useCallback((entry: HistoryItem) => {
    const snapshot = entry.snapshot;
    if (!snapshot?.result?.tailored_text?.trim()) {
      setHistorySyncState("error");
      setHistorySyncMessage("This older run has a download link, but cannot be reopened in the studio.");
      return;
    }

    setFile(null);
    setResumeId(snapshot.uploadMeta?.resume_id ?? snapshot.result.run_id ?? entry.accountRunId ?? entry.id);
    setUploadMeta(snapshot.uploadMeta ?? {
      resume_id: snapshot.result.run_id ?? entry.accountRunId ?? entry.id,
      filename: entry.filename,
      format: entry.downloadFormat,
    });
    setUploadFileKey("");
    setPreviewUploadState(snapshot.sourcePreviewText?.trim() ? "ready" : "idle");
    setPreviewUploadError("");
    setSourcePreviewText(snapshot.sourcePreviewText ?? "");
    setResult(snapshot.result);
    const restoredDownload = restoredHistoryDownloadSelection(entry, accountStatus?.entitlement);
    setDownloadUrl(restoredDownload.url ? normalizeWorkflowDownloadUrl(restoredDownload.url) : null);
    setDownloadFormat(restoredDownload.format);
    setSelectedExportFormat(restoredDownload.format);
    setJdText(snapshot.jdText ?? "");
    setJdUrl(snapshot.jdUrl ?? "");
    setCompanyUrl(snapshot.companyUrl ?? "");
    setInputMode(snapshot.inputMode ?? (snapshot.jdUrl ? "url" : "text"));
    setTailoringMode(snapshot.tailoringMode ?? entry.mode);
    if (isResumeTemplateSlug(snapshot.templateSlug)) {
      setSelectedTemplateSlug(snapshot.templateSlug);
      saveResumeTemplatePreference(snapshot.templateSlug);
    }
    setStage("ready");
    setError("");
    setWorkflowError(null);
    setExportNotice(null);
    setCopyState("");
    setAccountPanelOpen(false);
    setSelectedHistoryId(entry.id);
    setRestoredHistoryId(entry.id);
    setHistorySyncState(isAccountHistoryItem(entry, syncedHistoryIds) ? "synced" : "local");
    setHistorySyncMessage(`${entry.filename} is open in the studio`);
    setCopyState(`${entry.filename} restored`);
    openPreviewMode("tailored");
  }, [accountStatus?.entitlement, openPreviewMode, syncedHistoryIds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const historyRunId = params.get("historyRun")?.trim();
    const historyAction = params.get("historyAction")?.trim();
    const shouldRestore = historyAction === "restore";
    const historyRequestKey = `${historyRunId ?? ""}:${historyAction ?? ""}`;
    if (!historyRunId || handledHistoryRunRef.current === historyRequestKey || !history.length || accountStatus === null) return;

    const entry = history.find((item) =>
      [item.id, item.accountRunId, item.projectId].filter(Boolean).includes(historyRunId),
    );
    if (!entry) return;

    handledHistoryRunRef.current = historyRequestKey;
    setHistoryFilter("all");
    setExpandedHistoryGroupKey(historyGroupKey(entry, syncedHistoryIds));
    setSelectedHistoryId(entry.id);

    params.delete("historyRun");
    params.delete("historyAction");
    if (shouldRestore && hasRestorableSnapshot(entry)) {
      restoreHistoryItem(entry);
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}#preview-tailored`;
      window.history.replaceState(null, "", nextUrl);
      return;
    }

    setProjectActionMessage(`${entry.filename} is selected in History.`);
    openHistoryPanel();
    window.setTimeout(() => scrollToHistoryDetails("auto"), 260);

    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}#history`;
    window.history.replaceState(null, "", nextUrl);
  }, [accountStatus, history, openHistoryPanel, restoreHistoryItem, scrollToHistoryDetails, syncedHistoryIds]);

  async function duplicateCurrentRun() {
    if (!result?.tailored_text?.trim() || !uploadMeta || !downloadUrl) return;

    const sourceHistoryItem = restoredHistoryId ? history.find((entry) => entry.id === restoredHistoryId) : null;
    const copiedDownloads = {
      ...(sourceHistoryItem ? historyDownloads(sourceHistoryItem) : {}),
      [downloadFormat]: downloadUrl,
    };
    const duplicateId = `${result.run_id ?? resumeId ?? uploadMeta.resume_id}-copy-${Date.now()}`;
    const snapshot: SavedRunSnapshot = {
      ...buildRunSnapshot(result, uploadMeta, downloadUrl, downloadFormat),
      downloads: copiedDownloads,
    };
    const item: HistoryItem = {
      id: duplicateId,
      createdAt: new Date().toISOString(),
      filename: uploadMeta.filename || file?.name || "resume",
      mode: result.tailoring_mode ?? tailoringMode,
      score: result.score_summary?.fit_after ?? result.fit_score_after?.score ?? result.fit_score?.score ?? 0,
      downloadUrl,
      downloadFormat,
      downloads: copiedDownloads,
      roleHint: (jdText || jdUrl || companyUrl || "Role target").slice(0, 90),
      saved: false,
      source: "local",
      snapshot,
    };

    setHistory((current) => {
      const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 12);
      saveHistory(next);
      return next;
    });
    setSelectedHistoryId(item.id);
    setRestoredHistoryId(item.id);
    setHistoryFilter("all");
    setHistorySyncState("local");
    setCopyState("Duplicated in this browser");
    openHistoryPanel();

    if (!signedIn || !accountReady) {
      setHistorySyncMessage(
        signedIn
          ? `${item.filename} duplicated in this browser. Account sync is reconnecting.`
          : `${item.filename} duplicated in this browser.`,
      );
      return;
    }

    setHistorySyncState("saving");
    setHistorySyncMessage(`${item.filename} duplicated in this browser. Saving to your account...`);
    const saved = await syncCompletedRun(item, result, downloadUrl, {
      countUsage: false,
      preserveSuccessOnFailure: true,
      successMessage: `${item.filename} duplicated to your account.`,
    });

    if (saved) {
      setCopyState("Duplicated to account");
      return;
    }

    setHistorySyncState("local");
    setHistorySyncMessage(`${item.filename} duplicated in this browser. Use Save local to add it to your account.`);
  }

  function clearLocalHistory() {
    const removableCount = signedIn
      ? history.filter((entry) => !isAccountHistoryItem(entry, syncedHistoryIds)).length
      : history.length;

    if (!removableCount) return;

    const runLabel = `${removableCount} browser run${removableCount === 1 ? "" : "s"}`;
    const next = signedIn ? history.filter((entry) => isAccountHistoryItem(entry, syncedHistoryIds)) : [];
    setHistory(next);
    saveHistory(next);
    setRestoredHistoryId((current) => (current && next.some((entry) => entry.id === current) ? current : null));
    setSelectedHistoryId((current) => (current && next.some((entry) => entry.id === current) ? current : null));
    setProjectActionMessage("");
    setConfirmingClearHistory(false);
    setHistorySyncState(signedIn ? "synced" : "local");
    setHistorySyncMessage(signedIn ? `Cleared ${runLabel}. Account projects are still saved.` : `Cleared ${runLabel}.`);
  }

  function startRenameProject(entry: HistoryItem) {
    if (!entry.projectId) return;
    setEditingProjectId(entry.projectId);
    setEditingProjectTitle(historyProjectTitle(entry, syncedHistoryIds));
    setProjectActionMessage("");
    setConfirmingDeleteProjectId(null);
  }

  async function submitProjectRename(entry: HistoryItem) {
    if (!accountReady || !entry.projectId) return;

    setProjectActionId(entry.id);
    setProjectActionMessage("");

    try {
      const title = await renameSavedProject(entry.projectId, editingProjectTitle);
      setHistory((current) => {
        const next = current.map((item) =>
          item.projectId === entry.projectId ? { ...item, projectTitle: title, roleHint: item.roleHint || title } : item,
        );
        saveHistory(next);
        return next;
      });
      setEditingProjectId(null);
      setEditingProjectTitle("");
      setHistorySyncState("synced");
      setHistorySyncMessage("Saved project renamed");
    } catch {
      setProjectActionMessage("Project name could not be saved. Try again.");
    } finally {
      setProjectActionId(null);
    }
  }

  async function removeSavedProject(entry: HistoryItem) {
    if (!accountReady || !entry.projectId) return;

    setProjectActionId(entry.id);
    setProjectActionMessage("");

    try {
      await deleteSavedProject(entry.projectId);
      setHistory((current) => {
        const next = current.filter((item) => item.projectId !== entry.projectId && item.accountRunId !== entry.accountRunId);
        saveHistory(next);
        return next;
      });
      const removedIds = new Set([entry.id, entry.accountRunId, entry.projectId].filter(Boolean) as string[]);
      const nextSyncedIds = syncedHistoryIds.filter((id) => !removedIds.has(id));
      setSyncedHistoryIds(nextSyncedIds);
      saveSyncedHistoryIds(nextSyncedIds);
      setSelectedHistoryId((current) => (current === entry.id ? null : current));
      setRestoredHistoryId((current) => (current === entry.id ? null : current));
      setHistorySyncState("synced");
      setHistorySyncMessage("Saved project deleted");
    } catch {
      setProjectActionMessage("Saved project could not be deleted. Try again.");
    } finally {
      setProjectActionId(null);
      setConfirmingDeleteProjectId(null);
    }
  }

  async function onRun() {
    if (!canRun) return;

    setBusy(true);
    setError("");
    setWorkflowError(null);
    setExportNotice(null);
    setResult(null);
    setDownloadUrl(null);
    setDownloadFormat("pdf");
    setSelectedExportFormat("pdf");
    setCopyState("");

    let tailoredOutput: TailorResult | null = null;

    try {
      setStage("uploading");
      const uploadData = await upload();
      const id = uploadData.resume_id;
      setStage("tailoring");
      const output = await tailor(id);
      tailoredOutput = output;
      setStage("exporting");
      const url = await exportResume(output.tailored_text, "pdf");
      const snapshot = buildRunSnapshot(output, uploadData, url);
      const item: HistoryItem = {
        id: output.run_id ?? id,
        createdAt: output.generated_at ?? new Date().toISOString(),
        filename: uploadData.filename ?? file?.name ?? "resume",
        mode: output.tailoring_mode ?? tailoringMode,
        score: output.score_summary?.fit_after ?? output.fit_score_after?.score ?? output.fit_score?.score ?? 0,
        downloadUrl: url,
        downloadFormat: "pdf",
        downloads: { pdf: url },
        roleHint: (jdText || jdUrl || "Role target").slice(0, 90),
        saved: false,
        source: "local",
        snapshot,
      };
      const nextHistory = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, 12);
      setHistory(nextHistory);
      saveHistory(nextHistory);
      void syncCompletedRun(item, output, url, { countUsage: true });
      setStage("ready");
      setActiveTab("score");
      setPreviewMode("tailored");
      setRestoredHistoryId(null);
    } catch (caught) {
      const nextError = workflowErrorFromCaught(caught, "The workflow stopped before finishing. Try again in a moment.");
      setWorkflowError(nextError);
      setError(nextError.message);
      if (nextError.code === "plan_limit_reached") {
        const monthlyRuns = numberDetail(nextError.details, "monthly_runs");
        const monthlyRunLimit = numberDetail(nextError.details, "monthly_limit");
        const resetAt = stringDetail(nextError.details, "reset_at");
        setCopyState("Free monthly limit reached");
        setAccountStatus((current) => current?.usage
          ? {
              ...current,
              usage: {
                ...current.usage,
                currentPeriodEnd: resetAt || current.usage.currentPeriodEnd,
                monthlyRuns: monthlyRuns ?? current.usage.monthlyRuns,
                monthlyRunLimit: monthlyRunLimit ?? current.usage.monthlyRunLimit,
                runLimited: true,
                remainingRuns: 0,
              },
            }
          : current);
      } else if (tailoredOutput && signedIn && accountReady) {
        void refreshAccountStatus().catch(() => undefined);
      }
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  async function onExportSelectedFormat() {
    if (!result?.tailored_text || busy) return;

    if (!selectedExportCapability?.enabled) {
      setExportNotice({ format: selectedExportFormat, label: selectedFormatLabel });
      setError("");
      setWorkflowError(null);
      return;
    }

    setBusy(true);
    setError("");
    setWorkflowError(null);
    setExportNotice(null);
    setStage("exporting");

    try {
      const url = await exportResume(result.tailored_text, selectedExportFormat);
      const updatedItem = updateCurrentHistoryExport(url, selectedExportFormat);
      setCopyState(`${selectedExportFormat.toUpperCase()} export ready`);
      if (updatedItem) {
        void syncCompletedRun(updatedItem, result, url, { countUsage: false, preserveSuccessOnFailure: true });
      }
      setStage("ready");
    } catch (caught) {
      const nextError = workflowErrorFromCaught(caught, "The export could not be created. Try again in a moment.");
      if (nextError.code === "premium_required") {
        setExportNotice({ format: selectedExportFormat, label: selectedFormatLabel });
        setError("");
        setWorkflowError(null);
        setStage("ready");
        return;
      }
      setWorkflowError(nextError);
      setError(nextError.message);
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  function onSelectExportFormat(format: ExportCapability) {
    const label = format.label || format.format.toUpperCase();

    if (!format.enabled) {
      setExportNotice({ format: format.format, label });
      setError("");
      setWorkflowError(null);
      return;
    }

    setSelectedExportFormat(format.format);
    setExportNotice(null);

    const restoredEntry = restoredHistoryId ? history.find((entry) => entry.id === restoredHistoryId) : null;
    const restoredDownloadUrl = restoredEntry ? historyDownloads(restoredEntry)[format.format] : null;
    if (!restoredDownloadUrl) return;

    const normalizedDownloadUrl = normalizeWorkflowDownloadUrl(restoredDownloadUrl);
    if (normalizedDownloadUrl !== downloadUrl || downloadFormat !== format.format) {
      setDownloadUrl(normalizedDownloadUrl);
      setDownloadFormat(format.format);
      setDownloadState("checking");
      setDownloadMessage(`Checking ${label} download...`);
    }
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  }

  function selectGeneratedAssetText(elementId: string) {
    const element = document.getElementById(elementId);
    const selection = window.getSelection();
    if (!element || !selection) return false;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    return !selection.isCollapsed;
  }

  async function copyCoverLetter(text: string) {
    const letter = text.trim();
    if (!letter) return;
    setAssetCopyState("Copying cover letter...");
    if (await writeClipboardText(letter)) {
      setAssetCopyState("Cover letter copied");
      window.setTimeout(() => setAssetCopyState(""), 1800);
      return;
    }
    if (selectGeneratedAssetText("generated-cover-letter-copy")) {
      setAssetCopyState("Cover letter selected");
      window.setTimeout(() => setAssetCopyState(""), 2400);
      return;
    }
    setAssetCopyState("Copy unavailable");
  }

  async function copyInterviewPrep() {
    const prep = formatInterviewPrepForClipboard(interviewPrep);
    if (!prep) return;
    setAssetCopyState("Copying interview prep...");
    if (await writeClipboardText(prep)) {
      setAssetCopyState("Interview prep copied");
      window.setTimeout(() => setAssetCopyState(""), 1800);
      return;
    }
    if (selectGeneratedAssetText("generated-interview-prep-copy")) {
      setAssetCopyState("Interview prep selected");
      window.setTimeout(() => setAssetCopyState(""), 2400);
      return;
    }
    setAssetCopyState("Copy unavailable");
  }

  const firstTargetLine = (jdText || jdUrl).split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
  const activeResumeName = (file?.name || uploadMeta?.filename)?.replace(/\.(docx|pdf|txt)$/i, "") || "Resume studio";
  const targetUrlInfo = parseTargetUrl(firstTargetLine);
  const activeRole = targetUrlInfo?.label || firstTargetLine || (hasTarget ? "Role target loaded" : "Add a role target");
  const activeTitle = hasTarget && firstTargetLine ? firstTargetLine : activeResumeName;
  const activeTargetName = targetUrlInfo?.label.replace(/\s+job target$/i, "");
  const activeDetail = result
    ? restoredHistoryId && !file
      ? "Saved run restored · upload the source file to re-tailor"
      : activeTargetName
      ? `Tailored and exported for ${activeTargetName}`
      : hasTarget
        ? "Tailored and exported for the current target"
        : "Tailored and exported from the current workflow"
    : (file || uploadMeta) && hasTarget
      ? "Resume and target ready · run the workflow"
      : (file || uploadMeta)
        ? "Resume selected · add a target and run the workflow"
        : hasTarget
          ? "Job target ready · upload a resume to continue"
          : "Upload a resume, add a job target, then run the workflow";
  const topbarLabel = compactLabel(hasTarget ? activeRole : activeResumeName, 36);
  const heroTitle = activeResumeName;
  const heroLabel = compactLabel(heroTitle, 44);
  const targetLabel = compactLabel(activeRole, 62);
  const atsScore = result?.score_summary?.ats_after ?? result?.fit_score_after?.score ?? score;
  const keywordTotal = presentKeywords.length + missingKeywords.length;
  const readSeconds = result?.tailored_text ? Math.max(20, Math.round((result.tailored_text.split(/\s+/).length / 220) * 60)) : 0;
  const scoreDetail = result?.score_summary?.fit_delta ? `${formatDelta(result.score_summary.fit_delta)} from baseline` : result ? "Run complete" : "Run needed";
  const atsDetail = result?.score_summary?.issues_resolved ? `${result.score_summary.issues_resolved} issues fixed` : result ? "Parser notes returned" : "Waiting for run";
  const keywordDetail = keywordTotal ? `${missingKeywords.length} missing` : "Waiting for target terms";
  const runLabel = tailorAction.label;
  const runDisabledReason = tailorAction.disabledReason;
  const downloadReady = Boolean(downloadUrl && downloadState === "ready");
  const coverLetterText = result?.cover_letter?.trim() ?? "";
  const canDuplicateCurrentRun = Boolean(result?.tailored_text?.trim() && uploadMeta && downloadUrl);
  const hasActiveWorkspace = Boolean(file || uploadMeta || result || downloadUrl || hasTarget || sourcePreviewText.trim() || restoredHistoryId);
  const uploadFormats = capabilities?.upload_formats?.length ? capabilities.upload_formats : DEFAULT_UPLOAD_FORMATS;
  const exportFormats = customerExportFormats(capabilities?.export_formats, accountStatus?.entitlement);
  const selectedExportCapability = exportFormats.find((format) => format.format === selectedExportFormat) ?? exportFormats[0];
  const selectedExportAllowed = Boolean(selectedExportCapability?.enabled);
  const selectedDownloadReady = exportDownloadReadyForSelection({
    downloadFormat,
    downloadState,
    downloadUrl,
    selectedFormat: selectedExportFormat,
    entitlement: accountStatus?.entitlement,
  });
  const topDownloadReady = selectedDownloadReady;
  const selectedFormatLabel = selectedExportFormat.toUpperCase();
  const selectedTemplate = getResumeTemplate(selectedTemplateSlug);
  const backendExportTemplates = capabilities?.export_templates ?? [];
  const selectedTemplateSupported =
    !backendExportTemplates.length || backendExportTemplates.some((template) => template.template === selectedTemplateSlug);
  const selectedTemplateStatus = backendExportTemplates.length
    ? selectedTemplateSupported
      ? "Export ready"
      : "Classic fallback"
    : "Selected";
  const currentDownloadLabel = downloadFormat.toUpperCase();
  const premiumExportFormat = stringDetail(workflowError?.details, "format")?.toUpperCase() ?? selectedFormatLabel;
  const premiumExportRequested = exportNotice ?? (workflowError?.code === "premium_required" ? { format: selectedExportFormat, label: premiumExportFormat } : null);
  const topExportLabel = topDownloadReady
    ? `Download ${currentDownloadLabel}`
    : result?.tailored_text?.trim()
      ? `Export ${selectedFormatLabel}`
      : "Export";
  const topExportTitle = topDownloadReady
    ? `Download the ready ${currentDownloadLabel} file`
    : result?.tailored_text?.trim()
      ? selectedExportAllowed
        ? `Create a ${selectedFormatLabel} export`
        : `${selectedFormatLabel} exports require Premium`
      : "Run Tailor before exporting";
  const exportLabel = selectedDownloadReady
    ? `Download ${selectedFormatLabel}`
    : downloadFormat === selectedExportFormat && downloadState === "checking"
      ? `Checking ${selectedFormatLabel}`
      : downloadFormat === selectedExportFormat && downloadState === "expired"
        ? `${selectedFormatLabel} expired`
        : result?.tailored_text
          ? `Export ${selectedFormatLabel}`
          : `Export ${selectedFormatLabel}`;
  const selectedDownloadMessage = selectedExportStatusMessage({
    downloadFormat,
    downloadState,
    downloadUrl,
    selectedFormat: selectedExportFormat,
    entitlement: accountStatus?.entitlement,
    downloadMessage,
    hasTailoredText: Boolean(result?.tailored_text?.trim()),
  });
  const enabledUploadFormats = uploadFormats.filter((format) => format.enabled);
  const uploadAccept = enabledUploadFormats.length
    ? enabledUploadFormats.map((format) => `.${format.format}`).join(",")
    : ".docx,.pdf,.txt";
  const uploadFormatHint = enabledUploadFormats.length
    ? `${enabledUploadFormats.map((format) => format.label).join(", ")}. Drop your file here or browse from your computer.`
    : "DOCX, PDF, or TXT. Drop your file here or browse from your computer.";
  const fileSelected = Boolean(file || uploadMeta);
  const uploadStatusCopy = file
    ? previewUploadState === "reading"
      ? "Reading resume..."
      : previewUploadState === "error"
        ? "Resume selected. Replace it if the preview looks incomplete."
        : uploadMeta
          ? hasTarget
            ? "Resume ready. Run Tailor when the target looks right."
            : "Resume ready. Add the job target next."
          : "Resume selected. Add the job target next."
    : uploadFormatHint;
  const showTargetNext = Boolean(fileSelected && !hasTarget && !result);
  const targetTextPlaceholder = fileSelected
    ? "Paste the full job description here to unlock Run Tailor..."
    : "Paste the full job description here...";
  const targetUrlPlaceholder = fileSelected
    ? "https://company.com/careers/job - add the role link next"
    : "https://company.com/careers/job";
  const coverLetterWordCount = countReadableWords(coverLetterText);
  const interviewQuestionCount = interviewPrep.length;
  const hasGeneratedAssets = Boolean(coverLetterText || interviewQuestionCount);
  const restoredRunOpen = Boolean(restoredHistoryId);
  const previewPanelState = derivePreviewPanelState({
    mode: previewMode,
    stage,
    uploadState: previewUploadState,
    sourceText: sourcePreviewText,
    tailoredText: result?.tailored_text,
    sourceCharacterCount: uploadMeta?.character_count,
    sourcePreviewTruncated: uploadMeta?.text_preview_truncated,
    uploadFilename: uploadMeta?.filename ?? file?.name,
    selectedTemplateName: selectedTemplate.name,
    selectedDownloadFormat: downloadFormat,
    downloadReady,
    restoredRunOpen,
    keywordTotal,
    presentKeywordCount: presentKeywords.length,
    changeLogCount: result?.change_log?.length ?? 0,
  });
  const sourcePreviewUnavailable = previewPanelState.sourcePreviewUnavailable;
  const previewTabState = previewPanelState.tabState;
  const previewTitle = previewPanelState.title;
  const previewStatusItems = previewPanelState.statusItems;

  useEffect(() => {
    if (selectedExportFormat !== "pdf" && !selectedExportAllowed) {
      setSelectedExportFormat("pdf");
      setExportNotice(null);
    }
  }, [selectedExportAllowed, selectedExportFormat]);
  const generatedAssetSummary = [
    {
      label: "Letter",
      value: coverLetterWordCount ? `${coverLetterWordCount} words` : "Waiting",
      ready: Boolean(coverLetterWordCount),
    },
    {
      label: "Interview prep",
      value: interviewQuestionCount ? `${interviewQuestionCount} question${interviewQuestionCount === 1 ? "" : "s"}` : "Waiting",
      ready: Boolean(interviewQuestionCount),
    },
    {
      label: "State",
      value: hasGeneratedAssets ? "Ready to use" : "Ready after run",
      ready: hasGeneratedAssets,
    },
  ];
  const accountButtonLabel = signedIn ? accountInitials(accountUser) : "IN";
  const accountPremiumActive = Boolean(
    accountStatus?.entitlement?.plan === "premium" &&
      ["active", "trialing"].includes(accountStatus.entitlement.billingStatus),
  );
  const premiumExportSyncing = Boolean(premiumExportRequested && accountPremiumActive);
  const accountPremiumEnding = Boolean(accountPremiumActive && accountStatus?.entitlement?.cancelAtPeriodEnd);
  const accountPremiumEndLabel = formatResetDate(accountStatus?.entitlement?.cancelAt || accountStatus?.entitlement?.currentPeriodEnd || "");
  const railPlanCard = accountPremiumActive
    ? {
        title: accountPremiumEnding ? "Premium ending" : "Premium active",
        detail: accountPremiumEnding && accountPremiumEndLabel
          ? `Premium exports stay active until ${accountPremiumEndLabel}.`
          : "Unlimited runs and premium exports are active for this workspace.",
        href: "/settings#billing",
        action: "Manage plan",
      }
    : signedIn
      ? {
          title: "Upgrade workspace",
          detail: "Unlock unlimited tailoring runs plus DOCX and TXT exports.",
          href: "/settings#billing",
          action: "View plans",
        }
      : {
          title: "Account required",
          detail: "Sign in to use the studio and keep saved projects with your account.",
          href: "/login?next=%2Fapp&account=signin-required",
          action: "Sign in",
        };
  const accountItems = [
    {
      label: "Saved projects",
      detail: signedIn ? "Completed runs save to History and reopen in the studio." : "Sign in first, then completed runs can follow you across browsers.",
      href: "/app#history",
    },
    {
      label: "Usage",
      detail: accountStatus?.usage
        ? accountStatus.usage.monthlyRunLimit === null
          ? `${accountStatus.usage.monthlyRuns} ${runWord(accountStatus.usage.monthlyRuns)} this month. Premium is unlimited.`
          : `${accountStatus.usage.monthlyRuns}/${accountStatus.usage.monthlyRunLimit} free ${runWord(accountStatus.usage.monthlyRuns)} used this month.`
        : "Sign in to see run usage.",
      href: "/settings#usage",
    },
    {
      label: "Plan",
      detail: signedIn
          ? accountPremiumEnding && accountPremiumEndLabel
            ? `Premium access ends ${accountPremiumEndLabel}. PDF, DOCX, and TXT remain available until then.`
          : accountPremiumActive
            ? "Premium workspace. PDF, DOCX, and TXT exports are available."
            : "Free workspace. PDF export is included."
        : "Sign in to connect plan and saved project state.",
      href: "/settings#billing",
    },
    {
      label: "Exports",
      detail: accountStatus?.entitlement?.exportFormats.docx
        ? "PDF, DOCX, and TXT exports are available for this account."
        : "PDF exports are included. DOCX and TXT unlock with Premium.",
      href: "/settings#exports",
    },
    { label: "Billing", detail: "Manage plan changes and invoices from Settings.", href: "/settings#billing" },
  ];
  const localHistoryCount = history.filter((entry) => !isAccountHistoryItem(entry, syncedHistoryIds)).length;
  const syncableLocalHistoryCount = syncableLocalHistoryItems(history, syncedHistoryIds).length;
  const savedProjectCount = history.filter((entry) => isAccountHistoryItem(entry, syncedHistoryIds)).length;
  const historyGroups = groupHistoryItems(history, syncedHistoryIds);
  const accountHistoryGroups = historyGroups.filter((group) => group.accountCount > 0);
  const localHistoryGroups = historyGroups.filter((group) => group.localCount > 0);
  const showHistoryFilter = accountHistoryGroups.length > 0 && localHistoryGroups.length > 0;
  const activeHistoryFilter = showHistoryFilter ? historyFilter : "all";
  const visibleHistoryGroups =
    activeHistoryFilter === "account"
      ? accountHistoryGroups
      : activeHistoryFilter === "local"
        ? localHistoryGroups
        : historyGroups;
  const selectHistoryFilter = (nextFilter: HistoryFilter) => {
    const nextGroups =
      nextFilter === "account"
        ? accountHistoryGroups
        : nextFilter === "local"
          ? localHistoryGroups
          : historyGroups;
    setHistoryFilter(nextFilter);
    setSelectedHistoryId(nextGroups[0]?.latest.id ?? null);
    setExpandedHistoryGroupKey(null);
    setProjectActionMessage("");
    setConfirmingClearHistory(false);
    setConfirmingDeleteProjectId(null);
  };
  const selectedHistoryItem =
    history.find((entry) => entry.id === selectedHistoryId) ??
    history.find((entry) => isAccountHistoryItem(entry, syncedHistoryIds)) ??
    history[0] ??
    null;
  const selectedHistoryGroup =
    (selectedHistoryItem ? visibleHistoryGroups.find((group) => group.items.some((entry) => entry.id === selectedHistoryItem.id)) : null) ??
    visibleHistoryGroups[0] ??
    null;
  const visibleSelectedHistoryItem =
    selectedHistoryGroup?.items.find((entry) => entry.id === selectedHistoryId) ??
    selectedHistoryGroup?.latest ??
    null;
  const clearHistoryLabel = signedIn && savedProjectCount ? `Clear local${localHistoryCount ? ` (${localHistoryCount})` : ""}` : "Clear history";
  const clearHistoryTargetCount = signedIn ? localHistoryCount : history.length;
  const clearHistoryRunLabel = `${clearHistoryTargetCount} browser run${clearHistoryTargetCount === 1 ? "" : "s"}`;
  const clearHistoryDetail = signedIn
    ? "Account projects stay saved. Only runs stored in this browser are removed."
    : "This removes the runs stored in this browser.";
  const historyEmptyTitle =
    activeHistoryFilter === "account"
      ? "No account projects yet"
      : activeHistoryFilter === "local"
        ? "No browser projects"
        : signedIn
          ? "No saved projects yet"
          : "No browser runs yet";
  const historyEmptyDetail =
    activeHistoryFilter === "account"
      ? localHistoryGroups.length
        ? "Your completed browser runs are still available under This browser. Complete a new signed-in run or load saved projects again to see account projects here."
        : "Complete a signed-in tailor run and it will save here with restore, target details, scores, and export links."
      : activeHistoryFilter === "local"
        ? accountHistoryGroups.length
          ? "All visible projects are saved to your account. Switch to All or Account to review them."
          : "Complete a tailor run and it will stay in this browser with the preview, target, scores, and download ready to reopen."
        : signedIn
          ? "Complete a tailor run and it will save here with resume preview, target details, scores, and a one-click studio restore."
          : "Complete a tailor run and it will stay in this browser with the preview, target, scores, and download ready to reopen.";
  const historyDownloadEntriesFor = (entry: HistoryItem) =>
    historyDownloadEntries(entry, accountStatus?.entitlement).map((download) => ({
      ...download,
      url: normalizeWorkflowDownloadUrl(download.url),
    }));
  const primaryHistoryDownloadFor = (entry: HistoryItem) => {
    const download = primaryHistoryDownload(entry, accountStatus?.entitlement);
    return download ? { ...download, url: normalizeWorkflowDownloadUrl(download.url) } : null;
  };
  const historyTemplateNameFor = (entry: HistoryItem) => {
    if (entry.snapshot?.templateName) return entry.snapshot.templateName;
    if (isResumeTemplateSlug(entry.snapshot?.templateSlug)) return getResumeTemplate(entry.snapshot.templateSlug).name;
    return "";
  };
  const canDownloadHistoryItem = (entry: HistoryItem) => historyDownloadEntriesFor(entry).length > 0;
  const visibleRunCount = visibleHistoryGroups.reduce((total, group) => total + group.items.length, 0);
  const visibleAccountProjectCount = visibleHistoryGroups.filter((group) => group.accountCount > 0).length;
  const showAccountHistorySummary = signedIn || visibleAccountProjectCount > 0;
  const visibleRestoreReadyCount = visibleHistoryGroups.reduce((total, group) => total + group.restorableCount, 0);
  const visibleDownloadReadyCount = visibleHistoryGroups.reduce(
    (total, group) => total + group.items.filter(canDownloadHistoryItem).length,
    0,
  );
  const selectedHistoryIndex = selectedHistoryGroup?.items.findIndex((entry) => entry.id === visibleSelectedHistoryItem?.id) ?? -1;
  const selectedHistoryVersionLabel =
    selectedHistoryGroup && selectedHistoryIndex >= 0
      ? historyVersionLabel(selectedHistoryGroup.items.length, selectedHistoryIndex)
      : "Latest run";
  const selectedHistoryVersions =
    selectedHistoryGroup && expandedHistoryGroupKey === selectedHistoryGroup.key
      ? selectedHistoryGroup.items
      : selectedHistoryGroup?.items.slice(0, 5) ?? [];
  const hiddenHistoryVersionCount = selectedHistoryGroup
    ? Math.max(0, selectedHistoryGroup.items.length - selectedHistoryVersions.length)
    : 0;
  const visibleSelectedHistoryDownloads = visibleSelectedHistoryItem ? historyDownloadEntriesFor(visibleSelectedHistoryItem) : [];
  const selectedHistoryDownloadCount = visibleSelectedHistoryDownloads.length;
  const selectedHistoryRestorable = visibleSelectedHistoryItem ? hasRestorableSnapshot(visibleSelectedHistoryItem) : false;
  const selectedHistoryPrimaryDownload = visibleSelectedHistoryItem
    ? primaryHistoryDownloadFor(visibleSelectedHistoryItem)
    : null;
  const selectedHistoryPrimaryDownloadLabel =
    selectedHistoryPrimaryDownload?.format.toUpperCase() ?? visibleSelectedHistoryItem?.downloadFormat?.toUpperCase() ?? "PDF";
  const selectedHistoryTemplateName = visibleSelectedHistoryItem ? historyTemplateNameFor(visibleSelectedHistoryItem) : "";
  const selectedHistoryStatus = visibleSelectedHistoryItem ? historyRunStatus(visibleSelectedHistoryItem, accountStatus?.entitlement) : null;
  const selectedHistoryActionCopy = visibleSelectedHistoryItem
    ? historyRunActionCopy(visibleSelectedHistoryItem, selectedHistoryPrimaryDownloadLabel, accountStatus?.entitlement)
    : null;
  const editorRailActive = activeTab === "score" || activeTab === "resume";
  const targetRailActive = activeTab === "gap";
  const suggestionsRailActive = activeTab === "changes";
  const atsRailActive = activeTab === "ats";
  const coverRailActive = activeTab === "cover";
  const interviewRailActive = activeTab === "interview";

  const suggestionCards: StudioSuggestion[] = result
    ? [
        ...(result.change_log ?? []).slice(0, 2).map((change, index) => ({
          label: index === 0 ? "Keyword" : "Quantify",
          meta: `Change ${index + 1}`,
          before: "Original wording",
          after: change,
          tone: index === 0 ? "good" as const : "neutral" as const,
        })),
        ...(result.suggestions ?? []).slice(0, 4).map((suggestion, index) => ({
          label: index % 2 ? "ATS" : "Add keyword",
          meta: `Suggestion ${index + 1}`,
          after: suggestion,
          tone: index % 2 ? "warn" as const : "good" as const,
        })),
      ].slice(0, 4)
    : [];

  if (accountStatus === null) {
    return <StudioAccountGate state="loading" />;
  }

  if (accountStatus.configured && !signedIn) {
    return <StudioAccountGate state="required" />;
  }

  return (
    <main className="page-shell rf-studio-page">
      <div className="rf-studio-shell">
        <header className="rf-studio-topbar" aria-label="Studio controls">
          <div className="rf-studio-breadcrumb">
            <Brand href="/" label="RoleForge AI home" />
            <span className="breadcrumb-current">Resumes</span>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <strong title={activeTitle}>{topbarLabel}</strong>
          </div>
          <div className="rf-studio-top-actions">
            <button
              className="ghost-button studio-top-button"
              type="button"
              onClick={() => void duplicateCurrentRun()}
              disabled={!canDuplicateCurrentRun}
              title={canDuplicateCurrentRun ? "Duplicate this completed run in History" : "Complete a run before duplicating it"}
            >
              <RoleForgeIcon name="copy" size={16} /> Duplicate
            </button>
            {topDownloadReady && downloadUrl ? (
              <a className="ghost-button studio-top-button" href={downloadUrl} download title={topExportTitle}>
                <RoleForgeIcon name="download" size={16} /> {topExportLabel}
              </a>
            ) : (
              <button
                className="ghost-button studio-top-button"
                type="button"
                onClick={() => void onExportSelectedFormat()}
                disabled={!result?.tailored_text || !selectedExportAllowed || busy}
                title={topExportTitle}
              >
                <RoleForgeIcon name="download" size={16} /> {topExportLabel}
              </button>
            )}
            <ThemeToggle />
            <div className="studio-account-menu" ref={accountMenuRef}>
              <button
                className="studio-account-button"
                type="button"
                aria-label={signedIn ? "Open account options" : "Open sign-in options"}
                aria-expanded={accountPanelOpen}
                aria-controls="studio-account-popover"
                onClick={() => setAccountPanelOpen((open) => !open)}
              >
                {accountButtonLabel}
              </button>
              {accountPanelOpen ? (
                <div className="studio-account-popover" id="studio-account-popover" role="dialog" aria-label="Account options">
                  <div className="studio-account-popover-head">
                    <span>Account</span>
                    <button type="button" aria-label="Close account options" onClick={() => setAccountPanelOpen(false)}>
                      <RoleForgeIcon name="x" size={14} />
                    </button>
                  </div>
                  {accountNotice ? <div className="studio-account-notice">{accountNotice}</div> : null}
                  {signedIn ? (
                    <>
                      <strong className="studio-account-email" title={accountUser?.email || "Signed in"}>{accountUser?.email || "Signed in"}</strong>
                      <p>You are signed in and ready. Completed runs save to your project history.</p>
                      <small className={`studio-account-sync ${historySyncState}`}>{historySyncMessage}</small>
                      <div className="studio-account-shortcuts">
                        <Link href="/settings" onClick={() => setAccountPanelOpen(false)}>
                          <RoleForgeIcon name="settings" size={14} /> Settings
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountPanelOpen(false);
                            openHistoryPanel();
                          }}
                        >
                          <RoleForgeIcon name="chart" size={14} /> History
                        </button>
                      </div>
                      <form className="studio-account-form" action="/auth/signout" method="post">
                        <input type="hidden" name="next" value="/app" />
                        <button className="ghost-button studio-account-submit" type="submit">
                          Sign out
                        </button>
                      </form>
                    </>
                  ) : accountReady ? (
                    <>
                      <strong>Sign in</strong>
                      <p>Use Google for the quickest path, or send a secure email sign-in link.</p>
                      <a className="studio-oauth-button" href="/auth/oauth?provider=google&next=/app">
                        <span className="studio-oauth-mark" aria-hidden="true">G</span>
                        Continue with Google
                      </a>
                      <div className="studio-account-divider"><span>Email sign-in</span></div>
                      <form className="studio-account-form" action="/auth/signin" method="post">
                        <input type="hidden" name="next" value="/app" />
                        <input type="hidden" name="statusNext" value="/login?next=%2Fapp" />
                        <label htmlFor="account-email">Email address</label>
                        <input id="account-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
                        <button className="primary-button studio-account-submit" type="submit">
                          Send sign-in link
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <strong>Sign-in temporarily unavailable</strong>
                      <p>Account access is taking a moment. Try again shortly.</p>
                    </>
                  )}
                  <div className="studio-account-list">
                    {accountItems.map((item) => (
                      <Link
                        className="studio-account-summary"
                        href={item.href}
                        key={item.label}
                        onClick={(event) => openAccountSummaryLink(event, item.href)}
                      >
                        <span>{item.label}</span>
                        <small>{item.detail}</small>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="rf-studio-layout">
          <aside className="rf-studio-rail" aria-label="Studio sections">
            <div className="rail-section-title">Build</div>
            <a className={`rail-item ${editorRailActive ? "active" : ""}`} href="#editor" onClick={() => setActiveTab("score")}><RoleForgeIcon name="doc" size={15} /> Editor</a>
            <a className={`rail-item ${targetRailActive ? "active" : ""}`} href="#target" onClick={() => setActiveTab("gap")}><RoleForgeIcon name="target" size={15} /> Job target</a>
            <a className={`rail-item ${suggestionsRailActive ? "active" : ""}`} href="#suggestions" onClick={() => setActiveTab("changes")}><RoleForgeIcon name="sparkle" size={15} /> AI tailor <span className="rail-pill">{suggestionCards.length || 0}</span></a>
            <a className={`rail-item ${atsRailActive ? "active" : ""}`} href="#ats" onClick={() => setActiveTab("ats")}><RoleForgeIcon name="scan" size={15} /> ATS check</a>
            <a className={`rail-item ${coverRailActive ? "active" : ""}`} href="#cover-letter" onClick={(event) => { event.preventDefault(); openGeneratedAsset("cover"); }}><RoleForgeIcon name="mail" size={15} /> Cover letter</a>
            <a className={`rail-item ${interviewRailActive ? "active" : ""}`} href="#interview-prep" onClick={(event) => { event.preventDefault(); openGeneratedAsset("interview"); }}><RoleForgeIcon name="briefcase" size={15} /> Interview prep</a>
            <div className="rail-divider" />
            <div className="rail-section-title">Workspace</div>
            <Link className="rail-item" href="/templates"><RoleForgeIcon name="layers" size={15} /> Templates</Link>
            <button className={`rail-item ${activeTab === "history" ? "active" : ""}`} type="button" aria-pressed={activeTab === "history"} onClick={openHistoryPanel}><RoleForgeIcon name="chart" size={15} /> History</button>
            <Link className="rail-item" href="/settings"><RoleForgeIcon name="settings" size={15} /> Settings</Link>
            <div className="rf-rail-upgrade">
              <strong><RoleForgeIcon name={accountPremiumActive ? "check" : "sparkle"} size={14} /> {railPlanCard.title}</strong>
              <p>{railPlanCard.detail}</p>
              <Link className="primary-button" href={railPlanCard.href}>{railPlanCard.action}</Link>
            </div>
          </aside>

          <section className="rf-studio-main" id="editor" ref={editorSectionRef} tabIndex={-1}>
            <div className="rf-studio-hero">
              <div>
                <div className="eyebrow">Active resume</div>
                <h1 title={heroTitle}>{heroLabel}</h1>
                <p>{activeDetail}</p>
              </div>
              <div className="studio-hero-actions">
                <button className="ghost-button" type="button" onClick={onRun} disabled={!canRun} title={runDisabledReason || undefined}>{runLabel}</button>
                {selectedDownloadReady && downloadUrl ? (
                  <a className="primary-button" href={downloadUrl} download>{exportLabel} <RoleForgeIcon name="download" size={14} /></a>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void onExportSelectedFormat()}
                    disabled={!result?.tailored_text || !selectedExportAllowed || busy}
                  >
                    {exportLabel} <RoleForgeIcon name="download" size={14} />
                  </button>
                )}
                {hasActiveWorkspace ? (
                  <button className="ghost-button" type="button" onClick={startNewResume} title="Clear the current resume, target, preview, and export state">
                    <RoleForgeIcon name="plus" size={14} /> New resume
                  </button>
                ) : null}
                <div className="export-format-strip" aria-label="Export format availability">
                  {exportFormats.map((format) => {
                    const selected = selectedExportFormat === format.format;
                    const planLabel = format.plan === "premium" ? "Premium" : "Free";
                    const badgeLabel = format.reason || planLabel;
                    return (
                      <button
                        key={format.format}
                        className={`export-format-chip${selected ? " active" : ""}${format.enabled ? "" : " disabled"}${format.enabled && format.plan === "premium" ? " included" : ""}`}
                        aria-disabled={!format.enabled}
                        aria-pressed={selected}
                        type="button"
                        title={!format.enabled ? `${format.label} requires Premium` : `${format.label} export available`}
                        onClick={() => onSelectExportFormat(format)}
                      >
                        {!format.enabled ? <RoleForgeIcon name="lock" size={12} /> : null}
                        {format.label} <small>{badgeLabel}</small>
                      </button>
                    );
                  })}
                </div>
                <div className="studio-template-preference" aria-label="Selected resume template direction">
                  <span><RoleForgeIcon name="layers" size={13} /> {selectedTemplate.name} direction</span>
                  <small>{selectedTemplateStatus}</small>
                  <Link href="/templates">Change</Link>
                </div>
                {selectedDownloadMessage ? (
                  <span className={`export-status-note ${downloadState}`} role="status">
                    {selectedDownloadMessage}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rf-studio-stats">
              <StudioMetric label="Fit score" value={score ? `${score}` : "Run"} unit={score ? "/100" : "needed"} detail={scoreDetail} progress={score || readiness} tone="brand" />
              <StudioMetric label="ATS readability" value={atsScore ? `${atsScore}` : "Review"} unit={atsScore ? "/100" : "notes"} detail={atsDetail} progress={atsScore || readiness} tone="good" />
              <StudioMetric label="Keyword match" value={keywordTotal ? `${presentKeywords.length}` : "Terms"} unit={keywordTotal ? `/${keywordTotal} matched` : "needed"} detail={keywordDetail} progress={keywordTotal ? (presentKeywords.length / keywordTotal) * 100 : readiness} tone="accent" />
              <StudioMetric label="Read time" value={readSeconds ? `${readSeconds}` : "Draft"} unit={readSeconds ? "seconds" : "waiting"} detail={result ? "Review before export" : "Generated after run"} progress={readSeconds ? 72 : readiness} tone="sky" />
            </div>

            <div className="rf-studio-grid">
              <section className="studio-card rf-live-card" id="preview">
                <div className="studio-card-head history-card-head">
                  <div>
                    <div className="eyebrow">Live preview</div>
                    <h2 className="panel-title">{previewTitle}</h2>
                  </div>
                  <div className="studio-tabs-mini" role="tablist" aria-label="Preview mode">
                    <button
                      className={previewMode === "tailored" ? "active" : ""}
                      id="preview-tab-tailored"
                      type="button"
                      role="tab"
                      aria-label={`Tailored preview, ${previewTabState.tailored}`}
                      aria-selected={previewMode === "tailored"}
                      aria-controls="preview-panel"
                      tabIndex={previewMode === "tailored" ? 0 : -1}
                      onClick={() => openPreviewMode("tailored")}
                      onKeyDown={onPreviewTabKeyDown}
                    >
                      <span>Tailored</span>
                      <span className="preview-tab-separator" aria-hidden="true">·</span>
                      <small className="preview-tab-state">{previewTabState.tailored}</small>
                    </button>
                    <button
                      className={previewMode === "original" ? "active" : ""}
                      id="preview-tab-original"
                      type="button"
                      role="tab"
                      aria-label={`Original preview, ${previewTabState.original}`}
                      aria-selected={previewMode === "original"}
                      aria-controls="preview-panel"
                      tabIndex={previewMode === "original" ? 0 : -1}
                      onClick={() => openPreviewMode("original")}
                      onKeyDown={onPreviewTabKeyDown}
                    >
                      <span>Original</span>
                      <span className="preview-tab-separator" aria-hidden="true">·</span>
                      <small className="preview-tab-state">{previewTabState.original}</small>
                    </button>
                    <button
                      className={previewMode === "diff" ? "active" : ""}
                      id="preview-tab-diff"
                      type="button"
                      role="tab"
                      aria-label={`Changes preview, ${previewTabState.diff}`}
                      aria-selected={previewMode === "diff"}
                      aria-controls="preview-panel"
                      tabIndex={previewMode === "diff" ? 0 : -1}
                      onClick={() => openPreviewMode("diff")}
                      onKeyDown={onPreviewTabKeyDown}
                    >
                      <span>Changes</span>
                      <span className="preview-tab-separator" aria-hidden="true">·</span>
                      <small className="preview-tab-state">{previewTabState.diff}</small>
                    </button>
                  </div>
                </div>
                <div
                  className="rf-preview-wrap"
                  data-preview-mode={previewMode}
                  id="preview-panel"
                  role="tabpanel"
                  aria-labelledby={`preview-tab-${previewMode}`}
                  aria-live="polite"
                  aria-busy={stage === "uploading" || stage === "tailoring" || stage === "exporting"}
                >
                  <div className="rf-preview-status" aria-label="Preview status">
                    {previewStatusItems.map((item, index) => (
                      <span
                        className={previewStatusTone(item.value, { uploadState: previewUploadState, mode: previewMode, index })}
                        key={`${item.label}-${item.value}`}
                      >
                        <strong>{item.label}</strong>
                        {item.value}
                      </span>
                    ))}
                  </div>
                  {previewUploadError ? <div className="rf-preview-alert">{previewUploadError}</div> : null}
                  <MiniResumeDocument
                    text={previewMode === "original" ? sourcePreviewText : result?.tailored_text}
                    sourceText={sourcePreviewText}
                    keywords={previewMode === "original" ? [] : presentKeywords}
                    mode={previewMode}
                    filename={uploadMeta?.filename ?? file?.name}
                    uploadFormat={uploadMeta?.format}
                    characterCount={uploadMeta?.character_count}
                    sourcePreviewTruncated={uploadMeta?.text_preview_truncated}
                    changeLog={result?.change_log}
                    hasTarget={hasTarget}
                    sourcePreviewUnavailable={sourcePreviewUnavailable}
                    stage={stage}
                    restored={Boolean(restoredHistoryId)}
                  />
                </div>
              </section>

              <section className="studio-card" id="suggestions">
                <div className="studio-card-head">
                  <div>
                    <div className="eyebrow">AI suggestions</div>
                    <h2 className="panel-title">{suggestionCards.length || "No"} changes for your review</h2>
                  </div>
                </div>
                <div className="suggestion-list">
                  {suggestionCards.length ? suggestionCards.map((suggestion, index) => (
                    <article className="suggestion" key={`${suggestion.label}-${suggestion.meta}-${index}`}>
                      <div className="suggestion-head">
                        <span className={`suggestion-tag ${suggestion.tone === "good" ? "good" : suggestion.tone === "warn" ? "warn" : ""}`}>{suggestion.label}</span>
                        <span className="suggestion-meta">{suggestion.meta}</span>
                      </div>
                      <div className="suggestion-body">
                        {suggestion.before ? <div className="suggestion-before">{suggestion.before}</div> : null}
                        <div className="suggestion-after">{suggestion.after}</div>
                      </div>
                      <div className="suggestion-actions">
                        <button className="btn btn-brand btn-sm" type="button" onClick={() => openPreviewMode("diff")}><RoleForgeIcon name="check" size={12} />Review changes</button>
                        <button className="btn btn-soft btn-sm" type="button" onClick={() => openPreviewMode("tailored")}>View draft</button>
                      </div>
                    </article>
                  )) : (
                    <div className="empty-state">
                      <strong>Suggestions are waiting</strong>
                      <p>Run the workflow and generated change notes will appear here.</p>
                    </div>
                  )}
                  {warnings.length ? <div className="warning-list">{warnings.map((warning) => <span key={warning}>{warning}</span>)}</div> : null}
                </div>
              </section>
            </div>

            <div className="rf-studio-grid two">
              <section className="studio-card">
                <div className="studio-card-head">
                  <div>
                    <div className="eyebrow">Job target</div>
                    <h2 className="panel-title" title={activeTitle}>{targetLabel}</h2>
                  </div>
                  <button className="btn btn-soft btn-sm" type="button" onClick={() => document.getElementById("target")?.scrollIntoView({ behavior: "smooth" })}><RoleForgeIcon name="edit" size={12} />Change</button>
                </div>
                <div className="studio-jd">
                  <div className="studio-jd-meta">
                    <span><RoleForgeIcon name="briefcase" size={12} />{companyUrl ? "Company context added" : "Company optional"}</span>
                    <span><RoleForgeIcon name="globe" size={12} />{jdUrl ? "Public URL target" : "Pasted text target"}</span>
                    <span><RoleForgeIcon name="sparkle" size={12} />{tailoringMode} mode</span>
                  </div>
                  <p>{jdText || jdUrl || "Add a job description or public posting URL to give RoleForge a role target."}</p>
                </div>
                <div className="kw-section">
                  <div className="kw-label">Matched <span className="kw-count">{presentKeywords.length}</span></div>
                  <div className="kw-row">{presentKeywords.length ? presentKeywords.slice(0, 16).map((keyword) => <Pill key={`matched-${keyword}`} text={keyword} kind="good" />) : <span className="field-hint">Matched keywords appear after tailoring.</span>}</div>
                </div>
                <div className="kw-section">
                  <div className="kw-label">Missing <span className="kw-count miss">{missingKeywords.length}</span></div>
                  <div className="kw-row">{missingKeywords.length ? missingKeywords.slice(0, 16).map((keyword) => <Pill key={`missing-${keyword}`} text={keyword} kind="bad" />) : <span className="field-hint">Missing keywords appear after tailoring.</span>}</div>
                </div>
                {gapEvidence.length ? (
                  <div className="kw-section">
                    <div className="kw-label">Evidence to add <span className="kw-count">{gapEvidence.length}</span></div>
                    <div className="studio-evidence-list">
                      {gapEvidence.slice(0, 4).map((item) => <span key={`gap-${item}`}>{item}</span>)}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="studio-card" id="ats">
                <div className="studio-card-head">
                  <div>
                    <div className="eyebrow">ATS check</div>
                    <h2 className="panel-title">Recruiter parser preview</h2>
                  </div>
                  <span className="ats-score">{atsScore ? `${atsScore}/100` : "Waiting"}</span>
                </div>
                <div className="ats-list">
                  {atsIssues.length ? atsIssues.slice(0, 6).map((issue, index) => (
                    <article className={`ats-item ${issue.severity?.toLowerCase().includes("high") ? "warn" : "good"}`} key={`${issue.issue}-${index}`}>
                      <div className="ats-dot"><RoleForgeIcon name={issue.severity?.toLowerCase().includes("high") ? "sparkle" : "check"} size={11} /></div>
                      <div><strong>{issue.issue}</strong><p>{issue.fix}</p></div>
                    </article>
                  )) : (
                    <>
                      <article className="ats-item good"><div className="ats-dot"><RoleForgeIcon name="check" size={11} /></div><div><strong>Headings ready for review</strong><p>Run the workflow to surface parser notes.</p></div></article>
                      <article className="ats-item good"><div className="ats-dot"><RoleForgeIcon name="check" size={11} /></div><div><strong>Single-column check</strong><p>Formatting notes will appear when the run completes.</p></div></article>
                      <article className="ats-item warn"><div className="ats-dot"><RoleForgeIcon name="sparkle" size={11} /></div><div><strong>Keyword coverage waiting</strong><p>Matched and missing terms need a resume and target.</p></div></article>
                    </>
                  )}
                </div>
              </section>
            </div>

            <section className="studio-card" id="assets">
              <div className="studio-card-head">
                <div>
                  <div className="eyebrow">Generated assets</div>
                  <h2 className="panel-title">Cover letter · interview prep</h2>
                </div>
                {assetCopyState ? <span className="copy-state generated-copy-state" role="status">{assetCopyState}</span> : null}
              </div>
              <div className="generated-summary" aria-label="Generated asset status">
                {generatedAssetSummary.map((item) => (
                  <span className={item.ready ? "ready" : ""} key={`${item.label}-${item.value}`}>
                    <strong>{item.label}</strong>
                    {item.value}
                  </span>
                ))}
              </div>
              <div className={`generated-grid rf-generated-grid${coverRailActive ? " focus-cover" : interviewRailActive ? " focus-interview" : ""}`}>
                <article className={`generated-card ${coverRailActive ? "active" : ""}${coverLetterText ? " filled" : ""}`} id="cover-letter">
                  <div className="generated-head"><RoleForgeIcon name="mail" size={14} /> Cover letter</div>
                  <div
                    className={`generated-body${coverLetterText ? " generated-scroll" : ""}`}
                    id="generated-cover-letter-copy"
                  >
                    {coverLetterText || "After tailoring, the generated cover letter will appear here for review."}
                  </div>
                  <div className="suggestion-actions">
                    {coverLetterText ? (
                      <>
                        <button className="btn btn-soft btn-sm" type="button" onClick={() => openGeneratedAsset("cover")}><RoleForgeIcon name="edit" size={12} />Open</button>
                        <button className="btn btn-soft btn-sm" type="button" onClick={() => copyCoverLetter(coverLetterText)}><RoleForgeIcon name="copy" size={12} />Copy letter</button>
                      </>
                    ) : (
                      <span className="generated-action-note">Ready after tailoring</span>
                    )}
                  </div>
                </article>
                <article className={`generated-card ${interviewRailActive ? "active" : ""}${interviewPrep.length ? " filled" : ""}`} id="interview-prep">
                  <div className="generated-head"><RoleForgeIcon name="briefcase" size={14} /> Likely interview questions</div>
                  {interviewPrep.length ? (
                    <ul className="generated-list" id="generated-interview-prep-copy">
                      {interviewPrep.slice(0, 5).map((item, index) => (
                        <li key={`${item.question}-${index}`}><strong>{item.question}</strong><span>{item.answer_bullets.slice(0, 3).join(" · ")}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div className="generated-body">Interview prompts will appear here when preparation notes are ready.</div>
                  )}
                  <div className="suggestion-actions">
                    {interviewPrep.length ? (
                      <>
                        <button className="btn btn-soft btn-sm" type="button" onClick={() => openGeneratedAsset("interview")}><RoleForgeIcon name="edit" size={12} />Open</button>
                        <button className="btn btn-soft btn-sm" type="button" onClick={() => void copyInterviewPrep()}><RoleForgeIcon name="copy" size={12} />Copy prep</button>
                      </>
                    ) : (
                      <span className="generated-action-note">Ready after tailoring</span>
                    )}
                  </div>
                </article>
              </div>
            </section>

            <section className="studio-card rf-workflow-card">
              <div className="studio-card-head">
                <div>
                  <div className="eyebrow">New run</div>
                  <h2 className="panel-title">Resume intake · role target</h2>
                </div>
              </div>
              <div className="rf-workflow-panel rf-intake-grid" aria-label="Workflow controls">
                <article className="rf-intake-card rf-intake-resume">
                  <h3 className="rf-intake-card-header">Select Resume</h3>
                  <div className="rf-intake-card-body">
                    <label
                      id="input"
                      className={file || dragActive ? "rf-file-drop active" : "rf-file-drop"}
                      onDragEnter={() => setDragActive(true)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={onDrop}
                    >
                      <input key={fileInputVersion} className="rf-file-input" type="file" accept={uploadAccept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-label="Upload resume file" />
                      <span className="rf-file-icon"><RoleForgeIcon name="file" size={24} /></span>
                      <span className="rf-file-copy">
                        <strong>{file ? file.name : "Choose a resume file"}</strong>
                        <small aria-live="polite">{uploadStatusCopy}</small>
                      </span>
                      <span className="rf-file-action">{file ? "Replace file" : "Choose File"}</span>
                    </label>
                  </div>
                </article>

                <article className="rf-intake-card rf-intake-target-card">
                  <h3 className="rf-intake-card-header">
                    Job Target
                    {showTargetNext ? <span className="rf-intake-next">Next</span> : null}
                  </h3>
                  <div className="rf-intake-card-body">
                    <div className="rf-target-editor" id="target">
                      <div className="segment rf-target-segment" role="tablist" aria-label="Job description input mode">
                        <button className={inputMode === "text" ? "active" : ""} type="button" onClick={() => setInputMode("text")}>Paste text</button>
                        <button className={inputMode === "url" ? "active" : ""} type="button" onClick={() => setInputMode("url")}>Job URL</button>
                      </div>
                      {inputMode === "text" ? (
                        <textarea id="jdText" value={jdText} onChange={(event) => setJdText(event.target.value)} placeholder={targetTextPlaceholder} aria-label="Job description" />
                      ) : (
                        <input id="jdUrl" value={jdUrl} onChange={(event) => setJdUrl(event.target.value)} placeholder={targetUrlPlaceholder} aria-label="Job posting URL" />
                      )}
                    </div>
                  </div>
                </article>

                <article className="rf-intake-card rf-intake-config">
                  <h3 className="rf-intake-card-header">Tailor settings</h3>
                  <div className="rf-intake-card-body">
                    <div className="rf-run-controls">
                      <div className="rf-config-label">Tailoring mode</div>
                      <div className="segment mode-segment" role="tablist" aria-label="Tailoring mode">
                        <button className={tailoringMode === "conservative" ? "active" : ""} type="button" onClick={() => setTailoringMode("conservative")}>Conservative</button>
                        <button className={tailoringMode === "balanced" ? "active" : ""} type="button" onClick={() => setTailoringMode("balanced")}>Balanced</button>
                        <button className={tailoringMode === "aggressive" ? "active" : ""} type="button" onClick={() => setTailoringMode("aggressive")}>Aggressive</button>
                      </div>
                      <label className="rf-company-field">
                        <span>Company context</span>
                        <input value={companyUrl} onChange={(event) => setCompanyUrl(event.target.value)} placeholder="Optional company URL" aria-label="Company URL" />
                      </label>
                      <span className="sr-only" aria-live="polite">Workflow status: {stage}</span>
                      <button className="primary-button" type="button" onClick={onRun} disabled={!canRun} title={runDisabledReason || undefined}>{runLabel} <RoleForgeIcon name="sparkle" size={14} /></button>
                      {copyState ? <span className="copy-state">{copyState}</span> : null}
                    </div>
                  </div>
                </article>
                {premiumExportRequested ? (
                  <div className="rf-callout upgrade">
                    <strong>
                      {premiumExportSyncing
                        ? `${premiumExportRequested.label} export is still syncing with your Premium plan`
                        : `${premiumExportRequested.label} export is included with Premium`}
                    </strong>
                    <p>
                      {premiumExportSyncing
                        ? "Try again in a moment, or open Settings to refresh your plan state. PDF remains available while your export access catches up."
                        : "Upgrade to export DOCX and TXT files, or keep using PDF on the free plan."}
                    </p>
                    <div className="rf-callout-actions">
                      <Link className="primary-button" href="/settings#billing">
                        {premiumExportSyncing ? "Open settings" : "View plans"} <RoleForgeIcon name="sparkle" size={14} />
                      </Link>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setSelectedExportFormat("pdf");
                          setExportNotice(null);
                          setWorkflowError(null);
                          setError("");
                          setStage(result ? "ready" : "idle");
                        }}
                      >
                        Use PDF
                      </button>
                    </div>
                  </div>
                ) : limitReached ? (
                  <div className="rf-callout upgrade">
                    <strong>Free monthly limit reached</strong>
                    <p>
                      {monthlyRunAllowanceSentence(typeof monthlyRunLimit === "number" ? monthlyRunLimit : FREE_ENTITLEMENT.monthlyRunLimit)}
                    </p>
                    <div className="rf-callout-meta">
                      <span>{usageLabel}</span>
                      {resetLabel ? <span>Resets {resetLabel}</span> : null}
                    </div>
                    <div className="rf-callout-actions">
                      <Link className="primary-button" href="/settings#billing">Upgrade plan <RoleForgeIcon name="sparkle" size={14} /></Link>
                      <Link className="ghost-button" href="/settings#usage">View usage</Link>
                    </div>
                  </div>
                ) : error ? (
                  <div className="rf-callout danger">
                    <strong>Workflow stopped</strong>
                    <p>{error}</p>
                    {workflowError?.requestId ? <p className="rf-callout-meta">Request {workflowError.requestId}</p> : null}
                  </div>
                ) : null}
              </div>
            </section>

            {activeTab === "history" ? (
              <section className="studio-card studio-history-panel" id="history" ref={historySectionRef}>
                <div className="studio-card-head">
                  <div>
                    <div className="eyebrow">{signedIn ? "Saved projects" : "Browser history"}</div>
                    <h2 className="panel-title">
                      {visibleHistoryGroups.length
                        ? `${visibleHistoryGroups.length} project${visibleHistoryGroups.length === 1 ? "" : "s"}`
                        : signedIn
                          ? "Saved projects"
                          : "Recent runs"}
                    </h2>
                    <p className="history-sync-note" role="status" aria-live="polite">{historySyncMessage}</p>
                    {projectActionMessage ? <p className="history-action-note error" role="alert">{projectActionMessage}</p> : null}
                  </div>
                  <div className="history-panel-actions">
                    {showHistoryFilter ? (
                      <div className="history-filter-bar" role="tablist" aria-label="Saved project storage filter">
                        <button
                          className={activeHistoryFilter === "all" ? "active" : ""}
                          type="button"
                          role="tab"
                          aria-selected={activeHistoryFilter === "all"}
                          onClick={() => selectHistoryFilter("all")}
                        >
                          All <span>{historyGroups.length}</span>
                        </button>
                        {signedIn || accountHistoryGroups.length ? (
                          <button
                            className={activeHistoryFilter === "account" ? "active" : ""}
                            type="button"
                            role="tab"
                            aria-selected={activeHistoryFilter === "account"}
                            onClick={() => selectHistoryFilter("account")}
                          >
                            Account <span>{accountHistoryGroups.length}</span>
                          </button>
                        ) : null}
                        <button
                          className={activeHistoryFilter === "local" ? "active" : ""}
                          type="button"
                          role="tab"
                          aria-selected={activeHistoryFilter === "local"}
                          onClick={() => selectHistoryFilter("local")}
                        >
                          This browser <span>{localHistoryGroups.length}</span>
                        </button>
                      </div>
                    ) : null}
                    {signedIn ? (
                      <button className="btn btn-soft btn-sm" type="button" onClick={() => void refreshSavedRuns()} disabled={historySyncState === "loading"}>
                        Refresh
                      </button>
                    ) : null}
                    {signedIn && syncableLocalHistoryCount ? (
                      <button className="btn btn-soft btn-sm" type="button" onClick={() => void syncLocalHistoryToAccount()} disabled={historySyncState === "saving"}>
                        Save local <span>{syncableLocalHistoryCount}</span>
                      </button>
                    ) : null}
                    {clearHistoryTargetCount ? (
                      <button
                        className="btn btn-soft btn-sm"
                        type="button"
                        onClick={() => setConfirmingClearHistory(true)}
                      >
                        {clearHistoryLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
                {confirmingClearHistory && clearHistoryTargetCount ? (
                  <div className="history-confirm-inline" role="alert">
                    <div>
                      <strong>Clear {clearHistoryRunLabel}?</strong>
                      <span>{clearHistoryDetail}</span>
                    </div>
                    <div>
                      <button className="btn btn-brand btn-sm" type="button" onClick={clearLocalHistory}>
                        Clear
                      </button>
                      <button className="btn btn-soft btn-sm" type="button" onClick={() => setConfirmingClearHistory(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
                {visibleHistoryGroups.length ? (
                  <div className={`history-overview ${showAccountHistorySummary ? "" : "compact"}`} aria-label="Saved project overview">
                    <div>
                      <strong>{visibleRunCount}</strong>
                      <span>{visibleRunCount === 1 ? "Run" : "Runs"}</span>
                    </div>
                    {showAccountHistorySummary ? (
                      <div>
                        <strong>{visibleAccountProjectCount}</strong>
                        <span>{visibleAccountProjectCount === 1 ? "Account project" : "Account projects"}</span>
                      </div>
                    ) : null}
                    <div>
                      <strong>{visibleRestoreReadyCount}</strong>
                      <span>Restore-ready</span>
                    </div>
                    <div>
                      <strong>{visibleDownloadReadyCount}</strong>
                      <span>Download-ready</span>
                    </div>
                  </div>
                ) : null}
                <div className={`history-content-grid${visibleSelectedHistoryItem && selectedHistoryGroup ? " has-detail" : ""}`}>
                  <div className="change-list panel-body history-project-list">
                    {visibleHistoryGroups.length ? visibleHistoryGroups.map((group) => {
                      const entry = group.latest;
                      const manageEntry = group.accountItem ?? entry;
                      const restorable = hasRestorableSnapshot(entry);
                      const primaryDownload = primaryHistoryDownloadFor(entry);
                      const availableDownloadCount = historyDownloadEntriesFor(entry).length;
                      const groupStatus = historyGroupStatus(group);
                      const entryStatus = historyRunStatus(entry, accountStatus?.entitlement);
                      const canManageProject = Boolean(group.accountItem?.projectId && signedIn);
                      const isEditingProject = Boolean(canManageProject && editingProjectId === group.accountItem?.projectId);
                      const actionBusy = group.items.some((item) => projectActionId === item.id);
                      const selected = group.items.some((item) => selectedHistoryId === item.id);
                      const active = group.items.some((item) => restoredHistoryId === item.id);
                      const latestDownloadLabel = primaryDownload?.format.toUpperCase() ?? entry.downloadFormat?.toUpperCase() ?? "PDF";
                      const entryTemplateName = historyTemplateNameFor(entry);
                      return (
                        <article className={`history-item${active ? " active" : ""}${selected ? " selected" : ""}`} key={group.key}>
                          <div className="history-item-main">
                            <div className="history-title-row">
                              {isEditingProject ? (
                                <label className="history-rename-field">
                                  <span className="sr-only">Saved project name</span>
                                  <input
                                    value={editingProjectTitle}
                                    onChange={(event) => setEditingProjectTitle(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") void submitProjectRename(manageEntry);
                                      if (event.key === "Escape") {
                                        setEditingProjectId(null);
                                        setEditingProjectTitle("");
                                      }
                                    }}
                                    autoFocus
                                  />
                                </label>
                              ) : (
                                <strong>{group.title}</strong>
                              )}
                              <small className={`history-sync-badge ${group.accountCount ? "account" : "local"}`}>{historyStorageLabel(group)}</small>
                              <small className={`history-sync-badge ${groupStatus.tone}`} title={groupStatus.detail}>
                                {groupStatus.label}
                              </small>
                              {active ? <small className="history-sync-badge open">Open now</small> : null}
                            </div>
                            <p>{group.target}</p>
                            <div className="history-project-facts" aria-label="Project facts">
                              <span>
                                <strong>{group.items.length}</strong>
                                <small>{group.items.length === 1 ? "Version" : "Versions"}</small>
                              </span>
                              <span>
                                <strong>{group.bestScore}/100</strong>
                                <small>Best fit</small>
                              </span>
                              <span>
                                <strong>{formatHistoryTimestamp(entry.createdAt)}</strong>
                                <small>Latest run</small>
                              </span>
                            </div>
                            <div className="history-project-meta" aria-label="Project run summary">
                              <span>{historyGroupSummary(group)}</span>
                              <span>{entryStatus.detail}</span>
                              <span>{entry.mode} mode</span>
                              {entryTemplateName ? <span>{entryTemplateName} direction</span> : null}
                            </div>
                            {projectActionMessage && actionBusy ? <small className="history-action-note error" role="alert">{projectActionMessage}</small> : null}
                          </div>
                          <div className="history-actions">
                            {isEditingProject ? (
                              <>
                                <button className="btn btn-brand btn-sm" type="button" onClick={() => void submitProjectRename(manageEntry)} disabled={actionBusy || !editingProjectTitle.trim()}>
                                  Save
                                </button>
                                <button className="btn btn-soft btn-sm" type="button" onClick={() => { setEditingProjectId(null); setEditingProjectTitle(""); }} disabled={actionBusy}>
                                  Cancel
                                </button>
                              </>
                            ) : canManageProject ? (
                              <>
                                <button className="ghost-button history-action-manage" type="button" onClick={() => startRenameProject(manageEntry)} disabled={actionBusy}>
                                  Rename <RoleForgeIcon name="edit" size={14} />
                                </button>
                                {confirmingDeleteProjectId === manageEntry.projectId ? (
                                  <div className="history-confirm-actions" role="alert" aria-label={`Confirm deleting ${group.title}`}>
                                    <button className="ghost-button danger history-action-manage" type="button" onClick={() => void removeSavedProject(manageEntry)} disabled={actionBusy}>
                                      Confirm delete
                                    </button>
                                    <button className="ghost-button history-action-manage" type="button" onClick={() => setConfirmingDeleteProjectId(null)} disabled={actionBusy}>
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button className="ghost-button history-action-manage" type="button" onClick={() => setConfirmingDeleteProjectId(manageEntry.projectId ?? null)} disabled={actionBusy}>
                                    Delete <RoleForgeIcon name="x" size={14} />
                                  </button>
                                )}
                              </>
                            ) : null}
                            <button
                              className="ghost-button history-action-details"
                              type="button"
                              onClick={() => (selected ? closeHistoryDetails() : openHistoryDetails(entry))}
                              aria-pressed={selected}
                              aria-label={selected ? `Hide details for ${entry.filename}` : `Show details for ${entry.filename}`}
                            >
                              {selected ? "Hide" : "Details"} <RoleForgeIcon name="doc" size={14} />
                            </button>
                            <button
                              className="ghost-button history-action-restore"
                              type="button"
                              onClick={() => restoreHistoryItem(entry)}
                              disabled={!restorable}
                              title={restorable ? `Restore ${entry.filename} in the studio` : "This saved run only has a download link"}
                              aria-label={`Restore ${entry.filename} in the studio`}
                            >
                              Restore <RoleForgeIcon name="edit" size={14} />
                            </button>
                            {primaryDownload ? (
                              <a className="ghost-button history-action-download" href={primaryDownload.url} download aria-label={`Download ${latestDownloadLabel} for ${entry.filename}`}>
                                <span className="history-download-prefix">Download </span>{latestDownloadLabel}{availableDownloadCount > 1 ? ` +${availableDownloadCount - 1}` : ""} <RoleForgeIcon name="download" size={14} />
                              </a>
                            ) : (
                              <button className="ghost-button history-action-download" type="button" disabled aria-label={`${latestDownloadLabel} download is not ready for ${entry.filename}`}><span className="history-download-prefix">Download </span>{latestDownloadLabel} <RoleForgeIcon name="download" size={14} /></button>
                            )}
                          </div>
                        </article>
                      );
                    }) : (
                      <div className="empty-state">
                        <strong>{historyEmptyTitle}</strong>
                        <p>{historyEmptyDetail}</p>
                        <button
                          className="btn btn-soft btn-sm empty-state-action"
                          type="button"
                          onClick={() => {
                            setActiveTab("score");
                            scrollToStudioEditor();
                          }}
                        >
                          Start a run
                        </button>
                      </div>
                    )}
                  </div>
                  {visibleSelectedHistoryItem && selectedHistoryGroup ? (
                    <aside className="history-detail-panel" aria-label="Saved project details" ref={historyDetailRef} tabIndex={-1}>
                      <div>
                        <div className="history-detail-heading">
                          <div>
                            <div className="eyebrow">Project detail</div>
                            <h3>{selectedHistoryGroup.title}</h3>
                          </div>
                          <button
                            className="ghost-button history-detail-close"
                            type="button"
                            onClick={closeHistoryDetails}
                            aria-label={`Close details for ${selectedHistoryGroup.title}`}
                          >
                            Close <RoleForgeIcon name="x" size={12} />
                          </button>
                        </div>
                        <p>{selectedHistoryGroup.target}</p>
                        <div className="history-detail-badges" aria-label="Selected project state">
                          <span>{historyStorageLabel(selectedHistoryGroup)}</span>
                          <span>{selectedHistoryVersionLabel}</span>
                          {selectedHistoryStatus ? <span>{selectedHistoryStatus.label}</span> : null}
                          {selectedHistoryTemplateName ? <span>{selectedHistoryTemplateName} direction</span> : null}
                        </div>
                      </div>
                    <dl>
                      <div>
                        <dt>{selectedHistoryGroup.items.length === 1 ? "Run" : "Runs"}</dt>
                        <dd>{selectedHistoryGroup.items.length}</dd>
                      </div>
                      <div>
                        <dt>Storage</dt>
                        <dd>{historyStorageLabel(selectedHistoryGroup)}</dd>
                      </div>
                      <div>
                        <dt>Best score</dt>
                        <dd>{selectedHistoryGroup.bestScore}/100</dd>
                      </div>
                      <div>
                        <dt>Export</dt>
                        <dd>{selectedHistoryStatus?.detail ?? (selectedHistoryDownloadCount ? `${selectedHistoryDownloadCount} file${selectedHistoryDownloadCount === 1 ? "" : "s"} ready` : "Needs re-export")}</dd>
                      </div>
                    </dl>
                    <div className="history-selected-run">
                      <span>{selectedHistoryVersionLabel}</span>
                      <strong>{formatHistoryTimestamp(visibleSelectedHistoryItem.createdAt)}</strong>
                      <small>{visibleSelectedHistoryItem.score}/100 · {visibleSelectedHistoryItem.mode} · {historyStatusLabel(visibleSelectedHistoryItem, syncedHistoryIds)}</small>
                    </div>
                    <div className="history-detail-actions" aria-label="Selected saved run actions">
                      <button
                        className="btn btn-brand btn-sm"
                        type="button"
                        onClick={() => restoreHistoryItem(visibleSelectedHistoryItem)}
                        disabled={!selectedHistoryRestorable}
                        title={selectedHistoryRestorable ? `Restore ${visibleSelectedHistoryItem.filename} in the studio` : "This saved run only has a download link"}
                      >
                        Restore in studio <RoleForgeIcon name="edit" size={12} />
                      </button>
                      {selectedHistoryPrimaryDownload ? (
                        <a className="btn btn-soft btn-sm" href={selectedHistoryPrimaryDownload.url} download>
                          Download {selectedHistoryPrimaryDownloadLabel} <RoleForgeIcon name="download" size={12} />
                        </a>
                      ) : (
                        <button className="btn btn-soft btn-sm" type="button" disabled title={selectedHistoryActionCopy?.downloadFallbackTitle}>
                          {selectedHistoryActionCopy?.downloadFallbackLabel ?? `Download ${selectedHistoryPrimaryDownloadLabel}`} <RoleForgeIcon name="download" size={12} />
                        </button>
                      )}
                    </div>
                    <div className="history-export-panel">
                      <div>
                        <span className="eyebrow">Export this run</span>
                        <strong>{selectedHistoryActionCopy?.exportHeading ?? "Create a fresh file from the saved tailored resume"}</strong>
                      </div>
                      <div className="history-export-actions" aria-label="Export selected saved run">
                        {exportFormats.map((format) => {
                          const label = format.format.toUpperCase();
                          const exporting = historyExportRequest?.id === visibleSelectedHistoryItem.id && historyExportRequest.format === format.format;
                          const locked = !format.enabled;
                          const blocked = !hasRestorableSnapshot(visibleSelectedHistoryItem);
                          const existingDownloadReady =
                            Boolean(historyDownloads(visibleSelectedHistoryItem)[format.format]) &&
                            exportFormatAllowed(format.format, accountStatus?.entitlement);
                          return (
                            <button
                              className={`btn btn-soft btn-sm ${format.enabled ? "" : "locked"}`}
                              type="button"
                              key={`history-export-${visibleSelectedHistoryItem.id}-${format.format}`}
                              onClick={() => void exportHistoryItem(visibleSelectedHistoryItem, format.format)}
                              disabled={blocked || Boolean(historyExportRequest)}
                              title={blocked ? selectedHistoryActionCopy?.blockedExportTitle : locked ? `${label} exports unlock with Premium` : `Export ${label}`}
                              aria-label={locked ? `${label} export requires Premium` : `Export ${label}`}
                            >
                              {locked ? <RoleForgeIcon name="lock" size={12} /> : null}
                              {exporting ? `Exporting ${label}` : locked ? `Premium ${label}` : existingDownloadReady ? `Refresh ${label}` : `Export ${label}`}
                            </button>
                          );
                        })}
                      </div>
                      {premiumExportRequested && !accountPremiumActive ? (
                        <div className="history-export-upgrade" role="status">
                          <span>{premiumExportRequested.label} is a Premium export.</span>
                          <Link href="/settings#billing">View plans</Link>
                        </div>
                      ) : null}
                    </div>
                    {visibleSelectedHistoryDownloads.length ? (
                      <div className="history-download-panel" aria-label="Ready downloads for selected run">
                        <span className="eyebrow">Ready downloads</span>
                        <div>
                          {visibleSelectedHistoryDownloads.map((download) => (
                            <a className="btn btn-soft btn-sm" href={download.url} download key={`selected-download-${download.format}`}>
                              Download {download.format.toUpperCase()} <RoleForgeIcon name="download" size={12} />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="history-version-list" aria-label="Runs in this project">
                      {selectedHistoryVersions.map((entry, index) => {
                        const restorable = hasRestorableSnapshot(entry);
                        const versionLabel = historyVersionLabel(selectedHistoryGroup.items.length, index);
                        const entryDownloads = historyDownloadEntriesFor(entry);
                        const entryStatus = historyRunStatus(entry, accountStatus?.entitlement);
                        return (
                          <article className={selectedHistoryId === entry.id ? "selected" : ""} key={`detail-${entry.id}`}>
                            <button type="button" onClick={() => setSelectedHistoryId(entry.id)} aria-pressed={selectedHistoryId === entry.id}>
                              <strong>{versionLabel}</strong>
                              <span>{formatHistoryTimestamp(entry.createdAt)} · {entry.score}/100 · {entry.mode} · {historyStatusLabel(entry, syncedHistoryIds)}</span>
                            </button>
                            <div>
                              <button
                                className="btn btn-soft btn-sm"
                                type="button"
                                onClick={() => restoreHistoryItem(entry)}
                                disabled={!restorable}
                                title={restorable ? `Restore ${entry.filename} in the studio` : "This saved run only has a download link"}
                              >
                                Restore
                              </button>
                              {entryDownloads.length ? (
                                <span className="history-version-formats">
                                  {entryDownloads.map((download) => download.format.toUpperCase()).join(" / ")} ready
                                </span>
                              ) : (
                                <span className="history-version-formats muted">{entryStatus.label}</span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                      {hiddenHistoryVersionCount ? (
                        <button
                          className="history-version-more"
                          type="button"
                          onClick={() => setExpandedHistoryGroupKey(selectedHistoryGroup.key)}
                        >
                          Show {hiddenHistoryVersionCount} older run{hiddenHistoryVersionCount === 1 ? "" : "s"}
                        </button>
                      ) : selectedHistoryGroup.items.length > 5 ? (
                        <button
                          className="history-version-more"
                          type="button"
                          onClick={() => setExpandedHistoryGroupKey(null)}
                        >
                          Show latest 5 runs
                        </button>
                      ) : null}
                    </div>
                    </aside>
                  ) : null}
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
