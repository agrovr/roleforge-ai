"use client";

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

const styles = {
  page: {
    minHeight: "100vh",
    padding: "clamp(18px, 3vw, 36px)",
    background:
      "radial-gradient(1200px 700px at 10% 0%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(900px 540px at 100% 8%, rgba(14,165,233,0.16), transparent 55%), radial-gradient(900px 700px at 50% 100%, rgba(236,72,153,0.12), transparent 52%), linear-gradient(180deg, #07111f 0%, #060b16 100%)",
    color: "#f8fafc",
  } as React.CSSProperties,

  shell: {
    maxWidth: 1240,
    margin: "0 auto",
  } as React.CSSProperties,

  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    padding: "clamp(20px, 4vw, 34px)",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "linear-gradient(180deg, rgba(10,18,35,0.9) 0%, rgba(11,18,32,0.72) 100%)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
    backdropFilter: "blur(14px)",
  } as React.CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  } as React.CSSProperties,

  title: {
    margin: "16px 0 10px",
    fontSize: "clamp(2rem, 5vw, 3.5rem)",
    lineHeight: 1.02,
    letterSpacing: -1.4,
    maxWidth: 820,
  } as React.CSSProperties,

  subtitle: {
    margin: 0,
    maxWidth: 720,
    lineHeight: 1.7,
    color: "rgba(226,232,240,0.8)",
    fontSize: "clamp(0.96rem, 1.7vw, 1.08rem)",
  } as React.CSSProperties,

  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginTop: 24,
  } as React.CSSProperties,

  statCard: {
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,

  actionBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 28,
    paddingTop: 18,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  primaryBtn: (disabled: boolean): React.CSSProperties => ({
    border: "1px solid rgba(129,140,248,0.45)",
    background: disabled
      ? "rgba(255,255,255,0.08)"
      : "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(14,165,233,0.75))",
    color: "white",
    borderRadius: 16,
    padding: "14px 18px",
    minHeight: 52,
    minWidth: 230,
    fontWeight: 800,
    letterSpacing: 0.2,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 18px 40px rgba(37,99,235,0.22)",
  }),

  secondaryBtn: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    borderRadius: 14,
    padding: "11px 14px",
    minHeight: 44,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,

  contentGrid: {
    display: "grid",
    gap: 18,
    marginTop: 18,
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
  } as React.CSSProperties,

  sideStack: {
    display: "grid",
    gap: 18,
  } as React.CSSProperties,

  card: {
    borderRadius: 24,
    padding: "clamp(16px, 2.2vw, 22px)",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.035))",
    boxShadow: "0 22px 60px rgba(0,0,0,0.18)",
    backdropFilter: "blur(14px)",
  } as React.CSSProperties,

  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,

  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: -0.3,
  } as React.CSSProperties,

  cardText: {
    margin: "6px 0 0",
    color: "rgba(226,232,240,0.72)",
    lineHeight: 1.55,
    fontSize: 14,
  } as React.CSSProperties,

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(2,6,23,0.32)",
    fontSize: 12,
    color: "rgba(241,245,249,0.9)",
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: "rgba(191,219,254,0.85)",
    marginBottom: 8,
  } as React.CSSProperties,

  fieldStack: {
    display: "grid",
    gap: 16,
  } as React.CSSProperties,

  fieldGroup: {
    display: "grid",
    gap: 8,
  } as React.CSSProperties,

  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "rgba(248,250,252,0.95)",
  } as React.CSSProperties,

  input: {
    width: "100%",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(2,6,23,0.38)",
    color: "white",
    padding: "13px 14px",
    outline: "none",
    fontSize: 14,
    minHeight: 50,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(2,6,23,0.38)",
    color: "white",
    padding: "14px 14px",
    outline: "none",
    fontSize: 14,
    lineHeight: 1.6,
    resize: "vertical",
    minHeight: 220,
  } as React.CSSProperties,

  uploadBox: {
    borderRadius: 18,
    padding: 16,
    border: "1px dashed rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  helperText: {
    fontSize: 12,
    lineHeight: 1.55,
    color: "rgba(226,232,240,0.68)",
  } as React.CSSProperties,

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  } as React.CSSProperties,

  infoTile: {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,

  progressOuter: {
    height: 12,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    overflow: "hidden",
    background: "rgba(2,6,23,0.42)",
    marginTop: 12,
  } as React.CSSProperties,

  progressInner: (pct: number): React.CSSProperties => ({
    width: `${Math.max(0, Math.min(100, pct))}%`,
    height: "100%",
    background: "linear-gradient(90deg, rgba(52,211,153,0.92), rgba(59,130,246,0.92))",
  }),

  warningStack: {
    display: "grid",
    gap: 10,
  } as React.CSSProperties,

  warningCard: {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(2,6,23,0.34)",
  } as React.CSSProperties,

  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
    marginTop: 18,
  } as React.CSSProperties,

  pre: {
    whiteSpace: "pre-wrap",
    margin: 0,
    fontSize: 13,
    lineHeight: 1.65,
    background: "rgba(2,6,23,0.42)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    maxHeight: 460,
    overflow: "auto",
  } as React.CSSProperties,

  linkBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    padding: "10px 14px",
    fontWeight: 800,
    color: "white",
    textDecoration: "none",
    border: "1px solid rgba(74,222,128,0.28)",
    background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.16))",
  } as React.CSSProperties,
};

function Pill({ text, kind }: { text: string; kind: "good" | "bad" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        margin: "0 8px 8px 0",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        border:
          kind === "good"
            ? "1px solid rgba(74,222,128,0.35)"
            : "1px solid rgba(251,113,133,0.34)",
        background:
          kind === "good"
            ? "rgba(22,163,74,0.12)"
            : "rgba(225,29,72,0.12)",
        color: "white",
      }}
    >
      {text}
    </span>
  );
}

function Card({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>{title}</h2>
          {description ? <p style={styles.cardText}>{description}</p> : null}
        </div>
        {right}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={styles.infoTile}>
      <div style={{ fontSize: 12, color: "rgba(191,219,254,0.82)", textTransform: "uppercase", letterSpacing: 0.35 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{value}</div>
      <div style={{ ...styles.helperText, marginTop: 4 }}>{hint}</div>
    </div>
  );
}

export default function Page() {
  const baseUrl = useMemo(() => {
    const v = process.env.NEXT_PUBLIC_BACKEND_URL;
    return v && v.trim() ? v.trim() : "";
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [jdUrl, setJdUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  async function upload(): Promise<string> {
    if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL in .env.local");
    if (!file) throw new Error("Select a resume .docx first");

    const form = new FormData();
    form.append("file", file);

    const r = await fetch(`${baseUrl}/upload`, { method: "POST", body: form });
    if (!r.ok) throw new Error("Upload failed");

    const data = (await r.json()) as UploadResponse;
    setResumeId(data.resume_id);
    return data.resume_id;
  }

  async function tailor(resume_id: string): Promise<TailorResult> {
    if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL in .env.local");

    const isHttp = (s: string) => /^https?:\/\//i.test(s.trim());

    const payload: {
      resume_id: string;
      jd_url?: string;
      jd_text?: string;
      company_url?: string;
    } = { resume_id };

    if (jdUrl.trim() && isHttp(jdUrl)) payload.jd_url = jdUrl.trim();
    if (jdText.trim()) payload.jd_text = jdText.trim();
    if (companyUrl.trim() && isHttp(companyUrl)) payload.company_url = companyUrl.trim();

    const r = await fetch(`${baseUrl}/tailor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error("Tailor failed");

    const data = (await r.json()) as TailorResult;
    setResult(data);
    return data;
  }

  async function exportDocx(tailoredText: string): Promise<string> {
    if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL in .env.local");

    const payload = {
      filename: "tailored_resume.docx",
      title: "TAILORED RESUME",
      content: tailoredText,
    };

    const r = await fetch(`${baseUrl}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error("Export failed");

    const data = (await r.json()) as ExportResponse;
    const url = `${baseUrl}/download/${data.download_filename}`;
    setDownloadUrl(url);
    return url;
  }

  async function onRun() {
    setBusy(true);
    setResult(null);
    setDownloadUrl(null);

    try {
      const id = await upload();
      const out = await tailor(id);
      await exportDocx(out.tailored_text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  const score = result?.fit_score?.score ?? null;
  const coverage = result?.fit_score?.coverage_ratio;
  const bonus = result?.fit_score?.heading_bonus;
  const presentCount = result?.fit_score?.present?.length ?? 0;
  const missingCount = result?.fit_score?.missing?.length ?? 0;

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <section style={styles.hero}>
          <span style={styles.badge}>AI Resume Tailoring Studio</span>
          <h1 style={styles.title}>Turn your resume into a cleaner, sharper, ATS-ready version.</h1>
          <p style={styles.subtitle}>
            Upload your resume, add a job description, and generate a tailored version with a clearer fit score,
            stronger keyword coverage, and a much cleaner interface on desktop and mobile.
          </p>

          <div style={styles.heroStats}>
            <div style={styles.statCard}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.35, color: "rgba(191,219,254,0.85)" }}>
                Resume
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>{file ? file.name : "No file selected"}</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.35, color: "rgba(191,219,254,0.85)" }}>
                Status
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>
                {busy ? "Working..." : downloadUrl ? "Export ready" : result ? "Ready to download" : "Waiting for input"}
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.35, color: "rgba(191,219,254,0.85)" }}>
                Fit score
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>{score !== null ? `${score}/100` : "Not generated yet"}</div>
            </div>
          </div>

          <div style={styles.actionBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={styles.chip}>{baseUrl ? "Backend connected" : "Backend missing"}</span>
              <span style={styles.chip}>{jdText.trim() || jdUrl.trim() ? "JD added" : "Add a job description"}</span>
              {resumeId ? <span style={styles.chip}>Resume ID ready</span> : null}
            </div>

            <button
              onClick={onRun}
              disabled={busy || !baseUrl}
              style={styles.primaryBtn(busy || !baseUrl)}
              title={!baseUrl ? "Set NEXT_PUBLIC_BACKEND_URL in Vercel / .env.local" : ""}
            >
              {busy ? "Tailoring resume..." : "Run tailor + export"}
            </button>
          </div>
        </section>

        {!baseUrl ? (
          <div style={{ ...styles.card, marginTop: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Backend URL missing</div>
            <div style={styles.helperText}>
              Add <code>NEXT_PUBLIC_BACKEND_URL</code> in <code>.env.local</code> or Vercel, then redeploy or restart your app.
            </div>
          </div>
        ) : null}

        <div className="rt-content-grid" style={styles.contentGrid}>
          <Card
            title="Resume + role input"
            description="Everything needed to run the tailoring flow."
            right={<span style={styles.chip}>{file ? "Resume selected" : "Upload a .docx"}</span>}
          >
            <div style={styles.fieldStack}>
              <div style={styles.uploadBox}>
                <div style={styles.sectionLabel}>Step 1</div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Upload your resume (.docx)</label>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    style={{ color: "white" }}
                  />
                  <div style={styles.helperText}>Keep formatting ATS-friendly when possible. Simple sections work best.</div>
                  {file ? <span style={{ ...styles.chip, width: "fit-content" }}>{file.name}</span> : null}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <div style={styles.sectionLabel}>Step 2</div>
                <label style={styles.label}>Job description URL</label>
                <input
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  placeholder="https://company.com/job-posting"
                  style={styles.input}
                />
                <div style={styles.helperText}>Use this if the job posting is publicly accessible.</div>
              </div>

              <div style={styles.fieldGroup}>
                <div style={styles.sectionLabel}>Step 3</div>
                <label style={styles.label}>Paste the job description instead</label>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={10}
                  placeholder="Paste the job description here for a more direct tailoring pass..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.fieldGroup}>
                <div style={styles.sectionLabel}>Step 4</div>
                <label style={styles.label}>Company URL</label>
                <input
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://company.com"
                  style={styles.input}
                />
                <div style={styles.helperText}>Optional, but useful for extra company context.</div>
              </div>

              {resumeId && !downloadUrl ? (
                <div style={{ ...styles.infoTile, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.35 }}>Current resume ID</div>
                  <div style={{ marginTop: 6, wordBreak: "break-word", fontSize: 13 }}>{resumeId}</div>
                </div>
              ) : null}
            </div>
          </Card>

          <div style={styles.sideStack}>
            <Card
              title="Fit score overview"
              description="A clearer summary of how well the tailored resume matches the role."
              right={
                result?.fit_score ? (
                  <span style={styles.chip}>Coverage {coverage ?? "-"} · Bonus {bonus ?? "-"}</span>
                ) : (
                  <span style={styles.chip}>Run tailoring first</span>
                )
              }
            >
              {result?.fit_score ? (
                <>
                  <div style={styles.infoGrid}>
                    <Metric label="Score" value={`${score}/100`} hint="Overall resume-role match" />
                    <Metric label="Present" value={`${presentCount}`} hint="Detected matched terms" />
                    <Metric label="Missing" value={`${missingCount}`} hint="Terms to strengthen" />
                  </div>

                  <div style={styles.progressOuter}>
                    <div style={styles.progressInner(score ?? 0)} />
                  </div>

                  {result.fit_score.note ? (
                    <div style={{ ...styles.helperText, marginTop: 10 }}>{result.fit_score.note}</div>
                  ) : null}

                  <div style={{ marginTop: 16 }}>
                    <div style={styles.label}>Matched keywords</div>
                    <div>
                      {(result.fit_score.present || []).slice(0, 16).map((k) => (
                        <Pill key={`p-${k}`} text={k} kind="good" />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={styles.label}>Missing keywords</div>
                    <div>
                      {(result.fit_score.missing || []).slice(0, 16).map((k) => (
                        <Pill key={`m-${k}`} text={k} kind="bad" />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={styles.helperText}>Run the workflow to see score, keyword match coverage, and missing terms.</div>
              )}
            </Card>

            <Card
              title="ATS warnings after tailoring"
              description="A cleaner warning list that is easier to scan on mobile."
              right={result?.ats_after ? <span style={styles.chip}>Post-tailor</span> : <span style={styles.chip}>No results yet</span>}
            >
              {result?.ats_after ? (
                <div style={styles.warningStack}>
                  {result.ats_after.issues.length === 0 ? (
                    <div style={styles.helperText}>No issues detected.</div>
                  ) : (
                    result.ats_after.issues.slice(0, 8).map((x, idx) => (
                      <div key={idx} style={styles.warningCard}>
                        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.1 }}>
                          {x.severity.toUpperCase()}: {x.issue}
                        </div>
                        <div style={{ ...styles.helperText, marginTop: 6 }}>{x.fix}</div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div style={styles.helperText}>Run tailoring to review the ATS warning summary.</div>
              )}
            </Card>

            {downloadUrl ? (
              <Card title="Export ready" description="Your tailored file is ready to download or share.">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a href={downloadUrl} download style={styles.linkBtn}>
                    Download .docx
                  </a>
                  <button
                    style={styles.secondaryBtn}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(downloadUrl);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    Copy download link
                  </button>
                </div>
              </Card>
            ) : null}
          </div>
        </div>

        {result ? (
          <div style={styles.resultGrid}>
            <Card title="Change log" description="The backend notes what changed during the tailoring step.">
              <pre style={styles.pre}>{JSON.stringify(result.change_log, null, 2)}</pre>
            </Card>

            <Card title="Tailored resume preview" description="A quick in-app preview before downloading the generated document.">
              <pre style={styles.pre}>{result.tailored_text}</pre>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
