"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

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

type TailorResult = {
  tailored_text: string;
  change_log: string[];
  suggestions: string[];
  ats_before: AtsReport;
  ats_after: AtsReport;
  fit_score?: FitScore;
};

type UploadResponse = { resume_id: string; filename: string };
type ExportResponse = { saved_to: string; download_filename: string };
type Stage = "idle" | "uploading" | "tailoring" | "exporting" | "ready" | "error";
type InputMode = "text" | "url";
type ReviewTab = "score" | "ats" | "resume" | "changes";
type IconName = "home" | "upload" | "target" | "scan" | "download" | "copy" | "spark" | "file" | "link" | "check";

const stages: Array<{ key: Stage; label: string }> = [
  { key: "idle", label: "Ready" },
  { key: "uploading", label: "Upload" },
  { key: "tailoring", label: "Tailor" },
  { key: "exporting", label: "Export" },
];

function Icon({ name }: { name: IconName }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }

  if (name === "upload") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (name === "target") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
      </svg>
    );
  }

  if (name === "scan") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8V5a1 1 0 0 1 1-1h3" />
        <path d="M16 4h3a1 1 0 0 1 1 1v3" />
        <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
        <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
        <path d="M7 12h10" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (name === "copy") {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </svg>
    );
  }

  if (name === "link") {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </svg>
  );
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className="status-pill">
      <span className={ok ? "status-dot good" : "status-dot"} />
      {text}
    </span>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          {description ? <p className="panel-copy">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function Pill({ text, kind }: { text: string; kind: "good" | "bad" }) {
  return <span className={`pill ${kind}`}>{text}</span>;
}

export default function Page() {
  const baseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL;
    return value && value.trim() ? value.trim() : "";
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [jdUrl, setJdUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("score");
  const [copyState, setCopyState] = useState("");
  const [error, setError] = useState("");

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const hasTarget = Boolean(jdUrl.trim() || jdText.trim());
  const readyItems = [Boolean(baseUrl), Boolean(file), hasTarget];
  const readiness = Math.round((readyItems.filter(Boolean).length / readyItems.length) * 100);
  const canRun = Boolean(baseUrl && file && hasTarget && !busy);

  const score = result?.fit_score?.score ?? 0;
  const presentKeywords = result?.fit_score?.present ?? [];
  const missingKeywords = result?.fit_score?.missing ?? [];
  const topKeywords = result?.fit_score?.top_keywords ?? [];
  const atsIssues = result?.ats_after?.issues ?? [];

  async function upload(): Promise<string> {
    if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL in .env.local");
    if (!file) throw new Error("Select a resume .docx first");

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form });
    if (!response.ok) throw new Error("Upload failed");

    const data = (await response.json()) as UploadResponse;
    setResumeId(data.resume_id);
    return data.resume_id;
  }

  async function tailor(resume_id: string): Promise<TailorResult> {
    if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL in .env.local");

    const isHttp = (value: string) => /^https?:\/\//i.test(value.trim());
    const payload: {
      resume_id: string;
      jd_url?: string;
      jd_text?: string;
      company_url?: string;
    } = { resume_id };

    if (jdUrl.trim() && isHttp(jdUrl)) payload.jd_url = jdUrl.trim();
    if (jdText.trim()) payload.jd_text = jdText.trim();
    if (companyUrl.trim() && isHttp(companyUrl)) payload.company_url = companyUrl.trim();

    const response = await fetch(`${baseUrl}/tailor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Tailor failed");

    const data = (await response.json()) as TailorResult;
    setResult(data);
    return data;
  }

  async function exportDocx(tailoredText: string): Promise<string> {
    if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL in .env.local");

    const response = await fetch(`${baseUrl}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "tailored_resume.docx",
        title: "TAILORED RESUME",
        content: tailoredText,
      }),
    });
    if (!response.ok) throw new Error("Export failed");

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
      await exportDocx(output.tailored_text);
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

  return (
    <main className="page-shell">
      <div className="app-shell">
        <header className="app-topbar">
          <Link className="brand" href="/" aria-label="Resume Tailor home">
            <span className="brand-mark">RT</span>
            <span>
              <span className="brand-name">Resume Tailor Studio</span>
              <span className="brand-kicker">Document-first AI workflow</span>
            </span>
          </Link>

          <div className="readiness" aria-label="Workspace readiness">
            <div className="readiness-meta">
              <span>Run readiness</span>
              <span>{readiness}%</span>
            </div>
            <div className="meter">
              <div className="meter-fill" style={{ width: `${readiness}%` }} />
            </div>
          </div>

          <div className="nav-links">
            <Link className="icon-button" href="/" aria-label="Landing page" title="Landing page">
              <Icon name="home" />
            </Link>
            <StatusPill ok={Boolean(baseUrl)} text={baseUrl ? "Backend connected" : "Backend missing"} />
          </div>
        </header>

        <div className="workspace">
          <aside className="rail" aria-label="Workspace sections">
            <a className="rail-item" href="#input">
              <Icon name="upload" /> Input
            </a>
            <a className="rail-item" href="#target">
              <Icon name="target" /> Target
            </a>
            <a className="rail-item" href="#review">
              <Icon name="scan" /> Review
            </a>
            <a className="rail-item" href="#export">
              <Icon name="download" /> Export
            </a>
          </aside>

          <div className="input-stack">
            {!baseUrl ? (
              <div className="panel">
                <div className="panel-body">
                  <StatusPill ok={false} text="Backend URL missing" />
                  <p className="panel-copy">
                    Add <code>NEXT_PUBLIC_BACKEND_URL</code> in <code>.env.local</code> or Vercel, then restart the app so the workflow can call your API.
                  </p>
                </div>
              </div>
            ) : null}

            <Panel
              title="Resume intake"
              description="Drop in a DOCX resume and confirm the file before running the agent workflow."
              action={<StatusPill ok={Boolean(file)} text={file ? "File selected" : "Needs file"} />}
            >
              <label
                id="input"
                className={dragActive ? "dropzone active" : "dropzone"}
                onDragEnter={() => setDragActive(true)}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept=".docx"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  aria-label="Upload resume DOCX"
                />
                <span className="drop-main">
                  <span className="drop-icon">
                    <Icon name="file" />
                  </span>
                  <span>
                    <span className="drop-title">{file ? file.name : "Drop your resume here"}</span>
                    <span className="drop-hint">{file ? "Ready for upload. Choose another file to replace it." : "DOCX files work best with the current backend export flow."}</span>
                  </span>
                </span>
              </label>

              <div className="quick-grid" aria-label="Input checklist">
                <div className="quick-card">
                  <strong>Formatting</strong>
                  <span>Simple headings and clean bullets improve ATS parsing.</span>
                </div>
                <div className="quick-card">
                  <strong>Targeting</strong>
                  <span>Use the pasted job description when a job page is gated or dynamic.</span>
                </div>
              </div>
            </Panel>

            <Panel
              title="Role target"
              description="Give the agent a clear target role, then add company context when it matters."
              action={<StatusPill ok={hasTarget} text={hasTarget ? "Target ready" : "Needs target"} />}
            >
              <div id="target" className="input-stack">
                <div className="segment" role="tablist" aria-label="Job description input mode">
                  <button className={inputMode === "text" ? "active" : ""} type="button" onClick={() => setInputMode("text")}>
                    Paste text
                  </button>
                  <button className={inputMode === "url" ? "active" : ""} type="button" onClick={() => setInputMode("url")}>
                    Use URL
                  </button>
                </div>

                {inputMode === "text" ? (
                  <div className="field">
                    <label htmlFor="jdText">Job description</label>
                    <textarea
                      id="jdText"
                      value={jdText}
                      onChange={(event) => setJdText(event.target.value)}
                      placeholder="Paste the full job description here..."
                    />
                    <p className="field-hint">Pasted text gives the backend the most reliable role signal.</p>
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="jdUrl">Job posting URL</label>
                    <input
                      id="jdUrl"
                      value={jdUrl}
                      onChange={(event) => setJdUrl(event.target.value)}
                      placeholder="https://company.com/careers/job"
                    />
                    <p className="field-hint">Use public URLs that your backend can access without signing in.</p>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="companyUrl">Company URL</label>
                  <input
                    id="companyUrl"
                    value={companyUrl}
                    onChange={(event) => setCompanyUrl(event.target.value)}
                    placeholder="https://company.com"
                  />
                  <p className="field-hint">Optional context for company voice, product focus, and industry language.</p>
                </div>
              </div>
            </Panel>

            <section className="panel" id="export">
              <div className="run-panel">
                <div className="stage-row" aria-label="Run progress">
                  {stages.map((item) => (
                    <span key={item.key} className={stage === item.key ? "stage-chip active" : "stage-chip"}>
                      {item.label}
                    </span>
                  ))}
                </div>

                {error ? (
                  <div className="issue-card">
                    <strong>Workflow stopped</strong>
                    <p>{error}</p>
                  </div>
                ) : null}

                <button className="primary-button" type="button" onClick={onRun} disabled={!canRun}>
                  {busy ? "Agent is tailoring..." : "Run tailor + export"} <Icon name="spark" />
                </button>

                {!canRun ? (
                  <p className="field-hint">
                    Add a backend URL, a DOCX resume, and a job target to enable the workflow.
                  </p>
                ) : null}

                {downloadUrl ? (
                  <div className="download-row">
                    <a className="primary-button" href={downloadUrl} download>
                      Download DOCX <Icon name="download" />
                    </a>
                    <button className="ghost-button" type="button" onClick={copyDownloadUrl}>
                      Copy link <Icon name="copy" />
                    </button>
                    {copyState ? <span className="copy-state">{copyState}</span> : null}
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="analysis-grid">
            <Panel
              title="Agent review"
              description="Switch between the score, ATS notes, generated resume, and change log without losing your place."
              action={
                resumeId ? (
                  <span className="status-pill">
                    <Icon name="check" /> Resume ID ready
                  </span>
                ) : (
                  <span className="status-pill">
                    <Icon name="link" /> Waiting
                  </span>
                )
              }
            >
              <div id="review" className="input-stack">
                <div className="tabs" role="tablist" aria-label="Review sections">
                  <button className={activeTab === "score" ? "active" : ""} type="button" onClick={() => setActiveTab("score")}>
                    Fit score
                  </button>
                  <button className={activeTab === "ats" ? "active" : ""} type="button" onClick={() => setActiveTab("ats")}>
                    ATS
                  </button>
                  <button className={activeTab === "resume" ? "active" : ""} type="button" onClick={() => setActiveTab("resume")}>
                    Resume
                  </button>
                  <button className={activeTab === "changes" ? "active" : ""} type="button" onClick={() => setActiveTab("changes")}>
                    Changes
                  </button>
                </div>

                {activeTab === "score" ? (
                  result?.fit_score ? (
                    <div className="analysis-grid">
                      <div className="score-panel">
                        <div className="big-score" style={{ "--score": score } as React.CSSProperties}>
                          <span>{score}/100</span>
                        </div>
                        <div className="metric-grid">
                          <Metric label="Present" value={`${presentKeywords.length}`} />
                          <Metric label="Missing" value={`${missingKeywords.length}`} />
                          <Metric label="Top terms" value={`${topKeywords.length}`} />
                        </div>
                      </div>

                      {result.fit_score.note ? <p className="panel-copy">{result.fit_score.note}</p> : null}

                      <div>
                        <h3 className="panel-title">Matched keywords</h3>
                        <div className="keyword-cloud">
                          {presentKeywords.slice(0, 18).map((keyword) => (
                            <Pill key={`present-${keyword}`} text={keyword} kind="good" />
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="panel-title">Missing keywords</h3>
                        <div className="keyword-cloud">
                          {missingKeywords.slice(0, 18).map((keyword) => (
                            <Pill key={`missing-${keyword}`} text={keyword} kind="bad" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div>
                        <strong>No fit score yet</strong>
                        <p>Run the workflow and the score panel will turn into a keyword coverage dashboard.</p>
                      </div>
                    </div>
                  )
                ) : null}

                {activeTab === "ats" ? (
                  atsIssues.length ? (
                    <div className="issue-list">
                      {atsIssues.slice(0, 10).map((issue, index) => (
                        <article className="issue-card" key={`${issue.issue}-${index}`}>
                          <strong>{issue.severity.toUpperCase()}: {issue.issue}</strong>
                          <p>{issue.fix}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div>
                        <strong>{result ? "No ATS issues detected" : "ATS review is waiting"}</strong>
                        <p>{result ? "The tailored version came back clean based on the current backend report." : "After tailoring, this tab will list parser risks and suggested fixes."}</p>
                      </div>
                    </div>
                  )
                ) : null}

                {activeTab === "resume" ? (
                  result?.tailored_text ? (
                    <pre className="result-box">{result.tailored_text}</pre>
                  ) : (
                    <div className="empty-state">
                      <div>
                        <strong>Generated resume preview</strong>
                        <p>The tailored resume text will appear here before you download the DOCX.</p>
                      </div>
                    </div>
                  )
                ) : null}

                {activeTab === "changes" ? (
                  result?.change_log?.length ? (
                    <div className="change-list">
                      {result.change_log.map((change, index) => (
                        <article className="change-item" key={`${change}-${index}`}>
                          <strong>Change {index + 1}</strong>
                          <p>{change}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div>
                        <strong>No change log yet</strong>
                        <p>Once the backend returns a tailored resume, this view will explain what changed.</p>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            </Panel>

            <section className="preview-doc">
              <div className="document">
                <div className="doc-toolbar">
                  <StatusPill ok={stage === "ready"} text={stage === "ready" ? "Export ready" : "Live preview"} />
                  <span className="status-pill">{file ? file.name : "No resume selected"}</span>
                </div>
                <div className="doc-body">
                  <div className="doc-title">Tailored Resume</div>
                  <div className="doc-subtitle">{hasTarget ? "Role target loaded" : "Add a role target to start shaping the draft"}</div>
                  <div className="doc-rule" />
                  <div className="doc-section">
                    <h3>Profile</h3>
                    <div className="doc-line" />
                    <div className="doc-line medium" />
                    <div className="doc-line short" />
                  </div>
                  <div className="doc-section">
                    <h3>Role keywords</h3>
                    <div className="keyword-row">
                      {(presentKeywords.length ? presentKeywords : ["leadership", "analytics", "strategy", "delivery"]).slice(0, 6).map((keyword) => (
                        <span className="mini-keyword" key={`preview-${keyword}`}>{keyword}</span>
                      ))}
                    </div>
                  </div>
                  <div className="doc-section">
                    <h3>Impact bullets</h3>
                    <div className="doc-line medium" />
                    <div className="doc-line" />
                    <div className="doc-line short" />
                  </div>
                  <div className="doc-watermark">{score || readiness}%</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
