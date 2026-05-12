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

type UploadResponse = { resume_id: string; filename: string };
type ExportResponse = { saved_to: string; download_filename: string };
type Stage = "idle" | "uploading" | "tailoring" | "exporting" | "ready" | "error";
type InputMode = "text" | "url";
type ReviewTab = "score" | "gap" | "ats" | "resume" | "cover" | "interview" | "changes" | "history";
type HistoryItem = {
  id: string;
  createdAt: string;
  filename: string;
  mode: TailoringMode;
  score: number;
  downloadUrl: string;
  roleHint: string;
};
type ApiErrorPayload = { error?: { code?: string; message?: string; request_id?: string; details?: unknown } };
type StudioSuggestion = { label: string; meta: string; before?: string; after: string; tone?: "good" | "warn" | "neutral" };

const HISTORY_KEY = "resume-tailor-history-v1";

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

function MiniResumeDocument({
  text,
  keywords,
}: {
  text?: string;
  keywords: string[];
}) {
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
  const [copyState, setCopyState] = useState("");
  const [error, setError] = useState("");

  const [, setResumeId] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

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
    if (!file) throw new Error("Select a resume .docx first");

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form });
    if (!response.ok) throw new Error(await readApiError(response, "Upload failed"));

    const data = (await response.json()) as UploadResponse;
    setResumeId(data.resume_id);
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

  async function exportDocx(tailoredText: string): Promise<string> {
    if (!baseUrl) throw new Error("Export is not available yet.");

    const response = await fetch(`${baseUrl}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "tailored_resume.docx",
        title: "TAILORED RESUME",
        content: tailoredText,
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
      const url = await exportDocx(output.tailored_text);
      const item: HistoryItem = {
        id: output.run_id ?? id,
        createdAt: output.generated_at ?? new Date().toISOString(),
        filename: file?.name ?? "resume.docx",
        mode: output.tailoring_mode ?? tailoringMode,
        score: output.score_summary?.fit_after ?? output.fit_score_after?.score ?? output.fit_score?.score ?? 0,
        downloadUrl: url,
        roleHint: (jdText || jdUrl || "Role target").slice(0, 90),
      };
      const nextHistory = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, 12);
      setHistory(nextHistory);
      saveHistory(nextHistory);
      setStage("ready");
      setActiveTab("score");
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

  const firstTargetLine = (jdText || jdUrl).split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  const activeResumeName = file?.name?.replace(/\.docx$/i, "") || "Resume studio";
  const activeRole = firstTargetLine || (hasTarget ? "Role target loaded" : "Add a role target");
  const topbarLabel = compactLabel(hasTarget ? activeRole : activeResumeName, 36);
  const heroLabel = compactLabel(hasTarget ? activeRole : activeResumeName, 58);
  const targetLabel = compactLabel(activeRole, 62);
  const atsScore = result?.score_summary?.ats_after ?? result?.fit_score_after?.score ?? score;
  const keywordTotal = presentKeywords.length + missingKeywords.length;
  const readSeconds = result?.tailored_text ? Math.max(20, Math.round((result.tailored_text.split(/\s+/).length / 220) * 60)) : 0;
  const scoreDetail = result?.score_summary?.fit_delta ? `${formatDelta(result.score_summary.fit_delta)} from baseline` : result ? "Run complete" : "Run needed";
  const atsDetail = result?.score_summary?.issues_resolved ? `${result.score_summary.issues_resolved} issues fixed` : result ? "Parser notes returned" : "Waiting for run";
  const keywordDetail = keywordTotal ? `${missingKeywords.length} missing` : "Target terms pending";
  const runLabel = busy ? "Tailoring..." : result ? "Re-tailor" : "Run Tailor";
  const exportLabel = downloadUrl ? "Download DOCX" : "Export DOCX";

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
            <strong title={hasTarget ? activeRole : activeResumeName}>{topbarLabel}</strong>
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
                <h1 title={hasTarget ? activeRole : activeResumeName}>{heroLabel}</h1>
                <p>
                  {result ? "Tailored and exported from the current workflow" : file ? "Resume selected · add a target and run the workflow" : "Upload a resume, add a job target, then run the workflow"}
                </p>
              </div>
              <div className="studio-hero-actions">
                <button className="ghost-button" type="button" onClick={onRun} disabled={!canRun}>{runLabel}</button>
                {downloadUrl ? (
                  <a className="primary-button" href={downloadUrl} download>{exportLabel} <RoleForgeIcon name="download" size={14} /></a>
                ) : (
                  <button className="primary-button" type="button" disabled>{exportLabel} <RoleForgeIcon name="download" size={14} /></button>
                )}
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
                    <button className={activeTab === "resume" ? "active" : ""} type="button" onClick={() => setActiveTab("resume")}>Tailored</button>
                    <button type="button" onClick={() => setActiveTab("history")}>Original</button>
                    <button type="button" onClick={() => setActiveTab("changes")}>Diff</button>
                  </div>
                </div>
                <div className="rf-preview-wrap">
                  <MiniResumeDocument text={activeTab === "resume" ? result?.tailored_text : undefined} keywords={presentKeywords} />
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
                        <button className="btn btn-soft btn-sm" type="button" onClick={() => setActiveTab("resume")}>Open</button>
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
                    <h2 className="panel-title" title={activeRole}>{targetLabel}</h2>
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
                      <input className="rf-file-input" type="file" accept=".docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-label="Upload resume DOCX" />
                      <span className="rf-file-icon"><RoleForgeIcon name="file" size={24} /></span>
                      <span className="rf-file-copy">
                        <strong>{file ? file.name : "Choose a DOCX resume"}</strong>
                        <small>{file ? "Ready for tailoring" : "Drop your file here or browse from your computer."}</small>
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
                      <a className="ghost-button" href={entry.downloadUrl} download>Download <RoleForgeIcon name="download" size={14} /></a>
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
