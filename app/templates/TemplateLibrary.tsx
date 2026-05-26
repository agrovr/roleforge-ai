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
} from "../lib/resumeTemplates";

function rememberTemplate(slug: ResumeTemplateSlug) {
  window.localStorage.setItem(RESUME_TEMPLATE_STORAGE_KEY, slug);
  document.cookie = `${RESUME_TEMPLATE_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
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

      <section className="templates-page-grid" aria-label="Resume template directions">
        {RESUME_TEMPLATES.map((template) => {
          const selected = template.slug === selectedSlug;
          return (
            <article className={`templates-page-card${selected ? " selected" : ""}`} key={template.name}>
              <div className="template-thumb" style={{ borderTopColor: template.color }}>
                <ResumePreview
                  variant={template.variant}
                  name={template.previewName}
                  role={template.tag.replace(/ resumes| drafts| roles/i, "")}
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
