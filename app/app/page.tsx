"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";

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
type ReviewTab = "score" | "gap" | "ats" | "resume" | "cover" | "interview" | "changes" | "history";
type HistoryItem = {
  id: string;
  createdAt: string;
  filename: string;
  mode: TailoringMode;
  score: number;
  downloadUrl: string;
  downloadFormat?: ExportFormat;
  roleHint: string;
};
type ApiErrorPayload = { error?: { code?: string; message?: string; request_id?: string; details?: unknown } };
type StudioSuggestion = { label: string; meta: string; before?: string; after: string; tone?: "good" | "warn" | "neutral" };
type ParsedResumeSection = { title: string; lines: string[] };
type ParsedResume = { name: string; role: string; contact: string; sections: ParsedResumeSection[] };
type ParsedResumeEntry = { title: string; meta?: string; date?: string; details: string[]; bullets: string[] };

const HISTORY_KEY = "resume-tailor-history-v1";
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
  keywords,
  mode,
  filename,
  uploadFormat,
  characterCount,
  changeLog,
}: {
  text?: string;
  keywords: string[];
  mode: PreviewMode;
  filename?: string;
  uploadFormat?: UploadFormat;
  characterCount?: number;
  changeLog?: string[];
}) {
  const parsed = parseResumeText(text);

  if (mode === "original" && !parsed) {
    return (
      <div className="rf-resume-paper rf-resume-paper-empty">
        <div className="rf-resume-head">
          <h3>{filename ? filename.replace(/\.(docx|pdf|txt)$/i, "") : "Original resume"}</h3>
          <p>{uploadFormat ? `${uploadFormat.toUpperCase()} upload` : "Source document"}</p>
          <span>{characterCount ? `${characterCount.toLocaleString()} characters processed` : "Upload a resume to preview source details"}</span>
        </div>
        <section>
          <h4>Original preview</h4>
          <p>
            Original visual preview is not available for DOCX/PDF files yet. The tailored preview renders here after
            the workflow returns a generated draft.
          </p>
        </section>
      </div>
    );
  }

  if (mode === "diff") {
    return (
      <div className="rf-resume-paper rf-resume-paper-diff">
        <div className="rf-resume-head">
          <h3>{parsed?.name || "Change review"}</h3>
          <p>{parsed?.role || "Generated edits"}</p>
          <span>{parsed?.contact || "Review the changes returned by the AI workflow before export"}</span>
        </div>
        <section>
          <h4>Change notes</h4>
          {changeLog?.length ? (
            <ul className="rf-resume-change-list">
              {changeLog.slice(0, 10).map((change, index) => (
                <li key={`preview-change-${index}`}>{change}</li>
              ))}
            </ul>
          ) : (
            <p>Run the workflow and the change log will appear here.</p>
          )}
        </section>
        {parsed?.sections.slice(0, 2).map((section) => (
          <ResumeSection key={`diff-${section.title}`} section={section} keywords={keywords} />
        ))}
      </div>
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

  return (
    <div className="rf-resume-paper">
      <div className="rf-resume-head">
        <h3>Sarah Chen</h3>
        <p>Senior Product Manager</p>
        <span>sarah.chen@email.com · +1 415-555-0118 · San Francisco, CA · linkedin.com/in/schen</span>
      </div>
      <section>
        <h4>Professional summary</h4>
        {text ? (
          <pre className="rf-resume-generated">{text}</pre>
        ) : (
          <p>
            Operations-minded product leader with 8 years building <mark>cross-functional roadmaps</mark>, leading{" "}
            <mark>operational reviews</mark>, and translating <mark className="good">analytics</mark> into the kinds of
            decisions that actually move quarters.
          </p>
        )}
      </section>
      <section>
        <h4>Experience</h4>
        <div className="rf-resume-role">
          <div>
            <strong>Senior Product Manager</strong>
            <em>Lattice · San Francisco, CA</em>
          </div>
          <span>Mar 2023 — present</span>
        </div>
        <ul>
          <li>Owned <mark>cross-functional roadmap</mark> delivery for 3 product pods (28 engineers)</li>
          <li>Cut release cycle from 18 days to 9 via process redesign and clearer ownership</li>
          <li>SQL-backed weekly KPI reviews across 12 stakeholders</li>
          <li>Led migration of legacy planning tool · zero downtime deploy</li>
        </ul>
        <div className="rf-resume-role secondary-role">
          <div>
            <strong>Product Lead, Operations</strong>
            <em>Notion · Remote</em>
          </div>
          <span>Jun 2020 — Mar 2023</span>
        </div>
        <ul>
          <li>Stood up the first operations function · hired and mentored 3 ICs</li>
          <li>Designed quarterly planning ritual now used company-wide</li>
          <li>Drove NPS instrumentation · +14 points in 2 quarters</li>
        </ul>
      </section>
      <section>
        <h4>Skills</h4>
        <div className="rf-resume-keywords">
          {(keywords.length
            ? keywords
            : ["Roadmapping", "SQL", "A/B testing", "Analytics", "Stakeholder mgmt", "Quarterly planning"]
          ).slice(0, 8).map((keyword) => (
            <span key={`resume-keyword-${keyword}`}>{keyword}</span>
          ))}
        </div>
      </section>
    </div>
  );
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
  const [copyState, setCopyState] = useState("");
  const [error, setError] = useState("");

  const [, setResumeId] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadResponse | null>(null);
  const [sourcePreviewText, setSourcePreviewText] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
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
    let cancelled = false;
    setUploadMeta(null);
    setSourcePreviewText("");
    setPreviewMode("tailored");
    if (!file) return;

    if (/\.txt$/i.test(file.name)) {
      file.text()
        .then((value) => {
          if (!cancelled) setSourcePreviewText(value.slice(0, 30000));
        })
        .catch(() => {
          if (!cancelled) setSourcePreviewText("");
        });
    }

    return () => {
      cancelled = true;
    };
  }, [file]);

  const hasTarget = Boolean(jdUrl.trim() || jdText.trim());
  const readyItems = [Boolean(baseUrl), Boolean(file), hasTarget];
  const readiness = Math.round((readyItems.filter(Boolean).length / readyItems.length) * 100);
  const canRun = Boolean(baseUrl && file && hasTarget && !busy);

  const score = result?.score_summary?.fit_after ?? result?.fit_score_after?.score ?? result?.fit_score?.score ?? 0;
  const presentKeywords = result?.fit_score_after?.present ?? result?.fit_score?.present ?? [];
  const missingKeywords = result?.fit_score_after?.missing ?? result?.fit_score?.missing ?? [];
  const atsIssues = result?.ats_after?.issues ?? [];
  const gapEvidence = result?.gap_analysis?.evidence_to_add ?? [];
  const interviewPrep = result?.interview_prep ?? [];
  const warnings = result?.warnings ?? [];

  async function upload(): Promise<string> {
    if (!baseUrl) throw new Error("The resume workflow is not available yet.");
    if (!file) throw new Error("Select a resume file first.");

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form });
    if (!response.ok) throw new Error(await readApiError(response, "Upload failed"));

    const data = (await response.json()) as UploadResponse;
    setResumeId(data.resume_id);
    setUploadMeta(data);
    if (typeof data.text_preview === "string") setSourcePreviewText(data.text_preview);
    return data.resume_id;
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
    return url;
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
      const id = await upload();
      setStage("tailoring");
      const output = await tailor(id);
      setStage("exporting");
      const url = await exportResume(output.tailored_text, "pdf");
      const item: HistoryItem = {
        id: output.run_id ?? id,
        createdAt: output.generated_at ?? new Date().toISOString(),
        filename: file?.name ?? "resume",
        mode: output.tailoring_mode ?? tailoringMode,
        score: output.score_summary?.fit_after ?? output.fit_score_after?.score ?? output.fit_score?.score ?? 0,
        downloadUrl: url,
        downloadFormat: "pdf",
        roleHint: (jdText || jdUrl || "Role target").slice(0, 90),
      };
      const nextHistory = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, 12);
      setHistory(nextHistory);
      saveHistory(nextHistory);
      setStage("ready");
      setActiveTab("score");
      setPreviewMode("tailored");
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
    if (!downloadUrl) return;
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopyState("Copied");
      window.setTimeout(() => setCopyState(""), 1600);
    } catch {
      setCopyState("Copy failed");
    }
  }

  const firstTargetLine = (jdText || jdUrl).split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
  const activeResumeName = file?.name?.replace(/\.(docx|pdf|txt)$/i, "") || "Resume studio";
  const targetUrlInfo = parseTargetUrl(firstTargetLine);
  const activeRole = targetUrlInfo?.label || firstTargetLine || (hasTarget ? "Role target loaded" : "Add a role target");
  const activeTitle = hasTarget && firstTargetLine ? firstTargetLine : activeResumeName;
  const activeDetail = result
    ? targetUrlInfo?.host
      ? `Tailored and exported for ${targetUrlInfo.host}`
      : "Tailored and exported from the current workflow"
    : file
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
  const runLabel = busy ? "Tailoring..." : result ? "Re-tailor" : "Run Tailor";
  const exportLabel = downloadUrl ? "Download PDF" : "Export PDF";
  const uploadFormats = capabilities?.upload_formats?.length ? capabilities.upload_formats : DEFAULT_UPLOAD_FORMATS;
  const exportFormats = capabilities?.export_formats?.length ? capabilities.export_formats : DEFAULT_EXPORT_FORMATS;
  const enabledUploadFormats = uploadFormats.filter((format) => format.enabled);
  const uploadAccept = enabledUploadFormats.length
    ? enabledUploadFormats.map((format) => `.${format.format}`).join(",")
    : ".docx,.pdf,.txt";
  const uploadFormatHint = enabledUploadFormats.length
    ? `${enabledUploadFormats.map((format) => format.label).join(", ")}. Drop your file here or browse from your computer.`
    : "DOCX, PDF, or TXT. Drop your file here or browse from your computer.";

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
            {downloadUrl ? (
              <a className="ghost-button studio-top-button" href={downloadUrl} download>
                <RoleForgeIcon name="download" size={16} /> Export
              </a>
            ) : (
              <button className="ghost-button studio-top-button" type="button" disabled>
                <RoleForgeIcon name="download" size={16} /> Export
              </button>
            )}
            <ThemeToggle />
            <button className="studio-account-button" type="button" disabled aria-label="Sign in coming soon">
              SC
            </button>
          </div>
        </header>
        <div className="rf-studio-layout">
          <aside className="rf-studio-rail" aria-label="Studio sections">
            <div className="rail-section-title">Build</div>
            <a className="rail-item active" href="#editor"><RoleForgeIcon name="doc" size={15} /> Editor</a>
            <a className="rail-item" href="#target"><RoleForgeIcon name="target" size={15} /> Job target</a>
            <a className="rail-item" href="#suggestions"><RoleForgeIcon name="sparkle" size={15} /> AI tailor <span className="rail-pill">{suggestionCards.length || 0}</span></a>
            <a className="rail-item" href="#ats"><RoleForgeIcon name="scan" size={15} /> ATS check</a>
            <a className="rail-item" href="#assets"><RoleForgeIcon name="mail" size={15} /> Cover letter</a>
            <a className="rail-item" href="#assets"><RoleForgeIcon name="briefcase" size={15} /> Interview prep</a>
            <div className="rail-divider" />
            <div className="rail-section-title">Workspace</div>
            <Link className="rail-item" href="/#templates"><RoleForgeIcon name="layers" size={15} /> Templates</Link>
            <button className="rail-item" type="button" onClick={() => setActiveTab("history")}><RoleForgeIcon name="chart" size={15} /> History</button>
            <span className="rail-item disabled" aria-disabled="true"><RoleForgeIcon name="settings" size={15} /> Settings</span>
            <div className="rf-rail-upgrade">
              <strong><RoleForgeIcon name="sparkle" size={14} /> Premium coming soon</strong>
              <p>Templates, saved projects, account settings, and premium features are coming soon.</p>
              <button className="primary-button" type="button" disabled>Coming soon</button>
            </div>
          </aside>

          <section className="rf-studio-main" id="editor">
            <div className="rf-studio-hero">
              <div>
                <div className="eyebrow">Active resume</div>
                <h1 title={activeTitle}>{heroLabel}</h1>
                <p>{activeDetail}</p>
              </div>
              <div className="studio-hero-actions">
                <button className="ghost-button" type="button" onClick={onRun} disabled={!canRun}>{runLabel}</button>
                {downloadUrl ? (
                  <a className="primary-button" href={downloadUrl} download>{exportLabel} <RoleForgeIcon name="download" size={14} /></a>
                ) : (
                  <button className="primary-button" type="button" disabled>{exportLabel} <RoleForgeIcon name="download" size={14} /></button>
                )}
                <div className="export-format-strip" aria-label="Export format availability">
                  {exportFormats.map((format) => {
                    const isPdf = format.format === "pdf";
                    const planLabel = format.plan === "premium" ? "Premium" : "Free";
                    return (
                      <span
                        key={format.format}
                        className={`export-format-chip${isPdf ? " active" : ""}${format.enabled ? "" : " disabled"}`}
                        aria-disabled={!format.enabled}
                        title={!format.enabled ? format.reason || "Coming soon" : `${format.label} export available`}
                      >
                        {format.label} <small>{format.enabled ? planLabel : format.reason || planLabel}</small>
                      </span>
                    );
                  })}
                </div>
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
                    <h2 className="panel-title">Your resume · with AI edits applied</h2>
                  </div>
                  <div className="studio-tabs-mini" role="tablist" aria-label="Preview mode">
                    <button className={previewMode === "tailored" ? "active" : ""} type="button" onClick={() => setPreviewMode("tailored")}>Tailored</button>
                    <button className={previewMode === "original" ? "active" : ""} type="button" onClick={() => setPreviewMode("original")}>Original</button>
                    <button className={previewMode === "diff" ? "active" : ""} type="button" onClick={() => setPreviewMode("diff")}>Diff</button>
                  </div>
                </div>
                <div className="rf-preview-wrap">
                  <MiniResumeDocument
                    text={previewMode === "original" ? sourcePreviewText : result?.tailored_text}
                    keywords={presentKeywords}
                    mode={previewMode}
                    filename={uploadMeta?.filename ?? file?.name}
                    uploadFormat={uploadMeta?.format}
                    characterCount={uploadMeta?.character_count}
                    changeLog={result?.change_log}
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
                    <button className="btn btn-soft btn-sm" type="button" onClick={copyDownloadUrl} disabled={!downloadUrl}><RoleForgeIcon name="copy" size={12} />Copy link</button>
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
              <section className="studio-card">
                <div className="studio-card-head">
                  <div>
                    <div className="eyebrow">Local history</div>
                    <h2 className="panel-title">Recent runs</h2>
                  </div>
                  <button className="btn btn-soft btn-sm" type="button" onClick={() => { setHistory([]); saveHistory([]); }}>Clear</button>
                </div>
                <div className="change-list panel-body">
                  {history.length ? history.map((entry) => (
                    <article className="history-item" key={entry.id}>
                      <div><strong>{entry.filename}</strong><p>{entry.roleHint}</p><span>{new Date(entry.createdAt).toLocaleString()} · {entry.mode} · {entry.score}/100</span></div>
                      <a className="ghost-button" href={entry.downloadUrl} download>Download {entry.downloadFormat?.toUpperCase() ?? "PDF"} <RoleForgeIcon name="download" size={14} /></a>
                    </article>
                  )) : <div className="empty-state"><strong>No local history yet</strong><p>Completed runs will appear here in this browser.</p></div>}
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
