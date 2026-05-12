type ResumePreviewVariant = "classic" | "modern" | "accent";

export function ResumePreview({
  variant = "classic",
  name = "Sarah Chen",
  role = "Product Manager",
  highlight = false,
}: {
  variant?: ResumePreviewVariant;
  name?: string;
  role?: string;
  highlight?: boolean;
}) {
  if (variant === "modern") {
    return (
      <div className="r-doc modern">
        <div className="r-side">
          <div className="r-name">{name}</div>
          <div className="r-role">{role}</div>
          <div className="r-contact">
            email@example.com
            <br />
            +1 555 0100
            <br />
            City, ST
          </div>
          <div className="r-section">
            <div className="r-section-title">Skills</div>
            <div className="r-bullet">Roadmapping</div>
            <div className="r-bullet">Analytics</div>
            <div className="r-bullet">Stakeholder mgmt</div>
            <div className="r-bullet">Cross-functional</div>
            <div className="r-bullet">Process design</div>
          </div>
          <div className="r-section">
            <div className="r-section-title">Education</div>
            <div className="r-bullet r-strong">Business program</div>
            <div className="r-bullet r-muted">Continuing education</div>
          </div>
        </div>
        <div className="r-main">
          <div className="r-section">
            <div className="r-section-title">Experience</div>
            <div className="r-job">
              <div className="r-job-head">
                <div className="r-job-title">Product Lead</div>
                <div className="r-job-date">Recent role</div>
              </div>
              <div className="r-job-org">Example Org</div>
              <div className="r-bullet">
                Owned <span className="r-hl">cross-functional planning</span> for a product team
              </div>
              <div className="r-bullet">Clarified release scope through a structured review ritual</div>
              <div className="r-bullet">Turned customer feedback into prioritized roadmap work</div>
            </div>
            <div className="r-job">
              <div className="r-job-head">
                <div className="r-job-title">Operations Partner</div>
                <div className="r-job-date">Earlier role</div>
              </div>
              <div className="r-job-org">Example Team</div>
              <div className="r-bullet">Organized planning rituals across product and support groups</div>
              <div className="r-bullet">Documented handoffs so decisions stayed easy to audit</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "accent") {
    return (
      <div className="r-doc accent">
        <div className="r-name">{name}</div>
        <div className="r-role">{role}</div>
        <div className="r-contact">email@example.com &middot; portfolio.example &middot; City, ST</div>
        <div className="r-section">
          <div className="r-section-title">Summary</div>
          <p className="r-copy">
            Clear, evidence-led resume summary aligned to the role target and written in a professional tone.
          </p>
        </div>
        <div className="r-section">
          <div className="r-section-title">Experience</div>
          <div className="r-job">
            <div className="r-job-head">
              <div className="r-job-title">Product Manager</div>
              <div className="r-job-date">Recent role</div>
            </div>
            <div className="r-job-org">Example Studio</div>
            <div className="r-bullet">Shaped product priorities with research and operations partners</div>
            <div className="r-bullet">Translated ambiguous requirements into organized delivery plans</div>
            <div className="r-bullet">Partnered with design and engineering on launch readiness</div>
          </div>
          <div className="r-job">
            <div className="r-job-head">
              <div className="r-job-title">Project Lead</div>
              <div className="r-job-date">Earlier role</div>
            </div>
            <div className="r-bullet">Built repeatable notes for weekly team decisions</div>
            <div className="r-bullet">Kept scope, evidence, and ownership visible in the review flow</div>
          </div>
        </div>
        <div className="r-section">
          <div className="r-section-title">Skills</div>
          <div className="r-skills">
            <span className="r-skill">Roadmaps</span>
            <span className="r-skill">Analytics</span>
            <span className="r-skill">Writing</span>
            <span className="r-skill">Prioritization</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="r-doc">
      <div className="r-name">{name}</div>
      <div className="r-role">{role}</div>
      <div className="r-contact">email@example.com &middot; +1 555 0100 &middot; City, ST &middot; linkedin.com/in/example</div>
      <div className="r-section">
        <div className="r-section-title">Professional Summary</div>
        <p className="r-copy">
          Product-minded operator with experience building{" "}
          <span className={highlight ? "r-hl" : ""}>structured roadmaps</span>, leading{" "}
          <span className={highlight ? "r-hl" : ""}>collaborative reviews</span>, and translating{" "}
          <span className={highlight ? "r-hl-good" : ""}>evidence</span> into clear decisions.
        </p>
      </div>
      <div className="r-section">
        <div className="r-section-title">Experience</div>
        <div className="r-job">
          <div className="r-job-head">
            <div className="r-job-title">Product Manager</div>
            <div className="r-job-date">Recent role</div>
          </div>
          <div className="r-job-org">Example Company &middot; Remote</div>
          <div className="r-bullet">
            Owned <span className={highlight ? "r-hl" : ""}>cross-functional roadmap</span> delivery for a customer-facing workflow
          </div>
          <div className="r-bullet">Clarified launch scope through stakeholder reviews and prioritization</div>
          <div className="r-bullet">Used research notes to focus team decisions and reduce ambiguity</div>
        </div>
        <div className="r-job">
          <div className="r-job-head">
            <div className="r-job-title">Project Lead, Operations</div>
            <div className="r-job-date">Earlier role</div>
          </div>
          <div className="r-job-org">Example Group &middot; Remote</div>
          <div className="r-bullet">Created a planning process that made status and ownership easier to review</div>
          <div className="r-bullet">Organized feedback into decisions, risks, and next steps for the team</div>
        </div>
      </div>
      <div className="r-section">
        <div className="r-section-title">Skills</div>
        <div className="r-skills">
          <span className="r-skill">Roadmapping</span>
          <span className="r-skill">Analytics</span>
          <span className="r-skill">Prioritization</span>
          <span className="r-skill">Stakeholder mgmt</span>
        </div>
      </div>
    </div>
  );
}
