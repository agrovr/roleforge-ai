export default function Landing() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(16px, 3vw, 32px)",
        background:
          "radial-gradient(1100px 700px at 12% 0%, rgba(99,102,241,0.22), transparent 58%), radial-gradient(900px 520px at 100% 6%, rgba(14,165,233,0.14), transparent 56%), radial-gradient(900px 640px at 50% 100%, rgba(236,72,153,0.1), transparent 52%), linear-gradient(180deg, #07111f 0%, #060b16 100%)",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }}>
        <section
          style={{
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "linear-gradient(180deg, rgba(8,15,30,0.88), rgba(8,15,30,0.72))",
            padding: "clamp(18px, 4vw, 28px)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(14,165,233,0.9))",
                  boxShadow: "0 14px 36px rgba(37,99,235,0.25)",
                }}
              >
                RT
              </div>
              <div>
                <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Resume Tailor</div>
                <div style={{ fontSize: 13, color: "rgba(226,232,240,0.72)" }}>AI-powered resume optimization</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="#features" style={navLink}>
                Features
              </a>
              <a href="#workflow" style={navLink}>
                Workflow
              </a>
              <a href="/app" style={primaryLink}>
                Open app
              </a>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 24,
              marginTop: 28,
              alignItems: "center",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            <div>
              <div style={badge}>Built for modern job applications</div>
              <h1
                style={{
                  fontSize: "clamp(2.25rem, 6vw, 4.8rem)",
                  lineHeight: 0.96,
                  margin: "18px 0 14px",
                  letterSpacing: -2,
                  maxWidth: 760,
                }}
              >
                Tailor your resume with a cleaner, smarter, more credible workflow.
              </h1>
              <p
                style={{
                  fontSize: "clamp(1rem, 1.9vw, 1.08rem)",
                  opacity: 0.82,
                  maxWidth: 680,
                  lineHeight: 1.75,
                  margin: 0,
                }}
              >
                Upload a resume, add a target job description, review ATS warnings, inspect keyword coverage,
                and export a tailored version in a polished experience designed to work smoothly on desktop and mobile.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                <a href="/app" style={primaryLink}>
                  Start tailoring
                </a>
                <a href="#features" style={secondaryLink}>
                  See features
                </a>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  marginTop: 26,
                }}
              >
                <Stat value="ATS" label="Issue detection" />
                <Stat value="Fit" label="Keyword match scoring" />
                <Stat value="DOCX" label="Export-ready output" />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <PreviewCard title="Resume upload" text="Drop in a .docx resume and start the workflow in seconds." />
              <PreviewCard title="Role targeting" text="Use a JD URL or paste the description for more direct tailoring." />
              <PreviewCard title="Fit insights" text="Review matched keywords, missing terms, and score signals." />
              <PreviewCard title="Mobile-ready" text="A responsive layout that feels much cleaner on smaller screens." />
            </div>
          </div>
        </section>

        <section
          id="features"
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <FeatureBlock
            eyebrow="01"
            title="Sharper ATS review"
            text="Surface issues faster with cleaner, easier-to-scan warning cards."
          />
          <FeatureBlock
            eyebrow="02"
            title="Better decision signals"
            text="Understand score, coverage, and keyword gaps without digging through clutter."
          />
          <FeatureBlock
            eyebrow="03"
            title="Cleaner export flow"
            text="Generate and download a tailored resume with fewer steps and clearer status states."
          />
          <FeatureBlock
            eyebrow="04"
            title="More polished UI"
            text="Improved spacing, hierarchy, and card structure for a more premium feel."
          />
        </section>

        <section
          id="workflow"
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
            padding: "clamp(18px, 4vw, 28px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <div style={badge}>Workflow</div>
              <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", margin: "14px 0 10px", letterSpacing: -1 }}>
                A simpler path from raw resume to tailored export.
              </h2>
              <p style={{ margin: 0, maxWidth: 720, color: "rgba(226,232,240,0.78)", lineHeight: 1.7 }}>
                The experience is organized to help users move step-by-step without getting lost, especially on mobile.
              </p>
            </div>
            <a href="/app" style={primaryLink}>
              Open the workspace
            </a>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              marginTop: 22,
            }}
          >
            <StepCard number="01" title="Upload" text="Add your base resume as a .docx file." />
            <StepCard number="02" title="Target" text="Paste a job description or use a job posting URL." />
            <StepCard number="03" title="Review" text="Check score, ATS issues, and missing keywords." />
            <StepCard number="04" title="Export" text="Download a cleaner tailored version when ready." />
          </div>
        </section>
      </div>
    </main>
  );
}

const navLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  textDecoration: "none",
  fontWeight: 700,
};

const primaryLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "12px 18px",
  borderRadius: 16,
  background: "linear-gradient(135deg, rgba(99,102,241,0.92), rgba(14,165,233,0.84))",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 18px 44px rgba(37,99,235,0.24)",
  fontWeight: 800,
  textDecoration: "none",
  color: "white",
};

const secondaryLink: React.CSSProperties = {
  ...navLink,
  minHeight: 48,
  padding: "12px 18px",
};

const badge: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.35,
  textTransform: "uppercase",
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 900 }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: "rgba(226,232,240,0.74)" }}>{label}</div>
    </div>
  );
}

function PreviewCard({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))",
        border: "1px solid rgba(255,255,255,0.1)",
        minHeight: 164,
        boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(255,255,255,0.08)", marginBottom: 14 }} />
      <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>{title}</h3>
      <p style={{ opacity: 0.76, lineHeight: 1.65, margin: 0 }}>{text}</p>
    </div>
  );
}

function FeatureBlock({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.35, color: "rgba(191,219,254,0.8)" }}>{eyebrow}</div>
      <h3 style={{ margin: "12px 0 10px", fontSize: 20 }}>{title}</h3>
      <p style={{ margin: 0, lineHeight: 1.72, color: "rgba(226,232,240,0.76)" }}>{text}</p>
    </div>
  );
}

function StepCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(2,6,23,0.24)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(191,219,254,0.8)", letterSpacing: 0.35 }}>{number}</div>
      <h3 style={{ margin: "12px 0 10px", fontSize: 18 }}>{title}</h3>
      <p style={{ margin: 0, lineHeight: 1.7, color: "rgba(226,232,240,0.74)" }}>{text}</p>
    </div>
  );
}
