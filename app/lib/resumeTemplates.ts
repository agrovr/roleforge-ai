export type ResumeTemplateVariant = "classic" | "modern" | "accent";

export type ResumeTemplate = {
  slug: string;
  name: string;
  tag: string;
  variant: ResumeTemplateVariant;
  color: string;
  detail: string;
  previewName: string;
};

export const RESUME_TEMPLATE_STORAGE_KEY = "roleforge-template-v1";
export const RESUME_TEMPLATE_COOKIE = "roleforge-template";

export const RESUME_TEMPLATES = [
  {
    slug: "classic",
    name: "Classic",
    tag: "General roles",
    variant: "classic",
    color: "#f5e6cb",
    detail: "A clean single-column format for broad professional applications.",
    previewName: "Sarah Chen",
  },
  {
    slug: "modern",
    name: "Modern",
    tag: "Technical resumes",
    variant: "modern",
    color: "#d8e0ee",
    detail: "A denser split layout for technical skills, projects, and tooling.",
    previewName: "Marcus Reed",
  },
  {
    slug: "editorial",
    name: "Editorial",
    tag: "Creative roles",
    variant: "accent",
    color: "#d9e7df",
    detail: "A lighter visual rhythm for roles where presentation matters.",
    previewName: "Priya Patel",
  },
  {
    slug: "compact",
    name: "Compact",
    tag: "Concise drafts",
    variant: "classic",
    color: "#efd8d1",
    detail: "A restrained direction for shorter resumes and quick review.",
    previewName: "Alex Kim",
  },
  {
    slug: "executive",
    name: "Executive",
    tag: "Senior roles",
    variant: "accent",
    color: "#f0dfbd",
    detail: "A more spacious format for leadership summaries and selected impact.",
    previewName: "Daniel Cole",
  },
  {
    slug: "engineer",
    name: "Engineer",
    tag: "Technical roles",
    variant: "modern",
    color: "#d8e0ee",
    detail: "A structured direction for skills-first engineering resumes.",
    previewName: "Jen Park",
  },
] as const satisfies readonly ResumeTemplate[];

export type ResumeTemplateSlug = (typeof RESUME_TEMPLATES)[number]["slug"];

export function isResumeTemplateSlug(value?: string | null): value is ResumeTemplateSlug {
  return RESUME_TEMPLATES.some((template) => template.slug === value);
}

export function getResumeTemplate(value?: string | null) {
  return RESUME_TEMPLATES.find((template) => template.slug === value) ?? RESUME_TEMPLATES[0];
}

export function resumeTemplateStudioHref(value?: string | null) {
  const template = getResumeTemplate(value);
  return `/app?template=${encodeURIComponent(template.slug)}`;
}
