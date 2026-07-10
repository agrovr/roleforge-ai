"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ResumePreview } from "../components/ResumePreview";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import {
  RESUME_TEMPLATE_COOKIE,
  RESUME_TEMPLATE_STORAGE_KEY,
  RESUME_TEMPLATES,
  getResumeTemplate,
  isResumeTemplateSlug,
  resumeTemplateEntryHref,
  resumeTemplateStudioHref,
  type ResumeTemplateSlug,
  type ResumeTemplateVariant,
} from "../lib/resumeTemplates";

const TEMPLATE_DECISION_GROUPS = [
  {
    title: "Everyday applications",
    detail: "Reliable formats for most professional roles and industries.",
    icon: "file",
    slugs: ["classic", "modern", "impact"],
  },
  {
    title: "Focused formats",
    detail: "Use these when density, projects, or early-career evidence should lead.",
    icon: "scan",
    slugs: ["engineer", "compact", "student", "hybrid"],
  },
  {
    title: "Leadership and creative",
    detail: "Give senior scope or portfolio-led work a more editorial rhythm.",
    icon: "sparkle",
    slugs: ["executive", "editorial", "academic"],
  },
] as const;

function rememberTemplate(slug: ResumeTemplateSlug) {
  window.localStorage.setItem(RESUME_TEMPLATE_STORAGE_KEY, slug);
  document.cookie = `${RESUME_TEMPLATE_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function layoutLabel(variant: ResumeTemplateVariant) {
  switch (variant) {
    case "professional":
      return "Centered header";
    case "editorial":
    case "executive":
      return "Serif hierarchy";
    case "compact":
      return "Condensed page";
    case "technical":
      return "Skills and projects";
    case "student":
      return "Education first";
    case "hybrid":
      return "Skills-forward";
    case "academic":
      return "Research record";
    case "impact":
      return "Results-forward";
    default:
      return "Single column";
  }
}

function layoutDetail(variant: ResumeTemplateVariant) {
  switch (variant) {
    case "professional":
      return "Good for polished corporate and client-facing applications.";
    case "editorial":
      return "Good when presentation and portfolio narrative matter.";
    case "executive":
      return "Good when leadership scope and selected impact need room.";
    case "compact":
      return "Good for keeping substantial experience to a readable page.";
    case "technical":
      return "Good when technical skills and projects need to scan quickly.";
    case "student":
      return "Good when education, internships, and projects carry the story.";
    case "hybrid":
      return "Good when transferable strengths need context from a clear work history.";
    case "academic":
      return "Good for research, teaching, publications, and advanced education.";
    case "impact":
      return "Good when measurable growth, campaigns, or revenue outcomes should lead.";
    default:
      return "Good when clarity and broad compatibility matter most.";
  }
}

export function TemplateLibrary({
  signedIn,
  initialTemplateSlug = "classic",
}: {
  signedIn: boolean;
  initialTemplateSlug?: ResumeTemplateSlug;
}) {
  const [selectedSlug, setSelectedSlug] = useState<ResumeTemplateSlug>(initialTemplateSlug);

  useEffect(() => {
    const stored = window.localStorage.getItem(RESUME_TEMPLATE_STORAGE_KEY);
    if (!isResumeTemplateSlug(stored)) return;

    const frame = window.requestAnimationFrame(() => setSelectedSlug(stored));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectedTemplate = getResumeTemplate(selectedSlug);

  return (
    <>
      <div className="templates-selection-status" role="status">
        <div>
          <span className="eyebrow">Selected direction</span>
          <strong>{selectedTemplate.name}</strong>
        </div>
        <Link className="btn btn-soft btn-sm" href={resumeTemplateEntryHref(selectedSlug, signedIn)}>
          Use in studio <RoleForgeIcon name="arrow" size={12} />
        </Link>
      </div>

      <section className="templates-fit-guide" aria-label="Selected template guidance">
        <article>
          <span><RoleForgeIcon name="check" size={15} /></span>
          <div>
            <strong>Role fit</strong>
            <small>{selectedTemplate.tag}</small>
          </div>
        </article>
        <article>
          <span><RoleForgeIcon name="layers" size={15} /></span>
          <div>
            <strong>{layoutLabel(selectedTemplate.variant)}</strong>
            <small>{layoutDetail(selectedTemplate.variant)}</small>
          </div>
        </article>
        <article>
          <span><RoleForgeIcon name="download" size={15} /></span>
          <div>
            <strong>Export behavior</strong>
            <small>New PDF and premium DOCX exports use this direction; older saved exports stay unchanged.</small>
          </div>
        </article>
      </section>

      <section className="templates-decision-guide" aria-labelledby="templates-decision-title">
        <div className="templates-decision-head">
          <div>
            <span className="eyebrow">Template decision guide</span>
            <h2 id="templates-decision-title">Choose by resume shape.</h2>
          </div>
          <p>
            These groups use the same template directions available in the studio, so the choice you make here carries into the next export.
          </p>
        </div>
        <div className="templates-guide-grid">
          {TEMPLATE_DECISION_GROUPS.map((group) => (
            <article className="templates-guide-card" key={group.title}>
              <div className="templates-guide-card-head">
                <span aria-hidden="true"><RoleForgeIcon name={group.icon} size={16} /></span>
                <div>
                  <strong>{group.title}</strong>
                  <small>{group.detail}</small>
                </div>
              </div>
              <div className="templates-guide-options">
                {group.slugs.map((slug) => {
                  const template = getResumeTemplate(slug);
                  const selected = template.slug === selectedSlug;
                  return (
                    <button
                      className={`templates-guide-option${selected ? " selected" : ""}`}
                      key={template.slug}
                      type="button"
                      onClick={() => {
                        setSelectedSlug(template.slug);
                        rememberTemplate(template.slug);
                      }}
                      aria-pressed={selected}
                    >
                      <span>{template.name}</span>
                      <small>{template.tag}</small>
                      <RoleForgeIcon name={selected ? "check" : "arrow"} size={12} />
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="templates-page-grid" aria-label="Resume template directions">
        {RESUME_TEMPLATES.map((template) => {
          const selected = template.slug === selectedSlug;
          return (
            <article className={`templates-page-card${selected ? " selected" : ""}`} key={template.name}>
              <div className="template-thumb">
                <ResumePreview
                  variant={template.variant}
                  name={template.previewName}
                  role={template.previewRole}
                  highlight={selected}
                />
              </div>
              <div className="templates-page-card-copy">
                <div className="template-title-row">
                  <span className="template-name">{template.name}</span>
                  <span className="template-tag">{template.tag}</span>
                </div>
                <p>{template.detail}</p>
                <div className="template-card-actions">
                  <button
                    className={`btn btn-soft btn-sm template-select-button${selected ? " selected" : ""}`}
                    type="button"
                    onClick={() => {
                      setSelectedSlug(template.slug);
                      rememberTemplate(template.slug);
                    }}
                    aria-pressed={selected}
                  >
                    {selected ? "Selected" : "Select"} <RoleForgeIcon name={selected ? "check" : "layers"} size={12} />
                  </button>
                  <Link className="btn btn-ghost btn-sm" href={signedIn ? resumeTemplateStudioHref(template.slug) : resumeTemplateEntryHref(template.slug, signedIn)}>
                    Studio
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
