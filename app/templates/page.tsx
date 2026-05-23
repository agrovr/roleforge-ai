import Link from "next/link";

import { Brand } from "../components/Brand";
import { ResumePreview } from "../components/ResumePreview";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { createRoleForgeServerClient } from "../lib/supabase/server";

const templates = [
  {
    name: "Classic",
    tag: "General roles",
    variant: "classic",
    color: "#f5e6cb",
    detail: "A clean single-column format for broad professional applications.",
  },
  {
    name: "Modern",
    tag: "Technical resumes",
    variant: "modern",
    color: "#d8e0ee",
    detail: "A denser split layout for technical skills, projects, and tooling.",
  },
  {
    name: "Editorial",
    tag: "Creative roles",
    variant: "accent",
    color: "#d9e7df",
    detail: "A lighter visual rhythm for roles where presentation matters.",
  },
  {
    name: "Compact",
    tag: "Concise drafts",
    variant: "classic",
    color: "#efd8d1",
    detail: "A restrained direction for shorter resumes and quick review.",
  },
  {
    name: "Executive",
    tag: "Senior roles",
    variant: "accent",
    color: "#f0dfbd",
    detail: "A more spacious format for leadership summaries and selected impact.",
  },
  {
    name: "Engineer",
    tag: "Technical roles",
    variant: "modern",
    color: "#d8e0ee",
    detail: "A structured direction for skills-first engineering resumes.",
  },
] as const;

const previewNames = ["Sarah Chen", "Marcus Reed", "Priya Patel", "Alex Kim", "Daniel Cole", "Jen Park"] as const;

async function getTemplateLinks() {
  const supabase = await createRoleForgeServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const signedIn = Boolean(user);

  return {
    studioHref: signedIn ? "/app" : "/login?next=/app",
    settingsHref: signedIn ? "/settings#exports" : `/login?next=${encodeURIComponent("/settings#exports")}`,
  };
}

export default async function TemplatesPage() {
  const { studioHref, settingsHref } = await getTemplateLinks();

  return (
    <main className="templates-page-shell">
      <header className="settings-page-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href={studioHref}>Studio</Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="templates-page-hero" aria-labelledby="templates-title">
        <div>
          <div className="eyebrow">Template library</div>
          <h1 id="templates-title">Resume formats for cleaner exports.</h1>
          <p>
            Browse the visual directions planned for RoleForge exports. The current workflow keeps PDF export live while each template is prepared for real files.
          </p>
        </div>
        <div className="templates-page-actions">
          <Link className="primary-button" href={studioHref}>
            Open studio <RoleForgeIcon name="arrow" size={14} />
          </Link>
          <Link className="ghost-button" href={settingsHref}>
            Export access
          </Link>
        </div>
      </section>

      <section className="templates-page-grid" aria-label="Resume template directions">
        {templates.map((template, index) => (
          <article className="templates-page-card" key={template.name}>
            <div className="template-thumb" style={{ borderTopColor: template.color }}>
              <ResumePreview
                variant={template.variant}
                name={previewNames[index]}
                role={template.tag.replace(/ resumes| drafts| roles/i, "")}
              />
            </div>
            <div className="templates-page-card-copy">
              <div>
                <span className="template-name">{template.name}</span>
                <span className="template-tag">{template.tag}</span>
              </div>
              <p>{template.detail}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
