import Link from "next/link";
import { Brand } from "./components/Brand";
import { FaqAccordion } from "./components/FaqAccordion";
import { ResumePreview } from "./components/ResumePreview";
import { RoleForgeIcon } from "./components/RoleForgeIcons";
import { ThemeToggle } from "./components/ThemeToggle";

function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Primary navigation">
          <a className="nav-link" href="#templates">Templates</a>
          <a className="nav-link" href="#how">How it works</a>
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#pricing">Pricing</a>
          <span className="nav-divider" aria-hidden="true" />
          <ThemeToggle />
          <span className="nav-link disabled-link" aria-disabled="true">Sign in</span>
          <Link className="btn btn-brand" href="/app">
            Build my resume <RoleForgeIcon name="arrow" size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-trust">
          <span className="badge">New</span>
          <span>AI-assisted resume tailoring for focused applications</span>
        </div>
        <h1 className="display h1">
          The&nbsp;resume&nbsp;that<br />
          <span className="italic underline-brand">actually fits</span><br />
          the role.
        </h1>
        <p className="hero-sub">
          Upload your resume, add a job target, review structure and keyword signals, then export a cleaner draft from the same guided workspace.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-brand btn-lg" href="/app">
            Build my resume <RoleForgeIcon name="arrow" size={14} />
          </Link>
          <a className="btn btn-ghost btn-lg" href="#how">See how it works</a>
        </div>
        <div className="hero-meta safe-meta" aria-label="Product capabilities">
          <div className="hero-meta-item"><span className="v">Upload</span><span className="l">Start from DOCX.</span></div>
          <div className="hero-meta-item"><span className="v">Target</span><span className="l">Use text or URL.</span></div>
          <div className="hero-meta-item"><span className="v">Review</span><span className="l">Check before export.</span></div>
        </div>
      </div>

      <div className="hero-stage" aria-label="RoleForge resume preview">
        <div className="resume-card resume-card-back-l">
          <ResumePreview variant="modern" name="Marcus Reed" role="Software Engineer" />
        </div>
        <div className="resume-card resume-card-front">
          <ResumePreview variant="classic" highlight />
        </div>
        <div className="resume-card resume-card-back-r">
          <ResumePreview variant="accent" name="Priya Patel" role="Product Designer" />
        </div>

        <div className="hero-badge b-score">
          <div className="b-icon"><RoleForgeIcon name="check" size={16} /></div>
          <div>
            <div>Structure review</div>
            <div className="b-meta">Common formatting signals</div>
          </div>
        </div>
        <div className="hero-badge b-keyword">
          <div className="b-icon"><RoleForgeIcon name="sparkle" size={16} /></div>
          <div>
            <div>Keyword guidance</div>
            <div className="b-meta">Matched and missing terms</div>
          </div>
        </div>
        <div className="hero-badge b-ats">
          <div className="b-icon"><RoleForgeIcon name="scan" size={16} /></div>
          <div>
            <div>Export workflow</div>
            <div className="b-meta">Review before download</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleStrip() {
  return (
    <section className="logos" aria-label="RoleForge focus areas">
      <div className="logos-inner">
        <div className="logos-label">Built for focused applications across roles</div>
        <div className="logos-row">
          <span className="l-bold">Product</span>
          <span>Operations</span>
          <span className="l-mono">Engineering</span>
          <span>Design</span>
          <span className="l-bold">Analytics</span>
          <span>Support</span>
          <span className="l-mono">Leadership</span>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["upload", "Upload your resume", "Drop in a DOCX resume. RoleForge reads the current structure, headings, and content before generating changes."],
    ["target", "Paste the job", "Drop in the role description or use a public posting URL, then add optional company context when useful."],
    ["sparkle", "Review & tailor", "See fit signals, missing terms, formatting notes, and generated changes in a single review flow."],
    ["download", "Export & apply", "Download a clean DOCX after the generated result and notes look ready for your own review."],
  ] as const;

  return (
    <section className="section" id="how">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">How it works</div>
            <h2 className="display h2">Three steps. <span className="italic">One</span> tailored resume.</h2>
          </div>
          <p className="lede">Drop your resume, point at the role, review the suggested changes, and export a cleaner draft from the same workspace.</p>
        </div>
        <div className="steps">
          {steps.map(([icon, title, text], index) => (
            <article className="step" key={title}>
              <div className="step-num">{String(index + 1).padStart(2, "0")}</div>
              <div className="step-icon"><RoleForgeIcon name={icon} size={18} /></div>
              <h4 className="step-title">{title}</h4>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StudioPreview() {
  const navItems = [
    ["doc", "My Resumes", "7"],
    ["briefcase", "Applications", "23"],
    ["mail", "Cover Letters", "12"],
    ["layers", "Templates", ""],
  ] as const;

  const toolItems = [
    ["scan", "Format check"],
    ["chart", "Insights"],
    ["settings", "Settings"],
  ] as const;

  const stats = [
    ["Resumes", "7", "+2 this week"],
    ["Avg fit score", "86", "↑ 11 pts"],
    ["Applications", "23", "8 active"],
    ["Interviews", "5", "2.4× rate"],
  ] as const;

  const tips = [
    ["sparkle", "Quantify the impact", "Two bullets in your Lattice role lack a number. Try replacing \"led migration\" with the actual scope."],
    ["check", "Add a missing keyword", "The Stripe posting mentions experimentation 4× — your resume mentions it once. Add to summary?"],
    ["scan", "ATS · single-column", "Your two-column variant scores 11 points lower in ATS parsing. Keep the single-column version primary."],
  ] as const;

  return (
    <section className="dash-section" id="studio">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">The studio</div>
            <h2 className="display h2">Everything you need.<br /><span className="italic">Nothing</span> you don&apos;t.</h2>
          </div>
          <p className="lede">A focused workspace that shows your resume, the job, and generated suggestions side-by-side. Fit signals, gaps, and warnings stay in one calm panel.</p>
        </div>
        <div className="dash-mock">
          <div className="dash-mock-head">
            <div className="dash-traffic"><span /><span /><span /></div>
            <div className="dash-mock-url">app.roleforge.ai/studio</div>
          </div>
          <div className="dash-mock-body">
            <aside className="dash-side">
              <div className="dash-side-label">Workspace</div>
              {navItems.map(([icon, label, meta], index) => (
                <div className={`dash-side-item ${index === 0 ? "active" : ""}`} key={label}>
                  <RoleForgeIcon name={icon} size={15} />
                  <span>{label}</span>
                  {meta ? <span className="dash-pill">{meta}</span> : null}
                </div>
              ))}
              <div className="dash-side-divider" />
              <div className="dash-side-label">Tools</div>
              {toolItems.map(([icon, label]) => (
                <div className="dash-side-item" key={label}>
                  <RoleForgeIcon name={icon} size={15} />
                  <span>{label}</span>
                </div>
              ))}
            </aside>
            <div className="dash-main">
              <div className="dash-main-head">
                <div>
                  <h3>My Resumes</h3>
                  <p>Tailored to specific roles · sorted by recent</p>
                </div>
                <Link className="btn btn-brand btn-sm" href="/app"><RoleForgeIcon name="plus" size={14} />New resume</Link>
              </div>
              <div className="dash-stats">
                {stats.map(([label, value, delta]) => (
                  <div className="dash-stat" key={label}>
                    <div className="dash-stat-label">{label}</div>
                    <div className="dash-stat-value">{value}</div>
                    <div className="dash-stat-delta">{delta}</div>
                  </div>
                ))}
              </div>
              <div className="dash-resume-card">
                <div className="dash-resume-thumb"><ResumePreview highlight /></div>
                <div className="dash-resume-info">
                  <div>
                    <h4 className="dash-resume-title">Senior PM · Stripe</h4>
                    <div className="dash-resume-meta">
                      <span>Updated 2h ago</span><span>·</span><span>Fit 86/100</span><span>·</span><span>ATS 94</span>
                    </div>
                    <div className="dash-progress">
                      <div className="dash-progress-row"><span>Tailoring strength</span><span>86%</span></div>
                      <div className="dash-progress-track"><span /></div>
                    </div>
                  </div>
                  <div className="dash-resume-actions">
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="edit" size={13} />Edit</span>
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="download" size={13} />Download</span>
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="copy" size={13} />Duplicate</span>
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="chart" size={13} />Fit signals</span>
                  </div>
                </div>
              </div>
            </div>
            <aside className="dash-aside">
              <div>
                <div className="eyebrow">AI guidance</div>
                <h4>Three quick wins</h4>
                <p>Tweaks the AI spotted across your active resumes.</p>
              </div>
              {tips.map(([icon, title, text]) => (
                <div className="dash-aside-tip" key={title}>
                  <div className="dash-aside-tip-head"><RoleForgeIcon name={icon} size={12} />{title}</div>
                  <p>{text}</p>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function Templates() {
  const templates = [
    ["Classic", "General roles", "classic", "#f5e6cb"],
    ["Modern", "Technical resumes", "modern", "#d8e0ee"],
    ["Editorial", "Creative roles", "accent", "#d9e7df"],
    ["Compact", "Concise drafts", "classic", "#efd8d1"],
    ["Executive", "Senior roles", "accent", "#f0dfbd"],
    ["Engineer", "Technical roles", "modern", "#d8e0ee"],
  ] as const;

  return (
    <section className="templates" id="templates">
      <div className="templates-head">
        <div className="section-head">
          <div>
            <div className="eyebrow">Templates</div>
              <h2 className="display h2">Resume formats.<br /><span className="italic">Beautifully</span> simple.</h2>
          </div>
          <p className="lede">Templates are shown as design direction. Any premium template library should stay gated until real billing and plan rules exist.</p>
        </div>
      </div>
      <div className="templates-row">
        {templates.map(([name, tag, variant, color], index) => (
          <article className="template-card" key={name}>
            <div className="template-thumb" style={{ borderTopColor: color }}>
              <ResumePreview variant={variant} name={["Sarah Chen", "Marcus Reed", "Priya Patel", "Alex Kim", "Daniel Cole", "Jen Park"][index]} />
            </div>
            <div className="template-info">
              <span className="template-name">{name}</span>
              <span className="template-tag">{tag}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    [
      "sparkle",
      "",
      "AI tailoring",
      "Generate role-targeted suggestions from your resume and target role, then review every change before export.",
      ["Side-by-side review flow", "Conservative, balanced, and stronger modes", "Keeps your source details visible"],
    ],
    [
      "scan",
      "accent",
      "ATS-friendly review",
      "Check common parser risks before you send a draft, without claiming a guaranteed pass.",
      ["Heading and section sanity", "Bullet, table, and column notes", "Contact formatting checks"],
    ],
    [
      "chart",
      "coral",
      "Fit signals",
      "See how the target role reads against your resume and which terms may need review.",
      ["Matched and missing terms", "Role-focused summary notes", "Review-ready improvement signals"],
    ],
    [
      "mail",
      "sky",
      "Cover letters",
      "Generate a matching draft from the same resume and target brief when the run completes.",
      ["Same role context", "Review before sending", "Editable generated text"],
    ],
    [
      "briefcase",
      "",
      "Interview prep",
      "Use generated prep notes to rehearse from the same role and resume context.",
      ["Role-specific question prompts", "Evidence from your resume", "Notes stay tied to the run"],
    ],
    [
      "layers",
      "accent",
      "Application tracker",
      "Keep tracking surfaced as planned product space until account storage is wired.",
      ["Coming soon", "Needs auth and saved projects", "No fake dashboard state"],
    ],
  ] as const;

  return (
    <section className="section" id="features">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">Features</div>
            <h2 className="display h2">More than a builder.<br /><span className="italic">An application coach.</span></h2>
          </div>
          <p className="lede">RoleForge compares the target role with your resume and shows practical next steps without rewriting your career.</p>
        </div>
        <div className="features-grid">
          {features.map(([icon, tone, title, text, bullets]) => (
            <article className="feature-card" key={title}>
              <div className={`feature-icon${tone ? ` ${tone}` : ""}`}><RoleForgeIcon name={icon} size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
              <ul className="feature-card-list">
                {bullets.map((bullet) => (
                  <li key={bullet}><span className="feature-check" aria-hidden="true">✓</span><span>{bullet}</span></li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="section" id="pricing">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">Pricing</div>
            <h2 className="display h2">Launch with honest plan states.</h2>
          </div>
          <p className="lede">Billing stays clearly marked as coming soon until real plan and account support are ready.</p>
        </div>
        <div className="pricing-grid two">
          <article className="price-card">
            <div className="price-name">Studio</div>
            <div className="price-amount"><span className="v">Available</span></div>
            <div className="price-desc">Use the current resume tailoring workflow for upload, targeting, review, and export.</div>
            <ul className="price-list">
              <li><RoleForgeIcon name="check" size={14} />DOCX upload and export</li>
              <li><RoleForgeIcon name="check" size={14} />Job description or public URL targeting</li>
              <li><RoleForgeIcon name="check" size={14} />Review tabs for generated results</li>
            </ul>
            <Link className="btn btn-soft btn-lg" href="/app">Open studio</Link>
          </article>
          <article className="price-card featured">
            <div className="price-name">Premium</div>
            <div className="price-amount"><span className="v">Coming soon</span></div>
            <div className="price-desc">Account sync, saved projects, and premium options are planned but not live yet.</div>
            <ul className="price-list">
              <li><RoleForgeIcon name="lock" size={14} />Account workspace coming soon</li>
              <li><RoleForgeIcon name="lock" size={14} />Premium billing coming soon</li>
              <li><RoleForgeIcon name="lock" size={14} />Saved project sync coming soon</li>
            </ul>
            <button className="btn btn-brand btn-lg" type="button" disabled>Premium not live</button>
          </article>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    ["Does RoleForge replace my judgment?", "No. The app surfaces generated guidance and exports a draft for your review."],
    ["Can I use a job posting URL?", "Yes, if the posting is public and RoleForge can access it. Pasted text is the most reliable target input."],
    ["What file formats can I export?", "The current workflow exports DOCX. Additional export formats should stay hidden until implemented."],
    ["Can I use templates?", "Templates are visual examples for now. A selectable template library needs product rules before launch."],
    ["Is sign-in available?", "Not yet. Account creation, saved projects, and settings are planned but not live."],
    ["Is premium billing live?", "No. Premium areas are intentionally marked as coming soon until real payment configuration exists."],
  ] as const;

  return (
    <section className="section section-alt" id="faq">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">FAQ</div>
            <h2 className="display h2">Clear answers for this launch.</h2>
          </div>
          <p className="lede">No customer proof, privacy, billing, or performance promises are included without approval.</p>
        </div>
        <FaqAccordion items={items} />
      </div>
    </section>
  );
}

function CTABand() {
  return (
    <section className="section cta-section" id="final-cta">
      <div className="section-inner">
        <div className="cta-band">
          <div>
            <div className="eyebrow">Ready when you are</div>
            <h2>Stop tailoring by hand. <em>Start</em> applying with clarity.</h2>
            <p>Free to start. No credit card required. Upload your resume, target the role, and review a cleaner draft.</p>
            <div className="cta-cluster">
              <Link className="btn btn-brand btn-lg" href="/app">Build my resume <RoleForgeIcon name="arrow" size={14} /></Link>
              <a className="btn btn-ghost btn-lg" href="#templates">Browse templates</a>
            </div>
          </div>
          <div className="cta-visual">
            <div className="resume-card back"><ResumePreview variant="modern" name="Marcus Reed" role="Software Engineer" /></div>
            <div className="resume-card"><ResumePreview variant="classic" highlight /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Brand />
          <p className="footer-tag">The AI-assisted resume studio for clearer role targeting and cleaner exports.</p>
        </div>
        <div className="footer-col">
          <h3>Product</h3>
          <a href="#features">Tailoring</a>
          <a href="#features">Formatting review</a>
          <a href="#templates">Templates</a>
        </div>
        <div className="footer-col">
          <h3>Launch notes</h3>
          <span>Auth: coming soon</span>
          <span>Billing: coming soon</span>
          <span>Customer proof: not included</span>
        </div>
      </div>
      <div className="footer-meta">
        <span>RoleForge AI</span>
        <span>Production copy avoids unsupported claims.</span>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <main className="page-shell">
      <Nav />
      <Hero />
      <RoleStrip />
      <HowItWorks />
      <StudioPreview />
      <Templates />
      <Features />
      <Pricing />
      <FAQ />
      <CTABand />
      <Footer />
    </main>
  );
}
