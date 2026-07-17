import { memo } from "react";

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
  {
    title: "Product Operations Associate",
    organization: "Morrow & Field",
    date: "2017 - 2019",
    bullets: ["Built launch checklists used across product and customer teams.", "Maintained adoption reporting for quarterly planning reviews."],
  },
] as const;

const PREVIEW_FINISHERS: Record<ResumeTemplateVariant, readonly PreviewSection[]> = {
  essential: [
    { title: "Selected Project", copy: "Built a launch health brief that connected customer evidence, ownership, and delivery risk." },
    { title: "Professional Development", copy: "Product analytics and facilitation coursework" },
  ],
  professional: [
    { title: "Operational Impact", copy: "Created a quarterly planning rhythm used across product, customer, and finance teams." },
    { title: "Credentials", copy: "Certified Scrum Product Owner · Product analytics coursework" },
  ],
  editorial: [
    { title: "Recognition", copy: "Selected work featured in regional design and editorial showcases." },
    { title: "Tools", skills: ["Figma", "Adobe Creative Cloud", "Notion", "Miro"] },
  ],
  compact: [
    { title: "Selected Outcomes", copy: "Improved launch clarity, customer feedback routing, and cross-team planning readiness." },
    { title: "Tools", skills: ["Jira", "Looker", "SQL", "Miro"] },
  ],
  executive: [
    { title: "Board & Advisory", copy: "Advises growth-stage product leaders on portfolio reviews and operating cadence." },
    { title: "Credentials", copy: "M.B.A. · Executive leadership program" },
  ],
  technical: [
    { title: "Open Source", copy: "Maintains small reliability utilities and contributes documentation fixes to developer tools." },
    { title: "Certifications", copy: "Cloud architecture fundamentals · Secure software delivery" },
  ],
  student: [
    { title: "Coursework", copy: "Database systems · Statistical modeling · Operations strategy" },
    { title: "Activities", copy: "Analytics Club project lead · Peer tutor" },
  ],
  hybrid: [
    { title: "Selected Project", copy: "Mapped a customer support workflow into a measurable product operations handoff." },
    { title: "Credentials", copy: "Product management certificate · SQL foundations" },
  ],
  academic: [
    { title: "Grants & Service", copy: "Graduate research award · Conference reviewer · Lab methods coordinator" },
    { title: "Affiliations", copy: "Association for Information Science and Technology" },
  ],
  impact: [
    { title: "Campaign Portfolio", copy: "Lifecycle launches, partner programs, customer research, and sales enablement systems." },
    { title: "Platforms", skills: ["HubSpot", "Salesforce", "GA4", "Looker"] },
  ],
};

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
      {
        title: "Research Experience",
        jobs: [
          {
            title: "Graduate Research Fellow",
            organization: "Decision Systems Lab",
            date: "2022 - Present",
            bullets: ["Studies how teams use evidence in complex organizations.", "Designed mixed-method research across interviews and operational data."],
          },
          {
            title: "Research Assistant",
            organization: "Human-Centered Computing Group",
            date: "2020 - 2022",
            bullets: ["Synthesized field studies into peer-reviewed findings.", "Maintained reproducible analysis and research documentation."],
          },
        ],
      },
      { title: "Publications", copy: "Selected peer-reviewed articles and conference proceedings available on request." },
      {
        title: "Teaching",
        jobs: [{
          title: "Instructor of Record",
          organization: "School of Information",
          date: "2023 - Present",
          bullets: ["Teaches research methods and data communication.", "Mentors student teams through applied research projects."],
        }],
      },
      { title: "Methods", skills: ["Qualitative research", "Survey design", "Python", "Data visualization"] },
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
        }, {
          title: "Lifecycle Marketing Manager",
          organization: "Northline Commerce",
          date: "2019 - 2022",
          bullets: ["Built segmented programs across acquisition and retention.", "Turned customer research into clearer campaign priorities."],
        }],
      },
      { title: "Selected Impact", copy: "Led launch and lifecycle programs across product, sales, and customer success teams." },
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
        }, {
          title: "Systems Analyst",
          organization: "Cedar Peak Software",
          date: "2018 - 2021",
          bullets: ["Automated operational reporting across product systems.", "Improved incident handoffs with documented recovery runbooks."],
        }],
      },
      {
        title: "Selected Project",
        jobs: [{
          title: "Export Reliability Toolkit",
          organization: "Independent project",
          date: "2024",
          bullets: ["Designed an account-safe export pipeline with auditable recovery states.", "Added format validation and repeatable integration checks."],
        }],
      },
      { title: "Education", copy: "B.S. Computer Science - University program" },
    ];
  }

  if (variant === "student") {
    return [
      { title: "Education", copy: "B.S. Business Analytics - University program - Expected 2027" },
      {
        title: "Projects",
        jobs: [{
          title: "Customer Retention Analysis",
          organization: "Analytics capstone",
          date: "Spring 2026",
          bullets: ["Analyzed retention patterns across customer segments.", "Presented a measurable action plan to program leaders."],
        }, {
          title: "Operations Dashboard",
          organization: "Student consulting team",
          date: "Fall 2025",
          bullets: ["Built a weekly KPI view from messy source data.", "Documented definitions so the report could be maintained."],
        }],
      },
      {
        title: "Experience",
        jobs: [{
          title: "Operations Intern",
          organization: "Fieldstone Cooperative",
          date: "Summer 2026",
          bullets: ["Organized research findings for weekly team decisions.", "Improved documentation for a recurring support workflow.", "Presented a measurable recommendation to program leaders."],
        }],
      },
      { title: "Leadership", copy: "Analytics Club project lead and peer mentor for introductory SQL workshops." },
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
        }, {
          title: "Director, Business Operations",
          organization: "Harbor & Pine",
          date: "2015 - 2020",
          bullets: ["Scaled planning systems through a period of rapid growth.", "Connected portfolio investment to customer and revenue signals."],
        }],
      },
      { title: "Advisory Work", copy: "Advises emerging product leaders on operating cadence, portfolio reviews, and cross-functional accountability." },
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
        }, {
          title: "Brand Designer",
          organization: "Fieldwork Creative",
          date: "2018 - 2021",
          bullets: ["Developed identity systems for digital products and publications.", "Translated audience research into practical creative direction."],
        }],
      },
      { title: "Selected Projects", copy: "Launch systems, editorial toolkits, research synthesis, and cross-channel campaign direction." },
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

type ResumePreviewProps = {
  variant?: ResumeTemplateVariant;
  name?: string;
  role?: string;
  highlight?: boolean;
};

export const ResumePreview = memo(function ResumePreview({
  variant = "essential",
  name = "Avery Stone",
  role = "Product Operations Manager",
  highlight = false,
}: ResumePreviewProps) {
  const sections = [...sectionsFor(variant), ...PREVIEW_FINISHERS[variant]];

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
});
