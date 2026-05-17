"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { createRoleForgeBrowserClient } from "../lib/supabase/client";
import { deleteSavedProject, loadSavedRuns, renameSavedProject, saveCompletedRun } from "../lib/supabase/savedProjectClient";

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

type UploadFormat = "docx" | "pdf" | "txt";
type ExportFormat = "pdf" | "docx" | "txt";
type UploadCapability = { format: UploadFormat; label: string; enabled: boolean };
type ExportCapability = { format: ExportFormat; label: string; enabled: boolean; plan?: "free" | "premium"; reason?: string };
type CapabilitiesResponse = { upload_formats?: UploadCapability[]; export_formats?: ExportCapability[] };
type UploadResponse = {
  resume_id: string;
  filename: string;
  format?: UploadFormat;
  character_count?: number;
  text_preview?: string;
};
type ExportResponse = { saved_to: string; download_filename: string };
type Stage = "idle" | "uploading" | "tailoring" | "exporting" | "ready" | "error";
type InputMode = "text" | "url";
type PreviewMode = "tailored" | "original" | "diff";
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
};
type AccountUser = { id: string; email?: string; name?: string };
type AccountStatus = {
  configured: boolean;
  enabled: boolean;
  provider: "supabase";
  user: AccountUser | null;
  next: string;
};
type HistoryItem = {
  id: string;
  accountRunId?: string;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
  filename: string;
  mode: TailoringMode;
  score: number;
  downloadUrl: string;
  downloadFormat?: ExportFormat;
  roleHint: string;
  saved?: boolean;
  source?: "local" | "account";
  snapshot?: SavedRunSnapshot;
};
type HistoryGroup = {
  key: string;
  title: string;
  target: string;
  latest: HistoryItem;
  accountItem?: HistoryItem;
  items: HistoryItem[];
  accountCount: number;
  localCount: number;
  restorableCount: number;
  downloadableCount: number;
  bestScore: number;
};
type ApiErrorPayload = { error?: { code?: string; message?: string; request_id?: string; details?: unknown } };
type StudioSuggestion = { label: string; meta: string; before?: string; after: string; tone?: "good" | "warn" | "neutral" };
type ParsedResumeSection = { title: string; lines: string[] };
type ParsedResume = { name: string; role: string; contact: string; sections: ParsedResumeSection[] };
type ParsedResumeEntry = { title: string; meta?: string; date?: string; details: string[]; bullets: string[] };
type PlainResumeLine = { text: string; kind: "heading" | "bullet" | "body" };

const HISTORY_KEY = "resume-tailor-history-v1";
const SYNCED_HISTORY_KEY = "roleforge-synced-history-v1";
const DEFAULT_UPLOAD_FORMATS: UploadCapability[] = [
  { format: "docx", label: "DOCX", enabled: true },
  { format: "pdf", label: "PDF", enabled: true },
  { format: "txt", label: "TXT", enabled: true },
];
const DEFAULT_EXPORT_FORMATS: ExportCapability[] = [
  { format: "pdf", label: "PDF", enabled: true, plan: "free" },
  { format: "docx", label: "DOCX", enabled: false, plan: "premium", reason: "Premium coming soon" },
  { format: "txt", label: "TXT", enabled: false, plan: "premium", reason: "Premium coming soon" },
];

function customerExportFormats(formats?: ExportCapability[]) {
  const pdfCapability = formats?.find((format) => format.format === "pdf");
  return DEFAULT_EXPORT_FORMATS.map((format) =>
    format.format === "pdf"
      ? { ...format, enabled: pdfCapability?.enabled ?? format.enabled, reason: pdfCapability?.reason }
      : { ...format, enabled: false, plan: "premium" as const, reason: "Coming soon" },
  );
}

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

const RESUME_SECTION_TITLES: Record<string, string> = {
  "professional summary": "Professional summary",
  summary: "Professional summary",
  profile: "Professional summary",
  objective: "Professional summary",
  "career summary": "Professional summary",
  experience: "Experience",
  "work experience": "Experience",
  "professional experience": "Experience",
  "relevant experience": "Experience",
  "employment history": "Experience",
  "work history": "Experience",
  "selected experience": "Experience",
  skills: "Skills",
  "technical skills": "Skills",
  "core skills": "Skills",
  "key skills": "Skills",
  competencies: "Skills",
  "tools and technologies": "Skills",
  projects: "Projects",
  "selected projects": "Projects",
  education: "Education",
  certifications: "Certifications",
  awards: "Awards",
  achievements: "Achievements",
};

function normalizeResumeLine(line: string) {
  return line
    .replace(/\r/g, "")
    .replace(/^```[a-z]*$/i, "")
    .replace(/^#{1,4}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[•●]\s*/, "- ")
    .trim();
}

function normalizeHeadingKey(line: string) {
  return normalizeResumeLine(line)
    .replace(/^[\s:.-]+/, "")
    .replace(/[\s:.-]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSectionMarker(line: string): { title: string; rest?: string } | null {
  const cleaned = normalizeResumeLine(line);
  const exactTitle = RESUME_SECTION_TITLES[normalizeHeadingKey(cleaned)];
  if (exactTitle) return { title: exactTitle };

  const inlineMatch = cleaned.match(/^([A-Za-z][A-Za-z /&+-]{2,42})(?:\:|\s[-–—]\s)(.+)$/);
  if (!inlineMatch) return null;

  const inlineTitle = RESUME_SECTION_TITLES[normalizeHeadingKey(inlineMatch[1])];
  if (!inlineTitle) return null;

  return { title: inlineTitle, rest: inlineMatch[2].trim() };
}

function looksLikeContactLine(line: string) {
  return /@|\+?\d[\d\s().-]{6,}|linkedin|github|portfolio|https?:\/\/|www\.|[A-Z][a-z]+,\s*[A-Z]{2}/i.test(line);
}

function splitHeaderParts(line: string) {
  return normalizeResumeLine(line)
    .split(/\s+\|\s+|\s+•\s+|\s+·\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isDocumentLabel(line: string) {
  return ["tailored resume", "resume", "generated resume", "role-targeted draft"].includes(normalizeHeadingKey(line));
}

function parseResumeText(text?: string): ParsedResume | null {
  const lines = (text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map(normalizeResumeLine)
    .filter((line) => line && !line.startsWith("```") && !isDocumentLabel(line));

  if (!lines.length) return null;

  const firstHeadingIndex = lines.findIndex((line) => Boolean(getSectionMarker(line)));
  const headerLines = firstHeadingIndex >= 0 ? lines.slice(0, firstHeadingIndex) : lines.slice(0, Math.min(4, lines.length));
  const headerParts = headerLines.flatMap(splitHeaderParts);
  let name = "Tailored Resume";
  let role = "Role-targeted draft";
  const contactParts: string[] = [];

  for (const part of headerParts) {
    if (name === "Tailored Resume" && !looksLikeContactLine(part)) {
      name = part;
    } else if (role === "Role-targeted draft" && !looksLikeContactLine(part)) {
      role = part;
    } else {
      contactParts.push(part);
    }
  }

  if (name === "Tailored Resume" && lines[0] && !getSectionMarker(lines[0])) {
    const [firstPart, secondPart, ...restParts] = splitHeaderParts(lines[0]);
    name = firstPart || name;
    if (secondPart && !looksLikeContactLine(secondPart)) role = secondPart;
    contactParts.push(...restParts);
  }

  const contentLines = firstHeadingIndex >= 0 ? lines.slice(firstHeadingIndex) : lines.slice(headerLines.length);
  const sections: ParsedResumeSection[] = [];

  for (const line of contentLines) {
    const marker = getSectionMarker(line);
    if (marker) {
      sections.push({ title: marker.title, lines: marker.rest ? [marker.rest] : [] });
    } else if (sections.length) {
      sections[sections.length - 1].lines.push(line);
    } else {
      sections.push({ title: "Professional summary", lines: [line] });
    }
  }

  if (name === "Tailored Resume" && sections[0]?.title === "Professional summary") {
    const summaryHeaderParts = splitHeaderParts(sections[0].lines[0] ?? "");
    if (summaryHeaderParts.length >= 2 && !looksLikeContactLine(summaryHeaderParts[0])) {
      name = summaryHeaderParts[0];
      const rolePart = summaryHeaderParts.find((part, index) => index > 0 && !looksLikeContactLine(part));
      if (rolePart) role = rolePart;
      contactParts.push(...summaryHeaderParts.filter((part) => part !== name && part !== rolePart));
      sections[0].lines = sections[0].lines.slice(1);

      while (sections[0]?.lines[0] && looksLikeContactLine(sections[0].lines[0])) {
        contactParts.push(sections[0].lines[0]);
        sections[0].lines = sections[0].lines.slice(1);
      }
    }
  }

  return {
    name,
    role,
    contact: Array.from(new Set(contactParts)).join(" · "),
    sections: sections.filter((section) => section.lines.length),
  };
}

function isBulletLine(line: string) {
  return /^[-•*]\s+/.test(line);
}

function cleanBulletLine(line: string) {
  return line.replace(/^[-•*]\s+/, "");
}

function looksLikeDateRange(line: string) {
  return /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|present|current|\d{4})\b/i.test(line);
}

function splitResumeDetailParts(line: string) {
  return normalizeResumeLine(line)
    .split(/\s+\|\s+|\s+•\s+|\s+·\s+|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isStructuredResumeSection(title: string) {
  return /experience|project|education|certification|award|achievement/i.test(title);
}

function looksLikeResumeEntryStart(line: string, nextLine?: string) {
  if (!line || isBulletLine(line) || looksLikeContactLine(line) || getSectionMarker(line)) return false;
  if (line.length > 120) return false;
  if (looksLikeDateRange(line) && line.length < 24) return false;

  const roleWords =
    /engineer|developer|manager|lead|analyst|designer|director|consultant|specialist|coordinator|architect|product|project|program|operations|marketing|sales|founder|intern|assistant|associate|researcher|student|certified|certificate|degree|bachelor|master/i;
  const organizationWords = /remote|hybrid|onsite|company|inc\.?|llc|corp|university|college|school|bootcamp|ltd\.?/i;

  return (
    roleWords.test(line) ||
    splitResumeDetailParts(line).some(looksLikeDateRange) ||
    Boolean(nextLine && !isBulletLine(nextLine) && nextLine.length < 90 && (looksLikeDateRange(nextLine) || organizationWords.test(nextLine)))
  );
}

function parseResumeEntryHeader(line: string) {
  const parts = splitResumeDetailParts(line);
  const dateParts = parts.filter(looksLikeDateRange);
  const contentParts = parts.filter((part) => !looksLikeDateRange(part));
  const title = contentParts[0] || line;
  const meta = contentParts.slice(1).join(" · ") || undefined;
  const date = dateParts.join(" · ") || undefined;

  return { title, meta, date };
}

function buildResumeEntries(lines: string[]) {
  const entries: ParsedResumeEntry[] = [];
  let current: ParsedResumeEntry | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.title || current.details.length || current.bullets.length) entries.push(current);
    current = null;
  };

  lines.forEach((line, index) => {
    const nextLine = lines[index + 1];

    if (isBulletLine(line)) {
      if (!current) current = { title: "Selected work", details: [], bullets: [] };
      current.bullets.push(cleanBulletLine(line));
      return;
    }

    if (looksLikeDateRange(line) && line.length < 36 && current && !current.date) {
      current.date = line;
      return;
    }

    if (looksLikeResumeEntryStart(line, nextLine)) {
      pushCurrent();
      current = { ...parseResumeEntryHeader(line), details: [], bullets: [] };
      return;
    }

    if (current) {
      if (!current.meta && current.bullets.length === 0 && line.length < 90) {
        current.meta = line;
      } else {
        current.details.push(line);
      }
      return;
    }

    current = { title: "Overview", details: [line], bullets: [] };
  });

  pushCurrent();
  return entries;
}

function buildPlainResumeLines(text?: string): PlainResumeLine[] {
  return (text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map(normalizeResumeLine)
    .filter(Boolean)
    .slice(0, 90)
    .map((line) => {
      if (getSectionMarker(line) || (/^[A-Z][A-Z\s/&+-]{3,34}$/.test(line) && line.length <= 36)) {
        return { text: getSectionMarker(line)?.title ?? line, kind: "heading" };
      }
      if (isBulletLine(line)) return { text: cleanBulletLine(line), kind: "bullet" };
      return { text: line, kind: "body" };
    });
}

function fileUploadKey(file: File | null) {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : "";
}

function countReadableLines(text?: string) {
  return (text ?? "").split(/\r?\n/).filter((line) => line.trim()).length;
}

function PlainResumeDocument({
  text,
  keywords,
  mode,
  filename,
  uploadFormat,
  characterCount,
}: {
  text?: string;
  keywords: string[];
  mode: PreviewMode;
  filename?: string;
  uploadFormat?: UploadFormat;
  characterCount?: number;
}) {
  const lines = buildPlainResumeLines(text);
  const documentName = filename ? filename.replace(/\.(docx|pdf|txt)$/i, "") : mode === "original" ? "Original resume" : "Generated draft";
  const meta = [
    uploadFormat ? `${uploadFormat.toUpperCase()} source` : mode === "original" ? "Source preview" : "Generated resume",
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
        <h4>{mode === "original" ? "Source text" : "Generated content"}</h4>
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
      </section>
    </div>
  );
}

function PreviewLineList({
  lines,
  keywords,
  empty,
}: {
  lines: PlainResumeLine[];
  keywords: string[];
  empty: string;
}) {
  if (!lines.length) return <p className="rf-diff-empty">{empty}</p>;

  return (
    <div className="rf-diff-lines">
      {lines.slice(0, 14).map((line, index) => {
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
  const beforeLines = buildPlainResumeLines(sourceText).slice(0, 18);
  const afterLines = buildPlainResumeLines(tailoredText).slice(0, 18);
  const documentName = filename ? filename.replace(/\.(docx|pdf|txt)$/i, "") : "Resume";
  const hasBefore = Boolean(sourceText?.trim());
  const hasAfter = Boolean(tailoredText?.trim());

  return (
    <div className="rf-resume-paper rf-resume-paper-diff">
      <div className="rf-resume-head">
        <h3>Change review</h3>
        <p>{documentName}</p>
        <span>
          {hasBefore && hasAfter
            ? "Compare the source text with the tailored draft before export."
            : "Restore a completed run or finish the tailor workflow to compare both sides."}
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
          <PreviewLineList lines={beforeLines} keywords={[]} empty="Upload a resume, or restore a run with saved source text, to show the before state." />
        </article>
        <article className="rf-diff-column after">
          <div className="rf-diff-kicker">Tailored</div>
          <PreviewLineList lines={afterLines} keywords={keywords} empty="Run Tailor, or restore a restorable saved run, to show the after state." />
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
  hasTarget,
  stage,
  restored,
}: {
  mode: PreviewMode;
  filename?: string;
  uploadFormat?: UploadFormat;
  characterCount?: number;
  hasSourceText: boolean;
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
          { label: "Extraction", value: stage === "uploading" ? "Reading" : hasSourceText ? "Ready" : "Needed" },
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
            <span className={/waiting|needed/i.test(step.value) ? "waiting" : ""} key={`${step.label}-${step.value}`}>
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
  changeLog,
  hasTarget,
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
  changeLog?: string[];
  hasTarget: boolean;
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

  return <PlainResumeDocument text={text} keywords={keywords} mode={mode} filename={filename} uploadFormat={uploadFormat} characterCount={characterCount} />;
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

function hasRestorableSnapshot(item: HistoryItem) {
  return Boolean(item.snapshot?.result?.tailored_text?.trim());
}

function isAccountHistoryItem(item: HistoryItem, syncedIds: string[] = []) {
  return Boolean(item.saved || item.source === "account" || syncedIds.includes(item.id) || (item.accountRunId && syncedIds.includes(item.accountRunId)));
}

function historyStatusLabel(item: HistoryItem, syncedIds: string[] = []) {
  return isAccountHistoryItem(item, syncedIds) ? "Saved to account" : "This browser";
}

function historyProjectTitle(item: HistoryItem, syncedIds: string[] = []) {
  if (isAccountHistoryItem(item, syncedIds)) {
    return item.projectTitle || item.roleHint || item.filename;
  }
  return item.filename;
}

function historyProjectDetail(item: HistoryItem, syncedIds: string[] = []) {
  if (isAccountHistoryItem(item, syncedIds)) {
    return item.filename === historyProjectTitle(item, syncedIds) ? item.roleHint : item.filename;
  }
  return item.roleHint;
}

function historySortValue(item: HistoryItem) {
  const value = new Date(item.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function historyGroupKey(item: HistoryItem, syncedIds: string[] = []) {
  if (isAccountHistoryItem(item, syncedIds) && item.projectId) return `account:${item.projectId}`;
  const filename = item.filename.replace(/\s+/g, " ").trim().toLowerCase();
  const target = item.roleHint.replace(/\s+/g, " ").trim().toLowerCase();
  return `local:${filename}:${target}`;
}

function historyStorageLabel(group: HistoryGroup) {
  if (group.accountCount && group.localCount) return "Account + browser";
  if (group.accountCount) return "Account";
  return "This browser";
}

function historyGroupSummary(group: HistoryGroup) {
  const runLabel = `${group.items.length} run${group.items.length === 1 ? "" : "s"}`;
  const restoreLabel = group.restorableCount
    ? `${group.restorableCount} restore-ready`
    : group.downloadableCount
      ? "Download only"
      : "No export";
  return `${runLabel} · best ${group.bestScore}/100 · ${restoreLabel}`;
}

function groupHistoryItems(items: HistoryItem[], syncedIds: string[] = []): HistoryGroup[] {
  const groups = new Map<string, HistoryItem[]>();

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
        downloadableCount: sorted.filter((item) => item.downloadUrl && item.downloadUrl !== "#").length,
        bestScore: Math.max(...sorted.map((item) => item.score || 0)),
      };
    })
    .sort((a, b) => historySortValue(b.latest) - historySortValue(a.latest))
    .slice(0, 12);
}

function mergeHistory(localItems: HistoryItem[], savedItems: HistoryItem[]) {
  const merged = new Map<string, HistoryItem>();

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
            snapshot: existing.snapshot ?? item.snapshot,
          }
        : item,
    );
  });

  return [...merged.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorPayload;
    const message = data.error?.message;
    const code = data.error?.code;
    const requestId = data.error?.request_id;
    if (message) return [message, code ? `Code: ${code}` : "", requestId ? `Request: ${requestId}` : ""].filter(Boolean).join(" ");
  } catch {
    // Keep the interaction moving with the fallback below.
  }
  return fallback;
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
      return "Account sign-in is not enabled in this environment.";
    case "signin-error":
      if (safeDetail) return `Sign-in could not finish: ${safeDetail}`;
      return "Sign-in could not start. Check the email and try again.";
    default:
      return "";
  }
}

function isUrlTarget(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value.trim());
}

function readableDomainName(hostname: string) {
  const clean = hostname.replace(/^www\./i, "");
  const firstSegment = clean.split(".").find(Boolean) || clean;
  return firstSegment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

function parseTargetUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !isUrlTarget(trimmed)) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, "");

    return {
      host,
      label: `${readableDomainName(host)} job target`,
    };
  } catch {
    return {
      host: "Job URL",
      label: "Job URL target",
    };
  }
}

export default function Page() {
  const baseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL;
    return value && value.trim() ? value.trim() : "";
  }, []);
  const supabaseClient = useMemo(() => createRoleForgeBrowserClient(), []);

  const [file, setFile] = useState<File | null>(null);
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
  const [error, setError] = useState("");

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadResponse | null>(null);
  const [uploadFileKey, setUploadFileKey] = useState("");
  const [previewUploadState, setPreviewUploadState] = useState<PreviewUploadState>("idle");
  const [previewUploadError, setPreviewUploadError] = useState("");
  const [sourcePreviewText, setSourcePreviewText] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historySyncState, setHistorySyncState] = useState<"local" | "loading" | "synced" | "saving" | "error">("local");
  const [historySyncMessage, setHistorySyncMessage] = useState("Local browser history");
  const [syncedHistoryIds, setSyncedHistoryIds] = useState<string[]>([]);
  const [restoredHistoryId, setRestoredHistoryId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState("");
  const [projectActionId, setProjectActionId] = useState<string | null>(null);
  const [projectActionMessage, setProjectActionMessage] = useState("");
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse | null>(null);
  const editorSectionRef = useRef<HTMLElement | null>(null);
  const historySectionRef = useRef<HTMLElement | null>(null);
  const historyDetailRef = useRef<HTMLElement | null>(null);

  const accountUser = accountStatus?.user ?? null;
  const accountReady = Boolean(accountStatus?.configured && accountStatus.enabled);
  const signedIn = Boolean(accountUser);

  const workflowHeaders = useCallback(async (extra: Record<string, string> = {}) => {
    if (!supabaseClient) return extra;

    const { data, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw new Error("Account session is not ready yet.");

    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in to use the resume workflow.");

    return { ...extra, Authorization: `Bearer ${token}` };
  }, [supabaseClient]);

  useEffect(() => {
    setHistory(loadHistory());
    setSyncedHistoryIds(loadSyncedHistoryIds());
  }, []);

  const refreshSavedRuns = useCallback(async (options: { quiet?: boolean } = {}) => {
    if (!signedIn) {
      setHistorySyncState("local");
      setHistorySyncMessage("Sign in to sync completed runs");
      return;
    }

    if (!accountReady) {
      setHistorySyncState("error");
      setHistorySyncMessage("Account sync is not ready yet. Local history still works.");
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
          ? "Sign in again to refresh saved projects."
          : "Saved projects could not refresh. Local history still works.",
      );
    }
  }, [accountReady, signedIn]);

  useEffect(() => {
    void refreshSavedRuns();
  }, [refreshSavedRuns]);

  function openHistoryPanel() {
    setActiveTab("history");
    setAccountPanelOpen(false);
    window.setTimeout(() => {
      historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function openHistoryDetails(entry: HistoryItem) {
    setSelectedHistoryId(entry.id);
    setAccountPanelOpen(false);
    setProjectActionMessage("");
    window.setTimeout(() => {
      historyDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      historyDetailRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function scrollToStudioEditor() {
    window.setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editorSectionRef.current?.focus({ preventScroll: true });
    }, 30);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/status", {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Account status failed");
        return (await response.json()) as AccountStatus;
      })
      .then((data) => setAccountStatus(data))
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") {
          setAccountStatus({
            configured: false,
            enabled: false,
            provider: "supabase",
            user: null,
            next: "Account status is unavailable.",
          });
        }
      });

    return () => controller.abort();
  }, []);

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
        return (await response.json()) as CapabilitiesResponse;
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
    setStage("idle");
    setError("");
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
        if (!response.ok) throw new Error(await readApiError(response, "Could not read this resume yet."));
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

    const controller = new AbortController();
    setDownloadState("checking");
    setDownloadMessage("Checking PDF download...");

    fetch(downloadUrl, {
      method: "HEAD",
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.ok) {
          setDownloadState("ready");
          setDownloadMessage("PDF download is ready");
        } else {
          setDownloadState("expired");
          setDownloadMessage("This PDF link expired. Run the tailor again to create a fresh export.");
        }
      })
      .catch((caught) => {
        if ((caught as Error).name === "AbortError") return;
        setDownloadState("expired");
        setDownloadMessage("This PDF link could not be checked. Run the tailor again if the download does not open.");
      });

    return () => controller.abort();
  }, [downloadUrl]);

  const hasTarget = Boolean(jdUrl.trim() || jdText.trim());
  const readyItems = [Boolean(baseUrl), Boolean(file), hasTarget];
  const readiness = Math.round((readyItems.filter(Boolean).length / readyItems.length) * 100);
  const canRun = Boolean(baseUrl && file && hasTarget && !busy && previewUploadState !== "reading" && (!accountStatus?.configured || signedIn));

  const score = result?.score_summary?.fit_after ?? result?.fit_score_after?.score ?? result?.fit_score?.score ?? 0;
  const presentKeywords = result?.fit_score_after?.present ?? result?.fit_score?.present ?? [];
  const missingKeywords = result?.fit_score_after?.missing ?? result?.fit_score?.missing ?? [];
  const atsIssues = result?.ats_after?.issues ?? [];
  const gapEvidence = result?.gap_analysis?.evidence_to_add ?? [];
  const interviewPrep = result?.interview_prep ?? [];
  const warnings = result?.warnings ?? [];

  async function upload(): Promise<UploadResponse> {
    if (!baseUrl) throw new Error("The resume workflow is not available yet.");
    if (!file) throw new Error("Select a resume file first.");
    const currentFileKey = fileUploadKey(file);

    if (resumeId && uploadMeta && uploadFileKey === currentFileKey) {
      return uploadMeta;
    }

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form, headers: await workflowHeaders() });
    if (!response.ok) throw new Error(await readApiError(response, "Upload failed"));

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
    if (!baseUrl) throw new Error("The resume workflow is not available yet.");

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
    if (!response.ok) throw new Error(await readApiError(response, "Tailor failed"));

    const data = (await response.json()) as TailorResult;
    setResult(data);
    return data;
  }

  async function exportResume(tailoredText: string, format: ExportFormat = "pdf"): Promise<string> {
    if (!baseUrl) throw new Error("Export is not available yet.");

    const response = await fetch(`${baseUrl}/export`, {
      method: "POST",
      headers: await workflowHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        filename: `tailored_resume.${format}`,
        title: "TAILORED RESUME",
        content: tailoredText,
        format,
      }),
    });
    if (!response.ok) throw new Error(await readApiError(response, "Export failed"));

    const data = (await response.json()) as ExportResponse;
    const url = `${baseUrl}/download/${data.download_filename}`;
    setDownloadUrl(url);
    setDownloadState("checking");
    setDownloadMessage("Checking PDF download...");
    return url;
  }

  async function syncCompletedRun(item: HistoryItem, output: TailorResult, url: string) {
    if (!signedIn || !accountReady) {
      setHistorySyncState("local");
      setHistorySyncMessage(signedIn ? "Account sync is not ready yet. Local history still works." : "Sign in to sync completed runs");
      return;
    }

    const outputPresent = output.fit_score_after?.present ?? output.fit_score?.present ?? [];
    const outputReadSeconds = output.tailored_text
      ? Math.max(20, Math.round((output.tailored_text.split(/\s+/).length / 220) * 60))
      : undefined;

    setHistorySyncState("saving");
    setHistorySyncMessage("Saving completed run...");

    try {
      const savedRun = await saveCompletedRun({
        ...item,
        sourceResumeName: file?.name,
        jobTarget: jdText.trim() || jdUrl.trim() || item.roleHint,
        companyUrl: companyUrl.trim() || undefined,
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

      const nextIds = [item.id, savedRun.runId, ...syncedHistoryIds.filter((id) => id !== item.id && id !== savedRun.runId)].slice(0, 40);
      setSyncedHistoryIds(nextIds);
      saveSyncedHistoryIds(nextIds);
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
      setHistorySyncMessage("Saved to your account and ready to restore");
    } catch {
      setHistorySyncState("error");
      setHistorySyncMessage("Could not sync this run. It is still saved locally.");
    }
  }

  function buildRunSnapshot(output: TailorResult, uploadData: UploadResponse, url: string): SavedRunSnapshot {
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
      downloadFormat: "pdf",
    };
  }

  function restoreHistoryItem(entry: HistoryItem) {
    const snapshot = entry.snapshot;
    if (!snapshot?.result?.tailored_text?.trim()) {
      setHistorySyncState("error");
      setHistorySyncMessage("This older run has a download link, but no restorable studio snapshot.");
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
    setDownloadUrl(snapshot.downloadUrl || entry.downloadUrl || null);
    setJdText(snapshot.jdText ?? "");
    setJdUrl(snapshot.jdUrl ?? "");
    setCompanyUrl(snapshot.companyUrl ?? "");
    setInputMode(snapshot.inputMode ?? (snapshot.jdUrl ? "url" : "text"));
    setTailoringMode(snapshot.tailoringMode ?? entry.mode);
    setStage("ready");
    setError("");
    setCopyState("");
    setAccountPanelOpen(false);
    setActiveTab("score");
    setSelectedHistoryId(entry.id);
    setPreviewMode("tailored");
    setRestoredHistoryId(entry.id);
    setHistorySyncState(isAccountHistoryItem(entry, syncedHistoryIds) ? "synced" : "local");
    setHistorySyncMessage(`${entry.filename} is open in the studio`);
    setCopyState(`${entry.filename} restored`);
    scrollToStudioEditor();
  }

  function clearLocalHistory() {
    const next = signedIn ? history.filter((entry) => isAccountHistoryItem(entry, syncedHistoryIds)) : [];
    setHistory(next);
    saveHistory(next);
    setRestoredHistoryId((current) => (current && next.some((entry) => entry.id === current) ? current : null));
    setSelectedHistoryId((current) => (current && next.some((entry) => entry.id === current) ? current : null));
  }

  function startRenameProject(entry: HistoryItem) {
    if (!entry.projectId) return;
    setEditingProjectId(entry.projectId);
    setEditingProjectTitle(historyProjectTitle(entry, syncedHistoryIds));
    setProjectActionMessage("");
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
    }
  }

  async function onRun() {
    if (!canRun) return;

    setBusy(true);
    setError("");
    setResult(null);
    setDownloadUrl(null);
    setCopyState("");

    try {
      setStage("uploading");
      const uploadData = await upload();
      const id = uploadData.resume_id;
      setStage("tailoring");
      const output = await tailor(id);
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
        roleHint: (jdText || jdUrl || "Role target").slice(0, 90),
        saved: false,
        source: "local",
        snapshot,
      };
      const nextHistory = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, 12);
      setHistory(nextHistory);
      saveHistory(nextHistory);
      void syncCompletedRun(item, output, url);
      setStage("ready");
      setActiveTab("score");
      setPreviewMode("tailored");
      setRestoredHistoryId(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Something went wrong";
      setError(message);
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  }

  async function copyDownloadUrl() {
    if (!downloadUrl || downloadState !== "ready") return;
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopyState("Copied");
      window.setTimeout(() => setCopyState(""), 1600);
    } catch {
      setCopyState("Copy failed");
    }
  }

  const firstTargetLine = (jdText || jdUrl).split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
  const activeResumeName = (file?.name || uploadMeta?.filename)?.replace(/\.(docx|pdf|txt)$/i, "") || "Resume studio";
  const targetUrlInfo = parseTargetUrl(firstTargetLine);
  const activeRole = targetUrlInfo?.label || firstTargetLine || (hasTarget ? "Role target loaded" : "Add a role target");
  const activeTitle = hasTarget && firstTargetLine ? firstTargetLine : activeResumeName;
  const activeDetail = result
    ? targetUrlInfo?.host
      ? `Tailored and exported for ${targetUrlInfo.host}`
      : "Tailored and exported from the current workflow"
    : (file || uploadMeta)
      ? "Resume selected · add a target and run the workflow"
      : "Upload a resume, add a job target, then run the workflow";
  const topbarLabel = compactLabel(hasTarget ? activeRole : activeResumeName, 36);
  const heroLabel = compactLabel(hasTarget ? activeRole : activeResumeName, 44);
  const targetLabel = compactLabel(activeRole, 62);
  const atsScore = result?.score_summary?.ats_after ?? result?.fit_score_after?.score ?? score;
  const keywordTotal = presentKeywords.length + missingKeywords.length;
  const readSeconds = result?.tailored_text ? Math.max(20, Math.round((result.tailored_text.split(/\s+/).length / 220) * 60)) : 0;
  const scoreDetail = result?.score_summary?.fit_delta ? `${formatDelta(result.score_summary.fit_delta)} from baseline` : result ? "Run complete" : "Run needed";
  const atsDetail = result?.score_summary?.issues_resolved ? `${result.score_summary.issues_resolved} issues fixed` : result ? "Parser notes returned" : "Waiting for run";
  const keywordDetail = keywordTotal ? `${missingKeywords.length} missing` : "Target terms pending";
  const runLabel = accountStatus?.configured && !signedIn ? "Sign in to run" : busy ? "Tailoring..." : previewUploadState === "reading" ? "Reading resume..." : result ? "Re-tailor" : "Run Tailor";
  const downloadReady = Boolean(downloadUrl && downloadState === "ready");
  const exportLabel = downloadUrl
    ? downloadState === "checking"
      ? "Checking PDF"
      : downloadState === "expired"
        ? "PDF expired"
        : "Download PDF"
    : "Export PDF";
  const uploadFormats = capabilities?.upload_formats?.length ? capabilities.upload_formats : DEFAULT_UPLOAD_FORMATS;
  const exportFormats = customerExportFormats(capabilities?.export_formats);
  const enabledUploadFormats = uploadFormats.filter((format) => format.enabled);
  const uploadAccept = enabledUploadFormats.length
    ? enabledUploadFormats.map((format) => `.${format.format}`).join(",")
    : ".docx,.pdf,.txt";
  const uploadFormatHint = enabledUploadFormats.length
    ? `${enabledUploadFormats.map((format) => format.label).join(", ")}. Drop your file here or browse from your computer.`
    : "DOCX, PDF, or TXT. Drop your file here or browse from your computer.";
  const sourceLineCount = countReadableLines(sourcePreviewText);
  const tailoredLineCount = countReadableLines(result?.tailored_text);
  const hasSourcePreview = Boolean(sourcePreviewText.trim());
  const hasTailoredPreview = Boolean(result?.tailored_text?.trim());
  const previewTitle =
    previewMode === "original"
      ? "Original resume · before tailoring"
      : previewMode === "diff"
        ? "Change notes · before export"
        : hasTailoredPreview
          ? "Tailored resume · AI edits applied"
          : "Tailored resume · waiting for run";
  const previewStatusItems =
    previewMode === "original"
      ? [
          hasSourcePreview
            ? `${sourceLineCount || 1} source line${sourceLineCount === 1 ? "" : "s"} extracted`
            : previewUploadState === "reading"
              ? "Reading source document"
              : previewUploadState === "error"
                ? "Source preview needs another try"
                : "Upload a resume to see the original",
          uploadMeta?.filename ?? file?.name ?? "No source file selected",
          restoredHistoryId ? "Restored run source" : "Before AI edits",
        ]
      : previewMode === "diff"
        ? [
            hasSourcePreview ? "Original side ready" : "Original side waiting",
            hasTailoredPreview ? "Tailored side ready" : "Tailored side waiting",
            result?.change_log?.length ? `${result.change_log.length} change note${result.change_log.length === 1 ? "" : "s"}` : "Change notes appear after a run",
          ]
        : [
            hasTailoredPreview
              ? `${tailoredLineCount || 1} tailored line${tailoredLineCount === 1 ? "" : "s"} generated`
              : stage === "tailoring"
                ? "Tailored draft is generating"
                : "Run Tailor to generate a draft",
            keywordTotal ? `${presentKeywords.length}/${keywordTotal} keywords matched` : "Keywords pending",
            restoredHistoryId ? "Restored snapshot open" : downloadReady ? "PDF export ready" : "Review before export",
          ];
  const previewStatusTone = (item: string, index: number) =>
    (previewUploadState === "error" && previewMode === "original" && index === 0) ||
    item.includes("waiting") ||
    item.includes("Waiting") ||
    item.includes("pending") ||
    item.includes("Pending") ||
    item.includes("Upload a resume") ||
    item.includes("Run Tailor")
      ? "warn"
      : "";
  const accountButtonLabel = signedIn ? accountInitials(accountUser) : "IN";
  const accountItems = [
    {
      label: "Saved projects",
      detail: signedIn ? "Completed runs sync here and reopen in the studio." : "Sign in first, then completed runs can sync across browsers.",
    },
    { label: "Exports", detail: "PDF is live for the free workflow. DOCX and TXT stay locked until premium is real." },
    { label: "Billing", detail: "Premium plans still wait on Stripe products and entitlement checks." },
  ];
  const localHistoryCount = history.filter((entry) => !isAccountHistoryItem(entry, syncedHistoryIds)).length;
  const savedProjectCount = history.filter((entry) => isAccountHistoryItem(entry, syncedHistoryIds)).length;
  const historyGroups = groupHistoryItems(history, syncedHistoryIds);
  const accountHistoryGroups = historyGroups.filter((group) => group.accountCount > 0);
  const localHistoryGroups = historyGroups.filter((group) => group.localCount > 0);
  const visibleHistoryGroups =
    historyFilter === "account"
      ? accountHistoryGroups
      : historyFilter === "local"
        ? localHistoryGroups
        : historyGroups;
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
  const historyEmptyTitle =
    historyFilter === "account"
      ? "No account projects yet"
      : historyFilter === "local"
        ? "No browser projects"
        : signedIn
          ? "No saved projects yet"
          : "No local runs yet";
  const historyEmptyDetail =
    historyFilter === "account"
      ? localHistoryGroups.length
        ? "Your completed local runs are still available under This browser. Complete a new signed-in run or refresh after sync to see account projects here."
        : "Complete a signed-in tailor run and it will save here with restore, target details, scores, and export links."
      : historyFilter === "local"
        ? accountHistoryGroups.length
          ? "All visible projects are saved to your account. Switch to All or Account to review them."
          : "Complete a tailor run and it will stay in this browser with the preview, target, scores, and download ready to reopen."
        : signedIn
          ? "Complete a tailor run and it will save here with resume preview, target details, scores, and a one-click studio restore."
          : "Complete a tailor run and it will stay in this browser with the preview, target, scores, and download ready to reopen.";
  const workspacePanelOpen = activeTab === "history";

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
            <button className="ghost-button studio-top-button" type="button" disabled={!result}>
              <RoleForgeIcon name="copy" size={16} /> Duplicate
            </button>
            {downloadReady && downloadUrl ? (
              <a className="ghost-button studio-top-button" href={downloadUrl} download>
                <RoleForgeIcon name="download" size={16} /> Export
              </a>
            ) : (
              <button className="ghost-button studio-top-button" type="button" disabled>
                <RoleForgeIcon name="download" size={16} /> Export
              </button>
            )}
            <ThemeToggle />
            <div className="studio-account-menu">
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
                      <p>Your session is active. Completed runs sync to saved projects.</p>
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
                      <p>Use Google for the quickest path, or send a secure email magic link.</p>
                      <a className="studio-oauth-button" href="/auth/oauth?provider=google&next=/app">
                        <span className="studio-oauth-mark" aria-hidden="true">G</span>
                        Continue with Google
                      </a>
                      <div className="studio-account-divider"><span>Email fallback</span></div>
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
                      <strong>Account setup needed</strong>
                      <p>Account sign-in is not enabled in this environment yet.</p>
                    </>
                  )}
                  <div className="studio-account-list">
                    {accountItems.map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <small>{item.detail}</small>
                      </div>
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
            <a className={`rail-item ${workspacePanelOpen ? "" : "active"}`} href="#editor" onClick={() => setActiveTab("score")}><RoleForgeIcon name="doc" size={15} /> Editor</a>
            <a className="rail-item" href="#target" onClick={() => setActiveTab("score")}><RoleForgeIcon name="target" size={15} /> Job target</a>
            <a className="rail-item" href="#suggestions" onClick={() => setActiveTab("score")}><RoleForgeIcon name="sparkle" size={15} /> AI tailor <span className="rail-pill">{suggestionCards.length || 0}</span></a>
            <a className="rail-item" href="#ats" onClick={() => setActiveTab("score")}><RoleForgeIcon name="scan" size={15} /> ATS check</a>
            <a className="rail-item" href="#assets" onClick={() => setActiveTab("cover")}><RoleForgeIcon name="mail" size={15} /> Cover letter</a>
            <a className="rail-item" href="#assets" onClick={() => setActiveTab("interview")}><RoleForgeIcon name="briefcase" size={15} /> Interview prep</a>
            <div className="rail-divider" />
            <div className="rail-section-title">Workspace</div>
            <Link className="rail-item" href="/#templates"><RoleForgeIcon name="layers" size={15} /> Templates</Link>
            <button className={`rail-item ${activeTab === "history" ? "active" : ""}`} type="button" aria-pressed={activeTab === "history"} onClick={openHistoryPanel}><RoleForgeIcon name="chart" size={15} /> History</button>
            <Link className="rail-item" href="/settings"><RoleForgeIcon name="settings" size={15} /> Settings</Link>
            <div className="rf-rail-upgrade">
              <strong><RoleForgeIcon name="sparkle" size={14} /> Premium coming soon</strong>
              <p>Template controls, billing, and premium exports are coming soon.</p>
              <button className="primary-button" type="button" disabled>Coming soon</button>
            </div>
          </aside>

          <section className="rf-studio-main" id="editor" ref={editorSectionRef} tabIndex={-1}>
            <div className="rf-studio-hero">
              <div>
                <div className="eyebrow">Active resume</div>
                <h1 title={activeTitle}>{heroLabel}</h1>
                <p>{activeDetail}</p>
              </div>
              <div className="studio-hero-actions">
                <button className="ghost-button" type="button" onClick={onRun} disabled={!canRun}>{runLabel}</button>
                {downloadReady && downloadUrl ? (
                  <a className="primary-button" href={downloadUrl} download>{exportLabel} <RoleForgeIcon name="download" size={14} /></a>
                ) : (
                  <button className="primary-button" type="button" disabled>{exportLabel} <RoleForgeIcon name="download" size={14} /></button>
                )}
                <div className="export-format-strip" aria-label="Export format availability">
                  {exportFormats.map((format) => {
                    const isPdf = format.format === "pdf";
                    const planLabel = format.plan === "premium" ? "Coming soon" : "Free";
                    return (
                      <span
                        key={format.format}
                        className={`export-format-chip${format.enabled && isPdf ? " active" : ""}${format.enabled ? "" : " disabled"}`}
                        aria-disabled={!format.enabled}
                        title={!format.enabled ? "Premium exports are coming soon" : `${format.label} export available`}
                      >
                        {!format.enabled ? <RoleForgeIcon name="lock" size={12} /> : null}
                        {format.label} <small>{format.enabled ? planLabel : format.reason || planLabel}</small>
                      </span>
                    );
                  })}
                </div>
                {downloadMessage ? (
                  <span className={`export-status-note ${downloadState}`} role="status">
                    {downloadMessage}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rf-studio-stats">
              <StudioMetric label="Fit score" value={score ? `${score}` : "Run"} unit={score ? "/100" : "needed"} detail={scoreDetail} progress={score || readiness} tone="brand" />
              <StudioMetric label="ATS readability" value={atsScore ? `${atsScore}` : "Review"} unit={atsScore ? "/100" : "notes"} detail={atsDetail} progress={atsScore || readiness} tone="good" />
              <StudioMetric label="Keyword match" value={keywordTotal ? `${presentKeywords.length}` : "Terms"} unit={keywordTotal ? `/${keywordTotal} matched` : "pending"} detail={keywordDetail} progress={keywordTotal ? (presentKeywords.length / keywordTotal) * 100 : readiness} tone="accent" />
              <StudioMetric label="Read time" value={readSeconds ? `${readSeconds}` : "Draft"} unit={readSeconds ? "seconds" : "waiting"} detail={result ? "Review before export" : "Generated after run"} progress={readSeconds ? 72 : readiness} tone="sky" />
            </div>

            <div className="rf-studio-grid">
              <section className="studio-card rf-live-card">
                <div className="studio-card-head">
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
                      aria-selected={previewMode === "tailored"}
                      aria-controls="preview-panel"
                      onClick={() => setPreviewMode("tailored")}
                    >
                      Tailored
                    </button>
                    <button
                      className={previewMode === "original" ? "active" : ""}
                      id="preview-tab-original"
                      type="button"
                      role="tab"
                      aria-selected={previewMode === "original"}
                      aria-controls="preview-panel"
                      onClick={() => setPreviewMode("original")}
                    >
                      Original
                    </button>
                    <button
                      className={previewMode === "diff" ? "active" : ""}
                      id="preview-tab-diff"
                      type="button"
                      role="tab"
                      aria-selected={previewMode === "diff"}
                      aria-controls="preview-panel"
                      onClick={() => setPreviewMode("diff")}
                    >
                      Changes
                    </button>
                  </div>
                </div>
                <div
                  className="rf-preview-wrap"
                  id="preview-panel"
                  role="tabpanel"
                  aria-labelledby={`preview-tab-${previewMode}`}
                  aria-live="polite"
                >
                  <div className="rf-preview-status" aria-label="Preview status">
                    {previewStatusItems.map((item, index) => (
                      <span className={previewStatusTone(item, index)} key={`${item}-${index}`}>
                        {item}
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
                    changeLog={result?.change_log}
                    hasTarget={hasTarget}
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
                        <button className="btn btn-brand btn-sm" type="button" onClick={() => setActiveTab("changes")}><RoleForgeIcon name="check" size={12} />Review</button>
                        <button className="btn btn-soft btn-sm" type="button" onClick={() => setPreviewMode("tailored")}>Open</button>
                        <button className="btn btn-ghost btn-sm" type="button" disabled>Skip</button>
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
                      <article className="ats-item warn"><div className="ats-dot"><RoleForgeIcon name="sparkle" size={11} /></div><div><strong>Keyword coverage pending</strong><p>Matched and missing terms need a resume and target.</p></div></article>
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
              </div>
              <div className="generated-grid rf-generated-grid">
                <article className="generated-card">
                  <div className="generated-head"><RoleForgeIcon name="mail" size={14} /> Cover letter</div>
                  <div className="generated-body">
                    {result?.cover_letter ? result.cover_letter : "After tailoring, the generated cover letter will appear here for review."}
                  </div>
                  <div className="suggestion-actions">
                    <button className="btn btn-soft btn-sm" type="button" onClick={() => setActiveTab("cover")}><RoleForgeIcon name="edit" size={12} />Open</button>
                    <button className="btn btn-soft btn-sm" type="button" onClick={copyDownloadUrl} disabled={!downloadReady}><RoleForgeIcon name="copy" size={12} />Copy link</button>
                  </div>
                </article>
                <article className="generated-card">
                  <div className="generated-head"><RoleForgeIcon name="briefcase" size={14} /> Likely interview questions</div>
                  {interviewPrep.length ? (
                    <ul className="generated-list">
                      {interviewPrep.slice(0, 5).map((item, index) => (
                        <li key={`${item.question}-${index}`}><strong>{item.question}</strong><span>{item.answer_bullets.slice(0, 3).join(" · ")}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div className="generated-body">Interview prompts will appear here when preparation notes are ready.</div>
                  )}
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
                      <input className="rf-file-input" type="file" accept={uploadAccept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-label="Upload resume file" />
                      <span className="rf-file-icon"><RoleForgeIcon name="file" size={24} /></span>
                      <span className="rf-file-copy">
                        <strong>{file ? file.name : "Choose a resume file"}</strong>
                        <small>{file ? "Ready for tailoring" : uploadFormatHint}</small>
                      </span>
                      <span className="rf-file-action">{file ? "Replace file" : "Choose File"}</span>
                    </label>
                  </div>
                </article>

                <article className="rf-intake-card rf-intake-target-card">
                  <h3 className="rf-intake-card-header">Job Target</h3>
                  <div className="rf-intake-card-body">
                    <div className="rf-target-editor" id="target">
                      <div className="segment rf-target-segment" role="tablist" aria-label="Job description input mode">
                        <button className={inputMode === "text" ? "active" : ""} type="button" onClick={() => setInputMode("text")}>Paste text</button>
                        <button className={inputMode === "url" ? "active" : ""} type="button" onClick={() => setInputMode("url")}>Job URL</button>
                      </div>
                      {inputMode === "text" ? (
                        <textarea id="jdText" value={jdText} onChange={(event) => setJdText(event.target.value)} placeholder="Paste the full job description here..." aria-label="Job description" />
                      ) : (
                        <input id="jdUrl" value={jdUrl} onChange={(event) => setJdUrl(event.target.value)} placeholder="https://company.com/careers/job" aria-label="Job posting URL" />
                      )}
                    </div>
                  </div>
                </article>

                <article className="rf-intake-card rf-intake-config">
                  <h3 className="rf-intake-card-header">Configuration</h3>
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
                      <button className="primary-button" type="button" onClick={onRun} disabled={!canRun}>{runLabel} <RoleForgeIcon name="sparkle" size={14} /></button>
                      {copyState ? <span className="copy-state">{copyState}</span> : null}
                    </div>
                  </div>
                </article>
                {error ? (
                  <div className="rf-callout danger">
                    <strong>Workflow stopped</strong>
                    <p>{error}</p>
                  </div>
                ) : null}
              </div>
            </section>

            {activeTab === "history" ? (
              <section className="studio-card studio-history-panel" id="history" ref={historySectionRef}>
                <div className="studio-card-head">
                  <div>
                    <div className="eyebrow">{signedIn ? "Saved projects" : "Local history"}</div>
                    <h2 className="panel-title">
                      {visibleHistoryGroups.length
                        ? `${visibleHistoryGroups.length} project${visibleHistoryGroups.length === 1 ? "" : "s"}`
                        : signedIn
                          ? "Saved projects"
                          : "Recent runs"}
                    </h2>
                    <p className="history-sync-note">{historySyncMessage}</p>
                    {projectActionMessage ? <p className="history-action-note error">{projectActionMessage}</p> : null}
                  </div>
                  <div className="history-panel-actions">
                    <div className="history-filter-bar" role="tablist" aria-label="Saved project storage filter">
                      <button
                        className={historyFilter === "all" ? "active" : ""}
                        type="button"
                        role="tab"
                        aria-selected={historyFilter === "all"}
                        onClick={() => setHistoryFilter("all")}
                      >
                        All <span>{historyGroups.length}</span>
                      </button>
                      {signedIn ? (
                        <button
                          className={historyFilter === "account" ? "active" : ""}
                          type="button"
                          role="tab"
                          aria-selected={historyFilter === "account"}
                          onClick={() => setHistoryFilter("account")}
                        >
                          Account <span>{accountHistoryGroups.length}</span>
                        </button>
                      ) : null}
                      <button
                        className={historyFilter === "local" ? "active" : ""}
                        type="button"
                        role="tab"
                        aria-selected={historyFilter === "local"}
                        onClick={() => setHistoryFilter("local")}
                      >
                        This browser <span>{localHistoryGroups.length}</span>
                      </button>
                    </div>
                    {signedIn ? (
                      <button className="btn btn-soft btn-sm" type="button" onClick={() => void refreshSavedRuns()} disabled={historySyncState === "loading"}>
                        Refresh
                      </button>
                    ) : null}
                    <button className="btn btn-soft btn-sm" type="button" onClick={clearLocalHistory} disabled={signedIn ? !localHistoryCount : !history.length}>{clearHistoryLabel}</button>
                  </div>
                </div>
                <div className="change-list panel-body">
                  {visibleHistoryGroups.length ? visibleHistoryGroups.map((group) => {
                    const entry = group.latest;
                    const manageEntry = group.accountItem ?? entry;
                    const restorable = hasRestorableSnapshot(entry);
                    const canDownload = Boolean(entry.downloadUrl && entry.downloadUrl !== "#");
                    const canManageProject = Boolean(group.accountItem?.projectId && signedIn);
                    const isEditingProject = Boolean(canManageProject && editingProjectId === group.accountItem?.projectId);
                    const actionBusy = group.items.some((item) => projectActionId === item.id);
                    const selected = group.items.some((item) => selectedHistoryId === item.id);
                    const active = group.items.some((item) => restoredHistoryId === item.id);
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
                            <small className={`history-sync-badge ${group.restorableCount ? "restore" : "legacy"}`}>
                              {group.restorableCount ? "Restore ready" : "Download only"}
                            </small>
                          </div>
                          <p>{group.target}</p>
                          <div className="history-project-meta" aria-label="Project run summary">
                            <span>{historyGroupSummary(group)}</span>
                            <span>Latest {new Date(entry.createdAt).toLocaleString()}</span>
                            <span>{entry.mode} mode</span>
                          </div>
                          {projectActionMessage && actionBusy ? <small className="history-action-note error">{projectActionMessage}</small> : null}
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
                              <button className="ghost-button" type="button" onClick={() => startRenameProject(manageEntry)} disabled={actionBusy}>
                                Rename <RoleForgeIcon name="edit" size={14} />
                              </button>
                              <button className="ghost-button" type="button" onClick={() => { if (window.confirm("Delete this saved project from your account?")) void removeSavedProject(manageEntry); }} disabled={actionBusy}>
                                Delete <RoleForgeIcon name="x" size={14} />
                              </button>
                            </>
                          ) : null}
                          <button className="ghost-button" type="button" onClick={() => openHistoryDetails(entry)} aria-pressed={selected}>
                            Details <RoleForgeIcon name="doc" size={14} />
                          </button>
                          <button className="ghost-button" type="button" onClick={() => restoreHistoryItem(entry)} disabled={!restorable}>
                            Restore <RoleForgeIcon name="edit" size={14} />
                          </button>
                          {canDownload ? (
                            <a className="ghost-button" href={entry.downloadUrl} download>Download {entry.downloadFormat?.toUpperCase() ?? "PDF"} <RoleForgeIcon name="download" size={14} /></a>
                          ) : (
                            <button className="ghost-button" type="button" disabled>Download {entry.downloadFormat?.toUpperCase() ?? "PDF"} <RoleForgeIcon name="download" size={14} /></button>
                          )}
                        </div>
                      </article>
                    );
                  }) : (
                    <div className="empty-state">
                      <strong>{historyEmptyTitle}</strong>
                      <p>{historyEmptyDetail}</p>
                    </div>
                  )}
                </div>
                {visibleSelectedHistoryItem && selectedHistoryGroup ? (
                  <aside className="history-detail-panel" aria-label="Saved project details" ref={historyDetailRef} tabIndex={-1}>
                    <div>
                      <div className="eyebrow">Project detail</div>
                      <h3>{selectedHistoryGroup.title}</h3>
                      <p>{selectedHistoryGroup.target}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Runs</dt>
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
                        <dd>{selectedHistoryGroup.downloadableCount ? `${selectedHistoryGroup.downloadableCount} ready` : "No download link"}</dd>
                      </div>
                    </dl>
                    <div className="history-version-list" aria-label="Runs in this project">
                      {selectedHistoryGroup.items.slice(0, 5).map((entry) => {
                        const restorable = hasRestorableSnapshot(entry);
                        return (
                          <article className={selectedHistoryId === entry.id ? "selected" : ""} key={`detail-${entry.id}`}>
                            <button type="button" onClick={() => setSelectedHistoryId(entry.id)} aria-pressed={selectedHistoryId === entry.id}>
                              <strong>{new Date(entry.createdAt).toLocaleString()}</strong>
                              <span>{entry.score}/100 · {entry.mode} · {historyStatusLabel(entry, syncedHistoryIds)}</span>
                            </button>
                            <div>
                              <button className="btn btn-soft btn-sm" type="button" onClick={() => restoreHistoryItem(entry)} disabled={!restorable}>Restore</button>
                              {entry.downloadUrl && entry.downloadUrl !== "#" ? (
                                <a className="btn btn-soft btn-sm" href={entry.downloadUrl} download>PDF</a>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <div className="history-detail-actions">
                      <button className="btn btn-soft btn-sm" type="button" onClick={() => restoreHistoryItem(visibleSelectedHistoryItem)} disabled={!hasRestorableSnapshot(visibleSelectedHistoryItem)}>Restore</button>
                      {visibleSelectedHistoryItem.downloadUrl && visibleSelectedHistoryItem.downloadUrl !== "#" ? (
                        <a className="btn btn-soft btn-sm" href={visibleSelectedHistoryItem.downloadUrl} download>Download</a>
                      ) : null}
                    </div>
                  </aside>
                ) : null}
              </section>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
