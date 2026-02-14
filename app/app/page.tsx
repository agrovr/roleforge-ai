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
    padding: "44px 16px 56px",
    background:
      "radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(34,197,94,0.20), transparent 55%), radial-gradient(900px 700px at 50% 90%, rgba(236,72,153,0.18), transparent 55%), #070A12",
    color: "white",
  } as React.CSSProperties,

  container: {
    maxWidth: 1150,
    margin: "0 auto",
  } as React.CSSProperties,

  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
    flexWrap: "wrap",
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 28,
    letterSpacing: 0.2,
    lineHeight: 1.15,
  } as React.CSSProperties,

  subtitle: {
    margin: "8px 0 0",
    opacity: 0.78,
    maxWidth: 760,
    lineHeight: 1.5,
  } as React.CSSProperties,

  primaryBtn: (disabled: boolean): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: disabled ? "rgba(255,255,255,0.10)" : "rgba(99,102,241,0.30)",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    letterSpacing: 0.2,
    minWidth: 190,
    height: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: disabled ? "none" : "0 10px 30px rgba(0,0,0,0.20)",
  }),

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 16,
    alignItems: "start",
  } as React.CSSProperties,

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
    backdropFilter: "blur(10px)",
  } as React.CSSProperties,

  cardHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  } as React.CSSProperties,

  cardTitle: {
    margin: 0,
    fontSize: 15,
    letterSpacing: 0.25,
    opacity: 0.92,
  } as React.CSSProperties,

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.20)",
    fontSize: 12,
    opacity: 0.92,
  } as React.CSSProperties,

  label: {
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 6,
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.26)",
    color: "white",
    outline: "none",
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.26)",
    color: "white",
    outline: "none",
    resize: "vertical",
    lineHeight: 1.45,
  } as React.CSSProperties,

  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  } as React.CSSProperties,

  fileHint: {
    fontSize: 12,
    opacity: 0.78,
    marginTop: 6,
  } as React.CSSProperties,

  divider: {
    height: 1,
    background: "rgba(255,255,255,0.10)",
    margin: "12px 0",
    borderRadius: 999,
  } as React.CSSProperties,

  downloadBar: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,

  downloadBtn: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(34,197,94,0.18)",
    color: "white",
    textDecoration: "none",
    fontWeight: 700,
    letterSpacing: 0.2,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,

  smallBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  } as React.CSSProperties,

  progressOuter: {
    height: 12,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    overflow: "hidden",
    marginTop: 10,
    background: "rgba(0,0,0,0.18)",
  } as React.CSSProperties,

  progressInner: (pct: number): React.CSSProperties => ({
    width: `${Math.max(0, Math.min(100, pct))}%`,
    height: "100%",
    background: "rgba(34,197,94,0.75)",
  }),

  pre: {
    whiteSpace: "pre-wrap",
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: 12,
    maxHeight: 360,
    overflow: "auto",
  } as React.CSSProperties,
};

function Pill({ text, kind }: { text: string; kind: "good" | "bad" }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        margin: "0 8px 8px 0",
        borderRadius: 999,
        fontSize: 12,
        border:
          kind === "good"
            ? "1px solid rgba(76, 175, 80, 0.7)"
            : "1px solid rgba(244, 67, 54, 0.7)",
        background:
          kind === "good"
            ? "rgba(76, 175, 80, 0.10)"
            : "rgba(244, 67, 54, 0.10)",
        color: "white",
      }}
    >
      {text}
    </span>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>{title}</h2>
        {right}
      </div>
      <div>{children}</div>
    </section>
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

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={{ marginBottom: 18 }}>
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.title}>Resume Tailor</h1>
              <p style={styles.subtitle}>
                Upload a resume, add a job description, then export an ATS-friendly tailored version.
              </p>
            </div>

            <button
              onClick={onRun}
              disabled={busy || !baseUrl}
              style={styles.primaryBtn(busy || !baseUrl)}
              title={!baseUrl ? "Set NEXT_PUBLIC_BACKEND_URL in Vercel / .env.local" : ""}
            >
              {busy ? "Working…" : "Upload → Tailor → Export"}
            </button>
          </div>

          {!baseUrl && (
            <div style={{ ...styles.card, borderRadius: 14, padding: 12 }}>
              Missing <b>NEXT_PUBLIC_BACKEND_URL</b>. Add it to <code>.env.local</code> and restart <code>npm run dev</code>.
            </div>
          )}

          {downloadUrl && (
            <div style={styles.downloadBar}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={styles.chip}>✅ Export ready</span>
                {resumeId && (
                  <span style={{ ...styles.chip, opacity: 0.8 }}>
                    resume_id: <span style={{ opacity: 0.95 }}>{resumeId}</span>
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <a href={downloadUrl} download style={styles.downloadBtn}>
                  ⬇️ Download tailored_resume.docx
                </a>
                <button
                  style={styles.smallBtn}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(downloadUrl);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copy link
                </button>
              </div>
            </div>
          )}
        </header>

        <div style={styles.grid}>
          <Card
            title="Inputs"
            right={<span style={{ ...styles.chip, opacity: 0.8 }}>{file ? "Resume selected" : "Select a .docx"}</span>}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={styles.label}>Resume (.docx)</div>
                <div style={styles.fileRow}>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    style={{ color: "white" }}
                  />
                  {file && <span style={styles.chip}>{file.name}</span>}
                </div>
                <div style={styles.fileHint}>Tip: keep it ATS-friendly (no tables/columns if possible).</div>
              </div>

              <div style={styles.divider} />

              <div>
                <div style={styles.label}>Job Description URL (optional)</div>
                <input
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  placeholder="https://…"
                  style={styles.input}
                />
              </div>

              <div>
                <div style={styles.label}>Or paste Job Description text</div>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={9}
                  placeholder="Paste the JD here…"
                  style={styles.textarea}
                />
              </div>

              <div>
                <div style={styles.label}>Company URL (optional)</div>
                <input
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://…"
                  style={styles.input}
                />
              </div>

              {resumeId && !downloadUrl && (
                <div style={{ fontSize: 12, opacity: 0.82 }}>
                  <b>resume_id:</b> {resumeId}
                </div>
              )}
            </div>
          </Card>

          <div style={{ display: "grid", gap: 16 }}>
            <Card
              title="Job Fit Score"
              right={
                result?.fit_score ? (
                  <span style={styles.chip}>
                    coverage {coverage ?? "-"} · bonus {bonus ?? "-"}
                  </span>
                ) : (
                  <span style={{ ...styles.chip, opacity: 0.75 }}>Run tailoring</span>
                )
              }
            >
              {result?.fit_score ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 30, fontWeight: 800 }}>{score}/100</div>
                    {result.fit_score.note && (
                      <div style={{ fontSize: 12, opacity: 0.78, maxWidth: 320, textAlign: "right" }}>
                        {result.fit_score.note}
                      </div>
                    )}
                  </div>

                  <div style={styles.progressOuter}>
                    <div style={styles.progressInner(score ?? 0)} />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>
                      <b>Found</b>
                    </div>
                    <div>
                      {(result.fit_score.present || []).slice(0, 18).map((k) => (
                        <Pill key={`p-${k}`} text={k} kind="good" />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>
                      <b>Missing</b>
                    </div>
                    <div>
                      {(result.fit_score.missing || []).slice(0, 18).map((k) => (
                        <Pill key={`m-${k}`} text={k} kind="bad" />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.82 }}>
                  Upload a resume and add a JD, then click <b>Upload → Tailor → Export</b>.
                </div>
              )}
            </Card>

            <Card title="ATS Warnings After" right={result?.ats_after ? <span style={styles.chip}>Post-tailor</span> : undefined}>
              {result?.ats_after ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {result.ats_after.issues.length === 0 ? (
                    <div style={{ opacity: 0.85 }}>No issues detected.</div>
                  ) : (
                    result.ats_after.issues.slice(0, 8).map((x, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.22)",
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 13 }}>
                          {x.severity.toUpperCase()}: {x.issue}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{x.fix}</div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ opacity: 0.82 }}>Run tailoring to see ATS results.</div>
              )}
            </Card>
          </div>
        </div>

        {result && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
              <Card title="Change Log" right={<span style={styles.chip}>{(result.change_log || []).length} items</span>}>
                <pre style={styles.pre}>{JSON.stringify(result.change_log, null, 2)}</pre>
              </Card>

              <Card title="Tailored Resume Preview" right={downloadUrl ? <span style={styles.chip}>Exported</span> : <span style={styles.chip}>Preview</span>}>
                <pre style={styles.pre}>{result.tailored_text}</pre>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
