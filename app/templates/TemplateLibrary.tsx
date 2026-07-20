"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ResumePreview } from "../components/ResumePreview";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import {
  RESUME_TEMPLATE_STORAGE_KEY,
  RESUME_TEMPLATES,
  getResumeTemplate,
  resolveResumeTemplatePreference,
  resumeTemplateCookieAssignment,
  resumeTemplateEntryHref,
  resumeTemplateStudioHref,
  type ResumeTemplateSlug,
  type ResumeTemplateVariant,
} from "../lib/resumeTemplates";

const TEMPLATE_DECISION_GROUPS = [
  {
    id: "everyday",
    title: "Everyday applications",
    detail: "Reliable formats for most professional roles and industries.",
    icon: "file",
    slugs: ["classic", "modern", "impact"],
  },
  {
    id: "focused",
    title: "Focused formats",
    detail: "Use these when density, projects, or early-career evidence should lead.",
    icon: "scan",
    slugs: ["engineer", "compact", "student", "hybrid"],
  },
  {
    id: "specialist",
    title: "Leadership and creative",
    detail: "Give senior scope or portfolio-led work a more editorial rhythm.",
    icon: "sparkle",
    slugs: ["executive", "editorial", "academic"],
  },
] as const;

type TemplateDecisionGroupId = "all" | (typeof TEMPLATE_DECISION_GROUPS)[number]["id"];

function rememberTemplate(slug: ResumeTemplateSlug) {
  window.localStorage.setItem(RESUME_TEMPLATE_STORAGE_KEY, slug);
  document.cookie = resumeTemplateCookieAssignment(slug);
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
  initialTemplateSlug = null,
  settingsHref,
}: {
  signedIn: boolean;
  initialTemplateSlug?: ResumeTemplateSlug | null;
  settingsHref: string;
}) {
  const [selectedSlug, setSelectedSlug] = useState<ResumeTemplateSlug>(initialTemplateSlug ?? "classic");
  const [activeGroupId, setActiveGroupId] = useState<TemplateDecisionGroupId>("all");

  useEffect(() => {
    const stored = window.localStorage.getItem(RESUME_TEMPLATE_STORAGE_KEY);
    const resolved = resolveResumeTemplatePreference({ cookie: initialTemplateSlug, stored });
    rememberTemplate(resolved);

    const frame = window.requestAnimationFrame(() => setSelectedSlug(resolved));
    return () => window.cancelAnimationFrame(frame);
  }, [initialTemplateSlug]);

  const selectedTemplate = getResumeTemplate(selectedSlug);
  const activeGroup = activeGroupId === "all"
    ? null
    : TEMPLATE_DECISION_GROUPS.find((group) => group.id === activeGroupId) ?? null;
  const visibleTemplates = activeGroup
    ? RESUME_TEMPLATES.filter((template) => (activeGroup.slugs as readonly ResumeTemplateSlug[]).includes(template.slug))
    : RESUME_TEMPLATES;

  return (
    <>
      <section className="templates-page-hero" aria-labelledby="templates-title">
        <div className="templates-page-hero-copy">
          <div className="eyebrow">Template library</div>
          <h1 id="templates-title">Resume formats for cleaner exports.</h1>
          <p>
            Choose the visual direction RoleForge should carry into new PDF and premium DOCX exports. You can change it before each run.
          </p>
          <div className="templates-page-actions">
            <Link className="primary-button" href={resumeTemplateEntryHref(selectedSlug, signedIn)}>
              Use {selectedTemplate.name} <RoleForgeIcon name="arrow" size={14} />
            </Link>
            <Link className="ghost-button" href={settingsHref}>
              Export access
            </Link>
          </div>
        </div>
        <aside className="templates-hero-preview" aria-label={`${selectedTemplate.name} template preview`}>
          <div className="templates-hero-preview-head">
            <span>Selected now</span>
            <strong>{selectedTemplate.name}</strong>
          </div>
          <div className="template-thumb templates-hero-thumb" key={selectedTemplate.slug} aria-hidden="true">
            <ResumePreview
              variant={selectedTemplate.variant}
              name={selectedTemplate.previewName}
              role={selectedTemplate.previewRole}
              highlight
            />
          </div>
        </aside>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        Selected template: {selectedTemplate.name}
      </p>

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
            <span className="eyebrow">Browse by use case</span>
            <h2 id="templates-decision-title">Find the right starting point.</h2>
          </div>
          <p>
            Narrow the real formats available in the studio, then compare full previews before choosing what carries into your next export.
          </p>
        </div>
        <div className="templates-filter-list" aria-label="Filter templates by use case">
          <button
            className={`templates-filter-option${activeGroupId === "all" ? " active" : ""}`}
            type="button"
            onClick={() => setActiveGroupId("all")}
            aria-pressed={activeGroupId === "all"}
          >
            <span aria-hidden="true"><RoleForgeIcon name="layers" size={16} /></span>
            <span>
              <strong>All templates</strong>
              <small>{RESUME_TEMPLATES.length} directions</small>
            </span>
          </button>
          {TEMPLATE_DECISION_GROUPS.map((group) => (
            <button
              className={`templates-filter-option${activeGroupId === group.id ? " active" : ""}`}
              key={group.id}
              type="button"
              onClick={() => setActiveGroupId(group.id)}
              aria-pressed={activeGroupId === group.id}
            >
              <span aria-hidden="true"><RoleForgeIcon name={group.icon} size={16} /></span>
              <span>
                <strong>{group.title}</strong>
                <small>{group.slugs.length} directions</small>
              </span>
            </button>
          ))}
        </div>
        <p className="templates-filter-summary" role="status" aria-live="polite">
          <strong>{visibleTemplates.length} {visibleTemplates.length === 1 ? "template" : "templates"}</strong>
          <span>{activeGroup?.detail ?? "Compare every export-backed direction. Essential is the recommended default for most roles."}</span>
        </p>
      </section>

      <section className="templates-page-grid" aria-label={`${visibleTemplates.length} resume template directions shown`}>
        {visibleTemplates.map((template) => {
          const selected = template.slug === selectedSlug;
          return (
            <article
              className={`templates-page-card${selected ? " selected" : ""}`}
              key={template.name}
              aria-labelledby={`template-${template.slug}-title`}
            >
              <div className="template-thumb" aria-hidden="true">
                <ResumePreview
                  variant={template.variant}
                  name={template.previewName}
                  role={template.previewRole}
                  highlight={selected}
                />
              </div>
              <div className="templates-page-card-copy">
                <div className="template-title-row">
                  <h3 className="template-name" id={`template-${template.slug}-title`}>{template.name}</h3>
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
                    aria-label={selected ? `${template.name} template selected` : `Select ${template.name} template`}
                  >
                    {selected ? "Selected" : "Select"} <RoleForgeIcon name={selected ? "check" : "layers"} size={12} />
                  </button>
                  <Link
                    className="btn btn-ghost btn-sm"
                    href={signedIn ? resumeTemplateStudioHref(template.slug) : resumeTemplateEntryHref(template.slug, signedIn)}
                    aria-label={`Open ${template.name} in Studio`}
                  >
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
