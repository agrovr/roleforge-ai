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
type ExportResponse = { saved_to: string; download_url: string };

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
    setDownloadUrl(data.download_url);
    return data.download_url;
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

  const Card = (props: { title: string; children: React.ReactNode }) => (
    <section
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 16,
        backdropFilter: "blur(10px)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 0.2 }}>{props.title}</h2>
      <div style={{ marginTop: 12 }}>{props.children}</div>
    </section>
  );

  const Label = (props: { text: string }) => (
    <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>{props.text}</div>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "white",
        outline: "none",
      }}
    />
  );

  const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "white",
        outline: "none",
        resize: "vertical",
      }}
    />
  );

  const Pill = (props: { text: string; kind: "good" | "bad" }) => (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        margin: "0 8px 8px 0",
        borderRadius: 999,
        fontSize: 12,
        border:
          props.kind === "good"
            ? "1px solid rgba(76, 175, 80, 0.7)"
            : "1px solid rgba(244, 67, 54, 0.7)",
        background:
          props.kind === "good"
            ? "rgba(76, 175, 80, 0.10)"
            : "rgba(244, 67, 54, 0.10)",
        color: "white",
      }}
    >
      {props.text}
    </span>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 16px",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(34,197,94,0.20), transparent 55%), radial-gradient(900px 700px at 50% 90%, rgba(236,72,153,0.18), transparent 55%), #070A12",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 0.2 }}>Resume Tailor</h1>
              <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
                Upload a resume, add a job description, then export an ATS-friendly tailored version.
              </p>
            </div>

            <button
              onClick={onRun}
              disabled={busy || !baseUrl}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: busy ? "rgba(255,255,255,0.10)" : "rgba(99,102,241,0.28)",
                color: "white",
                cursor: busy || !baseUrl ? "not-allowed" : "pointer",
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
              title={!baseUrl ? "Set NEXT_PUBLIC_BACKEND_URL in .env.local" : ""}
            >
              {busy ? "Working…" : "Upload → Tailor → Export"}
            </button>
          </div>

          {!baseUrl && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)" }}>
              Missing <b>NEXT_PUBLIC_BACKEND_URL</b>. Add it to <code>.env.local</code> and restart <code>npm run dev</code>.
            </div>
          )}

          {downloadUrl && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)" }}>
              <b>Download:</b>{" "}
              <a
                href={downloadUrl}
                download
                style={{ color: "white", textDecoration: "underline" }}
              >
                tailored_resume.docx
              </a>
            </div>
          )}
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <Card title="Inputs">
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <Label text="Resume (.docx)" />
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  style={{ color: "white" }}
                />
                {file && <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{file.name}</div>}
              </div>

              <div>
                <Label text="Job Description URL (optional)" />
                <Input value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} placeholder="https://…" />
              </div>

              <div>
                <Label text="Or paste Job Description text" />
                <TextArea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={8} placeholder="Paste the JD here…" />
              </div>

              <div>
                <Label text="Company URL (optional)" />
                <Input value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} placeholder="https://…" />
              </div>

              {resumeId && (
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  <b>resume_id:</b> {resumeId}
                </div>
              )}
            </div>
          </Card>

          <div style={{ display: "grid", gap: 16 }}>
            <Card title="Job Fit Score">
              {result?.fit_score ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{score}/100</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      coverage {result.fit_score.coverage_ratio ?? "-"} · bonus {result.fit_score.heading_bonus ?? "-"}
                    </div>
                  </div>

                  <div style={{ height: 12, borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", overflow: "hidden", marginTop: 10 }}>
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, score ?? 0))}%`,
                        height: "100%",
                        background: "rgba(34,197,94,0.75)",
                      }}
                    />
                  </div>

                  {result.fit_score.note && <div style={{ marginTop: 10, opacity: 0.85 }}>{result.fit_score.note}</div>}

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}><b>Found</b></div>
                    <div>
                      {(result.fit_score.present || []).slice(0, 16).map((k) => (
                        <Pill key={`p-${k}`} text={k} kind="good" />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}><b>Missing</b></div>
                    <div>
                      {(result.fit_score.missing || []).slice(0, 16).map((k) => (
                        <Pill key={`m-${k}`} text={k} kind="bad" />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.8 }}>Run tailoring to see score.</div>
              )}
            </Card>

            <Card title="ATS Warnings After">
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
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          {x.severity.toUpperCase()}: {x.issue}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{x.fix}</div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ opacity: 0.8 }}>Run tailoring to see ATS results.</div>
              )}
            </Card>
          </div>
        </div>

        {result && (
          <div className="grid-main" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            <div className="grid-bottom" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
              <Card title="Change Log">
                <pre style={{
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.45,
                  background: "rgba(0,0,0,0.22)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: 12,
                  maxHeight: 340,
                  overflow: "auto",
                }}>
                  {JSON.stringify(result.change_log, null, 2)}
                </pre>
              </Card>

              <Card title="Tailored Resume Preview">
                <pre style={{
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.45,
                  background: "rgba(0,0,0,0.22)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: 12,
                  maxHeight: 340,
                  overflow: "auto",
                }}>
                  {result.tailored_text}
                </pre>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
