import type { ResumeTemplateVariant } from "../lib/resumeTemplates";

type PreviewSection = {
  title: string;
  copy?: string;
  skills?: readonly string[];
  jobs?: ReadonlyArray<{
    title: string;
    organization: string;
    date: string;
    bullets: readonly string[];
  }>;
};

const SHARED_EXPERIENCE = [
  {
    title: "Product Operations Manager",
    organization: "Northstar Systems",
    date: "2022 - Present",
    bullets: [
      "Built a weekly launch-readiness process across product and engineering.",
      "Turned customer evidence into prioritized roadmap decisions.",
      "Connected adoption signals, release risk, and customer commitments.",
    ],
  },
  {
    title: "Operations Specialist",
    organization: "Brightline Labs",
    date: "2019 - 2022",
    bullets: ["Improved handoffs by documenting owners, risks, and next steps.", "Coordinated beta feedback across customer-facing teams."],
  },
] as const;

function sectionsFor(variant: ResumeTemplateVariant): PreviewSection[] {
  if (variant === "hybrid") {
    return [
      { title: "Core Strengths", skills: ["Program delivery", "Customer research", "Operations", "Analytics"] },
      { title: "Relevant Experience", copy: "Transferred planning, stakeholder, and analysis experience into product operations work." },
      { title: "Career History", jobs: [...SHARED_EXPERIENCE] },
      { title: "Education", copy: "Professional certificate and B.S. degree - University program" },
    ];
  }

  if (variant === "academic") {
    return [
      { title: "Education", copy: "Ph.D. Candidate, Information Science - University program" },
      { title: "Research", copy: "Studies how teams use evidence and decision systems in complex organizations." },
      { title: "Publications", copy: "Selected peer-reviewed articles and conference proceedings available on request." },
      { title: "Teaching", copy: "Instructor for research methods, data communication, and collaborative systems." },
    ];
  }

  if (variant === "impact") {
    return [
      { title: "Performance Profile", copy: "Growth operator connecting customer insight, campaign execution, and measurable revenue outcomes." },
      {
        title: "Experience",
        jobs: [{
          title: "Growth Marketing Lead",
          organization: "Juniper Market",
          date: "2022 - Present",
          bullets: ["Improved qualified pipeline through role-specific campaigns.", "Built reporting that tied launches to adoption and revenue.", "Aligned lifecycle programs with sales enablement and customer insight."],
        }],
      },
      { title: "Core Skills", skills: ["Growth strategy", "Lifecycle", "Analytics", "Sales enablement"] },
      { title: "Education", copy: "B.B.A. Marketing - University program" },
    ];
  }

  if (variant === "technical") {
    return [
      { title: "Technical Skills", skills: ["TypeScript", "Python", "SQL", "Cloud systems"] },
      {
        title: "Experience",
        jobs: [{
          title: "Software Engineer",
          organization: "Harborline Platforms",
          date: "2021 - Present",
          bullets: ["Built reliable workflow APIs used across customer teams.", "Reduced release risk through automated test coverage.", "Documented recovery paths for account-safe exports."],
        }],
      },
      { title: "Projects", copy: "Designed an account-safe export pipeline with auditable recovery states." },
      { title: "Education", copy: "B.S. Computer Science - University program" },
    ];
  }

  if (variant === "student") {
    return [
      { title: "Education", copy: "B.S. Business Analytics - University program - Expected 2027" },
      { title: "Projects", copy: "Analyzed customer retention data and presented a measurable action plan." },
      {
        title: "Experience",
        jobs: [{
          title: "Operations Intern",
          organization: "Fieldstone Cooperative",
          date: "Summer 2026",
          bullets: ["Organized research findings for weekly team decisions.", "Improved documentation for a recurring support workflow.", "Presented a measurable recommendation to program leaders."],
        }],
      },
      { title: "Skills", skills: ["Excel", "SQL", "Research", "Presentations"] },
    ];
  }

  if (variant === "executive") {
    return [
      { title: "Leadership Profile", copy: "Operations leader connecting customer evidence, portfolio priorities, and accountable execution." },
      {
        title: "Selected Experience",
        jobs: [{
          title: "Vice President, Product Operations",
          organization: "Northstar Systems",
          date: "2020 - Present",
          bullets: ["Led operating cadence across a multi-team product portfolio.", "Improved executive visibility into adoption, risk, and commitments.", "Developed senior leaders through clearer ownership and review systems."],
        }],
      },
      { title: "Areas of Expertise", skills: ["Portfolio strategy", "Team leadership", "Operating systems"] },
      { title: "Education", copy: "Master of Business Administration - University program" },
    ];
  }

  if (variant === "editorial") {
    return [
      { title: "Profile", copy: "Creative strategist translating research and brand direction into clear, useful work." },
      {
        title: "Selected Work",
        jobs: [{
          title: "Senior Brand Strategist",
          organization: "Common Thread Studio",
          date: "2021 - Present",
          bullets: ["Shaped launch narratives across product and editorial teams.", "Built a research-led system for campaign decisions.", "Directed workshops that aligned brand, product, and customer evidence."],
        }],
      },
      { title: "Capabilities", skills: ["Brand systems", "Editorial", "Research", "Workshops"] },
      { title: "Education", copy: "B.A. Communication Design - University program" },
    ];
  }

  return [
    {
      title: variant === "compact" ? "Summary" : "Professional Summary",
      copy: "Product operations lead turning customer evidence into clearer priorities, launch systems, and accountable delivery.",
    },
    { title: "Experience", jobs: [...SHARED_EXPERIENCE] },
    { title: "Skills", skills: ["Roadmap operations", "Analytics", "Launch planning", "Stakeholder communication"] },
    { title: "Education", copy: "B.S. Business Analytics - University program" },
  ];
}

export function ResumePreview({
  variant = "essential",
  name = "Avery Stone",
  role = "Product Operations Manager",
  highlight = false,
}: {
  variant?: ResumeTemplateVariant;
  name?: string;
  role?: string;
  highlight?: boolean;
}) {
  const sections = sectionsFor(variant);

  return (
    <div className={`r-doc ${variant}`}>
      <header className="r-header">
        <div className="r-name">{name}</div>
        <div className="r-role">{role}</div>
        <div className="r-contact">candidate@preview.test · Austin, TX · portfolio.preview.test</div>
      </header>
      <div className="r-sections">
        {sections.map((section) => (
          <section className="r-section" key={section.title}>
            <div className="r-section-title">{section.title}</div>
            {section.copy ? (
              <p className="r-copy">
                {highlight && section.title.toLowerCase().includes("summary") ? (
                  <>Product operations lead turning <span className="r-hl-good">customer evidence</span> into clearer priorities, launch systems, and accountable delivery.</>
                ) : section.copy}
              </p>
            ) : null}
            {section.jobs?.map((job) => (
              <div className="r-job" key={`${section.title}-${job.title}`}>
                <div className="r-job-head">
                  <div className="r-job-title">{job.title}</div>
                  <div className="r-job-date">{job.date}</div>
                </div>
                <div className="r-job-org">{job.organization}</div>
                {job.bullets.map((bullet) => <div className="r-bullet" key={bullet}>{bullet}</div>)}
              </div>
            ))}
            {section.skills ? (
              <div className="r-skills">
                {section.skills.map((skill) => <span className="r-skill" key={skill}>{skill}</span>)}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
