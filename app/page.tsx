import Link from "next/link";

type IconName = "upload" | "target" | "scan" | "export" | "arrow" | "spark";

function Icon({ name }: { name: IconName }) {
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

  if (name === "export") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </svg>
  );
}

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Resume Tailor home">
      <span className="brand-mark">RT</span>
      <span>
        <span className="brand-name">Resume Tailor</span>
        <span className="brand-kicker">AI application workbench</span>
      </span>
    </Link>
  );
}

function Proof({ value, label }: { value: string; label: string }) {
  return (
    <div className="proof-item">
      <div className="proof-value">{value}</div>
      <div className="proof-label">{label}</div>
    </div>
  );
}

function WorkflowStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: IconName;
  title: string;
  text: string;
}) {
  return (
    <article className="workflow-step">
      <div className="step-number">{number}</div>
      <div className="small-icon" aria-hidden="true">
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default function Landing() {
  return (
    <main className="page-shell">
      <header className="nav">
        <div className="nav-inner">
          <Brand />
          <nav className="nav-links" aria-label="Primary navigation">
            <a className="link-button" href="#workflow">
              Workflow
            </a>
            <a className="link-button" href="#why">
              Why it helps
            </a>
            <a className="primary-button" href="/app">
              Open studio <Icon name="arrow" />
            </a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Icon name="spark" /> Built for focused applications
          </span>
          <h1 className="headline">Turn one resume into a sharper role match.</h1>
          <p className="subhead">
            A cleaner AI workspace for uploading a resume, targeting a job description, checking ATS signals, and exporting a tailored document without losing the professional feel.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="/app">
              Start tailoring <Icon name="arrow" />
            </a>
            <a className="ghost-button" href="#workflow">
              See the flow
            </a>
          </div>

          <div className="hero-proof" aria-label="Product highlights">
            <Proof value="ATS" label="Scan headings, formatting risks, and parser-friendly fixes." />
            <Proof value="Fit" label="Compare matched and missing role keywords at a glance." />
            <Proof value="DOCX" label="Export a clean document when the review is ready." />
          </div>
        </div>

        <div className="resume-stage" aria-label="Resume Tailor product preview">
          <div className="paper-stack">
            <div className="paper-shadow" />
            <div className="paper-shadow" />
            <div className="paper-sheet">
              <div className="paper-header">
                <div>
                  <div className="resume-name">Alex Morgan</div>
                  <div className="resume-role">Product Operations Manager</div>
                </div>
                <div className="score-ring" aria-label="Fit score 82 percent">
                  <span>82%</span>
                </div>
              </div>

              <div className="resume-section">
                <div className="section-title">Summary tuned to role</div>
                <div className="resume-line" />
                <div className="resume-line medium" />
                <div className="resume-line short" />
              </div>

              <div className="resume-section">
                <div className="section-title">Keyword coverage</div>
                <div className="keyword-row">
                  <span className="mini-keyword">roadmaps</span>
                  <span className="mini-keyword">stakeholders</span>
                  <span className="mini-keyword">SQL</span>
                  <span className="mini-keyword">process design</span>
                </div>
              </div>

              <div className="resume-section">
                <div className="section-title">ATS notes</div>
                <div className="resume-line medium" />
                <div className="resume-line" />
                <div className="resume-line short" />
              </div>

              <div className="scan-line" />
            </div>
          </div>

          <div className="floating-note">
            <strong>Live review stack</strong>
            <span>Upload, target, scan, and export now feel like one guided desk instead of a static form.</span>
          </div>
        </div>
      </section>

      <section id="workflow" className="band">
        <div className="band-inner">
          <div className="section-head">
            <div>
              <span className="eyebrow">Workflow</span>
              <h2>Built around the actual resume tailoring job.</h2>
            </div>
            <p>
              Each step makes the next action obvious while keeping the resume itself in view, so the interface feels more like a professional editing studio.
            </p>
          </div>

          <div className="workflow-grid">
            <WorkflowStep number="01" icon="upload" title="Upload" text="Drop in the source resume and confirm the document the backend will process." />
            <WorkflowStep number="02" icon="target" title="Target" text="Paste the job description or use a posting URL, then add company context if helpful." />
            <WorkflowStep number="03" icon="scan" title="Review" text="Read the fit score, keyword coverage, and ATS warnings in separate focused views." />
            <WorkflowStep number="04" icon="export" title="Export" text="Download the tailored DOCX once the generated version and notes look right." />
          </div>
        </div>
      </section>

      <section id="why" className="band">
        <div className="band-inner">
          <div className="cta-strip">
            <div>
              <span className="eyebrow">Resume theme</span>
              <h2>Professional enough for job hunting, interactive enough to feel modern.</h2>
              <p>The redesign keeps the app credible while adding motion, readiness feedback, tabs, drag-and-drop affordances, and a paper-like preview.</p>
            </div>
            <a className="primary-button" href="/app">
              Open the studio <Icon name="arrow" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
